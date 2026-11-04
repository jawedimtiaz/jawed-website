import {
  type AccountSummary,
  type FixedOrVariable,
  type MoneyCategory,
  type TransactionType,
} from '../../db/db';
import { predictTransactionCategory } from './mlCategorizer';

export interface ReceiptLineItem {
  name: string;
  quantity?: number;
  price?: number;
}

export interface ScannedReceiptResult {
  merchant: string;
  date: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  amount: number;
  currency: string;
  note: string;
  items: ReceiptLineItem[];
  suggestedType: TransactionType;
  suggestedCategory: string;
  suggestedSubCategory: string;
  suggestedFixedOrVariable: FixedOrVariable;
  suggestedAccountId?: string;
  confidence: number; // 0 to 100
  source: 'gemini-ai' | 'svg-ocr' | 'text-ocr' | 'heuristic-ocr';
  rawText?: string;
}

export interface ReceiptScanOptions {
  categories?: MoneyCategory[];
  accounts?: AccountSummary[];
  skipServerAi?: boolean;
}

/**
 * Normalizes extracted dates into ISO YYYY-MM-DD or YYYY-MM-DDTHH:mm format.
 */
export function normalizeReceiptDate(rawDateStr: string): string | null {
  if (!rawDateStr || typeof rawDateStr !== 'string') return null;
  const clean = rawDateStr.trim().replace(/\s+/g, ' ');

  // Format 1: YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm
  const isoMatch = clean.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    if (isoMatch[4] && isoMatch[5]) {
      const hh = isoMatch[4].padStart(2, '0');
      const mm = isoMatch[5].padStart(2, '0');
      return `${y}-${m}-${d}T${hh}:${mm}`;
    }
    return `${y}-${m}-${d}`;
  }

  // Format 2: DD-MM-YYYY or DD/MM/YYYY HH:mm
  const ddmmyyyyMatch = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, '0');
    const m = ddmmyyyyMatch[2].padStart(2, '0');
    const y = ddmmyyyyMatch[3];
    if (ddmmyyyyMatch[4] && ddmmyyyyMatch[5]) {
      const hh = ddmmyyyyMatch[4].padStart(2, '0');
      const mm = ddmmyyyyMatch[5].padStart(2, '0');
      return `${y}-${m}-${d}T${hh}:${mm}`;
    }
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Extracts a numeric amount from receipt currency strings (e.g. "₹3,450.00" -> 3450).
 */
