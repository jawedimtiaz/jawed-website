import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Cloud,
  Lock,
  KeyRound,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
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
  formatLedgerTransactionsToParityCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  exportIndexedDbLedgerToCsv,
  downloadLedgerFromIndexedDbAsCsv,
  flattenTransactionsForCsvExport,
  exportIndexedDbTransactionsToCsv,
  type BulkCsvExportOptions,
  type BulkCsvExportSummary,
  type FlattenedCsvTransactionRow,
} from './excelExporter';
import {
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  validateCsvRows,
  SAMPLE_BANK_STATEMENT_CSV,
  SAMPLE_CSV_FILENAME,
  downloadSampleCsvTemplate,
  type CsvColumnMapping,
} from './csvImporter';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import {
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  getMoneyManagerAuth,
  setCachedGoogleAccessToken,
  initGoogleDriveAuth,
  googleDriveSignIn,
  googleDriveLogout,
  getGoogleDriveAccessToken,
  listDriveLedgerBackups,
  exportDatabaseToEncryptedDrive,
  importDatabaseFromEncryptedDrive,
  syncLedgerWithEncryptedDrive,
  deleteDriveLedgerBackup,
  encryptLedgerPayload,
  decryptLedgerPayload,
  type DriveBackupFileMetadata,
} from './googleDriveSync';

export {
  formatTransactionsToCsv,
  formatLedgerTransactionsToParityCsv,
  downloadMoneyManagerCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  exportIndexedDbLedgerToCsv,
  downloadLedgerFromIndexedDbAsCsv,
  flattenTransactionsForCsvExport,
  exportIndexedDbTransactionsToCsv,
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  encryptLedgerPayload,
  decryptLedgerPayload,
  exportDatabaseToEncryptedDrive,
  importDatabaseFromEncryptedDrive,
  syncLedgerWithEncryptedDrive,
  listDriveLedgerBackups,
  deleteDriveLedgerBackup,
  type BulkCsvExportOptions,
  type BulkCsvExportSummary,
  type FlattenedCsvTransactionRow,
  type DriveBackupFileMetadata,
};

