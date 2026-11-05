import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  PiggyBank,
  Plus,
  TrendingUp,
  AlertTriangle,
  Trash2,
  ArrowUpCircle,
  CalendarClock,
  Repeat,
  PauseCircle,
  PlayCircle,
  Clock,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  RotateCcw,
  Palette,
  Target,
  Minus,
  Download,
  FileText,
  GripVertical,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
  calculateTwelveMonthTrend,
  formatINR,
  saveCategory as dbSaveCategory,
  deleteCategory as dbDeleteCategory,
  type CategoryBreakdownItem,
  type MoneyCategory,
  type MonthlyMetrics,
  type MoneyTransaction,
  type SinkingFund,
  type RecurringRule,
  type AccountSummary,
  triggerJsonBackupDownload,
} from '../../db/db';
import { CategoryManager } from './CategoryManager';
import {
  generateMonthlySpendingPdf,
  downloadMonthlySpendingPdf,
  type SpendingPdfReportOptions,
} from './spendingPdfReport';
import { SpendingPdfModal } from './SpendingPdfModal';
import {
  BudgetProjectionSection,
  calculateBudgetProjections,
  type BudgetProjectionSummary,
  type CategoryBudgetProjectionItem,
  type ProjectionModelType,
} from './BudgetProjectionSection';
import { BudgetOverrunAlertList } from './BudgetOverrunAlertList';
import {
  MonthlySavingsGoalsSection,
  getStoredSavingsTarget,
} from './MonthlySavingsGoalsSection';
import {
  BudgetForecastCard,
  calculateVelocityBudgetForecast,
  type BudgetForecastSummary,
  type CategoryVelocityForecastItem,
} from './BudgetForecastCard';

export { BudgetForecastCard, calculateVelocityBudgetForecast };
export type { BudgetForecastSummary, CategoryVelocityForecastItem };

export const DEFAULT_SUMMARY_CARD_ORDER = [
  'burn-rate',
  'budget-forecast',
  'budget-overrun',
  'savings-goals',
  'projections',
] as const;

export type SummaryCardId = (typeof DEFAULT_SUMMARY_CARD_ORDER)[number];

export const SUMMARY_CARD_LABELS: Record<SummaryCardId, string> = {
  'burn-rate': 'Burn Rate Summary',
  'budget-forecast': 'Budget Forecast (Velocity)',
  'budget-overrun': 'Budget Overrun Alerts',
  'savings-goals': 'Monthly Savings Goals',
  'projections': 'Budget Projections',
};

export type StatsSubView =
  | 'all'
  | 'budgets'
  | 'savings'
  | 'projections'
  | 'analytics'
  | 'categories'
  | 'scheduled';



export interface MonthlyBudgetPlanItem {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  monthlyLimit: number;
  spent: number;
  txCount: number;
  remaining: number;
  overage: number;
  utilizationPercent: number;
  shareOfTotalBudgetPercent: number;
  dailySafeSpend: number;
  status: 'over' | 'near' | 'on-track' | 'unbudgeted';
  projectedSpend: number;
  projectedVariance: number;
  projectedOverage: number;
  projectedUtilizationPercent: number;
  dailyBurnRate: number;
  historicalMonthlyAvg: number;
  forecastStatus: 'on-track' | 'at-risk' | 'projected-over' | 'unbudgeted';
  isExceeding90Percent: boolean;
  isExceeding95Percent: boolean;
}

export interface MonthlyBudgetPlanSummary {
  items: MonthlyBudgetPlanItem[];
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverage: number;
  overallUtilizationPercent: number;
  totalMonthlyBurnRatePercent: number;
  totalMonthlyBurnRate: number;
  overBudgetCount: number;
  nearLimitCount: number;
  warning90Count: number;
  warning90Categories: MonthlyBudgetPlanItem[];
  has90PercentWarning: boolean;
  warning95Count: number;
  warning95Categories: MonthlyBudgetPlanItem[];
  has95PercentWarning: boolean;
  onTrackCount: number;
  unbudgetedCount: number;
  fixedBudgeted: number;
  fixedSpent: number;
  fixedUtilizationPercent: number;
  variableBudgeted: number;
  variableSpent: number;
  variableUtilizationPercent: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  totalProjectedSpend: number;
  totalProjectedOverage: number;
  totalProjectedRemaining: number;
  projectedOverallUtilizationPercent: number;
  projectedOverBudgetCount: number;
  projectedAtRiskCount: number;
  projectedOnTrackCount: number;
}

export interface BudgetForecastOptions {
  referenceDayOfMonth?: number;
}

export type BudgetSortOption =
  | 'utilization-desc'
  | 'projected-desc'
  | 'spent-desc'
  | 'limit-desc'
  | 'name-asc';

export interface StatsViewProps {
  selectedMonth: string;
  transactions: MoneyTransaction[];
  metrics: MonthlyMetrics;
  sinkingFunds: SinkingFund[];
  categories?: MoneyCategory[];
  recurringRules?: RecurringRule[];
  accounts?: AccountSummary[];
  onSaveCategory?: (category: MoneyCategory) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onSaveSinkingFund: (fund: SinkingFund) => Promise<void>;
  onDeleteSinkingFund: (id: string) => Promise<void>;
  onToggleRecurringRule?: (rule: RecurringRule) => Promise<void>;
  onDeleteRecurringRule?: (id: string) => Promise<void>;
  onOpenRecurringScheduler?: () => void;
}

/**
 * Pure helper that computes the monthly budget plan, real-time spending progress,
 * and month-end Projected Spending forecast across all Expense categories for the selected month.
 */
