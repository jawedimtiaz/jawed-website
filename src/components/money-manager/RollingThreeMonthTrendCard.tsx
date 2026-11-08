import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Bar,
  Line,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  formatINR,
  resolveTransactionInrAmount,
  type MoneyTransaction,
} from '../../db/db';

export type RollingTrendChartMode = 'composed' | 'area';

export interface RollingThreeMonthPoint {
  yearMonth: string;
  label: string;
  windowMonths: string[];
  windowLabel: string;
  actualIncome: number;
  actualExpense: number;
  actualNet: number;
  rolling3mIncome: number;
  rolling3mExpense: number;
  rolling3mNet: number;
  rolling3mSavingsRate: number;
  spendToIncomeRatioPercent: number;
}

export interface RollingThreeMonthTrendSummary {
  referenceYearMonth: string;
  horizonMonths: number;
  windowSize: 3;
  points: RollingThreeMonthPoint[];
  currentRolling3mIncome: number;
  currentRolling3mExpense: number;
  currentRolling3mNet: number;
  currentRolling3mSavingsRate: number;
  priorRolling3mIncome: number;
  priorRolling3mExpense: number;
  incomeTrendDeltaPercent: number;
  expenseTrendDeltaPercent: number;
  longTermDirection: 'improving' | 'stable' | 'widening-spend';
  peakRollingExpensePoint: RollingThreeMonthPoint | null;
  peakRollingIncomePoint: RollingThreeMonthPoint | null;
}

export interface ComputeRollingThreeMonthOptions {
  horizonMonths?: number;
}

export interface RollingThreeMonthTrendCardProps {
  transactions: MoneyTransaction[];
  selectedMonth: string;
  defaultHorizonMonths?: 6 | 12;
}

