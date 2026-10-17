import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { notesList, getNoteCategory } from '../data/notesData';

export const NoteDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Clean slug if trailing slash was captured
  const cleanSlug = slug?.replace(/\/$/, '');
  const note = notesList.find((n) => n.slug === cleanSlug);

  if (!note) {
    return (
      <main id="main-content" className="container page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Note Not Found</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          The requested guide or checklist could not be located.
        </p>
        <Link to="/notes/" className="button">
          ← Back to All Notes
        </Link>
      </main>
    );
  }

  const category = getNoteCategory(note);

  // Find other notes in same subject/category
  const relatedNotes = notesList
    .filter((n) => n.slug !== note.slug && getNoteCategory(n) === category)
    .slice(0, 3);

  return (
    <main id="main-content" className="container page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        <Link to="/">Home</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <Link to="/notes/">Notes</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{note.title}</span>
      </div>

      <p className="eyebrow">{note.eyebrow}</p>
      <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', lineHeight: 1.2, marginBottom: '1rem' }}>
        {note.title}
      </h1>

      {/* Meta Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
        <span><strong>Subject:</strong> {category}</span>
        <span>•</span>
        <span><strong>Task:</strong> {note.task}</span>
        <span>•</span>
        <span><strong>Type:</strong> {note.type}</span>
        {note.audience && (
          <>
            <span>•</span>
            <span><strong>Audience:</strong> {note.audience}</span>
          </>
        )}
        <span>•</span>
        <span><strong>Updated:</strong> {note.updatedDate}</span>
        <span>•</span>
        <span><strong>Read Time:</strong> {note.readTime}</span>
      </div>

      {/* Lead Paragraph */}
      <p className="lead" style={{ maxWidth: '50rem', marginBottom: '2rem' }}>
        {note.lead}
      </p>

      {/* Key Takeaway / Quick Scoping Box */}
      <div style={{ backgroundColor: 'var(--surface-accent)', borderLeft: '4px solid var(--accent)', padding: '1.25rem 1.5rem', borderRadius: '0 8px 8px 0', marginBottom: '2.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--accent)', fontSize: '1.05rem' }}>Core Methodology &amp; Takeaway</h3>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>{note.summary}</p>
      </div>

      {/* Structured Content & Diagnostic Steps */}
      <div className="content-body" style={{ maxWidth: '52rem' }}>
        <section className="content-section" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>1. Diagnostic Context &amp; Objectives</h2>
          <p style={{ lineHeight: 1.7, fontSize: '1rem', marginBottom: '1rem' }}>
            When approaching this workflow in a production environment, isolating variables early prevents unnecessary configuration disruption and reduces Mean Time to Resolution (MTTR).
          </p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.7, fontSize: '0.98rem' }}>
            <li><strong>Primary Target:</strong> Deliver actionable results for {note.audience || 'support technicians and users'}.</li>
            <li><strong>Risk Profile:</strong> Verify system state before applying any reversible configuration changes.</li>
            <li><strong>Scope Verification:</strong> Check if symptoms follow the user profile, device hardware, or corporate tenant.</li>
          </ul>
        </section>

        <section className="content-section" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>2. Step-by-Step Procedure &amp; Verification</h2>
          <p style={{ lineHeight: 1.7, fontSize: '1rem', marginBottom: '1rem' }}>
            Follow these ordered stages sequentially, confirming each checkpoint before escalating:
          </p>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.7, fontSize: '0.98rem' }}>
            <li style={{ marginBottom: '0.75rem' }}>
              <strong>Baseline Observation:</strong> Document the exact symptom, error code, and timestamp when the failure occurred. Avoid acting on colloquial summaries like "it broke".
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              <strong>Least-Disruptive Check:</strong> Inspect local services, network reachability, identity authentication status, and local logs.
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              <strong>Targeted Remediation:</strong> Execute the minimal supported change (e.g. refreshing tokens, verifying configuration profile, clearing temporary state).
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              <strong>Validation Against User Task:</strong> Have the user repeat their original blocking action in normal operating mode to confirm resolution.
            </li>
          </ol>
        </section>

        <section className="content-section" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>3. Escalation &amp; Handoff Boundary</h2>
          <p style={{ lineHeight: 1.7, fontSize: '1rem' }}>
            If the issue is not resolved after basic isolation, escalate to the responsible engineering or infrastructure team with documented logs, reproduction steps, and tested hypotheses.
          </p>
        </section>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>Tags:</span>
            {note.tags.map((tag) => (
              <span key={tag} className="badge" style={{ fontSize: '0.75rem', background: 'var(--surface)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Linked Interactive Tools if specified */}
      {note.relatedTools && note.relatedTools.length > 0 && (
        <section className="content-section" style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)', margin: '3rem 0' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>🛠️ Interactive Tools for this Workflow</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
            Open the browser-based tool to format notes or test calculations locally:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {note.relatedTools.map((tool, tIdx) => (
              <div key={tIdx} style={{ background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{tool.title}</h4>
                <Link to={tool.path} className="button button-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                  Open {tool.title} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Notes */}
      {relatedNotes.length > 0 && (
        <section className="content-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '2.5rem' }}>
          <h2>Related Notes in {category}</h2>
          <div className="card-grid">
            {relatedNotes.map((rel) => (
              <article key={rel.slug} className="card">
                <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  {getNoteCategory(rel)}
                </span>
                <h3>
                  <Link to={`/notes/${rel.slug}/`}>{rel.title}</Link>
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                  {rel.readTime}
                </p>
                <p style={{ fontSize: '0.95rem' }}>{rel.summary}</p>
                <Link to={`/notes/${rel.slug}/`} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent)' }}>
                  Read Guide →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Return Links */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--line)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/notes/" className="button button-secondary">
          ← Back to All Notes
        </Link>
        <Link to="/contact/" className="button">
          Questions? Contact Jawed →
        </Link>
      </div>
    </main>
  );
};
