import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  ArrowLeftRight,
  Repeat,
} from 'lucide-react';
import {
  computeNextRecurringDate,
  type AccountSummary,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
  type RecurringFrequency,
  type RecurringRule,
  type TransactionType,
} from '../../db/db';

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
  editingTransaction?: MoneyTransaction | null;
  defaultDate?: string; // YYYY-MM-DD
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
  editingTransaction,
  defaultDate,
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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredCategories = useMemo(() => {
    if (txType === 'Transfer') return [];
    return categories.filter((c) => c.type === txType);
  }, [categories, txType]);

  const availableSubCategories = useMemo(() => {
    if (txType === 'Transfer') return TRANSFER_SUBCATEGORIES;
    const found = filteredCategories.find((c) => c.name === category);
    return found?.subCategories || [];
  }, [txType, filteredCategories, category]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setRecurringInterval('None');

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
    }
  }, [isOpen, editingTransaction, defaultDate, accounts, categories]);

  const handleSwitchType = (nextType: TransactionType) => {
    setTxType(nextType);
    setErrorMessage('');
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
                <option value="Monthly">Repeat Monthly (Auto-generate every month)</option>
              </select>
            </div>
          )}

          {/* Note Input */}
          <div className="mm-field">
            <label htmlFor="mm-tx-note">Memo / Note</label>
            <input
              id="mm-tx-note"
              type="text"
              placeholder="Describe the transaction, bill # or counterparty..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mm-input"
              data-testid="mm-tx-note-input"
            />
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
                  <div key={idx} className="mm-receipt-thumb-item">
                    <img
                      src={src}
                      alt={`Receipt preview ${idx + 1}`}
                      className="mm-receipt-thumb-img"
                    />
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
