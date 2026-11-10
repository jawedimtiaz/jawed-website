import React, { useEffect, useMemo, useState } from 'react';
import {
  Palette,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  formatINR,
  resolveTransactionInrAmount,
  saveCategory as dbSaveCategory,
  deleteCategory as dbDeleteCategory,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';
import {
  DEFAULT_KEYWORD_CATEGORY_RULES,
  loadCustomKeywordRules,
  saveCustomKeywordRule,
  deleteCustomKeywordRule,
  predictTransactionCategory,
  type KeywordCategoryRule,
} from './mlCategorizer';

export const CATEGORY_COLOR_PRESETS = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
];

export interface CategoryManagerProps {
  categories?: MoneyCategory[];
  transactions?: MoneyTransaction[];
  selectedMonth?: string;
  thresholdOverrides?: Record<string, number> | number;
  onSaveCategory?: (category: MoneyCategory) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
}

const DEFAULT_CATEGORY_Ids = new Set(INITIAL_CATEGORIES.map((c) => c.id));

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories = INITIAL_CATEGORIES,
  transactions = [],
  selectedMonth,
  thresholdOverrides,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [localCategories, setLocalCategories] = useState<MoneyCategory[]>(categories);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Expense' | 'Income'>('Expense');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const resolvedMonth = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      return selectedMonth;
    }
    for (const tx of transactions) {
      if (tx?.date && tx.date.length >= 7) {
        return tx.date.slice(0, 7);
      }
    }
    return '2026-11';
  }, [selectedMonth, transactions]);

  const currentMonthSpentByCategory = useMemo(() => {
    const map = new Map<string, { spent: number; count: number }>();
    for (const tx of transactions) {
      if (!tx || tx.type !== 'Expense' || !tx.date?.startsWith(resolvedMonth)) continue;
      const amt = resolveTransactionInrAmount(tx);
      const prev = map.get(tx.category) || { spent: 0, count: 0 };
      map.set(tx.category, {
        spent: prev.spent + amt,
        count: prev.count + 1,
      });
    }
    return map;
  }, [transactions, resolvedMonth]);

  // New Category Form State
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<'Expense' | 'Income'>('Expense');
  const [newNature, setNewNature] = useState<FixedOrVariable>('Variable');
  const [newColor, setNewColor] = useState<string>('#8b5cf6');
  const [newBudget, setNewBudget] = useState<string>('5000');
  const [newSubCategories, setNewSubCategories] = useState<string>('General, Miscellaneous');

  // ML Keyword Rule Manager & Live Sandbox State
  const [customMlRules, setCustomMlRules] = useState<KeywordCategoryRule[]>(() =>
    loadCustomKeywordRules()
  );
  const [sandboxDescription, setSandboxDescription] = useState<string>(
    'UPI/Swiggy Instamart Fresh Groceries'
  );
  const [ruleKeywordsInput, setRuleKeywordsInput] = useState<string>('');
  const [ruleTargetCategory, setRuleTargetCategory] = useState<string>('Food & Groceries');
  const [ruleTargetSubCategory, setRuleTargetSubCategory] = useState<string>(
    'Supermarket Groceries'
  );
  const [showBuiltInRules, setShowBuiltInRules] = useState<boolean>(false);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const persistCategoryUpdate = async (updated: MoneyCategory) => {
    setLocalCategories((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      return [...prev, updated];
    });

    if (onSaveCategory) {
      await onSaveCategory(updated);
    } else {
      await dbSaveCategory(updated);
    }
  };

  const handleAssignColor = async (category: MoneyCategory, nextColor: string) => {
    const cleanHex = nextColor.trim();
    if (!cleanHex) return;
    await persistCategoryUpdate({
      ...category,
      color: cleanHex,
    });
  };

  const handleBudgetChange = async (category: MoneyCategory, rawBudget: string) => {
    const parsed = Math.max(0, Number.parseFloat(rawBudget) || 0);
    await persistCategoryUpdate({
      ...category,
      monthlyBudget: parsed > 0 ? parsed : undefined,
    });
  };

  const handleNatureChange = async (category: MoneyCategory, nextNature: FixedOrVariable) => {
    await persistCategoryUpdate({
      ...category,
      defaultFixedOrVariable: nextNature,
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    const subCats = newSubCategories
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedBudget = Math.max(0, Number.parseFloat(newBudget) || 0);

    const created: MoneyCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      type: newType,
      defaultFixedOrVariable: newNature,
      iconName: newType === 'Income' ? 'TrendingUp' : 'ShoppingBag',
      subCategories: subCats.length > 0 ? subCats : ['General'],
      monthlyBudget: newType === 'Expense' && parsedBudget > 0 ? parsedBudget : undefined,
      color: newColor || '#8b5cf6',
    };

    await persistCategoryUpdate(created);
    setNewName('');
    setNewBudget('5000');
    setNewColor('#8b5cf6');
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    setLocalCategories((prev) => prev.filter((c) => c.id !== id));
    if (onDeleteCategory) {
      await onDeleteCategory(id);
    } else {
      await dbDeleteCategory(id);
    }
  };

  const handleResetDefaultColors = async () => {
    const defaultMap = new Map(INITIAL_CATEGORIES.map((c) => [c.id, c]));
    const resetList = localCategories.map((cat) => {
      const def = defaultMap.get(cat.id);
      return def ? { ...cat, color: def.color, monthlyBudget: def.monthlyBudget } : cat;
    });
    setLocalCategories(resetList);
    for (const cat of resetList) {
      if (onSaveCategory) {
        await onSaveCategory(cat);
      } else {
        await dbSaveCategory(cat);
      }
    }
  };

  const filteredCategories = localCategories.filter((cat) =>
    typeFilter === 'ALL' ? true : cat.type === typeFilter
  );

  const sandboxPrediction = useMemo(
    () =>
      predictTransactionCategory(sandboxDescription, {
        allowTypeInference: true,
        historicalTransactions: transactions,
        categories: localCategories,
        customRules: customMlRules,
      }),
    [sandboxDescription, transactions, localCategories, customMlRules]
  );

  const handleAddCustomMlRule = (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = ruleKeywordsInput
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (keywords.length === 0) return;

    const matchedCat =
      localCategories.find((c) => c.name === ruleTargetCategory) || localCategories[0];
    if (!matchedCat) return;

    const updated = saveCustomKeywordRule({
      type: matchedCat.type,
      category: matchedCat.name,
      subCategory:
        ruleTargetSubCategory.trim() || matchedCat.subCategories?.[0] || 'General',
      fixedOrVariable: matchedCat.defaultFixedOrVariable,
      keywords,
    });
    setCustomMlRules(updated);
    setRuleKeywordsInput('');
  };

  const handleDeleteCustomMlRule = (ruleId: string) => {
    const updated = deleteCustomKeywordRule(ruleId);
    setCustomMlRules(updated);
  };

  return (
    <article
      className="mm-stat-panel"
      style={{ marginTop: '8px' }}
      data-testid="mm-category-manager"
    >
      <div className="mm-stat-panel-header">
        <div>
          <h2 className="mm-stat-panel-title">
            <Palette
              size={18}
              style={{
                verticalAlign: 'middle',
                marginRight: 8,
                color: 'var(--accent)',
              }}
            />
            Category Manager &amp; Custom Chart Colors
          </h2>
          <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
            Assign custom hex colors and monthly budgets to each spending category; changes immediately update the Donut and Bar charts
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            role="group"
            aria-label="Filter categories by type"
            style={{ display: 'inline-flex', gap: 6 }}
          >
            <button
              type="button"
              onClick={() => setTypeFilter('Expense')}
              className={`mm-btn mm-btn-sm ${
                typeFilter === 'Expense' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-filter-expense"
            >
              Spending Categories ({localCategories.filter((c) => c.type === 'Expense').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Income')}
              className={`mm-btn mm-btn-sm ${
                typeFilter === 'Income' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-filter-income"
            >
              Income ({localCategories.filter((c) => c.type === 'Income').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`mm-btn mm-btn-sm ${
                typeFilter === 'ALL' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-filter-all"
            >
              All ({localCategories.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultColors}
            className="mm-btn mm-btn-sm mm-btn-ghost"
            title="Restore default category colors"
            data-testid="mm-cat-reset-colors-btn"
          >
            <RotateCcw size={13} />
            <span>Reset Colors</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="mm-btn mm-btn-sm mm-btn-secondary"
            data-testid="mm-toggle-add-category-btn"
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Cancel' : 'New Category'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateCategory}
          className="mm-inline-form-card"
          style={{ marginBottom: 14 }}
          data-testid="mm-category-manager-add-form"
        >
          <div className="mm-form-grid-4">
            <div className="mm-field">
              <label htmlFor="mm-new-cat-name">Category Name *</label>
              <input
                id="mm-new-cat-name"
                type="text"
                required
                placeholder="e.g., Electronics & Gadgets"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mm-input"
                data-testid="mm-new-category-name-input"
              />
            </div>

            <div className="mm-field">
              <label htmlFor="mm-new-cat-type">Category Type</label>
              <select
                id="mm-new-cat-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'Expense' | 'Income')}
                className="mm-select"
                data-testid="mm-new-category-type-select"
              >
                <option value="Expense">Expense (Spending)</option>
                <option value="Income">Income</option>
              </select>
            </div>

            <div className="mm-field">
              <label htmlFor="mm-new-cat-color">Custom Chart Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="mm-new-cat-color"
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="mm-color-picker-native"
                  data-testid="mm-new-category-color-input"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="mm-input"
                  style={{ fontFamily: 'monospace' }}
                  aria-label="New category hex color code"
                />
              </div>
            </div>

            <div className="mm-field">
              <label htmlFor="mm-new-cat-budget">Monthly Budget Threshold (₹)</label>
              <input
                id="mm-new-cat-budget"
                type="number"
                min="0"
                step="500"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="mm-input"
                disabled={newType === 'Income'}
                data-testid="mm-new-category-budget-input"
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 10,
            }}
          >
            <div className="mm-field" style={{ flex: '1 1 280px' }}>
              <label htmlFor="mm-new-cat-subs">Sub-Categories (comma separated)</label>
              <input
                id="mm-new-cat-subs"
                type="text"
                value={newSubCategories}
                onChange={(e) => setNewSubCategories(e.target.value)}
                className="mm-input"
                placeholder="e.g., Hardware, Cables, Peripherals"
              />
            </div>

            <button
              type="submit"
              className="mm-btn mm-btn-primary"
              data-testid="mm-save-new-category-btn"
            >
              <Check size={15} />
              <span>Save Category</span>
            </button>
          </div>
        </form>
      )}

      <div className="mm-category-manager-grid" data-testid="mm-category-manager-list">
        {filteredCategories.map((cat) => {
          const activeColor = cat.color || '#3b82f6';
          const isCustom = !DEFAULT_CATEGORY_Ids.has(cat.id);
          const monthStats = currentMonthSpentByCategory.get(cat.name) || { spent: 0, count: 0 };
          const currentMonthSpent = monthStats.spent;
          const effectiveLimit =
            typeof thresholdOverrides === 'number' && thresholdOverrides > 0
              ? thresholdOverrides
              : thresholdOverrides && typeof thresholdOverrides === 'object' && thresholdOverrides[cat.name] > 0
              ? thresholdOverrides[cat.name]
              : cat.monthlyBudget && cat.monthlyBudget > 0
              ? cat.monthlyBudget
              : 0;
          const utilizationPct =
            effectiveLimit > 0 ? Number(((currentMonthSpent / effectiveLimit) * 100).toFixed(1)) : 0;
          const clampedBarWidth =
            effectiveLimit > 0 ? Math.min(100, Math.max(0, Math.round(utilizationPct))) : 0;
          const isOverLimit = effectiveLimit > 0 && currentMonthSpent > effectiveLimit;
          const isNearLimit = !isOverLimit && utilizationPct >= 85;
          const progressFillColor = isOverLimit
            ? '#ef4444'
            : isNearLimit
            ? '#f59e0b'
            : effectiveLimit > 0
            ? activeColor
            : '#64748b';

          return (
            <div
              key={cat.id}
              className={`mm-category-manager-card ${isOverLimit ? 'is-over-budget' : ''}`}
              style={{
                borderLeft: `4px solid ${isOverLimit ? '#ef4444' : activeColor}`,
                borderColor: isOverLimit ? 'rgba(239, 68, 68, 0.55)' : undefined,
                background: isOverLimit ? 'rgba(239, 68, 68, 0.06)' : undefined,
              }}
              data-testid={`mm-category-manager-card-${cat.name}`}
              data-over-budget={isOverLimit ? 'true' : 'false'}
            >
              <div className="mm-cm-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    className="mm-cm-icon-badge"
                    style={{
                      backgroundColor: `${activeColor}22`,
                      color: activeColor,
                      border: `1px solid ${activeColor}55`,
                    }}
                  >
                    {renderCategoryIcon(cat.iconName, 16)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong
                      className="mm-cm-name"
                      style={{ color: isOverLimit ? '#ef4444' : undefined }}
                    >
                      {cat.name}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', color: 'var(--muted)' }}>
                      <span>{cat.type}</span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleNatureChange(
                            cat,
                            cat.defaultFixedOrVariable === 'Fixed' ? 'Variable' : 'Fixed'
                          )
                        }
                        className="mm-link-btn"
                        style={{ fontSize: '0.73rem', padding: 0 }}
                        title="Toggle default Fixed or Variable classification"
                      >
                        {cat.defaultFixedOrVariable}
                      </button>
                      {effectiveLimit > 0 ? (
                        <>
                          <span>·</span>
                          <span>Limit: {formatINR(effectiveLimit)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label
                    className="mm-cm-color-picker-wrap"
                    title={`Assign custom color to ${cat.name}`}
                  >
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => handleAssignColor(cat, e.target.value)}
                      className="mm-color-picker-native"
                      aria-label={`Assign custom color for ${cat.name}`}
                      data-testid={`mm-category-color-picker-${cat.name}`}
                    />
                    <span className="mm-cm-hex-code" data-testid={`mm-category-color-value-${cat.name}`}>
                      {activeColor.toUpperCase()}
                    </span>
                  </label>

                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="mm-icon-action-btn is-danger"
                      title={`Delete ${cat.name}`}
                      aria-label={`Delete ${cat.name}`}
                      data-testid={`mm-delete-category-${cat.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Color Swatch Row */}
              <div className="mm-cm-palette-row" role="group" aria-label={`Color presets for ${cat.name}`}>
                {CATEGORY_COLOR_PRESETS.map((presetHex) => {
                  const isSelected = activeColor.toLowerCase() === presetHex.toLowerCase();
                  return (
                    <button
                      key={presetHex}
                      type="button"
                      onClick={() => handleAssignColor(cat, presetHex)}
                      className={`mm-cm-swatch-btn ${isSelected ? 'is-selected' : ''}`}
                      style={{ backgroundColor: presetHex }}
                      title={`Set ${cat.name} color to ${presetHex}`}
                      aria-label={`Set ${cat.name} color to ${presetHex}`}
                      data-testid={`mm-category-swatch-${cat.name}-${presetHex.slice(1)}`}
                    />
                  );
                })}
              </div>

              {/* Visual Progress Bar Comparing Current Month's Expenditure vs Set Budget Limit */}
              {cat.type === 'Expense' && (
                <div
                  style={{
                    marginTop: 6,
                    marginBottom: 4,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                  data-testid={`mm-cm-card-comparison-${cat.name}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      fontSize: '0.74rem',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span style={{ color: 'var(--muted)' }}>
                      Spent ({resolvedMonth}):{' '}
                      <strong style={{ color: isOverLimit ? '#ef4444' : 'var(--text-heading)' }}>
                        {formatINR(currentMonthSpent)}
                      </strong>
                      {effectiveLimit > 0 ? ` / ${formatINR(effectiveLimit)}` : ' (No limit)'}
                    </span>
                    <strong
                      style={{
                        color: isOverLimit
                          ? '#ef4444'
                          : isNearLimit
                          ? '#f59e0b'
                          : effectiveLimit > 0
                          ? '#10b981'
                          : 'var(--muted)',
                      }}
                      data-testid={`mm-cm-card-utilization-${cat.name}`}
                    >
                      {effectiveLimit > 0 ? `${utilizationPct}%` : 'Unbudgeted'}
                    </strong>
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`${cat.name} monthly expenditure vs budget limit`}
                    aria-valuenow={Math.round(utilizationPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    data-testid={`mm-cm-card-progress-bar-${cat.name}`}
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: isOverLimit
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(148, 163, 184, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      data-testid={`mm-cm-card-progress-fill-${cat.name}`}
                      style={{
                        width: `${clampedBarWidth}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: progressFillColor,
                        transition: 'width 0.25s ease, background-color 0.25s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.71rem',
                      color: 'var(--muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span>
                      {monthStats.count} {monthStats.count === 1 ? 'transaction' : 'transactions'}
                    </span>
                    <span
                      style={{
                        fontWeight: isOverLimit ? 600 : 500,
                        color: isOverLimit ? '#ef4444' : 'var(--muted)',
                      }}
                    >
                      {isOverLimit
                        ? `Over limit by +${formatINR(currentMonthSpent - effectiveLimit)}`
                        : effectiveLimit > 0
                        ? `${formatINR(Math.max(0, effectiveLimit - currentMonthSpent))} remaining`
                        : 'Set a limit below'}
                    </span>
                  </div>
                </div>
              )}

              {/* Monthly Budget & Sub-category Tags */}
              <div className="mm-cm-card-bottom">
                <div className="mm-cm-subtags">
                  <Tag size={11} />
                  <span>{cat.subCategories.slice(0, 3).join(' · ')}</span>
                </div>

                {cat.type === 'Expense' && (
                  <div
                    className="mm-category-budget-limit-container"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <label
                      htmlFor={`mm-cat-budget-${cat.id}`}
                      className="mm-category-inline-limit-label"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--text-heading)',
                      }}
                    >
                      <span>Monthly Budget: ₹</span>
                    </label>
                    <input
                      id={`mm-cat-budget-${cat.id}`}
                      type="number"
                      min="0"
                      step="500"
                      placeholder="e.g. 5000"
                      value={cat.monthlyBudget ?? ''}
                      onChange={(e) => handleBudgetChange(cat, e.target.value)}
                      className="mm-category-inline-limit-input"
                      aria-label={`Monthly budget limit for ${cat.name}`}
                      data-testid={`mm-category-budget-limit-input-${cat.name}`}
                    />
                    <input
                      type="hidden"
                      data-testid={`mm-cm-budget-input-${cat.name}`}
                      value={cat.monthlyBudget ?? ''}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ML Auto-Categorization Rule System & Live Classifier Sandbox */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
        }}
        data-testid="mm-ml-rules-section"
      >
        <div className="mm-stat-panel-header" style={{ marginBottom: 12 }}>
          <div>
            <h3 className="mm-stat-panel-title" style={{ fontSize: '1rem' }}>
              <Sparkles
                size={16}
                style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--accent)' }}
              />
              ML Auto-Categorization Rule Engine &amp; Live Description Classifier
            </h3>
            <p className="mm-section-desc" style={{ margin: '3px 0 0' }}>
              Combines Multinomial Naive Bayes trained on your ledger history with weighted keyword rules ({DEFAULT_KEYWORD_CATEGORY_RULES.length} built-in rules + {customMlRules.length} custom rules)
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBuiltInRules((prev) => !prev)}
            className="mm-btn mm-btn-sm mm-btn-ghost"
            data-testid="mm-ml-toggle-builtin-rules-btn"
          >
            {showBuiltInRules
              ? 'Hide Built-In Rules'
              : `Inspect Built-In Rules (${DEFAULT_KEYWORD_CATEGORY_RULES.length})`}
          </button>
        </div>

        <div className="mm-stats-two-col" style={{ gap: 12 }}>
          {/* Live ML Classifier Sandbox */}
          <div
            className="mm-inline-form-card"
            style={{ margin: 0 }}
            data-testid="mm-ml-classifier-sandbox"
          >
            <label
              htmlFor="mm-ml-sandbox-input"
              style={{ fontWeight: 700, fontSize: '0.84rem', display: 'block', marginBottom: 6 }}
            >
              Test Transaction Description (Live ML + Keyword Prediction)
            </label>
            <input
              id="mm-ml-sandbox-input"
              type="text"
              value={sandboxDescription}
              onChange={(e) => setSandboxDescription(e.target.value)}
              placeholder="Type any merchant or bank narration..."
              className="mm-input"
              data-testid="mm-ml-sandbox-input"
            />

            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                fontSize: '0.82rem',
              }}
              data-testid="mm-ml-sandbox-result"
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
                <span>
                  Predicted:{' '}
                  <strong data-testid="mm-ml-sandbox-category">
                    {sandboxPrediction.category}
                  </strong>{' '}
                  ({sandboxPrediction.subCategory}) ·{' '}
                  <span style={{ color: 'var(--muted)' }}>
                    {sandboxPrediction.predictedType} / {sandboxPrediction.fixedOrVariable}
                  </span>
                </span>
                <span
                  className="mm-budget-status-pill is-on-track"
                  data-testid="mm-ml-sandbox-confidence"
                >
                  {sandboxPrediction.confidence}% ({sandboxPrediction.confidenceLabel})
                </span>
              </div>
              {sandboxPrediction.matchedKeywords.length > 0 && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Matched keywords:{' '}
                  <strong>{sandboxPrediction.matchedKeywords.join(', ')}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Add Custom Keyword Rule Form */}
          <form
            onSubmit={handleAddCustomMlRule}
            className="mm-inline-form-card"
            style={{ margin: 0 }}
            data-testid="mm-ml-add-rule-form"
          >
            <strong style={{ fontSize: '0.84rem', display: 'block', marginBottom: 6 }}>
              Add Custom Keyword Auto-Categorization Rule
            </strong>
            <div className="mm-form-grid-2" style={{ gap: 8 }}>
              <div className="mm-field">
                <label htmlFor="mm-ml-rule-keywords">Keywords (comma separated)</label>
                <input
                  id="mm-ml-rule-keywords"
                  type="text"
                  value={ruleKeywordsInput}
                  onChange={(e) => setRuleKeywordsInput(e.target.value)}
                  placeholder="e.g., decathlon, sports, badminton"
                  className="mm-input"
                  data-testid="mm-ml-rule-keywords-input"
                />
              </div>

              <div className="mm-field">
                <label htmlFor="mm-ml-rule-category">Target Category</label>
                <select
                  id="mm-ml-rule-category"
                  value={ruleTargetCategory}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setRuleTargetCategory(nextName);
                    const found = localCategories.find((c) => c.name === nextName);
                    if (found?.subCategories?.[0]) {
                      setRuleTargetSubCategory(found.subCategories[0]);
                    }
                  }}
                  className="mm-input"
                  data-testid="mm-ml-rule-category-select"
                >
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 8,
              }}
            >
              <div className="mm-field" style={{ flex: 1 }}>
                <label htmlFor="mm-ml-rule-subcat">Sub-Category</label>
                <input
                  id="mm-ml-rule-subcat"
                  type="text"
                  value={ruleTargetSubCategory}
                  onChange={(e) => setRuleTargetSubCategory(e.target.value)}
                  className="mm-input"
                  data-testid="mm-ml-rule-subcategory-input"
                />
              </div>
              <button
                type="submit"
                className="mm-btn mm-btn-sm mm-btn-primary"
                data-testid="mm-ml-add-rule-btn"
              >
                <Plus size={14} />
                <span>Add Rule</span>
              </button>
            </div>
          </form>
        </div>

        {/* Custom Rules List */}
        {customMlRules.length > 0 && (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}
            data-testid="mm-ml-custom-rules-list"
          >
            {customMlRules.map((rule) => (
              <span
                key={rule.id}
                className="mm-budget-status-pill is-on-track"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}
                data-testid={`mm-ml-custom-rule-${rule.id}`}
              >
                <span>
                  <strong>[{rule.keywords.join(', ')}]</strong> → {rule.category} ({rule.subCategory})
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomMlRule(rule.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                  }}
                  aria-label={`Delete custom rule for ${rule.category}`}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Built-in Keyword Rules Reference Grid */}
        {showBuiltInRules && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 8,
              marginTop: 12,
            }}
            data-testid="mm-ml-builtin-rules-grid"
          >
            {DEFAULT_KEYWORD_CATEGORY_RULES.map((rule) => (
              <div
                key={rule.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <strong>{rule.category}</strong> → {rule.subCategory} ({rule.fixedOrVariable})
                </div>
                <div style={{ color: 'var(--muted)', marginTop: 3 }}>
                  Keywords: {rule.keywords.slice(0, 7).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default CategoryManager;
