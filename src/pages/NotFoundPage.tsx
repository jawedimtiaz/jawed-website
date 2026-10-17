import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <main id="main-content" className="container narrow page" style={{ textAlign: 'center', padding: '5rem 1rem 4rem' }}>
      <p className="eyebrow" style={{ color: 'var(--accent)' }}>404 Error</p>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1rem' }}>Page Not Found</h1>
      <p className="lead" style={{ maxWidth: '36rem', margin: '0 auto 2rem' }}>
        The page, guide, or tool you were looking for doesn’t exist or has moved.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
        <Link to="/" className="button">
          ← Return to Home
        </Link>
        <Link to="/tools/" className="button button-secondary">
          Explore Tools
        </Link>
        <Link to="/notes/" className="button button-secondary">
          Browse Notes
        </Link>
        <Link to="/ai/" className="button button-secondary">
          Ask Jawed AI
        </Link>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)', maxWidth: '32rem', margin: '0 auto', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Looking for something specific?</h3>
        <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.7, fontSize: '0.95rem' }}>
          <li><Link to="/notes/it-service-desk-troubleshooting-workflow/">IT Troubleshooting Workflow</Link></li>
          <li><Link to="/tools/service-desk-note-formatter/">Service Desk Note Formatter</Link></li>
          <li><Link to="/tools/career-match-resume-review/">Career Match &amp; Resume Review</Link></li>
          <li><Link to="/work/">Jawed’s Experience &amp; Skills</Link></li>
        </ul>
      </div>
    </main>
  );
};
