import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES, type FieldGuide } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { Breadcrumb } from '../components/Breadcrumb';
import { CATEGORIES, type NoteCategory, type BaseCategory, determineCategory } from '../utils/categoryHelper';
import { useGuideFilterCounts } from '../utils/useGuideFilterCounts';
import { calculateReadTime } from '../utils/readTimeHelper';

export { CATEGORIES, type NoteCategory };

export interface NoteItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
  content?: string;
}

export interface SearchableGuide extends FieldGuide {
  resolvedCategory: BaseCategory;
  searchString: string;
}

export interface SearchableNote extends NoteItem {
  resolvedCategory: BaseCategory;
  searchString: string;
}

export interface IndexedGuideItem {
  slug: string;
  url: string;
  title: string;
  description: string;
  category: string;
  type: 'field-guide' | 'quick-note';
  keywords: string[];
  searchContent: string;
  readTime?: string;
  author?: string;
}

export interface GuideSearchIndex {
  items: IndexedGuideItem[];
  bySlug: Record<string, IndexedGuideItem>;
  byCategory: Record<string, IndexedGuideItem[]>;
  totalCount: number;
}

/**
 * Indexing function: generateGuideSearchIndex
 * Generates a unified, structured searchable data object from all field guides and quick notes,
 * indexed by slug, category, and tokenized search content for consumption by the global header search.
 */
export const generateGuideSearchIndex = (
  guides: typeof FIELD_GUIDES,
  notes: NoteItem[]
): GuideSearchIndex => {
  const items: IndexedGuideItem[] = [];
  const bySlug: Record<string, IndexedGuideItem> = {};
  const byCategory: Record<string, IndexedGuideItem[]> = {};

  // Index Featured Field Guides
  guides.forEach(guide => {
    const category = guide.category || determineCategory(guide);
    const tocText = guide.toc ? guide.toc.map(t => t.text).join(' ') : '';
    const cleanContent = guide.contentHtml ? guide.contentHtml.replace(/<[^>]+>/g, ' ') : '';

    const keywords = Array.from(
      new Set(
        `${guide.title} ${guide.description} ${tocText}`
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2)
      )
    );

    const indexedItem: IndexedGuideItem = {
      slug: guide.slug,
      url: `/field-guides/${guide.slug}`,
      title: guide.title,
      description: guide.description,
      category,
      type: 'field-guide',
      keywords,
      searchContent: `${guide.title} ${guide.description} ${category} ${tocText} ${cleanContent}`.toLowerCase(),
      readTime: guide.readTime || calculateReadTime(guide.contentHtml || guide.description),
      author: guide.author || 'Jawed Imtiaz'
    };

    items.push(indexedItem);
    bySlug[guide.slug] = indexedItem;

    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(indexedItem);
  });

  // Index Quick Notes
  notes.forEach(note => {
    const category = note.category || 'Service Desk & ITSM';
    const cleanContent = note.content ? note.content.replace(/<[^>]+>/g, ' ') : '';

    const keywords = Array.from(
      new Set(
        `${note.title} ${note.description}`
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2)
      )
    );

    const indexedItem: IndexedGuideItem = {
      slug: note.slug,
      url: `/notes/${note.slug}`,
      title: note.title,
      description: note.description,
      category,
      type: 'quick-note',
      keywords,
      searchContent: `${note.title} ${note.description} ${category} ${cleanContent}`.toLowerCase(),
      readTime: calculateReadTime(note.content || note.description),
      author: 'Jawed Imtiaz'
    };

    items.push(indexedItem);
    bySlug[note.slug] = indexedItem;

    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(indexedItem);
  });

  return {
    items,
    bySlug,
    byCategory,
    totalCount: items.length
  };
};

/**
 * Pre-indexed singleton data object generated from all active guides and quick notes.
 * Accessible for global header search filtering and site-wide search engines.
 */
export const GUIDE_SEARCH_INDEX = generateGuideSearchIndex(FIELD_GUIDES, notesData as NoteItem[]);

/**
 * Global search helper to filter indexed guide objects by multi-term queries.
 */
export const searchGuideIndex = (query: string): IndexedGuideItem[] => {
  if (!query || !query.trim()) return GUIDE_SEARCH_INDEX.items;
  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);

  return GUIDE_SEARCH_INDEX.items.filter(item => {
    return terms.every(term => item.searchContent.includes(term));
  });
};

// Memoized individual guide card to prevent re-renders when other items or query state update
const GuideCard = React.memo<{ guide: SearchableGuide }>(({ guide }) => (
  <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--accent)' }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
          {guide.resolvedCategory}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
          {guide.readTime || calculateReadTime(guide.contentHtml || guide.description)}
        </span>
      </div>

      <h3 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '10px', lineHeight: '1.35' }}>
        <Link to={`/field-guides/${guide.slug}`} style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
          {guide.title}
        </Link>
      </h3>

      <p style={{ fontSize: '0.9rem', color: 'var(--muted-light)', marginBottom: '16px' }}>
        {guide.description}
      </p>

      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '16px' }}>
        <strong>Topics Covered:</strong> {guide.toc.slice(0, 3).map(t => t.text.replace(/^\d+\.\s*/, '')).join(' • ')}...
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>By {guide.author}</span>
      <Link to={`/field-guides/${guide.slug}`} className="button button-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
        Read Full Guide →
      </Link>
    </div>
  </article>
));

