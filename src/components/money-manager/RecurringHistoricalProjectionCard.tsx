import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Repeat,
  History,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Sliders,
  ArrowUpRight,
} from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  INITIAL_RECURRING_RULES,
  computeRecurringOccurrencesForMonth,
  formatINR,
  resolveTransactionInrAmount,
  type MoneyCategory,
  type MoneyTransaction,
  type RecurringRule,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';

export type RecurringProjectionChartMode = 'category-stacked' | 'forward-timeline';
export type HistoricalTrendScenario = 'conservative' | 'baseline' | 'elevated';

export interface CategoryRecurringHistoricalProjectionRow {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  monthlyBudgetLimit: number;
  currentMonthActualSpent: number;
  recurringMonthlyCommitment: number;
  scheduledRecurringThisMonth: number;
  recurringRuleCount: number;
  matchingRuleTitles: string[];
  historicalMonthlyAvg: number;
  historicalVariableAvg: number;
  historicalMonthsCount: number;
  trendMomentumPercent: number;
  projectedDiscretionarySpend: number;
  projectedMonthlyTotal: number;
  projectedVarianceVsBudget: number;
  projectedOverage: number;
  projectedUtilizationPercent: number;
  status: 'projected-over' | 'at-risk' | 'on-track' | 'unbudgeted';
}

export interface MonthlyProjectionTimelinePoint {
  yearMonth: string;
  label: string;
  isCurrentMonth: boolean;
  recurringCommitted: number;
  historicalTrendVariable: number;
  actualLoggedSpent: number;
  projectedTotal: number;
  totalBudgetLimit: number;
  projectedCumulative: number;
}

export interface RecurringHistoricalProjectionSummary {
  referenceYearMonth: string;
  horizonMonths: number;
  scenario: HistoricalTrendScenario;
  scenarioMultiplier: number;
  activeRecurringExpenseRulesCount: number;
  totalMonthlyRecurringCommitted: number;
  totalScheduledRecurringThisMonth: number;
  totalCurrentMonthActualSpent: number;
  totalHistoricalMonthlyAvg: number;
  totalHistoricalVariableAvg: number;
  historicalMonthsAnalyzed: number;
  projectedCurrentMonthDiscretionary: number;
  projectedCurrentMonthTotal: number;
  projectedNextMonthTotal: number;
  averageProjectedMonthlySpend: number;
  totalMonthlyBudgetLimit: number;
  projectedBudgetVariance: number;
  projectedBudgetOverage: number;
  projectedBudgetUtilizationPercent: number;
  recurringShareOfProjectionPercent: number;
  historicalTrendSharePercent: number;
  projectedOverBudgetCategoriesCount: number;
  atRiskCategoriesCount: number;
  onTrackCategoriesCount: number;
  categories: CategoryRecurringHistoricalProjectionRow[];
  timelinePoints: MonthlyProjectionTimelinePoint[];
}

export interface ComputeRecurringHistoricalProjectionOptions {
  horizonMonths?: number;
  includePausedRecurring?: boolean;
  scenario?: HistoricalTrendScenario;
  thresholdOverrides?: Record<string, number> | number;
}

const SHORT_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatYearMonthShort(yearMonth: string): string {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const yyyy = Number.parseInt(yStr, 10) || 2026;
  const mm = Number.parseInt(mStr, 10) || 11;
  const mon = SHORT_MONTH_LABELS[Math.max(0, Math.min(11, mm - 1))] || 'Nov';
  return `${mon} '${String(yyyy).slice(-2)}`;
}

