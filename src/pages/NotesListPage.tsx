import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';

export const CATEGORIES = [
  'All',
  'Network & Cabling',
  'Server & Hardware',
  'macOS & Endpoints',
  'Service Desk & ITSM',
] as const;

export type NoteCategory = typeof CATEGORIES[number];

interface NoteItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
  content?: string;
}

const NOTE_CATEGORY_FALLBACK: Record<string, string> = {
  'network-connectivity-first-response-checklist': 'Network & Cabling',
  'networking-layer-by-layer-diagnostic-framework': 'Network & Cabling',
  'interactive-tools-ai-assisted-experiences-architecture': 'Server & Hardware',
  'scoping-it-issues-user-device-service': 'Server & Hardware',
  'small-it-automation-starting-point': 'Server & Hardware',
  'apple-device-management-enrollment-models': 'macOS & Endpoints',
  'apple-macos-first-response-checklist': 'macOS & Endpoints',
  'windows-first-response-troubleshooting-checklist': 'macOS & Endpoints',
  'device-provisioning-handoff-checklist': 'macOS & Endpoints',
  'microsoft-sign-in-troubleshooting-guide': 'macOS & Endpoints',
};

const getNoteCategory = (note: NoteItem): string => {
  return note.category || NOTE_CATEGORY_FALLBACK[note.slug] || 'Service Desk & ITSM';
};

export const NotesListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'field-guides' | 'notes'>('all');
  const [activeCategory, setActiveCategory] = useState<NoteCategory>('All');

  const q = searchTerm.toLowerCase();

  const filteredGuides = FIELD_GUIDES.filter(g => {
    const matchesSearch = !q || (
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.keywords.some(k => k.toLowerCase().includes(q))
    );
    const matchesCategory = activeCategory === 'All' || g.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredNotes = (notesData as NoteItem[]).filter(note => {
    const category = getNoteCategory(note);
    const matchesSearch = !q || (
      note.title.toLowerCase().includes(q) ||
      note.description.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
    const matchesCategory = activeCategory === 'All' || category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Category:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                className={`button ${activeCategory === category ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setActiveCategory(category)}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="discovery-controls">
          <input
            id="note-search"
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
              <article key={guide.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--accent)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                      {guide.category}
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
            {filteredNotes.map(note => {
              const cat = getNoteCategory(note);
              return (
                <article key={note.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                        {cat}
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
              );
            })}
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

