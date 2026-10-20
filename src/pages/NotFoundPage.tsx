import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <main className="container page" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p className="eyebrow">404 Error</p>
      <h1>Page Not Found</h1>
      <p className="lead" style={{ maxWidth: '540px', margin: '0 auto 24px' }}>
        The page you are looking for does not exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <Link className="button button-primary" to="/">
          Return Home
        </Link>
        <Link className="button button-secondary" to="/notes">
          Browse Notes
        </Link>
        <Link className="button button-secondary" to="/tools">
          Explore Tools
        </Link>
      </div>
    </main>
  );
};
