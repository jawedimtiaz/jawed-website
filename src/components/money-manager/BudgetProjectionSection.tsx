import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Sliders,
  Sparkles,
  Minus,
  Plus,
  History,
  BarChart3,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  formatINR,
  type MoneyCategory,
  type MoneyTransaction,
  type MonthlyMetrics,
  INITIAL_CATEGORIES,
} from '../../db/db';

export type ProjectionModelType = 'hybrid' | 'historical' | 'run-rate';

export interface CategoryBudgetProjectionItem {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  definedBudget: number;
  currentSpent: number;
  txCount: number;
  historicalMonthlyAvg: number;
  historicalMonthsCount: number;
  historicalTotalSpent: number;
  estimatedMonthEndTotal: number;
  projectedVariance: number;
  projectedOverage: number;
  projectedHeadroom: number;
  projectedUtilizationPercent: number;
  comparisonStatus: 'projected-over' | 'at-risk' | 'on-track' | 'unbudgeted';
  trendDirection: 'higher' | 'lower' | 'stable';
  trendPercentVsHistory: number;
  dailyBurnRate: number;
  daysRemaining: number;
  daysElapsed: number;
  daysInMonth: number;
}

export interface BudgetProjectionSummary {
  items: CategoryBudgetProjectionItem[];
  totalDefinedBudget: number;
  totalCurrentSpent: number;
  totalEstimatedMonthEnd: number;
  totalHistoricalMonthlyAvg: number;
  totalProjectedVariance: number;
  totalProjectedOverage: number;
  totalProjectedHeadroom: number;
  overallProjectedUtilizationPercent: number;
  overallComparisonStatus: 'projected-over' | 'at-risk' | 'on-track' | 'unbudgeted';
  projectedOverCount: number;
  atRiskCount: number;
  onTrackCount: number;
  unbudgetedCount: number;
  historicalMonthsAnalyzed: number;
  priorMonthsList: string[];
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  modelUsed: ProjectionModelType;
}

export interface CalculateBudgetProjectionsOptions {
  referenceDayOfMonth?: number;
  model?: ProjectionModelType;
  thresholdOverrides?: Record<string, number> | number;
}

/**
 * Pure calculation function that mines historical spending trends across prior months
 * stored in IndexedDB to compute an estimated end-of-month total and compare it against
 * the user's defined budget for each category.
 */
