import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';

export const NotFoundPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/guides?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/guides');
    }
  };

  return (
    <main className="container page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <SeoHead
        title="404 — Page Not Found"
        description="The requested page could not be found on jawed.co.in. Navigate back to technical guides, subnet calculators, or contact Jawed Imtiaz."
        canonicalUrl="https://jawed.co.in/404"
      />

      <div
        className="card"
        style={{
          maxWidth: '680px',
          width: '100%',
          textAlign: 'center',
          padding: '48px 32px',
          borderRadius: '20px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <span className="badge" style={{ fontSize: '0.85rem', padding: '4px 14px' }}>
            404 · Route Not Found
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', margin: '0 0 12px', color: 'var(--text-heading)' }}>
          Looking for Technical Resources?
        </h1>

        <p className="lead" style={{ maxWidth: '520px', margin: '0 auto 28px', fontSize: '1.05rem', color: 'var(--muted-light)' }}>
          The link you clicked may have moved or been updated. Don’t worry—our technical guides, IPv4 subnet tools, and IT support resources are easily accessible.
        </p>

        {/* Quick Search Form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '480px', margin: '0 auto 32px' }}>
          <input
            type="text"
            className="discovery-input"
            placeholder="Search guides, subnet tools, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search site documentation"
          />
          <button type="submit" className="button button-primary" style={{ whiteSpace: 'nowrap' }}>
            Search KB
          </button>
        </form>

        {/* Recommended Popular Destinations */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginTop: '24px',
          }}
        >
          <Link to="/" className="ribbon-link" style={{ justifyContent: 'center', padding: '12px', borderRadius: '12px' }}>
            <span>🏠 Homepage</span>
          </Link>
          <Link to="/guides" className="ribbon-link" style={{ justifyContent: 'center', padding: '12px', borderRadius: '12px' }}>
            <span>📖 Guides</span>
          </Link>
          <Link to="/tools" className="ribbon-link" style={{ justifyContent: 'center', padding: '12px', borderRadius: '12px' }}>
            <span>🛠️ Tools</span>
          </Link>
          <Link to="/contact" className="ribbon-link" style={{ justifyContent: 'center', padding: '12px', borderRadius: '12px' }}>
            <span>✉️ Contact Jawed</span>
          </Link>
        </div>
      </div>
    </main>
  );
};
