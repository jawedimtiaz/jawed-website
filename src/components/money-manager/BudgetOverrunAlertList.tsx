import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
} from 'lucide-react';
import { formatINR } from '../../db/db';
import type { MonthlyBudgetPlanItem, MonthlyBudgetPlanSummary } from './StatsView';

export interface BudgetOverrunAlertListProps {
  plan: MonthlyBudgetPlanSummary;
  selectedMonth: string;
  onAdjustCategoryBudget?: (categoryName: string, newLimit: number) => Promise<void> | void;
  onSelectCategoryFilter?: (categoryName: string) => void;
}

export const BudgetOverrunAlertList: React.FC<BudgetOverrunAlertListProps> = ({
  plan,
  selectedMonth,
  onAdjustCategoryBudget,
  onSelectCategoryFilter,
}) => {
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [adjustSuccessCat, setAdjustSuccessCat] = useState<string | null>(null);

  // Extract categories currently exceeding their monthly budget
  const overrunCategories = plan.items.filter(
    (item) => item.status === 'over' || (item.monthlyLimit > 0 && item.spent > item.monthlyLimit)
  );

  // Extract categories near limit (85% to 100%) but not yet over
  const nearLimitCategories = plan.items.filter(
    (item) => item.status === 'near' || item.isExceeding90Percent && item.status !== 'over'
  );

  const totalOverrunAmount = overrunCategories.reduce((sum, item) => sum + item.overage, 0);
  const totalOverrunBudget = overrunCategories.reduce((sum, item) => sum + item.monthlyLimit, 0);
  const totalOverrunSpent = overrunCategories.reduce((sum, item) => sum + item.spent, 0);
  const averageOverrunPercent =
    totalOverrunBudget > 0
      ? Number(((totalOverrunSpent / totalOverrunBudget) * 100).toFixed(1))
      : 0;

  const handleAdjustSingle = async (item: MonthlyBudgetPlanItem, newLimit: number) => {
    if (onAdjustCategoryBudget) {
      await onAdjustCategoryBudget(item.category, newLimit);
      setAdjustSuccessCat(item.category);
      setTimeout(() => {
        setAdjustSuccessCat((prev) => (prev === item.category ? null : prev));
      }, 2500);
    }
  };

  const handleAutoFitAllOverruns = async () => {
    if (onAdjustCategoryBudget) {
      for (const item of overrunCategories) {
        // Fit to spent rounded up to nearest 500
        const roundedLimit = Math.max(1000, Math.ceil(item.spent / 500) * 500);
        await onAdjustCategoryBudget(item.category, roundedLimit);
      }
      setAdjustSuccessCat('ALL_OVERRUNS');
      setTimeout(() => {
        setAdjustSuccessCat((prev) => (prev === 'ALL_OVERRUNS' ? null : prev));
      }, 3000);
    }
  };

  // Healthy state: No active budget overruns
  if (overrunCategories.length === 0) {
    return (
      <div
        className="mm-budget-overrun-container is-healthy"
        data-testid="mm-budget-overrun-alert-list"
        style={{
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.16)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong
                style={{ fontSize: '0.98rem', color: 'var(--text-heading)' }}
                data-testid="mm-budget-overrun-title"
              >
                Zero Budget Overruns
              </strong>
              <span
                className="mm-budget-status-pill is-on-track"
                data-testid="mm-budget-overrun-badge"
                style={{ fontSize: '0.74rem' }}
              >
                All Categories Within Limit
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.8rem',
                color: 'var(--muted)',
                lineHeight: 1.4,
              }}
              data-testid="mm-budget-overrun-healthy-desc"
            >
              All {plan.items.filter((i) => i.monthlyLimit > 0).length} budgeted categories in{' '}
              {selectedMonth} are currently within their defined limits with{' '}
              <strong style={{ color: '#10b981' }}>{formatINR(plan.totalRemaining)}</strong> safe
              headroom remaining.
            </p>
          </div>
        </div>

        {nearLimitCategories.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="mm-budget-status-pill is-warning-90"
              style={{ fontSize: '0.74rem' }}
              data-testid="mm-overrun-watchlist-pill"
            >
              <AlertTriangle size={11} style={{ marginRight: 4 }} />
              {nearLimitCategories.length} near limit (≥85%)
            </span>
          </div>
        )}
      </div>
    );
  }

  // Active Overrun Alert State
  return (
    <div
      className="mm-budget-overrun-container is-critical"
      data-testid="mm-budget-overrun-alert-list"
      style={{
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 16,
        background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--surface) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        boxShadow: '0 4px 18px rgba(239, 68, 68, 0.08)',
      }}
    >
      {/* Alert Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.16)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            data-testid="mm-budget-overrun-icon"
          >
            <ShieldAlert size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-heading)',
                }}
                data-testid="mm-budget-overrun-title"
              >
                Budget Overrun Alert
              </h3>
              <span
                className="mm-budget-status-pill is-over"
                data-testid="mm-budget-overrun-badge"
                style={{
                  fontSize: '0.78rem',
                  padding: '3px 10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AlertTriangle size={12} />
                <span>
                  {overrunCategories.length}{' '}
                  {overrunCategories.length === 1 ? 'Category' : 'Categories'} Exceeding Budget
                </span>
              </span>

              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontWeight: 700,
                }}
                data-testid="mm-budget-overrun-total-badge"
              >
                Total Overrun: +{formatINR(totalOverrunAmount)}
              </span>
            </div>

            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.8rem',
                color: 'var(--muted)',
                lineHeight: 1.4,
              }}
              data-testid="mm-budget-overrun-desc"
            >
              The following categories have spent beyond their defined monthly allocation in{' '}
              {selectedMonth}. Review the overage amounts and adjust limits or curb discretionary
              spending.
            </p>
          </div>
        </div>

        {/* Global Action: Auto-fit overruns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAutoFitAllOverruns}
            className="mm-btn mm-btn-sm mm-btn-secondary"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              fontSize: '0.76rem',
              padding: '5px 10px',
            }}
            title="Increase defined budget limits to match current spending for all overrun categories"
            data-testid="mm-overrun-autofit-all-btn"
          >
            <Sparkles size={13} />
            <span>Auto-Fit All Overruns</span>
          </button>
        </div>
      </div>

      {adjustSuccessCat && (
        <div
          role="status"
          data-testid="mm-overrun-feedback-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontSize: '0.8rem',
            color: 'var(--text-heading)',
          }}
        >
          <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>
            {adjustSuccessCat === 'ALL_OVERRUNS'
              ? 'Successfully adjusted all overrun category limits to cover their current spend!'
              : `Adjusted budget limit for ${adjustSuccessCat} to cover its current spend.`}
          </span>
        </div>
      )}

      {/* Clean Summary Table */}
      <div
        style={{
          overflowX: 'auto',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <table
          className="mm-table"
          data-testid="mm-budget-overrun-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-darker)',
                color: 'var(--muted)',
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '10px 14px' }}>Category</th>
              <th style={{ padding: '10px 14px' }}>Type</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Defined Budget</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actual Spent</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Overrun Amount</th>
              <th style={{ padding: '10px 14px' }}>Utilization %</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Quick Action</th>
            </tr>
          </thead>
          <tbody>
            {overrunCategories.map((item) => {
              const overrunPercent = Number(
                (((item.spent - item.monthlyLimit) / item.monthlyLimit) * 100).toFixed(1)
              );

              return (
                <tr
                  key={item.category}
                  data-testid={`mm-overrun-row-${item.category}`}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: 'rgba(239, 68, 68, 0.03)',
                  }}
                >
                  {/* Category Name & Color */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="mm-legend-dot"
                        style={{
                          backgroundColor: item.color,
                          width: 10,
                          height: 10,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <strong
                          style={{ color: 'var(--text-heading)' }}
                          data-testid={`mm-overrun-cat-name-${item.category}`}
                        >
                          {item.category}
                        </strong>
                        <div style={{ fontSize: '0.71rem', color: 'var(--muted)' }}>
                          {item.txCount} {item.txCount === 1 ? 'transaction' : 'transactions'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Fixed vs Variable */}
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      className={`mm-tx-fv-tag ${
                        item.defaultFixedOrVariable === 'Fixed'
                          ? 'mm-fv-fixed'
                          : 'mm-fv-variable'
                      }`}
                      style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                    >
                      {item.defaultFixedOrVariable}
                    </span>
                  </td>

                  {/* Defined Budget */}
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      color: 'var(--muted)',
                    }}
                    data-testid={`mm-overrun-defined-budget-${item.category}`}
                  >
                    {formatINR(item.monthlyLimit)}
                  </td>

                  {/* Actual Spent */}
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--text-heading)',
                    }}
                    data-testid={`mm-overrun-spent-${item.category}`}
                  >
                    {formatINR(item.spent)}
                  </td>

                  {/* Overrun Amount */}
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                    }}
                  >
                    <span
                      className="mm-budget-status-pill is-over"
                      data-testid={`mm-overrun-amount-${item.category}`}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                      }}
                      title={`Exceeds defined budget by ${formatINR(item.overage)} (+${overrunPercent}%)`}
                    >
                      +{formatINR(item.overage)}
                    </span>
                    <div
                      style={{
                        fontSize: '0.69rem',
                        color: '#ef4444',
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      +{overrunPercent}% over limit
                    </div>
                  </td>

                  {/* Utilization % with mini progress bar */}
                  <td style={{ padding: '10px 14px', minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong
                        style={{ color: '#ef4444', fontSize: '0.82rem', minWidth: 46 }}
                        data-testid={`mm-overrun-utilization-${item.category}`}
                      >
                        {item.utilizationPercent}%
                      </strong>
                      <div
                        className="mm-burn-rate-track"
                        style={{
                          flex: 1,
                          height: 7,
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#ef4444',
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Quick Actions */}
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleAdjustSingle(item, Math.ceil(item.spent / 500) * 500)
                        }
                        className="mm-btn mm-btn-sm mm-btn-ghost"
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#ef4444',
                        }}
                        title={`Raise budget limit to match current spend (${formatINR(Math.ceil(item.spent / 500) * 500)})`}
                        data-testid={`mm-overrun-match-btn-${item.category}`}
                      >
                        Match Spend
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAdjustSingle(item, item.monthlyLimit + 1000)
                        }
                        className="mm-btn mm-btn-sm mm-btn-ghost"
                        style={{
                          padding: '2px 6px',
                          fontSize: '0.72rem',
                          border: '1px solid var(--border)',
                        }}
                        title="Add +₹1,000 to monthly limit"
                        data-testid={`mm-overrun-step-btn-${item.category}`}
                      >
                        <Plus size={11} />
                        <span>1k</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer Summary Row */}
          <tfoot>
            <tr
              style={{
                borderTop: '2px solid var(--border)',
                background: 'var(--bg-darker)',
                fontWeight: 700,
                fontSize: '0.79rem',
              }}
            >
              <td style={{ padding: '10px 14px' }}>
                <strong>Total Overruns ({overrunCategories.length})</strong>
              </td>
              <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>—</td>
              <td
                style={{ padding: '10px 14px', textAlign: 'right' }}
                data-testid="mm-overrun-total-budget"
              >
                {formatINR(totalOverrunBudget)}
              </td>
              <td
                style={{ padding: '10px 14px', textAlign: 'right' }}
                data-testid="mm-overrun-total-spent"
              >
                {formatINR(totalOverrunSpent)}
              </td>
              <td
                style={{ padding: '10px 14px', textAlign: 'right', color: '#ef4444' }}
                data-testid="mm-overrun-total-overage"
              >
                +{formatINR(totalOverrunAmount)}
              </td>
              <td style={{ padding: '10px 14px', color: '#ef4444' }}>
                {averageOverrunPercent}% avg
              </td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  Action Needed
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Near-Limit Watchlist Accordion */}
      {nearLimitCategories.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowWatchlist((prev) => !prev)}
            className="mm-btn mm-btn-sm mm-btn-ghost"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#f59e0b',
            }}
            data-testid="mm-overrun-watchlist-toggle"
          >
            <AlertTriangle size={12} />
            <span>
              {showWatchlist ? 'Hide' : 'View'} High-Risk Watchlist ({nearLimitCategories.length}{' '}
              categories ≥85% of limit)
            </span>
            {showWatchlist ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showWatchlist && (
            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
              data-testid="mm-overrun-watchlist-container"
            >
              {nearLimitCategories.map((item) => (
                <span
                  key={item.category}
                  className="mm-budget-status-pill is-warning-90"
                  data-testid={`mm-overrun-watchlist-chip-${item.category}`}
                  style={{ fontSize: '0.73rem', padding: '3px 8px' }}
                >
                  <strong>{item.category}:</strong> {formatINR(item.spent)} /{' '}
                  {formatINR(item.monthlyLimit)} ({item.utilizationPercent}%) ·{' '}
                  {formatINR(item.remaining)} left
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
