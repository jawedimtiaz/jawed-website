import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES, type FieldGuide } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { CATEGORIES, type NoteCategory, type BaseCategory, determineCategory } from '../utils/categoryHelper';

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

// Memoized individual guide card to prevent re-renders when other items or query state update
const GuideCard = React.memo<{ guide: SearchableGuide }>(({ guide }) => (
  <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--accent)' }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
          {guide.resolvedCategory}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{guide.readTime}</span>
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

  // Pre-index guides with resolved categories and lowercase search strings once
  const indexedGuides = useMemo<SearchableGuide[]>(() => {
    return FIELD_GUIDES.map(guide => {
      const resolvedCategory = determineCategory(guide);
      return {
        ...guide,
        resolvedCategory,
        searchString: `${guide.title} ${guide.description} ${resolvedCategory} ${guide.keywords.join(' ')}`.toLowerCase(),
      };
    });
  }, []);

  // Pre-index notes with resolved categories and lowercase search strings once
  const indexedNotes = useMemo<SearchableNote[]>(() => {
    return (notesData as NoteItem[]).map(note => {
      const resolvedCategory = determineCategory(note);
      return {
        ...note,
        resolvedCategory,
        searchString: `${note.title} ${note.description} ${resolvedCategory}`.toLowerCase(),
      };
    });
  }, []);

  // useMemo hook for calculating active category counts efficiently during typing & tab switching
  const categoryCounts = useMemo<Record<NoteCategory, number>>(() => {
    const q = searchTerm.trim().toLowerCase();
    const includeGuides = activeTab === 'all' || activeTab === 'field-guides';
    const includeNotes = activeTab === 'all' || activeTab === 'notes';

    const counts: Record<NoteCategory, number> = {
      'All': 0,
      'Network & Cabling': 0,
      'Server & Hardware': 0,
      'macOS & Endpoints': 0,
      'Service Desk & ITSM': 0,
    };

    if (includeGuides) {
      for (let i = 0; i < indexedGuides.length; i++) {
        const guide = indexedGuides[i];
        if (!q || guide.searchString.includes(q)) {
          counts['All']++;
          counts[guide.resolvedCategory] = (counts[guide.resolvedCategory] || 0) + 1;
        }
      }
    }

    if (includeNotes) {
      for (let i = 0; i < indexedNotes.length; i++) {
        const note = indexedNotes[i];
        if (!q || note.searchString.includes(q)) {
          counts['All']++;
          counts[note.resolvedCategory] = (counts[note.resolvedCategory] || 0) + 1;
        }
      }
    }

    return counts;
  }, [indexedGuides, indexedNotes, searchTerm, activeTab]);

  // useMemo hook for calculating filtered guides
  const filteredGuides = useMemo<SearchableGuide[]>(() => {
    if (activeTab === 'notes') return [];
    const q = searchTerm.trim().toLowerCase();

    return indexedGuides.filter(guide => {
      const matchesSearch = !q || guide.searchString.includes(q);
      const matchesCategory = activeCategory === 'All' || guide.resolvedCategory === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [indexedGuides, searchTerm, activeTab, activeCategory]);

  // useMemo hook for calculating filtered notes
  const filteredNotes = useMemo<SearchableNote[]>(() => {
    if (activeTab === 'field-guides') return [];
    const q = searchTerm.trim().toLowerCase();

    return indexedNotes.filter(note => {
      const matchesSearch = !q || note.searchString.includes(q);
      const matchesCategory = activeCategory === 'All' || note.resolvedCategory === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [indexedNotes, searchTerm, activeTab, activeCategory]);

  const totalFilteredCount = filteredGuides.length + filteredNotes.length;

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Field Guides &amp; Knowledge Base</span>
      </nav>

      {/* Top Leaderboard Ad Slot */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <p className="eyebrow">Technical Articles &amp; Operational Knowledge</p>
      <h1>Field Guides &amp; Knowledge Base</h1>
      <p className="lead">
        Comprehensive field troubleshooting guides, ANSI cabling pinouts, switch port CLI commands, server LED diagnostic cheatsheets, and practical service desk workflows.
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
            placeholder="Search RJ45 pinout, port flapping, PowerEdge LED, Cisco CLI, WiFi, macOS..."
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