export function parseCurrencyAmount(rawStr: string): number | null {
  if (!rawStr) return null;
  // Match currency digits with commas and decimal: ₹3,450.00, Rs. 1250, 4280.50
  const match = rawStr.match(/(?:(?:₹|rs\.?|inr|\$|€|£)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!match || !match[1]) return null;
  const num = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Extracts merchant, date, and amount from plain receipt text using robust financial OCR heuristics.
 */
export function extractMerchantFromReceiptText(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const ignoredPatterns = [
    /^(?:tax\s+invoice|invoice|retail\s+invoice|cash\s+memo|receipt|bill|customer\s+copy|merchant\s+copy|welcome|welcome\s+to|original|duplicate)$/i,
    /^[=\-*#_~]{3,}$/,
    /^gstin/i,
    /^tel|^phone|^email|^website|^cin|^date|^bill\s*#/i,
    /^item\s+qty/i,
  ];

  for (const line of lines) {
    if (ignoredPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }
    // Clean trailing invoice or bill labels
    const cleaned = line
      .replace(/\s*[•|·].*$/, '')
      .replace(/\s+(?:bill|inv|no|#).*$/i, '')
      .trim();

    if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
      return cleaned;
    }
  }

  return 'Receipt Merchant';
}

/**
 * Extracts transaction date from receipt text.
 */
export function extractDateFromReceiptText(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  // 1. Look for explicit Date labels first: "Date: 2026-11-02 18:40"
  for (const line of lines) {
    const labelMatch = line.match(/(?:date|dated|dt|txn\s+date|bill\s+date)[:\s]+([^#\n|]+)/i);
    if (labelMatch) {
      const normalized = normalizeReceiptDate(labelMatch[1]);
      if (normalized) return normalized;
    }
  }

  // 2. Scan entire text for any ISO or DD-MM-YYYY dates
  for (const line of lines) {
    const normalized = normalizeReceiptDate(line);
    if (normalized) return normalized;
  }

  return null;
}

/**
 * Extracts total amount from receipt text.
 */
export function extractAmountFromReceiptText(text: string): number | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  // Priority total keywords (checked in reverse to pick the final summary lines)
  const totalKeywords = [
    /total\s+paid/i,
    /grand\s+total/i,
    /net\s+payable/i,
    /amount\s+paid/i,
    /total\s+amount/i,
    /final\s+amount/i,
    /bill\s+amount/i,
    /net\s+total/i,
    /total\s+due/i,
    /^total\b/i,
  ];

  // Pass 1: lines with explicit Total keywords
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const kw of totalKeywords) {
      if (kw.test(line)) {
        const amt = parseCurrencyAmount(line);
        if (amt && amt > 0) return amt;
      }
    }
  }

  // Pass 2: Look for lines with currency symbols (₹, INR, Rs)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/[₹]|inr|rs\.?/i.test(line) && !/gstin|rate|qty|tax/i.test(line)) {
      const amt = parseCurrencyAmount(line);
      if (amt && amt > 0) return amt;
    }
  }

  return null;
}

/**
 * Extracts line items from receipt text where lines follow "Item Name [Qty] Amount".
 */
export function extractLineItemsFromReceiptText(text: string): ReceiptLineItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const items: ReceiptLineItem[] = [];
  let inItemSection = false;

  for (const line of lines) {
    if (/item\s+(?:qty\s+)?amount/i.test(line)) {
      inItemSection = true;
      continue;
    }
    if (/total|grand\s+total|payment|tax|gstin|subtotal/i.test(line)) {
      inItemSection = false;
    }

    if (inItemSection) {
      const priceMatch = line.match(
        /(?:₹|rs\.?|inr|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i
      );
      if (priceMatch) {
        const price = Number.parseFloat(priceMatch[1].replace(/,/g, ''));
        const namePart = line.slice(0, line.lastIndexOf(priceMatch[0])).trim();
        const qtyMatch = namePart.match(/\s+(\d+)\s*$/);
        const qty = qtyMatch ? Number.parseInt(qtyMatch[1], 10) : 1;
        const cleanName = qtyMatch ? namePart.slice(0, namePart.lastIndexOf(qtyMatch[0])).trim() : namePart;

        if (cleanName.length > 2 && price > 0) {
          items.push({ name: cleanName, quantity: qty, price });
        }
      }
    }
  }

  return items;
}

/**
 * Detects payment account from receipt text by matching known user accounts (ICICI, SBI, UBI, Cash, Card).
 */
export function detectAccountFromReceiptText(
  text: string,
  accounts: AccountSummary[] = []
): string | undefined {
  const lower = text.toLowerCase();
  for (const acc of accounts) {
    const accNameLower = acc.name.toLowerCase();
    if (lower.includes(accNameLower)) {
      return acc.id;
    }
  }

  // Heuristic fallbacks for standard account types
  if (/icici/i.test(text)) {
    const matched = accounts.find((a) => /icici/i.test(a.name));
    if (matched) return matched.id;
  }
  if (/sbi|state\s+bank/i.test(text)) {
    const matched = accounts.find((a) => /sbi/i.test(a.name));
    if (matched) return matched.id;
  }
  if (/ubi|union\s+bank/i.test(text)) {
    const matched = accounts.find((a) => /ubi/i.test(a.name));
    if (matched) return matched.id;
  }
  if (/\b(?:cash|petty\s+cash)\b/i.test(text)) {
    const matched = accounts.find((a) => a.type === 'Cash' || /cash/i.test(a.name));
    if (matched) return matched.id;
  }
  if (/\b(?:credit\s+card|debit\s+card|pos|card\s+payment)\b/i.test(text)) {
    const matched = accounts.find((a) => a.type === 'Card' || /card/i.test(a.name));
    if (matched) return matched.id;
  }

  return accounts[0]?.id;
}

/**
 * Parses receipt text into structured transaction fields.
 */
export function parseReceiptFromText(
  rawText: string,
  options: ReceiptScanOptions = {}
): ScannedReceiptResult {
  const { categories = [], accounts = [] } = options;
  const merchant = extractMerchantFromReceiptText(rawText);
  const date = extractDateFromReceiptText(rawText) || new Date().toISOString().slice(0, 10);
  const amount = extractAmountFromReceiptText(rawText) || 0;
  const items = extractLineItemsFromReceiptText(rawText);
  const detectedAccountId = detectAccountFromReceiptText(rawText, accounts);

  // Generate a clean note from merchant & items
  let note = merchant;
  if (items.length > 0) {
    const topItems = items.slice(0, 3).map((it) => it.name).join(', ');
    note = `${merchant} - ${topItems}${items.length > 3 ? ` (+${items.length - 3} more)` : ''}`;
  }

  // Predict category and cost nature using the ML categorizer
  const mlPred = predictTransactionCategory(`${merchant} ${items.map((i) => i.name).join(' ')}`, {
    txType: 'Expense',
    allowTypeInference: false,
    categories,
  });

  return {
    merchant,
    date,
    amount,
    currency: 'INR',
    note,
    items,
    suggestedType: 'Expense',
    suggestedCategory: mlPred.category || 'Food & Groceries',
    suggestedSubCategory: mlPred.subCategory || '',
    suggestedFixedOrVariable: mlPred.fixedOrVariable || 'Variable',
    suggestedAccountId: detectedAccountId,
    confidence: amount > 0 && merchant !== 'Receipt Merchant' ? 95 : 75,
    source: 'text-ocr',
    rawText,
  };
}

/**
 * Parses SVG receipt data URLs or raw SVG strings directly.
 */
export function parseSvgReceipt(
  svgContentOrDataUrl: string,
  options: ReceiptScanOptions = {}
): ScannedReceiptResult {
  let svgText = String(svgContentOrDataUrl || '').trim();

  if (svgText.startsWith('data:image/svg+xml;utf8,')) {
    svgText = decodeURIComponent(svgText.slice('data:image/svg+xml;utf8,'.length));
  } else if (svgText.startsWith('data:image/svg+xml;base64,')) {
    try {
      const b64 = svgText.slice('data:image/svg+xml;base64,'.length);
      if (typeof atob === 'function') {
        svgText = atob(b64);
      } else if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        svgText = (globalThis as any).Buffer.from(b64, 'base64').toString('utf-8');
      }
    } catch {
      // ignore decoding error and attempt fallback
    }
  }

  // Extract all text inside <text> tags
  const textMatches = [...svgText.matchAll(/<text[^>]*>([^<]+)<\/text>/gi)].map((m) => m[1].trim());
  const combinedRawText = textMatches.join('\n');

  const result = parseReceiptFromText(combinedRawText || svgText, options);
  return {
    ...result,
    source: 'svg-ocr',
  };
}

/**
 * Automated receipt scanning engine:
 * 1. Instantly parses SVG receipts (like sample and generated receipts).
 * 2. Uses server-side Gemini 3.8 Flash for raster photos (PNG/JPG/WebP).
 * 3. Seamlessly falls back to local OCR parsing if offline or server is unavailable.
 */
export async function scanReceiptImage(
  imageInput: string | File,
  options: ReceiptScanOptions = {}
): Promise<ScannedReceiptResult> {
  let dataUrl = '';
  let mimeType = 'image/jpeg';

  if (typeof imageInput === 'string') {
    dataUrl = imageInput.trim();
    if (dataUrl.startsWith('data:image/')) {
      const match = dataUrl.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    }
  } else if (imageInput instanceof File) {
    mimeType = imageInput.type || 'image/jpeg';
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read receipt image file'));
      reader.readAsDataURL(imageInput);
    });
  }

  // 1. Direct SVG parsing
  if (dataUrl.includes('image/svg') || dataUrl.includes('<svg')) {
    return parseSvgReceipt(dataUrl, options);
  }

  // 2. Call server-side Gemini receipt scanning endpoint if available
  if (!options.skipServerAi && typeof fetch === 'function') {
    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          mimeType,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.success && payload.data) {
          const aiData = payload.data;
          const detectedAccount =
            aiData.accountSuggestion && options.accounts
              ? detectAccountFromReceiptText(aiData.accountSuggestion, options.accounts)
              : undefined;

          // Align with available categories
          const mlPred = predictTransactionCategory(
            `${aiData.merchant || ''} ${aiData.note || ''} ${aiData.categorySuggestion || ''}`,
            {
              txType: 'Expense',
              categories: options.categories,
            }
          );

          return {
            merchant: aiData.merchant || 'Scanned Merchant',
            date:
              normalizeReceiptDate(aiData.date) ||
              new Date().toISOString().slice(0, 10),
            amount: Number(aiData.amount) || 0,
            currency: aiData.currency || 'INR',
            note:
              aiData.note ||
              `${aiData.merchant || 'Receipt'}${aiData.items?.length ? ` - ${aiData.items[0].name}` : ''}`,
            items: Array.isArray(aiData.items) ? aiData.items : [],
            suggestedType: 'Expense',
            suggestedCategory: mlPred.category || aiData.categorySuggestion || 'Food & Groceries',
            suggestedSubCategory: mlPred.subCategory || aiData.subCategorySuggestion || '',
            suggestedFixedOrVariable:
              aiData.fixedOrVariable === 'Fixed' ? 'Fixed' : mlPred.fixedOrVariable || 'Variable',
            suggestedAccountId: detectedAccount || options.accounts?.[0]?.id,
            confidence: 96,
            source: 'gemini-ai',
          };
        }
      }
    } catch (err) {
      console.warn('Server Gemini receipt scanning unavailable, falling back to local OCR:', err);
    }
  }

  // 3. Fallback: Parse available text or metadata
  return parseReceiptFromText(dataUrl, options);
}
