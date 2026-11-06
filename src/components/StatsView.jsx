export {
  StatsView,
  evaluateCategoryBudgetAlerts,
  evaluate95PercentBudgetAlerts,
  detectNew95PercentBudgetToasts,
  computeMonthlyBudgetPlan,
  default,
} from './money-manager/StatsView';

export {
  SpendingPdfModal,
} from './money-manager/SpendingPdfModal';

export {
  generateMonthlySpendingPdf,
  downloadMonthlySpendingPdf,
  formatPdfINR,
  getFullMonthYearLabel,
} from './money-manager/spendingPdfReport';

export {
  BudgetProjectionSection,
  calculateBudgetProjections,
} from './money-manager/BudgetProjectionSection';

export {
  BudgetOverrunAlertList,
} from './money-manager/BudgetOverrunAlertList';

export {
  MonthlySavingsGoalsSection,
  getStoredSavingsTarget,
} from './money-manager/MonthlySavingsGoalsSection';
export {
  BudgetForecastCard,
  calculateVelocityBudgetForecast,
} from './money-manager/BudgetForecastCard';

export {
  CategoryBudgetProgressCard,
  resolveCategoryProgressColor,
  computeCategoryBudgetProgressItems,
} from './money-manager/CategoryBudgetProgressCard';

export {
  generateMonthlyReportJson,
  triggerMonthlyReportJsonDownload,
} from './money-manager/StatsView';

export {
  triggerJsonBackupDownload,
  exportDatabaseBackup,
  SUPPORTED_CURRENCIES,
  CURRENCY_METADATA,
  FALLBACK_RATES_TO_INR,
  fetchDailyExchangeRates,
  convertCurrencyAmount,
  convertToBaseCurrency,
  resolveTransactionAmountInCurrency,
  resolveTransactionInrAmount,
  formatCurrencyAmount,
  summarizeMultiCurrencyTransactions,
  normalizeCurrencyCode,
} from '../db/db';


