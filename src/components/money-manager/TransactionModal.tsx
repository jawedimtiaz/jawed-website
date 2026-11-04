import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  ArrowLeftRight,
  Repeat,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  computeNextRecurringDate,
  SAMPLE_RECEIPT_DATA_URL,
  type AccountSummary,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
  type RecurringFrequency,
  type RecurringRule,
  type TransactionType,
} from '../../db/db';
import {
  predictTransactionCategory,
  saveCustomKeywordRule,
  tokenizeTransactionDescription,
  type CategoryPrediction,
} from './mlCategorizer';
import {
  scanReceiptImage,
  type ScannedReceiptResult,
} from './receiptScanner';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Omit<MoneyTransaction, 'id'> & { id?: string }) => Promise<void>;
  onSaveRecurringRule?: (
    ruleData: Omit<RecurringRule, 'id' | 'generatedCount'> & {
      id?: string;
      generatedCount?: number;
    }
  ) => Promise<void>;
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  transactions?: MoneyTransaction[];
  editingTransaction?: MoneyTransaction | null;
  defaultDate?: string; // YYYY-MM-DD
  initialReceiptImage?: string;
}

const TRANSFER_SUBCATEGORIES = [
  'ATM Withdrawal',
  'NEFT / IMPS Self Transfer',
  'Credit Card Bill Settlement',
  'Wallet Top-Up',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveRecurringRule,
  accounts,
  categories,
  transactions = [],
  editingTransaction,
  defaultDate,
  initialReceiptImage,
}) => {
  const [txType, setTxType] = useState<TransactionType>('Expense');
  const [dateTime, setDateTime] = useState<string>('2026-11-02T12:00');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [fixedOrVariable, setFixedOrVariable] = useState<FixedOrVariable>('Variable');
  const [note, setNote] = useState<string>('');
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [isAnomaly, setIsAnomaly] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<'None' | RecurringFrequency>('None');
  const [autoCategorizeEnabled, setAutoCategorizeEnabled] = useState<boolean>(true);
  const [manualCategoryLock, setManualCategoryLock] = useState<boolean>(false);
  const [ruleSavedNotice, setRuleSavedNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automated Receipt Scanning State
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);
  const [scannedReceiptResult, setScannedReceiptResult] = useState<ScannedReceiptResult | null>(null);
  const [receiptScanFeedback, setReceiptScanFeedback] = useState<string>('');

  const filteredCategories = useMemo(() => {
    if (txType === 'Transfer') return [];
    return categories.filter((c) => c.type === txType);
  }, [categories, txType]);

  const availableSubCategories = useMemo(() => {
    if (txType === 'Transfer') return TRANSFER_SUBCATEGORIES;
    const found = filteredCategories.find((c) => c.name === category);
    return found?.subCategories || [];
  }, [txType, filteredCategories, category]);

  const applyScannedReceipt = (result: ScannedReceiptResult, imageDataUrl?: string) => {
    if (result.amount > 0) {
      setAmount(String(result.amount));
    }
    if (result.date) {
      const normalized = result.date.includes('T') ? result.date.slice(0, 16) : `${result.date}T12:00`;
      setDateTime(normalized);
    }
    if (result.note || result.merchant) {
      setNote(result.note || result.merchant);
    }
    if (result.suggestedType) {
      setTxType(result.suggestedType);
    }
    if (result.suggestedCategory) {
      setCategory(result.suggestedCategory);
      setSubCategory(result.suggestedSubCategory || '');
      setFixedOrVariable(result.suggestedFixedOrVariable || 'Variable');
      setManualCategoryLock(true);
    }
    if (result.suggestedAccountId) {
      setAccountId(result.suggestedAccountId);
    }
    if (imageDataUrl) {
      setReceiptImages((prev) => (prev.includes(imageDataUrl) ? prev : [imageDataUrl, ...prev]));
    }
    setScannedReceiptResult(result);
    setReceiptScanFeedback(
      `Extracted ${result.merchant} · ${result.date} · ₹${result.amount}`
    );
  };

  const handleScanReceiptDataUrl = async (dataUrl: string) => {
    setIsScanningReceipt(true);
    setErrorMessage('');
    try {
      const result = await scanReceiptImage(dataUrl, {
        categories,
        accounts,
      });
      applyScannedReceipt(result, dataUrl);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to scan receipt image.'
      );
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleScanReceiptFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsScanningReceipt(true);
    setErrorMessage('');
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Failed to read receipt image file'));
        reader.readAsDataURL(file);
      });
      if (dataUrl) {
        await handleScanReceiptDataUrl(dataUrl);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not scan selected receipt.'
      );
      setIsScanningReceipt(false);
    } finally {
      event.target.value = '';
    }
  };

  const handleScanSampleReceipt = async () => {
    await handleScanReceiptDataUrl(SAMPLE_RECEIPT_DATA_URL);
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setRecurringInterval('None');
    setScannedReceiptResult(null);
    setReceiptScanFeedback('');

    if (editingTransaction) {
      setTxType(editingTransaction.type);
      setDateTime(editingTransaction.date.slice(0, 16));
      setAmount(String(editingTransaction.amount));
      setAccountId(editingTransaction.accountId);
      setToAccountId(
        editingTransaction.toAccountId ||
          accounts.find((a) => a.id !== editingTransaction.accountId)?.id ||
          ''
      );
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory);
      setFixedOrVariable(editingTransaction.fixedOrVariable);
      setNote(editingTransaction.note);
      setReceiptImages(editingTransaction.receiptImages || []);
      setIsAnomaly(Boolean(editingTransaction.isAnomaly));
      setAutoCategorizeEnabled(false);
      setManualCategoryLock(true);
      setRuleSavedNotice('');
    } else {
      const initialType: TransactionType = 'Expense';
      const defaultAcc = accounts[0]?.id || 'acc-icici';
      const secondAcc = accounts[1]?.id || 'acc-cash';
      const expenseCats = categories.filter((c) => c.type === initialType);
      const firstCat = expenseCats[0];

      const baseDate = defaultDate || '2026-11-02';
      setTxType(initialType);
      setDateTime(`${baseDate}T12:00`);
      setAmount('');
      setAccountId(defaultAcc);
      setToAccountId(secondAcc);
      setCategory(firstCat?.name || 'Food & Groceries');
      setSubCategory(firstCat?.subCategories?.[0] || '');
      setFixedOrVariable(firstCat?.defaultFixedOrVariable || 'Variable');
      setNote('');
      setReceiptImages([]);
      setIsAnomaly(false);
      setAutoCategorizeEnabled(true);
      setManualCategoryLock(false);
      setRuleSavedNotice('');

      if (initialReceiptImage) {
        handleScanReceiptDataUrl(initialReceiptImage);
      }
    }
  }, [isOpen, editingTransaction, defaultDate, accounts, categories, initialReceiptImage]);

  const mlPrediction = useMemo<CategoryPrediction | null>(() => {
    const cleanNote = note.trim();
    if (!cleanNote) return null;
    return predictTransactionCategory(cleanNote, {
      txType,
      allowTypeInference: false,
      historicalTransactions: transactions,
      categories,
    });
  }, [note, txType, transactions, categories]);

  const applyPredictionToFields = (prediction: CategoryPrediction) => {
    if (prediction.predictedType === 'Transfer') {
      setTxType('Transfer');
      setCategory('Transfer');
      setSubCategory(TRANSFER_SUBCATEGORIES[0]);
      setFixedOrVariable('Variable');
      return;
    }
    setCategory(prediction.category);
    setSubCategory(prediction.subCategory);
    setFixedOrVariable(prediction.fixedOrVariable);
  };

  const handleNoteChange = (nextNote: string) => {
    setNote(nextNote);
    setRuleSavedNotice('');
    if (!autoCategorizeEnabled || manualCategoryLock || txType === 'Transfer') {
      return;
    }
    const clean = nextNote.trim();
    if (!clean) return;
    const prediction = predictTransactionCategory(clean, {
      txType,
      allowTypeInference: false,
      historicalTransactions: transactions,
      categories,
    });
    if (prediction.source !== 'fallback' && prediction.confidence >= 55) {
      applyPredictionToFields(prediction);
    }
  };

  const handleTeachCustomRule = () => {
    const tokens = tokenizeTransactionDescription(note).filter((t) => !t.includes(' '));
    const keywords = tokens.length > 0 ? tokens.slice(0, 3) : [note.trim().toLowerCase()];
    if (keywords.length === 0 || !keywords[0]) return;
    saveCustomKeywordRule({
      type: txType,
      category: txType === 'Transfer' ? 'Transfer' : category,
      subCategory,
      fixedOrVariable,
      keywords,
    });
    setRuleSavedNotice(
      `Learned rule: [${keywords.join(', ')}] → ${category} (${subCategory})`
    );
  };

  const handleSwitchType = (nextType: TransactionType) => {
    setTxType(nextType);
    setErrorMessage('');
    setManualCategoryLock(false);
    if (nextType === 'Transfer') {
      setCategory('Transfer');
      setSubCategory(TRANSFER_SUBCATEGORIES[0]);
      setFixedOrVariable('Variable');
      setIsAnomaly(false);
      if (!toAccountId || toAccountId === accountId) {
        const alt = accounts.find((a) => a.id !== accountId);
        if (alt) setToAccountId(alt.id);
      }
    } else {
      const clean = note.trim();
      if (autoCategorizeEnabled && clean) {
        const prediction = predictTransactionCategory(clean, {
          txType: nextType,
          allowTypeInference: false,
          historicalTransactions: transactions,
          categories,
        });
        if (prediction.source !== 'fallback' && prediction.confidence >= 55) {
          setCategory(prediction.category);
          setSubCategory(prediction.subCategory);
          setFixedOrVariable(prediction.fixedOrVariable);
          return;
        }
      }
      const matching = categories.filter((c) => c.type === nextType);
      const first = matching[0];
      if (first) {
        setCategory(first.name);
        setSubCategory(first.subCategories?.[0] || '');
        setFixedOrVariable(first.defaultFixedOrVariable);
      }
    }
  };

  const handleCategoryChange = (nextCategoryName: string) => {
    setManualCategoryLock(true);
    setCategory(nextCategoryName);
    const matched = filteredCategories.find((c) => c.name === nextCategoryName);
    if (matched) {
      setSubCategory(matched.subCategories?.[0] || '');
      setFixedOrVariable(matched.defaultFixedOrVariable);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const readPromises = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(file);
        })
    );

    try {
      const base64List = await Promise.all(readPromises);
      setReceiptImages((prev) => [...prev, ...base64List.filter(Boolean)]);
    } catch {
      setErrorMessage('Could not read one or more selected receipt images.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveReceipt = (indexToRemove: number) => {
    setReceiptImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount in INR (₹).');
      return;
    }

    if (!accountId) {
      setErrorMessage('Please select a source account.');
      return;
    }

    if (txType === 'Transfer') {
      if (!toAccountId || toAccountId === accountId) {
        setErrorMessage('Source and Target accounts must be different for a Transfer.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const resolvedCategory = txType === 'Transfer' ? 'Transfer' : category;
      await onSave({
        id: editingTransaction?.id,
        date: dateTime,
        type: txType,
        accountId,
        toAccountId: txType === 'Transfer' ? toAccountId : undefined,
        amount: numericAmount,
        category: resolvedCategory,
        subCategory,
        fixedOrVariable,
        note: note.trim(),
        receiptImages,
        isAnomaly: txType === 'Expense' ? isAnomaly : false,
      });

      // If user selected a recurring interval on a new transaction, also persist the recurring rule to IndexedDB
      if (!editingTransaction && recurringInterval !== 'None' && onSaveRecurringRule) {
        const txDateStr = dateTime.slice(0, 10);
        const timePart = dateTime.slice(11, 16) || '09:30';
        const nextRunDate = computeNextRecurringDate(txDateStr, recurringInterval);
        const ruleTitle = note.trim() || `${resolvedCategory}${subCategory ? ` (${subCategory})` : ''}`;

        await onSaveRecurringRule({
          title: ruleTitle,
          frequency: recurringInterval,
          type: txType,
          accountId,
          toAccountId: txType === 'Transfer' ? toAccountId : undefined,
          amount: numericAmount,
          category: resolvedCategory,
          subCategory,
          fixedOrVariable,
          note: note.trim() || `Recurring ${recurringInterval} ${resolvedCategory}`,
          startDate: txDateStr,
          nextRunDate,
          timeOfDay: timePart,
          active: true,
          lastGeneratedDate: txDateStr,
          generatedCount: 1,
        });
      }

      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="mm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
      onClick={onClose}
    >
      <div
        className="mm-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        data-testid="mm-transaction-modal"
      >
        {/* Modal Header */}
        <div className="mm-modal-header">
          <h2 className="mm-modal-title">
            {editingTransaction ? 'Edit Ledger Entry' : 'Record New Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="mm-icon-action-btn"
            aria-label="Close transaction modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Fast Type Segmented Toggle: [Income] | [Expense] | [Transfer] */}
        <div className="mm-type-segmented" role="group" aria-label="Transaction Type">
          {(['Income', 'Expense', 'Transfer'] as TransactionType[]).map((t) => {
            const active = txType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleSwitchType(t)}
                className={`mm-type-seg-btn is-${t.toLowerCase()}${active ? ' is-active' : ''}`}
                data-testid={`mm-modal-type-${t.toLowerCase()}`}
              >
                {t === 'Transfer' && <ArrowLeftRight size={14} />}
                <span>{t}</span>
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <div className="mm-error-banner" role="alert">
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mm-modal-form">
          {/* Automated Receipt Scanner & Auto-Fill Section */}
          <div
            className="mm-receipt-scanner-card"
            data-testid="mm-receipt-scanner-section"
            style={{
              marginBottom: '1rem',
              padding: '12px 14px',
              borderRadius: 12,
              background:
                'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-heading)' }}>
                    Automated Receipt Scanner &amp; Auto-Fill
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--muted)' }}>
                    Upload any receipt (PNG, JPG, WebP, SVG) or test with sample receipt to auto-fill.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label
                  className={`mm-btn mm-btn-sm mm-btn-primary${isScanningReceipt ? ' is-loading' : ''}`}
                  style={{ cursor: isScanningReceipt ? 'not-allowed' : 'pointer' }}
                  data-testid="mm-scan-receipt-autofill-btn"
                  title="Select receipt image to scan and auto-fill transaction"
                >
                  <Upload size={13} />
                  <span>{isScanningReceipt ? 'Scanning...' : 'Scan Receipt & Auto-Fill'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isScanningReceipt}
                    onChange={handleScanReceiptFileInput}
                    style={{ display: 'none' }}
                    data-testid="mm-scan-receipt-file-input"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleScanSampleReceipt}
                  disabled={isScanningReceipt}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                  data-testid="mm-scan-sample-receipt-btn"
                  title="Scan standard test receipt (Metro Fresh Supermarket, ₹3,450)"
                >
                  <Sparkles size={13} />
                  <span>Scan Sample Receipt</span>
                </button>
              </div>
            </div>

            {/* Scanning In-Progress Feedback */}
            {isScanningReceipt && (
              <div
                className="mm-receipt-scanning-state"
                data-testid="mm-receipt-scanning-spinner"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid var(--accent)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Scanning receipt OCR &amp; extracting merchant, date, amount...</span>
              </div>
            )}

            {/* Scanned Result Banner */}
            {scannedReceiptResult && !isScanningReceipt && (
              <div
                className="mm-scanned-receipt-banner"
                data-testid="mm-scanned-receipt-banner"
                style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.09)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                      Receipt Extracted &amp; Auto-Filled:
                    </span>
                    <span
                      className="mm-budget-status-pill is-on-track"
                      style={{ fontSize: '0.7rem', padding: '1px 8px' }}
                      data-testid="mm-scanned-confidence-badge"
                    >
                      {scannedReceiptResult.confidence}% confidence · {scannedReceiptResult.source}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => applyScannedReceipt(scannedReceiptResult)}
                      className="mm-btn mm-btn-sm mm-btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      data-testid="mm-reapply-scanned-btn"
                      title="Re-populate form with extracted values"
                    >
                      Re-apply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedReceiptResult(null);
                        setReceiptScanFeedback('');
                      }}
                      className="mm-btn mm-btn-sm mm-btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      data-testid="mm-clear-scanned-btn"
                      title="Dismiss extracted receipt details"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Extracted Key Fields Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 8,
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem' }}>
                      Merchant
                    </span>
                    <strong data-testid="mm-scanned-merchant" style={{ color: 'var(--text-heading)' }}>
                      {scannedReceiptResult.merchant}
                    </strong>
                  </div>

                  <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem' }}>
                      Date
                    </span>
                    <strong data-testid="mm-scanned-date" style={{ color: 'var(--text-heading)' }}>
                      {scannedReceiptResult.date}
                    </strong>
                  </div>

                  <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem' }}>
                      Extracted Amount
                    </span>
                    <strong data-testid="mm-scanned-amount" style={{ color: '#10b981' }}>
                      ₹{scannedReceiptResult.amount.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem' }}>
                      Category
                    </span>
                    <strong data-testid="mm-scanned-category" style={{ color: 'var(--text-heading)' }}>
                      {scannedReceiptResult.suggestedCategory}
                      {scannedReceiptResult.suggestedSubCategory
                        ? ` · ${scannedReceiptResult.suggestedSubCategory}`
                        : ''}
                    </strong>
                  </div>
                </div>

                {/* Line items if any */}
                {scannedReceiptResult.items && scannedReceiptResult.items.length > 0 && (
                  <div
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                    data-testid="mm-scanned-line-items"
                  >
                    <span style={{ fontWeight: 600 }}>
                      Extracted Items ({scannedReceiptResult.items.length}):
                    </span>
                    {scannedReceiptResult.items.slice(0, 4).map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(148, 163, 184, 0.14)',
                          color: 'var(--text)',
                        }}
                      >
                        {item.name} {item.price ? `(₹${item.price})` : ''}
                      </span>
                    ))}
                    {scannedReceiptResult.items.length > 4 && (
                      <span>+{scannedReceiptResult.items.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mm-form-grid-2">
            <div className="mm-field">
              <label htmlFor="mm-tx-datetime">Date &amp; Time</label>
              <input
                id="mm-tx-datetime"
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="mm-input"
                data-testid="mm-tx-datetime-input"
              />
            </div>

            <div className="mm-field">
              <label htmlFor="mm-tx-amount">Amount (INR ₹)</label>
              <input
                id="mm-tx-amount"
                type="number"
                required
                min="1"
                step="any"
                placeholder="e.g. 3450"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mm-input"
                data-testid="mm-tx-amount-input"
              />
            </div>
          </div>

          {/* Account Selectors */}
          <div className={txType === 'Transfer' ? 'mm-form-grid-2' : 'mm-form-grid-1'}>
            <div className="mm-field">
              <label htmlFor="mm-tx-account">
                {txType === 'Transfer'
                  ? 'From Account (Source Debit)'
                  : txType === 'Income'
                  ? 'Deposit Into Account'
                  : 'Paid From Account'}
              </label>
              <select
                id="mm-tx-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mm-input"
                data-testid="mm-tx-account-select"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {txType === 'Transfer' && (
              <div className="mm-field">
                <label htmlFor="mm-tx-to-account">To Account (Target Credit)</label>
                <select
                  id="mm-tx-to-account"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="mm-input"
                  data-testid="mm-tx-to-account-select"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category & Sub-Category Pickers */}
          <div className="mm-form-grid-2">
            {txType !== 'Transfer' ? (
              <div className="mm-field">
                <label htmlFor="mm-tx-category">Category</label>
                <select
                  id="mm-tx-category"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="mm-input"
                  data-testid="mm-tx-category-select"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mm-field">
                <label>Category</label>
                <input
                  type="text"
                  value="Self Transfer (Excluded from Income/Expense)"
                  disabled
                  className="mm-input"
                />
              </div>
            )}

            <div className="mm-field">
              <label htmlFor="mm-tx-subcategory">Sub-Category</label>
              <select
                id="mm-tx-subcategory"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="mm-input"
                data-testid="mm-tx-subcategory-select"
              >
                {availableSubCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fixed vs Variable Toggle + Anomaly Spike Flag */}
          {txType !== 'Transfer' && (
            <div className="mm-form-grid-2" style={{ alignItems: 'end' }}>
              <div className="mm-field">
                <label>Expenditure Nature</label>
                <div className="mm-nature-toggle-group">
                  {(['Fixed', 'Variable'] as FixedOrVariable[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFixedOrVariable(item)}
                      className={`mm-nature-btn${fixedOrVariable === item ? ' is-active' : ''}`}
                      data-testid={`mm-tx-nature-${item.toLowerCase()}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {txType === 'Expense' && (
                <label className="mm-anomaly-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAnomaly}
                    onChange={(e) => setIsAnomaly(e.target.checked)}
                    data-testid="mm-tx-anomaly-checkbox"
                  />
                  <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
                  <span>Flag as unbudgeted spike / anomaly</span>
                </label>
              )}
            </div>
          )}

          {/* Optional Recurring Schedule Selector (when adding a new transaction) */}
          {!editingTransaction && (
            <div className="mm-field">
              <label htmlFor="mm-tx-recurring-interval">
                <Repeat size={13} style={{ display: 'inline', marginRight: 5 }} />
                Auto-Repeat / Recurring Schedule (IndexedDB <code>recurringRules</code>)
              </label>
              <select
                id="mm-tx-recurring-interval"
                value={recurringInterval}
                onChange={(e) =>
                  setRecurringInterval(e.target.value as 'None' | RecurringFrequency)
                }
                className="mm-input"
                data-testid="mm-tx-recurring-select"
              >
                <option value="None">One-Time Transaction (Do Not Repeat)</option>
                <option value="Daily">Repeat Daily (Auto-generate every day)</option>
                <option value="Weekly">Repeat Weekly (Auto-generate every 7 days)</option>
                <option value="Bi-Weekly">Repeat Bi-Weekly (Auto-generate every 14 days)</option>
                <option value="Monthly">Repeat Monthly (Auto-generate every month)</option>
                <option value="Quarterly">Repeat Quarterly (Auto-generate every 3 months)</option>
                <option value="Yearly">Repeat Yearly (Auto-generate every 12 months)</option>
              </select>
            </div>
          )}

          {/* Note Input + Real-Time ML Auto-Categorization Engine */}
          <div className="mm-field">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <label htmlFor="mm-tx-note">Memo / Description (ML Auto-Categorizer)</label>
              {txType !== 'Transfer' && (
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.76rem',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoCategorizeEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setAutoCategorizeEnabled(enabled);
                      if (enabled) {
                        setManualCategoryLock(false);
                        if (mlPrediction && mlPrediction.source !== 'fallback') {
                          applyPredictionToFields(mlPrediction);
                        }
                      }
                    }}
                    data-testid="mm-ml-auto-categorize-toggle"
                  />
                  <Sparkles size={13} />
                  <span>ML Auto-Categorize</span>
                </label>
              )}
            </div>
            <input
              id="mm-tx-note"
              type="text"
              placeholder="e.g., UPI Swiggy Instamart groceries, BESCOM electricity bill, Apollo pharmacy..."
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              className="mm-input"
              data-testid="mm-tx-note-input"
            />

            {/* ML Prediction & Keyword Rule Diagnostic Banner */}
            {txType !== 'Transfer' && mlPrediction && mlPrediction.source !== 'fallback' && (
              <div
                data-testid="mm-ml-prediction-banner"
                style={{
                  marginTop: 8,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(6, 182, 212, 0.38)',
                  background: 'rgba(6, 182, 212, 0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: '0.79rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span>
                      ML Categorized:{' '}
                      <strong data-testid="mm-ml-predicted-category">
                        {mlPrediction.category}
                      </strong>{' '}
                      → <span style={{ color: 'var(--muted)' }}>{mlPrediction.subCategory}</span> (
                      {mlPrediction.fixedOrVariable})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="mm-budget-status-pill is-on-track"
                      style={{ fontSize: '0.7rem', padding: '1px 7px' }}
                      data-testid="mm-ml-confidence-badge"
                    >
                      {mlPrediction.confidence}% {mlPrediction.confidenceLabel} (
                      {mlPrediction.source === 'custom-rule'
                        ? 'Custom Rule'
                        : mlPrediction.source === 'hybrid-ml-rule'
                        ? 'Hybrid ML + Rule'
                        : mlPrediction.source === 'ml-naive-bayes'
                        ? 'Naive Bayes ML'
                        : 'Keyword Rule'}
                      )
                    </span>

                    {category !== mlPrediction.category && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCategoryLock(false);
                          applyPredictionToFields(mlPrediction);
                        }}
                        className="mm-btn mm-btn-sm mm-btn-primary"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        data-testid="mm-ml-apply-suggestion-btn"
                      >
                        Apply
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTeachCustomRule}
                      className="mm-btn mm-btn-sm mm-btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      title="Save the current description keywords and selected category as a permanent custom rule"
                      data-testid="mm-ml-teach-rule-btn"
                    >
                      Save Rule
                    </button>
                  </div>
                </div>

                {mlPrediction.matchedKeywords.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexWrap: 'wrap',
                      fontSize: '0.73rem',
                      color: 'var(--muted)',
                    }}
                    data-testid="mm-ml-matched-keywords"
                  >
                    <span>Matched keywords:</span>
                    {mlPrediction.matchedKeywords.map((kw) => (
                      <code
                        key={kw}
                        style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(148, 163, 184, 0.16)',
                          color: 'var(--text)',
                        }}
                      >
                        {kw}
                      </code>
                    ))}
                  </div>
                )}

                {ruleSavedNotice && (
                  <div
                    style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}
                    data-testid="mm-ml-rule-saved-notice"
                  >
                    ✓ {ruleSavedNotice}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Photo Receipt Upload with Immediate Inline Thumbnail Previews */}
          <div className="mm-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="mm-tx-receipts">Attach Receipt Photos (Local IndexedDB)</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {receiptImages.length} attached
              </span>
            </div>

            <label htmlFor="mm-tx-receipts" className="mm-upload-dropzone">
              <Upload size={16} />
              <span>Select one or more receipt images (PNG, JPG, WebP, SVG)</span>
              <input
                id="mm-tx-receipts"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                data-testid="mm-tx-receipt-input"
              />
            </label>

            {receiptImages.length > 0 && (
              <div className="mm-receipt-thumbs-grid" data-testid="mm-receipt-thumbs-grid">
                {receiptImages.map((src, idx) => (
                  <div key={idx} className="mm-receipt-thumb-item" style={{ position: 'relative' }}>
                    <img
                      src={src}
                      alt={`Receipt preview ${idx + 1}`}
                      className="mm-receipt-thumb-img"
                    />
                    <button
                      type="button"
                      onClick={() => handleScanReceiptDataUrl(src)}
                      className="mm-receipt-thumb-scan"
                      title="Scan this receipt to auto-fill"
                      aria-label={`Scan receipt ${idx + 1} to auto-fill`}
                      data-testid={`mm-receipt-thumb-scan-btn-${idx}`}
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: 'var(--accent)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={11} />
                      <span>Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveReceipt(idx)}
                      className="mm-receipt-thumb-delete"
                      title="Remove receipt image"
                      aria-label={`Remove receipt image ${idx + 1}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="mm-modal-footer">
            <button type="button" onClick={onClose} className="mm-btn mm-btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mm-btn mm-btn-primary"
              data-testid="mm-tx-submit-btn"
            >
              <Check size={16} />
              <span>{editingTransaction ? 'Update Transaction' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