function addMonthsToYearMonth(yearMonth: string, offsetMonths: number): string {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const yyyy = Number.parseInt(yStr, 10) || 2026;
  const mm = Number.parseInt(mStr, 10) || 11;
  const d = new Date(yyyy, mm - 1 + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Normalizes a recurring expense rule into its monthly equivalent INR commitment.
 */
export function normalizeRecurringRuleToMonthlyAmount(
  rule: Pick<RecurringRule, 'amount' | 'frequency'> & { type?: RecurringRule['type'] }
): number {
  if (!rule || (rule.type && rule.type !== 'Expense')) return 0;
  const baseAmt = Math.max(0, Number(rule.amount) || 0);
  switch (rule.frequency) {
    case 'Daily':
      return Math.round(baseAmt * 30);
    case 'Weekly':
      return Math.round((baseAmt * 52) / 12);
    case 'Yearly':
      return Math.round(baseAmt / 12);
    case 'Monthly':
    default:
      return Math.round(baseAmt);
  }
}

/**
 * Computes potential monthly spending projections by combining active recurring transaction
 * commitments with multi-month historical spending trends from the local IndexedDB ledger.
 */
export function computeRecurringAndHistoricalSpendingProjection(
  transactions: MoneyTransaction[] = [],
  recurringRules: RecurringRule[] = INITIAL_RECURRING_RULES,
  referenceYearMonth: string = '2026-11',
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  options: ComputeRecurringHistoricalProjectionOptions = {}
): RecurringHistoricalProjectionSummary {
  const horizonMonths = Math.max(3, Math.min(12, options.horizonMonths ?? 6));
  const includePaused = Boolean(options.includePausedRecurring);
  const scenario: HistoricalTrendScenario = options.scenario ?? 'baseline';
  const scenarioMultiplier =
    scenario === 'conservative' ? 0.9 : scenario === 'elevated' ? 1.15 : 1.0;

  const categoryDefs =
    Array.isArray(categories) && categories.length > 0 ? categories : INITIAL_CATEGORIES;
  const rulesList =
    Array.isArray(recurringRules) && recurringRules.length > 0
      ? recurringRules
      : INITIAL_RECURRING_RULES;

  const eligibleExpenseRules = rulesList.filter(
    (r) => r && r.type === 'Expense' && (includePaused || r.active)
  );

  // Build map of expense categories
  const categoryMap = new Map<string, MoneyCategory>();
  for (const cat of categoryDefs) {
    if (cat.type === 'Expense') {
      categoryMap.set(cat.name, cat);
    }
  }

  for (const rule of eligibleExpenseRules) {
    const catName = rule.category || 'Uncategorized';
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        id: `cat-rec-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: catName,
        type: 'Expense',
        subCategories: [],
        defaultFixedOrVariable: rule.fixedOrVariable || 'Fixed',
        iconName: 'Tag',
        color: '#6366f1',
        monthlyBudget: 0,
      });
    }
  }

  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'Expense') continue;
    const catName = tx.category || 'Uncategorized';
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        id: `cat-tx-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: catName,
        type: 'Expense',
        subCategories: [],
        defaultFixedOrVariable: tx.fixedOrVariable || 'Variable',
        iconName: 'Tag',
        color: '#06b6d4',
        monthlyBudget: 0,
      });
    }
  }

  // Group recurring rules by category
  const rulesByCategory = new Map<string, RecurringRule[]>();
  for (const catName of categoryMap.keys()) {
    rulesByCategory.set(catName, []);
  }
  for (const rule of eligibleExpenseRules) {
    const catName = rule.category || 'Uncategorized';
    const arr = rulesByCategory.get(catName) || [];
    arr.push(rule);
    rulesByCategory.set(catName, arr);
  }

  // Analyze historical and current-month transactions
  const currentMonthActualByCat = new Map<string, number>();
  const historicalByCatAndMonth = new Map<string, Map<string, number>>();
  const historicalMonthsSet = new Set<string>();

  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'Expense') continue;
    const ym = String(tx.date || '').slice(0, 7);
    if (!ym) continue;
    const inrAmt = resolveTransactionInrAmount(tx);
    const catName = tx.category || 'Uncategorized';

    if (ym === referenceYearMonth) {
      currentMonthActualByCat.set(
        catName,
        (currentMonthActualByCat.get(catName) ?? 0) + inrAmt
      );
    } else if (ym < referenceYearMonth) {
      historicalMonthsSet.add(ym);
      const mMap = historicalByCatAndMonth.get(catName) ?? new Map<string, number>();
      mMap.set(ym, (mMap.get(ym) ?? 0) + inrAmt);
      historicalByCatAndMonth.set(catName, mMap);
    }
  }

  // If no strictly prior months exist in ledger, include all available months for trend baseline
  if (historicalMonthsSet.size === 0) {
    for (const tx of transactions || []) {
      if (!tx || tx.type !== 'Expense') continue;
      const ym = String(tx.date || '').slice(0, 7);
      if (!ym) continue;
      const inrAmt = resolveTransactionInrAmount(tx);
      const catName = tx.category || 'Uncategorized';
      historicalMonthsSet.add(ym);
      const mMap = historicalByCatAndMonth.get(catName) ?? new Map<string, number>();
      mMap.set(ym, (mMap.get(ym) ?? 0) + inrAmt);
      historicalByCatAndMonth.set(catName, mMap);
    }
  }

  const sortedHistoricalMonths = Array.from(historicalMonthsSet).sort();
  const historicalMonthsCount = Math.max(1, sortedHistoricalMonths.length);

  let totalMonthlyRecurringCommitted = 0;
  let totalScheduledRecurringThisMonth = 0;
  let totalCurrentMonthActualSpent = 0;
  let totalHistoricalMonthlyAvg = 0;
  let totalHistoricalVariableAvg = 0;
  let projectedCurrentMonthDiscretionary = 0;
  let projectedCurrentMonthTotal = 0;
  let totalMonthlyBudgetLimit = 0;
  let projectedBudgetOverage = 0;
  let projectedOverBudgetCategoriesCount = 0;
  let atRiskCategoriesCount = 0;
  let onTrackCategoriesCount = 0;

  const categoryRows: CategoryRecurringHistoricalProjectionRow[] = [];

  for (const [catName, catDef] of categoryMap.entries()) {
    let monthlyBudgetLimit = 0;
    if (typeof options.thresholdOverrides === 'number') {
      monthlyBudgetLimit = options.thresholdOverrides;
    } else if (
      options.thresholdOverrides &&
      typeof options.thresholdOverrides[catName] === 'number'
    ) {
      monthlyBudgetLimit = options.thresholdOverrides[catName];
    } else if (typeof catDef.monthlyBudget === 'number' && catDef.monthlyBudget > 0) {
      monthlyBudgetLimit = catDef.monthlyBudget;
    }

    const catRules = rulesByCategory.get(catName) || [];
    const recurringMonthlyCommitment = catRules.reduce(
      (sum, r) => sum + normalizeRecurringRuleToMonthlyAmount(r),
      0
    );

    const scheduledRecurringThisMonth = catRules.reduce((sum, r) => {
      const occs = computeRecurringOccurrencesForMonth(r, referenceYearMonth);
      const count = occs.length > 0 ? occs.length : r.frequency === 'Monthly' ? 1 : 0;
      return sum + count * (Number(r.amount) || 0);
    }, 0);

    const currentMonthActualSpent = Math.round(currentMonthActualByCat.get(catName) ?? 0);

    const catMonthMap = historicalByCatAndMonth.get(catName);
    let historicalSum = 0;
    const monthTotals: number[] = [];
    for (const hm of sortedHistoricalMonths) {
      const val = catMonthMap?.get(hm) ?? 0;
      historicalSum += val;
      monthTotals.push(val);
    }

    const historicalMonthlyAvg =
      sortedHistoricalMonths.length > 0
        ? Math.round(historicalSum / historicalMonthsCount)
        : currentMonthActualSpent;

    // Calculate momentum from earlier half vs recent half of historical months
    let trendMomentumPercent = 0;
    if (monthTotals.length >= 2) {
      const mid = Math.floor(monthTotals.length / 2);
      const earlyAvg =
        monthTotals.slice(0, mid).reduce((s, v) => s + v, 0) / Math.max(1, mid);
      const recentAvg =
        monthTotals.slice(mid).reduce((s, v) => s + v, 0) /
        Math.max(1, monthTotals.length - mid);
      if (earlyAvg > 0) {
        const rawMomentum = ((recentAvg - earlyAvg) / earlyAvg) * 100;
        trendMomentumPercent = Number(Math.max(-25, Math.min(35, rawMomentum)).toFixed(1));
      }
    }

    // Separate non-recurring / discretionary historical trend component above committed recurring floor
    const rawHistoricalVariable = Math.max(
      0,
      historicalMonthlyAvg - recurringMonthlyCommitment
    );
    const nonRecurringCurrentActual = Math.max(
      0,
      currentMonthActualSpent - recurringMonthlyCommitment
    );
    const historicalVariableAvg = Math.round(
      Math.max(rawHistoricalVariable, nonRecurringCurrentActual * 0.85)
    );

    const momentumFactor = 1 + (trendMomentumPercent / 100) * 0.35;
    const projectedDiscretionarySpend = Math.round(
      Math.max(
        nonRecurringCurrentActual,
        historicalVariableAvg * momentumFactor * scenarioMultiplier
      )
    );

    const baseProjectedTotal = recurringMonthlyCommitment + projectedDiscretionarySpend;
    const projectedMonthlyTotal = Math.round(
      Math.max(currentMonthActualSpent, baseProjectedTotal)
    );

    const projectedVarianceVsBudget =
      monthlyBudgetLimit > 0 ? monthlyBudgetLimit - projectedMonthlyTotal : 0;
    const projectedOverage =
      monthlyBudgetLimit > 0 && projectedMonthlyTotal > monthlyBudgetLimit
        ? projectedMonthlyTotal - monthlyBudgetLimit
        : 0;
    const projectedUtilizationPercent =
      monthlyBudgetLimit > 0
        ? Number(((projectedMonthlyTotal / monthlyBudgetLimit) * 100).toFixed(1))
        : 0;

    let status: CategoryRecurringHistoricalProjectionRow['status'] = 'unbudgeted';
    if (monthlyBudgetLimit <= 0) {
      status = 'unbudgeted';
    } else if (projectedMonthlyTotal > monthlyBudgetLimit) {
      status = 'projected-over';
      projectedOverBudgetCategoriesCount += 1;
    } else if (projectedUtilizationPercent >= 85) {
      status = 'at-risk';
      atRiskCategoriesCount += 1;
    } else {
      status = 'on-track';
      onTrackCategoriesCount += 1;
    }

    totalMonthlyRecurringCommitted += recurringMonthlyCommitment;
    totalScheduledRecurringThisMonth += scheduledRecurringThisMonth;
    totalCurrentMonthActualSpent += currentMonthActualSpent;
    totalHistoricalMonthlyAvg += historicalMonthlyAvg;
    totalHistoricalVariableAvg += historicalVariableAvg;
    projectedCurrentMonthDiscretionary += projectedDiscretionarySpend;
    projectedCurrentMonthTotal += projectedMonthlyTotal;
    totalMonthlyBudgetLimit += monthlyBudgetLimit;
    projectedBudgetOverage += projectedOverage;

    categoryRows.push({
      categoryId: catDef.id,
      category: catName,
      color: catDef.color || '#6366f1',
      iconName: catDef.iconName || 'Tag',
      defaultFixedOrVariable: catDef.defaultFixedOrVariable,
      monthlyBudgetLimit,
      currentMonthActualSpent,
      recurringMonthlyCommitment,
      scheduledRecurringThisMonth,
      recurringRuleCount: catRules.length,
      matchingRuleTitles: catRules.map((r) => r.title),
      historicalMonthlyAvg,
      historicalVariableAvg,
      historicalMonthsCount: sortedHistoricalMonths.length,
      trendMomentumPercent,
      projectedDiscretionarySpend,
      projectedMonthlyTotal,
      projectedVarianceVsBudget,
      projectedOverage,
      projectedUtilizationPercent,
      status,
    });
  }

  // Sort categories by highest projected monthly total descending
  categoryRows.sort(
    (a, b) =>
      b.projectedMonthlyTotal - a.projectedMonthlyTotal ||
      b.recurringMonthlyCommitment - a.recurringMonthlyCommitment ||
      a.category.localeCompare(b.category)
  );

  // Build forward multi-month projection timeline points
  const timelinePoints: MonthlyProjectionTimelinePoint[] = [];
  let cumulative = 0;

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const ym = addMonthsToYearMonth(referenceYearMonth, offset);
    const label = formatYearMonthShort(ym);
    const isCurrentMonth = offset === 0;

    // Calculate scheduled recurring commitment in month `ym`
    let monthRecurring = 0;
    for (const rule of eligibleExpenseRules) {
      const occs = computeRecurringOccurrencesForMonth(rule, ym);
      if (occs.length > 0) {
        monthRecurring += occs.length * (Number(rule.amount) || 0);
      } else {
        monthRecurring += normalizeRecurringRuleToMonthlyAmount(rule);
      }
    }
    monthRecurring = Math.round(monthRecurring);

    // Project discretionary trend with subtle monthly drift based on scenario
    const driftFactor = 1 + offset * (scenario === 'elevated' ? 0.015 : scenario === 'conservative' ? -0.008 : 0.005);
    const monthDiscretionary = Math.round(
      projectedCurrentMonthDiscretionary * Math.max(0.85, driftFactor)
    );

    const rawMonthTotal = monthRecurring + monthDiscretionary;
    const projectedTotal = isCurrentMonth
      ? Math.max(totalCurrentMonthActualSpent, rawMonthTotal)
      : rawMonthTotal;

    cumulative += projectedTotal;

    timelinePoints.push({
      yearMonth: ym,
      label,
      isCurrentMonth,
      recurringCommitted: monthRecurring,
      historicalTrendVariable: monthDiscretionary,
      actualLoggedSpent: isCurrentMonth ? totalCurrentMonthActualSpent : 0,
      projectedTotal,
      totalBudgetLimit: totalMonthlyBudgetLimit,
      projectedCumulative: cumulative,
    });
  }

  const projectedNextMonthTotal =
    timelinePoints[1]?.projectedTotal ?? projectedCurrentMonthTotal;
  const averageProjectedMonthlySpend =
    timelinePoints.length > 0
      ? Math.round(
          timelinePoints.reduce((s, p) => s + p.projectedTotal, 0) / timelinePoints.length
        )
      : projectedCurrentMonthTotal;

  const projectedBudgetVariance =
    totalMonthlyBudgetLimit > 0
      ? totalMonthlyBudgetLimit - projectedCurrentMonthTotal
      : 0;
  const projectedBudgetUtilizationPercent =
    totalMonthlyBudgetLimit > 0
      ? Number(((projectedCurrentMonthTotal / totalMonthlyBudgetLimit) * 100).toFixed(1))
      : 0;

  const recurringShareOfProjectionPercent =
    projectedCurrentMonthTotal > 0
      ? Number(
          Math.min(
            100,
            (totalMonthlyRecurringCommitted / projectedCurrentMonthTotal) * 100
          ).toFixed(1)
        )
      : 0;
  const historicalTrendSharePercent = Number(
    Math.max(0, 100 - recurringShareOfProjectionPercent).toFixed(1)
  );

  return {
    referenceYearMonth,
    horizonMonths,
    scenario,
    scenarioMultiplier,
    activeRecurringExpenseRulesCount: eligibleExpenseRules.length,
    totalMonthlyRecurringCommitted,
    totalScheduledRecurringThisMonth,
    totalCurrentMonthActualSpent,
    totalHistoricalMonthlyAvg,
    totalHistoricalVariableAvg,
    historicalMonthsAnalyzed: sortedHistoricalMonths.length,
    projectedCurrentMonthDiscretionary,
    projectedCurrentMonthTotal,
    projectedNextMonthTotal,
    averageProjectedMonthlySpend,
    totalMonthlyBudgetLimit,
    projectedBudgetVariance,
    projectedBudgetOverage,
    projectedBudgetUtilizationPercent,
    recurringShareOfProjectionPercent,
    historicalTrendSharePercent,
    projectedOverBudgetCategoriesCount,
    atRiskCategoriesCount,
    onTrackCategoriesCount,
    categories: categoryRows,
    timelinePoints,
  };
}

