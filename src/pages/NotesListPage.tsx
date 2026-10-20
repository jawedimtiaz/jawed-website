import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import notesData from '../data/notesData.json';

export const NotesListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = notesData.filter(note => {
    const q = searchTerm.toLowerCase();
    return note.title.toLowerCase().includes(q) || note.description.toLowerCase().includes(q);
  });

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Notes</span>
      </nav>

      <p className="eyebrow">Knowledge Base</p>
      <h1>Practical Notes</h1>
      <p className="lead">
        Handcrafted technical checklists, IT service desk troubleshooting workflows, endpoint administration guides, and personal finance frameworks.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        <label htmlFor="note-search" className="discovery-label">Search Notes</label>
        <div className="discovery-controls">
          <input
            id="note-search"
            type="search"
            className="discovery-input"
            placeholder="Search by topic, e.g. WiFi, macOS, tickets, retirement, tax..."
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
        {filtered.map(note => (
          <article key={note.slug} className="card">
            <h3>{note.title}</h3>
            <p>{note.description}</p>
            <Link to={`/notes/${note.slug}`}>Read Note →</Link>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ marginTop: '20px', color: 'var(--muted)' }}>
          No notes found matching "{searchTerm}". Try another search term or clear the filter.
        </p>
      )}
    </main>
  );
};