export function calculateBudgetProjections(
  transactions: MoneyTransaction[],
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  selectedMonth: string,
  options?: CalculateBudgetProjectionsOptions
): BudgetProjectionSummary {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = Number.parseInt(yearStr, 10) || 2026;
  const monthNum = Number.parseInt(monthStr, 10) || 11;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate() || 30;

  const currentMonthSpent = new Map<
    string,
    { spent: number; txCount: number; fixedOrVariable: 'Fixed' | 'Variable' }
  >();
  const historicalSpentMap = new Map<string, number>();
  const priorMonthsSet = new Set<string>();
  let maxTxDay = 0;

  // 1. Process transactions from IndexedDB
  for (const tx of transactions) {
    if (tx.type !== 'Expense') continue;
    const txYearMonth = tx.date.slice(0, 7);

    if (txYearMonth === selectedMonth) {
      const prev = currentMonthSpent.get(tx.category) ?? {
        spent: 0,
        txCount: 0,
        fixedOrVariable: tx.fixedOrVariable,
      };
      prev.spent += tx.amount;
      prev.txCount += 1;
      currentMonthSpent.set(tx.category, prev);

      const dayPart = Number.parseInt(tx.date.slice(8, 10), 10);
      if (!Number.isNaN(dayPart) && dayPart > maxTxDay) {
        maxTxDay = dayPart;
      }
    } else if (txYearMonth < selectedMonth) {
      priorMonthsSet.add(txYearMonth);
      historicalSpentMap.set(
        tx.category,
        (historicalSpentMap.get(tx.category) ?? 0) + tx.amount
      );
    }
  }

  // If no strictly prior months exist (e.g. earliest month), check if any non-current months exist
  if (priorMonthsSet.size === 0) {
    for (const tx of transactions) {
      if (tx.type !== 'Expense') continue;
      const txYearMonth = tx.date.slice(0, 7);
      if (txYearMonth !== selectedMonth) {
        priorMonthsSet.add(txYearMonth);
        historicalSpentMap.set(
          tx.category,
          (historicalSpentMap.get(tx.category) ?? 0) + tx.amount
        );
      }
    }
  }

  const historicalMonthsAnalyzed = priorMonthsSet.size;
  const daysElapsed =
    typeof options?.referenceDayOfMonth === 'number' && options.referenceDayOfMonth > 0
      ? Math.min(daysInMonth, Math.max(1, Math.round(options.referenceDayOfMonth)))
      : maxTxDay > 0
      ? Math.min(daysInMonth, Math.max(6, maxTxDay))
      : Math.min(daysInMonth, 15);

  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
  const modelUsed: ProjectionModelType = options?.model ?? 'hybrid';

  const expenseCategories = categories.filter((c) => c.type === 'Expense');
  const seenNames = new Set(expenseCategories.map((c) => c.name));

  // Include ad-hoc expense categories found in current month
  for (const [catName, stats] of currentMonthSpent.entries()) {
    if (!seenNames.has(catName)) {
      seenNames.add(catName);
      expenseCategories.push({
        id: `adhoc-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: catName,
        type: 'Expense',
        defaultFixedOrVariable: stats.fixedOrVariable,
        iconName: 'Tag',
        subCategories: [],
        color: '#06b6d4',
      });
    }
  }

  let totalDefinedBudget = 0;
  let totalCurrentSpent = 0;
  let totalEstimatedMonthEnd = 0;
  let totalHistoricalMonthlyAvg = 0;
  let totalProjectedOverage = 0;
  let totalProjectedHeadroom = 0;
  let projectedOverCount = 0;
  let atRiskCount = 0;
  let onTrackCount = 0;
  let unbudgetedCount = 0;

  const items: CategoryBudgetProjectionItem[] = expenseCategories.map((cat) => {
    let definedBudget = 0;
    if (typeof options?.thresholdOverrides === 'number') {
      definedBudget = options.thresholdOverrides;
    } else if (
      options?.thresholdOverrides &&
      typeof options.thresholdOverrides[cat.name] === 'number'
    ) {
      definedBudget = options.thresholdOverrides[cat.name];
    } else if (typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
      definedBudget = cat.monthlyBudget;
    }

    const currentStats = currentMonthSpent.get(cat.name);
    const currentSpent = currentStats ? currentStats.spent : 0;
    const txCount = currentStats ? currentStats.txCount : 0;

    const historicalTotalSpent = historicalSpentMap.get(cat.name) ?? 0;
    const historicalMonthlyAvg =
      historicalMonthsAnalyzed > 0
        ? Math.round(historicalTotalSpent / historicalMonthsAnalyzed)
        : 0;

    const dailyBurnRate = currentSpent > 0 ? Math.round(currentSpent / daysElapsed) : 0;
    const linearRunRate =
      currentSpent > 0 ? Math.round((currentSpent / daysElapsed) * daysInMonth) : 0;

    let estimatedMonthEndTotal = currentSpent;

    if (modelUsed === 'run-rate') {
      if (cat.defaultFixedOrVariable === 'Fixed') {
        estimatedMonthEndTotal =
          currentSpent > 0
            ? currentSpent
            : daysRemaining > 0
            ? Math.max(historicalMonthlyAvg, definedBudget)
            : 0;
      } else {
        estimatedMonthEndTotal =
          currentSpent > 0
            ? linearRunRate
            : historicalMonthlyAvg > 0 && daysRemaining > 0
            ? Math.round(historicalMonthlyAvg * (daysRemaining / daysInMonth))
            : 0;
      }
    } else if (modelUsed === 'historical') {
      if (cat.defaultFixedOrVariable === 'Fixed') {
        estimatedMonthEndTotal =
          currentSpent > 0
            ? currentSpent
            : historicalMonthlyAvg > 0
            ? historicalMonthlyAvg
            : definedBudget;
      } else {
        if (currentSpent > 0 && historicalMonthlyAvg > 0) {
          estimatedMonthEndTotal = Math.max(
            currentSpent,
            Math.round(historicalMonthlyAvg * 0.7 + linearRunRate * 0.3)
          );
        } else if (historicalMonthlyAvg > 0) {
          estimatedMonthEndTotal = historicalMonthlyAvg;
        } else {
          estimatedMonthEndTotal = linearRunRate;
        }
      }
    } else {
      // Smart Hybrid Model (Default)
      if (cat.defaultFixedOrVariable === 'Fixed') {
        if (currentSpent > 0) {
          estimatedMonthEndTotal = currentSpent;
        } else {
          estimatedMonthEndTotal =
            daysRemaining > 0 ? Math.max(historicalMonthlyAvg, definedBudget) : 0;
        }
      } else {
        if (currentSpent > 0 && historicalMonthlyAvg > 0) {
          const historicalWeight = Math.max(0.2, 1 - daysElapsed / daysInMonth);
          const paceWeight = 1 - historicalWeight;
          estimatedMonthEndTotal = Math.max(
            currentSpent,
            Math.round(linearRunRate * paceWeight + historicalMonthlyAvg * historicalWeight)
          );
        } else if (currentSpent > 0) {
          estimatedMonthEndTotal = Math.max(currentSpent, linearRunRate);
        } else if (historicalMonthlyAvg > 0 && daysRemaining > 0) {
          estimatedMonthEndTotal = Math.round(
            historicalMonthlyAvg * (daysRemaining / daysInMonth)
          );
        } else {
          estimatedMonthEndTotal = 0;
        }
      }
    }

    const projectedVariance =
      definedBudget > 0 ? definedBudget - estimatedMonthEndTotal : 0;
    const projectedOverage =
      definedBudget > 0 && estimatedMonthEndTotal > definedBudget
        ? estimatedMonthEndTotal - definedBudget
        : 0;
    const projectedHeadroom =
      definedBudget > 0 ? Math.max(0, definedBudget - estimatedMonthEndTotal) : 0;
    const projectedUtilizationPercent =
      definedBudget > 0
        ? Number(((estimatedMonthEndTotal / definedBudget) * 100).toFixed(1))
        : 0;

    let comparisonStatus: CategoryBudgetProjectionItem['comparisonStatus'] = 'unbudgeted';
    if (definedBudget <= 0) {
      comparisonStatus = 'unbudgeted';
      unbudgetedCount += 1;
    } else if (estimatedMonthEndTotal > definedBudget) {
      comparisonStatus = 'projected-over';
      projectedOverCount += 1;
    } else if (projectedUtilizationPercent >= 85) {
      comparisonStatus = 'at-risk';
      atRiskCount += 1;
    } else {
      comparisonStatus = 'on-track';
      onTrackCount += 1;
    }

    let trendDirection: 'higher' | 'lower' | 'stable' = 'stable';
    let trendPercentVsHistory = 0;
    if (historicalMonthlyAvg > 0 && estimatedMonthEndTotal > 0) {
      const diff = estimatedMonthEndTotal - historicalMonthlyAvg;
      trendPercentVsHistory = Number(((diff / historicalMonthlyAvg) * 100).toFixed(1));
      if (trendPercentVsHistory >= 10) {
        trendDirection = 'higher';
      } else if (trendPercentVsHistory <= -10) {
        trendDirection = 'lower';
      }
    }

    totalDefinedBudget += definedBudget;
    totalCurrentSpent += currentSpent;
    totalEstimatedMonthEnd += estimatedMonthEndTotal;
    totalHistoricalMonthlyAvg += historicalMonthlyAvg;
    totalProjectedOverage += projectedOverage;
    totalProjectedHeadroom += projectedHeadroom;

    return {
      categoryId: cat.id,
      category: cat.name,
      color: cat.color || '#06b6d4',
      iconName: cat.iconName || 'Tag',
      defaultFixedOrVariable: cat.defaultFixedOrVariable,
      definedBudget,
      currentSpent,
      txCount,
      historicalMonthlyAvg,
      historicalMonthsCount: historicalMonthsAnalyzed,
      historicalTotalSpent,
      estimatedMonthEndTotal,
      projectedVariance,
      projectedOverage,
      projectedHeadroom,
      projectedUtilizationPercent,
      comparisonStatus,
      trendDirection,
      trendPercentVsHistory,
      dailyBurnRate,
      daysRemaining,
      daysElapsed,
      daysInMonth,
    };
  });

  const totalProjectedVariance =
    totalDefinedBudget > 0 ? totalDefinedBudget - totalEstimatedMonthEnd : 0;
  const overallProjectedUtilizationPercent =
    totalDefinedBudget > 0
      ? Number(((totalEstimatedMonthEnd / totalDefinedBudget) * 100).toFixed(1))
      : 0;

  let overallComparisonStatus: BudgetProjectionSummary['overallComparisonStatus'] = 'unbudgeted';
  if (totalDefinedBudget <= 0) {
    overallComparisonStatus = 'unbudgeted';
  } else if (totalEstimatedMonthEnd > totalDefinedBudget) {
    overallComparisonStatus = 'projected-over';
  } else if (overallProjectedUtilizationPercent >= 85) {
    overallComparisonStatus = 'at-risk';
  } else {
    overallComparisonStatus = 'on-track';
  }

  return {
    items,
    totalDefinedBudget,
    totalCurrentSpent,
    totalEstimatedMonthEnd,
    totalHistoricalMonthlyAvg,
    totalProjectedVariance,
    totalProjectedOverage,
    totalProjectedHeadroom,
    overallProjectedUtilizationPercent,
    overallComparisonStatus,
    projectedOverCount,
    atRiskCount,
    onTrackCount,
    unbudgetedCount,
    historicalMonthsAnalyzed,
    priorMonthsList: Array.from(priorMonthsSet).sort(),
    daysInMonth,
    daysElapsed,
    daysRemaining,
    modelUsed,
  };
}

export interface BudgetProjectionSectionProps {
  transactions: MoneyTransaction[];
  categories: MoneyCategory[];
  selectedMonth: string;
  metrics: MonthlyMetrics;
  onSaveCategory?: (category: MoneyCategory) => Promise<void>;
  onAlignCategoryBudget?: (categoryName: string, newLimit: number) => Promise<void>;
}

export const BudgetProjectionSection: React.FC<BudgetProjectionSectionProps> = ({
  transactions,
  categories,
  selectedMonth,
  metrics,
  onSaveCategory,
  onAlignCategoryBudget,
}) => {
  const [model, setModel] = useState<ProjectionModelType>('hybrid');
  const [dayOverride, setDayOverride] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'projected-over' | 'at-risk' | 'on-track' | 'unbudgeted'
  >('all');
  const [sortBy, setSortBy] = useState<
    'overage-desc' | 'projected-desc' | 'budget-desc' | 'spent-desc' | 'name-asc'
  >('overage-desc');
  const [appliedCategorySuccess, setAppliedCategorySuccess] = useState<string | null>(null);
  const [showProjectionChart, setShowProjectionChart] = useState(true);

  // Compute projections
  const projectionSummary = useMemo(() => {
    return calculateBudgetProjections(transactions, categories, selectedMonth, {
      referenceDayOfMonth: dayOverride ?? undefined,
      model,
    });
  }, [transactions, categories, selectedMonth, dayOverride, model]);

  // Filter & sort
  const filteredItems = useMemo(() => {
    let list = projectionSummary.items;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.category.toLowerCase().includes(q) ||
          i.defaultFixedOrVariable.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((i) => i.comparisonStatus === statusFilter);
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'overage-desc') {
        return (
          b.projectedOverage - a.projectedOverage ||
          b.projectedUtilizationPercent - a.projectedUtilizationPercent ||
          b.estimatedMonthEndTotal - a.estimatedMonthEndTotal
        );
      }
      if (sortBy === 'projected-desc') {
        return b.estimatedMonthEndTotal - a.estimatedMonthEndTotal;
      }
      if (sortBy === 'budget-desc') {
        return b.definedBudget - a.definedBudget;
      }
      if (sortBy === 'spent-desc') {
        return b.currentSpent - a.currentSpent;
      }
      return a.category.localeCompare(b.category);
    });
  }, [projectionSummary.items, searchQuery, statusFilter, sortBy]);

  const handleApplySingleProjection = async (item: CategoryBudgetProjectionItem) => {
    const roundedLimit = Math.max(1000, Math.ceil(item.estimatedMonthEndTotal / 500) * 500);
    if (onAlignCategoryBudget) {
      await onAlignCategoryBudget(item.category, roundedLimit);
    } else {
      const cat = categories.find((c) => c.name === item.category);
      if (cat && onSaveCategory) {
        await onSaveCategory({ ...cat, monthlyBudget: roundedLimit });
      }
    }
    setAppliedCategorySuccess(item.category);
    setTimeout(() => {
      setAppliedCategorySuccess((prev) => (prev === item.category ? null : prev));
    }, 2800);
  };

  const handleApplyAllProjections = async () => {
    for (const item of projectionSummary.items) {
      if (item.estimatedMonthEndTotal > 0) {
        const roundedLimit = Math.max(
          1000,
          Math.ceil((item.estimatedMonthEndTotal * 1.05) / 500) * 500
        );
        if (onAlignCategoryBudget) {
          await onAlignCategoryBudget(item.category, roundedLimit);
        } else {
          const cat = categories.find((c) => c.name === item.category);
          if (cat && onSaveCategory) {
            await onSaveCategory({ ...cat, monthlyBudget: roundedLimit });
          }
        }
      }
    }
    setAppliedCategorySuccess('ALL');
    setTimeout(() => {
      setAppliedCategorySuccess((prev) => (prev === 'ALL' ? null : prev));
    }, 3200);
  };

  const isOverBudget =
    projectionSummary.totalEstimatedMonthEnd > projectionSummary.totalDefinedBudget &&
    projectionSummary.totalDefinedBudget > 0;
  const isNearLimit =
    !isOverBudget && projectionSummary.overallProjectedUtilizationPercent >= 85;

  return (
    <article
      className="mm-stat-panel"
      data-testid="mm-budget-projection-section"
      style={{
        borderRadius: 16,
        padding: '20px 24px',
        border: isOverBudget
          ? '1px solid rgba(239, 68, 68, 0.45)'
          : isNearLimit
          ? '1px solid rgba(245, 158, 11, 0.45)'
          : '1px solid var(--border)',
        background: isOverBudget
          ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, var(--surface) 100%)'
          : isNearLimit
          ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, var(--surface) 100%)'
          : 'var(--surface)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isOverBudget
                  ? 'rgba(239, 68, 68, 0.16)'
                  : isNearLimit
                  ? 'rgba(245, 158, 11, 0.16)'
                  : 'rgba(16, 185, 129, 0.16)',
                color: isOverBudget
                  ? '#ef4444'
                  : isNearLimit
                  ? '#f59e0b'
                  : '#10b981',
              }}
              data-testid="mm-budget-projection-icon"
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-heading)',
                  }}
                  data-testid="mm-budget-projection-title"
                >
                  Budget Projection
                </h2>
                <span
                  className={`mm-budget-status-pill is-${
                    isOverBudget ? 'over' : isNearLimit ? 'near' : 'on-track'
                  }`}
                  data-testid="mm-budget-projection-status-badge"
                  style={{ fontSize: '0.78rem', padding: '3px 10px' }}
                >
                  {isOverBudget
                    ? `Projected Over Budget (${projectionSummary.overallProjectedUtilizationPercent}%)`
                    : isNearLimit
                    ? `At Risk (${projectionSummary.overallProjectedUtilizationPercent}%)`
                    : `On Track (${projectionSummary.overallProjectedUtilizationPercent}% Projected)`}
                </span>
                <span
                  style={{
                    fontSize: '0.73rem',
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3b82f6',
                    fontWeight: 600,
                  }}
                  data-testid="mm-projection-history-badge"
                >
                  <History size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {projectionSummary.historicalMonthsAnalyzed > 0
                    ? `Analyzed ${projectionSummary.historicalMonthsAnalyzed} prior months in IndexedDB`
                    : 'Current Month Run-Rate'}
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.82rem',
                  color: 'var(--muted)',
                  lineHeight: 1.45,
                }}
                data-testid="mm-budget-projection-subtitle"
              >
                Calculates estimated end-of-month spending totals based on historical IndexedDB trends
                and compares them directly against your defined category budget limits.
              </p>
            </div>
          </div>
        </div>

        {/* Projection Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Model Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px',
              borderRadius: 8,
              background: 'var(--bg-darker)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setModel('hybrid')}
              className={`mm-btn mm-btn-sm ${model === 'hybrid' ? 'mm-btn-primary' : 'mm-btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              title="Smart blend of daily run-rate velocity and multi-month historical average"
              data-testid="mm-projection-model-hybrid"
            >
              Hybrid Pace
            </button>
            <button
              type="button"
              onClick={() => setModel('historical')}
              className={`mm-btn mm-btn-sm ${
                model === 'historical' ? 'mm-btn-primary' : 'mm-btn-ghost'
              }`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              title="Weighted primarily by multi-month IndexedDB history"
              data-testid="mm-projection-model-historical"
            >
              History Trend
            </button>
            <button
              type="button"
              onClick={() => setModel('run-rate')}
              className={`mm-btn mm-btn-sm ${
                model === 'run-rate' ? 'mm-btn-primary' : 'mm-btn-ghost'
              }`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              title="Pure linear velocity extrapolation based on days elapsed"
              data-testid="mm-projection-model-runrate"
            >
              Daily Run-Rate
            </button>
          </div>

          {/* Pace Simulator Slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.76rem',
              color: 'var(--muted)',
              padding: '4px 8px',
              borderRadius: 8,
              background: 'var(--bg-darker)',
              border: '1px solid var(--border)',
            }}
          >
            <Sliders size={13} />
            <label htmlFor="mm-projection-day-slider" style={{ fontWeight: 600 }}>
              Day {projectionSummary.daysElapsed}/{projectionSummary.daysInMonth}:
            </label>
            <input
              id="mm-projection-day-slider"
              type="range"
              min={1}
              max={projectionSummary.daysInMonth}
              value={projectionSummary.daysElapsed}
              onChange={(e) => setDayOverride(Number(e.target.value))}
              style={{ width: 85, cursor: 'pointer', accentColor: 'var(--accent)' }}
              aria-label="Simulate elapsed day of month for budget projection"
              data-testid="mm-projection-day-slider"
            />
            {dayOverride !== null && (
              <button
                type="button"
                onClick={() => setDayOverride(null)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                style={{ padding: '1px 5px', fontSize: '0.7rem' }}
                title="Reset to current calendar day"
                data-testid="mm-projection-day-reset"
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>

          {/* Quick Action: Apply All Projections */}
          <button
            type="button"
            onClick={handleApplyAllProjections}
            className="mm-btn mm-btn-sm mm-btn-secondary"
            title="Auto-align all category budget limits to cover projected end-of-month spending"
            data-testid="mm-projection-apply-all-btn"
          >
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            <span>Align All Budgets</span>
          </button>
        </div>
      </div>

      {appliedCategorySuccess && (
        <div
          role="status"
          data-testid="mm-projection-success-toast"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            marginBottom: 14,
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontSize: '0.82rem',
            color: 'var(--text-heading)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>
            {appliedCategorySuccess === 'ALL'
              ? 'Successfully updated all category budget limits to cover projected month-end totals!'
              : `Updated defined budget limit for ${appliedCategorySuccess} to match its projected total.`}
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        className="mm-burn-rate-stats-grid"
        style={{
          borderTop: 'none',
          paddingTop: 0,
          marginBottom: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
        data-testid="mm-projection-kpi-grid"
      >
        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Total Defined Budget</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: 'var(--text-heading)' }}
            data-testid="mm-projection-total-budget"
          >
            {formatINR(projectionSummary.totalDefinedBudget)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Sum of user limits
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Current Spent-to-Date</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: 'var(--text-heading)' }}
            data-testid="mm-projection-current-spent"
          >
            {formatINR(projectionSummary.totalCurrentSpent)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Day {projectionSummary.daysElapsed} ({projectionSummary.daysRemaining} days left)
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Estimated Month-End Total</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{
              color: isOverBudget ? '#ef4444' : isNearLimit ? '#f59e0b' : '#10b981',
            }}
            data-testid="mm-projection-total-estimated"
          >
            {formatINR(projectionSummary.totalEstimatedMonthEnd)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {projectionSummary.overallProjectedUtilizationPercent}% of defined budget
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">
            {isOverBudget ? 'Projected Total Overage' : 'Projected Safe Headroom'}
          </span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: isOverBudget ? '#ef4444' : '#10b981' }}
            data-testid="mm-projection-variance-val"
          >
            {isOverBudget
              ? `+${formatINR(projectionSummary.totalProjectedOverage)}`
              : formatINR(projectionSummary.totalProjectedHeadroom)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {isOverBudget ? 'Total category deficit' : 'Under defined budget'}
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">IndexedDB Historical Avg</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: 'var(--accent)' }}
            data-testid="mm-projection-historical-avg"
          >
            {formatINR(projectionSummary.totalHistoricalMonthlyAvg)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Avg monthly historical baseline
          </span>
        </div>
      </div>

      {/* Dual Progress Bar for Overall Projection */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--muted)',
            marginBottom: 6,
          }}
        >
          <span>
            Current Spend: <strong>{formatINR(projectionSummary.totalCurrentSpent)}</strong> ·{' '}
            Estimated Month-End:{' '}
            <strong
              style={{
                color: isOverBudget ? '#ef4444' : isNearLimit ? '#f59e0b' : '#10b981',
              }}
            >
              {formatINR(projectionSummary.totalEstimatedMonthEnd)}
            </strong>
          </span>
          <span>
            Defined Limit: <strong>{formatINR(projectionSummary.totalDefinedBudget)}</strong>
          </span>
        </div>

        <div
          className="mm-burn-rate-track"
          style={{ position: 'relative', height: 16 }}
          data-testid="mm-projection-master-track"
        >
          {/* Projected Extension */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${Math.min(100, projectionSummary.overallProjectedUtilizationPercent)}%`,
              backgroundColor: isOverBudget
                ? 'rgba(239, 68, 68, 0.35)'
                : isNearLimit
                ? 'rgba(245, 158, 11, 0.35)'
                : 'rgba(16, 185, 129, 0.35)',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
            data-testid="mm-projection-ghost-fill"
          />
          {/* Current Spent Fill */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              width: `${
                projectionSummary.totalDefinedBudget > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (projectionSummary.totalCurrentSpent /
                          projectionSummary.totalDefinedBudget) *
                          100
                      )
                    )
                  : 0
              }%`,
              backgroundColor: isOverBudget
                ? '#ef4444'
                : isNearLimit
                ? '#f59e0b'
                : '#10b981',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
            data-testid="mm-projection-current-fill"
          />
        </div>
      </div>

      {/* Comparison Chart Toggle & Container */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          background: 'var(--bg-darker)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showProjectionChart ? 12 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={15} style={{ color: 'var(--accent)' }} />
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-heading)' }}>
              Category Comparison: Defined Budget vs. Estimated Total vs. History
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setShowProjectionChart((prev) => !prev)}
            className="mm-btn mm-btn-sm mm-btn-ghost"
            style={{ fontSize: '0.74rem' }}
            data-testid="mm-projection-chart-toggle"
          >
            {showProjectionChart ? 'Hide Chart' : 'Show Chart'}
          </button>
        </div>

        {showProjectionChart && (
          <div style={{ width: '100%', height: 260 }} data-testid="mm-projection-comparison-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectionSummary.items}
                margin={{ top: 8, right: 16, left: 4, bottom: 25 }}
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
                <Legend />
                <Bar
                  dataKey="definedBudget"
                  name="Defined Budget (₹)"
                  fill="rgba(148, 163, 184, 0.45)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="currentSpent"
                  name="Current Spent (₹)"
                  radius={[4, 4, 0, 0]}
                >
                  {projectionSummary.items.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Bar>
                <Bar
                  dataKey="estimatedMonthEndTotal"
                  name="Estimated Total (₹)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="historicalMonthlyAvg"
                  name="Historical Avg (₹)"
                  fill="rgba(59, 130, 246, 0.65)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
        data-testid="mm-projection-filter-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`mm-btn mm-btn-sm ${
              statusFilter === 'all' ? 'mm-btn-primary' : 'mm-btn-ghost'
            }`}
            style={{ fontSize: '0.74rem' }}
            data-testid="mm-projection-filter-all"
          >
            All Categories ({projectionSummary.items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('projected-over')}
            className={`mm-btn mm-btn-sm ${
              statusFilter === 'projected-over' ? 'mm-btn-danger' : 'mm-btn-ghost'
            }`}
            style={{ fontSize: '0.74rem' }}
            data-testid="mm-projection-filter-over"
          >
            Projected Over ({projectionSummary.projectedOverCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('at-risk')}
            className={`mm-btn mm-btn-sm ${
              statusFilter === 'at-risk' ? 'mm-btn-secondary' : 'mm-btn-ghost'
            }`}
            style={{ fontSize: '0.74rem', color: '#f59e0b' }}
            data-testid="mm-projection-filter-risk"
          >
            At Risk 85–100% ({projectionSummary.atRiskCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('on-track')}
            className={`mm-btn mm-btn-sm ${
              statusFilter === 'on-track' ? 'mm-btn-secondary' : 'mm-btn-ghost'
            }`}
            style={{ fontSize: '0.74rem', color: '#10b981' }}
            data-testid="mm-projection-filter-ontrack"
          >
            On Track ({projectionSummary.onTrackCount})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projection..."
            className="mm-input"
            style={{ maxWidth: 180, padding: '4px 10px', fontSize: '0.78rem' }}
            data-testid="mm-projection-search-input"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="mm-input"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
            data-testid="mm-projection-sort-select"
          >
            <option value="overage-desc">Highest Projected Deficit</option>
            <option value="projected-desc">Highest Estimated Total</option>
            <option value="budget-desc">Highest Defined Budget</option>
            <option value="spent-desc">Highest Current Spent</option>
            <option value="name-asc">Category (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Per-Category Comparison Cards */}
      <div className="mm-budget-plan-grid" data-testid="mm-projection-cards-grid">
        {filteredItems.map((item) => {
          const isItemOver = item.comparisonStatus === 'projected-over';
          const isItemRisk = item.comparisonStatus === 'at-risk';
          const isItemOnTrack = item.comparisonStatus === 'on-track';

          return (
            <div
              key={item.category}
              className={`mm-budget-plan-card ${
                isItemOver ? 'is-over' : isItemRisk ? 'is-near' : ''
              }`}
              style={{
                border: isItemOver
                  ? '1px solid rgba(239, 68, 68, 0.45)'
                  : isItemRisk
                  ? '1px solid rgba(245, 158, 11, 0.45)'
                  : '1px solid var(--border)',
              }}
              data-testid={`mm-projection-card-${item.category}`}
            >
              {/* Card Top */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isItemOver && (
                        <AlertTriangle
                          size={14}
                          style={{ color: '#ef4444', flexShrink: 0 }}
                          data-testid={`mm-projection-warning-${item.category}`}
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

                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {item.txCount} txs · Historical avg: {formatINR(item.historicalMonthlyAvg)}
                      {item.trendDirection !== 'stable' && (
                        <span
                          style={{
                            marginLeft: 5,
                            color: item.trendDirection === 'higher' ? '#ef4444' : '#10b981',
                            fontWeight: 600,
                          }}
                        >
                          ({item.trendDirection === 'higher' ? '+' : ''}
                          {item.trendPercentVsHistory}% vs history)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`mm-budget-status-pill is-${
                    isItemOver ? 'over' : isItemRisk ? 'near' : isItemOnTrack ? 'on-track' : 'unbudgeted'
                  }`}
                  data-testid={`mm-projection-status-badge-${item.category}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {isItemOver
                    ? `Over by ${formatINR(item.projectedOverage)}`
                    : isItemRisk
                    ? `At Risk (${item.projectedUtilizationPercent}%)`
                    : isItemOnTrack
                    ? `On Track (${item.projectedUtilizationPercent}%)`
                    : 'Unbudgeted'}
                </span>
              </div>

              {/* Comparison Metric Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  margin: '10px 0 8px',
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-darker)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.69rem', color: 'var(--muted)', display: 'block' }}>
                    Defined Budget
                  </span>
                  <strong
                    style={{ fontSize: '0.84rem', color: 'var(--text-heading)' }}
                    data-testid={`mm-projection-defined-budget-${item.category}`}
                  >
                    {item.definedBudget > 0 ? formatINR(item.definedBudget) : 'None'}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.69rem', color: 'var(--muted)', display: 'block' }}>
                    Current Spent
                  </span>
                  <strong
                    style={{ fontSize: '0.84rem', color: 'var(--text-heading)' }}
                    data-testid={`mm-projection-spent-${item.category}`}
                  >
                    {formatINR(item.currentSpent)}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.69rem', color: 'var(--muted)', display: 'block' }}>
                    Estimated Total
                  </span>
                  <strong
                    style={{
                      fontSize: '0.84rem',
                      color: isItemOver ? '#ef4444' : isItemRisk ? '#f59e0b' : '#10b981',
                    }}
                    data-testid={`mm-projection-estimated-${item.category}`}
                  >
                    {formatINR(item.estimatedMonthEndTotal)}
                  </strong>
                </div>
              </div>

              {/* Dual Visual Bar */}
              <div
                className="mm-burn-rate-track"
                style={{ position: 'relative', height: 10, margin: '6px 0 8px' }}
                data-testid={`mm-projection-track-${item.category}`}
              >
                {/* Projected Extension */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${Math.min(100, item.projectedUtilizationPercent)}%`,
                    backgroundColor: isItemOver
                      ? 'rgba(239, 68, 68, 0.35)'
                      : isItemRisk
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(16, 185, 129, 0.35)',
                    borderRadius: 999,
                  }}
                  data-testid={`mm-projection-track-ghost-${item.category}`}
                />
                {/* Current Spent Fill */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    height: '100%',
                    width: `${
                      item.definedBudget > 0
                        ? Math.min(100, Math.round((item.currentSpent / item.definedBudget) * 100))
                        : 0
                    }%`,
                    backgroundColor: isItemOver
                      ? '#ef4444'
                      : isItemRisk
                      ? '#f59e0b'
                      : item.color,
                    borderRadius: 999,
                  }}
                  data-testid={`mm-projection-track-fill-${item.category}`}
                />
              </div>

              {/* Comparison Footer & Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '1px dashed var(--border)',
                  fontSize: '0.74rem',
                }}
              >
                <span
                  style={{
                    color: isItemOver ? '#ef4444' : isItemRisk ? '#f59e0b' : '#10b981',
                    fontWeight: 600,
                  }}
                  data-testid={`mm-projection-variance-${item.category}`}
                >
                  {isItemOver
                    ? `+${formatINR(item.projectedOverage)} over defined budget`
                    : item.definedBudget > 0
                    ? `${formatINR(item.projectedHeadroom)} projected headroom`
                    : 'No budget set'}
                </span>

                <button
                  type="button"
                  onClick={() => handleApplySingleProjection(item)}
                  className="mm-btn mm-btn-sm mm-btn-ghost"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    color: isItemOver ? '#f59e0b' : 'var(--text-heading)',
                    border: '1px solid var(--border)',
                  }}
                  title="Update this category's defined monthly budget to match the estimated total"
                  data-testid={`mm-projection-set-budget-btn-${item.category}`}
                >
                  <Target size={11} style={{ marginRight: 3 }} />
                  <span>Set Budget to Projected</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};
