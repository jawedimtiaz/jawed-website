import React, { useEffect, useState } from 'react';
import {
  Palette,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Tag,
} from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  formatINR,
  saveCategory as dbSaveCategory,
  deleteCategory as dbDeleteCategory,
  type FixedOrVariable,
  type MoneyCategory,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';

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
  onSaveCategory?: (category: MoneyCategory) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
}

const DEFAULT_CATEGORY_Ids = new Set(INITIAL_CATEGORIES.map((c) => c.id));

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories = INITIAL_CATEGORIES,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [localCategories, setLocalCategories] = useState<MoneyCategory[]>(categories);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Expense' | 'Income'>('Expense');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New Category Form State
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<'Expense' | 'Income'>('Expense');
  const [newNature, setNewNature] = useState<FixedOrVariable>('Variable');
  const [newColor, setNewColor] = useState<string>('#8b5cf6');
  const [newBudget, setNewBudget] = useState<string>('5000');
  const [newSubCategories, setNewSubCategories] = useState<string>('General, Miscellaneous');

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

          return (
            <div
              key={cat.id}
              className="mm-category-manager-card"
              style={{ borderLeft: `4px solid ${activeColor}` }}
              data-testid={`mm-category-manager-card-${cat.name}`}
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
                    <strong className="mm-cm-name">{cat.name}</strong>
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
                      {cat.monthlyBudget ? (
                        <>
                          <span>·</span>
                          <span>Limit: {formatINR(cat.monthlyBudget)}</span>
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

              {/* Monthly Budget & Sub-category Tags */}
              <div className="mm-cm-card-bottom">
                <div className="mm-cm-subtags">
                  <Tag size={11} />
                  <span>{cat.subCategories.slice(0, 3).join(' · ')}</span>
                </div>

                {cat.type === 'Expense' && (
                  <label className="mm-category-inline-limit-label">
                    <span>Budget ₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={cat.monthlyBudget ?? ''}
                      onChange={(e) => handleBudgetChange(cat, e.target.value)}
                      className="mm-category-inline-limit-input"
                      aria-label={`Monthly budget for ${cat.name}`}
                      data-testid={`mm-cm-budget-input-${cat.name}`}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};

export default CategoryManager;
