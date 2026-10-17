import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Site Information</p>
      <h1>Privacy &amp; Data Handling Policy</h1>
      <p className="meta" style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Last Updated: October 2026
      </p>

      <section className="content-section">
        <h2>Privacy Commitment</h2>
        <p>
          This policy explains transparently how information is handled on <code>jawed.co.in</code>. I believe in minimal data collection and building client-side tools that respect user boundaries.
        </p>
      </section>

      <section className="content-section">
        <h2>Information Collected &amp; Contact</h2>
        <p>
          This website does not require you to create an account, log in, or provide personal credentials to browse articles, read documentation, or use utilities. The contact form does not store messages on a database—it simply initiates your device’s native email client addressed to <code>webmaster@jawed.co.in</code>.
        </p>
      </section>

      <section className="content-section">
        <h2>Browser-Based Tools &amp; Local Processing</h2>
        <p>
          The tools on this site (including the <strong>Service Desk Note Formatter</strong>, <strong>IT Troubleshooting Assistant</strong>, <strong>Ticket to KB Draft</strong>, <strong>AI Prompt Builder</strong>, <strong>Career Match &amp; Resume Review</strong>, <strong>Resume Bullet Strength Checker</strong>, <strong>STAR Interview Planner</strong>, and all <strong>Financial Calculators</strong>) process data strictly within your browser:
        </p>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
          <li>Inputted ticket descriptions, salary numbers, investment figures, and resumes are evaluated in memory locally and are never transmitted to external servers.</li>
          <li>Features like "Save Analysis" in Career Match utilize browser <code>localStorage</code> on your machine only. You can delete or clear saved analyses at any time via the tool interface or browser settings.</li>
          <li>Do not input sensitive workplace credentials, passwords, unannounced company financial results, or customer PII into any web tool.</li>
        </ul>
      </section>

      <section className="content-section">
        <h2>Jawed AI Assistant &amp; Data Safeguards</h2>
        <p>
          When interacting with the Jawed AI assistant or floating widget, queries are processed using client-side knowledge retrieval against public site pages with deterministic safety guardrails. When configured for live LLM inference, conversation messages are evaluated against site reference material.
        </p>
        <p>
          Never enter passwords, private encryption keys, authentication codes, or confidential employer support tickets. Treat AI responses as quick reference starting points and verify against official vendor documentation.
        </p>
      </section>

      <section className="content-section">
        <h2>Analytics &amp; Cookies</h2>
        <p>
          This site may use privacy-conscious analytics (such as Google Analytics 4) to understand aggregate metrics like page views, device categories, and popular guides. Analytics cookies do not collect personally identifiable information such as names, email addresses, or specific user identifiers.
        </p>
      </section>

      <section className="content-section">
        <h2>External References &amp; Official Documentation</h2>
        <p>
          This website provides curated links to external documentation from Apple, Microsoft, Jamf, Cisco, and financial authorities. When navigating external websites, their respective privacy policies and terms of service apply.
        </p>
      </section>

      <section className="content-section" style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem' }}>Financial Content Disclosure</h2>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 0.75rem', color: 'var(--text)' }}>
          This website provides general educational information and calculation tools only. It does not provide personalized investment, financial, legal, or tax advice. Jawed Imtiaz does not endorse or recommend specific securities, brokers, mutual funds, or transaction strategies.
        </p>
        <p style={{ fontSize: '0.92rem', lineHeight: 1.6, margin: 0, color: 'var(--muted)' }}>
          Jawed Imtiaz is not a SEBI-registered Investment Adviser or Research Analyst. Please verify current tax provisions, fund performance, and rules with official authoritative sources or certified financial planners (CFP) before making consequential decisions.
        </p>
      </section>

      <section className="content-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem', marginTop: '2rem' }}>
        <h2>Questions</h2>
        <p>
          For privacy questions or data inquiries, contact <a href="mailto:webmaster@jawed.co.in">webmaster@jawed.co.in</a> or visit the <Link to="/contact/">Contact page</Link>.
        </p>
      </section>
    </main>
  );
};
