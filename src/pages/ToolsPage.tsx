import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TOOLS,
  TOOL_CATEGORIES,
  type ToolItem,
  type ToolCategoryId,
  type BaseToolCategoryId,
  type BaseToolCategoryLabel,
  determineToolCategoryId,
  determineToolCategory,
} from '../data/toolsData';

export { TOOL_CATEGORIES, type ToolCategoryId, type ToolItem };

export interface SearchableTool extends ToolItem {
  resolvedCategory: BaseToolCategoryId;
  resolvedCategoryLabel: BaseToolCategoryLabel;
  searchString: string;
}

export const ToolsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ToolCategoryId>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pre-index tools with resolved categories and lowercase search strings once
  const indexedTools = useMemo<SearchableTool[]>(() => {
    return TOOLS.map(tool => {
      const resolvedCategory = determineToolCategoryId(tool);
      const resolvedCategoryLabel = determineToolCategory(tool);
      const kw = (tool.keywords || []).join(' ');
      return {
        ...tool,
        resolvedCategory,
        resolvedCategoryLabel,
        searchString: `${tool.name} ${tool.description} ${resolvedCategoryLabel} ${kw}`.toLowerCase(),
      };
    });
  }, []);

  // Memoized calculation of dynamic category counts synced with active search query
  const categoryCounts = useMemo<Record<ToolCategoryId, number>>(() => {
    const q = searchTerm.trim().toLowerCase();
    const counts: Record<ToolCategoryId, number> = {
      all: 0,
      it: 0,
      career: 0,
      finance: 0,
      ai: 0,
    };

    for (let i = 0; i < indexedTools.length; i++) {
      const tool = indexedTools[i];
      if (!q || tool.searchString.includes(q)) {
        counts.all++;
        counts[tool.resolvedCategory]++;
      }
    }

    return counts;
  }, [indexedTools, searchTerm]);

  // Memoized filtered tool items based on active category and search query
  const filteredTools = useMemo<SearchableTool[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    return indexedTools.filter(tool => {
      const matchesCategory = activeCategory === 'all' || tool.resolvedCategory === activeCategory;
      const matchesSearch = !q || tool.searchString.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [indexedTools, activeCategory, searchTerm]);

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Tools</span>
      </nav>

      <p className="eyebrow">Interactive Utilities</p>
      <h1>Tools &amp; Calculators</h1>
      <p className="lead">
        Free, browser-based utilities for IT service desk workflows, resume optimization, career preparation, and personal finance planning. No sign-up or data upload required.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        {/* Dynamic Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {TOOL_CATEGORIES.map(cat => {
            const count = categoryCounts[cat.id] ?? 0;
            const isSelected = activeCategory === cat.id;
            const isDisabled = count === 0 && !isSelected;

            return (
              <button
                key={cat.id}
                type="button"
                className={`tab-button ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  if (count > 0 || isSelected) {
                    setActiveCategory(cat.id);
                  }
                }}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-label={`${cat.label} (${count} ${count === 1 ? 'tool' : 'tools'})`}
                style={{
                  opacity: isDisabled ? 0.45 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
                title={count === 0 ? `No matching tools in ${cat.label}` : undefined}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="discovery-controls">
          <input
            type="search"
            className="discovery-input"
            placeholder="Search tools..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="button button-secondary discovery-reset"
              type="button"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card-grid">
        {filteredTools.map(tool => (
          <article key={tool.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                {tool.resolvedCategoryLabel}
              </span>
            </div>
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <Link to={tool.route}>Open Tool →</Link>
          </article>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', marginTop: '20px' }}>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-heading)', fontWeight: 600, marginBottom: '8px' }}>
            No tools found matching your criteria.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 16px' }}>
            No tools match {activeCategory !== 'all' ? `category "${TOOL_CATEGORIES.find(c => c.id === activeCategory)?.label}"` : 'your filter'}{searchTerm ? ` and search query "${searchTerm}"` : ''}.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeCategory !== 'all' && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setActiveCategory('all')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Reset to All Tools
              </button>
            )}
            {searchTerm && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSearchTerm('')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
