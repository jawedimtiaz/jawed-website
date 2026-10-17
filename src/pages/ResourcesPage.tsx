import React, { useState, useMemo } from 'react';
import { resourcesList } from '../data/resourcesData';

export const ResourcesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const categories = ['All', 'Apple & macOS', 'Microsoft & Azure', 'ITSM & Frameworks', 'Personal Finance'];

  const filteredResources = useMemo(() => {
    return resourcesList.filter((res) => {
      const matchCat = selectedCategory === 'All' || res.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        res.title.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.source.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">Curated Links &amp; Authoritative Sources</p>
      <h1>IT &amp; Planning Resources</h1>
      <p className="lead" style={{ maxWidth: '48rem', marginBottom: '2rem' }}>
        A curated inventory of official vendor documentation, standards, and authoritative references across Apple platform deployment, Microsoft 365, ITIL service management, and regulated finance.
      </p>

      {/* Filter and Search */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="search"
            placeholder="Search documentation, sources, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.95rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`button ${selectedCategory === cat ? '' : 'button-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Showing <strong>{filteredResources.length}</strong> official resources
      </p>

      <div className="card-grid">
        {filteredResources.map((res, index) => (
          <article key={index} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ fontSize: '0.75rem' }}>{res.category}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>{res.source}</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', margin: '0.25rem 0 0.5rem' }}>{res.title}</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text)', flex: 1, margin: '0 0 1rem', lineHeight: 1.5 }}>
              {res.description}
            </p>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem', marginTop: 'auto' }}>
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-secondary"
                style={{ width: '100%', textAlign: 'center', fontSize: '0.88rem' }}
              >
                Visit Documentation ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};
