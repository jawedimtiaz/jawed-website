import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  Pencil,
  Trash2,
  RotateCcw,
  Plus,
  X,
  LayoutGrid,
  ListFilter,
  Eye,
  Upload,
  Sparkles,
  Repeat,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Mic,
  MicOff,
} from 'lucide-react';
import { CsvImportModal } from './CsvImportModal';
import { formatTransactionsToCsv } from './excelExporter';
import {
  formatINR,
  SAMPLE_RECEIPT_DATA_URL,
  saveTransaction as dbSaveTransaction,
  saveRecurringRule as dbSaveRecurringRule,
  syncRecurringTransactionsForMonth as dbSyncRecurringTransactionsForMonth,
  buildRecurringFeedTransactionsForMonth,
  computeNextRecurringDate,
  removeReceiptFromTransaction as dbRemoveReceiptFromTransaction,
  attachReceiptToTransaction as dbAttachReceiptToTransaction,
  type AccountSummary,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
  type RecurringFrequency,
  type RecurringRule,
  type TransactionType,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';

export type DailySubView = 'feed' | 'gallery';

export interface ReceiptGalleryItem {
  id: string;
  transactionId: string;
  receiptIndex: number;
  totalReceiptsOnTx: number;
  imageUrl: string;
  date: string;
  dateKey: string;
  type: MoneyTransaction['type'];
  amount: number;
  category: string;
  subCategory: string;
  note: string;
  accountId: string;
  accountName: string;
  fixedOrVariable: 'Fixed' | 'Variable';
  transaction: MoneyTransaction;
}

export interface DailyViewProps {
  selectedMonth: string;
  transactions: MoneyTransaction[];
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  recurringRules?: RecurringRule[];
  initialAccountFilter?: string;
  onEditTransaction: (tx: MoneyTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onUpdateTransaction?: (tx: MoneyTransaction) => Promise<void>;
  onSaveRecurringRule?: (
    rule: Omit<RecurringRule, 'id' | 'generatedCount'> & {
      id?: string;
      generatedCount?: number;
    }
  ) => Promise<void>;
  onSyncMonthRecurring?: (yearMonth: string) => Promise<void>;
  onOpenReceiptLightbox: (images: string[], title: string) => void;
  onOpenAddModal: (defaultDate?: string) => void;
  onOpenAddModalWithReceipt?: (receiptDataUrl: string) => void;
  onBulkImportComplete?: (imported: MoneyTransaction[]) => Promise<void> | void;
}

export interface DailyFilterCriteria {
  selectedMonth: string;
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  typeFilter?: string;
  natureFilter?: string;
  recurringFilter?: 'ALL' | 'RECURRING_ONLY' | 'ONE_TIME_ONLY';
  recurringRules?: RecurringRule[];
  accountNameMap?: Map<string, string>;
}

export interface ReceiptGalleryFilterCriteria {
  selectedMonth?: string;
  includeAllMonths?: boolean;
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  typeFilter?: string;
  accountNameMap?: Map<string, string>;
}

interface DayGroup {
  dateKey: string; // YYYY-MM-DD
  dayNumber: string;
  weekdayLabel: string;
  monthYearLabel: string;
  dailyIncome: number;
  dailyExpense: number;
  items: MoneyTransaction[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayHeaderParts(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map((n) => Number.parseInt(n, 10));
  const dateObj = new Date(y || 2026, (m || 11) - 1, d || 1);
  return {
    dayNumber: String(d || 1).padStart(2, '0'),
    weekdayLabel: WEEKDAYS[dateObj.getDay()] || 'Monday',
    monthYearLabel: `${SHORT_MONTHS[(m || 11) - 1] || 'Nov'} ${y || 2026}`,
  };
}

/**
 * Pure helper that filters transactions by month, note text / category name search query,
 * bank account, category dropdown, transaction type, and fixed/variable nature.
 */
export function filterDailyTransactions(
  transactions: MoneyTransaction[],
  criteria: DailyFilterCriteria
): MoneyTransaction[] {
  const {
    selectedMonth,
    searchQuery = '',
    accountFilter = 'ALL',
    categoryFilter = 'ALL',
    typeFilter = 'ALL',
    natureFilter = 'ALL',
    recurringFilter = 'ALL',
    recurringRules,
    accountNameMap,
  } = criteria;

  const sourceList =
    Array.isArray(recurringRules) && recurringRules.length > 0 && selectedMonth
      ? buildRecurringFeedTransactionsForMonth(transactions, recurringRules, selectedMonth)
      : transactions;

  const q = searchQuery.trim().toLowerCase();

  return sourceList.filter((tx) => {
    if (selectedMonth && !tx.date?.startsWith(selectedMonth)) return false;

    const isRecurringTx =
      Boolean(tx.recurringRuleId) ||
      tx.id.startsWith('tx-rec-') ||
      /\[(?:Auto-)?Recurring/i.test(tx.note || '');

    if (recurringFilter === 'RECURRING_ONLY' && !isRecurringTx) {
      return false;
    }
    if (recurringFilter === 'ONE_TIME_ONLY' && isRecurringTx) {
      return false;
    }

    if (accountFilter !== 'ALL') {
      const matchesSource = tx.accountId === accountFilter;
      const matchesTarget = tx.type === 'Transfer' && tx.toAccountId === accountFilter;
      if (!matchesSource && !matchesTarget) return false;
    }

    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
      return false;
    }

    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      return false;
    }

    if (natureFilter === 'Fixed' && tx.fixedOrVariable !== 'Fixed') {
      return false;
    }
    if (natureFilter === 'Variable' && tx.fixedOrVariable !== 'Variable') {
      return false;
    }
    if (natureFilter === 'ANOMALY' && !tx.isAnomaly) {
      return false;
    }

    if (q) {
      const accountLabel = accountNameMap?.get(tx.accountId) || tx.accountId || '';
      const targetAccountLabel = tx.toAccountId
        ? accountNameMap?.get(tx.toAccountId) || tx.toAccountId
        : '';
      const haystack = `${tx.category || ''} ${tx.subCategory || ''} ${tx.note || ''} ${accountLabel} ${targetAccountLabel}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal?: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex?: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

export interface SpeechRecognitionErrorEventLike {
  readonly error?: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

export type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

/**
 * Resolves the browser's SpeechRecognition constructor (`SpeechRecognition` or `webkitSpeechRecognition`).
 */
export function getSpeechRecognitionConstructor(
  win: unknown = typeof window !== 'undefined' ? window : undefined
): SpeechRecognitionConstructorLike | null {
  if (!win || typeof win !== 'object') return null;
  const record = win as Record<string, unknown>;
  const ctor = record.SpeechRecognition || record.webkitSpeechRecognition;
  return typeof ctor === 'function' ? (ctor as SpeechRecognitionConstructorLike) : null;
}

/**
 * Normalizes a dictated voice search transcript by collapsing whitespace and stripping
 * trailing sentence punctuation (e.g. "Food & Groceries." -> "Food & Groceries") so it
 * cleanly matches category names and transaction notes.
 */
export function normalizeVoiceSearchTranscript(rawTranscript: string): string {
  if (!rawTranscript || typeof rawTranscript !== 'string') return '';
  return rawTranscript
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?;:]+$/g, '')
    .trim();
}

/**
 * Extracts the combined dictated search query and finality flag from a SpeechRecognition result event.
 */
export function extractVoiceSearchTranscriptFromEvent(
  event: SpeechRecognitionEventLike
): { transcript: string; isFinal: boolean } {
  if (!event || !event.results || typeof event.results.length !== 'number') {
    return { transcript: '', isFinal: false };
  }

  const pieces: string[] = [];
  let isFinal = false;

  for (let i = 0; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (!result) continue;
    const alt = result[0];
    if (alt && typeof alt.transcript === 'string') {
      pieces.push(alt.transcript);
    }
    if (result.isFinal) {
      isFinal = true;
    }
  }

  return {
    transcript: normalizeVoiceSearchTranscript(pieces.join(' ')),
    isFinal,
  };
}

export interface VoiceSearchSessionOptions {
  onStart?: () => void;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (userMessage: string, errorCode?: string) => void;
  onEnd?: () => void;
  lang?: string;
  win?: unknown;
}

/**
 * Starts a browser SpeechRecognition session for dictating search queries into the Money Manager search bar.
 */
export function startVoiceSearchDictation(
  options: VoiceSearchSessionOptions
): SpeechRecognitionInstanceLike | null {
  const Ctor = getSpeechRecognitionConstructor(options.win);
  if (!Ctor) {
    options.onError?.(
      'Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.',
      'not-supported'
    );
    return null;
  }

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = options.lang || 'en-IN';
  if ('maxAlternatives' in recognition) {
    recognition.maxAlternatives = 1;
  }

  recognition.onstart = () => {
    options.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    const { transcript, isFinal } = extractVoiceSearchTranscriptFromEvent(event);
    if (transcript) {
      options.onTranscript(transcript, isFinal);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
    const code = event?.error || 'unknown';
    let message = 'Could not capture voice query. Please try again.';
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      message = 'Microphone permission was denied. Allow microphone access to dictate search queries.';
    } else if (code === 'no-speech') {
      message = 'No speech detected. Tap the microphone and speak a category or transaction note.';
    } else if (code === 'network') {
      message = 'Network error occurred during speech recognition.';
    }
    options.onError?.(message, code);
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  try {
    recognition.start();
    return recognition;
  } catch (err) {
    options.onError?.(
      err instanceof Error ? err.message : 'Unable to start microphone voice recognition.',
      'start-error'
    );
    return null;
  }
}

export interface FilteredDailyCsvExportResult {
  csvContent: string;
  fileName: string;
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
}

/**
 * Pure helper that filters Daily Ledger transactions using `filterDailyTransactions`
 * (or accepts an already-filtered list when `criteria` is omitted) and formats them
 * into a standard RFC-4180 accounting CSV payload.
 */
export function exportFilteredDailyTransactionsToCsv(
  transactions: MoneyTransaction[],
  criteria?: DailyFilterCriteria,
  accounts: AccountSummary[] = []
): FilteredDailyCsvExportResult {
  const accountNameMap =
    criteria?.accountNameMap || new Map(accounts.map((acc) => [acc.id, acc.name]));
  const filtered = criteria
    ? filterDailyTransactions(transactions, { ...criteria, accountNameMap })
    : transactions;

  const csvContent = formatTransactionsToCsv(filtered, accounts);
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of filtered) {
    if (tx.type === 'Income') totalIncome += tx.amount;
    if (tx.type === 'Expense') totalExpense += tx.amount;
  }

  const safeMonth = (criteria?.selectedMonth || 'all-months').replace(/[^0-9A-Za-z_-]/g, '-');
  const hasSubFilter = Boolean(
    (criteria?.searchQuery && criteria.searchQuery.trim() !== '') ||
      (criteria?.accountFilter && criteria.accountFilter !== 'ALL') ||
      (criteria?.categoryFilter && criteria.categoryFilter !== 'ALL') ||
      (criteria?.typeFilter && criteria.typeFilter !== 'ALL') ||
      (criteria?.natureFilter && criteria.natureFilter !== 'ALL') ||
      (criteria?.recurringFilter && criteria.recurringFilter !== 'ALL')
  );
  const suffix = hasSubFilter ? '-filtered' : '';
  const fileName = `jawed-money-manager-daily-ledger-${safeMonth}${suffix}.csv`;

  return {
    csvContent,
    fileName,
    transactionCount: filtered.length,
    totalIncome,
    totalExpense,
  };
}

/**
 * Triggers a browser CSV download of the filtered Daily Ledger transactions.
 */
export function triggerFilteredDailyCsvDownload(
  transactions: MoneyTransaction[],
  criteria?: DailyFilterCriteria,
  accounts: AccountSummary[] = []
): FilteredDailyCsvExportResult {
  const exportResult = exportFilteredDailyTransactionsToCsv(transactions, criteria, accounts);

  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob([`\uFEFF${exportResult.csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportResult.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return exportResult;
}

/**
 * Pure helper that aggregates all attached transaction receipts into a searchable list
 * of ReceiptGalleryItem objects, sorted newest first.
 */
export function aggregateTransactionReceipts(
  transactions: MoneyTransaction[],
  criteria: ReceiptGalleryFilterCriteria = {}
): ReceiptGalleryItem[] {
  const {
    selectedMonth = '',
    includeAllMonths = false,
    searchQuery = '',
    accountFilter = 'ALL',
    categoryFilter = 'ALL',
    typeFilter = 'ALL',
    accountNameMap,
  } = criteria;

  const q = searchQuery.trim().toLowerCase();
  const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const items: ReceiptGalleryItem[] = [];

  for (const tx of sortedTxs) {
    if (!Array.isArray(tx.receiptImages) || tx.receiptImages.length === 0) continue;

    if (!includeAllMonths && selectedMonth && !tx.date?.startsWith(selectedMonth)) {
      continue;
    }

    if (accountFilter !== 'ALL') {
      const matchesSource = tx.accountId === accountFilter;
      const matchesTarget = tx.type === 'Transfer' && tx.toAccountId === accountFilter;
      if (!matchesSource && !matchesTarget) continue;
    }

    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
      continue;
    }

    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      continue;
    }

    const accountName = accountNameMap?.get(tx.accountId) || tx.accountId || '';
    const dateKey = String(tx.date || '').slice(0, 10);

    if (q) {
      const haystack = `${tx.category || ''} ${tx.subCategory || ''} ${tx.note || ''} ${accountName} ${dateKey} ${tx.amount}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    tx.receiptImages.forEach((imgUrl, idx) => {
      if (!imgUrl) return;
      items.push({
        id: `${tx.id}-rcpt-${idx}`,
        transactionId: tx.id,
        receiptIndex: idx,
        totalReceiptsOnTx: tx.receiptImages.length,
        imageUrl: imgUrl,
        date: tx.date,
        dateKey,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        subCategory: tx.subCategory,
        note: tx.note,
        accountId: tx.accountId,
        accountName,
        fixedOrVariable: tx.fixedOrVariable,
        transaction: tx,
      });
    });
  }

  return items;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const cleanQuery = query.trim();
  if (!cleanQuery || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIdx = lowerText.indexOf(lowerQuery);
  if (matchIdx === -1) return text;

  const before = text.slice(0, matchIdx);
  const match = text.slice(matchIdx, matchIdx + cleanQuery.length);
  const after = text.slice(matchIdx + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="search-highlight">{match}</mark>
      {after}
    </>
  );
}

export const DailyView: React.FC<DailyViewProps> = ({
  selectedMonth,
  transactions,
  accounts,
  categories,
  recurringRules = [],
  initialAccountFilter = 'ALL',
  onEditTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  onSaveRecurringRule,
  onSyncMonthRecurring,
  onOpenReceiptLightbox,
  onOpenAddModal,
  onOpenAddModalWithReceipt,
  onBulkImportComplete,
}) => {
  const [dailySubView, setDailySubView] = useState<DailySubView>('feed');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [includeAllMonthsInGallery, setIncludeAllMonthsInGallery] = useState<boolean>(false);
  const [localTransactions, setLocalTransactions] = useState<MoneyTransaction[]>(transactions);
  const [localRecurringRules, setLocalRecurringRules] = useState<RecurringRule[]>(recurringRules);
  const [accountFilter, setAccountFilter] = useState<string>(initialAccountFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [natureFilter, setNatureFilter] = useState<string>('ALL');
  const [recurringFilter, setRecurringFilter] = useState<'ALL' | 'RECURRING_ONLY' | 'ONE_TIME_ONLY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxIdForAttach, setSelectedTxIdForAttach] = useState<string>('');
  const receiptUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Recurring Creator State inside Daily Feed
  const [showRecurringQuickForm, setShowRecurringQuickForm] = useState<boolean>(false);
  const [recTitle, setRecTitle] = useState<string>('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('Monthly');
  const [recType, setRecType] = useState<TransactionType>('Expense');
  const [recAmount, setRecAmount] = useState<string>('');
  const [recCategory, setRecCategory] = useState<string>(
    categories.find((c) => c.type === 'Expense')?.name || 'Rent & Housing'
  );
  const [recAccountId, setRecAccountId] = useState<string>(accounts[0]?.id || 'acc-icici');
  const [recStartDate, setRecStartDate] = useState<string>(`${selectedMonth}-05`);
  const [recNotice, setRecNotice] = useState<string>('');
  const [csvExportNotice, setCsvExportNotice] = useState<string>('');
  const [isListeningVoiceSearch, setIsListeningVoiceSearch] = useState<boolean>(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState<string>('');
  const [voiceSearchError, setVoiceSearchError] = useState<boolean>(false);
  const voiceRecognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);

  useEffect(() => {
    return () => {
      if (voiceRecognitionRef.current) {
        try {
          if (typeof voiceRecognitionRef.current.abort === 'function') {
            voiceRecognitionRef.current.abort();
          } else {
            voiceRecognitionRef.current.stop();
          }
        } catch {
          // Ignore teardown errors on unmount
        }
        voiceRecognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    setLocalRecurringRules(recurringRules);
  }, [recurringRules]);

  useEffect(() => {
    setRecStartDate(`${selectedMonth}-05`);
  }, [selectedMonth]);

  useEffect(() => {
    setAccountFilter(initialAccountFilter);
  }, [initialAccountFilter]);

  const accountNameMap = useMemo(() => {
    return new Map(accounts.map((acc) => [acc.id, acc.name]));
  }, [accounts]);

  const categoryIconMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.name, cat.iconName]));
  }, [categories]);

  const recurringRuleById = useMemo(() => {
    return new Map(localRecurringRules.map((r) => [r.id, r]));
  }, [localRecurringRules]);

  // Automatically merge active recurring rules' occurrences for selectedMonth into the monthly feed
  const mergedMonthFeedTransactions = useMemo(
    () =>
      buildRecurringFeedTransactionsForMonth(
        localTransactions,
        localRecurringRules,
        selectedMonth
      ),
    [localTransactions, localRecurringRules, selectedMonth]
  );

  const monthTransactions = useMemo(
    () => mergedMonthFeedTransactions.filter((tx) => tx.date?.startsWith(selectedMonth)),
    [mergedMonthFeedTransactions, selectedMonth]
  );

  const monthRecurringEntriesCount = useMemo(
    () =>
      monthTransactions.filter(
        (tx) =>
          Boolean(tx.recurringRuleId) ||
          tx.id.startsWith('tx-rec-') ||
          /\[(?:Auto-)?Recurring/i.test(tx.note || '')
      ).length,
    [monthTransactions]
  );

  const monthTransactionsCount = monthTransactions.length;

  useEffect(() => {
    if (!selectedTxIdForAttach && monthTransactions.length > 0) {
      setSelectedTxIdForAttach(monthTransactions[0].id);
    }
  }, [monthTransactions, selectedTxIdForAttach]);

  const filteredTransactions = useMemo(
    () =>
      filterDailyTransactions(localTransactions, {
        selectedMonth,
        searchQuery,
        accountFilter,
        categoryFilter,
        typeFilter,
        natureFilter,
        recurringFilter,
        recurringRules: localRecurringRules,
        accountNameMap,
      }),
    [
      localTransactions,
      localRecurringRules,
      selectedMonth,
      searchQuery,
      accountFilter,
      categoryFilter,
      typeFilter,
      natureFilter,
      recurringFilter,
      accountNameMap,
    ]
  );

  const receiptGalleryItems = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        selectedMonth,
        includeAllMonths: includeAllMonthsInGallery,
        searchQuery,
        accountFilter,
        categoryFilter,
        typeFilter,
        accountNameMap,
      }),
    [
      localTransactions,
      selectedMonth,
      includeAllMonthsInGallery,
      searchQuery,
      accountFilter,
      categoryFilter,
      typeFilter,
      accountNameMap,
    ]
  );

  const totalMonthReceiptsCount = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        selectedMonth,
        includeAllMonths: false,
        accountNameMap,
      }).length,
    [localTransactions, selectedMonth, accountNameMap]
  );

  const totalAllReceiptsCount = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        includeAllMonths: true,
        accountNameMap,
      }).length,
    [localTransactions, accountNameMap]
  );

  const handleDeleteReceiptImage = async (transactionId: string, receiptIndex: number) => {
    const targetTx = localTransactions.find((tx) => tx.id === transactionId);
    if (!targetTx) return;

    const updatedReceipts = (targetTx.receiptImages || []).filter(
      (_, idx) => idx !== receiptIndex
    );
    const updatedTx: MoneyTransaction = {
      ...targetTx,
      receiptImages: updatedReceipts,
    };

    setLocalTransactions((prev) =>
      prev.map((tx) => (tx.id === transactionId ? updatedTx : tx))
    );

    if (onUpdateTransaction) {
      await onUpdateTransaction(updatedTx);
    } else {
      await dbRemoveReceiptFromTransaction(transactionId, receiptIndex);
    }
  };

  const handleAttachReceiptDataUrl = async (transactionId: string, dataUrl: string) => {
    const targetTx = localTransactions.find((tx) => tx.id === transactionId);
    if (!targetTx || !dataUrl) return;

    const updatedTx: MoneyTransaction = {
      ...targetTx,
      receiptImages: [...(targetTx.receiptImages || []), dataUrl],
    };

    setLocalTransactions((prev) =>
      prev.map((tx) => (tx.id === transactionId ? updatedTx : tx))
    );

    if (onUpdateTransaction) {
      await onUpdateTransaction(updatedTx);
    } else {
      await dbAttachReceiptToTransaction(transactionId, dataUrl);
      await dbSaveTransaction(updatedTx);
    }
  };

  const handleReceiptFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = selectedTxIdForAttach || monthTransactions[0]?.id || localTransactions[0]?.id;
    if (!file || !targetId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await handleAttachReceiptDataUrl(targetId, reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (receiptUploadInputRef.current) {
      receiptUploadInputRef.current.value = '';
    }
  };

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'Income') income += tx.amount;
      if (tx.type === 'Expense') expense += tx.amount;
    }
    return { income, expense };
  }, [filteredTransactions]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groupsMap = new Map<string, MoneyTransaction[]>();
    for (const tx of filteredTransactions) {
      const dateKey = tx.date.slice(0, 10);
      const list = groupsMap.get(dateKey) || [];
      list.push(tx);
      groupsMap.set(dateKey, list);
    }

    const sortedDates = [...groupsMap.keys()].sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateKey) => {
      const items = groupsMap.get(dateKey) || [];
      let dailyIncome = 0;
      let dailyExpense = 0;

      for (const tx of items) {
        if (tx.type === 'Income') dailyIncome += tx.amount;
        if (tx.type === 'Expense') dailyExpense += tx.amount;
      }

      const parts = formatDayHeaderParts(dateKey);

      return {
        dateKey,
        ...parts,
        dailyIncome,
        dailyExpense,
        items,
      };
    });
  }, [filteredTransactions]);

  const hasActiveFilters =
    accountFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    natureFilter !== 'ALL' ||
    recurringFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setAccountFilter('ALL');
    setCategoryFilter('ALL');
    setTypeFilter('ALL');
    setNatureFilter('ALL');
    setRecurringFilter('ALL');
    setSearchQuery('');
    setVoiceSearchStatus('');
    setVoiceSearchError(false);
  };

  const handleToggleVoiceSearch = () => {
    if (isListeningVoiceSearch && voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      voiceRecognitionRef.current = null;
      setIsListeningVoiceSearch(false);
      setVoiceSearchStatus('');
      return;
    }

    setVoiceSearchError(false);
    const session = startVoiceSearchDictation({
      onStart: () => {
        setIsListeningVoiceSearch(true);
        setVoiceSearchError(false);
        setVoiceSearchStatus('Listening… Speak a category or transaction note');
      },
      onTranscript: (transcript, isFinal) => {
        setSearchQuery(transcript);
        setVoiceSearchError(false);
        setVoiceSearchStatus(
          isFinal
            ? `Voice search: "${transcript}"`
            : `Hearing: "${transcript}"…`
        );
      },
      onError: (userMessage, errorCode) => {
        setIsListeningVoiceSearch(false);
        voiceRecognitionRef.current = null;
        if (errorCode === 'aborted') {
          setVoiceSearchStatus('');
          return;
        }
        setVoiceSearchError(true);
        setVoiceSearchStatus(userMessage);
      },
      onEnd: () => {
        setIsListeningVoiceSearch(false);
        voiceRecognitionRef.current = null;
      },
    });

    if (session) {
      voiceRecognitionRef.current = session;
      setIsListeningVoiceSearch(true);
    }
  };

  const handleCreateQuickRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(recAmount);
    if (!recTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }

    const start = recStartDate || `${selectedMonth}-01`;
    const matchedCat = categories.find((c) => c.name === recCategory);
    const fixedOrVar: FixedOrVariable = matchedCat?.defaultFixedOrVariable || 'Fixed';

    const newRulePayload: Omit<RecurringRule, 'id' | 'generatedCount'> & {
      id?: string;
      generatedCount?: number;
    } = {
      title: recTitle.trim(),
      frequency: recFrequency,
      type: recType,
      accountId: recAccountId,
      toAccountId:
        recType === 'Transfer'
          ? accounts.find((a) => a.id !== recAccountId)?.id || 'acc-sbi'
          : undefined,
      amount: numericAmount,
      category: recType === 'Transfer' ? 'Transfer' : recCategory,
      subCategory: recTitle.trim(),
      fixedOrVariable: fixedOrVar,
      note: `${recTitle.trim()} [Auto-Recurring: ${recFrequency}]`,
      startDate: start,
      nextRunDate: start,
      timeOfDay: '09:30',
      active: true,
      generatedCount: 0,
    };

    if (onSaveRecurringRule) {
      await onSaveRecurringRule(newRulePayload);
    } else {
      const savedRule = await dbSaveRecurringRule(newRulePayload);
      setLocalRecurringRules((prev) => [...prev, savedRule]);
    }

    if (onSyncMonthRecurring) {
      await onSyncMonthRecurring(selectedMonth);
    } else {
      await dbSyncRecurringTransactionsForMonth(selectedMonth);
    }

    setRecNotice(
      `Added ${recFrequency} recurring rule "${recTitle.trim()}" (${formatINR(numericAmount)}) — now appearing in ${selectedMonth} feed.`
    );
    setRecTitle('');
    setRecAmount('');
    setShowRecurringQuickForm(false);
  };

  const handleSyncRecurringToLedger = async () => {
    if (onSyncMonthRecurring) {
      await onSyncMonthRecurring(selectedMonth);
    } else {
      const res = await dbSyncRecurringTransactionsForMonth(selectedMonth);
      if (res.generatedTransactions.length > 0) {
        setLocalTransactions((prev) => [...prev, ...res.generatedTransactions]);
      }
    }
    setRecNotice(`Synced all due ${selectedMonth} recurring transactions into the ledger.`);
  };

  const handleExportFilteredCsv = () => {
    const result = triggerFilteredDailyCsvDownload(
      localTransactions,
      {
        selectedMonth,
        searchQuery,
        accountFilter,
        categoryFilter,
        typeFilter,
        natureFilter,
        recurringFilter,
        recurringRules: localRecurringRules,
        accountNameMap,
      },
      accounts
    );
    setCsvExportNotice(
      `Exported ${result.transactionCount} filtered ${
        result.transactionCount === 1 ? 'transaction' : 'transactions'
      } to ${result.fileName}`
    );
  };

  return (
    <section className="mm-view-section" aria-label="Daily Ledger View">
      {/* Daily Feed vs Receipt Gallery View Switcher Bar */}
      <div
        className="mm-filter-bar"
        data-testid="mm-daily-mode-bar"
        style={{ padding: '12px 16px' }}
      >
        <div className="mm-stat-panel-header" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ListFilter size={17} style={{ color: 'var(--accent)' }} />
            <strong>Daily Ledger &amp; Receipt Vault</strong>
            <span className="mm-stat-panel-sub" style={{ margin: 0 }}>
              ({monthTransactionsCount} entries in {selectedMonth} · {monthRecurringEntriesCount}{' '}
              recurring · {totalMonthReceiptsCount}{' '}
              {totalMonthReceiptsCount === 1 ? 'receipt' : 'receipts'} attached)
            </span>
          </div>

          <div
            role="group"
            aria-label="Switch between Daily Feed and Receipt Gallery"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => setDailySubView('feed')}
              className={`mm-btn mm-btn-sm ${
                dailySubView === 'feed' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-daily-mode-feed-btn"
            >
              <ListFilter size={14} />
              <span>Daily Transactions ({filteredTransactions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDailySubView('gallery')}
              className={`mm-btn mm-btn-sm ${
                dailySubView === 'gallery' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-daily-mode-gallery-btn"
            >
              <LayoutGrid size={14} />
              <span>
                Receipt Gallery (
                {includeAllMonthsInGallery ? totalAllReceiptsCount : totalMonthReceiptsCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="mm-btn mm-btn-sm mm-btn-secondary"
              title="Import bank statement CSV with auto category & account matching"
              data-testid="mm-daily-import-csv-btn"
            >
              <FileSpreadsheet size={14} style={{ color: '#10b981' }} />
              <span>Import Bank CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportFilteredCsv}
              disabled={filteredTransactions.length === 0}
              className="mm-btn mm-btn-sm mm-btn-secondary"
              title="Download currently filtered Daily Ledger transactions as a formatted CSV file"
              data-testid="mm-daily-export-csv-btn"
            >
              <Download size={14} style={{ color: '#38bdf8' }} />
              <span>Export to CSV ({filteredTransactions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recurring Transactions Monthly Feed Bar & Inline Creator */}
      {dailySubView === 'feed' && (
        <div
          className="mm-filter-bar"
          style={{
            padding: '10px 16px',
            borderColor: 'rgba(6, 182, 212, 0.35)',
            background: 'rgba(6, 182, 212, 0.05)',
          }}
          data-testid="mm-daily-recurring-bar"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Repeat size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem' }}>
                <strong>Recurring Transactions in {selectedMonth} Feed:</strong>{' '}
                <span data-testid="mm-daily-recurring-count">
                  {monthRecurringEntriesCount} auto-repeating{' '}
                  {monthRecurringEntriesCount === 1 ? 'entry' : 'entries'}
                </span>{' '}
                from {localRecurringRules.filter((r) => r.active).length} active schedules
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  setRecurringFilter((prev) =>
                    prev === 'RECURRING_ONLY' ? 'ALL' : 'RECURRING_ONLY'
                  )
                }
                className={`mm-btn mm-btn-sm ${
                  recurringFilter === 'RECURRING_ONLY' ? 'mm-btn-primary' : 'mm-btn-secondary'
                }`}
                data-testid="mm-daily-filter-recurring-btn"
              >
                <Repeat size={13} />
                <span>
                  {recurringFilter === 'RECURRING_ONLY'
                    ? 'Showing Recurring Only'
                    : `Filter Recurring (${monthRecurringEntriesCount})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSyncRecurringToLedger}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Persist all scheduled recurring transactions for this month to IndexedDB"
                data-testid="mm-daily-sync-recurring-btn"
              >
                <CalendarClock size={13} />
                <span>Sync Month to Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRecurringQuickForm((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-primary"
                data-testid="mm-daily-add-recurring-btn"
              >
                <Plus size={13} />
                <span>
                  {showRecurringQuickForm ? 'Close Form' : 'Define Recurring Transaction'}
                </span>
              </button>
            </div>
          </div>

          {recNotice && (
            <div
              role="status"
              data-testid="mm-daily-recurring-notice"
              style={{
                marginTop: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} />
                {recNotice}
              </span>
              <button
                type="button"
                onClick={() => setRecNotice('')}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                style={{ padding: '1px 6px', fontSize: '0.72rem' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {showRecurringQuickForm && (
            <form
              onSubmit={handleCreateQuickRecurring}
              data-testid="mm-daily-recurring-quick-form"
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: 8,
                alignItems: 'end',
                width: '100%',
              }}
            >
              <div className="mm-field">
                <label htmlFor="mm-quick-rec-title">Recurring Title *</label>
                <input
                  id="mm-quick-rec-title"
                  type="text"
                  required
                  placeholder="e.g., Monthly Rent, Netflix, Cloud Lab"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="mm-input"
                  data-testid="mm-quick-rec-title-input"
                />
              </div>

              <div className="mm-field">
                <label htmlFor="mm-quick-rec-frequency">Frequency *</label>
                <select
                  id="mm-quick-rec-frequency"
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                  className="mm-select"
                  data-testid="mm-quick-rec-frequency-select"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-quick-rec-type">Type</label>
                <select
                  id="mm-quick-rec-type"
                  value={recType}
                  onChange={(e) => {
                    const nextT = e.target.value as TransactionType;
                    setRecType(nextT);
                    if (nextT !== 'Transfer') {
                      const firstMatch = categories.find((c) => c.type === nextT);
                      if (firstMatch) setRecCategory(firstMatch.name);
                    }
                  }}
                  className="mm-select"
                  data-testid="mm-quick-rec-type-select"
                >
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-quick-rec-amount">Amount (₹) *</label>
                <input
                  id="mm-quick-rec-amount"
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g., 1499"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  className="mm-input"
                  data-testid="mm-quick-rec-amount-input"
                />
              </div>

              {recType !== 'Transfer' && (
                <div className="mm-field">
                  <label htmlFor="mm-quick-rec-category">Category</label>
                  <select
                    id="mm-quick-rec-category"
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="mm-select"
                    data-testid="mm-quick-rec-category-select"
                  >
                    {categories
                      .filter((c) => c.type === recType)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="mm-field">
                <label htmlFor="mm-quick-rec-account">Account</label>
                <select
                  id="mm-quick-rec-account"
                  value={recAccountId}
                  onChange={(e) => setRecAccountId(e.target.value)}
                  className="mm-select"
                  data-testid="mm-quick-rec-account-select"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-quick-rec-start">Start Date</label>
                <input
                  id="mm-quick-rec-start"
                  type="date"
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                  className="mm-input"
                  data-testid="mm-quick-rec-start-input"
                />
              </div>

              <button
                type="submit"
                className="mm-btn mm-btn-primary"
                data-testid="mm-quick-rec-submit-btn"
              >
                <CheckCircle2 size={14} />
                <span>Add to Feed</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Multi-Facet Search & Filter Bar */}
      <div className="mm-filter-bar">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          <div className="mm-search-input-wrap" style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={15} className="mm-search-icon" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setVoiceSearchStatus('');
                  setVoiceSearchError(false);
                }
              }}
              placeholder={
                isListeningVoiceSearch
                  ? 'Listening… Speak a category or transaction note...'
                  : 'Instant filter by note text, category, or sub-category...'
              }
              className="mm-filter-input"
              style={{
                paddingRight: searchQuery ? '66px' : '40px',
                borderColor: isListeningVoiceSearch ? '#10b981' : undefined,
                boxShadow: isListeningVoiceSearch
                  ? '0 0 0 2px rgba(16, 185, 129, 0.2)'
                  : undefined,
              }}
              aria-label="Search transactions by note or category"
              data-testid="mm-daily-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVoiceSearchStatus('');
                  setVoiceSearchError(false);
                }}
                className="mm-filter-clear-icon"
                style={{ right: '34px' }}
                aria-label="Clear search query"
                title="Clear search"
                data-testid="mm-daily-search-clear-btn"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              aria-label={
                isListeningVoiceSearch
                  ? 'Stop voice search dictation'
                  : 'Dictate search query by voice'
              }
              aria-pressed={isListeningVoiceSearch}
              title={
                isListeningVoiceSearch
                  ? 'Listening… Tap to stop voice dictation'
                  : 'Tap microphone to dictate category or transaction note'
              }
              data-testid="mm-daily-voice-search-btn"
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: isListeningVoiceSearch
                  ? '1px solid rgba(244, 63, 94, 0.5)'
                  : '1px solid transparent',
                background: isListeningVoiceSearch
                  ? 'rgba(244, 63, 94, 0.16)'
                  : 'rgba(148, 163, 184, 0.12)',
                color: isListeningVoiceSearch ? '#f43f5e' : 'var(--accent, #38bdf8)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {isListeningVoiceSearch ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Bank or Account"
            data-testid="mm-filter-account"
          >
            <option value="ALL">All Accounts &amp; Banks</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Category"
            data-testid="mm-filter-category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
            <option value="Transfer">Transfer</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Transaction Type"
            data-testid="mm-filter-type"
          >
            <option value="ALL">All Types</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
            <option value="Transfer">Transfer</option>
          </select>

          <select
            value={natureFilter}
            onChange={(e) => setNatureFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Fixed or Variable"
            data-testid="mm-filter-nature"
          >
            <option value="ALL">Fixed &amp; Variable</option>
            <option value="Fixed">Fixed Only</option>
            <option value="Variable">Variable Only</option>
            <option value="ANOMALY">⚠️ Anomalies Only</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mm-btn mm-btn-ghost"
              title="Reset all filters"
              data-testid="mm-reset-filters-btn"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {(isListeningVoiceSearch || voiceSearchStatus) && (
          <div
            role="status"
            aria-live="polite"
            data-testid="mm-daily-voice-search-status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              background: voiceSearchError
                ? 'rgba(244, 63, 94, 0.12)'
                : 'rgba(16, 185, 129, 0.12)',
              border: voiceSearchError
                ? '1px solid rgba(244, 63, 94, 0.35)'
                : '1px solid rgba(16, 185, 129, 0.35)',
              color: voiceSearchError ? '#fb7185' : '#10b981',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mic size={13} />
              <span>{voiceSearchStatus || 'Listening… Speak a category or transaction note'}</span>
            </span>
            {!isListeningVoiceSearch && (
              <button
                type="button"
                onClick={() => {
                  setVoiceSearchStatus('');
                  setVoiceSearchError(false);
                }}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                style={{ padding: '1px 6px', fontSize: '0.72rem' }}
                aria-label="Dismiss voice search status"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Instant Search / Filter Summary Strip */}
        <div className="mm-filter-summary-strip" data-testid="mm-daily-filter-summary">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> of{' '}
            <strong>{monthTransactionsCount}</strong> entries in {selectedMonth}
            {searchQuery.trim() ? (
              <>
                {' '}
                matching <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong>
              </>
            ) : null}
          </span>

          <div className="mm-filter-pills" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="mm-pill mm-pill-income">
              Filtered Income: +{formatINR(filteredTotals.income)}
            </span>
            <span className="mm-pill mm-pill-expense">
              Filtered Expense: -{formatINR(filteredTotals.expense)}
            </span>
            <button
              type="button"
              onClick={handleExportFilteredCsv}
              disabled={filteredTransactions.length === 0}
              className="mm-btn mm-btn-sm mm-btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
              title="Export filtered transaction list to CSV"
              data-testid="mm-filter-summary-export-csv-btn"
            >
              <Download size={13} />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>

        {csvExportNotice && (
          <div
            role="status"
            aria-live="polite"
            data-testid="mm-daily-csv-export-notice"
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} />
              {csvExportNotice}
            </span>
            <button
              type="button"
              onClick={() => setCsvExportNotice('')}
              className="mm-btn mm-btn-sm mm-btn-ghost"
              style={{ padding: '1px 6px', fontSize: '0.72rem' }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Receipt Gallery View vs Grouped Daily Transaction Feed */}
      {dailySubView === 'gallery' ? (
        <article
          className="mm-stat-panel"
          data-testid="mm-receipt-gallery-view"
          style={{ marginTop: 4 }}
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <ImageIcon
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Receipt Gallery &amp; Attachment Manager
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Search, inspect, attach, and delete transaction receipt images stored locally in IndexedDB
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIncludeAllMonthsInGallery((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                data-testid="mm-receipt-scope-toggle-btn"
              >
                {includeAllMonthsInGallery
                  ? `Showing All Months (${totalAllReceiptsCount})`
                  : `Showing ${selectedMonth} Only (${totalMonthReceiptsCount})`}
              </button>
            </div>
          </div>

          {/* Quick Attach Receipt to Transaction Bar */}
          <div
            className="mm-inline-form-card"
            data-testid="mm-receipt-quick-attach-bar"
            style={{
              marginBottom: 14,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div className="mm-field" style={{ flex: '1 1 260px' }}>
              <label htmlFor="mm-receipt-attach-tx-select">
                Attach Receipt Image to Transaction Entry
              </label>
              <select
                id="mm-receipt-attach-tx-select"
                value={selectedTxIdForAttach}
                onChange={(e) => setSelectedTxIdForAttach(e.target.value)}
                className="mm-select"
                data-testid="mm-receipt-attach-tx-select"
              >
                {(includeAllMonthsInGallery ? localTransactions : monthTransactions).map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.date.slice(0, 10)} · {tx.category} ({formatINR(tx.amount)}) —{' '}
                    {(tx.receiptImages || []).length} receipt(s)
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={receiptUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleReceiptFileSelected}
              className="mm-sr-only"
              data-testid="mm-receipt-file-input"
            />

            <button
              type="button"
              onClick={() => receiptUploadInputRef.current?.click()}
              className="mm-btn mm-btn-primary mm-btn-sm"
              data-testid="mm-receipt-attach-upload-btn"
            >
              <Upload size={14} />
              <span>Upload Receipt Image</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetId =
                  selectedTxIdForAttach || monthTransactions[0]?.id || localTransactions[0]?.id;
                if (targetId) {
                  handleAttachReceiptDataUrl(targetId, SAMPLE_RECEIPT_DATA_URL);
                }
              }}
              className="mm-btn mm-btn-secondary mm-btn-sm"
              data-testid="mm-receipt-attach-sample-btn"
            >
              <Sparkles size={14} />
              <span>Attach Sample Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenAddModalWithReceipt) {
                  onOpenAddModalWithReceipt(SAMPLE_RECEIPT_DATA_URL);
                } else {
                  onOpenAddModal();
                }
              }}
              className="mm-btn mm-btn-primary mm-btn-sm"
              data-testid="mm-gallery-scan-new-tx-btn"
              title="Scan a receipt directly to auto-fill a new ledger transaction"
            >
              <Sparkles size={14} />
              <span>Scan Receipt → New Tx</span>
            </button>
          </div>

          {receiptGalleryItems.length === 0 ? (
            <div className="mm-empty-state" data-testid="mm-receipt-gallery-empty">
              <ImageIcon size={28} />
              <p className="mm-empty-title" style={{ margin: '8px 0 4px' }}>
                No attached receipts match your current search or filters.
              </p>
              <p className="mm-empty-subtitle">
                Upload a receipt image above, attach a sample receipt, or clear your search filter.
              </p>
            </div>
          ) : (
            <div
              className="mm-receipt-gallery-grid"
              data-testid="mm-receipt-gallery-grid"
            >
              {receiptGalleryItems.map((item) => (
                <div
                  key={item.id}
                  className="mm-receipt-gallery-card"
                  data-testid={`mm-receipt-card-${item.transactionId}-${item.receiptIndex}`}
                >
                  <button
                    type="button"
                    className="mm-receipt-thumb-btn"
                    onClick={() =>
                      onOpenReceiptLightbox(
                        item.transaction.receiptImages,
                        `${item.category} (${formatINR(item.amount)}) — ${item.dateKey}`
                      )
                    }
                    title="Click to inspect full-size receipt"
                    data-testid={`mm-receipt-thumb-${item.transactionId}-${item.receiptIndex}`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={`Receipt for ${item.category} on ${item.dateKey}`}
                      className="mm-receipt-thumb-img"
                    />
                    <span className="mm-receipt-thumb-badge">
                      Receipt #{item.receiptIndex + 1} of {item.totalReceiptsOnTx}
                    </span>
                  </button>

                  <div className="mm-receipt-card-body">
                    <div className="mm-receipt-card-top">
                      <div>
                        <strong className="mm-receipt-card-category">
                          {highlightMatch(item.category, searchQuery)}
                        </strong>
                        {item.subCategory && (
                          <span className="mm-receipt-card-subcat">
                            {' '}
                            · {highlightMatch(item.subCategory, searchQuery)}
                          </span>
                        )}
                      </div>
                      <strong
                        className={`mm-receipt-card-amount ${
                          item.type === 'Income'
                            ? 'mm-text-income'
                            : item.type === 'Expense'
                            ? 'mm-text-expense'
                            : 'mm-text-transfer'
                        }`}
                      >
                        {formatINR(item.amount)}
                      </strong>
                    </div>

                    <p className="mm-receipt-card-note">
                      {item.note ? highlightMatch(item.note, searchQuery) : 'No memo attached'}
                    </p>

                    <div className="mm-receipt-card-meta">
                      <span className="mm-tx-account-name">{item.accountName}</span>
                      <span>·</span>
                      <span>{item.dateKey}</span>
                      <span>·</span>
                      <span>{item.fixedOrVariable}</span>
                    </div>

                    <div className="mm-receipt-card-actions">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReceiptLightbox(
                            item.transaction.receiptImages,
                            `${item.category} (${formatINR(item.amount)}) — ${item.dateKey}`
                          )
                        }
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        data-testid={`mm-receipt-view-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditTransaction(item.transaction)}
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        title="Manage transaction & receipts"
                        data-testid={`mm-receipt-edit-tx-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Pencil size={13} />
                        <span>Manage</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenAddModalWithReceipt) {
                            onOpenAddModalWithReceipt(item.imageUrl);
                          } else {
                            onOpenAddModal(item.dateKey);
                          }
                        }}
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        title="Scan this receipt to auto-fill a new transaction"
                        data-testid={`mm-receipt-scan-new-tx-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Sparkles size={13} />
                        <span>Scan New</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteReceiptImage(item.transactionId, item.receiptIndex)
                        }
                        className="mm-icon-action-btn is-danger"
                        title="Delete this receipt image"
                        aria-label={`Delete receipt #${item.receiptIndex + 1} for ${item.category}`}
                        data-testid={`mm-receipt-delete-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      ) : dayGroups.length === 0 ? (
        <div className="mm-empty-state" data-testid="mm-daily-empty">
          <p className="mm-empty-title">No transactions match the current month or filters.</p>
          <p className="mm-empty-subtitle">
            Add a new income, expense, or bank transfer entry, or clear your active filters.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' }}>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="mm-btn mm-btn-secondary">
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenAddModal(`${selectedMonth}-01`)}
              className="mm-btn mm-btn-primary"
            >
              <Plus size={15} />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mm-day-groups-list" data-testid="mm-day-groups-list">
          {dayGroups.map((group) => (
            <article key={group.dateKey} className="mm-day-card">
              {/* Realbyte Day Header Bar */}
              <div className="mm-day-header">
                <div className="mm-day-date-cluster">
                  <span className="mm-day-number">{group.dayNumber}</span>
                  <div>
                    <strong className="mm-day-weekday">{group.weekdayLabel}</strong>
                    <span className="mm-day-month-year"> · {group.monthYearLabel}</span>
                  </div>
                </div>

                <div className="mm-day-totals">
                  <span className="mm-day-income" title="Daily Income">
                    +{formatINR(group.dailyIncome)}
                  </span>
                  <span className="mm-day-expense" title="Daily Expense">
                    -{formatINR(group.dailyExpense)}
                  </span>
                </div>
              </div>

              {/* Day Transactions List */}
              <div className="mm-tx-list">
                {group.items.map((tx) => {
                  const sourceAccount = accountNameMap.get(tx.accountId) || tx.accountId;
                  const targetAccount = tx.toAccountId
                    ? accountNameMap.get(tx.toAccountId) || tx.toAccountId
                    : '';
                  const timePart = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : '';
                  const iconName =
                    tx.type === 'Transfer' ? 'ArrowLeftRight' : categoryIconMap.get(tx.category);
                  const hasReceipts = Array.isArray(tx.receiptImages) && tx.receiptImages.length > 0;
                  const categoryLabel = tx.type === 'Transfer' ? 'Self Transfer' : tx.category;
                  const matchedRule = tx.recurringRuleId
                    ? recurringRuleById.get(tx.recurringRuleId)
                    : undefined;
                  const isRecurringEntry =
                    Boolean(tx.recurringRuleId) ||
                    tx.id.startsWith('tx-rec-') ||
                    /\[(?:Auto-)?Recurring/i.test(tx.note || '');

                  return (
                    <div key={tx.id} className="mm-tx-row" data-testid={`mm-tx-row-${tx.id}`}>
                      {/* Left: Category Icon + Details */}
                      <div className="mm-tx-main">
                        <div className={`mm-tx-icon-box is-${tx.type.toLowerCase()}`}>
                          {renderCategoryIcon(iconName, 18)}
                        </div>

                        <div className="mm-tx-info">
                          <div className="mm-tx-title-line">
                            <strong className="mm-tx-category">
                              {highlightMatch(categoryLabel, searchQuery)}
                            </strong>
                            {tx.subCategory && (
                              <span className="mm-tx-subcategory">
                                · {highlightMatch(tx.subCategory, searchQuery)}
                              </span>
                            )}
                            <span className="mm-tx-meta-sep">·</span>
                            <span className="mm-tx-nature">{tx.fixedOrVariable}</span>
                            {isRecurringEntry && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '1px 7px',
                                  borderRadius: 999,
                                  fontSize: '0.69rem',
                                  fontWeight: 600,
                                  background: 'rgba(6, 182, 212, 0.14)',
                                  color: 'var(--accent)',
                                  border: '1px solid rgba(6, 182, 212, 0.35)',
                                }}
                                title="Automatically repeating recurring transaction"
                                data-testid={`mm-tx-recurring-badge-${tx.id}`}
                              >
                                <Repeat size={10} />
                                <span>
                                  {matchedRule ? `Recurring · ${matchedRule.frequency}` : 'Recurring'}
                                </span>
                              </span>
                            )}
                            {tx.isAnomaly && (
                              <span
                                className="mm-tx-anomaly-flag"
                                title="Unbudgeted spike / anomaly flagged"
                              >
                                <AlertTriangle size={12} />
                                <span>Spike</span>
                              </span>
                            )}
                          </div>

                          <p className="mm-tx-note">
                            {tx.note
                              ? highlightMatch(tx.note, searchQuery)
                              : 'No memo attached'}
                          </p>

                          <div className="mm-tx-submeta">
                            {tx.type === 'Transfer' ? (
                              <span className="mm-tx-account-route">
                                <strong>{sourceAccount}</strong>
                                <ArrowRight size={12} />
                                <strong>{targetAccount}</strong>
                              </span>
                            ) : (
                              <span className="mm-tx-account-name">{sourceAccount}</span>
                            )}
                            {timePart && (
                              <>
                                <span>·</span>
                                <span>{timePart}</span>
                              </>
                            )}
                            {hasReceipts && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenReceiptLightbox(
                                    tx.receiptImages,
                                    `${tx.category} (${formatINR(tx.amount)}) — ${group.dateKey}`
                                  )
                                }
                                className="mm-receipt-trigger-btn"
                                title="View attached receipt photo(s)"
                                data-testid={`mm-receipt-btn-${tx.id}`}
                              >
                                <ImageIcon size={13} />
                                <span>
                                  {tx.receiptImages.length}{' '}
                                  {tx.receiptImages.length === 1 ? 'Receipt' : 'Receipts'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount + Row Actions */}
                      <div className="mm-tx-right">
                        <strong
                          className={`mm-tx-amount ${
                            tx.type === 'Income'
                              ? 'mm-text-income'
                              : tx.type === 'Expense'
                              ? 'mm-text-expense'
                              : 'mm-text-transfer'
                          }`}
                        >
                          {tx.type === 'Income'
                            ? `+${formatINR(tx.amount)}`
                            : tx.type === 'Expense'
                            ? `-${formatINR(tx.amount)}`
                            : formatINR(tx.amount)}
                        </strong>

                        <div className="mm-tx-actions">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="mm-icon-action-btn"
                            title="Edit transaction"
                            aria-label={`Edit ${tx.category} transaction`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="mm-icon-action-btn is-danger"
                            title="Delete transaction"
                            aria-label={`Delete ${tx.category} transaction`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CSV Bank Statement Importer Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        selectedMonth={selectedMonth}
        accounts={accounts}
        categories={categories}
        transactions={localTransactions}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={async (importedRecords) => {
          setLocalTransactions((prev) => [...importedRecords, ...prev]);
          if (onBulkImportComplete) {
            await onBulkImportComplete(importedRecords);
          }
        }}
      />
    </section>
  );
};

export default DailyView;

