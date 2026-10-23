import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { FieldGuideDetailPage } from './FieldGuideDetailPage';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

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

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/notes/${note.slug}`;

  return (
    <main className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Guides', href: '/guides' },
            { label: note.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title={note.title}
          text={note.description}
          url={shareUrl}
        />
      </div>

      <div
        className="note-rendered-content"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to="/guides">
            ← Back to All Guides &amp; Notes
          </Link>
          <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
            Launch IT Troubleshooting Assistant →
          </Link>
        </div>
        <SocialShareBar
          title={note.title}
          text={note.description}
          url={shareUrl}
        />
      </div>
    </main>
  );
};
