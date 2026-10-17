import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toolsList } from '../data/toolsData';

export const ToolsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'IT Support', 'Career', 'AI & Productivity', 'Finance'];

  const filteredTools = useMemo(() => {
    return toolsList.filter((tool) => {
      const matchCat = selectedCategory === 'All' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">Interactive Browser Utilities</p>
      <h1>Interactive Tools</h1>
      <p className="lead" style={{ maxWidth: '48rem', marginBottom: '2rem' }}>
        A suite of 12 privacy-preserving, client-side browser utilities designed for IT technicians, career builders, and financial planners. All calculations and text processing happen strictly inside your browser—no data is logged or sent to any server.
      </p>

      {/* Filter and Search */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="search"
            placeholder="Search tools by title, function, or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="card-grid">
        {filteredTools.map((tool) => (
          <article key={tool.slug} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ fontSize: '0.75rem' }}>{tool.category}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0.25rem 0 0.5rem' }}>{tool.title}</h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text)', flex: 1, margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              {tool.description}
            </p>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem', marginTop: 'auto' }}>
              <Link to={tool.path} className="button" style={{ width: '100%', textAlign: 'center', fontSize: '0.9rem' }}>
                Open Tool →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};
