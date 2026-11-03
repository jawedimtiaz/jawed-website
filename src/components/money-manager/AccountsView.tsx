import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import {
  formatINR,
  type AccountSummary,
  type AccountType,
  type MoneyAccount,
} from '../../db/db';
import { renderAccountTypeIcon } from './categoryIcons';

export interface AccountsViewProps {
  accounts: AccountSummary[];
  onSaveAccount: (account: MoneyAccount) => Promise<void>;
  onSelectAccountInDailyView: (accountId: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onSaveAccount,
  onSelectAccountInDailyView,
}) => {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editOpeningValue, setEditOpeningValue] = useState<string>('0');

  const [showAddAccountForm, setShowAddAccountForm] = useState<boolean>(false);
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<AccountType>('Bank');
  const [newAccOpening, setNewAccOpening] = useState<string>('0');

  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    for (const acc of accounts) {
      if (acc.type === 'Card') {
        if (acc.currentBalance < 0) {
          liabilities += Math.abs(acc.currentBalance);
        } else {
          assets += acc.currentBalance;
        }
      } else if (acc.currentBalance >= 0) {
        assets += acc.currentBalance;
      } else {
        liabilities += Math.abs(acc.currentBalance);
      }
    }

    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
    };
  }, [accounts]);

  const handleToggleReconciled = async (acc: AccountSummary) => {
    const nextReconciled = !acc.reconciled;
    const todayIso = new Date().toISOString().slice(0, 10);
    await onSaveAccount({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: acc.openingBalance,
      currentBalance: acc.currentBalance,
      reconciled: nextReconciled,
      lastReconciledAt: nextReconciled ? todayIso : acc.lastReconciledAt,
    });
  };

  const handleStartEditOpening = (acc: AccountSummary) => {
    setEditingAccountId(acc.id);
    setEditOpeningValue(String(acc.openingBalance));
  };

  const handleConfirmEditOpening = async (acc: AccountSummary) => {
    const parsed = Number.parseFloat(editOpeningValue);
    const validOpening = Number.isFinite(parsed) ? parsed : acc.openingBalance;
    await onSaveAccount({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: validOpening,
      currentBalance: validOpening + acc.totalCredits - acc.totalDebits,
      reconciled: acc.reconciled,
      lastReconciledAt: acc.lastReconciledAt,
    });
    setEditingAccountId(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAccName.trim();
    if (!cleanName) return;

    const opening = Number.parseFloat(newAccOpening) || 0;
    const slugId = `acc-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()
      .toString(36)
      .slice(-4)}`;

    await onSaveAccount({
      id: slugId,
      name: cleanName,
      type: newAccType,
      openingBalance: opening,
      currentBalance: opening,
      reconciled: true,
      lastReconciledAt: new Date().toISOString().slice(0, 10),
    });

    setNewAccName('');
    setNewAccType('Bank');
    setNewAccOpening('0');
    setShowAddAccountForm(false);
  };

  return (
    <section className="mm-view-section" aria-label="Accounts & Multi-Bank Balances">
      {/* Assets vs Liabilities Top Summary Row */}
      <div className="mm-assets-banner" data-testid="mm-assets-banner">
        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Total Liquid Assets (Banks &amp; Cash)</span>
          <strong className="mm-summary-value mm-text-income" data-testid="mm-total-assets">
            {formatINR(totalAssets)}
          </strong>
          <span className="mm-summary-sub">Positive bank &amp; cash balances</span>
        </div>

        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Total Liabilities (Cards &amp; Overdrafts)</span>
          <strong className="mm-summary-value mm-text-expense" data-testid="mm-total-liabilities">
            {formatINR(totalLiabilities)}
          </strong>
          <span className="mm-summary-sub">Unsettled credit card dues</span>
        </div>

        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Consolidated Net Worth</span>
          <strong
            className={`mm-summary-value ${
              netWorth >= 0 ? 'mm-text-net-positive' : 'mm-text-expense'
            }`}
            data-testid="mm-net-worth"
          >
            {formatINR(netWorth)}
          </strong>
          <span className="mm-summary-sub">Assets minus Liabilities across {accounts.length} accounts</span>
        </div>
      </div>

      {/* Section Header + Add Account Button */}
      <div className="mm-section-bar">
        <div>
          <h2 className="mm-section-heading">Multi-Bank &amp; Cash Ledger Accounts</h2>
          <p className="mm-section-desc">
            Dynamic balance formula: <code>Opening Balance + Total Credits − Total Debits = Current Balance</code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddAccountForm((prev) => !prev)}
          className="mm-btn mm-btn-secondary"
          data-testid="mm-toggle-add-account-btn"
        >
          <Plus size={15} />
          <span>{showAddAccountForm ? 'Cancel' : 'Add Bank / Account'}</span>
        </button>
      </div>

      {/* Inline Add Account Form */}
      {showAddAccountForm && (
        <form onSubmit={handleCreateAccount} className="mm-inline-form-card">
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-heading)' }}>
            Add New Bank, Cash, or Card Account
          </h3>
          <div className="mm-form-grid-3">
            <div className="mm-field">
              <label htmlFor="mm-new-acc-name">Account Name</label>
              <input
                id="mm-new-acc-name"
                type="text"
                required
                placeholder="e.g., HDFC Bank or Axis CC"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="mm-input"
              />
            </div>
            <div className="mm-field">
              <label htmlFor="mm-new-acc-type">Account Type</label>
              <select
                id="mm-new-acc-type"
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as AccountType)}
                className="mm-input"
              >
                <option value="Bank">Bank Account</option>
                <option value="Cash">Cash Wallet</option>
                <option value="Card">Credit Card</option>
              </select>
            </div>
            <div className="mm-field">
              <label htmlFor="mm-new-acc-opening">Opening Balance (₹)</label>
              <input
                id="mm-new-acc-opening"
                type="number"
                step="1"
                value={newAccOpening}
                onChange={(e) => setNewAccOpening(e.target.value)}
                className="mm-input"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => setShowAddAccountForm(false)}
              className="mm-btn mm-btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" className="mm-btn mm-btn-primary">
              Save Account
            </button>
          </div>
        </form>
      )}

      {/* Bank Account Cards Grid */}
      <div className="mm-accounts-grid" data-testid="mm-accounts-grid">
        {accounts.map((acc) => {
          const isEditing = editingAccountId === acc.id;

          return (
            <article
              key={acc.id}
              className="mm-account-card"
              data-testid={`mm-account-card-${acc.id}`}
            >
              <div className="mm-account-card-top">
                <div className="mm-account-identity">
                  <div className={`mm-account-icon is-${acc.type.toLowerCase()}`}>
                    {renderAccountTypeIcon(acc.type, 20)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 className="mm-account-name">{acc.name}</h3>
                      <span className="mm-account-type-label">{acc.type}</span>
                    </div>
                    <span className="mm-account-tx-count">
                      {acc.transactionCount} ledger{' '}
                      {acc.transactionCount === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </div>

                {/* Interactive Reconciliation Status Indicator */}
                <button
                  type="button"
                  onClick={() => handleToggleReconciled(acc)}
                  className={`mm-reconcile-btn ${
                    acc.reconciled ? 'is-reconciled' : 'is-pending'
                  }`}
                  title={
                    acc.reconciled
                      ? `Reconciled on ${acc.lastReconciledAt || 'recent check'} — click to mark pending`
                      : 'Click to mark account statement as reconciled'
                  }
                  data-testid={`mm-reconcile-btn-${acc.id}`}
                >
                  {acc.reconciled ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Reconciled</span>
                    </>
                  ) : (
                    <>
                      <Clock size={14} />
                      <span>Unreconciled</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Metric Ledger Breakdown */}
              <div className="mm-account-metrics-grid">
                <div className="mm-acc-metric-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="mm-acc-metric-label">Opening Balance</span>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEditOpening(acc)}
                        className="mm-mini-edit-btn"
                        title="Edit Opening Balance"
                        aria-label={`Edit opening balance for ${acc.name}`}
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <input
                        type="number"
                        value={editOpeningValue}
                        onChange={(e) => setEditOpeningValue(e.target.value)}
                        className="mm-input"
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        aria-label={`Opening balance input for ${acc.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmEditOpening(acc)}
                        className="mm-icon-action-btn"
                        aria-label="Save opening balance"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className="mm-icon-action-btn"
                        aria-label="Cancel edit"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <strong className="mm-acc-metric-val">
                      {formatINR(acc.openingBalance)}
                    </strong>
                  )}
                </div>

                <div className="mm-acc-metric-box">
                  <span className="mm-acc-metric-label">Total Credits (+)</span>
                  <strong className="mm-acc-metric-val mm-text-income">
                    +{formatINR(acc.totalCredits)}
                  </strong>
                </div>

                <div className="mm-acc-metric-box">
                  <span className="mm-acc-metric-label">Total Debits (−)</span>
                  <strong className="mm-acc-metric-val mm-text-expense">
                    -{formatINR(acc.totalDebits)}
                  </strong>
                </div>

                <div className="mm-acc-metric-box is-current">
                  <span className="mm-acc-metric-label">Current Balance</span>
                  <strong
                    className={`mm-acc-metric-val ${
                      acc.currentBalance >= 0 ? 'mm-text-net-positive' : 'mm-text-expense'
                    }`}
                    data-testid={`mm-account-balance-${acc.id}`}
                  >
                    {formatINR(acc.currentBalance)}
                  </strong>
                </div>
              </div>

              <div className="mm-account-card-footer">
                <span className="mm-reconcile-timestamp">
                  {acc.reconciled
                    ? `Verified: ${acc.lastReconciledAt || 'Current'}`
                    : 'Statement reconciliation pending'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectAccountInDailyView(acc.id)}
                  className="mm-link-btn"
                  data-testid={`mm-view-account-ledger-${acc.id}`}
                >
                  <span>Filter Ledger</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
