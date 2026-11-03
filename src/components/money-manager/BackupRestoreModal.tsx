import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  type AccountSummary,
  type MoneyCategory,
  type MoneyTransaction,
  type SinkingFund,
  type MoneyManagerBackupPayload,
  exportDatabaseBackup,
  restoreDatabaseBackup,
  resetDatabaseToDefaults,
  bulkImportTransactions,
  getAllTransactions,
  getAllAccounts,
  formatINR,
} from '../../db/db';
import {
  downloadMoneyManagerExcel,
  downloadMoneyManagerCsv,
  formatTransactionsToCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  type BulkCsvExportOptions,
  type BulkCsvExportSummary,
} from './excelExporter';
import {
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  SAMPLE_BANK_STATEMENT_CSV,
  type CsvColumnMapping,
} from './csvImporter';

export {
  formatTransactionsToCsv,
  downloadMoneyManagerCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  type BulkCsvExportOptions,
  type BulkCsvExportSummary,
};

export interface BackupRestoreModalProps {
  isOpen: boolean;
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  sinkingFunds: SinkingFund[];
  selectedMonth: string;
  onClose: () => void;
  onDataRestored: () => Promise<void>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  accounts,
  categories,
  transactions,
  sinkingFunds,
  selectedMonth,
  onClose,
  onDataRestored,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Bulk CSV Export Configuration State
  const [bulkExportScope, setBulkExportScope] = useState<'full-history' | 'selected-month'>(
    'full-history'
  );
  const [bulkExportAccountId, setBulkExportAccountId] = useState<string>('ALL');
  const [bulkExportSortOrder, setBulkExportSortOrder] = useState<'asc' | 'desc'>('asc');