const SHORT_MONTH_NAMES = [
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

function offsetYearMonth(baseYearMonth: string, deltaMonths: number): string {
  const [yStr, mStr] = String(baseYearMonth || '2026-11').split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const month = Number.parseInt(mStr, 10) || 11;
  const dt = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatShortMonthLabel(yearMonth: string): string {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = Math.max(0, Math.min(11, (Number.parseInt(mStr, 10) || 11) - 1));
  return `${SHORT_MONTH_NAMES[monthIdx]} '${String(year).slice(-2)}`;
}

/**
 * Pure helper that computes the rolling 3-month average of spending vs. income
 * across a trailing multi-month horizon (default 12 months) ending at `referenceYearMonth`.
 * Strictly excludes internal `Transfer` transactions and normalizes multi-currency amounts to INR.
 */
export function computeRollingThreeMonthTrend(
  transactions: MoneyTransaction[] = [],
  referenceYearMonth: string = '2026-11',
  options: ComputeRollingThreeMonthOptions = {}
): RollingThreeMonthTrendSummary {
  const horizonMonths = Math.max(3, Math.min(24, options.horizonMonths ?? 12));
  const safeRefMonth =
    referenceYearMonth && /^\d{4}-\d{2}$/.test(referenceYearMonth)
      ? referenceYearMonth
      : '2026-11';

  // Aggregate monthly actual income & expense for (horizonMonths + 2) months
  // so the first displayed month still has a full 3-month lookback window (t-2, t-1, t).
  const totalLookbackMonths = horizonMonths + 2;
  const monthlyTotals = new Map<string, { income: number; expense: number }>();

  for (let i = totalLookbackMonths - 1; i >= 0; i -= 1) {
    const ym = offsetYearMonth(safeRefMonth, -i);
    monthlyTotals.set(ym, { income: 0, expense: 0 });
  }

  for (const tx of transactions || []) {
    if (!tx || !tx.date || tx.type === 'Transfer') continue;
    const ym = tx.date.slice(0, 7);
    const bucket = monthlyTotals.get(ym);
    if (!bucket) continue;

    const amountInr = resolveTransactionInrAmount(tx);
    if (tx.type === 'Income') {
      bucket.income += amountInr;
    } else if (tx.type === 'Expense') {
      bucket.expense += amountInr;
    }
  }

  const points: RollingThreeMonthPoint[] = [];

  for (let offset = horizonMonths - 1; offset >= 0; offset -= 1) {
    const ymCurrent = offsetYearMonth(safeRefMonth, -offset);
    const ymPrev1 = offsetYearMonth(safeRefMonth, -(offset + 1));
    const ymPrev2 = offsetYearMonth(safeRefMonth, -(offset + 2));

    const windowMonths = [ymPrev2, ymPrev1, ymCurrent];
    const b0 = monthlyTotals.get(ymPrev2) || { income: 0, expense: 0 };
    const b1 = monthlyTotals.get(ymPrev1) || { income: 0, expense: 0 };
    const b2 = monthlyTotals.get(ymCurrent) || { income: 0, expense: 0 };

    const actualIncome = Math.round(b2.income);
    const actualExpense = Math.round(b2.expense);
    const actualNet = actualIncome - actualExpense;

    const rolling3mIncome = Math.round((b0.income + b1.income + b2.income) / 3);
    const rolling3mExpense = Math.round((b0.expense + b1.expense + b2.expense) / 3);
    const rolling3mNet = rolling3mIncome - rolling3mExpense;
    const rolling3mSavingsRate =
      rolling3mIncome > 0
        ? Number((((rolling3mIncome - rolling3mExpense) / rolling3mIncome) * 100).toFixed(1))
        : 0;
    const spendToIncomeRatioPercent =
      rolling3mIncome > 0
        ? Number(((rolling3mExpense / rolling3mIncome) * 100).toFixed(1))
        : rolling3mExpense > 0
        ? 100
        : 0;

    points.push({
      yearMonth: ymCurrent,
      label: formatShortMonthLabel(ymCurrent),
      windowMonths,
      windowLabel: `${formatShortMonthLabel(ymPrev2)} – ${formatShortMonthLabel(ymCurrent)}`,
      actualIncome,
      actualExpense,
      actualNet,
      rolling3mIncome,
      rolling3mExpense,
      rolling3mNet,
      rolling3mSavingsRate,
      spendToIncomeRatioPercent,
    });
  }

  const latestPoint = points[points.length - 1] || {
    rolling3mIncome: 0,
    rolling3mExpense: 0,
    rolling3mNet: 0,
    rolling3mSavingsRate: 0,
  };

  // Compare against the rolling 3-month point 3 months earlier (or earliest available point)
  const comparisonIdx = Math.max(0, points.length - 4);
  const priorPoint = points[comparisonIdx] || latestPoint;

  const currentRolling3mIncome = latestPoint.rolling3mIncome;
  const currentRolling3mExpense = latestPoint.rolling3mExpense;
  const currentRolling3mNet = latestPoint.rolling3mNet;
  const currentRolling3mSavingsRate = latestPoint.rolling3mSavingsRate;

  const priorRolling3mIncome = priorPoint.rolling3mIncome;
  const priorRolling3mExpense = priorPoint.rolling3mExpense;

  const incomeTrendDeltaPercent =
    priorRolling3mIncome > 0
      ? Number(
          (
            ((currentRolling3mIncome - priorRolling3mIncome) / priorRolling3mIncome) *
            100
          ).toFixed(1)
        )
      : 0;

  const expenseTrendDeltaPercent =
    priorRolling3mExpense > 0
      ? Number(
          (
            ((currentRolling3mExpense - priorRolling3mExpense) / priorRolling3mExpense) *
            100
          ).toFixed(1)
        )
      : 0;

  let longTermDirection: 'improving' | 'stable' | 'widening-spend' = 'stable';
  if (
    currentRolling3mExpense > currentRolling3mIncome ||
    expenseTrendDeltaPercent - incomeTrendDeltaPercent > 5
  ) {
    longTermDirection = 'widening-spend';
  } else if (
    currentRolling3mNet > priorPoint.rolling3mNet ||
    expenseTrendDeltaPercent < incomeTrendDeltaPercent - 2
  ) {
    longTermDirection = 'improving';
  }

  const peakRollingExpensePoint =
    points.length > 0
      ? [...points].sort((a, b) => b.rolling3mExpense - a.rolling3mExpense)[0]
      : null;

  const peakRollingIncomePoint =
    points.length > 0
      ? [...points].sort((a, b) => b.rolling3mIncome - a.rolling3mIncome)[0]
      : null;

  return {
    referenceYearMonth: safeRefMonth,
    horizonMonths,
    windowSize: 3,
    points,
    currentRolling3mIncome,
    currentRolling3mExpense,
    currentRolling3mNet,
    currentRolling3mSavingsRate,
    priorRolling3mIncome,
    priorRolling3mExpense,
    incomeTrendDeltaPercent,
    expenseTrendDeltaPercent,
    longTermDirection,
    peakRollingExpensePoint,
    peakRollingIncomePoint,
  };
}

export const RollingThreeMonthTrendCard: React.FC<RollingThreeMonthTrendCardProps> = ({
  transactions,
  selectedMonth,
  defaultHorizonMonths = 12,
}) => {
  const [horizonMonths, setHorizonMonths] = useState<6 | 12>(defaultHorizonMonths);
  const [chartMode, setChartMode] = useState<RollingTrendChartMode>('composed');
  const [showActualBars, setShowActualBars] = useState<boolean>(true);

  const summary = useMemo(
    () =>
      computeRollingThreeMonthTrend(transactions, selectedMonth, {
        horizonMonths,
      }),
    [transactions, selectedMonth, horizonMonths]
  );

  const isWideningSpend = summary.longTermDirection === 'widening-spend';
  const isImproving = summary.longTermDirection === 'improving';

  return (
    <article
      className="mm-stat-panel"
      data-testid="mm-rolling-3m-trend-card"
      aria-label="Rolling 3-Month Average Spending vs Income Trend Chart"
      style={{
        marginTop: 12,
        marginBottom: 14,
        padding: '20px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Header & Interactive Controls */}
      <div
        className="mm-stat-panel-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2
              className="mm-stat-panel-title"
              style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Activity size={18} style={{ color: 'var(--accent)' }} />
              <span>
                Rolling 3-Month Average — Spending vs. Income Trend (
                {summary.points[0]?.label} –{' '}
                {summary.points[summary.points.length - 1]?.label})
              </span>
            </h2>

            <span
              className={`mm-budget-status-pill is-${
                isWideningSpend ? 'over' : isImproving ? 'on-track' : 'near'
              }`}
              data-testid="mm-rolling-3m-status-badge"
            >
              {isWideningSpend ? (
                <>
                  <AlertTriangle size={11} /> Spending Pace Rising
                </>
              ) : isImproving ? (
                <>
                  <CheckCircle2 size={11} /> Long-Term Surplus Improving
                </>
              ) : (
                <>
                  <TrendingUp size={11} /> Balanced 3-Mo Trajectory
                </>
              )}
            </span>
          </div>

          <p className="mm-section-desc" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
            Smooths out single-month spikes using a trailing 3-month moving window (t-2, t-1, t) to highlight structural spending vs. income trends
          </p>
        </div>

        {/* Horizon & Chart Style Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            role="group"
            aria-label="Select rolling trend horizon"
            style={{ display: 'inline-flex', gap: 6 }}
          >
            <button
              type="button"
              onClick={() => setHorizonMonths(6)}
              className={`mm-btn mm-btn-sm ${
                horizonMonths === 6 ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-rolling-3m-horizon-6"
            >
              6M Window
            </button>
            <button
              type="button"
              onClick={() => setHorizonMonths(12)}
              className={`mm-btn mm-btn-sm ${
                horizonMonths === 12 ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-rolling-3m-horizon-12"
            >
              12M Window
            </button>
          </div>

          <div
            role="group"
            aria-label="Select rolling chart visualization mode"
            style={{ display: 'inline-flex', gap: 6 }}
          >
            <button
              type="button"
              onClick={() => setChartMode('composed')}
              className={`mm-btn mm-btn-sm ${
                chartMode === 'composed' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-rolling-3m-mode-composed"
            >
              Rolling Lines + Bars
            </button>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`mm-btn mm-btn-sm ${
                chartMode === 'area' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-rolling-3m-mode-area"
            >
              Smoothed Area
            </button>
          </div>

          {chartMode === 'composed' && (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.76rem',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={showActualBars}
                onChange={(e) => setShowActualBars(e.target.checked)}
                data-testid="mm-rolling-3m-toggle-actual-bars"
              />
              <span>Monthly Bars</span>
            </label>
          )}
        </div>
      </div>

      {/* 4-Card KPI Summary Strip */}
      <div
        className="mm-budget-planner-summary"
        style={{ marginBottom: 14 }}
        data-testid="mm-rolling-3m-kpi-strip"
      >
        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">3-Mo Rolling Avg Income</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: '#10b981' }}
            data-testid="mm-rolling-3m-avg-income"
          >
            {formatINR(summary.currentRolling3mIncome)}
          </strong>
          <span className="mm-budget-kpi-sub">
            {summary.incomeTrendDeltaPercent >= 0 ? '+' : ''}
            {summary.incomeTrendDeltaPercent}% vs prior 3-mo window
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">3-Mo Rolling Avg Spending</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: '#ef4444' }}
            data-testid="mm-rolling-3m-avg-expense"
          >
            {formatINR(summary.currentRolling3mExpense)}
          </strong>
          <span className="mm-budget-kpi-sub">
            {summary.expenseTrendDeltaPercent >= 0 ? '+' : ''}
            {summary.expenseTrendDeltaPercent}% vs prior 3-mo window
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">3-Mo Rolling Net Cash Flow</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color: summary.currentRolling3mNet >= 0 ? '#06b6d4' : '#ef4444',
            }}
            data-testid="mm-rolling-3m-avg-net"
          >
            {formatINR(summary.currentRolling3mNet, true)}
          </strong>
          <span className="mm-budget-kpi-sub">
            Rolling 3-mo savings rate: <strong>{summary.currentRolling3mSavingsRate}%</strong>
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Long-Term Trend Signal</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color: isWideningSpend ? '#ef4444' : isImproving ? '#10b981' : '#f59e0b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            data-testid="mm-rolling-3m-direction"
          >
            {isWideningSpend ? (
              <>
                <TrendingUp size={16} /> Spending Outpacing
              </>
            ) : isImproving ? (
              <>
                <TrendingDown size={16} /> Spend Stabilizing
              </>
            ) : (
              <>Steady Equilibrium</>
            )}
          </strong>
          <span className="mm-budget-kpi-sub">
            Window: {summary.points[summary.points.length - 1]?.windowLabel}
          </span>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div
        style={{
          width: '100%',
          height: 320,
          padding: '12px 12px 4px',
          borderRadius: 12,
          background: 'var(--bg-darker)',
          border: '1px solid var(--border)',
          marginBottom: 14,
        }}
        data-testid="mm-rolling-3m-chart-container"
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'composed' ? (
            <ComposedChart
              data={summary.points}
              margin={{ top: 12, right: 18, left: 6, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
              <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatINR(value), name]}
                labelFormatter={(label: string, payload: any[]) => {
                  const pt = payload?.[0]?.payload as RollingThreeMonthPoint | undefined;
                  return pt ? `${label} (3M Window: ${pt.windowLabel})` : label;
                }}
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.35)" />

              {showActualBars && (
                <Bar
                  dataKey="actualIncome"
                  name="Monthly Income (Actual)"
                  fill="rgba(16, 185, 129, 0.22)"
                  radius={[4, 4, 0, 0]}
                />
              )}
              {showActualBars && (
                <Bar
                  dataKey="actualExpense"
                  name="Monthly Spending (Actual)"
                  fill="rgba(239, 68, 68, 0.22)"
                  radius={[4, 4, 0, 0]}
                />
              )}

              <Line
                type="monotone"
                dataKey="rolling3mIncome"
                name="3-Mo Rolling Avg Income"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="rolling3mExpense"
                name="3-Mo Rolling Avg Spending"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="rolling3mNet"
                name="3-Mo Rolling Net Cash Flow"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#06b6d4' }}
              />
            </ComposedChart>
          ) : (
            <AreaChart
              data={summary.points}
              margin={{ top: 12, right: 18, left: 6, bottom: 8 }}
            >
              <defs>
                <linearGradient id="mmRolling3mIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="mmRolling3mExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
              <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickFormatter={(val: number) => `₹${Math.round(val / 1000)}k`}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatINR(value), name]}
                labelFormatter={(label: string, payload: any[]) => {
                  const pt = payload?.[0]?.payload as RollingThreeMonthPoint | undefined;
                  return pt ? `${label} (3M Window: ${pt.windowLabel})` : label;
                }}
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.35)" />

              <Area
                type="monotone"
                dataKey="rolling3mIncome"
                name="3-Mo Rolling Avg Income"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#mmRolling3mIncomeGrad)"
              />
              <Area
                type="monotone"
                dataKey="rolling3mExpense"
                name="3-Mo Rolling Avg Spending"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#mmRolling3mExpenseGrad)"
              />
              <Line
                type="monotone"
                dataKey="rolling3mNet"
                name="3-Mo Rolling Net Cash Flow"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#06b6d4' }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Compact Rolling 3-Month Window Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
          gap: 8,
        }}
        data-testid="mm-rolling-3m-window-grid"
      >
        {summary.points.slice(-6).map((pt) => (
          <div
            key={pt.yearMonth}
            data-testid={`mm-rolling-3m-point-${pt.yearMonth}`}
            style={{
              padding: '9px 11px',
              borderRadius: 10,
              border:
                pt.yearMonth === selectedMonth
                  ? '1.5px solid var(--accent)'
                  : '1px solid var(--border)',
              background: 'var(--surface-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              fontSize: '0.75rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.8rem' }}>
                {pt.label}
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                {pt.windowLabel}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>3M Avg Income:</span>
              <strong style={{ color: '#10b981' }}>{formatINR(pt.rolling3mIncome)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>3M Avg Spend:</span>
              <strong style={{ color: '#ef4444' }}>{formatINR(pt.rolling3mExpense)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px dashed var(--border)',
                paddingTop: 3,
                marginTop: 2,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>3M Avg Net:</span>
              <strong style={{ color: pt.rolling3mNet >= 0 ? '#06b6d4' : '#ef4444' }}>
                {formatINR(pt.rolling3mNet, true)} ({pt.rolling3mSavingsRate}%)
              </strong>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};

export default RollingThreeMonthTrendCard;
