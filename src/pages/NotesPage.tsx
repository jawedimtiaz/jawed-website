import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { notesList, getNoteCategory } from '../data/notesData';

export const NotesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'IT & Service Desk', 'Apple / Jamf', 'Networking', 'Automation', 'Personal Finance'];

  const filteredNotes = useMemo(() => {
    return notesList.filter((note) => {
      const noteCat = getNoteCategory(note);
      const matchesCategory =
        activeCategory === 'All' ||
        noteCat.toLowerCase().includes(activeCategory.toLowerCase()) ||
        note.subject.toLowerCase().includes(activeCategory.toLowerCase());
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.summary.toLowerCase().includes(q) ||
        noteCat.toLowerCase().includes(q) ||
        note.subject.toLowerCase().includes(q) ||
        (note.tags && note.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">Knowledge Base &amp; Documentation</p>
      <h1>Technical &amp; Practical Notes</h1>
      <p className="lead" style={{ maxWidth: '48rem', marginBottom: '2rem' }}>
        A collection of 30 practical, field-tested guides, diagnostic workflows, step-by-step checklists, and foundational financial notes. Designed for fast reference during active troubleshooting.
      </p>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="notes-search" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Search Notes by Keyword, Error, or Topic:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="notes-search"
              type="search"
              placeholder="e.g. DNS, Apple, Jamf, SIP, ServiceNow, VPN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.8rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.95rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSearchQuery('')}
                style={{ padding: '0.6rem 1rem' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, marginRight: '0.25rem' }}>Filter by:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`button ${activeCategory === cat ? '' : 'button-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
          Showing <strong>{filteredNotes.length}</strong> of {notesList.length} notes
        </p>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <h3>No matching notes found</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
            Try adjusting your search keywords or choosing "All" categories.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('All');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {filteredNotes.map((note) => (
            <article key={note.slug} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge" style={{ fontSize: '0.75rem' }}>{getNoteCategory(note)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{note.readTime} read</span>
              </div>
              <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem' }}>
                <Link to={`/notes/${note.slug}/`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {note.title}
                </Link>
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', flex: 1, margin: '0 0 1rem' }}>
                {note.summary}
              </p>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Updated {note.updatedDate}</span>
                <Link to={`/notes/${note.slug}/`} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent)' }}>
                  Read Guide →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