// Memoized individual note card to prevent re-renders during search keystrokes
const NoteCard = React.memo<{ note: SearchableNote }>(({ note }) => (
  <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
          {note.resolvedCategory}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
          {calculateReadTime(note.content || note.description)}
        </span>
      </div>
      <h3 style={{ fontSize: '1.05rem', marginTop: 0, marginBottom: '8px' }}>{note.title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{note.description}</p>
    </div>
    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
      <Link to={`/notes/${note.slug}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
        Read Quick Note →
      </Link>
    </div>
  </article>
));

export const NotesListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'field-guides' | 'notes'>('all');
  const [activeCategory, setActiveCategory] = useState<NoteCategory>('All');

  const { categoryCounts, filteredGuides, filteredNotes, totalFilteredCount } = useGuideFilterCounts({
    guides: FIELD_GUIDES,
    notes: notesData as NoteItem[],
    searchTerm,
    activeTab,
    activeCategory,
  });

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Field Guides & Knowledge Base' },
        ]}
      />

      {/* Top Leaderboard Ad Slot */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <p className="eyebrow">Technical Articles &amp; Operational Knowledge</p>
      <h1>Field Guides &amp; Knowledge Base</h1>
      <p className="lead">
        Comprehensive field troubleshooting guides, ANSI cabling pinouts, switch port CLI commands, server LED diagnostic cheatsheets, Apple MDM &amp; macOS triage, Windows / Entra ID workflows, and practical service desk procedures.
      </p>

      {/* Discovery & Search Panel */}
      <div className="discovery-panel" style={{ padding: '20px', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label htmlFor="note-search" style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
            🔍 Search Knowledge Base
          </label>

          {/* Format Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`button ${activeTab === 'all' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setActiveTab('all')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              All Content ({FIELD_GUIDES.length + notesData.length})
            </button>
            <button
              type="button"
              className={`button ${activeTab === 'field-guides' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setActiveTab('field-guides')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              Featured Guides ({FIELD_GUIDES.length})
            </button>
            <button
              type="button"
              className={`button ${activeTab === 'notes' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setActiveTab('notes')}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              Quick Notes ({notesData.length})
            </button>
          </div>
        </div>

        {/* Category Filter Tabs with Real-Time Adaptive Counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Category:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(category => {
              const count = categoryCounts[category] ?? 0;
              const isSelected = activeCategory === category;
              const isDisabled = count === 0 && !isSelected;

              return (
                <button
                  key={category}
                  type="button"
                  className={`button ${isSelected ? 'button-primary' : 'button-secondary'}`}
                  onClick={() => {
                    if (count > 0 || isSelected) {
                      setActiveCategory(category);
                    }
                  }}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  aria-label={`${category} (${count} ${count === 1 ? 'item' : 'items'})`}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    opacity: isDisabled ? 0.45 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                  }}
                  title={count === 0 ? `No matching items in ${category}` : undefined}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div id="search-kb" className="discovery-controls">
          <input
            id="note-search"
            name="search-kb"
            type="search"
            className="discovery-input"
            placeholder="Search MacBook, AirDrop, DFU, Windows, Entra ID, RJ45 pinout, port flapping..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="button button-secondary discovery-reset"
              type="button"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Featured In-Depth Troubleshooting Articles */}
      {(activeTab === 'all' || activeTab === 'field-guides') && (
        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-heading)' }}>
                📖 In-Depth Field Troubleshooting Guides
              </h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                Extensive technical articles with pinout tables, CLI commands, and diagnostic matrices.
              </p>
            </div>
          </div>

          <div className="card-grid two">
            {filteredGuides.map(guide => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>

          {filteredGuides.length === 0 && activeTab === 'field-guides' && (
            <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
              No in-depth field guides found in &ldquo;{activeCategory}&rdquo;{searchTerm ? ` matching "${searchTerm}"` : ''}.
            </p>
          )}
        </section>
      )}

      {/* Practical Technical Notes Grid */}
      {(activeTab === 'all' || activeTab === 'notes') && (
        <section>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '16px', color: 'var(--text-heading)' }}>
            ⚡ Practical Technical Notes &amp; Checklists
          </h2>

          <div className="card-grid">
            {filteredNotes.map(note => (
              <NoteCard key={note.slug} note={note} />
            ))}
          </div>

          {filteredNotes.length === 0 && activeTab === 'notes' && (
            <p style={{ marginTop: '20px', color: 'var(--muted)' }}>
              No quick notes found in &ldquo;{activeCategory}&rdquo;{searchTerm ? ` matching "${searchTerm}"` : ''}. Try clearing your query.
            </p>
          )}
        </section>
      )}

      {/* Combined Empty State when activeTab === 'all' */}
      {activeTab === 'all' && totalFilteredCount === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', marginTop: '24px' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-heading)', fontWeight: 600, marginBottom: '8px' }}>
            No articles or notes found
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 16px' }}>
            No content matches category &ldquo;{activeCategory}&rdquo;{searchTerm ? ` and query "${searchTerm}"` : ''}.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeCategory !== 'All' && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setActiveCategory('All')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Reset Category to All
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
