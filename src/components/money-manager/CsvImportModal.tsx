import React, { useState, useMemo } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Building2,
  Tag,
  RefreshCw,
} from 'lucide-react';
import {
  type AccountSummary,
  type MoneyCategory,
  type MoneyTransaction,
  type TransactionType,
  bulkImportTransactions,
  formatINR,
} from '../../db/db';
import {
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  SAMPLE_BANK_STATEMENT_CSV,
  type CsvColumnMapping,
} from './csvImporter';

export interface CsvImportModalProps {
  isOpen: boolean;
  selectedMonth: string;
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  onClose: () => void;
  onImportComplete: (imported: MoneyTransaction[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  selectedMonth,
  accounts,
  categories,
  transactions,
  onClose,
  onImportComplete,
}) => {
  const [csvRawContent, setCsvRawContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [defaultAccountId, setDefaultAccountId] = useState<string>(accounts[0]?.id || 'acc-icici');
  const [defaultToAccountId, setDefaultToAccountId] = useState<string>(
    accounts[1]?.id || 'acc-sbi'
  );
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Parse raw CSV text into headers and key-value row objects
  const parsedCsv = useMemo(() => {
    if (!csvRawContent.trim()) {
      return { headers: [], rows: [] };
    }
    return parseCsvText(csvRawContent);
  }, [csvRawContent]);

  // Column Mapping state
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    dateColumn: '',
    amountColumn: '',
    debitColumn: '',
    creditColumn: '',
    typeColumn: '',
    categoryColumn: '',
    subCategoryColumn: '',
    noteColumn: '',
    accountColumn: '',
    toAccountColumn: '',
  });

  // Overridden row categories / accounts map for preview tweaking
  const [rowCategoryOverrides, setRowCategoryOverrides] = useState<Record<number, string>>({});
  const [rowAccountOverrides, setRowAccountOverrides] = useState<Record<number, string>>({});

