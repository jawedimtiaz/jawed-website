import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { FieldGuideDetailPage } from './FieldGuideDetailPage';
import { Breadcrumb } from '../components/Breadcrumb';

export const NoteDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Check if slug belongs to a Field Guide first
  const fieldGuide = FIELD_GUIDES.find(g => g.slug === slug);
  if (fieldGuide) {
    return <FieldGuideDetailPage />;
  }

  // Otherwise check notesData
  const note = notesData.find(n => n.slug === slug);

  if (!note) {
    return <Navigate to="/guides" replace />;
  }

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Guides', href: '/guides' },
          { label: note.title },
        ]}
        style={{ marginBottom: '16px' }}
      />

      <div
        className="note-rendered-content"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link className="button button-secondary" to="/guides">
          ← Back to All Guides &amp; Notes
        </Link>
        <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
          Launch IT Troubleshooting Assistant →
        </Link>
      </div>
    </main>
  );
};