export interface RecurringHistoricalProjectionCardProps {
  transactions: MoneyTransaction[];
  recurringRules?: RecurringRule[];
  categories?: MoneyCategory[];
  selectedMonth: string;
  thresholdOverrides?: Record<string, number> | number;
  onAlignCategoryBudget?: (categoryName: string, newLimit: number) => Promise<void> | void;
  onOpenRecurringScheduler?: () => void;
}

export const RecurringHistoricalProjectionCard: React.FC<
  RecurringHistoricalProjectionCardProps
> = ({
  transactions,
  recurringRules = INITIAL_RECURRING_RULES,
  categories = INITIAL_CATEGORIES,
  selectedMonth,
  thresholdOverrides,
  onAlignCategoryBudget,
  onOpenRecurringScheduler,
}) => {
  const [chartMode, setChartMode] =
    useState<RecurringProjectionChartMode>('category-stacked');
  const [scenario, setScenario] = useState<HistoricalTrendScenario>('baseline');
  const [includePausedRecurring, setIncludePausedRecurring] = useState<boolean>(false);

  const projection = useMemo(
    () =>
      computeRecurringAndHistoricalSpendingProjection(
        transactions,
        recurringRules,
        selectedMonth,
        categories,
        {
          horizonMonths: 6,
          includePausedRecurring,
          scenario,
          thresholdOverrides,
        }
      ),
    [
      transactions,
      recurringRules,
      selectedMonth,
      categories,
      includePausedRecurring,
      scenario,
      thresholdOverrides,
    ]
  );

  const isOverallProjectedOver =
    projection.totalMonthlyBudgetLimit > 0 &&
    projection.projectedCurrentMonthTotal > projection.totalMonthlyBudgetLimit;
  const isOverallAtRisk =
    !isOverallProjectedOver && projection.projectedBudgetUtilizationPercent >= 85;

  return (
    <article
      className="mm-stat-panel"
      data-testid="mm-recurring-historical-projection-card"
      style={{
        marginTop: 12,
        marginBottom: 14,
        borderRadius: 16,
        padding: '20px 24px',
        border: isOverallProjectedOver
          ? '1px solid rgba(239, 68, 68, 0.45)'
          : isOverallAtRisk
          ? '1px solid rgba(245, 158, 11, 0.45)'
          : '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Header & Controls */}
      <div
        className="mm-stat-panel-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.14)',
                color: '#6366f1',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={19} />
            </span>
            <div>
              <h3
                className="mm-stat-panel-title"
                style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}
                data-testid="mm-recurring-projection-title"
              >
                Projected Monthly Spending — Recurring Schedules &amp; Historical Trends (
                {selectedMonth})
              </h3>
              <p
                className="mm-section-desc"
                style={{ margin: '4px 0 0', fontSize: '0.81rem', color: 'var(--muted)' }}
              >
                Combines{' '}
                <strong>
                  {projection.activeRecurringExpenseRulesCount} active recurring rules
                </strong>{' '}
                ({formatINR(projection.totalMonthlyRecurringCommitted)}/mo fixed floor) with{' '}
                <strong>historical category spending trends</strong> (
                {formatINR(projection.projectedCurrentMonthDiscretionary)}/mo variable forecast)
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Chart & Scenario Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            role="group"
            aria-label="Projection Chart View Mode"
            style={{
              display: 'inline-flex',
              gap: 4,
              padding: 3,
              borderRadius: 8,
              background: 'var(--bg-darker)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setChartMode('category-stacked')}
              className={`mm-btn mm-btn-sm ${
                chartMode === 'category-stacked' ? 'mm-btn-primary' : 'mm-btn-ghost'
              }`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              data-testid="mm-rec-proj-mode-category-btn"
            >
              <BarChart3 size={13} />
              <span>By Category</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('forward-timeline')}
              className={`mm-btn mm-btn-sm ${
                chartMode === 'forward-timeline' ? 'mm-btn-primary' : 'mm-btn-ghost'
              }`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              data-testid="mm-rec-proj-mode-timeline-btn"
            >
              <CalendarClock size={13} />
              <span>6-Month Trajectory</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Historical Trend Sensitivity"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 3,
              borderRadius: 8,
              background: 'var(--bg-darker)',
              border: '1px solid var(--border)',
            }}
          >
            <Sliders size={12} style={{ marginLeft: 6, color: 'var(--muted)' }} />
            {(
              [
                { id: 'conservative', label: 'Conservative (-10%)' },
                { id: 'baseline', label: 'Baseline Trend' },
                { id: 'elevated', label: 'High Pace (+15%)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScenario(opt.id)}
                className={`mm-btn mm-btn-sm ${
                  scenario === opt.id ? 'mm-btn-primary' : 'mm-btn-ghost'
                }`}
                style={{ padding: '3px 8px', fontSize: '0.73rem' }}
                data-testid={`mm-rec-proj-scenario-${opt.id}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.76rem',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-darker)',
            }}
          >
            <input
              type="checkbox"
              checked={includePausedRecurring}
              onChange={(e) => setIncludePausedRecurring(e.target.checked)}
              data-testid="mm-rec-proj-include-paused-checkbox"
            />
            <span>Include Paused Rules</span>
          </label>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div
        className="mm-budget-planner-summary"
        style={{ marginBottom: 16 }}
        data-testid="mm-rec-proj-kpi-strip"
      >
        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Recurring Committed Baseline</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: '#6366f1' }}
            data-testid="mm-rec-proj-recurring-total"
          >
            {formatINR(projection.totalMonthlyRecurringCommitted)}
          </strong>
          <span className="mm-budget-kpi-sub">
            {projection.activeRecurringExpenseRulesCount} scheduled rules ·{' '}
            {projection.recurringShareOfProjectionPercent}% of projected spend
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Historical Trend Variable Spend</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: '#f59e0b' }}
            data-testid="mm-rec-proj-discretionary-total"
          >
            {formatINR(projection.projectedCurrentMonthDiscretionary)}
          </strong>
          <span className="mm-budget-kpi-sub">
            Historical avg: {formatINR(projection.totalHistoricalMonthlyAvg)}/mo ·{' '}
            {projection.historicalTrendSharePercent}% variable share
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Projected Monthly Spending Total</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color: isOverallProjectedOver
                ? '#ef4444'
                : isOverallAtRisk
                ? '#f59e0b'
                : '#10b981',
            }}
            data-testid="mm-rec-proj-combined-total"
          >
            {formatINR(projection.projectedCurrentMonthTotal)}
          </strong>
          <span className="mm-budget-kpi-sub">
            {projection.projectedBudgetUtilizationPercent}% of{' '}
            {formatINR(projection.totalMonthlyBudgetLimit)} monthly budget
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Next Month Projected Outflow</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: 'var(--accent)' }}
            data-testid="mm-rec-proj-next-month-total"
          >
            {formatINR(projection.projectedNextMonthTotal)}
          </strong>
          <span className="mm-budget-kpi-sub">
            6-mo avg forecast: {formatINR(projection.averageProjectedMonthlySpend)}/mo
          </span>
        </div>
      </div>

      {/* Primary Recharts Visualization */}
      <div
        style={{
          width: '100%',
          height: 310,
          marginBottom: 16,
          padding: '12px 12px 4px',
          borderRadius: 12,
          background: 'var(--bg-darker)',
          border: '1px solid var(--border)',
        }}
        data-testid="mm-rec-proj-recharts-container"
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'category-stacked' ? (
            <ComposedChart
              data={projection.categories}
              margin={{ top: 10, right: 18, left: 6, bottom: 26 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
              <XAxis
                dataKey="category"
                stroke="var(--muted)"
                fontSize={11}
                interval={0}
                angle={-14}
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
              <Legend verticalAlign="top" height={32} />
              <Bar
                dataKey="recurringMonthlyCommitment"
                name="Recurring Scheduled Floor (₹)"
                stackId="projected"
                fill="#6366f1"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="projectedDiscretionarySpend"
                name="Historical Trend Variable (₹)"
                stackId="projected"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              >
                {projection.categories.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={
                      entry.status === 'projected-over'
                        ? '#ef4444'
                        : entry.status === 'at-risk'
                        ? '#f59e0b'
                        : '#06b6d4'
                    }
                  />
                ))}
              </Bar>
              <Bar
                dataKey="historicalMonthlyAvg"
                name="Historical Monthly Avg (₹)"
                fill="rgba(148, 163, 184, 0.45)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="monthlyBudgetLimit"
                name="Category Budget Limit (₹)"
                stroke="#10b981"
                strokeWidth={2.2}
                dot={{ r: 3.5, fill: '#10b981' }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={projection.timelinePoints}
              margin={{ top: 10, right: 18, left: 6, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
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
              <Legend verticalAlign="top" height={32} />
              {projection.totalMonthlyBudgetLimit > 0 && (
                <ReferenceLine
                  y={projection.totalMonthlyBudgetLimit}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `Budget Limit: ${formatINR(projection.totalMonthlyBudgetLimit)}`,
                    fill: '#10b981',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Bar
                dataKey="recurringCommitted"
                name="Scheduled Recurring Outflow (₹)"
                stackId="monthlyProjection"
                fill="#6366f1"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="historicalTrendVariable"
                name="Historical Trend Variable (₹)"
                stackId="monthlyProjection"
                fill="#f59e0b"
                radius={[5, 5, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="projectedTotal"
                name="Total Projected Monthly Spend (₹)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#38bdf8' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Category-Level Recurring + Trend Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
        }}
        data-testid="mm-rec-proj-category-grid"
      >
        {projection.categories.slice(0, 6).map((row) => {
          const isOver = row.status === 'projected-over';
          const isRisk = row.status === 'at-risk';

          return (
            <div
              key={row.category}
              data-testid={`mm-rec-proj-cat-card-${row.category}`}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: isOver
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : isRisk
                  ? '1px solid rgba(245, 158, 11, 0.45)'
                  : '1px solid var(--border)',
                background: 'var(--bg-darker)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${row.color}22`,
                      color: row.color,
                    }}
                  >
                    {renderCategoryIcon(row.iconName, 14)}
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-heading)' }}>
                      {row.category}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <Repeat size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {row.recurringRuleCount}{' '}
                      {row.recurringRuleCount === 1 ? 'recurring rule' : 'recurring rules'} ·{' '}
                      <History size={10} style={{ display: 'inline', marginRight: 3 }} />
                      Hist avg {formatINR(row.historicalMonthlyAvg)}
                    </div>
                  </div>
                </div>

                <strong
                  style={{
                    fontSize: '0.92rem',
                    color: isOver
                      ? '#ef4444'
                      : isRisk
                      ? '#f59e0b'
                      : 'var(--text-heading)',
                  }}
                  data-testid={`mm-rec-proj-cat-total-${row.category}`}
                >
                  {formatINR(row.projectedMonthlyTotal)}
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                }}
              >
                <span>
                  Recurring:{' '}
                  <strong style={{ color: '#6366f1' }}>
                    {formatINR(row.recurringMonthlyCommitment)}
                  </strong>
                </span>
                <span>
                  Trend Var:{' '}
                  <strong style={{ color: '#f59e0b' }}>
                    {formatINR(row.projectedDiscretionarySpend)}
                  </strong>
                </span>
                <span>
                  Limit:{' '}
                  <strong>
                    {row.monthlyBudgetLimit > 0
                      ? formatINR(row.monthlyBudgetLimit)
                      : 'Unset'}
                  </strong>
                </span>
              </div>

              {row.matchingRuleTitles.length > 0 && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={row.matchingRuleTitles.join(', ')}
                >
                  Scheduled: {row.matchingRuleTitles.join(', ')}
                </div>
              )}

              {isOver && onAlignCategoryBudget && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={() =>
                      onAlignCategoryBudget(
                        row.category,
                        Math.ceil(row.projectedMonthlyTotal / 500) * 500
                      )
                    }
                    className="mm-btn mm-btn-sm mm-btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    data-testid={`mm-rec-proj-align-btn-${row.category}`}
                  >
                    <ArrowUpRight size={12} />
                    <span>
                      Align Limit ({formatINR(Math.ceil(row.projectedMonthlyTotal / 500) * 500)})
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Summary & Quick Link to Recurring Scheduler */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: '0.78rem',
          color: 'var(--muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isOverallProjectedOver ? (
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          ) : (
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
          )}
          <span>
            {projection.projectedOverBudgetCategoriesCount > 0 ? (
              <>
                <strong>{projection.projectedOverBudgetCategoriesCount}</strong>{' '}
                {projection.projectedOverBudgetCategoriesCount === 1
                  ? 'category is'
                  : 'categories are'}{' '}
                projected to exceed monthly limits by{' '}
                <strong style={{ color: '#ef4444' }}>
                  +{formatINR(projection.projectedBudgetOverage)}
                </strong>{' '}
                when combining recurring commitments and historical trends.
              </>
            ) : (
              <>
                All budgeted categories are projected to remain within limits across recurring
                commitments and historical spending trends.
              </>
            )}
          </span>
        </div>

        {onOpenRecurringScheduler && (
          <button
            type="button"
            onClick={onOpenRecurringScheduler}
            className="mm-btn mm-btn-sm mm-btn-ghost"
            style={{ fontSize: '0.75rem' }}
            data-testid="mm-rec-proj-open-scheduler-btn"
          >
            <Repeat size={13} />
            <span>Manage Recurring Rules</span>
          </button>
        )}
      </div>
    </article>
  );
};

export default RecurringHistoricalProjectionCard;
