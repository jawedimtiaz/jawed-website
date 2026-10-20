import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';

export const NotesListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'field-guides' | 'notes'>('all');

  const q = searchTerm.toLowerCase();

  const filteredGuides = FIELD_GUIDES.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.description.toLowerCase().includes(q) ||
    g.category.toLowerCase().includes(q) ||
    g.keywords.some(k => k.toLowerCase().includes(q))
  );

  const filteredNotes = notesData.filter(note =>
    note.title.toLowerCase().includes(q) ||
    note.description.toLowerCase().includes(q)
  );

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Field Guides &amp; Knowledge Base</span>
      </nav>

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

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
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

          {filteredGuides.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>No in-depth field guides matched your search.</p>
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
              <article key={note.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginTop: 0, marginBottom: '8px' }}>{note.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{note.description}</p>
                </div>
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  <Link to={`/notes/${note.slug}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                    Read Quick Note →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <p style={{ marginTop: '20px', color: 'var(--muted)' }}>
              No quick notes found matching "{searchTerm}". Try clearing your query.
            </p>
          )}
        </section>
      )}
    </main>
  );
};
