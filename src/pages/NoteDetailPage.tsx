import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';

export const NoteDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const note = notesData.find(n => n.slug === slug);

  if (!note) {
    return <Navigate to="/notes" replace />;
  }

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
        <Link to="/">Home</Link> &gt; <Link to="/notes">Notes</Link> &gt; <span>{note.title}</span>
      </nav>

      <div
        className="note-rendered-content"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
        <Link className="button button-secondary" to="/notes">
          ← Back to All Notes
        </Link>
      </div>
    </main>
  );
};
