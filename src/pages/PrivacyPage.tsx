import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Privacy</span>
      </nav>

      <p className="eyebrow">Site information</p>
      <h1>Website Privacy &amp; Data Handling</h1>

      <section className="content-section">
        <h2>Privacy Policy</h2>
        <p>
          This page explains how information is handled on jawed.co.in. The policy is kept aligned with the site's actual functionality.
        </p>
      </section>

      <section className="content-section">
        <h2>Information Collected</h2>
        <p>
          The website does not require visitors to create an account to browse the site. The contact form opens your email client directly to address a message to webmaster@jawed.co.in; this website does not store submitted messages.
        </p>
      </section>

      <section className="content-section">
        <h2>Browser Tools &amp; Local Processing</h2>
        <p>
          All interactive utilities on this site—including the Service Desk Note Formatter, AI Prompt Builder, IT Troubleshooting Assistant, Ticket to KB Draft, Resume Bullet Checker, and financial calculators—process inputs locally in your browser. No data entered into these tools is transmitted to an external server.
        </p>
      </section>

      <section className="content-section">
        <h2>AI Assistant &amp; Search Knowledge</h2>
        <p>
          The Jawed AI Assistant searches the static indexed content of this website locally in your browser using client-side keyword and relevance scoring. Your search queries remain entirely on your device.
        </p>
      </section>

      <section className="content-section">
        <h2>Contact</h2>
        <p>
          For questions regarding website privacy, please email <a href="mailto:webmaster@jawed.co.in">webmaster@jawed.co.in</a>.
        </p>
      </section>
    </main>
  );
};
