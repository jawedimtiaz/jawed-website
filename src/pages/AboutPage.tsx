import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">About</p>
      <h1>About Me</h1>

      <section className="content-section">
        <p className="lead">
          I’m <strong>Jawed Imtiaz</strong>, an IT professional with deep experience across technical support, system administration, Service Desk operations, and workplace technology.
        </p>
        <p>
          Today, I work as an <strong>IT Field Tech</strong> at Milestone Technologies supporting the Uber environment. My work focuses on supporting users and devices, resolving complex hardware and software incidents, documenting reliable solutions, and maintaining a frictionless workplace technology experience.
        </p>
        <p>
          My professional interests include Apple and macOS enterprise management, Jamf, identity and access management (IAM), IT service management (ITSM), automation, and practical ways to make technical operations simpler, safer, and more effective.
        </p>
      </section>

      <section className="content-section">
        <h2>My Background</h2>
        <p>
          My early career provided a robust foundation in hardware diagnostics, Windows Server administration, networking, and core infrastructure. Over time, my focus expanded from traditional back-office infrastructure into user-facing IT, Service Desk operations, and workplace technology.
        </p>
        <p>
          This dual experience has given me an appreciation for both sides of IT: understanding how complex enterprise systems function under the hood, while deeply empathizing with the people whose daily work depends on them.
        </p>
      </section>

      <section className="content-section">
        <h2>Education</h2>
        <div className="card" style={{ maxWidth: '32rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Bachelor of Science (B.Sc.)</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>University of Calcutta</p>
        </div>
      </section>

      <section className="content-section">
        <h2>Career Journey &amp; Philosophy</h2>
        <p>
          My career has evolved through technical support, system administration, and technical support management into hands-on workplace technology. That progression shapes how I approach every support ticket and project:
        </p>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          <li>
            <strong>Understand the real user objective:</strong> Uncover what task the person is trying to finish, rather than getting distracted by an ambiguous error message.
          </li>
          <li>
            <strong>Isolate scope early:</strong> Determine whether the symptom follows a user account, a specific physical device, or a shared service outage.
          </li>
          <li>
            <strong>Gather evidence before changing settings:</strong> Inspect logs and test hypothesis with low-risk checks before applying modifications.
          </li>
          <li>
            <strong>Leave clear records:</strong> Document the reproduction steps, tests, and resolution so colleagues and future technicians can continue smoothly.
          </li>
        </ul>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
          <em>Note:</em> This site describes my professional background and operational philosophy at a high level. It intentionally does not disclose employer-confidential procedures, internal networks, or identifiable customer/incident records.
        </p>
      </section>

      <section className="content-section">
        <h2>Professional Interests</h2>
        <div className="card-grid">
          <article className="card">
            <h3>IT Support &amp; Service Desk</h3>
            <p>End-user support, incident triage, request workflows, and operational excellence.</p>
          </article>
          <article className="card">
            <h3>Apple &amp; macOS Ecosystem</h3>
            <p>macOS enterprise deployment, troubleshooting, Apple Business Manager, and hardware lifecycle.</p>
          </article>
          <article className="card">
            <h3>Device Management</h3>
            <p>Modern endpoint management, zero-touch provisioning, compliance, and MDM policy enforcement.</p>
          </article>
          <article className="card">
            <h3>Automation</h3>
            <p>Practical scripting with PowerShell, Bash, and JavaScript to automate repetitive administrative tasks.</p>
          </article>
          <article className="card">
            <h3>Knowledge &amp; Documentation</h3>
            <p>Creating crystal-clear technical knowledge base articles that make troubleshooting faster for everyone.</p>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Current Learning</h2>
        <div className="card-grid two">
          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Jamf 100 / Apple MDM</h3>
              <span className="badge">In progress</span>
            </div>
            <p>Deepening expertise in Apple device management architectures, profile configuration, and fleet monitoring.</p>
          </article>
          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>ITIL 4 Foundation</h3>
              <span className="badge">In progress</span>
            </div>
            <p>Strengthening knowledge of IT service value streams, incident management, change enablement, and continuous improvement.</p>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Why I Started Jawed.co.in</h2>
        <p>
          Jawed.co.in began as a personal learning initiative early in my IT career. While preparing for technical certifications and searching for clear, practical references, I started compiling notes, diagnostic procedures, and checklists that I wished existed when I faced difficult outages.
        </p>
        <p>
          Over time, that collection grew into a public hub where I organize and share actionable guides with fellow IT practitioners, job seekers, and visitors. The current version pairs my professional portfolio with interactive browser tools, practical notes, and an AI assistant.
        </p>
      </section>

      <section className="content-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '2rem' }}>
        <h2>Explore More</h2>
        <div className="actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link className="button" to="/work/">
            View Professional Profile &amp; Experience →
          </Link>
          <Link className="button button-secondary" to="/tools/">
            Explore Browser Tools →
          </Link>
          <Link className="button button-secondary" to="/notes/">
            Read Technical Notes →
          </Link>
          <Link className="button button-secondary" to="/contact/">
            Get in Touch →
          </Link>
        </div>
      </section>
    </main>
  );
};
