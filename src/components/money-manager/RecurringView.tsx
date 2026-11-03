import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Play,
  Plus,
  Edit3,
  Trash2,
  PauseCircle,
  PlayCircle,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type RecurringRule,
  type RecurringFrequency,
  type TransactionType,
  type FixedOrVariable,
  type AccountSummary,
  type MoneyCategory,
  formatINR,
  computeNextRecurringDate,
} from '../../db/db';

export interface RecurringViewProps {
  selectedMonth: string; // YYYY-MM
  recurringRules: RecurringRule[];
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  onSaveRule: (
    rule: Omit<RecurringRule, 'id' | 'generatedCount'> & {
      id?: string;
      generatedCount?: number;
    }
  ) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onTriggerRuleNow: (ruleId: string, customDateStr?: string) => Promise<void>;
  onProcessDueRules: (cutoffDateStr: string) => Promise<void>;
}

const FREQUENCIES: RecurringFrequency[] = ['Daily', 'Weekly', 'Monthly'];

function getEndOfMonthDateString(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const month = Number.parseInt(mStr, 10) || 11;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  selectedMonth,
  recurringRules,
  accounts,
  categories,
  onSaveRule,
  onDeleteRule,
  onTriggerRuleNow,
  onProcessDueRules,
}) => {
  // Date runner state (defaults to end of currently selected month so users can generate all rules for the month or custom date)
  const [runnerTargetDate, setRunnerTargetDate] = useState<string>(() =>
    getEndOfMonthDateString(selectedMonth)
  );
  const [isRunningBatch, setIsRunningBatch] = useState<boolean>(false);
  const [filterFrequency, setFilterFrequency] = useState<string>('ALL');

  // Form Drawer / Inline Card State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('Monthly');
  const [type, setType] = useState<TransactionType>('Expense');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'acc-icici');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || 'acc-sbi');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Rent & Housing');
  const [subCategory, setSubCategory] = useState<string>('');
  const [fixedOrVariable, setFixedOrVariable] = useState<FixedOrVariable>('Fixed');
  const [startDate, setStartDate] = useState<string>(`${selectedMonth}-01`);
  const [nextRunDate, setNextRunDate] = useState<string>(`${selectedMonth}-05`);
  const [endDate, setEndDate] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('09:30');
  const [note, setNote] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  const accountMap = useMemo(() => {
    const map = new Map<string, AccountSummary>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const matchingCategories = useMemo(() => {
    if (type === 'Transfer') return [];
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Summary KPIs
  const summaryStats = useMemo(() => {
    const activeRules = recurringRules.filter((r) => r.active);
    let monthlyEquivalentIncome = 0;
    let monthlyEquivalentExpense = 0;
    let totalGenerated = 0;

    for (const rule of recurringRules) {
      totalGenerated += rule.generatedCount || 0;
      if (!rule.active) continue;
      const multiplier =
        rule.frequency === 'Daily' ? 30 : rule.frequency === 'Weekly' ? 4.33 : 1;

      if (rule.type === 'Income') {
        monthlyEquivalentIncome += rule.amount * multiplier;
      } else if (rule.type === 'Expense') {
        monthlyEquivalentExpense += rule.amount * multiplier;
      }
    }

    const dueCount = activeRules.filter(
      (r) => r.nextRunDate <= runnerTargetDate && (!r.endDate || r.nextRunDate <= r.endDate)
    ).length;

    return {
      activeCount: activeRules.length,
      monthlyEquivalentIncome: Math.round(monthlyEquivalentIncome),
      monthlyEquivalentExpense: Math.round(monthlyEquivalentExpense),
      totalGenerated,
      dueCount,
    };
  }, [recurringRules, runnerTargetDate]);

  const filteredRules = useMemo(() => {
    return recurringRules.filter((r) => {
      if (filterFrequency !== 'ALL' && r.frequency !== filterFrequency) return false;
      return true;
    });
  }, [recurringRules, filterFrequency]);

  const openCreateForm = () => {
    setEditingRuleId(null);
    setTitle('');
    setFrequency('Monthly');
    setType('Expense');
    setAccountId(accounts[0]?.id || 'acc-icici');
    setToAccountId(accounts[1]?.id || 'acc-sbi');
    setAmount('');
    const firstExp = categories.find((c) => c.type === 'Expense');
    setCategory(firstExp?.name || 'Rent & Housing');
    setSubCategory('');
    setFixedOrVariable('Fixed');
    setStartDate(`${selectedMonth}-01`);
    setNextRunDate(`${selectedMonth}-15`);
    setEndDate('');
    setTimeOfDay('10:00');
    setNote('');
    setActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (rule: RecurringRule) => {
    setEditingRuleId(rule.id);
    setTitle(rule.title);
    setFrequency(rule.frequency);
    setType(rule.type);
    setAccountId(rule.accountId);
    setToAccountId(rule.toAccountId || accounts[1]?.id || 'acc-sbi');
    setAmount(String(rule.amount));
    setCategory(rule.category);
    setSubCategory(rule.subCategory || '');
    setFixedOrVariable(rule.fixedOrVariable);
    setStartDate(rule.startDate);
    setNextRunDate(rule.nextRunDate);
    setEndDate(rule.endDate || '');
    setTimeOfDay(rule.timeOfDay || '10:00');
    setNote(rule.note || '');
    setActive(rule.active);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'Transfer') {
      setCategory('Transfer');
      if (toAccountId === accountId) {
        const alt = accounts.find((a) => a.id !== accountId);
        if (alt) setToAccountId(alt.id);
      }
    } else {
      const firstCat = categories.find((c) => c.type === newType);
      if (firstCat) {
        setCategory(firstCat.name);
        setFixedOrVariable(firstCat.defaultFixedOrVariable);
      }
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      setFormError('Please provide a schedule title (e.g., House Rent, SIP, Broadband).');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid positive INR amount.');
      return;
    }
    if (!nextRunDate) {
      setFormError('Please specify the next scheduled run date.');
      return;
    }
    if (type === 'Transfer' && accountId === toAccountId) {
      setFormError('Source and destination accounts must be different for a transfer.');
      return;
    }

    const existingRule = editingRuleId
      ? recurringRules.find((r) => r.id === editingRuleId)
      : undefined;

    await onSaveRule({
      id: editingRuleId || undefined,
      title: title.trim(),
      frequency,
      type,
      accountId,
      toAccountId: type === 'Transfer' ? toAccountId : undefined,
      amount: numericAmount,
      category: type === 'Transfer' ? 'Transfer' : category,
      subCategory: subCategory.trim() || title.trim(),
      fixedOrVariable,
      note: note.trim() || `[Recurring ${frequency}] ${title.trim()}`,
      startDate: startDate || nextRunDate,
      nextRunDate,
      endDate: endDate || undefined,
      timeOfDay: timeOfDay || '09:00',
      active,
      lastGeneratedDate: existingRule?.lastGeneratedDate,
      generatedCount: existingRule?.generatedCount ?? 0,
    });

    setIsFormOpen(false);
    setEditingRuleId(null);
  };

  const handleToggleRuleActive = async (rule: RecurringRule) => {
    await onSaveRule({
      ...rule,
      active: !rule.active,
    });
  };

  const handleRunDueBatch = async () => {
    if (!runnerTargetDate) return;
    setIsRunningBatch(true);
    try {
      await onProcessDueRules(runnerTargetDate);
    } finally {
      setIsRunningBatch(false);
    }
  };

  return (
    <div className="mm-view-section" data-testid="mm-recurring-view">
      {/* Top KPI Summary Banner */}
      <div className="mm-assets-banner">
        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Active Recurring Rules</span>
          <strong className="mm-summary-value" data-testid="mm-recurring-active-count">
            {summaryStats.activeCount} / {recurringRules.length}
          </strong>
          <span className="mm-summary-sub">
            {summaryStats.totalGenerated} ledger entries auto-generated
          </span>
        </div>

        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Est. Monthly Recurring Income</span>
          <strong className="mm-summary-value mm-text-income">
            {formatINR(summaryStats.monthlyEquivalentIncome)}
          </strong>
          <span className="mm-summary-sub">Scheduled salary &amp; periodic inflows</span>
        </div>

        <div className="mm-asset-stat-card">
          <span className="mm-summary-label">Est. Monthly Recurring Outflow</span>
          <strong className="mm-summary-value mm-text-expense">
            {formatINR(summaryStats.monthlyEquivalentExpense)}
          </strong>
          <span className="mm-summary-sub">Fixed bills, rent, subscriptions &amp; daily/weekly</span>
        </div>
      </div>

      {/* Automatic Scheduler Engine Runner Bar */}
      <div className="mm-stat-panel">
        <div className="mm-stat-panel-header">
          <div>
            <h2 className="mm-stat-panel-title">
              <CalendarClock size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
              Automated Schedule Processor (IndexedDB Ledger Generator)
            </h2>
            <p className="mm-stat-panel-sub">
              Automatically generates due <strong>Daily</strong>, <strong>Weekly</strong>, and{' '}
              <strong>Monthly</strong> transactions on their exact scheduled dates and advances each rule&apos;s{' '}
              <code>nextRunDate</code>.
            </p>
          </div>

          <div className="mm-top-actions">
            <div className="mm-field" style={{ minWidth: 165 }}>
              <label htmlFor="mm-runner-cutoff-date">Process Due Up To Date</label>
              <input
                id="mm-runner-cutoff-date"
                type="date"
                className="mm-input"
                value={runnerTargetDate}
                onChange={(e) => setRunnerTargetDate(e.target.value)}
                data-testid="mm-runner-date-input"
              />
            </div>

            <button
              type="button"
              onClick={handleRunDueBatch}
              disabled={isRunningBatch}
              className="mm-btn mm-btn-emerald"
              style={{ alignSelf: 'flex-end' }}
              data-testid="mm-run-due-schedules-btn"
            >
              <Sparkles size={16} />
              <span>
                {isRunningBatch
                  ? 'Processing...'
                  : `Generate Due Entries (${summaryStats.dueCount} Ready)`}
              </span>
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="mm-btn mm-btn-primary"
              style={{ alignSelf: 'flex-end' }}
              data-testid="mm-open-add-recurring-btn"
            >
              <Plus size={16} />
              <span>New Recurring Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Recurring Rule Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitForm}
          className="mm-inline-form-card"
          data-testid="mm-recurring-form"
        >
          <div className="mm-stat-panel-header">
            <div>
              <h3 className="mm-section-heading">
                {editingRuleId ? 'Edit Recurring Schedule' : 'Create Recurring Transaction Schedule'}
              </h3>
              <p className="mm-section-desc">
                Configure periodic payments or transfers that automatically post to your IndexedDB ledger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="mm-icon-action-btn"
              aria-label="Close schedule form"
            >
              <X size={16} />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '0.84rem',
              }}
            >
              {formError}
            </div>
          )}

          {/* Type Toggle */}
          <div className="mm-type-segmented" role="group" aria-label="Recurring Transaction Type">
            {(['Expense', 'Income', 'Transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`mm-type-seg-btn is-${t.toLowerCase()} ${
                  type === t ? 'is-active' : ''
                }`}
                data-testid={`mm-rec-type-${t.toLowerCase()}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mm-form-grid-3">
            <div className="mm-field">
              <label htmlFor="mm-rec-title">Schedule Title *</label>
              <input
                id="mm-rec-title"
                type="text"
                className="mm-input"
                placeholder="e.g., Apartment Rent, Weekly Milk & Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="mm-rec-title-input"
              />
            </div>

            <div className="mm-field">
              <label htmlFor="mm-rec-frequency">Frequency *</label>
              <select
                id="mm-rec-frequency"
                className="mm-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                data-testid="mm-rec-frequency-select"
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>

            <div className="mm-field">
              <label htmlFor="mm-rec-amount">Amount (INR ₹) *</label>
              <input
                id="mm-rec-amount"
                type="number"
                min="1"
                step="any"
                className="mm-input"
                placeholder="e.g., 18500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                data-testid="mm-rec-amount-input"
              />
            </div>
          </div>

          <div className="mm-form-grid-3">
            <div className="mm-field">
              <label htmlFor="mm-rec-account">
                {type === 'Transfer' ? 'From Source Account' : 'Account / Bank'}
              </label>
              <select
                id="mm-rec-account"
                className="mm-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                data-testid="mm-rec-account-select"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {type === 'Transfer' ? (
              <div className="mm-field">
                <label htmlFor="mm-rec-to-account">To Destination Account</label>
                <select
                  id="mm-rec-to-account"
                  className="mm-select"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  data-testid="mm-rec-to-account-select"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mm-field">
                <label htmlFor="mm-rec-category">Category</label>
                <select
                  id="mm-rec-category"
                  className="mm-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  data-testid="mm-rec-category-select"
                >
                  {matchingCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mm-field">
              <label htmlFor="mm-rec-subcategory">Sub-Category / Merchant</label>
              <input
                id="mm-rec-subcategory"
                type="text"
                className="mm-input"
                placeholder="e.g., Landlord NEFT, JioFiber"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="mm-form-grid-4">
            <div className="mm-field">
              <label htmlFor="mm-rec-next-date">Next Scheduled Date *</label>
              <input
                id="mm-rec-next-date"
                type="date"
                className="mm-input"
                value={nextRunDate}
                onChange={(e) => setNextRunDate(e.target.value)}
                required
                data-testid="mm-rec-next-date-input"
              />
            </div>

            <div className="mm-field">
              <label htmlFor="mm-rec-end-date">End Date (Optional)</label>
              <input
                id="mm-rec-end-date"
                type="date"
                className="mm-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="mm-field">
              <label htmlFor="mm-rec-time">Time of Day</label>
              <input
                id="mm-rec-time"
                type="time"
                className="mm-input"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
              />
            </div>

            <div className="mm-field">
              <label>Cost Nature</label>
              <div className="mm-nature-toggle-group">
                {(['Fixed', 'Variable'] as FixedOrVariable[]).map((fv) => (
                  <button
                    key={fv}
                    type="button"
                    onClick={() => setFixedOrVariable(fv)}
                    className={`mm-nature-btn ${fixedOrVariable === fv ? 'is-active' : ''}`}
                  >
                    {fv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mm-field">
            <label htmlFor="mm-rec-note">Ledger Note</label>
            <input
              id="mm-rec-note"
              type="text"
              className="mm-input"
              placeholder="Optional description appended to generated transactions"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mm-modal-footer">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="mm-btn mm-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mm-btn mm-btn-primary"
              data-testid="mm-rec-save-btn"
            >
              <CheckCircle2 size={16} />
              <span>{editingRuleId ? 'Update Schedule' : 'Save Recurring Schedule'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="mm-filter-bar">
        <div className="mm-stat-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Repeat size={16} />
            <strong>Configured Recurring Schedules ({filteredRules.length})</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(['ALL', 'Daily', 'Weekly', 'Monthly'] as const).map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => setFilterFrequency(freq)}
                className={`mm-btn mm-btn-sm ${
                  filterFrequency === freq ? 'mm-btn-primary' : 'mm-btn-secondary'
                }`}
                data-testid={`mm-rec-filter-${freq.toLowerCase()}`}
              >
                {freq === 'ALL' ? 'All Frequencies' : freq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recurring Rules Cards List */}
      {filteredRules.length === 0 ? (
        <div className="mm-empty-state">
          <Repeat size={32} />
          <h3>No recurring schedules match this filter</h3>
          <p>
            Set up daily, weekly, or monthly automated schedules to generate ledger entries on specified dates.
          </p>
          <button type="button" onClick={openCreateForm} className="mm-btn mm-btn-primary">
            <Plus size={16} />
            <span>Add First Schedule</span>
          </button>
        </div>
      ) : (
        <div className="mm-sinking-funds-grid" data-testid="mm-recurring-rules-list">
          {filteredRules.map((rule) => {
            const sourceAcc = accountMap.get(rule.accountId);
            const targetAcc = rule.toAccountId ? accountMap.get(rule.toAccountId) : undefined;
            const isDue =
              rule.active &&
              rule.nextRunDate <= runnerTargetDate &&
              (!rule.endDate || rule.nextRunDate <= rule.endDate);
            const followingDate = computeNextRecurringDate(rule.nextRunDate, rule.frequency);

            return (
              <div
                key={rule.id}
                className="mm-sinking-fund-card"
                style={{
                  opacity: rule.active ? 1 : 0.65,
                  borderColor: isDue ? 'rgba(16, 185, 129, 0.45)' : undefined,
                }}
                data-testid={`mm-recurring-card-${rule.id}`}
              >
                <div className="mm-sf-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <strong className="mm-sf-name">{rule.title}</strong>
                      <span className="mm-account-type-label">{rule.frequency}</span>
                      <span
                        className={`mm-tx-fv-tag ${
                          rule.fixedOrVariable === 'Fixed' ? 'mm-fv-fixed' : 'mm-fv-variable'
                        }`}
                      >
                        {rule.fixedOrVariable}
                      </span>
                    </div>
                    <span className="mm-sf-monthly">
                      {rule.category}
                      {rule.subCategory ? ` · ${rule.subCategory}` : ''}
                    </span>
                  </div>

                  <strong
                    className={`mm-tx-amount ${
                      rule.type === 'Income'
                        ? 'mm-text-income'
                        : rule.type === 'Expense'
                        ? 'mm-text-expense'
                        : 'mm-text-transfer'
                    }`}
                  >
                    {rule.type === 'Income' ? '+' : rule.type === 'Expense' ? '-' : '⇄ '}
                    {formatINR(rule.amount)}
                  </strong>
                </div>

                {/* Account Routing & Schedule Dates */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 9,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Account Route:</span>
                    <strong>
                      {sourceAcc?.name || rule.accountId}
                      {rule.type === 'Transfer' && targetAcc ? (
                        <>
                          {' '}
                          <ArrowRight size={12} style={{ display: 'inline' }} /> {targetAcc.name}
                        </>
                      ) : null}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Next Scheduled Run:</span>
                    <strong
                      style={{
                        color: isDue ? '#10b981' : 'var(--text-heading)',
                      }}
                      data-testid={`mm-rec-next-run-${rule.id}`}
                    >
                      <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {rule.nextRunDate} ({rule.timeOfDay || '09:00'})
                      {isDue ? ' · DUE' : ''}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Following Period:</span>
                    <span>{followingDate}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>Auto-Generated Count:</span>
                    <span data-testid={`mm-rec-gen-count-${rule.id}`}>
                      {rule.generatedCount || 0} entries
                      {rule.lastGeneratedDate ? ` (Last: ${rule.lastGeneratedDate})` : ''}
                    </span>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mm-sf-bottom" style={{ paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => onTriggerRuleNow(rule.id)}
                    className="mm-btn mm-btn-sm mm-btn-primary"
                    title="Immediately generate the next scheduled occurrence in IndexedDB and advance Next Run Date"
                    data-testid={`mm-rec-trigger-now-${rule.id}`}
                  >
                    <Play size={13} />
                    <span>Post Next Occurrence</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleRuleActive(rule)}
                      className="mm-icon-action-btn"
                      title={rule.active ? 'Pause schedule' : 'Resume schedule'}
                      aria-label={rule.active ? 'Pause schedule' : 'Resume schedule'}
                      data-testid={`mm-rec-toggle-${rule.id}`}
                    >
                      {rule.active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(rule)}
                      className="mm-icon-action-btn"
                      title="Edit schedule"
                      aria-label="Edit schedule"
                      data-testid={`mm-rec-edit-${rule.id}`}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      className="mm-icon-action-btn is-danger"
                      title="Delete schedule"
                      aria-label="Delete schedule"
                      data-testid={`mm-rec-delete-${rule.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecurringView;
