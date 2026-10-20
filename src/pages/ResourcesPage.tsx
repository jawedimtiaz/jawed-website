import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ResourcesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const q = searchTerm.toLowerCase();

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Resources</span>
      </nav>

      <p className="eyebrow">Curated technical references</p>
      <h1>IT Support &amp; Web Resources</h1>
      <p className="lead">
        Official documentation and practical references for IT support, Apple and Jamf, Microsoft, web development and deployment. I prefer primary documentation when it is available.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        <h2>Find a Resource</h2>
        <div className="discovery-controls" style={{ marginTop: '8px' }}>
          <input
            className="discovery-input"
            type="search"
            placeholder="Search resources by name, subject or purpose..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="button button-secondary discovery-reset"
              type="button"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card-grid">
        {(!q || 'apple support macos'.includes(q)) && (
          <article className="card">
            <h2>Apple</h2>
            <p>Official Apple support and product help.</p>
            <a href="https://support.apple.com/en-in" target="_blank" rel="noopener noreferrer">Apple Support →</a>
          </article>
        )}
        {(!q || 'jamf mdm apple management'.includes(q)) && (
          <article className="card">
            <h2>Jamf</h2>
            <p>Jamf Pro documentation and Apple device management learning resources.</p>
            <a href="https://learn.jamf.com/r/en-US/jamf-pro-documentation-current" target="_blank" rel="noopener noreferrer">Jamf Pro Documentation →</a>
          </article>
        )}
        {(!q || 'microsoft learn windows entra 365'.includes(q)) && (
          <article className="card">
            <h2>Microsoft</h2>
            <p>Microsoft documentation and learning resources.</p>
            <a href="https://learn.microsoft.com/en-us/" target="_blank" rel="noopener noreferrer">Microsoft Learn →</a>
          </article>
        )}
        {(!q || 'cloudflare pages deploy cdn'.includes(q)) && (
          <article className="card">
            <h2>Cloudflare</h2>
            <p>Documentation for Cloudflare Pages and web deployment.</p>
            <a href="https://developers.cloudflare.com/pages/" target="_blank" rel="noopener noreferrer">Cloudflare Pages Docs →</a>
          </article>
        )}
        {(!q || 'github git actions repository'.includes(q)) && (
          <article className="card">
            <h2>GitHub</h2>
            <p>Repository, Git and collaboration documentation.</p>
            <a href="https://docs.github.com/en" target="_blank" rel="noopener noreferrer">GitHub Docs →</a>
          </article>
        )}
        {(!q || 'web development mdn html css javascript'.includes(q)) && (
          <article className="card">
            <h2>Web Development</h2>
            <p>Open web documentation for HTML, CSS, JavaScript and Web APIs.</p>
            <a href="https://developer.mozilla.org/en-US/docs/Web" target="_blank" rel="noopener noreferrer">MDN Web Docs →</a>
          </article>
        )}
      </div>

      <section className="content-section" style={{ marginTop: '32px' }}>
        <h2>A Practical Reference-First Workflow</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li><strong>Define the task:</strong> write down what should work, what happens instead, and which user, device, application or service is in scope.</li>
          <li><strong>Identify the environment:</strong> note the operating system, product or service, relevant version, device ownership/management context and any known constraints.</li>
          <li><strong>Start with the primary source:</strong> prefer the vendor's current documentation or release notes. Check whether the page applies to your version and configuration.</li>
          <li><strong>Separate guidance from diagnosis:</strong> documentation explains supported behavior; it does not prove that a particular issue has the same cause. Use observed evidence to choose the next check.</li>
          <li><strong>Apply changes within scope:</strong> follow organizational procedures and permissions. Stop before a step that affects security, data, identity, management or shared infrastructure without the required approval.</li>
          <li><strong>Verify and record:</strong> repeat the original user task, capture the result, and document the reference and relevant step so the next technician can continue from the same point.</li>
        </ol>
      </section>
    </main>
  );
};