  // Reset mapping when new CSV content is loaded
  const handleLoadCsvContent = (content: string, name: string) => {
    setCsvRawContent(content);
    setFileName(name);
    setImportNotice(null);
    setRowCategoryOverrides({});
    setRowAccountOverrides({});

    const parsed = parseCsvText(content);
    if (parsed.headers.length > 0) {
      const autoMap = autoDetectCsvMapping(parsed.headers);
      setColumnMapping(autoMap);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = typeof evt.target?.result === 'string' ? evt.target.result : '';
      handleLoadCsvContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    handleLoadCsvContent(SAMPLE_BANK_STATEMENT_CSV, 'sample_bank_statement.csv');
  };

  // Generate mapped transactions preview with automatic category & account matching
  const mappedTransactions = useMemo(() => {
    if (!parsedCsv.rows || parsedCsv.rows.length === 0) return [];

    const baseMapped = mapCsvRowsToTransactions(parsedCsv.rows, columnMapping, {
      defaultAccountId,
      defaultToAccountId,
      defaultMonth: selectedMonth || '2026-11',
      accounts,
      categories,
      historicalTransactions: transactions,
    });

    // Apply manual user row overrides from preview table
    return baseMapped.map((tx, idx) => {
      const customCat = rowCategoryOverrides[idx];
      const customAcc = rowAccountOverrides[idx];

      return {
        ...tx,
        category: customCat ? customCat : tx.category,
        accountId: customAcc ? customAcc : tx.accountId,
      };
    });
  }, [
    parsedCsv.rows,
    columnMapping,
    defaultAccountId,
    defaultToAccountId,
    selectedMonth,
    accounts,
    categories,
    transactions,
    rowCategoryOverrides,
    rowAccountOverrides,
  ]);

  // Preview summary totals
  const previewSummary = useMemo(() => {
    let incomeCount = 0;
    let incomeTotal = 0;
    let expenseCount = 0;
    let expenseTotal = 0;
    let transferCount = 0;
    let transferTotal = 0;

    for (const tx of mappedTransactions) {
      if (tx.type === 'Income') {
        incomeCount += 1;
        incomeTotal += tx.amount;
      } else if (tx.type === 'Expense') {
        expenseCount += 1;
        expenseTotal += tx.amount;
      } else if (tx.type === 'Transfer') {
        transferCount += 1;
        transferTotal += tx.amount;
      }
    }

    return {
      totalCount: mappedTransactions.length,
      incomeCount,
      incomeTotal,
      expenseCount,
      expenseTotal,
      transferCount,
      transferTotal,
    };
  }, [mappedTransactions]);

  const handleExecuteImport = async () => {
    if (mappedTransactions.length === 0) return;

    try {
      setIsImporting(true);
      const inserted = await bulkImportTransactions(mappedTransactions);
      setImportNotice(
        `Successfully imported ${inserted.length} bank transactions into browser IndexedDB!`
      );
      onImportComplete(inserted);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to import CSV transactions:', err);
      setImportNotice('Error inserting records into IndexedDB database.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="mm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-csv-modal-title"
      data-testid="mm-csv-import-modal"
    >
      <div className="mm-modal-content mm-modal-lg" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div className="mm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 id="mm-csv-modal-title" className="mm-modal-title" style={{ margin: 0 }}>
                Import Bank Statement CSV
              </h2>
              <p className="mm-section-desc" style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>
                Onboard bank statements effortlessly with automatic category matching &amp; account routing.{' '}
                <a
                  href="/guides/money-manager-csv-import-formatting-guide"
                  style={{ color: '#10b981', fontWeight: 600, textDecoration: 'underline' }}
                  data-testid="mm-csv-guide-link"
                >
                  Read CSV Formatting &amp; Mapping Guide →
                </a>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mm-modal-close-btn"
            aria-label="Close CSV Import Modal"
            data-testid="mm-csv-modal-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mm-modal-body" style={{ display: 'grid', gap: 16 }}>
          {/* Top CSV File Selector / Drop Zone */}
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              background: 'var(--bg-card-subtle, rgba(255,255,255,0.02))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            data-testid="mm-csv-upload-zone"
          >
            <Upload size={32} style={{ color: 'var(--accent)' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                {fileName ? `File Selected: ${fileName}` : 'Select a Bank Statement CSV file'}
              </strong>
              <span className="mm-section-desc" style={{ fontSize: '0.8rem' }}>
                Supports ICICI, SBI, HDFC, UBI, Axis Bank &amp; custom CSV statements
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <label
                htmlFor="mm-csv-file-picker"
                className="mm-btn mm-btn-primary mm-btn-sm"
                style={{ cursor: 'pointer' }}
                data-testid="mm-csv-choose-file-btn"
              >
                <Upload size={14} />
                <span>Choose CSV File</span>
                <input
                  id="mm-csv-file-picker"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="mm-sr-only"
                  data-testid="mm-csv-file-input"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="mm-btn mm-btn-secondary mm-btn-sm"
                data-testid="mm-csv-load-sample-btn"
              >
                <Sparkles size={14} />
                <span>Load Sample Statement</span>
              </button>
            </div>
          </div>

          {/* Import Status Alert Notice */}
          {importNotice && (
            <div
              role="status"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              data-testid="mm-csv-import-notice"
            >
              <CheckCircle2 size={16} />
              <span>{importNotice}</span>
            </div>
          )}

          {/* Column Mapping & Default Settings Options */}
          {parsedCsv.headers.length > 0 && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.05)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                display: 'grid',
                gap: 12,
              }}
              data-testid="mm-csv-settings-box"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  <Sparkles size={15} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: 6 }} />
                  Auto-Detected Column Mapping &amp; Account Settings
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const auto = autoDetectCsvMapping(parsedCsv.headers);
                    setColumnMapping(auto);
                  }}
                  className="mm-btn mm-btn-ghost mm-btn-sm"
                  title="Re-run auto detection"
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                >
                  <RefreshCw size={12} />
                  <span>Re-detect</span>
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 10,
                }}
              >
                <div className="mm-field">
                  <label htmlFor="mm-csv-col-date">Date Column</label>
                  <select
                    id="mm-csv-col-date"
                    value={columnMapping.dateColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, dateColumn: e.target.value })}
                    className="mm-select"
                    data-testid="mm-csv-col-date-select"
                  >
                    <option value="">-- None / Default --</option>
                    {parsedCsv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label htmlFor="mm-csv-col-debit">Withdrawal / Debit</label>
                  <select
                    id="mm-csv-col-debit"
                    value={columnMapping.debitColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, debitColumn: e.target.value })}
                    className="mm-select"
                    data-testid="mm-csv-col-debit-select"
                  >
                    <option value="">-- None --</option>
                    {parsedCsv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label htmlFor="mm-csv-col-credit">Deposit / Credit</label>
                  <select
                    id="mm-csv-col-credit"
                    value={columnMapping.creditColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, creditColumn: e.target.value })}
                    className="mm-select"
                    data-testid="mm-csv-col-credit-select"
                  >
                    <option value="">-- None --</option>
                    {parsedCsv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label htmlFor="mm-csv-col-note">Narration / Note</label>
                  <select
                    id="mm-csv-col-note"
                    value={columnMapping.noteColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, noteColumn: e.target.value })}
                    className="mm-select"
                    data-testid="mm-csv-col-note-select"
                  >
                    <option value="">-- None --</option>
                    {parsedCsv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label htmlFor="mm-csv-default-acc">Default Source Bank</label>
                  <select
                    id="mm-csv-default-acc"
                    value={defaultAccountId}
                    onChange={(e) => setDefaultAccountId(e.target.value)}
                    className="mm-select"
                    data-testid="mm-csv-default-acc-select"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mm-field">
                  <label htmlFor="mm-csv-default-to-acc">Default Target Bank (Transfers)</label>
                  <select
                    id="mm-csv-default-to-acc"
                    value={defaultToAccountId}
                    onChange={(e) => setDefaultToAccountId(e.target.value)}
                    className="mm-select"
                    data-testid="mm-csv-default-to-acc-select"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mapped Transactions Live Preview Table */}
          {mappedTransactions.length > 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              {/* Summary Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  fontSize: '0.82rem',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                }}
                data-testid="mm-csv-preview-summary"
              >
                <span>
                  <strong>{previewSummary.totalCount}</strong> ready to import:
                </span>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span className="mm-text-income">
                    +{formatINR(previewSummary.incomeTotal)} ({previewSummary.incomeCount} Inflows)
                  </span>
                  <span className="mm-text-expense">
                    -{formatINR(previewSummary.expenseTotal)} ({previewSummary.expenseCount} Outflows)
                  </span>
                  {previewSummary.transferCount > 0 && (
                    <span className="mm-text-transfer">
                      ⇄ {formatINR(previewSummary.transferTotal)} ({previewSummary.transferCount} Transfers)
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                data-testid="mm-csv-preview-table-wrap"
              >
                <table className="mm-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Type</th>
                      <th style={{ padding: '8px 10px' }}>Narration</th>
                      <th style={{ padding: '8px 10px' }}>Amount</th>
                      <th style={{ padding: '8px 10px' }}>Auto-Matched Category</th>
                      <th style={{ padding: '8px 10px' }}>Bank Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedTransactions.map((tx, idx) => {
                      const accountObj = accounts.find((a) => a.id === tx.accountId);
                      return (
                        <tr key={tx.id || `row-${idx}`} data-testid={`mm-csv-row-${idx}`}>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            {tx.date.slice(0, 10)}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <span
                              className={`mm-badge is-${tx.type.toLowerCase()}`}
                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={tx.note}
                          >
                            {tx.note}
                          </td>
                          <td
                            style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontWeight: 600 }}
                            className={
                              tx.type === 'Income'
                                ? 'mm-text-income'
                                : tx.type === 'Expense'
                                ? 'mm-text-expense'
                                : 'mm-text-transfer'
                            }
                          >
                            {tx.type === 'Income'
                              ? `+${formatINR(tx.amount)}`
                              : tx.type === 'Expense'
                              ? `-${formatINR(tx.amount)}`
                              : formatINR(tx.amount)}
                          </td>

                          {/* Auto-Matched Category Selector per row */}
                          <td style={{ padding: '6px 10px' }}>
                            {tx.type === 'Transfer' ? (
                              <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                                Self Transfer
                              </span>
                            ) : (
                              <select
                                value={tx.category}
                                onChange={(e) =>
                                  setRowCategoryOverrides({
                                    ...rowCategoryOverrides,
                                    [idx]: e.target.value,
                                  })
                                }
                                className="mm-select"
                                style={{ padding: '2px 6px', fontSize: '0.76rem' }}
                                data-testid={`mm-csv-row-category-select-${idx}`}
                              >
                                {categories
                                  .filter((c) => c.type === tx.type)
                                  .map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                      {cat.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </td>

                          {/* Auto-Matched Account Selector per row */}
                          <td style={{ padding: '6px 10px' }}>
                            <select
                              value={tx.accountId}
                              onChange={(e) =>
                                setRowAccountOverrides({
                                  ...rowAccountOverrides,
                                  [idx]: e.target.value,
                                })
                              }
                              className="mm-select"
                              style={{ padding: '2px 6px', fontSize: '0.76rem' }}
                              data-testid={`mm-csv-row-account-select-${idx}`}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="mm-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="mm-btn mm-btn-secondary"
            data-testid="mm-csv-modal-cancel-btn"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isImporting || mappedTransactions.length === 0}
            className="mm-btn mm-btn-primary"
            data-testid="mm-csv-modal-submit-btn"
          >
            <CheckCircle2 size={15} />
            <span>
              {isImporting
                ? 'Importing...'
                : `Import ${mappedTransactions.length} Transactions into Ledger`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
