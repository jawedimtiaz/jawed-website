import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Privacy Policy</span>
      </nav>

      <p className="eyebrow">Legal &amp; Compliance</p>
      <h1>Privacy Policy &amp; Data Handling</h1>
      <p className="meta" style={{ color: 'var(--muted)', marginBottom: '24px' }}>
        Last Updated: October 20, 2026
      </p>

      <section className="content-section">
        <h2>1. Overview &amp; Commitment</h2>
        <p>
          At <strong>Jawed.co.in</strong> (operated by Jawed Imtiaz), we respect your privacy and are committed to maintaining transparent data handling practices. This Privacy Policy details how personal information, technical telemetry, cookies, and diagnostic data are processed when you visit our website, utilize our IT field guides, or interact with our diagnostic utilities.
        </p>
      </section>

      <section className="content-section">
        <h2>2. Google AdSense &amp; Third-Party Advertising</h2>
        <p>
          This website is being prepared for potential advertising, but advertising is not active merely because this policy discusses it or the site is verified in an advertising account. Google AdSense scripts, ad slots, and advertising cookies will be introduced only after the publisher has completed the required review, consent, policy, and technical checks and explicitly enables advertising. If advertising is enabled, Google and its partners may use cookies or similar technologies to serve personalized or non-personalized ads, subject to applicable choices and consent requirements.
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li>
            <strong>Advertising cookies:</strong> If an advertising service is enabled, Google and its partners may use cookies or similar technologies to support ad delivery and personalization, subject to the applicable settings and consent requirements.
          </li>
          <li>
            <strong>Opting Out of Personalized Ads:</strong> Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. Alternatively, you can opt out of third-party vendor cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.
          </li>
          <li>
            <strong>Regional consent requirements:</strong> If advertising is enabled for visitors in the European Economic Area (EEA), United Kingdom (UK), or Switzerland, the publisher must meet applicable consent requirements, including Google’s certified Consent Management Platform (CMP) requirements where required.
          </li>
        </ul>
      </section>

      <section className="content-section">
        <h2>3. Web Analytics &amp; Telemetry</h2>
        <p>
          Analytics measurement may be introduced only when the corresponding analytics service is configured and the applicable consent and privacy requirements are met. If Google Analytics 4 (GA4) is enabled, it may collect usage and technical metrics using cookies or similar technologies. This policy does not mean that GA4 is currently active. The site should not send directly identifying personal information to analytics services.
        </p>
      </section>

      <section className="content-section">
        <h2>4. Local Processing in Diagnostic Tools</h2>
        <p>
          All interactive utilities published on this site—including the <em>IT Troubleshooting Assistant</em>, <em>AI Prompt Builder</em>, <em>Career Match Resume Review</em>, <em>Resume Bullet Strength Checker</em>, <em>Service Desk Note Formatter</em>, and <em>Financial Calculators</em>—process input data <strong>entirely locally within your web browser</strong>.
        </p>
        <p>
          No resume text, ticket notes, system configurations, or financial figures entered into these tools are uploaded to external servers or logged in any backend database.
        </p>
      </section>

      <section className="content-section">
        <h2>5. Server Logs &amp; Security Telemetry</h2>
        <p>
          When you request pages on Jawed.co.in, our edge hosting providers (Cloudflare Pages) automatically record standard web server request logs, including your IP address, user-agent string, referral URL, and access timestamp. These logs are maintained strictly for security monitoring, DDoS mitigation, rate limiting, and technical infrastructure diagnosis.
        </p>
      </section>

      <section className="content-section">
        <h2>6. Your Data Protection Rights</h2>
        <p>
          Depending on your jurisdiction (GDPR, CCPA, CPRA), you possess specific rights regarding your personal data:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li><strong>Right of Access &amp; Portability:</strong> Request details on data collected about you.</li>
          <li><strong>Right to Rectification or Erasure:</strong> Request corrections or deletion of submitted contact messages.</li>
          <li><strong>Right to Opt-Out:</strong> Toggle cookie preferences at any time using our site cookie controls.</li>
        </ul>
      </section>

      <section className="content-section">
        <h2>7. Data Controller &amp; Contact Information</h2>
        <p>
          For privacy questions or requests to exercise your privacy rights, contact:
        </p>
        <p style={{ background: 'var(--surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <strong>Jawed Imtiaz</strong> — IT Field Tech &amp; Publisher<br />
          Email: <a href="mailto:webmaster@jawed.co.in">webmaster@jawed.co.in</a><br />
          Location: Visakhapatnam / Remote IT Operations
        </p>
      </section>
    </main>
  );
};