export interface BackupRestoreModalProps {
  isOpen: boolean;
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  sinkingFunds: SinkingFund[];
  selectedMonth: string;
  currentUser?: User | null;
  syncError?: string | null;
  onClearSyncError?: () => void;
  onGoogleSignIn?: () => Promise<void>;
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
  currentUser: externalCurrentUser,
  syncError: externalSyncError,
  onClearSyncError,
  onGoogleSignIn,
  onClose,
  onDataRestored,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = csvInputRef;

  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Encrypted Google Drive Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(externalCurrentUser ?? null);
  const [syncError, setSyncError] = useState<string | null>(externalSyncError ?? null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState<boolean>(!externalCurrentUser);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [driveUserEmail, setDriveUserEmail] = useState<string>(
    externalCurrentUser?.email || externalCurrentUser?.displayName || ''
  );
  const [isDriveLoggingIn, setIsDriveLoggingIn] = useState<boolean>(false);
  const [drivePassphrase, setDrivePassphrase] = useState<string>('');
  const [showDrivePassphrase, setShowDrivePassphrase] = useState<boolean>(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFileMetadata[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState<boolean>(false);
  const [pendingDriveConfirmation, setPendingDriveConfirmation] = useState<{
    type: 'overwrite' | 'import' | 'delete' | 'smart-sync';
    file: DriveBackupFileMetadata;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (externalCurrentUser !== undefined) {
      setCurrentUser(externalCurrentUser);
      if (externalCurrentUser) {
        setDriveUserEmail(
          externalCurrentUser.email || externalCurrentUser.displayName || 'Connected Google Account'
        );
        setNeedsDriveAuth(false);
      }
    }
  }, [externalCurrentUser]);

  useEffect(() => {
    if (externalSyncError !== undefined) {
      setSyncError(externalSyncError);
      if (externalSyncError) {
        setStatusMessage({
          type: 'error',
          text: externalSyncError,
        });
      }
    }
  }, [externalSyncError]);

  useEffect(() => {
    const auth = getMoneyManagerAuth();
    const checkRedirect = async () => {
      if (!auth) return;
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // Successfully authenticated after redirect
          setCurrentUser(result.user);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setCachedGoogleAccessToken(credential.accessToken);
            setDriveAccessToken(credential.accessToken);
          }
          setDriveUserEmail(
            result.user.email || result.user.displayName || 'Connected Google Account'
          );
          setNeedsDriveAuth(false);
        }
      } catch (error: any) {
        console.error('Redirect auth error:', error);
        const errMsg = error.message || 'Failed to complete Google Sign-In redirect.';
        setSyncError(errMsg);
        setStatusMessage({ type: 'error', text: errMsg });
      }
    };
    checkRedirect();

    const unsubscribe = initGoogleDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) {
          setDriveAccessToken(token);
        }
        setDriveUserEmail(user.email || user.displayName || 'Connected Google Account');
        setNeedsDriveAuth(false);
      },
      (errMessage) => {
        if (errMessage) {
          setSyncError(errMessage);
          setStatusMessage({ type: 'error', text: errMessage });
        }
        setDriveAccessToken(null);
        setDriveUserEmail('');
        setNeedsDriveAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const refreshDriveBackupList = async (explicitToken?: string) => {
    const activeToken = explicitToken || driveAccessToken || (await getGoogleDriveAccessToken());
    if (!activeToken) {
      setNeedsDriveAuth(true);
      return;
    }
    try {
      setIsLoadingDriveFiles(true);
      const files = await listDriveLedgerBackups({ accessToken: activeToken });
      setDriveBackups(files);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to list Google Drive backups.',
      });
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSyncError(null);
    onClearSyncError?.();
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
    for (const scope of SCOPES) {
      provider.addScope(scope);
    }

    try {
      setIsDriveLoggingIn(true);
      setStatusMessage(null);
      if (onGoogleSignIn) {
        await onGoogleSignIn();
        return;
      }
      const auth = getMoneyManagerAuth();
      if (!auth) {
        await googleDriveSignIn();
        return;
      }
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      const errMsg = err?.message || 'Sign-in initialization failed.';
      setSyncError(errMsg);
      setStatusMessage({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setIsDriveLoggingIn(false);
    }
  };

  const handleGoogleDriveSignIn = handleGoogleSignIn;

  const handleGoogleDriveSignOut = async () => {
    await googleDriveLogout();
    setDriveAccessToken(null);
    setDriveUserEmail('');
    setDriveBackups([]);
    setNeedsDriveAuth(true);
    setPendingDriveConfirmation(null);
    setStatusMessage({
      type: 'success',
      text: 'Disconnected from Google Drive and cleared in-memory access token.',
    });
  };

  const handleExportNewEncryptedDriveBackup = async () => {
    if (drivePassphrase.trim().length < 4) {
      setStatusMessage({
        type: 'error',
        text: 'Enter an encryption passphrase (at least 4 characters) before exporting to Google Drive.',
      });
      return;
    }
    const token = driveAccessToken || (await getGoogleDriveAccessToken());
    if (!token) {
      setNeedsDriveAuth(true);
      return;
    }
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const result = await exportDatabaseToEncryptedDrive(drivePassphrase, {
        accessToken: token,
      });
      await refreshDriveBackupList(token);
      setStatusMessage({
        type: 'success',
        text: `Encrypted and uploaded ${result.transactionCount} transactions & ${result.accountCount} accounts to Google Drive ("${result.file.name}").`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to upload encrypted backup to Google Drive.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteConfirmedDriveAction = async () => {
    if (!pendingDriveConfirmation) return;
    const { type, file } = pendingDriveConfirmation;
    const token = driveAccessToken || (await getGoogleDriveAccessToken());
    if (!token) {
      setNeedsDriveAuth(true);
      setPendingDriveConfirmation(null);
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage(null);

      if (type === 'overwrite') {
        if (drivePassphrase.trim().length < 4) {
          throw new Error('Enter your encryption passphrase (at least 4 characters) to update the cloud backup.');
        }
        const result = await exportDatabaseToEncryptedDrive(drivePassphrase, {
          accessToken: token,
          existingFileId: file.id,
          customFileName: file.name,
        });
        await refreshDriveBackupList(token);
        setStatusMessage({
          type: 'success',
          text: `Updated encrypted Google Drive backup "${result.file.name}" (${result.transactionCount} transactions).`,
        });
      } else if (type === 'import') {
        if (drivePassphrase.trim().length < 4) {
          throw new Error('Enter the encryption passphrase used when creating this backup to decrypt it.');
        }
        const { restored } = await importDatabaseFromEncryptedDrive(
          file.id,
          drivePassphrase,
          restoreMode,
          { accessToken: token }
        );
        await onDataRestored();
        setStatusMessage({
          type: 'success',
          text: `Decrypted & restored "${file.name}" (${restoreMode.toUpperCase()}): ${restored.transactions.length} transactions and ${restored.accounts.length} accounts synced.`,
        });
      } else if (type === 'smart-sync') {
        if (drivePassphrase.trim().length < 4) {
          throw new Error('Enter your encryption passphrase (at least 4 characters) to sync with Google Drive.');
        }
        const syncResult = await syncLedgerWithEncryptedDrive(drivePassphrase, {
          accessToken: token,
          existingFileId: file.id,
          customFileName: file.name,
        });
        await onDataRestored();
        await refreshDriveBackupList(token);
        setStatusMessage({
          type: 'success',
          text: `Cross-device cloud sync complete ("${syncResult.file.name}"): merged and encrypted ${syncResult.transactionCount} transactions across ${syncResult.accountCount} accounts.`,
        });
      } else if (type === 'delete') {
        await deleteDriveLedgerBackup(file.id, { accessToken: token });
        await refreshDriveBackupList(token);
        setStatusMessage({
          type: 'success',
          text: `Deleted encrypted backup "${file.name}" from Google Drive.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Google Drive cloud sync operation failed.',
      });
    } finally {
      setIsProcessing(false);
      setPendingDriveConfirmation(null);
    }
  };

  // Bulk CSV Export Configuration State (Settings Panel)
  const [bulkExportScope, setBulkExportScope] = useState<'full-history' | 'selected-month'>(
    'full-history'
  );
  const [bulkExportAccountId, setBulkExportAccountId] = useState<string>('ALL');
  const [bulkExportTypeFilter, setBulkExportTypeFilter] = useState<
    'ALL' | 'Income' | 'Expense' | 'Transfer'
  >('ALL');
  const [bulkExportFormatMode, setBulkExportFormatMode] = useState<
    'split-debit-credit' | 'single-signed-amount'
  >('split-debit-credit');
  const [bulkExportSortOrder, setBulkExportSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCsvExportPreview, setShowCsvExportPreview] = useState<boolean>(true);

  // CSV Import & Column Mapper State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    const deduped = mapCsvRowsToTransactions(csvRows, csvMapping, {
      defaultAccountId: csvDefaultAccountId || accounts[0]?.id || 'acc-icici',
      defaultMonth: selectedMonth,
      accounts,
      categories,
      historicalTransactions: transactions,
      skipDuplicates: true,
    });
    if (deduped.length > 0) return deduped;
    return mapCsvRowsToTransactions(csvRows, csvMapping, {
      defaultAccountId: csvDefaultAccountId || accounts[0]?.id || 'acc-icici',
      defaultMonth: selectedMonth,
      accounts,
      categories,
      historicalTransactions: transactions,
      skipDuplicates: false,
    });
  }, [csvRows, csvMapping, csvDefaultAccountId, selectedMonth, accounts, categories, transactions]);

  const bulkExportSummary = useMemo(
    () =>
      generateBulkLedgerCsvExport(transactions, accounts, {
        scope: bulkExportScope,
        selectedMonth,
        accountId: bulkExportAccountId,
        typeFilter: bulkExportTypeFilter,
        formatMode: bulkExportFormatMode,
        sortOrder: bulkExportSortOrder,
      }),
    [
      transactions,
      accounts,
      bulkExportScope,
      selectedMonth,
      bulkExportAccountId,
      bulkExportTypeFilter,
      bulkExportFormatMode,
      bulkExportSortOrder,
    ]
  );

  const parsedCsvExportPreview = useMemo(
    () => parseCsvText(bulkExportSummary.csvContent),
    [bulkExportSummary.csvContent]
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
    const validation = validateCsvRows(parsed.rows, parsed.headers, detected);
    setCsvFileName(sourceName);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setCsvMapping(detected);
    if (!csvDefaultAccountId && accounts[0]) {
      setCsvDefaultAccountId(accounts[0].id);
    }

    if (!validation.hasMandatoryColumns) {
      setStatusMessage({
        type: 'error',
        text:
          validation.columnErrorMessage ||
          'Missing mandatory CSV column(s): Date, Amount, Description.',
      });
      return;
    }

    if (validation.malformedRows.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Loaded ${parsed.rows.length} row(s) from "${sourceName}". ${validation.summaryErrorMessage}`,
      });
      return;
    }

    setStatusMessage({
      type: 'success',
      text: `Loaded ${parsed.rows.length} row(s) from "${sourceName}". Review column mapping below and click Done / Import.`,
    });
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
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
    }
  };

  const handleCsvFileUpload = handleCsvFileChange;

  const handleLoadSampleCsv = () => {
    if (typeof File !== 'undefined') {
      try {
        setSelectedFile(
          new File([SAMPLE_BANK_STATEMENT_CSV], 'sample-bank-statement-nov-2026.csv', {
            type: 'text/csv',
          })
        );
      } catch {
        // Ignore File constructor errors
      }
    }
    loadCsvContentIntoMapper(SAMPLE_BANK_STATEMENT_CSV, 'sample-bank-statement-nov-2026.csv');
  };

  const handleDownloadSampleCsv = () => {
    const { fileName } = downloadSampleCsvTemplate();
    setStatusMessage({
      type: 'success',
      text: `Downloaded sample CSV template ("${fileName}"). Fill it out and click Import CSV to load your transactions.`,
    });
  };

  const processCsvContent = async (text: string) => {
    const parsed = parseCsvText(text);
    const activeHeaders = parsed.headers.length > 0 ? parsed.headers : csvHeaders;
    const activeRows = parsed.rows.length > 0 ? parsed.rows : csvRows;
    const activeMapping =
      csvMapping.dateColumn ||
      csvMapping.amountColumn ||
      csvMapping.debitColumn ||
      csvMapping.creditColumn
        ? csvMapping
        : autoDetectCsvMapping(activeHeaders);

    const validation = validateCsvRows(activeRows, activeHeaders, activeMapping);
    if (!validation.hasMandatoryColumns) {
      setStatusMessage({
        type: 'error',
        text:
          validation.columnErrorMessage ||
          'Missing mandatory CSV column(s): Date, Amount, Description.',
      });
      return;
    }

    if (validation.validRows.length === 0) {
      setStatusMessage({
        type: 'error',
        text:
          validation.summaryErrorMessage ||
          'No valid transaction rows could be mapped. Check your Date, Amount, and Description columns.',
      });
      return;
    }

    const deduped = mapCsvRowsToTransactions(validation.validRows, activeMapping, {
      defaultAccountId: csvDefaultAccountId || accounts[0]?.id || 'acc-icici',
      defaultMonth: selectedMonth,
      accounts,
      categories,
      historicalTransactions: transactions,
      skipDuplicates: true,
      strictValidation: true,
    });

    const mappedRows =
      deduped.length > 0
        ? deduped
        : mapCsvRowsToTransactions(validation.validRows, activeMapping, {
            defaultAccountId: csvDefaultAccountId || accounts[0]?.id || 'acc-icici',
            defaultMonth: selectedMonth,
            accounts,
            categories,
            historicalTransactions: transactions,
            skipDuplicates: false,
            strictValidation: true,
          });

    if (mappedRows.length === 0) {
      setStatusMessage({
        type: 'error',
        text:
          validation.summaryErrorMessage ||
          'No valid transaction rows could be mapped. Check your Date, Amount, and Description column selections.',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const recordsWithUuid = mappedRows.map((tx) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));
      const inserted = await bulkImportTransactions(recordsWithUuid, {
        skipDuplicates: deduped.length > 0,
      });
      await onDataRestored();
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvFileName('');
      setSelectedFile(null);
      const malformedSuffix =
        validation.malformedRows.length > 0
          ? ` (${validation.summaryErrorMessage})`
          : '';
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${(inserted.length > 0 ? inserted : recordsWithUuid).length} bank statement transaction(s) directly into the 'transactions' IndexedDB store.${malformedSuffix}`,
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

  const handleDoneImport = async () => {
    if (!selectedFile) {
      if (mappedCsvPreview.length > 0) {
        await handleConfirmCsvImport();
        return;
      }
      setStatusMessage({
        type: 'error',
        text: 'Please select a CSV file first.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      await processCsvContent(text);
    };
    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: 'Failed to read file.',
      });
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmCsvImport = async () => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        await processCsvContent(text);
      };
      reader.onerror = () => {
        setStatusMessage({
          type: 'error',
          text: 'Failed to read file.',
        });
      };
      reader.readAsText(selectedFile);
      return;
    }

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
      const recordsWithUuid = mappedCsvPreview.map((tx) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));
      const inserted = await bulkImportTransactions(recordsWithUuid, {
        skipDuplicates: true,
      });
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
      const summary = await exportIndexedDbLedgerToCsv({
        scope: bulkExportScope,
        selectedMonth,
        accountId: bulkExportAccountId,
        typeFilter: bulkExportTypeFilter,
        formatMode: bulkExportFormatMode,
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

  const handleDownloadLedger = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const summary = await downloadLedgerFromIndexedDbAsCsv({
        scope: 'full-history',
        sortOrder: bulkExportSortOrder,
        formatMode: bulkExportFormatMode,
        fallbackTransactions: transactions,
        fallbackAccounts: accounts,
      });
      setStatusMessage({
        type: 'success',
        text: `Downloaded all ${summary.transactionCount} local IndexedDB transaction(s) in CSV format ("${summary.fileName}").`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to download IndexedDB ledger CSV.',
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
        <div className="mm-modal-header" data-testid="mm-settings-panel-header">
          <div className="mm-modal-title-group">
            <Database size={20} className="mm-text-blue" />
            <div>
              <h3 id="mm-backup-modal-title" className="mm-modal-title">
                Settings, Data Portability, CSV Import &amp; Export
              </h3>
              <p className="mm-modal-subtitle">
                Manage, import, and export your local IndexedDB (<code>JawedMoneyManagerDB</code>) transaction ledger
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
          <div
            className="mm-privacy-callout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: '1 1 280px' }}>
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

            <button
              type="button"
              className="mm-btn mm-btn-emerald"
              onClick={handleDownloadLedger}
              disabled={isProcessing}
              data-testid="mm-download-ledger-btn"
              title="Convert all local IndexedDB transaction data into CSV format and trigger an automatic browser download"
            >
              <Download size={16} />
              <span>Download Ledger</span>
            </button>
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

          {/* Encrypted Google Drive Cloud Sync Section */}
          <div
            className="mm-backup-card mm-backup-card-wide"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              background:
                'linear-gradient(180deg, rgba(56, 189, 248, 0.06) 0%, rgba(15, 23, 42, 0.5) 100%)',
            }}
            data-testid="mm-google-drive-sync-section"
          >
            <div className="mm-backup-card-head">
              <span className="mm-backup-icon mm-backup-icon-blue">
                <Cloud size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <h4>Encrypted Google Drive Cloud Sync (Cross-Device Ledger Sync)</h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: '0.73rem',
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    <Lock size={12} />
                    <span>AES-256-GCM + PBKDF2 Encrypted</span>
                  </span>
                </div>
                <p>
                  Export and import your entire Money Manager ledger across devices via Google Drive. Your ledger is encrypted locally in your browser with your passphrase before upload.
                </p>
              </div>
            </div>

            {syncError && !statusMessage && (
              <div
                className="mm-status-banner mm-status-error"
                role="alert"
                data-testid="mm-drive-sync-error-banner"
                style={{ marginTop: 10 }}
              >
                <AlertTriangle size={16} />
                <span>{syncError}</span>
              </div>
            )}

            {needsDriveAuth || (!driveAccessToken && !currentUser) ? (
              <div
                style={{
                  marginTop: 12,
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
                data-testid="mm-drive-auth-prompt"
              >
                <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--text-heading)', display: 'block', marginBottom: 2 }}>
                    Connect Google Drive for Encrypted Cloud Sync
                  </strong>
                  Sign in with your Google account to create, list, or restore encrypted Money Manager backup files created by this app.
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isDriveLoggingIn}
                  className="gsi-material-button"
                  data-testid="mm-google-signin-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: '1px solid #747775',
                    background: '#ffffff',
                    color: '#1f1f1f',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: isDriveLoggingIn ? 'wait' : 'pointer',
                  }}
                >
                  <div className="gsi-material-button-state" />
                  <div
                    className="gsi-material-button-content-wrapper"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      className="gsi-material-button-icon"
                      style={{ width: 18, height: 18, display: 'inline-flex' }}
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block', width: 18, height: 18 }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isDriveLoggingIn ? 'Signing in…' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div
                style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}
                data-testid="mm-drive-connected-panel"
              >
                {/* Connected Account & Sign-Out Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                    <CheckCircle2 size={14} />
                    <span>
                      Connected to Google Drive: <strong>{driveUserEmail}</strong>
                    </span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => refreshDriveBackupList()}
                      disabled={isLoadingDriveFiles || isProcessing}
                      className="mm-btn mm-btn-sm mm-btn-secondary"
                      data-testid="mm-drive-refresh-btn"
                    >
                      <RefreshCw size={13} />
                      <span>{isLoadingDriveFiles ? 'Refreshing…' : 'Refresh Files'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleDriveSignOut}
                      disabled={isProcessing}
                      className="mm-btn mm-btn-sm mm-btn-ghost"
                      data-testid="mm-drive-signout-btn"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Encryption Passphrase + Export Action Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div className="mm-field" style={{ flex: '1 1 240px', position: 'relative' }}>
                    <label htmlFor="mm-drive-passphrase">
                      <KeyRound size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Zero-Knowledge Encryption Passphrase *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="mm-drive-passphrase"
                        type={showDrivePassphrase ? 'text' : 'password'}
                        value={drivePassphrase}
                        onChange={(e) => setDrivePassphrase(e.target.value)}
                        placeholder="Enter passphrase (min 4 chars) to encrypt or decrypt..."
                        className="mm-input"
                        style={{ paddingRight: 36 }}
                        data-testid="mm-drive-passphrase-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDrivePassphrase((prev) => !prev)}
                        aria-label={showDrivePassphrase ? 'Hide passphrase' : 'Show passphrase'}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        {showDrivePassphrase ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportNewEncryptedDriveBackup}
                    disabled={isProcessing || drivePassphrase.trim().length < 4}
                    className="mm-btn mm-btn-primary"
                    data-testid="mm-drive-export-btn"
                  >
                    <Cloud size={15} />
                    <span>Export &amp; Encrypt to Google Drive</span>
                  </button>

                  {driveBackups.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDriveConfirmation({
                            type: 'smart-sync',
                            file: driveBackups[0],
                            description: `Download, decrypt, and merge "${driveBackups[0].name}" with your local ledger, then re-encrypt and update the unified ledger on Google Drive?`,
                          })
                        }
                        disabled={isProcessing || drivePassphrase.trim().length < 4}
                        className="mm-btn mm-btn-emerald"
                        data-testid="mm-drive-smart-sync-btn"
                      >
                        <RefreshCw size={15} />
                        <span>Smart Merge Sync</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPendingDriveConfirmation({
                            type: 'overwrite',
                            file: driveBackups[0],
                            description: `Overwrite existing Google Drive backup "${driveBackups[0].name}" with your current ${transactions.length} ledger transactions and ${accounts.length} accounts?`,
                          })
                        }
                        disabled={isProcessing || drivePassphrase.trim().length < 4}
                        className="mm-btn mm-btn-secondary"
                        data-testid="mm-drive-overwrite-latest-btn"
                      >
                        <Upload size={15} />
                        <span>Update Latest Cloud File</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Mandatory Confirmation Dialog for Mutating / Destructive Operations */}
                {pendingDriveConfirmation && (
                  <div
                    role="alertdialog"
                    aria-labelledby="mm-drive-confirm-title"
                    data-testid="mm-drive-confirm-dialog"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <AlertTriangle size={17} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong
                          id="mm-drive-confirm-title"
                          style={{ color: 'var(--text-heading)', fontSize: '0.86rem', display: 'block' }}
                        >
                          Confirm Google Drive Cloud Sync Action
                        </strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--muted-light)' }}>
                          {pendingDriveConfirmation.description}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setPendingDriveConfirmation(null)}
                        disabled={isProcessing}
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        data-testid="mm-drive-confirm-cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteConfirmedDriveAction}
                        disabled={isProcessing}
                        className={`mm-btn mm-btn-sm ${
                          pendingDriveConfirmation.type === 'delete'
                            ? 'mm-btn-danger'
                            : 'mm-btn-emerald'
                        }`}
                        data-testid="mm-drive-confirm-proceed-btn"
                      >
                        {pendingDriveConfirmation.type === 'delete'
                          ? 'Confirm Delete from Drive'
                          : pendingDriveConfirmation.type === 'overwrite'
                          ? 'Confirm Overwrite on Drive'
                          : pendingDriveConfirmation.type === 'smart-sync'
                          ? 'Confirm Smart Merge Sync'
                          : `Confirm Import (${restoreMode.toUpperCase()})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved Encrypted Cloud Backups Table */}
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    overflow: 'hidden',
                  }}
                  data-testid="mm-drive-files-list"
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>Encrypted Ledger Backups in Google Drive ({driveBackups.length})</span>
                    <span>Restore Mode: {restoreMode.toUpperCase()}</span>
                  </div>

                  {driveBackups.length === 0 ? (
                    <div
                      style={{
                        padding: '14px 12px',
                        fontSize: '0.8rem',
                        color: 'var(--muted)',
                        textAlign: 'center',
                      }}
                    >
                      {isLoadingDriveFiles
                        ? 'Loading encrypted backups from Google Drive…'
                        : 'No encrypted Money Manager backups found in your Google Drive yet. Enter a passphrase above and click "Export & Encrypt to Google Drive".'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {driveBackups.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            fontSize: '0.8rem',
                          }}
                          data-testid={`mm-drive-file-row-${file.id}`}
                        >
                          <div>
                            <strong style={{ color: 'var(--text-heading)', display: 'block' }}>
                              {file.name}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                              Modified: {new Date(file.modifiedTime).toLocaleString()}
                              {file.appProperties?.transactionCount
                                ? ` · ${file.appProperties.transactionCount} transactions`
                                : ''}
                              {file.appProperties?.accountCount
                                ? ` · ${file.appProperties.accountCount} accounts`
                                : ''}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDriveConfirmation({
                                  type: 'import',
                                  file,
                                  description: `Download, decrypt, and ${
                                    restoreMode === 'replace'
                                      ? 'replace your entire local ledger with'
                                      : 'merge your local ledger with'
                                  } "${file.name}" from Google Drive?`,
                                })
                              }
                              disabled={isProcessing || drivePassphrase.trim().length < 4}
                              className="mm-btn mm-btn-sm mm-btn-emerald"
                              title={
                                drivePassphrase.trim().length < 4
                                  ? 'Enter your encryption passphrase above first'
                                  : 'Decrypt and import this cloud backup'
                              }
                              data-testid={`mm-drive-import-btn-${file.id}`}
                            >
                              <Download size={13} />
                              <span>Import &amp; Decrypt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPendingDriveConfirmation({
                                  type: 'delete',
                                  file,
                                  description: `Permanently delete encrypted backup "${file.name}" from your Google Drive? This action cannot be undone.`,
                                })
                              }
                              disabled={isProcessing}
                              className="mm-btn mm-btn-sm mm-btn-ghost-danger"
                              title="Delete backup file from Google Drive"
                              data-testid={`mm-drive-delete-btn-${file.id}`}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden mm-sr-only"
                style={{ display: 'none' }}
                onChange={handleCsvFileChange}
                id="mm-csv-file-input"
                data-testid="mm-csv-file-input"
              />

              <button
                type="button"
                className="mm-btn mm-btn-primary"
                onClick={() => csvInputRef.current?.click()}
                disabled={isProcessing}
                data-testid="mm-upload-csv-btn"
              >
                <Upload size={16} />
                <span>Import CSV / Upload Bank Statement (.CSV)</span>
              </button>

              <button
                type="button"
                className="mm-btn mm-btn-secondary"
                onClick={handleDownloadSampleCsv}
                disabled={isProcessing}
                data-testid="mm-backup-download-sample-csv-btn"
              >
                <Download size={15} />
                <span>Download Sample CSV</span>
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
                      setSelectedFile(null);
                    }}
                  >
                    Clear CSV
                  </button>
                  <button
                    type="button"
                    className="mm-btn mm-btn-primary"
                    onClick={handleDoneImport}
                    disabled={isProcessing}
                    data-testid="mm-csv-done-import-btn"
                  >
                    <CheckCircle2 size={16} />
                    <span>Done</span>
                  </button>
                  <button
                    type="button"
                    className="mm-btn mm-btn-emerald"
                    onClick={handleDoneImport}
                    disabled={isProcessing}
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

          {/* Settings — Local IndexedDB Transaction Ledger CSV Export (Import-Parity Format) */}
          <div
            className="mm-backup-card mm-backup-card-wide"
            data-testid="mm-bulk-csv-export-section"
          >
            <div className="mm-backup-card-head">
              <span className="mm-backup-icon mm-backup-icon-emerald">
                <FileText size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <h4>Settings: Export Local IndexedDB Ledger to CSV (Import-Parity Format)</h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>100% CSV Import Parity</span>
                  </span>
                </div>
                <p>
                  Export your local IndexedDB (<code>JawedMoneyManagerDB</code>) transaction ledger into a downloadable RFC-4180 <code>.csv</code> file with full column parity for re-importing into Money Manager, Tally Prime, Zoho Books, QuickBooks, or Excel.
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
                <label htmlFor="mm-bulk-csv-type">Transaction Type Filter</label>
                <select
                  id="mm-bulk-csv-type"
                  value={bulkExportTypeFilter}
                  onChange={(e) =>
                    setBulkExportTypeFilter(
                      e.target.value as 'ALL' | 'Income' | 'Expense' | 'Transfer'
                    )
                  }
                  className="mm-select"
                  data-testid="mm-bulk-csv-type-select"
                >
                  <option value="ALL">All Types (Income, Expense &amp; Transfer)</option>
                  <option value="Expense">Expenses Only</option>
                  <option value="Income">Income Only</option>
                  <option value="Transfer">Transfers Only</option>
                </select>
              </div>

              <div className="mm-field">
                <label htmlFor="mm-bulk-csv-format">CSV Column Layout (Import Parity)</label>
                <select
                  id="mm-bulk-csv-format"
                  value={bulkExportFormatMode}
                  onChange={(e) =>
                    setBulkExportFormatMode(
                      e.target.value as 'split-debit-credit' | 'single-signed-amount'
                    )
                  }
                  className="mm-select"
                  data-testid="mm-bulk-csv-format-select"
                >
                  <option value="split-debit-credit">
                    Split Withdrawal / Deposit Columns (Standard Bank &amp; Accounting Parity)
                  </option>
                  <option value="single-signed-amount">
                    Single Signed Amount Column (-Expense / +Income Parity)
                  </option>
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

              <div
                className="mm-field"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  className="mm-btn mm-btn-secondary mm-btn-sm"
                  onClick={() => setShowCsvExportPreview((prev) => !prev)}
                  data-testid="mm-toggle-csv-export-preview-btn"
                >
                  {showCsvExportPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>
                    {showCsvExportPreview ? 'Hide CSV Preview' : 'Preview Exported CSV Rows'}
                  </span>
                </button>
              </div>
            </div>

            {showCsvExportPreview && parsedCsvExportPreview.rows.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  overflowX: 'auto',
                  background: 'var(--surface)',
                }}
                data-testid="mm-settings-csv-export-preview"
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.76rem',
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
                      <th style={{ padding: '7px 10px' }}>Date &amp; Time</th>
                      <th style={{ padding: '7px 10px' }}>Type</th>
                      <th style={{ padding: '7px 10px' }}>Account / Bank</th>
                      <th style={{ padding: '7px 10px' }}>Category &amp; Sub-Category</th>
                      <th style={{ padding: '7px 10px' }}>Narration</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCsvExportPreview.rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          {row['Date']} {row['Time']}
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{row['Type']}</td>
                        <td style={{ padding: '6px 10px' }}>
                          {row['Account / Bank']}
                          {row['Target Account'] ? ` → ${row['Target Account']}` : ''}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          {row['Category']}
                          {row['Sub-Category'] ? ` · ${row['Sub-Category']}` : ''}
                        </td>
                        <td
                          style={{
                            padding: '6px 10px',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row['Narration']}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>
                          {formatINR(Number(row['Amount (INR)']) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="mm-btn mm-btn-primary"
                  onClick={handleDownloadLedger}
                  disabled={isProcessing}
                  data-testid="mm-settings-download-ledger-csv-btn"
                  title="Convert all local IndexedDB transaction data into CSV format and download immediately"
                >
                  <Download size={16} />
                  <span>Download Ledger</span>
                </button>

                <button
                  type="button"
                  className="mm-btn mm-btn-emerald"
                  onClick={handleBulkCsvExport}
                  disabled={isProcessing}
                  data-testid="mm-bulk-csv-export-btn"
                >
                  <Download size={16} />
                  <span>
                    Export Ledger CSV ({bulkExportSummary.transactionCount} Transactions)
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="mm-backup-grid">
            {/* 1. Download Ledger (CSV Accounting Software Compatible Table) */}
            <div className="mm-backup-card" data-testid="mm-download-csv-card">
              <div className="mm-backup-card-head">
                <span className="mm-backup-icon mm-backup-icon-emerald">
                  <FileText size={20} />
                </span>
                <div>
                  <h4>Download Ledger (CSV)</h4>
                  <p>
                    Converts all <strong>{transactions.length}</strong> local IndexedDB ledger transactions into a standard CSV table with Debit/Credit columns and triggers an automatic browser download.
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
                <span>Download Ledger</span>
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

        <div className="mm-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="mm-btn mm-btn-secondary"
            onClick={onClose}
            data-testid="mm-backup-modal-cancel-btn"
          >
            Close
          </button>
          <button
            type="button"
            className="mm-btn mm-btn-primary"
            onClick={async () => {
              if (selectedFile || mappedCsvPreview.length > 0) {
                await handleDoneImport();
              }
              onClose();
            }}
            disabled={isProcessing}
            data-testid="mm-backup-modal-done-btn"
          >
            <CheckCircle2 size={15} />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreModal;
