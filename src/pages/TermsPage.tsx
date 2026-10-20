import React from 'react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Terms of Service</span>
      </nav>

      <p className="eyebrow">Legal &amp; Compliance</p>
      <h1>Terms of Service</h1>
      <p className="meta" style={{ color: 'var(--muted)', marginBottom: '24px' }}>
        Effective Date: October 20, 2026
      </p>

      <section className="content-section">
        <h2>1. Agreement to Terms</h2>
        <p>
          By accessing or using <strong>Jawed.co.in</strong>, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use this website or its interactive utilities.
        </p>
      </section>

      <section className="content-section">
        <h2>2. Educational &amp; Informational Disclaimer</h2>
        <p>
          All field guides, technical checklists, diagnostic tools, and personal finance calculators provided on this website are for educational and operational reference purposes only. They do not constitute official enterprise IT warranty, binding SLA commitments, or personalized financial advice.
        </p>
      </section>

      <section className="content-section">
        <h2>3. Use of Interactive Diagnostic Tools</h2>
        <p>
          Our diagnostic utilities run client-side in your browser. Users are solely responsible for verifying tool outputs before making changes to live corporate production systems, firewalls, or financial portfolios. Do not submit active user passwords, private API keys, or confidential employer data into any public tool.
        </p>
      </section>

      <section className="content-section">
        <h2>4. Field Services &amp; Dispatch Inquiries</h2>
        <p>
          Submitting a dispatch request or service inquiry through our Services page constitutes a preliminary request for information. It does not establish a binding emergency response contract until written scope, rate agreement, and confirmation are provided by Jawed Imtiaz.
        </p>
      </section>

      <section className="content-section">
        <h2>5. Intellectual Property</h2>
        <p>
          All original articles, technical diagrams, custom diagnostic tool code, and site designs are the intellectual property of Jawed Imtiaz. Re-publication or commercial redistribution without prior written consent is strictly prohibited.
        </p>
      </section>

      <section className="content-section">
        <h2>6. Limitation of Liability</h2>
        <p>
          In no event shall Jawed Imtiaz or Jawed.co.in be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the content or tools provided on this website.
        </p>
      </section>

      <section className="content-section">
        <h2>7. Contact</h2>
        <p>
          For legal inquiries or questions regarding these terms, please contact <a href="mailto:webmaster@jawed.co.in">webmaster@jawed.co.in</a>.
        </p>
      </section>
    </main>
  );
};