export function computeMonthlyBudgetPlan(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  thresholdOverrides?: Record<string, number> | number,
  options?: BudgetForecastOptions
): MonthlyBudgetPlanSummary {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = Number.parseInt(yearStr, 10) || 2026;
  const monthNum = Number.parseInt(monthStr, 10) || 11;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate() || 30;

  const spentByCategory = new Map<
    string,
    { spent: number; txCount: number; fixedOrVariable: 'Fixed' | 'Variable' }
  >();
  const historicalSpentByCategory = new Map<string, number>();
  const priorMonthsSet = new Set<string>();
  let maxTxDay = 0;

  for (const tx of transactions) {
    if (tx.type !== 'Expense') continue;
    const txYearMonth = tx.date.slice(0, 7);
    if (txYearMonth === selectedMonth) {
      const prev = spentByCategory.get(tx.category) ?? {
        spent: 0,
        txCount: 0,
        fixedOrVariable: tx.fixedOrVariable,
      };
      prev.spent += tx.amount;
      prev.txCount += 1;
      spentByCategory.set(tx.category, prev);

      const dayPart = Number.parseInt(tx.date.slice(8, 10), 10);
      if (!Number.isNaN(dayPart) && dayPart > maxTxDay) {
        maxTxDay = dayPart;
      }
    } else if (txYearMonth < selectedMonth) {
      priorMonthsSet.add(txYearMonth);
      historicalSpentByCategory.set(
        tx.category,
        (historicalSpentByCategory.get(tx.category) ?? 0) + tx.amount
      );
    }
  }

  const priorMonthsCount = priorMonthsSet.size;
  const daysElapsed =
    typeof options?.referenceDayOfMonth === 'number' && options.referenceDayOfMonth > 0
      ? Math.min(daysInMonth, Math.max(1, Math.round(options.referenceDayOfMonth)))
      : maxTxDay > 0
      ? Math.min(daysInMonth, Math.max(6, maxTxDay))
      : Math.min(daysInMonth, 15);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const expenseCategories: MoneyCategory[] = categories.filter((c) => c.type === 'Expense');
  const seenNames = new Set(expenseCategories.map((c) => c.name));

  // Include any ad-hoc expense category present in transactions but not in categories store
  for (const [catName, stats] of spentByCategory.entries()) {
    if (!seenNames.has(catName)) {
      seenNames.add(catName);
      expenseCategories.push({
        id: `cat-adhoc-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: catName,
        type: 'Expense',
        defaultFixedOrVariable: stats.fixedOrVariable,
        iconName: 'Tag',
        color: '#06b6d4',
        subCategories: [],
      });
    }
  }

  let totalBudgeted = 0;
  let totalSpent = 0;
  let totalRemaining = 0;
  let totalOverage = 0;
  let overBudgetCount = 0;
  let nearLimitCount = 0;
  let onTrackCount = 0;
  let unbudgetedCount = 0;
  let fixedBudgeted = 0;
  let fixedSpent = 0;
  let variableBudgeted = 0;
  let variableSpent = 0;
  let totalProjectedSpend = 0;
  let totalProjectedOverage = 0;
  let totalProjectedRemaining = 0;
  let projectedOverBudgetCount = 0;
  let projectedAtRiskCount = 0;
  let projectedOnTrackCount = 0;

  const items: MonthlyBudgetPlanItem[] = expenseCategories.map((cat) => {
    const stats = spentByCategory.get(cat.name);
    const spent = stats?.spent ?? 0;
    const txCount = stats?.txCount ?? 0;

    let monthlyLimit = 0;
    if (typeof thresholdOverrides === 'number' && thresholdOverrides > 0) {
      monthlyLimit = thresholdOverrides;
    } else if (
      thresholdOverrides &&
      typeof thresholdOverrides === 'object' &&
      typeof thresholdOverrides[cat.name] === 'number'
    ) {
      monthlyLimit = Math.max(0, thresholdOverrides[cat.name]);
    } else if (typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
      monthlyLimit = cat.monthlyBudget;
    }

    const remaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - spent) : 0;
    const overage = monthlyLimit > 0 && spent > monthlyLimit ? spent - monthlyLimit : 0;
    const utilizationPercent =
      monthlyLimit > 0 ? Number(((spent / monthlyLimit) * 100).toFixed(1)) : 0;

    let status: MonthlyBudgetPlanItem['status'] = 'unbudgeted';
    if (monthlyLimit <= 0) {
      status = 'unbudgeted';
      unbudgetedCount += 1;
    } else if (spent > monthlyLimit) {
      status = 'over';
      overBudgetCount += 1;
    } else if (utilizationPercent >= 85) {
      status = 'near';
      nearLimitCount += 1;
    } else {
      status = 'on-track';
      onTrackCount += 1;
    }

    const historicalTotal = historicalSpentByCategory.get(cat.name) ?? 0;
    const historicalMonthlyAvg =
      priorMonthsCount > 0 ? Math.round(historicalTotal / priorMonthsCount) : 0;
    const dailyBurnRate = spent > 0 ? Math.round(spent / daysElapsed) : 0;
    const linearPaceProjection =
      spent > 0 ? Math.round((spent / daysElapsed) * daysInMonth) : 0;

    let projectedSpend = spent;
    if (cat.defaultFixedOrVariable === 'Fixed') {
      if (spent > 0) {
        projectedSpend = spent;
      } else {
        projectedSpend =
          daysRemaining > 0 ? Math.max(historicalMonthlyAvg, monthlyLimit) : 0;
      }
    } else {
      if (spent > 0 && historicalMonthlyAvg > 0) {
        projectedSpend = Math.max(
          spent,
          Math.round(linearPaceProjection * 0.7 + historicalMonthlyAvg * 0.3)
        );
      } else if (spent > 0) {
        projectedSpend = Math.max(spent, linearPaceProjection);
      } else if (historicalMonthlyAvg > 0 && daysRemaining > 0) {
        projectedSpend = Math.round(historicalMonthlyAvg * (daysRemaining / daysInMonth));
      } else {
        projectedSpend = 0;
      }
    }

    const projectedVariance = monthlyLimit > 0 ? monthlyLimit - projectedSpend : 0;
    const projectedOverage =
      monthlyLimit > 0 && projectedSpend > monthlyLimit ? projectedSpend - monthlyLimit : 0;
    const projectedRemaining =
      monthlyLimit > 0 ? Math.max(0, monthlyLimit - projectedSpend) : 0;
    const projectedUtilizationPercent =
      monthlyLimit > 0 ? Number(((projectedSpend / monthlyLimit) * 100).toFixed(1)) : 0;

    let forecastStatus: MonthlyBudgetPlanItem['forecastStatus'] = 'unbudgeted';
    if (monthlyLimit <= 0) {
      forecastStatus = 'unbudgeted';
    } else if (projectedSpend > monthlyLimit) {
      forecastStatus = 'projected-over';
      projectedOverBudgetCount += 1;
    } else if (projectedUtilizationPercent >= 85) {
      forecastStatus = 'at-risk';
      projectedAtRiskCount += 1;
    } else {
      forecastStatus = 'on-track';
      projectedOnTrackCount += 1;
    }

    totalBudgeted += monthlyLimit;
    totalSpent += spent;
    totalRemaining += remaining;
    totalOverage += overage;
    totalProjectedSpend += projectedSpend;
    totalProjectedOverage += projectedOverage;
    totalProjectedRemaining += projectedRemaining;

    if (cat.defaultFixedOrVariable === 'Fixed') {
      fixedBudgeted += monthlyLimit;
      fixedSpent += spent;
    } else {
      variableBudgeted += monthlyLimit;
      variableSpent += spent;
    }

    const isExceeding90Percent =
      monthlyLimit > 0 && (spent / monthlyLimit >= 0.9 || utilizationPercent >= 90);
    const isExceeding95Percent =
      monthlyLimit > 0 && (spent / monthlyLimit >= 0.95 || utilizationPercent >= 95);

    return {
      categoryId: cat.id,
      category: cat.name,
      color: cat.color || '#06b6d4',
      iconName: cat.iconName || 'Tag',
      defaultFixedOrVariable: cat.defaultFixedOrVariable,
      monthlyLimit,
      spent,
      txCount,
      remaining,
      overage,
      utilizationPercent,
      shareOfTotalBudgetPercent: 0,
      dailySafeSpend: Math.round(remaining / 10),
      status,
      projectedSpend,
      projectedVariance,
      projectedOverage,
      projectedUtilizationPercent,
      dailyBurnRate,
      historicalMonthlyAvg,
      forecastStatus,
      isExceeding90Percent,
      isExceeding95Percent,
    };
  });

  for (const item of items) {
    item.shareOfTotalBudgetPercent =
      totalBudgeted > 0
        ? Number(((item.monthlyLimit / totalBudgeted) * 100).toFixed(1))
        : 0;
  }

  const overallUtilizationPercent =
    totalBudgeted > 0 ? Number(((totalSpent / totalBudgeted) * 100).toFixed(1)) : 0;
  const fixedUtilizationPercent =
    fixedBudgeted > 0 ? Number(((fixedSpent / fixedBudgeted) * 100).toFixed(1)) : 0;
  const variableUtilizationPercent =
    variableBudgeted > 0 ? Number(((variableSpent / variableBudgeted) * 100).toFixed(1)) : 0;
  const projectedOverallUtilizationPercent =
    totalBudgeted > 0
      ? Number(((totalProjectedSpend / totalBudgeted) * 100).toFixed(1))
      : 0;

  const warning90Categories = items.filter((item) => item.isExceeding90Percent);
  const warning90Count = warning90Categories.length;
  const has90PercentWarning = warning90Count > 0;

  const warning95Categories = items.filter((item) => item.isExceeding95Percent);
  const warning95Count = warning95Categories.length;
  const has95PercentWarning = warning95Count > 0;

  return {
    items,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    totalOverage,
    overallUtilizationPercent,
    totalMonthlyBurnRatePercent: overallUtilizationPercent,
    totalMonthlyBurnRate: overallUtilizationPercent,
    overBudgetCount,
    nearLimitCount,
    warning90Count,
    warning90Categories,
    has90PercentWarning,
    warning95Count,
    warning95Categories,
    has95PercentWarning,
    onTrackCount,
    unbudgetedCount,
    fixedBudgeted,
    fixedSpent,
    fixedUtilizationPercent,
    variableBudgeted,
    variableSpent,
    variableUtilizationPercent,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    totalProjectedSpend,
    totalProjectedOverage,
    totalProjectedRemaining,
    projectedOverallUtilizationPercent,
    projectedOverBudgetCount,
    projectedAtRiskCount,
    projectedOnTrackCount,
  };
}

/**
 * Pure helper alias that computes the month-end Projected Spending forecast
 * from current-month burn velocity and prior-month transaction history.
 */
export function computeProjectedSpendingForecast(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  thresholdOverrides?: Record<string, number> | number,
  options?: BudgetForecastOptions
): MonthlyBudgetPlanSummary {
  return computeMonthlyBudgetPlan(
    transactions,
    selectedMonth,
    categories,
    thresholdOverrides,
    options
  );
}

/**
 * Pure helper that allocates a 50/30/20 monthly budget plan (50% Fixed, 30% Variable, 20% Savings)
 * from the month's total income across all Expense categories, weighted by baseline or current spend.
 */
export function computeIncomeBasedBudgetAllocation(
  monthlyIncome: number,
  items: MonthlyBudgetPlanItem[]
): Record<string, number> {
  const safeIncome = Math.max(50000, monthlyIncome || 0);
  const fixedPool = safeIncome * 0.5;
  const variablePool = safeIncome * 0.3;

  const fixedItems = items.filter((i) => i.defaultFixedOrVariable === 'Fixed');
  const variableItems = items.filter((i) => i.defaultFixedOrVariable === 'Variable');

  const fixedWeightSum =
    fixedItems.reduce((sum, i) => sum + Math.max(1000, i.spent || i.monthlyLimit || 3000), 0) || 1;
  const variableWeightSum =
    variableItems.reduce((sum, i) => sum + Math.max(1000, i.spent || i.monthlyLimit || 2000), 0) ||
    1;

  const result: Record<string, number> = {};

  for (const item of fixedItems) {
    const weight = Math.max(1000, item.spent || item.monthlyLimit || 3000);
    const rawShare = (fixedPool * weight) / fixedWeightSum;
    result[item.category] = Math.max(1000, Math.round(rawShare / 500) * 500);
  }

  for (const item of variableItems) {
    const weight = Math.max(1000, item.spent || item.monthlyLimit || 2000);
    const rawShare = (variablePool * weight) / variableWeightSum;
    result[item.category] = Math.max(1000, Math.round(rawShare / 500) * 500);
  }

  return result;
}

export const MONTHLY_BUDGET_CSV_HEADERS = [
  'Month',
  'Category ID',
  'Category',
  'Expense Type',
  'Monthly Limit (INR)',
  'Actual Spent (INR)',
  'Remaining Headroom (INR)',
  'Overage Amount (INR)',
  'Utilization (%)',
  'Share of Total Budget (%)',
  'Daily Safe Spend (INR)',
  'Transaction Count',
  'Budget Status',
] as const;

export interface MonthlyBudgetCsvExportOptions {
  includeSummaryRow?: boolean;
  itemsOverride?: MonthlyBudgetPlanItem[];
}

export interface MonthlyBudgetCsvExportResult {
  fileName: string;
  csvContent: string;
  selectedMonth: string;
  categoryCount: number;
  overBudgetCount: number;
  nearLimitCount: number;
  onTrackCount: number;
  unbudgetedCount: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverage: number;
  overallUtilizationPercent: number;
}

function escapeBudgetCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n') || raw.includes('\r')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function formatBudgetStatusLabel(status: MonthlyBudgetPlanItem['status']): string {
  if (status === 'over') return 'Over Budget';
  if (status === 'near') return 'Near Limit';
  if (status === 'on-track') return 'On Track';
  return 'Unbudgeted';
}

/**
 * Pure helper that formats a monthly budget plan and real-time spending progress
 * into a standard RFC-4180 CSV string for external spreadsheets and tracking tools.
 */
export function formatMonthlyBudgetPlanToCsv(
  plan: MonthlyBudgetPlanSummary,
  selectedMonth: string,
  options?: MonthlyBudgetCsvExportOptions
): string {
  const rowsToFormat = options?.itemsOverride ?? plan.items;
  const lines: string[] = [
    MONTHLY_BUDGET_CSV_HEADERS.map((h) => escapeBudgetCsvCell(h)).join(','),
  ];

  for (const item of rowsToFormat) {
    const row = [
      selectedMonth,
      item.categoryId,
      item.category,
      item.defaultFixedOrVariable,
      item.monthlyLimit,
      item.spent,
      item.remaining,
      item.overage,
      item.utilizationPercent,
      item.shareOfTotalBudgetPercent,
      item.dailySafeSpend,
      item.txCount,
      formatBudgetStatusLabel(item.status),
    ];
    lines.push(row.map((cell) => escapeBudgetCsvCell(cell)).join(','));
  }

  if (options?.includeSummaryRow) {
    const totalTxCount = rowsToFormat.reduce((sum, i) => sum + i.txCount, 0);
    const totalDailySafe = rowsToFormat.reduce((sum, i) => sum + i.dailySafeSpend, 0);
    const overallStatus: MonthlyBudgetPlanItem['status'] =
      plan.totalBudgeted <= 0
        ? 'unbudgeted'
        : plan.totalSpent > plan.totalBudgeted
        ? 'over'
        : plan.overallUtilizationPercent >= 85
        ? 'near'
        : 'on-track';

    const summaryRow = [
      selectedMonth,
      'TOTAL-SUMMARY',
      'Total Monthly Budget Summary',
      'All',
      plan.totalBudgeted,
      plan.totalSpent,
      plan.totalRemaining,
      plan.totalOverage,
      plan.overallUtilizationPercent,
      plan.totalBudgeted > 0 ? 100 : 0,
      totalDailySafe,
      totalTxCount,
      formatBudgetStatusLabel(overallStatus),
    ];
    lines.push(summaryRow.map((cell) => escapeBudgetCsvCell(cell)).join(','));
  }

  return lines.join('\n');
}

/**
 * Generates a complete Monthly Budget CSV export payload including metadata and filename.
 */
export function generateMonthlyBudgetCsvExport(
  plan: MonthlyBudgetPlanSummary,
  selectedMonth: string,
  options?: MonthlyBudgetCsvExportOptions
): MonthlyBudgetCsvExportResult {
  const rows = options?.itemsOverride ?? plan.items;
  const csvContent = formatMonthlyBudgetPlanToCsv(plan, selectedMonth, options);
  const safeMonth = (selectedMonth || 'current-month').replace(/[^0-9A-Za-z_-]/g, '-');
  return {
    fileName: `jawed-money-manager-budget-plan-${safeMonth}.csv`,
    csvContent,
    selectedMonth,
    categoryCount: rows.length,
    overBudgetCount: rows.filter((i) => i.status === 'over').length,
    nearLimitCount: rows.filter((i) => i.status === 'near').length,
    onTrackCount: rows.filter((i) => i.status === 'on-track').length,
    unbudgetedCount: rows.filter((i) => i.status === 'unbudgeted').length,
    totalBudgeted: plan.totalBudgeted,
    totalSpent: plan.totalSpent,
    totalRemaining: plan.totalRemaining,
    totalOverage: plan.totalOverage,
    overallUtilizationPercent: plan.overallUtilizationPercent,
  };
}

/**
 * Triggers a browser file download of the Monthly Budget & Spending Progress CSV.
 */
export function triggerMonthlyBudgetCsvDownload(
  plan: MonthlyBudgetPlanSummary,
  selectedMonth: string,
  options?: MonthlyBudgetCsvExportOptions
): MonthlyBudgetCsvExportResult {
  const exportPayload = generateMonthlyBudgetCsvExport(plan, selectedMonth, options);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([`\uFEFF${exportPayload.csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportPayload.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return exportPayload;
}

/**
 * Pure helper that evaluates monthly category spending against user-defined thresholds
 * and returns the enriched breakdown (including custom category colors) along with exceeded and near-limit categories.
 */
export function evaluateCategoryBudgetAlerts(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categoriesOrThresholds?: MoneyCategory[] | Record<string, number> | number,
  customCategoriesOrColors?: MoneyCategory[] | Record<string, string>
): {
  breakdown: CategoryBreakdownItem[];
  exceededCategories: CategoryBreakdownItem[];
  nearLimitCategories: CategoryBreakdownItem[];
  totalOverBudgetAmount: number;
  alertSeverity: 'critical' | 'warning' | 'healthy';
  highestOverageCategory: CategoryBreakdownItem | null;
} {
  const breakdown = calculateCategoryBreakdown(
    transactions,
    selectedMonth,
    categoriesOrThresholds,
    customCategoriesOrColors
  );
  const exceededCategories = breakdown.filter((item) => Boolean(item.isOverBudget));
  const nearLimitCategories = breakdown.filter(
    (item) =>
      !item.isOverBudget &&
      typeof item.budgetUtilizationPercent === 'number' &&
      item.budgetUtilizationPercent >= 85
  );

  const totalOverBudgetAmount = exceededCategories.reduce(
    (sum, item) => sum + (item.overBudgetAmount || 0),
    0
  );

  const highestOverageCategory =
    exceededCategories.length > 0
      ? [...exceededCategories].sort(
          (a, b) => (b.overBudgetAmount || 0) - (a.overBudgetAmount || 0)
        )[0]
      : null;

  const alertSeverity: 'critical' | 'warning' | 'healthy' =
    exceededCategories.length > 0
      ? 'critical'
      : nearLimitCategories.length > 0
      ? 'warning'
      : 'healthy';

  return {
    breakdown,
    exceededCategories,
    nearLimitCategories,
    totalOverBudgetAmount,
    alertSeverity,
    highestOverageCategory,
  };
}

export interface Budget95ToastAlert {
  id: string;
  selectedMonth: string;
  category: string;
  categoryId: string;
  color: string;
  spent: number;
  monthlyLimit: number;
  remaining: number;
  overage: number;
  utilizationPercent: number;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  timestamp: string;
}

/**
 * Pure helper that checks the current ledger state for categories approaching or exceeding 95% of their monthly budget
 * and generates user-friendly alert messages and structured toast payloads for real-time notifications.
 */
export function evaluate95PercentBudgetAlerts(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  thresholdOverrides?: Record<string, number> | number
): {
  warning95Categories: MonthlyBudgetPlanItem[];
  alertMessages: string[];
  toastAlerts: Budget95ToastAlert[];
  has95PercentWarning: boolean;
} {
  const plan = computeMonthlyBudgetPlan(
    transactions,
    selectedMonth,
    categories,
    thresholdOverrides
  );
  const warning95Categories = [...plan.warning95Categories].sort(
    (a, b) => b.utilizationPercent - a.utilizationPercent || b.spent - a.spent
  );

  const nowIso = new Date().toISOString();
  const toastAlerts: Budget95ToastAlert[] = warning95Categories.map((item) => {
    const isExceeded = item.spent > item.monthlyLimit;
    const severity: 'critical' | 'warning' = isExceeded ? 'critical' : 'warning';
    const title = isExceeded
      ? `Budget Limit Exceeded: ${item.category} (${item.utilizationPercent}%)`
      : `95% Budget Alert: ${item.category} (${item.utilizationPercent}%)`;
    const message = isExceeded
      ? `⚠️ Budget Exceeded: ${item.category} is at ${item.utilizationPercent}% of its ${formatINR(item.monthlyLimit)} monthly limit (Spent: ${formatINR(item.spent)})!`
      : `⚠️ Budget Warning: ${item.category} has reached ${item.utilizationPercent}% of its ${formatINR(item.monthlyLimit)} monthly limit (Spent: ${formatINR(item.spent)})!`;

    return {
      id: `${selectedMonth}:${item.category}:${item.spent}:${item.monthlyLimit}`,
      selectedMonth,
      category: item.category,
      categoryId: item.categoryId,
      color: item.color,
      spent: item.spent,
      monthlyLimit: item.monthlyLimit,
      remaining: item.remaining,
      overage: item.overage,
      utilizationPercent: item.utilizationPercent,
      severity,
      title,
      message,
      timestamp: nowIso,
    };
  });

  const alertMessages = toastAlerts.map((t) => t.message);

  return {
    warning95Categories,
    alertMessages,
    toastAlerts,
    has95PercentWarning: warning95Categories.length > 0,
  };
}

/**
 * Evaluates current ledger transactions and returns only newly triggered 95% category budget toast alerts
 * that have not yet been shown in the current session, recording their keys in `notifiedKeys`.
 */
export function detectNew95PercentBudgetToasts(
  transactions: MoneyTransaction[],
  selectedMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  notifiedKeys: Set<string> = new Set(),
  thresholdOverrides?: Record<string, number> | number
): Budget95ToastAlert[] {
  const { toastAlerts } = evaluate95PercentBudgetAlerts(
    transactions,
    selectedMonth,
    categories,
    thresholdOverrides
  );

  const newlyTriggered: Budget95ToastAlert[] = [];
  for (const alert of toastAlerts) {
    if (!notifiedKeys.has(alert.id)) {
      notifiedKeys.add(alert.id);
      newlyTriggered.push(alert);
    }
  }

  return newlyTriggered;
}

export type CashFlowChartStyle = 'composed' | 'area' | 'bar';

export interface SixMonthCashFlowPoint {
  yearMonth: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  expenseToIncomeRatio: number;
  cumulativeNet: number;
  status: 'surplus' | 'deficit' | 'breakeven';
}

export interface SixMonthCashFlowSummary {
  points: SixMonthCashFlowPoint[];
  totalSixMonthIncome: number;
  totalSixMonthExpense: number;
  totalSixMonthNet: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  averageMonthlyNet: number;
  averageSavingsRate: number;
  surplusMonthsCount: number;
  deficitMonthsCount: number;
  peakIncomeMonth: SixMonthCashFlowPoint | null;
  peakExpenseMonth: SixMonthCashFlowPoint | null;
}

/**
 * Pure helper that computes the 6-month Cash Flow (Income vs. Expenses & Net Cash Flow)
 * trend and aggregate KPI metrics ending at `referenceYearMonth`.
 */
export function computeSixMonthCashFlowTrend(
  transactions: MoneyTransaction[],
  referenceYearMonth: string
): SixMonthCashFlowSummary {
  const rawTrend = calculateSixMonthTrend(transactions, referenceYearMonth);
  let cumulativeNet = 0;
  let totalSixMonthIncome = 0;
  let totalSixMonthExpense = 0;
  let totalSixMonthNet = 0;
  let surplusMonthsCount = 0;
  let deficitMonthsCount = 0;

  const points: SixMonthCashFlowPoint[] = rawTrend.map((item) => {
    const income = Number(item.income) || 0;
    const expense = Number(item.expense) || 0;
    const net = income - expense;
    cumulativeNet += net;
    totalSixMonthIncome += income;
    totalSixMonthExpense += expense;
    totalSixMonthNet += net;

    const savingsRate = income > 0 ? Number(((net / income) * 100).toFixed(1)) : 0;
    const expenseToIncomeRatio =
      income > 0 ? Number(((expense / income) * 100).toFixed(1)) : expense > 0 ? 100 : 0;

    let status: SixMonthCashFlowPoint['status'] = 'breakeven';
    if (net > 0) {
      status = 'surplus';
      surplusMonthsCount += 1;
    } else if (net < 0) {
      status = 'deficit';
      deficitMonthsCount += 1;
    }

    return {
      yearMonth: item.yearMonth,
      label: item.label,
      income,
      expense,
      net,
      savingsRate,
      expenseToIncomeRatio,
      cumulativeNet,
      status,
    };
  });

  const count = points.length || 1;
  const averageMonthlyIncome = Math.round(totalSixMonthIncome / count);
  const averageMonthlyExpense = Math.round(totalSixMonthExpense / count);
  const averageMonthlyNet = Math.round(totalSixMonthNet / count);
  const averageSavingsRate =
    totalSixMonthIncome > 0
      ? Number(((totalSixMonthNet / totalSixMonthIncome) * 100).toFixed(1))
      : 0;

  const activeIncomeMonths = points.filter((p) => p.income > 0);
  const activeExpenseMonths = points.filter((p) => p.expense > 0);

  const peakIncomeMonth =
    activeIncomeMonths.length > 0
      ? [...activeIncomeMonths].sort((a, b) => b.income - a.income)[0]
      : null;
  const peakExpenseMonth =
    activeExpenseMonths.length > 0
      ? [...activeExpenseMonths].sort((a, b) => b.expense - a.expense)[0]
      : null;

  return {
    points,
    totalSixMonthIncome,
    totalSixMonthExpense,
    totalSixMonthNet,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlyNet,
    averageSavingsRate,
    surplusMonthsCount,
    deficitMonthsCount,
    peakIncomeMonth,
    peakExpenseMonth,
  };
}

export const StatsView: React.FC<StatsViewProps> = ({
  selectedMonth,
  transactions,
  metrics,
  sinkingFunds,
  categories = INITIAL_CATEGORIES,
  recurringRules = [],
  accounts = [],
  onSaveCategory,
  onDeleteCategory,
  onSaveSinkingFund,
  onDeleteSinkingFund,
  onToggleRecurringRule,
  onDeleteRecurringRule,
  onOpenRecurringScheduler,
}) => {
  const [subView, setSubView] = useState<StatsSubView>('all');
  const [budgetFilterStatus, setBudgetFilterStatus] = useState<
    'all' | 'over' | 'projected-over' | 'warning-90' | 'near' | 'on-track' | 'unbudgeted'
  >('all');
  const [budgetSearchQuery, setBudgetSearchQuery] = useState<string>('');
  const [budgetSortBy, setBudgetSortBy] = useState<BudgetSortOption>('utilization-desc');
  const [showBudgetComparisonChart, setShowBudgetComparisonChart] = useState<boolean>(true);
  const [forecastDayOverride, setForecastDayOverride] = useState<number | null>(null);
  const [budgetCsvExportNotice, setBudgetCsvExportNotice] =
    useState<MonthlyBudgetCsvExportResult | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [pdfExportNotice, setPdfExportNotice] = useState<string | null>(null);
  const [backupExportNotice, setBackupExportNotice] = useState<{
    fileName: string;
    recordCount: number;
  } | null>(null);

  const handleExportFullJsonBackup = async () => {
    const res = await triggerJsonBackupDownload();
    setBackupExportNotice(res);
  };
  const [showPausedRules, setShowPausedRules] = useState<boolean>(false);
  const [barChartMode, setBarChartMode] = useState<'category' | 'trend'>('category');
  const [cashFlowChartStyle, setCashFlowChartStyle] = useState<CashFlowChartStyle>('composed');
  const [localCategories, setLocalCategories] = useState<MoneyCategory[]>(categories);

  // Dashboard Summary Card Drag & Drop / Reordering State
  const [summaryCardOrder, setSummaryCardOrder] = useState<SummaryCardId[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jawed_mm_dashboard_summary_card_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === DEFAULT_SUMMARY_CARD_ORDER.length) {
            const isValid = parsed.every((item) =>
              DEFAULT_SUMMARY_CARD_ORDER.includes(item as SummaryCardId)
            );
            if (isValid) return parsed as SummaryCardId[];
          }
        }
      } catch (e) {
        // Storage fallback
      }
    }
    return [...DEFAULT_SUMMARY_CARD_ORDER];
  });
  const [isCustomizingDashboard, setIsCustomizingDashboard] = useState<boolean>(false);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  const updateSummaryCardOrder = (nextOrder: SummaryCardId[]) => {
    setSummaryCardOrder(nextOrder);
    try {
      localStorage.setItem('jawed_mm_dashboard_summary_card_order', JSON.stringify(nextOrder));
    } catch (e) {
      // Storage fallback
    }
  };

  const handleResetCardOrder = () => {
    updateSummaryCardOrder([...DEFAULT_SUMMARY_CARD_ORDER]);
  };

  const moveSummaryCard = (id: SummaryCardId, direction: 'up' | 'down') => {
    const index = summaryCardOrder.indexOf(id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= summaryCardOrder.length) return;
    const next = [...summaryCardOrder];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    updateSummaryCardOrder(next);
  };

  const handleCardDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCardIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCardIndex !== index) {
      setDragOverCardIndex(index);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCardIndex === null || draggedCardIndex === targetIndex) {
      setDraggedCardIndex(null);
      setDragOverCardIndex(null);
      return;
    }
    const next = [...summaryCardOrder];
    const [moved] = next.splice(draggedCardIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateSummaryCardOrder(next);
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  const handleCardDragEnd = () => {
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  // User-defined budget alert thresholds per category + optional uniform threshold override
  const [categoryThresholds, setCategoryThresholds] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const cat of categories) {
      if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
        initial[cat.name] = cat.monthlyBudget;
      }
    }
    return initial;
  });
  const [uniformThresholdInput, setUniformThresholdInput] = useState<string>('');

  useEffect(() => {
    setLocalCategories(categories);
    setCategoryThresholds((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const cat of categories) {
        if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
          next[cat.name] = cat.monthlyBudget;
        }
      }
      return next;
    });
  }, [categories]);

  const [showAddFund, setShowAddFund] = useState(false);
  const [fundName, setFundName] = useState('');
  const [fundTarget, setFundTarget] = useState('50000');
  const [fundMonthly, setFundMonthly] = useState('4000');
  const [fundAccrued, setFundAccrued] = useState('10000');

  const activeThresholdConfig = useMemo<Record<string, number> | number>(() => {
    const uniformVal = Number.parseFloat(uniformThresholdInput);
    if (!Number.isNaN(uniformVal) && uniformVal > 0) {
      return uniformVal;
    }
    return categoryThresholds;
  }, [uniformThresholdInput, categoryThresholds]);

  const {
    breakdown: categoryBreakdown,
    exceededCategories,
    nearLimitCategories,
    totalOverBudgetAmount,
    alertSeverity,
  } = useMemo(
    () =>
      evaluateCategoryBudgetAlerts(
        transactions,
        selectedMonth,
        activeThresholdConfig,
        localCategories
      ),
    [transactions, selectedMonth, activeThresholdConfig, localCategories]
  );

  const monthlyBudgetPlan = useMemo(
    () =>
      computeMonthlyBudgetPlan(
        transactions,
        selectedMonth,
        localCategories,
        activeThresholdConfig,
        forecastDayOverride ? { referenceDayOfMonth: forecastDayOverride } : undefined
      ),
    [transactions, selectedMonth, localCategories, activeThresholdConfig, forecastDayOverride]
  );

  const filteredBudgetPlanItems = useMemo(() => {
    const cleanQuery = budgetSearchQuery.trim().toLowerCase();
    const list = monthlyBudgetPlan.items.filter((item) => {
      if (budgetFilterStatus === 'warning-90') {
        if (!item.isExceeding90Percent) return false;
      } else if (budgetFilterStatus === 'projected-over') {
        if (item.forecastStatus !== 'projected-over') return false;
      } else if (budgetFilterStatus !== 'all' && item.status !== budgetFilterStatus) {
        return false;
      }
      if (cleanQuery) {
        const matchesName = item.category.toLowerCase().includes(cleanQuery);
        const matchesType = item.defaultFixedOrVariable.toLowerCase().includes(cleanQuery);
        return matchesName || matchesType;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (budgetSortBy === 'utilization-desc') {
        return b.utilizationPercent - a.utilizationPercent || b.spent - a.spent;
      }
      if (budgetSortBy === 'projected-desc') {
        return (
          b.projectedSpend - a.projectedSpend ||
          b.projectedUtilizationPercent - a.projectedUtilizationPercent
        );
      }
      if (budgetSortBy === 'spent-desc') {
        return b.spent - a.spent || b.monthlyLimit - a.monthlyLimit;
      }
      if (budgetSortBy === 'limit-desc') {
        return b.monthlyLimit - a.monthlyLimit || b.spent - a.spent;
      }
      return a.category.localeCompare(b.category);
    });
  }, [monthlyBudgetPlan.items, budgetFilterStatus, budgetSearchQuery, budgetSortBy]);

  const handleSaveCategoryState = async (updatedCat: MoneyCategory) => {
    setLocalCategories((prev) => {
      const exists = prev.some((c) => c.id === updatedCat.id);
      if (exists) {
        return prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      }
      return [...prev, updatedCat];
    });
    if (typeof updatedCat.monthlyBudget === 'number' && updatedCat.monthlyBudget > 0) {
      setCategoryThresholds((prev) => ({
        ...prev,
        [updatedCat.name]: updatedCat.monthlyBudget!,
      }));
    }
    if (onSaveCategory) {
      await onSaveCategory(updatedCat);
    } else {
      await dbSaveCategory(updatedCat);
    }
  };

  const handleDeleteCategoryState = async (id: string) => {
    setLocalCategories((prev) => prev.filter((c) => c.id !== id));
    if (onDeleteCategory) {
      await onDeleteCategory(id);
    } else {
      await dbDeleteCategory(id);
    }
  };

  const handleInlineCategoryColorChange = async (categoryName: string, nextColor: string) => {
    const existingCat = localCategories.find((c) => c.name === categoryName);
    if (existingCat) {
      await handleSaveCategoryState({
        ...existingCat,
        color: nextColor,
      });
    }
  };

  const handleCategoryThresholdChange = async (categoryName: string, rawValue: string) => {
    const parsed = Math.max(0, Number.parseFloat(rawValue) || 0);
    setUniformThresholdInput('');
    setCategoryThresholds((prev) => ({
      ...prev,
      [categoryName]: parsed,
    }));

    const existingCat = localCategories.find((c) => c.name === categoryName);
    if (existingCat) {
      await handleSaveCategoryState({
        ...existingCat,
        monthlyBudget: parsed > 0 ? parsed : undefined,
      });
    }
  };

  const handleStepCategoryBudget = async (categoryName: string, currentLimit: number, delta: number) => {
    const nextLimit = Math.max(0, currentLimit + delta);
    await handleCategoryThresholdChange(categoryName, String(nextLimit));
  };

  const handleAutoAllocateWithBuffer = async () => {
    setUniformThresholdInput('');
    const nextThresholds: Record<string, number> = { ...categoryThresholds };

    for (const item of monthlyBudgetPlan.items) {
      const targetLimit =
        item.spent > 0
          ? Math.ceil((item.spent * 1.1) / 500) * 500
          : item.monthlyLimit > 0
          ? item.monthlyLimit
          : 3000;
      nextThresholds[item.category] = targetLimit;

      const existingCat = localCategories.find((c) => c.name === item.category);
      if (existingCat) {
        await handleSaveCategoryState({
          ...existingCat,
          monthlyBudget: targetLimit,
        });
      }
    }
    setCategoryThresholds(nextThresholds);
  };

  const handleAlignBudgetsToProjected = async () => {
    setUniformThresholdInput('');
    const nextThresholds: Record<string, number> = { ...categoryThresholds };

    for (const item of monthlyBudgetPlan.items) {
      const targetLimit =
        item.projectedSpend > 0
          ? Math.max(item.monthlyLimit, Math.ceil(item.projectedSpend / 500) * 500)
          : item.monthlyLimit > 0
          ? item.monthlyLimit
          : 3000;
      nextThresholds[item.category] = targetLimit;

      const existingCat = localCategories.find((c) => c.name === item.category);
      if (existingCat) {
        await handleSaveCategoryState({
          ...existingCat,
          monthlyBudget: targetLimit,
        });
      }
    }
    setCategoryThresholds(nextThresholds);
  };

  const handleAutoAllocate503020 = async () => {
    setUniformThresholdInput('');
    const allocated = computeIncomeBasedBudgetAllocation(
      metrics.income,
      monthlyBudgetPlan.items
    );
    const nextThresholds: Record<string, number> = {
      ...categoryThresholds,
      ...allocated,
    };
    setCategoryThresholds(nextThresholds);

    for (const item of monthlyBudgetPlan.items) {
      const targetLimit = allocated[item.category];
      const existingCat = localCategories.find((c) => c.name === item.category);
      if (existingCat && typeof targetLimit === 'number' && targetLimit > 0) {
        await handleSaveCategoryState({
          ...existingCat,
          monthlyBudget: targetLimit,
        });
      }
    }
  };

  const handleApplyUniformThresholdToAll = async () => {
    const parsed = Math.max(0, Number.parseFloat(uniformThresholdInput) || 0);
    if (parsed <= 0) return;

    const updatedMap: Record<string, number> = { ...categoryThresholds };
    for (const item of categoryBreakdown) {
      updatedMap[item.category] = parsed;
    }
    for (const cat of localCategories) {
      if (cat.type === 'Expense') {
        updatedMap[cat.name] = parsed;
      }
    }
    setCategoryThresholds(updatedMap);

    for (const cat of localCategories) {
      if (cat.type === 'Expense') {
        await handleSaveCategoryState({
          ...cat,
          monthlyBudget: parsed,
        });
      }
    }
  };

  const handleResetDefaultThresholds = async () => {
    setUniformThresholdInput('');
    const defaults: Record<string, number> = {};
    for (const cat of INITIAL_CATEGORIES) {
      if (cat.type === 'Expense' && typeof cat.monthlyBudget === 'number') {
        defaults[cat.name] = cat.monthlyBudget;
      }
    }
    setCategoryThresholds(defaults);

    for (const cat of INITIAL_CATEGORIES) {
      if (cat.type === 'Expense') {
        await handleSaveCategoryState(cat);
      }
    }
  };

  const handleExportMonthlyBudgetCsv = (useFilteredItems = false) => {
    const payload = triggerMonthlyBudgetCsvDownload(monthlyBudgetPlan, selectedMonth, {
      includeSummaryRow: true,
      itemsOverride: useFilteredItems ? filteredBudgetPlanItems : undefined,
    });
    setBudgetCsvExportNotice(payload);
  };

  const sixMonthTrend = useMemo(
    () => calculateSixMonthTrend(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const sixMonthCashFlow = useMemo(
    () => computeSixMonthCashFlowTrend(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const twelveMonthTrend = useMemo(
    () => calculateTwelveMonthTrend(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const twelveMonthSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalNet = 0;

    for (const p of twelveMonthTrend) {
      totalIncome += p.income;
      totalExpense += p.expense;
      totalNet += p.net;
    }

    const count = twelveMonthTrend.length || 1;
    const avgIncome = Math.round(totalIncome / count);
    const avgExpense = Math.round(totalExpense / count);
    const avgNet = Math.round(totalNet / count);

    return {
      totalIncome,
      totalExpense,
      totalNet,
      avgIncome,
      avgExpense,
      avgNet,
      startLabel: twelveMonthTrend[0]?.label || '',
      endLabel: twelveMonthTrend[twelveMonthTrend.length - 1]?.label || '',
    };
  }, [twelveMonthTrend]);

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of accounts) {
      map.set(acc.id, acc.name);
    }
    return map;
  }, [accounts]);

  const activeRecurringRules = useMemo(
    () => recurringRules.filter((rule) => rule.active),
    [recurringRules]
  );

  const displayedRecurringRules = useMemo(() => {
    const list = showPausedRules ? recurringRules : activeRecurringRules;
    return [...list].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
  }, [recurringRules, activeRecurringRules, showPausedRules]);

  const handleAddMonthlyContribution = async (fund: SinkingFund) => {
    const nextAccrued = Math.min(fund.targetAmount, fund.currentAccrued + fund.monthlyTarget);
    await onSaveSinkingFund({
      ...fund,
      currentAccrued: nextAccrued,
    });
  };

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fundName.trim();
    if (!cleanName) return;

    const target = Math.max(1000, Number.parseFloat(fundTarget) || 50000);
    const monthly = Math.max(100, Number.parseFloat(fundMonthly) || 4000);
    const accrued = Math.max(0, Number.parseFloat(fundAccrued) || 0);

    await onSaveSinkingFund({
      id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      targetAmount: target,
      monthlyTarget: monthly,
      currentAccrued: accrued,
    });

    setFundName('');
    setFundTarget('50000');
    setFundMonthly('4000');
    setFundAccrued('0');
    setShowAddFund(false);
  };

  const showBudgetPlanningSection = subView === 'all' || subView === 'budgets';
  const showSavingsGoalsSection =
    subView === 'all' || subView === 'budgets' || subView === 'savings';
  const showBudgetProjectionSection =
    subView === 'all' || subView === 'budgets' || subView === 'projections';
  const showAnalyticsSections = subView === 'all' || subView === 'analytics';
  const showCategoriesSection = subView === 'all' || subView === 'analytics' || subView === 'categories';
  const showScheduledSection = subView === 'all' || subView === 'scheduled';

  const unallocatedIncome = Math.max(0, metrics.income - monthlyBudgetPlan.totalBudgeted);

  return (
    <section
      className="mm-view-section"
      aria-label="Statistics, Analytics, Sinking Funds & Scheduled Transactions"
    >
      {/* Stats & Budgets View Switcher Bar */}
      <div
        className="mm-filter-bar"
        data-testid="mm-stats-subview-bar"
        style={{ padding: '12px 16px' }}
      >
        <div className="mm-stat-panel-header" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BarChart3 size={17} style={{ color: 'var(--accent)' }} />
            <strong>Stats &amp; Budgets Views</strong>
            <span className="mm-stat-panel-sub" style={{ margin: 0 }}>
              ({exceededCategories.length} budget{' '}
              {exceededCategories.length === 1 ? 'alert' : 'alerts'} ·{' '}
              {activeRecurringRules.length} active scheduled rules · {sinkingFunds.length} sinking
              funds)
            </span>
          </div>

          <div
            role="group"
            aria-label="Select Stats & Budgets Sub-View"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => setSubView('all')}
              className={`mm-btn mm-btn-sm ${
                subView === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-all-btn"
            >
              Overview (All)
            </button>
            <button
              type="button"
              onClick={() => setSubView('budgets')}
              className={`mm-btn mm-btn-sm ${
                subView === 'budgets' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-budgets-btn"
            >
              <Target size={14} />
              <span>Monthly Budget Plan ({monthlyBudgetPlan.overallUtilizationPercent}%)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('savings')}
              className={`mm-btn mm-btn-sm ${
                subView === 'savings' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-savings-btn"
            >
              <PiggyBank size={14} />
              <span>Monthly Savings Goals</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('projections')}
              className={`mm-btn mm-btn-sm ${
                subView === 'projections' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-projections-btn"
            >
              <TrendingUp size={14} />
              <span>Budget Projections</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('analytics')}
              className={`mm-btn mm-btn-sm ${
                subView === 'analytics' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-analytics-btn"
            >
              Charts &amp; Sinking Funds
            </button>
            <button
              type="button"
              onClick={() => setSubView('categories')}
              className={`mm-btn mm-btn-sm ${
                subView === 'categories' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-categories-btn"
            >
              <Palette size={14} />
              <span>Category Manager ({localCategories.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('scheduled')}
              className={`mm-btn mm-btn-sm ${
                subView === 'scheduled' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-stats-view-scheduled-btn"
            >
              <CalendarClock size={14} />
              <span>Scheduled Transactions ({activeRecurringRules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="mm-btn mm-btn-sm mm-btn-secondary"
              title="Export formatted monthly spending report as an A4 PDF summary"
              data-testid="mm-stats-export-pdf-bar-btn"
            >
              <FileText size={14} style={{ color: 'var(--accent)' }} />
              <span>Export PDF Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Visual Budget Alert System Center */}
      {(exceededCategories.length > 0 || nearLimitCategories.length > 0) && (
        <article
          className="mm-stat-panel"
          role="region"
          aria-label="Visual Budget Alert System"
          data-testid="mm-visual-alert-system"
          data-alert-severity={alertSeverity}
          style={{
            marginBottom: '12px',
            border:
              exceededCategories.length > 0
                ? '1.5px solid rgba(239, 68, 68, 0.55)'
                : '1.5px solid rgba(245, 158, 11, 0.5)',
            background:
              exceededCategories.length > 0
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(15, 23, 42, 0.02))'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.02))',
          }}
        >
          <div className="mm-stat-panel-header" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    exceededCategories.length > 0
                      ? 'rgba(239, 68, 68, 0.16)'
                      : 'rgba(245, 158, 11, 0.16)',
                  color: exceededCategories.length > 0 ? '#ef4444' : '#f59e0b',
                }}
                data-testid="mm-visual-alert-header-icon"
              >
                <AlertTriangle size={18} />
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="mm-stat-panel-title" style={{ margin: 0 }}>
                    Budget Alert Monitor ({selectedMonth})
                  </h2>
                  {exceededCategories.length > 0 && (
                    <span
                      className="mm-budget-alert-count-pill is-danger"
                      data-testid="mm-visual-alert-over-pill"
                    >
                      <AlertTriangle size={12} />
                      <span>
                        {exceededCategories.length}{' '}
                        {exceededCategories.length === 1
                          ? 'Category Over Budget'
                          : 'Categories Over Budget'}
                      </span>
                    </span>
                  )}
                  {nearLimitCategories.length > 0 && (
                    <span
                      className="mm-budget-status-pill is-near"
                      data-testid="mm-visual-alert-near-pill"
                    >
                      <span>{nearLimitCategories.length} Near Limit (≥85%)</span>
                    </span>
                  )}
                </div>
                <p className="mm-section-desc" style={{ margin: '3px 0 0' }}>
                  {exceededCategories.length > 0 ? (
                    <>
                      Monthly spending has exceeded planned thresholds by{' '}
                      <strong style={{ color: '#ef4444' }} data-testid="mm-visual-alert-total-overage">
                        +{formatINR(totalOverBudgetAmount)}
                      </strong>
                      . Adjust limits below or click a quick-resolve action.
                    </>
                  ) : (
                    <>
                      All categories are within limits, but {nearLimitCategories.length}{' '}
                      {nearLimitCategories.length === 1 ? 'category is' : 'categories are'}{' '}
                      approaching 85%+ utilization.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {exceededCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSubView('budgets');
                    setBudgetFilterStatus('over');
                  }}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                  data-testid="mm-visual-alert-isolate-over-btn"
                >
                  <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                  <span>Filter Over-Budget ({exceededCategories.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAutoAllocateWithBuffer}
                className="mm-btn mm-btn-sm mm-btn-primary"
                title="Automatically raise exceeded limits to cover current spend + 10% buffer"
                data-testid="mm-visual-alert-autofit-btn"
              >
                <TrendingUp size={13} />
                <span>Resolve All (+10% Buffer)</span>
              </button>
            </div>
          </div>

          {/* Over-Budget Category Warning Cards */}
          {exceededCategories.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
                gap: 10,
                marginBottom: nearLimitCategories.length > 0 ? 10 : 0,
              }}
              data-testid="mm-visual-alert-cards-grid"
            >
              {exceededCategories.map((item) => {
                const limit = item.monthlyBudget || 0;
                const overage = item.overBudgetAmount || Math.max(0, item.amount - limit);
                const utilPct =
                  item.budgetUtilizationPercent ??
                  (limit > 0 ? Number(((item.amount / limit) * 100).toFixed(1)) : 100);
                const roundedMatch = Math.ceil(item.amount / 500) * 500;

                return (
                  <div
                    key={item.category}
                    role="alert"
                    data-testid={`mm-visual-alert-card-${item.category}`}
                    data-over-budget="true"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      background: 'rgba(239, 68, 68, 0.06)',
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
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          className="mm-color-swatch"
                          style={{ backgroundColor: item.color, width: 11, height: 11 }}
                        />
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                          {item.category}
                        </strong>
                      </div>

                      <span
                        className="mm-budget-alert-badge is-over"
                        data-testid={`mm-visual-warning-indicator-${item.category}`}
                      >
                        <AlertTriangle size={12} />
                        <span>OVER BY {formatINR(overage)}</span>
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span>
                        Spent: <strong className="mm-text-expense">{formatINR(item.amount)}</strong>{' '}
                        of <strong>{formatINR(limit)}</strong> budget
                      </span>
                      <strong style={{ color: '#ef4444' }}>{utilPct}% used</strong>
                    </div>

                    <div className="mm-budget-progress-track" style={{ height: 7 }}>
                      <div
                        className="mm-budget-progress-fill"
                        style={{
                          width: '100%',
                          backgroundColor: '#ef4444',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Quick threshold adjustment:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() =>
                            handleStepCategoryBudget(item.category, limit, 1000)
                          }
                          className="mm-btn mm-btn-sm mm-btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          data-testid={`mm-alert-bump-limit-${item.category}`}
                        >
                          +₹1,000 Limit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(item.category, String(roundedMatch))
                          }
                          className="mm-btn mm-btn-sm mm-btn-primary"
                          style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          data-testid={`mm-alert-resolve-match-${item.category}`}
                        >
                          Match Spend ({formatINR(roundedMatch)})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Near-Limit Category Warning Strip */}
          {nearLimitCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                paddingTop: exceededCategories.length > 0 ? 6 : 0,
              }}
              data-testid="mm-visual-near-limit-list"
            >
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AlertTriangle size={13} />
                Approaching Budget Limit (≥85%):
              </span>
              {nearLimitCategories.map((item) => (
                <span
                  key={item.category}
                  className="mm-budget-status-pill is-near"
                  data-testid={`mm-visual-near-chip-${item.category}`}
                >
                  <strong>{item.category}:</strong> {formatINR(item.amount)} /{' '}
                  {formatINR(item.monthlyBudget || 0)} ({item.budgetUtilizationPercent}%)
                </span>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Monthly Budget Planning Tab Section */}
      {showBudgetPlanningSection && (
        <article
          className="mm-stat-panel"
          data-testid="mm-monthly-budget-planner"
          style={{ marginBottom: '8px' }}
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <Target
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Monthly Budget Planning &amp; Real-Time Progress ({selectedMonth})
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Set specific monetary limits (₹) for each spending category and visualize real-time utilization against your monthly plan
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                role="group"
                aria-label="Filter Budget Categories by Status"
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('all')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-all"
                >
                  All ({monthlyBudgetPlan.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('over')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'over' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-over"
                >
                  Over Budget ({monthlyBudgetPlan.overBudgetCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('projected-over')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'projected-over' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-projected-over"
                >
                  Projected Over ({monthlyBudgetPlan.projectedOverBudgetCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('near')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'near' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-near"
                >
                  Near Limit ({monthlyBudgetPlan.nearLimitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('warning-90')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'warning-90' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-90"
                >
                  <AlertTriangle
                    size={12}
                    style={{
                      color: monthlyBudgetPlan.warning90Count > 0 ? '#f59e0b' : undefined,
                    }}
                  />
                  <span>≥90% Limit ({monthlyBudgetPlan.warning90Count})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetFilterStatus('on-track')}
                  className={`mm-btn mm-btn-sm ${
                    budgetFilterStatus === 'on-track' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-budget-filter-ontrack"
                >
                  On Track ({monthlyBudgetPlan.onTrackCount})
                </button>
                {monthlyBudgetPlan.unbudgetedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setBudgetFilterStatus('unbudgeted')}
                    className={`mm-btn mm-btn-sm ${
                      budgetFilterStatus === 'unbudgeted' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-budget-filter-unbudgeted"
                  >
                    Unbudgeted ({monthlyBudgetPlan.unbudgetedCount})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleAutoAllocate503020}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Allocate 50% Fixed Needs / 30% Variable Wants / 20% Savings based on monthly income"
                data-testid="mm-budget-auto-503020-btn"
              >
                <PiggyBank size={13} />
                <span>50/30/20 Smart Plan</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAllocateWithBuffer}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Auto-adjust limits to cover current monthly spend plus a 10% buffer"
                data-testid="mm-budget-auto-buffer-btn"
              >
                <TrendingUp size={13} />
                <span>Auto-Fit +10% Buffer</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportMonthlyBudgetCsv(false)}
                className="mm-btn mm-btn-sm mm-btn-primary"
                title="Export monthly budget limits and real-time spending progress as a CSV file"
                data-testid="mm-budget-export-csv-btn"
              >
                <Download size={13} />
                <span>Export Budget CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                title="Export formatted monthly spending report as an A4 PDF summary"
                data-testid="mm-budget-export-pdf-btn"
              >
                <FileText size={13} style={{ color: 'var(--accent)' }} />
                <span>Export PDF Summary</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaultThresholds}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                title="Reset all category limits to recommended defaults"
                data-testid="mm-budget-planner-reset-btn"
              >
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {pdfExportNotice && (
            <div
              role="status"
              data-testid="mm-spending-pdf-export-feedback"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                padding: '10px 14px',
                marginBottom: 12,
                borderRadius: 10,
                border: '1px solid rgba(59, 130, 246, 0.4)',
                background: 'rgba(59, 130, 246, 0.08)',
                fontSize: '0.83rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CheckCircle2 size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span>
                  Generated PDF Summary: <strong style={{ color: 'var(--text-main)' }}>{pdfExportNotice}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPdfExportNotice(null)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                data-testid="mm-pdf-export-feedback-dismiss"
              >
                Dismiss
              </button>
            </div>
          )}

          {budgetCsvExportNotice && (
            <div
              role="status"
              data-testid="mm-budget-csv-export-feedback"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                padding: '10px 14px',
                marginBottom: 12,
                borderRadius: 10,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.08)',
                fontSize: '0.83rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>
                  Exported <strong>{budgetCsvExportNotice.categoryCount} categories</strong> (
                  {formatINR(budgetCsvExportNotice.totalSpent)} spent of{' '}
                  {formatINR(budgetCsvExportNotice.totalBudgeted)} planned ·{' '}
                  {budgetCsvExportNotice.overallUtilizationPercent}% utilized) to{' '}
                  <code style={{ fontWeight: 600 }}>{budgetCsvExportNotice.fileName}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBudgetCsvExportNotice(null)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                data-testid="mm-budget-csv-export-dismiss"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top-level Monthly Budget Summary KPI Strip */}
          <div
            className="mm-budget-planner-summary"
            data-testid="mm-budget-summary-strip"
          >
            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Total Monthly Budget Planned</span>
              <strong
                className="mm-budget-kpi-value"
                data-testid="mm-budget-total-planned"
              >
                {formatINR(monthlyBudgetPlan.totalBudgeted)}
              </strong>
              <span className="mm-budget-kpi-sub">
                Across {monthlyBudgetPlan.items.length - monthlyBudgetPlan.unbudgetedCount} budgeted expense categories
              </span>
            </div>

            <div
              className={`mm-budget-kpi-card ${
                monthlyBudgetPlan.has90PercentWarning &&
                !(
                  monthlyBudgetPlan.totalSpent > monthlyBudgetPlan.totalBudgeted &&
                  monthlyBudgetPlan.totalBudgeted > 0
                )
                  ? 'is-warning-90'
                  : ''
              }`}
              data-testid="mm-budget-kpi-spent-card"
            >
              <span className="mm-budget-kpi-label">Actual Spent vs Budget</span>
              <strong
                className="mm-budget-kpi-value"
                style={{
                  color:
                    monthlyBudgetPlan.totalSpent > monthlyBudgetPlan.totalBudgeted &&
                    monthlyBudgetPlan.totalBudgeted > 0
                      ? '#ef4444'
                      : monthlyBudgetPlan.has90PercentWarning
                      ? '#f59e0b'
                      : 'var(--text-heading)',
                }}
                data-testid="mm-budget-total-spent"
              >
                {formatINR(monthlyBudgetPlan.totalSpent)}{' '}
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  ({monthlyBudgetPlan.overallUtilizationPercent}%)
                </span>
              </strong>
              <span className="mm-budget-kpi-sub">
                {monthlyBudgetPlan.overBudgetCount > 0
                  ? `${monthlyBudgetPlan.overBudgetCount} category limit(s) exceeded`
                  : monthlyBudgetPlan.warning90Count > 0
                  ? `${monthlyBudgetPlan.warning90Count} category limit(s) ≥90% utilized`
                  : 'All categories within planned limits'}
              </span>
              {monthlyBudgetPlan.has90PercentWarning && (
                <div
                  className="mm-budget-kpi-warning-notice"
                  data-testid="mm-budget-kpi-90-warning"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.73rem',
                    color: '#f59e0b',
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>{monthlyBudgetPlan.warning90Count} category limit(s) ≥90%</span>
                </div>
              )}
            </div>

            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Remaining Budget Headroom</span>
              <strong
                className="mm-budget-kpi-value"
                style={{ color: '#10b981' }}
                data-testid="mm-budget-total-remaining"
              >
                {formatINR(monthlyBudgetPlan.totalRemaining)}
              </strong>
              <span className="mm-budget-kpi-sub">
                {monthlyBudgetPlan.totalOverage > 0
                  ? `+${formatINR(monthlyBudgetPlan.totalOverage)} total overage in exceeded categories`
                  : 'Available unspent allocation'}
              </span>
            </div>

            <div className="mm-budget-kpi-card">
              <span className="mm-budget-kpi-label">Unallocated Monthly Income</span>
              <strong
                className="mm-budget-kpi-value"
                style={{ color: 'var(--accent)' }}
                data-testid="mm-budget-unallocated-income"
              >
                {formatINR(unallocatedIncome)}
              </strong>
              <span className="mm-budget-kpi-sub">
                From {formatINR(metrics.income)} total inflow in {selectedMonth}
              </span>
            </div>
          </div>

          {/* Dashboard Summary Cards Control Bar & Dynamic Reorderable Cards Container */}
          <div
            className="mm-dashboard-reorder-bar"
            data-testid="mm-dashboard-reorder-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              padding: '10px 14px',
              marginTop: 12,
              marginBottom: 14,
              borderRadius: 10,
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsCustomizingDashboard((prev) => !prev)}
                className={`mm-btn mm-btn-sm ${
                  isCustomizingDashboard ? 'mm-btn-primary' : 'mm-btn-secondary'
                }`}
                data-testid="mm-dashboard-customize-toggle"
              >
                <LayoutGrid size={14} />
                <span>{isCustomizingDashboard ? 'Done Customizing' : 'Customize Summary Layout'}</span>
              </button>
              <span
                className="mm-dashboard-order-status"
                data-testid="mm-dashboard-order-status"
                style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}
              >
                {summaryCardOrder.map((id) => SUMMARY_CARD_LABELS[id]).join(' → ')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetCardOrder}
              className="mm-btn mm-btn-sm mm-btn-ghost"
              data-testid="mm-dashboard-card-order-reset"
            >
              <RotateCcw size={13} />
              <span>Reset Layout</span>
            </button>
          </div>

          <div
            className="mm-dashboard-cards-container"
            style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}
          >
            {summaryCardOrder.map((cardId, index) => {
              let isVisible = true;
              if (subView === 'budgets') {
                isVisible = cardId !== 'savings-goals';
              }

              if (!isVisible) return null;

              return (
                <div
                  key={cardId}
                  data-testid={`mm-dashboard-card-${cardId}`}
                  className={`mm-dashboard-card-wrapper ${
                    draggedCardIndex === index ? 'is-dragging' : ''
                  } ${dragOverCardIndex === index ? 'is-drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, index)}
                  onDragOver={(e) => handleCardDragOver(e, index)}
                  onDrop={(e) => handleCardDrop(e, index)}
                  onDragEnd={handleCardDragEnd}
                >
                  <div className="mm-dashboard-card-handle-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="mm-dashboard-drag-grip"
                        data-testid={`mm-dashboard-drag-handle-${cardId}`}
                        title="Drag handle to reorder summary card"
                      >
                        <GripVertical size={16} />
                      </button>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {SUMMARY_CARD_LABELS[cardId]}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => moveSummaryCard(cardId, 'up')}
                        disabled={index === 0}
                        className="mm-btn mm-btn-sm mm-btn-ghost"
                        style={{ padding: '2px 6px' }}
                        data-testid={`mm-dashboard-move-up-${cardId}`}
                        title="Move Card Up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSummaryCard(cardId, 'down')}
                        disabled={index === summaryCardOrder.length - 1}
                        className="mm-btn mm-btn-sm mm-btn-ghost"
                        style={{ padding: '2px 6px' }}
                        data-testid={`mm-dashboard-move-down-${cardId}`}
                        title="Move Card Down"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>

                  {cardId === 'burn-rate' &&
                    (() => {
                      const burnRatePercent = monthlyBudgetPlan.overallUtilizationPercent;
                      const isOverBudget =
                        monthlyBudgetPlan.totalSpent > monthlyBudgetPlan.totalBudgeted &&
                        monthlyBudgetPlan.totalBudgeted > 0;
                      const has90Warning = monthlyBudgetPlan.has90PercentWarning;
                      const isNearLimit = !isOverBudget && !has90Warning && burnRatePercent >= 85;
                      const daysInMonth = monthlyBudgetPlan.daysInMonth || 30;
                      const daysElapsed = monthlyBudgetPlan.daysElapsed || 1;
                      const monthPacePercent = Number(
                        ((daysElapsed / daysInMonth) * 100).toFixed(1)
                      );
                      const dailyBurnRate =
                        daysElapsed > 0
                          ? Math.round(monthlyBudgetPlan.totalSpent / daysElapsed)
                          : 0;

                      return (
                        <div
                          className={`mm-burn-rate-card ${
                            isOverBudget
                              ? 'is-over'
                              : has90Warning
                              ? 'is-warning-90'
                              : isNearLimit
                              ? 'is-near'
                              : 'is-on-track'
                          }`}
                          data-testid="mm-total-monthly-burn-rate-card"
                        >
                          <div className="mm-burn-rate-header">
                            <div className="mm-burn-rate-title-cluster">
                              <div
                                className={`mm-burn-rate-icon-badge ${
                                  isOverBudget
                                    ? 'is-over'
                                    : has90Warning
                                    ? 'is-warning-90'
                                    : isNearLimit
                                    ? 'is-near'
                                    : 'is-on-track'
                                }`}
                                data-testid="mm-burn-rate-icon"
                              >
                                <Target size={18} />
                              </div>
                              <div>
                                <h3
                                  className="mm-burn-rate-title"
                                  data-testid="mm-burn-rate-title"
                                >
                                  Total Monthly Burn Rate
                                </h3>
                                <p className="mm-burn-rate-subtitle">
                                  Calculated as current spending (
                                  {formatINR(monthlyBudgetPlan.totalSpent)}) against the sum of all
                                  set monthly budgets ({formatINR(monthlyBudgetPlan.totalBudgeted)})
                                </p>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              {has90Warning && (
                                <span
                                  className="mm-budget-status-pill is-warning-90"
                                  data-testid="mm-burn-rate-90-warning-badge"
                                  style={{
                                    fontSize: '0.8rem',
                                    padding: '4px 10px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <AlertTriangle size={13} />
                                  <span>
                                    {monthlyBudgetPlan.warning90Count} Category{' '}
                                    {monthlyBudgetPlan.warning90Count === 1
                                      ? 'Exceeds'
                                      : 'Exceed'}{' '}
                                    90% Limit
                                  </span>
                                </span>
                              )}
                              <span
                                className={`mm-budget-status-pill is-${
                                  isOverBudget ? 'over' : isNearLimit ? 'near' : 'on-track'
                                }`}
                                data-testid="mm-burn-rate-status-pill"
                                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                              >
                                <strong data-testid="mm-burn-rate-percent">
                                  {burnRatePercent}%
                                </strong>{' '}
                                Burn Rate
                              </span>
                            </div>
                          </div>

                          {/* 90% Limit Warning Callout Banner */}
                          {has90Warning && (
                            <div
                              className="mm-burn-rate-warning-callout"
                              data-testid="mm-budget-summary-90-warning"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.45)',
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
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: '0.83rem',
                                    fontWeight: 700,
                                    color: '#f59e0b',
                                  }}
                                >
                                  <AlertTriangle size={15} />
                                  <span>
                                    Warning: {monthlyBudgetPlan.warning90Count}{' '}
                                    {monthlyBudgetPlan.warning90Count === 1
                                      ? 'category exceeds'
                                      : 'categories exceed'}{' '}
                                    90% of defined monthly limit
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBudgetFilterStatus('warning-90')}
                                  className="mm-btn mm-btn-sm mm-btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                                  data-testid="mm-budget-summary-filter-90-btn"
                                >
                                  View ≥90% Categories ({monthlyBudgetPlan.warning90Count})
                                </button>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexWrap: 'wrap',
                                }}
                                data-testid="mm-budget-summary-90-chips"
                              >
                                {monthlyBudgetPlan.warning90Categories.map((c) => (
                                  <span
                                    key={c.category}
                                    className="mm-budget-status-pill is-warning-90"
                                    data-testid={`mm-budget-summary-90-chip-${c.category}`}
                                    style={{ fontSize: '0.74rem' }}
                                  >
                                    <strong>{c.category}:</strong> {formatINR(c.spent)} /{' '}
                                    {formatINR(c.monthlyLimit)} ({c.utilizationPercent}%)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Primary Progress Bar Section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                flexWrap: 'wrap',
                                gap: 6,
                              }}
                            >
                              <span>
                                Spent{' '}
                                <strong
                                  style={{ color: 'var(--text-heading)' }}
                                  data-testid="mm-burn-rate-spent"
                                >
                                  {formatINR(monthlyBudgetPlan.totalSpent)}
                                </strong>{' '}
                                of{' '}
                                <strong
                                  style={{ color: 'var(--text-heading)' }}
                                  data-testid="mm-burn-rate-budget"
                                >
                                  {formatINR(monthlyBudgetPlan.totalBudgeted)}
                                </strong>{' '}
                                total set budget
                              </span>

                              <span
                                style={{ fontSize: '0.74rem', color: 'var(--muted)' }}
                                data-testid="mm-burn-rate-calendar-pace"
                              >
                                Day {daysElapsed} of {daysInMonth} ({monthPacePercent}% of month
                                elapsed)
                              </span>
                            </div>

                            {/* Progress Bar Track */}
                            <div
                              className="mm-burn-rate-track"
                              data-testid="mm-burn-rate-progress-bar"
                              title={`Burn Rate: ${burnRatePercent}% (${formatINR(
                                monthlyBudgetPlan.totalSpent
                              )} / ${formatINR(monthlyBudgetPlan.totalBudgeted)})`}
                            >
                              <div
                                className="mm-burn-rate-fill"
                                data-testid="mm-burn-rate-progress-fill"
                                style={{
                                  width: `${Math.min(100, burnRatePercent)}%`,
                                  backgroundColor: isOverBudget
                                    ? '#ef4444'
                                    : isNearLimit
                                    ? '#f59e0b'
                                    : '#10b981',
                                }}
                              />
                            </div>
                          </div>

                          {/* Supporting Financial Burn Breakdown Grid */}
                          <div className="mm-burn-rate-stats-grid">
                            <div className="mm-burn-rate-stat-box">
                              <span className="mm-burn-rate-stat-label">Current Spending</span>
                              <strong
                                className="mm-burn-rate-stat-val"
                                style={{
                                  color: isOverBudget ? '#ef4444' : 'var(--text-heading)',
                                }}
                              >
                                {formatINR(monthlyBudgetPlan.totalSpent)}
                              </strong>
                            </div>

                            <div className="mm-burn-rate-stat-box">
                              <span className="mm-burn-rate-stat-label">Sum of Set Budgets</span>
                              <strong className="mm-burn-rate-stat-val">
                                {formatINR(monthlyBudgetPlan.totalBudgeted)}
                              </strong>
                            </div>

                            <div className="mm-burn-rate-stat-box">
                              <span className="mm-burn-rate-stat-label">Daily Burn Velocity</span>
                              <strong
                                className="mm-burn-rate-stat-val"
                                data-testid="mm-burn-rate-daily-velocity"
                              >
                                {formatINR(dailyBurnRate)} / day
                              </strong>
                            </div>

                            <div className="mm-burn-rate-stat-box">
                              <span className="mm-burn-rate-stat-label">
                                {isOverBudget
                                  ? 'Total Budget Overage'
                                  : 'Remaining Budget Headroom'}
                              </span>
                              <strong
                                className="mm-burn-rate-stat-val"
                                style={{ color: isOverBudget ? '#ef4444' : '#10b981' }}
                                data-testid="mm-burn-rate-headroom"
                              >
                                {isOverBudget
                                  ? `+${formatINR(monthlyBudgetPlan.totalOverage)}`
                                  : formatINR(monthlyBudgetPlan.totalRemaining)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {cardId === 'budget-forecast' && (
                    <BudgetForecastCard
                      transactions={transactions}
                      categories={localCategories}
                      selectedMonth={selectedMonth}
                      metrics={metrics}
                      onAlignCategoryBudget={async (catName, newLimit) => {
                        handleCategoryThresholdChange(catName, String(newLimit));
                      }}
                    />
                  )}

                  {cardId === 'budget-overrun' && (
                    <BudgetOverrunAlertList
                      plan={monthlyBudgetPlan}
                      selectedMonth={selectedMonth}
                      onAdjustCategoryBudget={async (catName, newLimit) => {
                        handleCategoryThresholdChange(catName, String(newLimit));
                      }}
                      onSelectCategoryFilter={(catName) => {
                        setBudgetSearchQuery(catName);
                      }}
                    />
                  )}

                  {cardId === 'savings-goals' && (
                    <MonthlySavingsGoalsSection
                      selectedMonth={selectedMonth}
                      metrics={metrics}
                      transactions={transactions}
                      sinkingFunds={sinkingFunds}
                    />
                  )}

                  {cardId === 'projections' && (
                    <BudgetProjectionSection
                      transactions={transactions}
                      categories={localCategories}
                      selectedMonth={selectedMonth}
                      metrics={metrics}
                      onSaveCategory={handleSaveCategoryState}
                      onAlignCategoryBudget={async (categoryName, newLimit) => {
                        handleCategoryThresholdChange(categoryName, String(newLimit));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Fixed Needs vs. Variable Wants Real-Time Budget Split */}
          <div
            className="mm-stats-two-col"
            style={{ marginBottom: 14, gap: 12 }}
            data-testid="mm-budget-fixed-vs-variable"
          >
            <div className="mm-budget-master-bar-card" style={{ marginBottom: 0 }}>
              <div className="mm-budget-master-header">
                <span>
                  <strong>Fixed Obligations Budget</strong> ({formatINR(monthlyBudgetPlan.fixedSpent)} /{' '}
                  {formatINR(monthlyBudgetPlan.fixedBudgeted)})
                </span>
                <span
                  className={`mm-budget-status-pill is-${
                    monthlyBudgetPlan.fixedUtilizationPercent > 100
                      ? 'over'
                      : monthlyBudgetPlan.fixedUtilizationPercent >= 85
                      ? 'near'
                      : 'on-track'
                  }`}
                  data-testid="mm-budget-fixed-utilization"
                >
                  {monthlyBudgetPlan.fixedUtilizationPercent}%
                </span>
              </div>
              <div className="mm-budget-progress-track">
                <div
                  className="mm-budget-progress-fill"
                  style={{
                    width: `${Math.min(100, monthlyBudgetPlan.fixedUtilizationPercent)}%`,
                    backgroundColor:
                      monthlyBudgetPlan.fixedUtilizationPercent > 100
                        ? '#ef4444'
                        : '#6366f1',
                  }}
                />
              </div>
            </div>

            <div className="mm-budget-master-bar-card" style={{ marginBottom: 0 }}>
              <div className="mm-budget-master-header">
                <span>
                  <strong>Variable Discretionary Budget</strong> ({formatINR(monthlyBudgetPlan.variableSpent)} /{' '}
                  {formatINR(monthlyBudgetPlan.variableBudgeted)})
                </span>
                <span
                  className={`mm-budget-status-pill is-${
                    monthlyBudgetPlan.variableUtilizationPercent > 100
                      ? 'over'
                      : monthlyBudgetPlan.variableUtilizationPercent >= 85
                      ? 'near'
                      : 'on-track'
                  }`}
                  data-testid="mm-budget-variable-utilization"
                >
                  {monthlyBudgetPlan.variableUtilizationPercent}%
                </span>
              </div>
              <div className="mm-budget-progress-track">
                <div
                  className="mm-budget-progress-fill"
                  style={{
                    width: `${Math.min(100, monthlyBudgetPlan.variableUtilizationPercent)}%`,
                    backgroundColor:
                      monthlyBudgetPlan.variableUtilizationPercent > 100
                        ? '#ef4444'
                        : '#06b6d4',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Month-End Projected Spending Forecast Panel */}
          <div
            className="mm-budget-master-bar-card"
            style={{
              marginBottom: 14,
              border:
                monthlyBudgetPlan.projectedOverBudgetCount > 0
                  ? '1px solid rgba(245, 158, 11, 0.45)'
                  : '1px solid rgba(16, 185, 129, 0.35)',
              background:
                monthlyBudgetPlan.projectedOverBudgetCount > 0
                  ? 'rgba(245, 158, 11, 0.05)'
                  : 'rgba(16, 185, 129, 0.05)',
            }}
            data-testid="mm-budget-forecast-panel"
          >
            <div
              className="mm-budget-master-header"
              style={{ flexWrap: 'wrap', gap: 10, marginBottom: 10 }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TrendingUp
                    size={16}
                    style={{
                      color:
                        monthlyBudgetPlan.projectedOverBudgetCount > 0 ? '#f59e0b' : '#10b981',
                    }}
                  />
                  <strong>Projected Month-End Spending Forecast ({selectedMonth})</strong>
                  <span
                    className={`mm-budget-status-pill is-${
                      monthlyBudgetPlan.projectedOverallUtilizationPercent > 100
                        ? 'over'
                        : monthlyBudgetPlan.projectedOverallUtilizationPercent >= 85
                        ? 'near'
                        : 'on-track'
                    }`}
                    data-testid="mm-budget-forecast-overall-badge"
                  >
                    {monthlyBudgetPlan.projectedOverallUtilizationPercent > 100
                      ? `Projected ${monthlyBudgetPlan.projectedOverallUtilizationPercent}% (Over Plan)`
                      : monthlyBudgetPlan.projectedOverallUtilizationPercent >= 85
                      ? `Projected ${monthlyBudgetPlan.projectedOverallUtilizationPercent}% (Near Limit)`
                      : `On Track (${monthlyBudgetPlan.projectedOverallUtilizationPercent}% Projected)`}
                  </span>
                </div>
                <p
                  className="mm-section-desc"
                  style={{ margin: '4px 0 0', fontSize: '0.79rem' }}
                >
                  Blends current-month daily burn rate (Day {monthlyBudgetPlan.daysElapsed} of{' '}
                  {monthlyBudgetPlan.daysInMonth} · {monthlyBudgetPlan.daysRemaining} days left) with
                  historical multi-month category averages
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}
                >
                  <label htmlFor="mm-budget-forecast-day-slider" style={{ fontWeight: 600 }}>
                    Pace Day ({monthlyBudgetPlan.daysElapsed}/{monthlyBudgetPlan.daysInMonth}):
                  </label>
                  <input
                    id="mm-budget-forecast-day-slider"
                    type="range"
                    min={1}
                    max={monthlyBudgetPlan.daysInMonth}
                    value={monthlyBudgetPlan.daysElapsed}
                    onChange={(e) => setForecastDayOverride(Number(e.target.value))}
                    style={{ width: 95, cursor: 'pointer', accentColor: 'var(--accent)' }}
                    aria-label="Simulate elapsed day of month for spending projection"
                    data-testid="mm-budget-forecast-day-slider"
                  />
                  {forecastDayOverride !== null && (
                    <button
                      type="button"
                      onClick={() => setForecastDayOverride(null)}
                      className="mm-btn mm-btn-sm mm-btn-ghost"
                      style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      data-testid="mm-budget-forecast-day-reset"
                    >
                      Auto
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAlignBudgetsToProjected}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                  title="Adjust category limits to cover projected month-end spend"
                  data-testid="mm-budget-align-projected-btn"
                >
                  <TrendingUp size={13} />
                  <span>Align Limits to Projected</span>
                </button>
              </div>
            </div>

            <div
              className="mm-budget-planner-summary"
              style={{ marginBottom: 10 }}
              data-testid="mm-budget-forecast-kpi-grid"
            >
              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">Projected Month-End Spend</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{
                    color:
                      monthlyBudgetPlan.totalProjectedSpend > monthlyBudgetPlan.totalBudgeted &&
                      monthlyBudgetPlan.totalBudgeted > 0
                        ? '#ef4444'
                        : '#f59e0b',
                  }}
                  data-testid="mm-budget-total-projected"
                >
                  {formatINR(monthlyBudgetPlan.totalProjectedSpend)}
                </strong>
                <span className="mm-budget-kpi-sub">
                  vs {formatINR(monthlyBudgetPlan.totalBudgeted)} total planned budget
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">Projected Month-End Headroom</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{
                    color:
                      monthlyBudgetPlan.totalProjectedOverage > 0 ? '#ef4444' : '#10b981',
                  }}
                  data-testid="mm-budget-projected-headroom"
                >
                  {formatINR(monthlyBudgetPlan.totalProjectedRemaining)}
                </strong>
                <span className="mm-budget-kpi-sub">
                  {monthlyBudgetPlan.totalProjectedOverage > 0
                    ? `+${formatINR(monthlyBudgetPlan.totalProjectedOverage)} projected category overages`
                    : 'Projected to finish within overall budget'}
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">Categories On Track at Month-End</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{ color: '#10b981' }}
                  data-testid="mm-budget-projected-ontrack-count"
                >
                  {monthlyBudgetPlan.projectedOnTrackCount} Categories
                </strong>
                <span
                  className="mm-budget-kpi-sub"
                  data-testid="mm-budget-projected-risk-count"
                >
                  {monthlyBudgetPlan.projectedAtRiskCount} at risk (85–100% projected)
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">Projected Over Limit by Month-End</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{
                    color:
                      monthlyBudgetPlan.projectedOverBudgetCount > 0
                        ? '#ef4444'
                        : '#10b981',
                  }}
                  data-testid="mm-budget-projected-over-count"
                >
                  {monthlyBudgetPlan.projectedOverBudgetCount}{' '}
                  {monthlyBudgetPlan.projectedOverBudgetCount === 1 ? 'Category' : 'Categories'}
                </strong>
                <span className="mm-budget-kpi-sub">
                  {monthlyBudgetPlan.projectedOverBudgetCount > 0
                    ? 'Click "Projected Over" filter above to inspect'
                    : 'Zero categories projected to breach limits'}
                </span>
              </div>
            </div>

            <div className="mm-budget-progress-track is-master">
              <div
                className="mm-budget-progress-fill"
                style={{
                  width: `${Math.min(100, monthlyBudgetPlan.projectedOverallUtilizationPercent)}%`,
                  backgroundColor:
                    monthlyBudgetPlan.projectedOverallUtilizationPercent > 100
                      ? '#ef4444'
                      : monthlyBudgetPlan.projectedOverallUtilizationPercent >= 85
                      ? '#f59e0b'
                      : '#10b981',
                }}
                data-testid="mm-budget-forecast-master-fill"
              />
            </div>
          </div>

          {/* Real-Time Planned Budget vs. Actual Spend Comparison Bar Chart */}
          <div
            className="mm-budget-master-bar-card"
            style={{ marginBottom: 14 }}
            data-testid="mm-budget-vs-actual-panel"
          >
            <div
              className="mm-budget-master-header"
              style={{ marginBottom: showBudgetComparisonChart ? 10 : 0 }}
            >
              <div>
                <strong>Planned Budget vs. Real-Time Spend by Category</strong>
                <span className="mm-stat-panel-sub" style={{ marginLeft: 8 }}>
                  Updates live as you adjust category monetary limits below
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetComparisonChart((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                data-testid="mm-toggle-budget-chart-btn"
              >
                {showBudgetComparisonChart ? 'Hide Chart' : 'Show Chart'}
              </button>
            </div>

            {showBudgetComparisonChart && (
              <div
                style={{ width: '100%', height: 240 }}
                data-testid="mm-budget-vs-actual-chart"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyBudgetPlan.items}
                    margin={{ top: 8, right: 16, left: 4, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                    <XAxis
                      dataKey="category"
                      stroke="var(--muted)"
                      fontSize={11}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={11}
                      tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="monthlyLimit"
                      name="Planned Limit (₹)"
                      fill="rgba(148, 163, 184, 0.45)"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      name="Actual Spent (₹)"
                      radius={[5, 5, 0, 0]}
                    >
                      {monthlyBudgetPlan.items.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={
                            entry.status === 'over'
                              ? '#ef4444'
                              : entry.status === 'near'
                              ? '#f59e0b'
                              : entry.color
                          }
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="projectedSpend"
                      name="Projected Month-End (₹)"
                      fill="rgba(245, 158, 11, 0.7)"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Search & Sort Controls for Per-Category Budget Cards */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
            data-testid="mm-budget-search-sort-bar"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
              <input
                type="search"
                value={budgetSearchQuery}
                onChange={(e) => setBudgetSearchQuery(e.target.value)}
                placeholder="Filter budget categories by name or Fixed/Variable..."
                className="mm-input"
                style={{ maxWidth: 340, padding: '6px 12px', fontSize: '0.84rem' }}
                aria-label="Search budget categories"
                data-testid="mm-budget-search-input"
              />
              {budgetSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBudgetSearchQuery('')}
                  className="mm-btn mm-btn-sm mm-btn-ghost"
                  data-testid="mm-budget-search-clear"
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label
                htmlFor="mm-budget-sort-select"
                style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}
              >
                Sort categories:
              </label>
              <select
                id="mm-budget-sort-select"
                value={budgetSortBy}
                onChange={(e) => setBudgetSortBy(e.target.value as BudgetSortOption)}
                className="mm-input"
                style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem' }}
                data-testid="mm-budget-sort-select"
              >
                <option value="utilization-desc">Highest Utilization %</option>
                <option value="projected-desc">Highest Projected Month-End Spend (₹)</option>
                <option value="spent-desc">Highest Actual Spend (₹)</option>
                <option value="limit-desc">Highest Budget Limit (₹)</option>
                <option value="name-asc">Category Name (A–Z)</option>
              </select>

              {(budgetFilterStatus !== 'all' || Boolean(budgetSearchQuery.trim())) && (
                <button
                  type="button"
                  onClick={() => handleExportMonthlyBudgetCsv(true)}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                  title="Export only the currently filtered budget categories to CSV"
                  data-testid="mm-budget-export-filtered-csv-btn"
                >
                  <Download size={13} />
                  <span>Export Filtered ({filteredBudgetPlanItems.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Per-Category Budget Planning Cards & Real-Time Progress Bars */}
          <div className="mm-budget-plan-grid" data-testid="mm-budget-plan-grid">
            {filteredBudgetPlanItems.map((item) => {
              const fillPct = Math.min(100, Math.round(item.utilizationPercent));
              const barColor =
                item.status === 'over'
                  ? '#ef4444'
                  : item.status === 'near'
                  ? '#f59e0b'
                  : item.color;
              const sliderMax = Math.max(
                30000,
                Math.ceil((Math.max(item.monthlyLimit, item.spent) * 1.5) / 5000) * 5000
              );

              return (
                <div
                  key={item.category}
                  className={`mm-budget-plan-card ${
                    item.status === 'over'
                      ? 'is-over'
                      : item.isExceeding90Percent
                      ? 'is-warning-90'
                      : item.status === 'near'
                      ? 'is-near'
                      : ''
                  }`}
                  data-testid={`mm-budget-plan-row-${item.category}`}
                  data-over-budget={item.status === 'over' ? 'true' : 'false'}
                >
                  <div className="mm-budget-plan-top">
                    <div className="mm-budget-plan-cat-info">
                      <span
                        className="mm-legend-dot"
                        style={{
                          backgroundColor: item.color,
                          width: 12,
                          height: 12,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {item.status === 'over' && (
                            <AlertTriangle
                              size={14}
                              style={{ color: '#ef4444', flexShrink: 0 }}
                              aria-label={`${item.category} is over budget`}
                              data-testid={`mm-budget-plan-warning-icon-${item.category}`}
                            />
                          )}
                          <strong className="mm-budget-plan-cat-name">{item.category}</strong>
                          <span
                            className={`mm-tx-fv-tag ${
                              item.defaultFixedOrVariable === 'Fixed'
                                ? 'mm-fv-fixed'
                                : 'mm-fv-variable'
                            }`}
                          >
                            {item.defaultFixedOrVariable}
                          </span>
                        </div>
                        <span
                          className="mm-budget-plan-tx-meta"
                          data-testid={`mm-budget-plan-share-${item.category}`}
                        >
                          {item.txCount} {item.txCount === 1 ? 'transaction' : 'transactions'} ·{' '}
                          {item.shareOfTotalBudgetPercent}% of total budget
                          {item.remaining > 0
                            ? ` · ${formatINR(item.dailySafeSpend)}/day safe`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {item.isExceeding90Percent && (
                        <span
                          className="mm-budget-status-pill is-warning-90"
                          data-testid={`mm-budget-card-90-warning-${item.category}`}
                          title={`${item.category} has utilized ${item.utilizationPercent}% of its limit (≥90%)`}
                        >
                          <AlertTriangle size={11} /> ≥90% Limit ({item.utilizationPercent}%)
                        </span>
                      )}
                      <span
                        className={`mm-budget-status-pill is-${item.status}`}
                        data-testid={`mm-budget-plan-status-${item.category}`}
                      >
                        {item.status === 'over' ? (
                          <>
                            <AlertTriangle size={11} /> Over by {formatINR(item.overage)}
                          </>
                        ) : item.status === 'near' ? (
                          <>Near Limit ({item.utilizationPercent}%)</>
                        ) : item.status === 'on-track' ? (
                          <>
                            <CheckCircle2 size={11} /> On Track ({item.utilizationPercent}%)
                          </>
                        ) : (
                          <>Unbudgeted</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Editable Monetary Limit Controls */}
                  <div className="mm-budget-plan-limit-row">
                    <label
                      htmlFor={`mm-budget-limit-${item.categoryId}`}
                      className="mm-budget-limit-label"
                    >
                      Monthly Limit (₹):
                    </label>
                    <div className="mm-budget-limit-controls">
                      <button
                        type="button"
                        onClick={() =>
                          handleStepCategoryBudget(item.category, item.monthlyLimit, -1000)
                        }
                        className="mm-budget-step-btn"
                        title={`Decrease ${item.category} budget by ₹1,000`}
                        aria-label={`Decrease ${item.category} budget by ₹1,000`}
                        data-testid={`mm-budget-plan-dec-${item.category}`}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        id={`mm-budget-limit-${item.categoryId}`}
                        type="number"
                        min="0"
                        step="500"
                        placeholder="Set limit"
                        value={item.monthlyLimit || ''}
                        onChange={(e) =>
                          handleCategoryThresholdChange(item.category, e.target.value)
                        }
                        className="mm-input mm-budget-limit-input"
                        aria-label={`Monthly budget limit for ${item.category}`}
                        data-testid={`mm-budget-plan-input-${item.category}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleStepCategoryBudget(item.category, item.monthlyLimit, 1000)
                        }
                        className="mm-budget-step-btn"
                        title={`Increase ${item.category} budget by ₹1,000`}
                        aria-label={`Increase ${item.category} budget by ₹1,000`}
                        data-testid={`mm-budget-plan-inc-${item.category}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Range Slider + Quick Limit Presets */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      type="range"
                      min="0"
                      max={sliderMax}
                      step="500"
                      value={item.monthlyLimit}
                      onChange={(e) =>
                        handleCategoryThresholdChange(item.category, e.target.value)
                      }
                      aria-label={`Budget slider for ${item.category}`}
                      style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
                      data-testid={`mm-budget-plan-slider-${item.category}`}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      {[3000, 5000, 10000, 20000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(item.category, String(preset))
                          }
                          className="mm-btn mm-btn-sm mm-btn-ghost"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            border:
                              item.monthlyLimit === preset
                                ? '1px solid var(--accent)'
                                : '1px solid var(--border)',
                          }}
                          data-testid={`mm-budget-preset-${item.category}-${preset}`}
                        >
                          ₹{preset / 1000}k
                        </button>
                      ))}
                      {item.spent > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(
                              item.category,
                              String(Math.ceil(item.spent / 500) * 500)
                            )
                          }
                          className="mm-btn mm-btn-sm mm-btn-ghost"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            border: '1px solid var(--border)',
                          }}
                          title="Match current monthly spend rounded to nearest ₹500"
                          data-testid={`mm-budget-match-spent-${item.category}`}
                        >
                          Match Spent
                        </button>
                      )}
                      {item.projectedSpend > item.monthlyLimit && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCategoryThresholdChange(
                              item.category,
                              String(Math.ceil(item.projectedSpend / 500) * 500)
                            )
                          }
                          className="mm-btn mm-btn-sm mm-btn-ghost"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            border: '1px solid rgba(245, 158, 11, 0.5)',
                            color: '#f59e0b',
                          }}
                          title="Raise limit to cover projected month-end spend"
                          data-testid={`mm-budget-match-projected-${item.category}`}
                        >
                          Match Projected ({formatINR(Math.ceil(item.projectedSpend / 500) * 500)})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real-Time + Projected Month-End Dual Progress Bar */}
                  <div
                    className="mm-budget-progress-track"
                    style={{ position: 'relative', overflow: 'hidden' }}
                    data-testid={`mm-budget-plan-progress-${item.category}`}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${
                          item.monthlyLimit > 0
                            ? Math.min(100, Math.round(item.projectedUtilizationPercent))
                            : 0
                        }%`,
                        backgroundColor:
                          item.forecastStatus === 'projected-over'
                            ? 'rgba(239, 68, 68, 0.28)'
                            : 'rgba(245, 158, 11, 0.28)',
                        transition: 'width 0.25s ease',
                      }}
                      title={`Projected month-end utilization: ${item.projectedUtilizationPercent}%`}
                      data-testid={`mm-budget-plan-projected-fill-${item.category}`}
                    />
                    <div
                      className="mm-budget-progress-fill"
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: `${item.monthlyLimit > 0 ? fillPct : 0}%`,
                        backgroundColor: barColor,
                      }}
                      data-testid={`mm-budget-plan-progress-fill-${item.category}`}
                    />
                  </div>

                  {/* Bottom Spent vs Remaining / Overage Details */}
                  <div className="mm-budget-plan-bottom">
                    <span>
                      Spent: <strong>{formatINR(item.spent)}</strong>
                      {item.monthlyLimit > 0 ? ` / ${formatINR(item.monthlyLimit)}` : ''}
                    </span>
                    <span
                      className={
                        item.status === 'over'
                          ? 'mm-budget-variance-over'
                          : 'mm-budget-variance-ok'
                      }
                      data-testid={`mm-budget-plan-variance-${item.category}`}
                    >
                      {item.status === 'over'
                        ? `+${formatINR(item.overage)} over limit`
                        : item.monthlyLimit > 0
                        ? `${formatINR(item.remaining)} remaining`
                        : 'Set a limit above'}
                    </span>
                  </div>

                  {/* Month-End Projected Spending Forecast Row */}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 7,
                      borderTop: '1px dashed var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      flexWrap: 'wrap',
                      fontSize: '0.76rem',
                    }}
                    data-testid={`mm-budget-plan-forecast-${item.category}`}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>
                        Projected Month-End:{' '}
                        <strong
                          style={{
                            color:
                              item.forecastStatus === 'projected-over'
                                ? '#ef4444'
                                : item.forecastStatus === 'at-risk'
                                ? '#f59e0b'
                                : 'var(--text-heading)',
                          }}
                          data-testid={`mm-budget-plan-projected-amount-${item.category}`}
                        >
                          {formatINR(item.projectedSpend)}
                        </strong>
                        {item.monthlyLimit > 0
                          ? ` (${item.projectedUtilizationPercent}%)`
                          : ''}
                      </span>
                      <span style={{ color: 'var(--muted)', fontSize: '0.71rem' }}>
                        {item.dailyBurnRate > 0
                          ? `${formatINR(item.dailyBurnRate)}/day pace`
                          : '₹0/day pace'}
                        {item.historicalMonthlyAvg > 0
                          ? ` · Hist. avg: ${formatINR(item.historicalMonthlyAvg)}`
                          : ''}
                      </span>
                    </div>

                    <span
                      className={`mm-budget-status-pill is-${
                        item.forecastStatus === 'projected-over'
                          ? 'over'
                          : item.forecastStatus === 'at-risk'
                          ? 'near'
                          : item.forecastStatus === 'on-track'
                          ? 'on-track'
                          : 'unbudgeted'
                      }`}
                      style={{ fontSize: '0.71rem', padding: '2px 8px' }}
                      data-testid={`mm-budget-plan-forecast-status-${item.category}`}
                    >
                      {item.forecastStatus === 'projected-over'
                        ? `Projected Over by ${formatINR(item.projectedOverage)}`
                        : item.forecastStatus === 'at-risk'
                        ? `At Risk (${item.projectedUtilizationPercent}%)`
                        : item.forecastStatus === 'on-track'
                        ? `On Track (${formatINR(Math.max(0, item.projectedVariance))} buffer)`
                        : 'Unbudgeted'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {showAnalyticsSections && (
        <>
          {/* Row 1: Category Donut Chart + 6-Month Income vs Expense Trend */}
          <div className="mm-stats-two-col mm-stats-grid-2">
            {/* Category Spending Donut Card + Budget Alert System */}
            <article className="mm-stat-panel" data-testid="mm-category-donut-panel">
              <div className="mm-stat-panel-header">
                <div>
                  <h2 className="mm-stat-panel-title">Category Spending &amp; Budget Alerts</h2>
                  <span className="mm-stat-panel-sub">
                    Total Expenses: <strong>{formatINR(metrics.expense)}</strong>
                  </span>
                </div>

                {exceededCategories.length > 0 ? (
                  <span
                    className="mm-budget-alert-count-pill is-danger"
                    data-testid="mm-budget-alert-count"
                  >
                    <AlertTriangle size={13} />
                    <span>
                      {exceededCategories.length} Over Threshold
                    </span>
                  </span>
                ) : (
                  <span
                    className="mm-budget-alert-count-pill is-ok"
                    data-testid="mm-budget-alert-count"
                  >
                    <CheckCircle2 size={13} />
                    <span>Within Thresholds</span>
                  </span>
                )}
              </div>

              {/* User-Defined Budget Threshold Controls */}
              <div
                className="mm-budget-threshold-bar"
                data-testid="mm-budget-threshold-controls"
              >
                <div className="mm-budget-threshold-input-group">
                  <label
                    htmlFor="mm-uniform-budget-threshold"
                    className="mm-budget-threshold-label"
                  >
                    <BellRing size={13} />
                    <span>Alert Threshold (₹):</span>
                  </label>
                  <input
                    id="mm-uniform-budget-threshold"
                    type="number"
                    min="0"
                    step="500"
                    value={uniformThresholdInput}
                    onChange={(e) => setUniformThresholdInput(e.target.value)}
                    placeholder="Per-category limits active (e.g. 5000)"
                    className="mm-input mm-budget-threshold-input"
                    aria-label="Category budget alert threshold"
                    data-testid="mm-budget-threshold-input"
                  />
                  {uniformThresholdInput && (
                    <button
                      type="button"
                      onClick={handleApplyUniformThresholdToAll}
                      className="mm-btn mm-btn-sm mm-btn-primary"
                      data-testid="mm-apply-uniform-threshold-btn"
                      title="Save this threshold across all expense categories"
                    >
                      Save to All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetDefaultThresholds}
                    className="mm-btn mm-btn-sm mm-btn-ghost"
                    title="Reset category budget thresholds to defaults"
                    data-testid="mm-reset-budget-thresholds-btn"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Limits</span>
                  </button>
                </div>
              </div>

              {/* Active Budget Alerts Banner when any category exceeds threshold */}
              {exceededCategories.length > 0 && (
                <div
                  className="mm-budget-alert-banner"
                  role="alert"
                  data-testid="mm-budget-alert-banner"
                >
                  <div className="mm-budget-alert-banner-header">
                    <AlertTriangle size={16} />
                    <strong>
                      Budget Threshold Exceeded ({exceededCategories.length}{' '}
                      {exceededCategories.length === 1 ? 'Category' : 'Categories'})
                    </strong>
                  </div>
                  <div className="mm-budget-alert-banner-list">
                    {exceededCategories.map((item) => (
                      <span
                        key={item.category}
                        className="mm-budget-alert-chip"
                        data-testid={`mm-budget-alert-chip-${item.category}`}
                      >
                        <strong>{item.category}:</strong> {formatINR(item.amount)} spent vs{' '}
                        {formatINR(item.monthlyBudget || 0)} limit (+
                        {formatINR(item.overBudgetAmount || 0)} over)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {categoryBreakdown.length === 0 ? (
                <div className="mm-empty-state" style={{ padding: '36px 16px' }}>
                  <p className="mm-empty-title">No expenses recorded in {selectedMonth}</p>
                </div>
              ) : (
                <div className="mm-donut-layout">
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {categoryBreakdown.map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={entry.color}
                              stroke={entry.isOverBudget ? '#ef4444' : 'none'}
                              strokeWidth={entry.isOverBudget ? 2.5 : 0}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [formatINR(value), 'Spent']}
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mm-category-legend-list" data-testid="mm-category-legend-list">
                    {categoryBreakdown.map((item) => {
                      const isOver = Boolean(item.isOverBudget);
                      const isNear =
                        !isOver &&
                        typeof item.budgetUtilizationPercent === 'number' &&
                        item.budgetUtilizationPercent >= 85;
                      const thresholdVal =
                        item.monthlyBudget ?? categoryThresholds[item.category] ?? '';
                      const barWidth = item.monthlyBudget
                        ? Math.min(100, Math.round((item.amount / item.monthlyBudget) * 100))
                        : 0;

                      return (
                        <div
                          key={item.category}
                          className={`mm-category-legend-row ${
                            isOver ? 'is-over-budget' : isNear ? 'is-near-budget' : ''
                          }`}
                          data-testid={`mm-category-row-${item.category}`}
                          data-over-budget={isOver ? 'true' : 'false'}
                          data-category-color={item.color}
                        >
                          <div className="mm-category-row-top">
                            <div className="mm-category-legend-left">
                              <label
                                style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                                title={`Change custom chart color for ${item.category}`}
                              >
                                <input
                                  type="color"
                                  value={item.color}
                                  onChange={(e) =>
                                    handleInlineCategoryColorChange(item.category, e.target.value)
                                  }
                                  className="mm-sr-only"
                                  aria-label={`Custom color for ${item.category}`}
                                  data-testid={`mm-inline-color-picker-${item.category}`}
                                />
                                <span
                                  className="mm-color-swatch"
                                  style={{
                                    backgroundColor: item.color,
                                  }}
                                />
                              </label>
                              <span className="mm-category-legend-name">{item.category}</span>
                              <span className="mm-category-legend-pct">{item.percentage}%</span>
                              {isOver && (
                                <span
                                  className="mm-budget-alert-badge is-over"
                                  data-testid={`mm-over-budget-badge-${item.category}`}
                                >
                                  <AlertTriangle size={11} />
                                  <span>Over by {formatINR(item.overBudgetAmount || 0)}</span>
                                </span>
                              )}
                              {isNear && (
                                <span
                                  className="mm-budget-alert-badge is-near"
                                  data-testid={`mm-near-budget-badge-${item.category}`}
                                >
                                  <span>{item.budgetUtilizationPercent}% of limit</span>
                                </span>
                              )}
                            </div>

                            <strong
                              className={`mm-category-legend-amount ${
                                isOver ? 'mm-text-expense' : ''
                              }`}
                            >
                              {formatINR(item.amount)}
                            </strong>
                          </div>

                          {/* Per-Category Threshold Progress & Inline Threshold Input */}
                          <div className="mm-category-budget-meta">
                            <div className="mm-category-budget-bar-track">
                              <div
                                className={`mm-category-budget-bar-fill ${
                                  isOver ? 'is-over' : isNear ? 'is-near' : 'is-ok'
                                }`}
                                style={{
                                  width: `${barWidth}%`,
                                  background: isOver ? undefined : item.color,
                                }}
                              />
                            </div>

                            <div className="mm-category-threshold-inline">
                              <span className="mm-category-threshold-meta-text">
                                {item.monthlyBudget
                                  ? `${item.budgetUtilizationPercent}% of ${formatINR(
                                      item.monthlyBudget
                                    )}`
                                  : 'No limit set'}
                              </span>
                              <label className="mm-category-inline-limit-label">
                                <span>Limit ₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={thresholdVal}
                                  onChange={(e) =>
                                    handleCategoryThresholdChange(item.category, e.target.value)
                                  }
                                  className="mm-category-inline-limit-input"
                                  aria-label={`Monthly budget threshold for ${item.category}`}
                                  data-testid={`mm-category-threshold-input-${item.category}`}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Right Panel: Category Spending Bar Chart (Custom Colors) & 6-Month Trend Bar Chart */}
            <article className="mm-stat-panel" data-testid="mm-six-month-trend-panel">
              <div className="mm-stat-panel-header">
                <div>
                  <h2 className="mm-stat-panel-title">
                    {barChartMode === 'category'
                      ? 'Category Spending Bar Chart'
                      : '6-Month Income vs Expense Trend'}
                  </h2>
                  <span className="mm-stat-panel-sub">
                    <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {barChartMode === 'category'
                      ? 'Bars colored by each category’s custom assigned color'
                      : 'Transfers excluded from cash flow bars'}
                  </span>
                </div>

                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setBarChartMode('category')}
                    className={`mm-btn mm-btn-sm ${
                      barChartMode === 'category' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-bar-mode-category-btn"
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarChartMode('trend')}
                    className={`mm-btn mm-btn-sm ${
                      barChartMode === 'trend' ? 'mm-btn-primary' : 'mm-btn-secondary'
                    }`}
                    data-testid="mm-bar-mode-trend-btn"
                  >
                    6-Month Trend
                  </button>
                </div>
              </div>

              {barChartMode === 'category' ? (
                <div
                  style={{ width: '100%', height: 290 }}
                  data-testid="mm-category-bar-chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryBreakdown}
                      margin={{ top: 12, right: 12, left: 4, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                      <XAxis
                        dataKey="category"
                        stroke="var(--muted)"
                        fontSize={11}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="var(--muted)"
                        fontSize={11}
                        tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatINR(value), name]}
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '10px',
                          color: 'var(--text)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Spent (INR)" radius={[6, 6, 0, 0]}>
                        {categoryBreakdown.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={entry.color}
                            stroke={entry.isOverBudget ? '#ef4444' : 'none'}
                            strokeWidth={entry.isOverBudget ? 2.5 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  style={{ width: '100%', height: 290 }}
                  data-testid="mm-six-month-trend-chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sixMonthTrend}
                      margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                      <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                      <YAxis
                        stroke="var(--muted)"
                        fontSize={11}
                        tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [formatINR(value), name]}
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '10px',
                          color: 'var(--text)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#2563EB" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </div>

          {/* Dedicated 6-Month Cash Flow (Income vs. Expenses & Net Cash Flow) Recharts Panel */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '8px' }}
            data-testid="mm-cash-flow-panel"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  <TrendingUp
                    size={18}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 8,
                      color: 'var(--accent)',
                    }}
                  />
                  Cash Flow — 6-Month Income vs. Expenses Trend (
                  {sixMonthCashFlow.points[0]?.label} –{' '}
                  {sixMonthCashFlow.points[sixMonthCashFlow.points.length - 1]?.label})
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Visualizes monthly inflows, outflows, and net cash flow trajectory over the last 6 months (internal bank transfers excluded)
                </p>
              </div>

              <div
                role="group"
                aria-label="Select Cash Flow Chart Style"
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                <button
                  type="button"
                  onClick={() => setCashFlowChartStyle('composed')}
                  className={`mm-btn mm-btn-sm ${
                    cashFlowChartStyle === 'composed' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-cash-flow-style-composed-btn"
                >
                  Bars + Net Line
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowChartStyle('area')}
                  className={`mm-btn mm-btn-sm ${
                    cashFlowChartStyle === 'area' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-cash-flow-style-area-btn"
                >
                  Area Trend
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowChartStyle('bar')}
                  className={`mm-btn mm-btn-sm ${
                    cashFlowChartStyle === 'bar' ? 'mm-btn-primary' : 'mm-btn-secondary'
                  }`}
                  data-testid="mm-cash-flow-style-bar-btn"
                >
                  Grouped Bars
                </button>
              </div>
            </div>

            {/* 6-Month Cash Flow Summary KPI Strip */}
            <div
              className="mm-budget-planner-summary"
              style={{ marginBottom: 14 }}
              data-testid="mm-cash-flow-kpi-strip"
            >
              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">6-Month Total Income</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{ color: '#10b981' }}
                  data-testid="mm-cash-flow-total-income"
                >
                  {formatINR(sixMonthCashFlow.totalSixMonthIncome)}
                </strong>
                <span className="mm-budget-kpi-sub">
                  Avg. {formatINR(sixMonthCashFlow.averageMonthlyIncome)} / month
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">6-Month Total Expenses</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{ color: '#ef4444' }}
                  data-testid="mm-cash-flow-total-expense"
                >
                  {formatINR(sixMonthCashFlow.totalSixMonthExpense)}
                </strong>
                <span className="mm-budget-kpi-sub">
                  Avg. {formatINR(sixMonthCashFlow.averageMonthlyExpense)} / month
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">6-Month Net Cash Flow</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{
                    color: sixMonthCashFlow.totalSixMonthNet >= 0 ? '#06b6d4' : '#ef4444',
                  }}
                  data-testid="mm-cash-flow-total-net"
                >
                  {formatINR(sixMonthCashFlow.totalSixMonthNet, true)}
                </strong>
                <span className="mm-budget-kpi-sub">
                  Avg. {formatINR(sixMonthCashFlow.averageMonthlyNet, true)} net / month
                </span>
              </div>

              <div className="mm-budget-kpi-card">
                <span className="mm-budget-kpi-label">6-Month Avg. Savings Rate</span>
                <strong
                  className="mm-budget-kpi-value"
                  style={{
                    color: sixMonthCashFlow.averageSavingsRate >= 20 ? '#10b981' : '#f59e0b',
                  }}
                  data-testid="mm-cash-flow-avg-savings"
                >
                  {sixMonthCashFlow.averageSavingsRate}%
                </strong>
                <span className="mm-budget-kpi-sub">
                  {sixMonthCashFlow.surplusMonthsCount} of {sixMonthCashFlow.points.length} months net positive
                </span>
              </div>
            </div>

            {/* Recharts 6-Month Cash Flow Visualization */}
            <div
              style={{ width: '100%', height: 310, marginBottom: 14 }}
              data-testid="mm-cash-flow-chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                {cashFlowChartStyle === 'composed' ? (
                  <ComposedChart
                    data={sixMonthCashFlow.points}
                    margin={{ top: 12, right: 16, left: 6, bottom: 6 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={11}
                      tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.4)" />
                    <Bar
                      dataKey="income"
                      name="Income (₹)"
                      fill="#10b981"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expenses (₹)"
                      fill="#ef4444"
                      radius={[5, 5, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net Cash Flow (₹)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#06b6d4' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                ) : cashFlowChartStyle === 'area' ? (
                  <AreaChart
                    data={sixMonthCashFlow.points}
                    margin={{ top: 12, right: 16, left: 6, bottom: 6 }}
                  >
                    <defs>
                      <linearGradient id="mmCashFlowIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.36} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="mmCashFlowExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={11}
                      tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.4)" />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income (₹)"
                      stroke="#10b981"
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#mmCashFlowIncomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Expenses (₹)"
                      stroke="#ef4444"
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#mmCashFlowExpenseGrad)"
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net Cash Flow (₹)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#06b6d4' }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={sixMonthCashFlow.points}
                    margin={{ top: 12, right: 16, left: 6, bottom: 6 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={11}
                      tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [formatINR(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income (₹)"
                      fill="#10b981"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expenses (₹)"
                      fill="#ef4444"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* 6-Month Month-by-Month Cash Flow Breakdown Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
                gap: 8,
              }}
              data-testid="mm-cash-flow-monthly-grid"
            >
              {sixMonthCashFlow.points.map((pt) => (
                <div
                  key={pt.yearMonth}
                  data-testid={`mm-cash-flow-month-card-${pt.yearMonth}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border:
                      pt.yearMonth === selectedMonth
                        ? '1.5px solid var(--accent)'
                        : '1px solid var(--border)',
                    background: 'var(--surface-alt, rgba(148, 163, 184, 0.04))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: '0.78rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 4,
                    }}
                  >
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-heading)' }}>
                      {pt.label}
                    </strong>
                    <span
                      className={`mm-budget-status-pill is-${
                        pt.status === 'surplus'
                          ? 'on-track'
                          : pt.status === 'deficit'
                          ? 'over'
                          : 'near'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                    >
                      {pt.savingsRate}% saved
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Inflow:</span>
                    <strong style={{ color: '#10b981' }}>{formatINR(pt.income)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Outflow:</span>
                    <strong style={{ color: '#ef4444' }}>{formatINR(pt.expense)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 4,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>Net Flow:</span>
                    <strong
                      style={{
                        color: pt.net >= 0 ? '#06b6d4' : '#ef4444',
                      }}
                    >
                      {formatINR(pt.net, true)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Dedicated 12-Month Multi-Line Historical Trend Chart Card (Recharts) */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '12px' }}
            data-testid="mm-12-month-historical-trend-panel"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  <TrendingUp
                    size={18}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 8,
                      color: 'var(--accent)',
                    }}
                  />
                  12-Month Historical Trend — Income vs. Expenses ({twelveMonthSummary.startLabel} – {twelveMonthSummary.endLabel})
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Multi-line Recharts visualization comparing monthly income, expenses, and net cash flow trajectory across the trailing 12 months
                </p>
              </div>

              <div className="mm-filter-pills" style={{ margin: 0 }}>
                <span className="mm-pill mm-pill-income" data-testid="mm-12m-avg-income-pill">
                  12m Avg Income: {formatINR(twelveMonthSummary.avgIncome)}
                </span>
                <span className="mm-pill mm-pill-expense" data-testid="mm-12m-avg-expense-pill">
                  12m Avg Expense: {formatINR(twelveMonthSummary.avgExpense)}
                </span>
                <span
                  className="mm-pill"
                  style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                  }}
                  data-testid="mm-12m-net-pill"
                >
                  12m Net Flow: {formatINR(twelveMonthSummary.totalNet, true)}
                </span>
              </div>
            </div>

            {/* Recharts 12-Month LineChart */}
            <div style={{ width: '100%', height: 340, marginTop: 12 }} data-testid="mm-12-month-line-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={twelveMonthTrend}
                  margin={{ top: 16, right: 20, left: 10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} tickMargin={6} />
                  <YAxis
                    stroke="var(--muted)"
                    fontSize={11}
                    tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [formatINR(value), name]}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.35)" strokeDasharray="2 2" />

                  {/* Multi-Line Visual Streams */}
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Monthly Income"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Monthly Expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ef4444', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#ef4444' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Cash Flow"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#06b6d4' }}
                    activeDot={{ r: 6, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trailing 12-Month KPI Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 10,
                marginTop: 14,
              }}
              data-testid="mm-12-month-kpi-grid"
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span className="mm-stat-label" style={{ fontSize: '0.74rem' }}>12m Total Income</span>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#10b981', marginTop: 2 }}>
                  {formatINR(twelveMonthSummary.totalIncome)}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  Avg: {formatINR(twelveMonthSummary.avgIncome)}/mo
                </span>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <span className="mm-stat-label" style={{ fontSize: '0.74rem' }}>12m Total Expenses</span>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#ef4444', marginTop: 2 }}>
                  {formatINR(twelveMonthSummary.totalExpense)}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  Avg: {formatINR(twelveMonthSummary.avgExpense)}/mo
                </span>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                }}
              >
                <span className="mm-stat-label" style={{ fontSize: '0.74rem' }}>12m Net Surplus</span>
                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--accent)', marginTop: 2 }}>
                  {formatINR(twelveMonthSummary.totalNet, true)}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  Avg Net: {formatINR(twelveMonthSummary.avgNet)}/mo
                </span>
              </div>
            </div>
          </article>

          {/* Row 2: Fixed vs Variable Expenditure Ratio Gauge */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '8px' }}
            data-testid="mm-fixed-variable-gauge"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  Fixed vs Variable Expenditure Ratio Gauge
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Tracks structural monthly obligations (Rent, Utilities, Tuition) against discretionary or variable spending
                </p>
              </div>

              {metrics.anomalyCount > 0 && (
                <div className="mm-anomaly-summary-banner">
                  <AlertTriangle size={15} />
                  <span>
                    {metrics.anomalyCount} Unbudgeted{' '}
                    {metrics.anomalyCount === 1 ? 'Spike' : 'Spikes'}:{' '}
                    <strong>{formatINR(metrics.anomalyTotal)}</strong>
                  </span>
                </div>
              )}
            </div>

            <div
              className="mm-ratio-gauge-track"
              aria-label="Fixed vs Variable Expense Gauge"
            >
              <div
                className="mm-ratio-segment is-fixed"
                style={{ width: `${metrics.expense > 0 ? metrics.fixedRatioPercent : 50}%` }}
                title={`Fixed: ${formatINR(metrics.fixedExpense)} (${metrics.fixedRatioPercent}%)`}
              />
              <div
                className="mm-ratio-segment is-variable"
                style={{
                  width: `${metrics.expense > 0 ? metrics.variableRatioPercent : 50}%`,
                }}
                title={`Variable: ${formatINR(metrics.variableExpense)} (${metrics.variableRatioPercent}%)`}
              />
            </div>

            <div className="mm-ratio-legend-grid">
              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">
                  <span className="mm-color-swatch" style={{ backgroundColor: '#6366f1' }} />
                  Fixed Obligations ({metrics.fixedRatioPercent}%)
                </span>
                <strong className="mm-ratio-value">{formatINR(metrics.fixedExpense)}</strong>
              </div>

              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">
                  <span className="mm-color-swatch" style={{ backgroundColor: '#f59e0b' }} />
                  Variable Spending ({metrics.variableRatioPercent}%)
                </span>
                <strong className="mm-ratio-value">{formatINR(metrics.variableExpense)}</strong>
              </div>

              <div className="mm-ratio-stat-box">
                <span className="mm-ratio-label">Monthly Net Savings Rate</span>
                <strong
                  className={`mm-ratio-value ${
                    metrics.savingsRate >= 20 ? 'mm-text-net-positive' : 'mm-text-expense'
                  }`}
                >
                  {metrics.savingsRate}% ({formatINR(metrics.netBalance, true)})
                </strong>
              </div>
            </div>
          </article>

          {/* Row 3: Sinking Funds / Annual Provisions Tracker */}
          <article
            className="mm-stat-panel"
            style={{ marginTop: '8px' }}
            data-testid="mm-sinking-funds-panel"
          >
            <div className="mm-stat-panel-header">
              <div>
                <h2 className="mm-stat-panel-title">
                  <PiggyBank
                    size={18}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 8,
                      color: 'var(--accent)',
                    }}
                  />
                  Sinking Funds &amp; Annual Provisions Tracker
                </h2>
                <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                  Accrue monthly provisions for predictable annual milestones (School Fees, Eid / Festival, Insurance)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddFund((prev) => !prev)}
                className="mm-btn mm-btn-secondary"
                data-testid="mm-toggle-add-sinking-fund-btn"
              >
                <Plus size={15} />
                <span>{showAddFund ? 'Cancel' : 'Add Provision Goal'}</span>
              </button>
            </div>

            {showAddFund && (
              <form
                onSubmit={handleCreateFund}
                className="mm-inline-form-card"
                style={{ marginBottom: '18px' }}
              >
                <div className="mm-form-grid-4">
                  <div className="mm-field">
                    <label htmlFor="mm-sf-name">Provision Name</label>
                    <input
                      id="mm-sf-name"
                      type="text"
                      required
                      placeholder="e.g., Car Insurance Renewal"
                      value={fundName}
                      onChange={(e) => setFundName(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-target">Target Amount (₹)</label>
                    <input
                      id="mm-sf-target"
                      type="number"
                      required
                      min="500"
                      value={fundTarget}
                      onChange={(e) => setFundTarget(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-monthly">Monthly Target (₹)</label>
                    <input
                      id="mm-sf-monthly"
                      type="number"
                      required
                      min="100"
                      value={fundMonthly}
                      onChange={(e) => setFundMonthly(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                  <div className="mm-field">
                    <label htmlFor="mm-sf-accrued">Current Accrued (₹)</label>
                    <input
                      id="mm-sf-accrued"
                      type="number"
                      min="0"
                      value={fundAccrued}
                      onChange={(e) => setFundAccrued(e.target.value)}
                      className="mm-input"
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '12px',
                  }}
                >
                  <button type="submit" className="mm-btn mm-btn-primary">
                    Save Provision Fund
                  </button>
                </div>
              </form>
            )}

            <div className="mm-sinking-funds-grid">
              {sinkingFunds.map((fund) => {
                const pct =
                  fund.targetAmount > 0
                    ? Math.min(100, Math.round((fund.currentAccrued / fund.targetAmount) * 100))
                    : 0;
                const remaining = Math.max(0, fund.targetAmount - fund.currentAccrued);

                return (
                  <div
                    key={fund.id}
                    className="mm-sinking-fund-card"
                    data-testid={`mm-sf-card-${fund.id}`}
                  >
                    <div className="mm-sf-top">
                      <div>
                        <strong className="mm-sf-name">{fund.name}</strong>
                        <span className="mm-sf-monthly">
                          Monthly Provision Target: {formatINR(fund.monthlyTarget)}/mo
                        </span>
                      </div>
                      <span className="mm-sf-pct">{pct}%</span>
                    </div>

                    <div className="mm-sf-progress-track">
                      <div
                        className="mm-sf-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mm-sf-bottom">
                      <div className="mm-sf-amounts">
                        <span>
                          Accrued: <strong>{formatINR(fund.currentAccrued)}</strong> /{' '}
                          {formatINR(fund.targetAmount)}
                        </span>
                        <span className="mm-sf-remaining">
                          {remaining > 0 ? `${formatINR(remaining)} remaining` : '✓ Fully Funded'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddMonthlyContribution(fund)}
                            className="mm-btn mm-btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            title={`Add monthly provision of ${formatINR(fund.monthlyTarget)}`}
                            data-testid={`mm-sf-contribute-${fund.id}`}
                          >
                            <ArrowUpCircle size={13} />
                            <span>+{formatINR(fund.monthlyTarget)}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteSinkingFund(fund.id)}
                          className="mm-icon-action-btn is-danger"
                          title="Remove provision fund"
                          aria-label={`Delete ${fund.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </>
      )}

      {/* Row 3.5: Category Manager & Custom Chart Colors */}
      {showCategoriesSection && (
        <CategoryManager
          categories={localCategories}
          transactions={transactions}
          onSaveCategory={handleSaveCategoryState}
          onDeleteCategory={handleDeleteCategoryState}
        />
      )}

      {/* Row 4: Scheduled Transactions View (Active Recurring Payment Rules) */}
      {showScheduledSection && (
        <article
          className="mm-stat-panel"
          style={{ marginTop: '8px' }}
          data-testid="mm-scheduled-transactions-view"
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <Repeat
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Scheduled Transactions
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Active recurring payment rules with frequency, next occurrence date, and quick controls to pause or delete
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowPausedRules((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                data-testid="mm-scheduled-toggle-paused-btn"
              >
                {showPausedRules
                  ? `Showing All (${recurringRules.length})`
                  : `Active Only (${activeRecurringRules.length})`}
              </button>

              {onOpenRecurringScheduler && (
                <button
                  type="button"
                  onClick={onOpenRecurringScheduler}
                  className="mm-btn mm-btn-sm mm-btn-primary"
                  data-testid="mm-scheduled-open-scheduler-btn"
                >
                  <Plus size={14} />
                  <span>Manage Schedules</span>
                </button>
              )}
            </div>
          </div>

          {displayedRecurringRules.length === 0 ? (
            <div className="mm-empty-state" style={{ padding: '28px 16px' }}>
              <CalendarClock size={28} />
              <p className="mm-empty-title" style={{ margin: 0 }}>
                No active recurring payment rules found
              </p>
              {recurringRules.length > 0 && !showPausedRules && (
                <button
                  type="button"
                  onClick={() => setShowPausedRules(true)}
                  className="mm-btn mm-btn-sm mm-btn-secondary"
                >
                  Show {recurringRules.length} Paused Rule(s)
                </button>
              )}
            </div>
          ) : (
            <div className="mm-day-tx-list" data-testid="mm-scheduled-transactions-list">
              {displayedRecurringRules.map((rule) => {
                const sourceName = accountMap.get(rule.accountId) || rule.accountId;
                const targetName = rule.toAccountId
                  ? accountMap.get(rule.toAccountId) || rule.toAccountId
                  : null;

                return (
                  <div
                    key={rule.id}
                    className="mm-tx-row"
                    style={{
                      opacity: rule.active ? 1 : 0.65,
                    }}
                    data-testid={`mm-scheduled-rule-row-${rule.id}`}
                  >
                    <div className="mm-tx-left">
                      <div
                        className={`mm-tx-icon-wrap ${
                          rule.type === 'Income'
                            ? 'mm-tx-icon-income'
                            : rule.type === 'Expense'
                            ? 'mm-tx-icon-expense'
                            : 'mm-tx-icon-transfer'
                        }`}
                      >
                        <Repeat size={17} />
                      </div>

                      <div className="mm-tx-details">
                        <div className="mm-tx-title-line">
                          <strong className="mm-tx-category">{rule.title}</strong>
                          <span
                            className="mm-account-type-label"
                            data-testid={`mm-scheduled-freq-${rule.id}`}
                          >
                            {rule.frequency}
                          </span>
                          <span
                            className={`mm-tx-fv-tag ${
                              rule.fixedOrVariable === 'Fixed' ? 'mm-fv-fixed' : 'mm-fv-variable'
                            }`}
                          >
                            {rule.fixedOrVariable}
                          </span>
                          <span
                            className="mm-tx-subcategory"
                            data-testid={`mm-scheduled-status-${rule.id}`}
                            style={{
                              color: rule.active ? '#10b981' : '#f59e0b',
                              fontWeight: 700,
                            }}
                          >
                            {rule.active ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <div className="mm-tx-meta-line">
                          <span className="mm-tx-account-badge">
                            {sourceName}
                            {rule.type === 'Transfer' && targetName ? (
                              <>
                                {' '}
                                <ArrowRight size={11} style={{ display: 'inline' }} /> {targetName}
                              </>
                            ) : null}
                          </span>
                          <span>
                            {rule.category}
                            {rule.subCategory ? ` · ${rule.subCategory}` : ''}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                              color: 'var(--text-heading)',
                            }}
                            data-testid={`mm-scheduled-next-date-${rule.id}`}
                          >
                            <Clock size={12} />
                            Next occurrence: {rule.nextRunDate}
                            {rule.timeOfDay ? ` at ${rule.timeOfDay}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mm-tx-right">
                      <strong
                        className={`mm-tx-amount ${
                          rule.type === 'Income'
                            ? 'mm-amount-income'
                            : rule.type === 'Expense'
                            ? 'mm-amount-expense'
                            : 'mm-amount-transfer'
                        }`}
                      >
                        {rule.type === 'Income' ? '+' : rule.type === 'Expense' ? '-' : '⇄ '}
                        {formatINR(rule.amount)}
                      </strong>

                      <div className="mm-tx-actions">
                        <button
                          type="button"
                          onClick={() => onToggleRecurringRule?.(rule)}
                          className="mm-btn mm-btn-sm mm-btn-secondary"
                          title={
                            rule.active
                              ? `Pause ${rule.title}`
                              : `Resume ${rule.title}`
                          }
                          aria-label={
                            rule.active
                              ? `Pause ${rule.title}`
                              : `Resume ${rule.title}`
                          }
                          data-testid={`mm-scheduled-pause-toggle-${rule.id}`}
                        >
                          {rule.active ? (
                            <>
                              <PauseCircle size={14} />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle size={14} />
                              <span>Resume</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteRecurringRule?.(rule.id)}
                          className="mm-icon-action-btn is-danger"
                          title={`Delete ${rule.title}`}
                          aria-label={`Delete ${rule.title}`}
                          data-testid={`mm-scheduled-delete-btn-${rule.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      )}

      <SpendingPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        selectedMonth={selectedMonth}
        plan={monthlyBudgetPlan}
        metrics={metrics}
        transactions={transactions}
        sinkingFunds={sinkingFunds}
        onPdfGenerated={(fileName) => {
          setPdfExportNotice(fileName);
        }}
      />

      {/* Floating 'Export Data' Action Button & Toast Notification */}
      <div
        className="mm-stats-floating-fab-container"
        style={{
          position: 'sticky',
          bottom: 20,
          right: 20,
          zIndex: 90,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          paddingTop: 16,
          paddingBottom: 8,
          pointerEvents: 'none',
        }}
      >
        {backupExportNotice && (
          <div
            role="status"
            data-testid="mm-stats-export-json-toast"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              fontSize: '0.83rem',
              color: 'var(--text-main)',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
            <span>
              Exported <strong>{backupExportNotice.recordCount} records</strong> to{' '}
              <code style={{ fontWeight: 600 }}>{backupExportNotice.fileName}</code>
            </span>
            <button
              type="button"
              onClick={() => setBackupExportNotice(null)}
              className="mm-btn mm-btn-sm mm-btn-ghost"
              style={{ padding: '2px 6px', fontSize: '0.74rem' }}
              data-testid="mm-stats-export-json-toast-dismiss"
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleExportFullJsonBackup}
          className="mm-btn mm-btn-primary"
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 24,
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
          title="Trigger a JSON backup download of your entire financial ledger"
          data-testid="mm-stats-floating-export-btn"
        >
          <Download size={16} />
          <span>Export Data (JSON)</span>
        </button>
      </div>
    </section>
  );
};

export default StatsView;

export {
  BudgetProjectionSection,
  calculateBudgetProjections,
  type BudgetProjectionSummary,
  type CategoryBudgetProjectionItem,
} from './BudgetProjectionSection';

export {
  BudgetOverrunAlertList,
  type BudgetOverrunAlertListProps,
} from './BudgetOverrunAlertList';

export {
  MonthlySavingsGoalsSection,
  getStoredSavingsTarget,
  type MonthlySavingsGoalsSectionProps,
} from './MonthlySavingsGoalsSection';



