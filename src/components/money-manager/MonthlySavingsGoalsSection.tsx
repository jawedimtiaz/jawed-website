import React, { useState, useEffect, useMemo } from 'react';
import {
  PiggyBank,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Zap,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';
import {
  formatINR,
  type MonthlyMetrics,
  type SinkingFund,
  type MoneyTransaction,
} from '../../db/db';

export interface MonthlySavingsGoalsSectionProps {
  selectedMonth: string;
  metrics: MonthlyMetrics;
  transactions: MoneyTransaction[];
  sinkingFunds: SinkingFund[];
  onUpdateSavingsTarget?: (month: string, targetAmount: number) => Promise<void> | void;
}

const STORAGE_KEY_PREFIX = 'mm_savings_target_';
const memSavingsStorage = new Map<string, string>();

function getSafeStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => memSavingsStorage.get(key) || null,
    setItem: (key: string, val: string) => memSavingsStorage.set(key, String(val)),
    removeItem: (key: string) => memSavingsStorage.delete(key),
  };
}

export function getStoredSavingsTarget(selectedMonth: string, monthlyIncome: number): number {
  try {
    const key = `${STORAGE_KEY_PREFIX}${selectedMonth}`;
    const stored = getSafeStorage().getItem(key);
    if (stored !== null) {
      const parsed = Number.parseFloat(stored);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read savings target from storage:', err);
  }
  // Default recommended savings target: 20% of monthly income or ₹30,000
  const defaultFromIncome = monthlyIncome > 0 ? Math.round((monthlyIncome * 0.2) / 500) * 500 : 30000;
  return Math.max(10000, defaultFromIncome);
}

export function storeSavingsTarget(selectedMonth: string, targetAmount: number): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${selectedMonth}`;
    getSafeStorage().setItem(key, String(targetAmount));
  } catch (err) {
    console.warn('Failed to save savings target to storage:', err);
  }
}

export const MonthlySavingsGoalsSection: React.FC<MonthlySavingsGoalsSectionProps> = ({
  selectedMonth,
  metrics,
  transactions,
  sinkingFunds,
  onUpdateSavingsTarget,
}) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = Number.parseInt(yearStr, 10) || 2026;
  const monthNum = Number.parseInt(monthStr, 10) || 11;
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate() || 30;

  // Compute days elapsed in the selected month
  const daysElapsed = useMemo(() => {
    let maxDay = 0;
    for (const tx of transactions) {
      if (tx.date.startsWith(selectedMonth)) {
        const d = Number.parseInt(tx.date.slice(8, 10), 10);
        if (!Number.isNaN(d) && d > maxDay) {
          maxDay = d;
        }
      }
    }
    return maxDay > 0 ? Math.min(daysInMonth, maxDay) : 15;
  }, [transactions, selectedMonth, daysInMonth]);

  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  // User defined monthly savings target state
  const [savingsTarget, setSavingsTarget] = useState<number>(() =>
    getStoredSavingsTarget(selectedMonth, metrics.income)
  );

  const [inputTarget, setInputTarget] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Sync state when selectedMonth changes
  useEffect(() => {
    const loaded = getStoredSavingsTarget(selectedMonth, metrics.income);
    setSavingsTarget(loaded);
    setInputTarget(String(loaded));
  }, [selectedMonth, metrics.income]);

  const handleSaveTarget = async (newTarget: number) => {
    const safeTarget = Math.max(0, Math.round(newTarget));
    setSavingsTarget(safeTarget);
    setInputTarget(String(safeTarget));
    storeSavingsTarget(selectedMonth, safeTarget);
    if (onUpdateSavingsTarget) {
      await onUpdateSavingsTarget(selectedMonth, safeTarget);
    }
    setSaveSuccessNotice(`Target updated to ${formatINR(safeTarget)} for ${selectedMonth}`);
    setTimeout(() => {
      setSaveSuccessNotice((prev) => (prev?.includes(formatINR(safeTarget)) ? null : prev));
    }, 2800);
  };

  const handleStepTarget = (delta: number) => {
    const next = Math.max(0, savingsTarget + delta);
    handleSaveTarget(next);
  };

  const handleInputChange = (val: string) => {
    setInputTarget(val);
    const parsed = Number.parseFloat(val);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setSavingsTarget(parsed);
      storeSavingsTarget(selectedMonth, parsed);
    }
  };

  // Real-time Savings Calculations
  const currentNetSavings = metrics.netBalance; // Income - Expense
  const currentSavingsRatePercent = metrics.savingsRate; // % of Income saved

  const targetProgressPercent =
    savingsTarget > 0
      ? Number(((currentNetSavings / savingsTarget) * 100).toFixed(1))
      : 0;

  const targetVariance = currentNetSavings - savingsTarget;
  const isTargetAchieved = savingsTarget > 0 && currentNetSavings >= savingsTarget;
  const targetDeficit = !isTargetAchieved ? savingsTarget - currentNetSavings : 0;

  // Pace projection
  const dailySavingsPace = currentNetSavings > 0 ? Math.round(currentNetSavings / daysElapsed) : 0;
  const projectedMonthEndSavings =
    currentNetSavings > 0 ? Math.round((currentNetSavings / daysElapsed) * daysInMonth) : currentNetSavings;

  const isProjectedToAchieve = projectedMonthEndSavings >= savingsTarget;

  // Total sinking funds monthly targets
  const totalSinkingFundMonthlyTarget = useMemo(
    () => sinkingFunds.reduce((sum, sf) => sum + sf.monthlyTarget, 0),
    [sinkingFunds]
  );

  // Status Badge Classifier
  let statusBadge: {
    label: string;
    variant: 'on-track' | 'near' | 'over' | 'unbudgeted';
    icon: typeof CheckCircle2;
  } = {
    label: 'Target Achieved!',
    variant: 'on-track',
    icon: CheckCircle2,
  };

  if (savingsTarget <= 0) {
    statusBadge = { label: 'No Target Set', variant: 'unbudgeted', icon: Info };
  } else if (isTargetAchieved) {
    statusBadge = { label: 'Target Achieved!', variant: 'on-track', icon: CheckCircle2 };
  } else if (targetProgressPercent >= 80) {
    statusBadge = { label: 'Near Target (80%+)', variant: 'near', icon: TrendingUp };
  } else {
    statusBadge = { label: 'In Progress', variant: 'over', icon: AlertTriangle };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <article
      className="mm-stat-panel"
      data-testid="mm-monthly-savings-goals-section"
      style={{
        borderRadius: 16,
        padding: '20px 24px',
        border: isTargetAchieved
          ? '1px solid rgba(16, 185, 129, 0.45)'
          : targetProgressPercent >= 80
          ? '1px solid rgba(59, 130, 246, 0.45)'
          : '1px solid var(--border)',
        background: isTargetAchieved
          ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, var(--surface) 100%)'
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
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isTargetAchieved
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(99, 102, 241, 0.16)',
                color: isTargetAchieved ? '#10b981' : '#6366f1',
              }}
              data-testid="mm-savings-goal-icon"
            >
              <PiggyBank size={22} />
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
                  data-testid="mm-savings-goal-title"
                >
                  Monthly Savings Goals
                </h2>

                <span
                  className={`mm-budget-status-pill is-${statusBadge.variant}`}
                  data-testid="mm-savings-goal-status-badge"
                  style={{ fontSize: '0.78rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <StatusIcon size={12} />
                  <span>{statusBadge.label}</span>
                </span>

                <span
                  style={{
                    fontSize: '0.73rem',
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                  data-testid="mm-savings-rate-badge"
                >
                  {currentSavingsRatePercent}% Current Savings Rate
                </span>
              </div>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.82rem',
                  color: 'var(--muted)',
                  lineHeight: 1.45,
                }}
                data-testid="mm-savings-goal-subtitle"
              >
                Track real-time net savings ({formatINR(metrics.income)} inflow − {formatINR(metrics.expense)} spent)
                against your user-defined target for {selectedMonth}.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {metrics.income > 0 && (
            <>
              <button
                type="button"
                onClick={() => handleSaveTarget(Math.round((metrics.income * 0.2) / 500) * 500)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                title="Set savings target to 20% of current monthly income (50/30/20 rule)"
                data-testid="mm-savings-preset-20"
              >
                <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                <span>20% Income ({formatINR(Math.round((metrics.income * 0.2) / 500) * 500)})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveTarget(Math.round((metrics.income * 0.3) / 500) * 500)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                title="Set aggressive target to 30% of monthly income"
                data-testid="mm-savings-preset-30"
              >
                <TrendingUp size={12} style={{ color: '#10b981' }} />
                <span>30% Income</span>
              </button>
            </>
          )}

          {[25000, 35000, 50000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSaveTarget(preset)}
              className="mm-btn mm-btn-sm mm-btn-ghost"
              style={{
                fontSize: '0.74rem',
                padding: '3px 8px',
                border: savingsTarget === preset ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
              data-testid={`mm-savings-preset-fixed-${preset}`}
            >
              ₹{preset / 1000}k
            </button>
          ))}
        </div>
      </div>

      {saveSuccessNotice && (
        <div
          role="status"
          data-testid="mm-savings-target-notice"
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
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div
        className="mm-burn-rate-stats-grid"
        style={{
          borderTop: 'none',
          paddingTop: 0,
          marginBottom: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
        data-testid="mm-savings-kpi-grid"
      >
        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Defined Savings Target</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: 'var(--accent)' }}
            data-testid="mm-savings-target-val"
          >
            {formatINR(savingsTarget)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Target for {selectedMonth}
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Actual Net Savings Achieved</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{
              color: currentNetSavings >= 0 ? '#10b981' : '#ef4444',
            }}
            data-testid="mm-savings-actual-val"
          >
            {formatINR(currentNetSavings)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {currentSavingsRatePercent}% of total monthly income
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Target Progress</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{
              color: isTargetAchieved ? '#10b981' : targetProgressPercent >= 80 ? '#3b82f6' : 'var(--text-heading)',
            }}
            data-testid="mm-savings-progress-percent"
          >
            {targetProgressPercent}%
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {isTargetAchieved ? 'Goal completed!' : `${formatINR(targetDeficit)} remaining`}
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Projected Month-End Savings</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{
              color: isProjectedToAchieve ? '#10b981' : '#f59e0b',
            }}
            data-testid="mm-savings-projected-val"
          >
            {formatINR(projectedMonthEndSavings)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Based on {formatINR(dailySavingsPace)}/day pace (Day {daysElapsed})
          </span>
        </div>

        <div className="mm-burn-rate-stat-box" style={{ background: 'var(--bg-darker)' }}>
          <span className="mm-burn-rate-stat-label">Sinking Funds Provision</span>
          <strong
            className="mm-burn-rate-stat-val"
            style={{ color: '#8b5cf6' }}
            data-testid="mm-savings-sinking-funds-val"
          >
            {formatINR(totalSinkingFundMonthlyTarget)} / month
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            across {sinkingFunds.length} annual reserve funds
          </span>
        </div>
      </div>

      {/* Target Control Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 12,
          background: 'var(--bg-darker)',
          border: '1px solid var(--border)',
        }}
        data-testid="mm-savings-target-controls"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={16} style={{ color: 'var(--accent)' }} />
          <label
            htmlFor="mm-savings-target-input"
            style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)' }}
          >
            Set Monthly Savings Target (₹):
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => handleStepTarget(-1000)}
              className="mm-budget-step-btn"
              title="Decrease savings target by ₹1,000"
              data-testid="mm-savings-target-dec-btn"
            >
              <Minus size={12} />
            </button>

            <input
              id="mm-savings-target-input"
              type="number"
              min="0"
              step="1000"
              value={inputTarget}
              onChange={(e) => handleInputChange(e.target.value)}
              className="mm-input"
              style={{ width: 130, padding: '5px 10px', fontSize: '0.88rem', fontWeight: 700, textAlign: 'right' }}
              aria-label="Monthly savings target input"
              data-testid="mm-savings-target-input"
            />

            <button
              type="button"
              onClick={() => handleStepTarget(1000)}
              className="mm-budget-step-btn"
              title="Increase savings target by ₹1,000"
              data-testid="mm-savings-target-inc-btn"
            >
              <Plus size={12} />
            </button>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(100000, Math.ceil((metrics.income || 100000) / 5000) * 5000)}
            step="1000"
            value={savingsTarget}
            onChange={(e) => handleInputChange(e.target.value)}
            style={{ width: 120, accentColor: 'var(--accent)', cursor: 'pointer' }}
            aria-label="Monthly savings target slider"
            data-testid="mm-savings-target-slider"
          />
        </div>
      </div>

      {/* Primary Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            marginBottom: 6,
          }}
        >
          <span>
            Accumulated Savings:{' '}
            <strong
              style={{ color: currentNetSavings >= 0 ? '#10b981' : '#ef4444' }}
              data-testid="mm-savings-bar-accumulated"
            >
              {formatINR(currentNetSavings)}
            </strong>{' '}
            of{' '}
            <strong style={{ color: 'var(--text-heading)' }} data-testid="mm-savings-bar-target">
              {formatINR(savingsTarget)}
            </strong>{' '}
            target
          </span>

          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }} data-testid="mm-savings-bar-percent">
            {targetProgressPercent}% Achieved
          </span>
        </div>

        <div
          className="mm-burn-rate-track"
          style={{ position: 'relative', height: 16 }}
          data-testid="mm-savings-progress-track"
        >
          {/* Projected Extension */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${Math.min(100, savingsTarget > 0 ? Math.round((projectedMonthEndSavings / savingsTarget) * 100) : 0)}%`,
              backgroundColor: isProjectedToAchieve
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(245, 158, 11, 0.35)',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
            data-testid="mm-savings-ghost-fill"
          />
          {/* Current Achieved Fill */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              width: `${Math.min(100, Math.max(0, targetProgressPercent))}%`,
              backgroundColor: isTargetAchieved ? '#10b981' : '#3b82f6',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
            data-testid="mm-savings-current-fill"
          />
        </div>
      </div>

      {/* Sinking Funds Monthly Provision Allocations */}
      {sinkingFunds.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px border var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} style={{ color: '#8b5cf6' }} />
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-heading)' }}>
                Active Sinking Funds Monthly Reserves ({sinkingFunds.length})
              </strong>
            </div>

            <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
              Total monthly target: <strong>{formatINR(totalSinkingFundMonthlyTarget)}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
            }}
            data-testid="mm-savings-sinking-funds-grid"
          >
            {sinkingFunds.map((fund) => {
              const fundPct =
                fund.targetAmount > 0
                  ? Math.min(100, Math.round((fund.currentAccrued / fund.targetAmount) * 100))
                  : 0;

              return (
                <div
                  key={fund.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-darker)',
                    border: '1px solid var(--border)',
                  }}
                  data-testid={`mm-savings-fund-card-${fund.id}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      fontSize: '0.8rem',
                      marginBottom: 4,
                    }}
                  >
                    <strong style={{ color: 'var(--text-heading)' }}>{fund.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 700 }}>
                      {formatINR(fund.monthlyTarget)}/mo
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--muted)', marginBottom: 6 }}>
                    <span>Accrued: {formatINR(fund.currentAccrued)}</span>
                    <span>Target: {formatINR(fund.targetAmount)} ({fundPct}%)</span>
                  </div>

                  <div className="mm-burn-rate-track" style={{ height: 6 }}>
                    <div
                      style={{
                        width: `${fundPct}%`,
                        height: '100%',
                        backgroundColor: '#8b5cf6',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
};
