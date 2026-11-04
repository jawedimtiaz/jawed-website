import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  Pencil,
  Check,
  X,
  Landmark,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { formatINR } from '../db.js';

export const AccountsView = ({ accounts = [], onSaveAccount, onSelectAccountInDailyView }) => {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editOpeningValue, setEditOpeningValue] = useState('0');

  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Bank');
  const [newAccOpening, setNewAccOpening] = useState('0');

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

  const handleToggleReconciled = async (acc) => {
    if (!onSaveAccount) return;
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

  const handleStartEditOpening = (acc) => {
    setEditingAccountId(acc.id);
    setEditOpeningValue(String(acc.openingBalance));
  };

  const handleConfirmEditOpening = async (acc) => {
    if (!onSaveAccount) return;
    const parsed = Number.parseFloat(editOpeningValue);
    const validOpening = Number.isFinite(parsed) ? parsed : acc.openingBalance;
    await onSaveAccount({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: validOpening,
      currentBalance: validOpening + (acc.totalCredits || 0) - (acc.totalDebits || 0),
      reconciled: acc.reconciled,
      lastReconciledAt: acc.lastReconciledAt,
    });
    setEditingAccountId(null);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!onSaveAccount) return;
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

  const renderIcon = (type) => {
    if (type === 'Cash') return <Wallet size={18} className="mm-text-amber" />;
    if (type === 'Card') return <CreditCard size={18} className="mm-text-rose" />;
    return <Landmark size={18} className="mm-text-sky" />;
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
        <form onSubmit={handleCreateAccount} className="mm-inline-form-card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-heading)' }}>
            Add New Bank, Cash, or Card Account
          </h3>
          <div className="mm-form-grid-3">
            <div>
              <label className="mm-label">Account Name</label>
              <input
                type="text"
                required
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                placeholder="e.g. HDFC Bank, Axis, Petty Cash"
                className="mm-input"
              />
            </div>
            <div>
              <label className="mm-label">Account Type</label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value)}
                className="mm-input"
              >
                <option value="Bank">Bank Account</option>
                <option value="Cash">Physical Cash</option>
                <option value="Card">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="mm-label">Opening Balance (₹)</label>
              <input
                type="number"
                step="any"
                value={newAccOpening}
                onChange={(e) => setNewAccOpening(e.target.value)}
                placeholder="0"
                className="mm-input"
              />
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button type="submit" className="mm-btn mm-btn-primary">
              Save Account
            </button>
            <button
              type="button"
              onClick={() => setShowAddAccountForm(false)}
              className="mm-btn mm-btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Account Cards Grid */}
      <div className="mm-accounts-grid" data-testid="mm-accounts-grid">
        {accounts.map((acc) => {
          const isEditing = editingAccountId === acc.id;

          return (
            <div
              key={acc.id}
              className="mm-account-card"
              data-testid={`mm-account-card-${acc.id}`}
            >
              <div className="mm-account-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mm-account-type-badge">{renderIcon(acc.type)}</span>
                  <div>
                    <h3 className="mm-account-name">{acc.name}</h3>
                    <span className="mm-account-type-tag">{acc.type}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleReconciled(acc)}
                  className={`mm-reconciled-pill ${acc.reconciled ? 'is-active' : ''}`}
                  title={
                    acc.reconciled
                      ? `Reconciled as of ${acc.lastReconciledAt || 'recently'}`
                      : 'Click to mark as reconciled'
                  }
                >
                  {acc.reconciled ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  <span>{acc.reconciled ? 'Reconciled' : 'Pending'}</span>
                </button>
              </div>

              <div className="mm-account-balance-cluster">
                <span className="mm-summary-label">Current Balance</span>
                <strong
                  className={`mm-account-current-val ${
                    acc.currentBalance >= 0 ? 'mm-text-net-positive' : 'mm-text-expense'
                  }`}
                  data-testid={`mm-account-balance-${acc.id}`}
                >
                  {formatINR(acc.currentBalance)}
                </strong>
              </div>

              <div className="mm-account-flow-strip">
                <div>
                  <span className="mm-account-flow-label">Opening</span>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <input
                        type="number"
                        value={editOpeningValue}
                        onChange={(e) => setEditOpeningValue(e.target.value)}
                        className="mm-input"
                        style={{ width: 80, padding: '2px 6px', fontSize: '0.8rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmEditOpening(acc)}
                        className="mm-btn mm-btn-sm mm-btn-primary"
                        style={{ padding: '2px 6px' }}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className="mm-btn mm-btn-sm mm-btn-ghost"
                        style={{ padding: '2px 4px' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <strong style={{ fontSize: '0.86rem' }}>{formatINR(acc.openingBalance)}</strong>
                      <button
                        type="button"
                        onClick={() => handleStartEditOpening(acc)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          padding: 2,
                        }}
                        title="Edit opening balance"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <span className="mm-account-flow-label">Total Inflow (+)</span>
                  <strong className="mm-text-income" style={{ fontSize: '0.86rem' }}>
                    {formatINR(acc.totalCredits || 0)}
                  </strong>
                </div>

                <div>
                  <span className="mm-account-flow-label">Total Outflow (−)</span>
                  <strong className="mm-text-expense" style={{ fontSize: '0.86rem' }}>
                    {formatINR(acc.totalDebits || 0)}
                  </strong>
                </div>
              </div>

              {onSelectAccountInDailyView && (
                <button
                  type="button"
                  onClick={() => onSelectAccountInDailyView(acc.id)}
                  className="mm-account-filter-action"
                >
                  <span>View account transactions ({acc.transactionCount || 0})</span>
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AccountsView;