  // CSV Import & Column Mapper State
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvMapping, setCsvMapping] = useState<CsvColumnMapping>({
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
  const [csvDefaultAccountId, setCsvDefaultAccountId] = useState<string>(
    accounts[0]?.id || 'acc-icici'
  );

  const mappedCsvPreview = useMemo(() => {
    if (csvRows.length === 0) return [];
    return mapCsvRowsToTransactions(csvRows, csvMapping, {
      defaultAccountId: csvDefaultAccountId || accounts[0]?.id || 'acc-icici',
      defaultMonth: selectedMonth,
      accounts,
      categories,
    });
  }, [csvRows, csvMapping, csvDefaultAccountId, selectedMonth, accounts, categories]);

  const bulkExportSummary = useMemo(
    () =>
      generateBulkLedgerCsvExport(transactions, accounts, {
        scope: bulkExportScope,
        selectedMonth,
        accountId: bulkExportAccountId,
        sortOrder: bulkExportSortOrder,
      }),
    [transactions, accounts, bulkExportScope, selectedMonth, bulkExportAccountId, bulkExportSortOrder]
  );

  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) {
      map.set(acc.id, acc.name);
    }
    return map;
  }, [accounts]);

  if (!isOpen) return null;

  const loadCsvContentIntoMapper = (rawText: string, sourceName: string) => {
    const parsed = parseCsvText(rawText);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'The selected CSV file is empty or contains no valid data rows.',
      });
      return;
    }

    const detected = autoDetectCsvMapping(parsed.headers);
    setCsvFileName(sourceName);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setCsvMapping(detected);
    if (!csvDefaultAccountId && accounts[0]) {
      setCsvDefaultAccountId(accounts[0].id);
    }
    setStatusMessage({
      type: 'success',
      text: `Loaded ${parsed.rows.length} row(s) from "${sourceName}". Review column mapping below and click Import.`,
    });
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const text = await file.text();
      loadCsvContentIntoMapper(text, file.name);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to parse CSV file.',
      });
    } finally {
      setIsProcessing(false);
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  const handleLoadSampleCsv = () => {
    loadCsvContentIntoMapper(SAMPLE_BANK_STATEMENT_CSV, 'sample-bank-statement-nov-2026.csv');
  };

  const handleConfirmCsvImport = async () => {
    if (mappedCsvPreview.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'No valid transaction rows could be mapped. Check your Amount or Debit/Credit column selections.',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const inserted = await bulkImportTransactions(mappedCsvPreview);
      await onDataRestored();
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvFileName('');
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${inserted.length} bank statement transaction(s) directly into the 'transactions' IndexedDB store.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to import CSV transactions.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const backupPayload = await exportDatabaseBackup();
      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `jawed-money-manager-backup-${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: `Exported ${backupPayload.transactions.length} transactions & ${backupPayload.accounts.length} accounts to JSON.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export JSON backup.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<MoneyManagerBackupPayload>;

      const restoredState = await restoreDatabaseBackup(parsed, restoreMode);
      await onDataRestored();
      setStatusMessage({
        type: 'success',
        text: `Restored (${restoreMode.toUpperCase()}): ${restoredState.accounts.length} accounts, ${restoredState.transactions.length} transactions, ${restoredState.sinkingFunds.length} sinking funds.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to restore JSON backup.',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportExcel = () => {
    try {
      setStatusMessage(null);
      downloadMoneyManagerExcel({
        accounts,
        categories,
        transactions,
        sinkingFunds,
        selectedMonth,
      });
      setStatusMessage({
        type: 'success',
        text: 'Generated and downloaded multi-tab Excel (.xlsx) workbook with Transactions, Accounts, Monthly Summary & Sinking Funds.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export Excel spreadsheet.',
      });
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const [idbTransactions, idbAccounts] = await Promise.all([
        getAllTransactions(),
        getAllAccounts(),
      ]);
      const ledgerTransactions =
        idbTransactions.length > 0 ? idbTransactions : transactions;
      const ledgerAccounts = idbAccounts.length > 0 ? idbAccounts : accounts;

      downloadMoneyManagerCsv({
        transactions: ledgerTransactions,
        accounts: ledgerAccounts,
        selectedMonth,
      });
      setStatusMessage({
        type: 'success',
        text: `Formatted and downloaded ${ledgerTransactions.length} ledger transaction(s) from IndexedDB as a standard accounting CSV table.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to download CSV ledger.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkCsvExport = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const summary = await exportBulkLedgerHistoryCsvFromDb({
        scope: bulkExportScope,
        selectedMonth,
        accountId: bulkExportAccountId,
        sortOrder: bulkExportSortOrder,
        fallbackTransactions: transactions,
        fallbackAccounts: accounts,
      });
      setStatusMessage({
        type: 'success',
        text: `Bulk CSV Export complete: downloaded ${summary.transactionCount} ledger transaction(s) (${
          summary.earliestDate && summary.latestDate
            ? `${summary.earliestDate} to ${summary.latestDate}`
            : 'Full Ledger History'
        }) to "${summary.fileName}".`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to generate Bulk CSV Export.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      await resetDatabaseToDefaults();
      await onDataRestored();
      setConfirmReset(false);
      setStatusMessage({
        type: 'success',
        text: 'Database reset to default sample accounts, categories, and ledger entries.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset database.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="mm-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-backup-modal-title"
      onClick={onClose}
    >
      <div
        className="mm-modal-sheet mm-backup-sheet"
        onClick={(e) => e.stopPropagation()}
        data-testid="mm-backup-restore-modal"
      >
        <div className="mm-modal-header">
          <div className="mm-modal-title-group">
            <Database size={20} className="mm-text-blue" />
            <div>
              <h3 id="mm-backup-modal-title" className="mm-modal-title">
                Data Portability, CSV Import &amp; Excel Export
              </h3>
              <p className="mm-modal-subtitle">
                Manage your local IndexedDB (<code>JawedMoneyManagerDB</code>) ledger data
              </p>
            </div>
          </div>
          <button
            type="button"
            className="mm-icon-btn"
            onClick={onClose}
            aria-label="Close backup modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mm-backup-body">
          <div className="mm-privacy-callout">
            <ShieldCheck size={18} className="mm-privacy-callout-icon" />
            <div>
              <strong>100% Client-Side IndexedDB Persistence</strong>
              <p>
                Currently storing <strong>{accounts.length}</strong> accounts,{' '}
                <strong>{transactions.length}</strong> ledger entries, and{' '}
                <strong>{sinkingFunds.length}</strong> sinking funds directly inside your browser.
              </p>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`mm-status-banner ${
                statusMessage.type === 'success' ? 'mm-status-success' : 'mm-status-error'
              }`}
              role="status"
              data-testid="mm-backup-status-banner"
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* CSV Import & Bank Statement Column Mapper */}
          <div
            className="mm-backup-card mm-backup-card-wide"
            data-testid="mm-csv-import-section"
          >
            <div className="mm-backup-card-head">
              <span className="mm-backup-icon mm-backup-icon-blue">
                <FileText size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <h4>CSV Import (Bulk Bank Statement Mapper)</h4>
                <p>
                  Upload a bank statement <code>.csv</code> file (ICICI, SBI, UBI, HDFC, or custom CSV) and map columns directly into the <code>transactions</code> store.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 8,
              }}
            >
              <div className="mm-field" style={{ flex: '1 1 200px' }}>
                <label htmlFor="mm-csv-default-account">
                  Default Target Account (if not in CSV)
                </label>
                <select
                  id="mm-csv-default-account"
                  value={csvDefaultAccountId}
                  onChange={(e) => setCsvDefaultAccountId(e.target.value)}
                  className="mm-select"
                  data-testid="mm-csv-default-account-select"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileUpload}
                className="mm-sr-only"
                id="mm-csv-file-input"
                data-testid="mm-csv-file-input"
              />

              <button
                type="button"
                className="mm-btn mm-btn-primary"
                onClick={() => csvFileInputRef.current?.click()}
                disabled={isProcessing}
                data-testid="mm-upload-csv-btn"
              >
                <Upload size={16} />
                <span>Upload Bank Statement (.CSV)</span>
              </button>

              <button
                type="button"
                className="mm-btn mm-btn-secondary"
                onClick={handleLoadSampleCsv}
                disabled={isProcessing}
                data-testid="mm-load-sample-csv-btn"
              >
                <Sparkles size={15} />
                <span>Load Sample Statement CSV</span>
              </button>
            </div>

            {/* Interactive Column Mapping Matrix & Preview when CSV is loaded */}
            {csvHeaders.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
                data-testid="mm-csv-mapper-panel"
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-heading)' }}>
                    Map CSV Columns ({csvFileName} · {csvRows.length} rows detected)
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    {mappedCsvPreview.length} valid transaction(s) ready for import
                  </span>
                </div>

                <div className="mm-form-grid-3">
                  <div className="mm-field">
                    <label htmlFor="mm-map-date">Date Column *</label>
                    <select
                      id="mm-map-date"
                      value={csvMapping.dateColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, dateColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-date"
                    >
                      <option value="">-- Use Default Month --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mm-field">
                    <label htmlFor="mm-map-note">Narration / Description Column</label>
                    <select
                      id="mm-map-note"
                      value={csvMapping.noteColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, noteColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-note"
                    >
                      <option value="">-- None --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mm-field">
                    <label htmlFor="mm-map-amount">Single Amount Column</label>
                    <select
                      id="mm-map-amount"
                      value={csvMapping.amountColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, amountColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-amount"
                    >
                      <option value="">-- Using Split Debit/Credit --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mm-field">
                    <label htmlFor="mm-map-debit">Withdrawal / Debit Column</label>
                    <select
                      id="mm-map-debit"
                      value={csvMapping.debitColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, debitColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-debit"
                    >
                      <option value="">-- None --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mm-field">
                    <label htmlFor="mm-map-credit">Deposit / Credit Column</label>
                    <select
                      id="mm-map-credit"
                      value={csvMapping.creditColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, creditColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-credit"
                    >
                      <option value="">-- None --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mm-field">
                    <label htmlFor="mm-map-category">Category Column (Optional)</label>
                    <select
                      id="mm-map-category"
                      value={csvMapping.categoryColumn}
                      onChange={(e) =>
                        setCsvMapping((prev) => ({ ...prev, categoryColumn: e.target.value }))
                      }
                      className="mm-select"
                      data-testid="mm-csv-map-category"
                    >
                      <option value="">-- Auto-Infer from Narration --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview Table of Mapped Transactions */}
                {mappedCsvPreview.length > 0 && (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      overflowX: 'auto',
                      background: 'var(--surface)',
                    }}
                    data-testid="mm-csv-preview-table"
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.78rem',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--muted)',
                          }}
                        >
                          <th style={{ padding: '8px 10px' }}>Date</th>
                          <th style={{ padding: '8px 10px' }}>Type</th>
                          <th style={{ padding: '8px 10px' }}>Account</th>
                          <th style={{ padding: '8px 10px' }}>Category</th>
                          <th style={{ padding: '8px 10px' }}>Narration / Note</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedCsvPreview.slice(0, 5).map((item, idx) => (
                          <tr
                            key={idx}
                            style={{ borderBottom: '1px solid var(--border)' }}
                          >
                            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                              {item.date.slice(0, 10)}
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 700 }}>
                              <span
                                className={
                                  item.type === 'Income'
                                    ? 'mm-text-income'
                                    : item.type === 'Expense'
                                    ? 'mm-text-expense'
                                    : 'mm-text-transfer'
                                }
                              >
                                {item.type}
                              </span>
                            </td>
                            <td style={{ padding: '7px 10px' }}>
                              {accountNameMap.get(item.accountId) || item.accountId}
                              {item.type === 'Transfer' && item.toAccountId ? (
                                <>
                                  {' '}
                                  <ArrowRight size={11} style={{ display: 'inline' }} />{' '}
                                  {accountNameMap.get(item.toAccountId) || item.toAccountId}
                                </>
                              ) : null}
                            </td>
                            <td style={{ padding: '7px 10px' }}>{item.category}</td>
                            <td
                              style={{
                                padding: '7px 10px',
                                maxWidth: 220,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.note}
                            </td>
                            <td
                              style={{
                                padding: '7px 10px',
                                textAlign: 'right',
                                fontWeight: 700,
                              }}
                            >
                              {formatINR(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="mm-btn mm-btn-secondary mm-btn-sm"
                    onClick={() => {
                      setCsvHeaders([]);
                      setCsvRows([]);
                      setCsvFileName('');
                    }}
                  >
                    Clear CSV
                  </button>
                  <button
                    type="button"
                    className="mm-btn mm-btn-emerald"
                    onClick={handleConfirmCsvImport}
                    disabled={isProcessing || mappedCsvPreview.length === 0}
                    data-testid="mm-confirm-csv-import-btn"
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      Import {mappedCsvPreview.length} Transaction(s) to Ledger
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk CSV Export (Full History of Ledger Transactions) */}
          <div
            className="mm-backup-card mm-backup-card-wide"
            data-testid="mm-bulk-csv-export-section"
          >
            <div className="mm-backup-card-head">
              <span className="mm-backup-icon mm-backup-icon-emerald">
                <FileText size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <h4>Bulk CSV Export (Full Ledger History for Accounting Software)</h4>
                <p>
                  Generate a downloadable RFC-4180 CSV file containing the complete history of ledger transactions with split Withdrawal/Deposit columns for Tally Prime, Zoho Books, QuickBooks, Xero, and Excel.
                </p>
              </div>
            </div>

            <div className="mm-form-grid-3" style={{ marginTop: 10 }}>
              <div className="mm-field">
                <label htmlFor="mm-bulk-csv-scope">History Scope</label>
                <select
                  id="mm-bulk-csv-scope"
                  value={bulkExportScope}
                  onChange={(e) =>
                    setBulkExportScope(e.target.value as 'full-history' | 'selected-month')
                  }
                  className="mm-select"
                  data-testid="mm-bulk-csv-scope-select"
                >
                  <option value="full-history">
                    Full History of Ledger Transactions (All Months)
                  </option>
                  <option value="selected-month">
                    Selected Month Only ({selectedMonth})
                  </option>
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-bulk-csv-account">Account / Bank Filter</label>
                <select
                  id="mm-bulk-csv-account"
                  value={bulkExportAccountId}
                  onChange={(e) => setBulkExportAccountId(e.target.value)}
                  className="mm-select"
                  data-testid="mm-bulk-csv-account-select"
                >
                  <option value="ALL">All Accounts (Consolidated Ledger)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-bulk-csv-sort">Chronological Sort Order</label>
                <select
                  id="mm-bulk-csv-sort"
                  value={bulkExportSortOrder}
                  onChange={(e) => setBulkExportSortOrder(e.target.value as 'asc' | 'desc')}
                  className="mm-select"
                  data-testid="mm-bulk-csv-sort-select"
                >
                  <option value="asc">Oldest to Newest (Accounting Journal Order)</option>
                  <option value="desc">Newest to Oldest (Recent First)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                }}
                data-testid="mm-bulk-csv-summary-meta"
              >
                <span>
                  <strong style={{ color: 'var(--text-heading)' }}>
                    {bulkExportSummary.transactionCount}
                  </strong>{' '}
                  ledger rows
                </span>
                {bulkExportSummary.earliestDate && bulkExportSummary.latestDate && (
                  <span>
                    Span: <strong>{bulkExportSummary.earliestDate}</strong> →{' '}
                    <strong>{bulkExportSummary.latestDate}</strong>
                  </span>
                )}
                <span className="mm-text-income">
                  Credits: <strong>{formatINR(bulkExportSummary.totalIncome)}</strong>
                </span>
                <span className="mm-text-expense">
                  Debits: <strong>{formatINR(bulkExportSummary.totalExpense)}</strong>
                </span>
              </div>

              <button
                type="button"
                className="mm-btn mm-btn-emerald"
                onClick={handleBulkCsvExport}
                disabled={isProcessing}
                data-testid="mm-bulk-csv-export-btn"
              >
                <Download size={16} />
                <span>
                  Bulk CSV Export ({bulkExportSummary.transactionCount} Transactions)
                </span>
              </button>
            </div>
          </div>

          {/* Action Cards */}
          <div className="mm-backup-grid">
            {/* 1. Download CSV (Accounting Software Compatible Table) */}
            <div className="mm-backup-card" data-testid="mm-download-csv-card">
              <div className="mm-backup-card-head">
                <span className="mm-backup-icon mm-backup-icon-emerald">
                  <FileText size={20} />
                </span>
                <div>
                  <h4>Download CSV (Accounting Table)</h4>
                  <p>
                    Formats all <strong>{transactions.length}</strong> ledger transactions into a standard table with Debit/Credit columns for Tally, Zoho Books, QuickBooks &amp; spreadsheets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mm-btn mm-btn-emerald mm-btn-full"
                onClick={handleDownloadCsv}
                disabled={isProcessing}
                data-testid="mm-download-csv-btn"
              >
                <Download size={16} />
                <span>Download CSV</span>
              </button>
            </div>

            {/* 2. Export JSON */}
            <div className="mm-backup-card">
              <div className="mm-backup-card-head">
                <span className="mm-backup-icon mm-backup-icon-blue">
                  <Download size={20} />
                </span>
                <div>
                  <h4>Export Backup (JSON)</h4>
                  <p>
                    Downloads the complete <code>JawedMoneyManagerDB</code> snapshot including Base64 receipt photos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mm-btn mm-btn-primary mm-btn-full"
                onClick={handleExportJson}
                disabled={isProcessing}
                data-testid="mm-export-json-btn"
              >
                <Download size={16} />
                <span>Export Backup (JSON)</span>
              </button>
            </div>

            {/* 3. Export Excel XLSX */}
            <div className="mm-backup-card">
              <div className="mm-backup-card-head">
                <span className="mm-backup-icon mm-backup-icon-emerald">
                  <FileSpreadsheet size={20} />
                </span>
                <div>
                  <h4>Export to Excel (XLSX)</h4>
                  <p>
                    Generates a 4-sheet workbook (Ledger, Account Balances, Monthly Summary &amp; Sinking Funds).
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mm-btn mm-btn-secondary mm-btn-full"
                onClick={handleExportExcel}
                disabled={isProcessing}
                data-testid="mm-export-excel-btn"
              >
                <FileSpreadsheet size={16} />
                <span>Export to Excel (XLSX)</span>
              </button>
            </div>
          </div>

          {/* 3. Restore Backup JSON */}
          <div className="mm-backup-card mm-backup-card-wide">
            <div className="mm-backup-card-head">
              <span className="mm-backup-icon mm-backup-icon-amber">
                <Upload size={20} />
              </span>
              <div>
                <h4>Restore Backup (JSON)</h4>
                <p>
                  Restore a previously exported JSON snapshot. Choose whether to merge records by ID or replace the entire database.
                </p>
              </div>
            </div>

            <div className="mm-restore-controls">
              <div className="mm-restore-mode-group" role="radiogroup" aria-label="Restore mode">
                <label className={`mm-restore-radio ${restoreMode === 'merge' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  <div>
                    <strong>Merge Records</strong>
                    <span>Keeps existing entries &amp; updates matching IDs</span>
                  </div>
                </label>
                <label className={`mm-restore-radio ${restoreMode === 'replace' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                  />
                  <div>
                    <strong>Replace Entire DB</strong>
                    <span>Clears current stores before importing JSON</span>
                  </div>
                </label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleRestoreJsonFile}
                className="mm-sr-only"
                id="mm-restore-json-input"
              />
              <button
                type="button"
                className="mm-btn mm-btn-secondary mm-btn-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload size={16} />
                <span>Select JSON Backup File to Restore</span>
              </button>
            </div>
          </div>

          {/* 4. Reset Demo Seed */}
          <div className="mm-backup-reset-bar">
            <div>
              <strong>Reset to Default Sample Seed</strong>
              <p>Restores initial ICICI, SBI, UBI, Cash accounts and sample Nov 2026 entries.</p>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                className="mm-btn mm-btn-ghost-danger mm-btn-sm"
                onClick={() => setConfirmReset(true)}
              >
                <RefreshCw size={14} />
                <span>Reset Seed Data</span>
              </button>
            ) : (
              <div className="mm-reset-confirm-group">
                <button
                  type="button"
                  className="mm-btn mm-btn-danger mm-btn-sm"
                  onClick={handleResetDemoData}
                  disabled={isProcessing}
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  className="mm-btn mm-btn-secondary mm-btn-sm"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreModal;
