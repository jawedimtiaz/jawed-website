import React from 'react';
import { Link } from 'react-router-dom';
import { topicsList } from '../data/topicsData';
import { notesList } from '../data/notesData';
import { toolsList } from '../data/toolsData';

export const TopicsPage: React.FC = () => {
  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">Taxonomy &amp; Knowledge Hub</p>
      <h1>Topics &amp; Knowledge Areas</h1>
      <p className="lead" style={{ maxWidth: '48rem', marginBottom: '2.5rem' }}>
        Explore technical guides, checklists, and interactive tools organized by functional area: Service Desk triage, device management, networking, automation, career progression, and personal finance.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {topicsList.map((topic) => {
          const matchedNotes = notesList.filter((n) => topic.notesSlugs.includes(n.slug));
          const matchedTools = toolsList.filter((t) => topic.toolsSlugs.includes(t.slug));

          return (
            <section
              key={topic.id}
              id={topic.id}
              className="content-section"
              style={{
                backgroundColor: 'var(--surface)',
                padding: '2rem',
                borderRadius: '8px',
                border: '1px solid var(--line)'
              }}
            >
              <p className="eyebrow">{topic.eyebrow}</p>
              <h2 style={{ fontSize: '1.6rem', margin: '0.25rem 0 0.5rem' }}>{topic.name}</h2>
              <p style={{ maxWidth: '44rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {topic.description}
              </p>

              {/* Matched Tools */}
              {matchedTools.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--accent)' }}>
                    🛠️ Interactive Tools in this Topic
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {matchedTools.map((tool) => (
                      <div key={tool.slug} style={{ background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <h4 style={{ margin: '0 0 0.4rem', fontSize: '1rem' }}>{tool.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>{tool.description}</p>
                        <Link to={tool.path} className="button button-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>
                          Launch Tool →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Notes */}
              {matchedNotes.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--accent)' }}>
                    📖 Guides &amp; Checklists
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {matchedNotes.map((note) => (
                      <li key={note.slug} style={{ background: '#fff', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <Link to={`/notes/${note.slug}/`} style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {note.title}
                          </Link>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: '0.75rem' }}>
                            ({note.readTime} read)
                          </span>
                        </div>
                        <Link to={`/notes/${note.slug}/`} style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }}>
                          Read Note →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
};
