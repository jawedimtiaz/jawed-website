import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toolsList } from '../data/toolsData';
import { notesList, getNoteCategory } from '../data/notesData';

export const HomePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const featuredTools = toolsList.slice(0, 4);
  const featuredNotes = notesList.slice(0, 4);

  return (
    <main id="main-content" className="container page">
      {/* Hero Section */}
      <section className="hero-section" style={{ padding: '3rem 0 2rem' }}>
        <p className="eyebrow">Portfolio &amp; Practical Workplace Technology Hub</p>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          IT Field Tech, Practical Guides &amp; Interactive Browser Tools
        </h1>
        <p className="lead" style={{ maxWidth: '48rem', marginBottom: '1.75rem' }}>
          Welcome! I’m <strong>Jawed Imtiaz</strong>, an IT Field Tech supporting users, devices, and enterprise technology at Milestone Technologies (supporting the Uber environment). I build structured troubleshooting workflows, technical documentation, and privacy-first browser tools for IT professionals and individuals.
        </p>
        <div className="actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link className="button" to="/work/">
            Explore My Work &amp; Experience →
          </Link>
          <Link className="button button-secondary" to="/tools/">
            Browse Interactive Tools →
          </Link>
          <Link className="button button-secondary" to="/ai/">
            Ask Jawed AI 🤖
          </Link>
        </div>
      </section>

      {/* Highlights / Quick Stats */}
      <section className="content-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '2.5rem' }}>
        <h2>Core Focus &amp; Recognition</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>Field &amp; Service Desk</strong>
            <span>Hands-on macOS, Windows, Jamf &amp; SaaS support</span>
          </div>
          <div className="stat">
            <strong>12 Interactive Tools</strong>
            <span>Client-side, privacy-first IT &amp; career utilities</span>
          </div>
          <div className="stat">
            <strong>30 Practical Notes</strong>
            <span>Step-by-step diagnostic workflows &amp; checklists</span>
          </div>
          <div className="stat">
            <strong>Multiple Awards</strong>
            <span>Tech Support Guru, Employee of Quarter, Jugaad Genius</span>
          </div>
        </div>
      </section>

      {/* Featured Tools Showcase */}
      <section className="content-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p className="eyebrow">Interactive Tools</p>
            <h2 style={{ margin: 0 }}>Practical Browser Utilities</h2>
          </div>
          <Link to="/tools/" className="button button-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            View All 12 Tools →
          </Link>
        </div>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Built with zero server tracking and full client-side execution. Designed to save time during ticket handoffs, troubleshooting, interview prep, and personal planning.
        </p>
        <div className="card-grid">
          {featuredTools.map((tool) => (
            <article key={tool.slug} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: '0.75rem' }}>
                {tool.category}
              </span>
              <h3>{tool.title}</h3>
              <p style={{ flex: 1, fontSize: '0.95rem' }}>{tool.description}</p>
              <div style={{ marginTop: '1rem' }}>
                <Link to={tool.path} className="button button-secondary" style={{ width: '100%', textAlign: 'center' }}>
                  Launch Tool →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Selected Work Evidence */}
      <section className="content-section">
        <p className="eyebrow">Operational Methodology</p>
        <h2>From Symptoms to Resolution</h2>
        <p>
          Technical support requires structured problem isolation rather than guessing. Here is the operational philosophy applied across my projects and documentation:
        </p>
        <div className="card-grid">
          <article className="card">
            <h3>1. Isolate Scope &amp; User Impact</h3>
            <p>
              Clarify what task is blocked, distinguish whether the issue is isolated to a single user, device, or enterprise service, and record exact timestamps.
            </p>
            <Link to="/notes/scoping-it-issues-user-device-service/">Read Scoping Guide →</Link>
          </article>
          <article className="card">
            <h3>2. Layered Diagnostics</h3>
            <p>
              Test lowest-risk assumptions first: physical connectivity, IP leasing, DNS resolution, TLS certificates, identity tokens, and app permissions.
            </p>
            <Link to="/notes/networking-layer-by-layer-diagnostic-framework/">Read Layered Framework →</Link>
          </article>
          <article className="card">
            <h3>3. Repeatable Handoffs</h3>
            <p>
              Document exact reproduction steps, changes tested, validated outcomes, and actionable next steps so colleagues never have to re-test blind.
            </p>
            <Link to="/notes/it-support-escalation-handoff-checklist/">Read Escalation Checklist →</Link>
          </article>
        </div>
      </section>

      {/* Latest Technical Notes */}
      <section className="content-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p className="eyebrow">Knowledge Base</p>
            <h2 style={{ margin: 0 }}>Recent Technical Guides &amp; Notes</h2>
          </div>
          <Link to="/notes/" className="button button-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            Browse All 30 Notes →
          </Link>
        </div>
        <div className="card-grid">
          {featuredNotes.map((note) => (
            <article key={note.slug} className="card">
              <span className="badge" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                {getNoteCategory(note)}
              </span>
              <h3 style={{ fontSize: '1.15rem' }}>
                <Link to={`/notes/${note.slug}/`}>{note.title}</Link>
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                {note.readTime} read · Updated {note.updatedDate}
              </p>
              <p style={{ fontSize: '0.95rem' }}>{note.summary}</p>
              <Link to={`/notes/${note.slug}/`} style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Read Note →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* What are you looking for banner */}
      <section className="content-section" style={{ backgroundColor: 'var(--surface-accent)', borderRadius: '8px', padding: '2rem', border: '1px solid var(--line)' }}>
        <h2>Need help with a specific IT scenario or career step?</h2>
        <p style={{ maxWidth: '44rem', marginBottom: '1.5rem' }}>
          Use the instant Jawed AI assistant to search across all 30 notes, tool documentation, and career materials, or reach out directly for workplace tech collaboration.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/ai/" className="button">
            Open Jawed AI Assistant →
          </Link>
          <Link to="/contact/" className="button button-secondary">
            Contact Jawed →
          </Link>
        </div>
      </section>
    </main>
  );
};
