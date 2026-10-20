import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>About</span>
      </nav>

      <p className="eyebrow">Professional Credentials &amp; Background</p>
      <h1>About Jawed Imtiaz</h1>
      <p className="lead">
        Senior IT Field Tech and Workplace Engineering Specialist focused on Service Desk operations, enterprise device lifecycle management, Apple/Jamf infrastructure, and practical diagnostic tools.
      </p>

      <section className="content-section">
        <h2>Professional Background &amp; Current Role</h2>
        <p>
          I currently serve as an <strong>IT Field Tech</strong> with Milestone Technologies supporting the enterprise IT environment at <strong>Uber</strong>. In this role, I am responsible for managing on-site workplace technology, troubleshooting hardware and network drops, administering Apple macOS devices via Jamf Pro, managing Microsoft Entra ID / 365 identities, and maintaining high SLA user satisfaction.
        </p>
        <p>
          My career progression spans over a decade across technical support, system administration, technical support management, and field engineering. This experience gives me a well-rounded operational perspective—balancing deep technical root-cause isolation with white-glove user communication.
        </p>
      </section>

      <section className="content-section">
        <h2>Technical Credentials &amp; Certifications</h2>
        <div className="card-grid">
          <article className="card">
            <h3>Microsoft Azure Fundamentals (AZ-900)</h3>
            <p>Cloud infrastructure fundamentals, Microsoft 365 identity, Entra ID, and Azure cloud security compliance.</p>
            <span className="badge">Active Certification</span>
          </article>

          <article className="card">
            <h3>Advanced Diploma in Hardware &amp; Networking</h3>
            <p>Layer 1-3 networking, TCP/IP, DNS, DHCP, switch configuration, routing, and physical hardware diagnostics.</p>
            <span className="badge">Completed Qualification</span>
          </article>

          <article className="card">
            <h3>Jamf 100 &amp; Apple Workplace Management</h3>
            <p>macOS device provisioning, MDM configuration profiles, FileVault encryption escrow, and TCC security permission resets.</p>
            <span className="badge">In Progress / Ongoing</span>
          </article>

          <article className="card">
            <h3>Historical Apple ACSP &amp; Microsoft MCSE</h3>
            <p>Apple Certified Support Professional (macOS 10.9/10.11) and MCSE Server 2003 credentials reflecting long-standing domain experience.</p>
            <span className="badge">Historical Credentials</span>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Career Timeline</h2>
        <div className="timeline">
          <article className="timeline-item">
            <h3>IT Field Tech — Milestone Technologies / Uber</h3>
            <p className="meta">Present | Service Desk &amp; Field Dispatch</p>
            <p style={{ fontSize: '0.925rem', color: 'var(--muted-light)' }}>
              Supporting workplace technology, device provisioning, Apple/Jamf management, and Tier 2/3 incident resolution with top user satisfaction recognitions (People's Choice, Tech Support Guru, Employee of the Quarter).
            </p>
          </article>

          <article className="timeline-item">
            <h3>Technical Support Manager — Currents Technology</h3>
            <p className="meta">Technical Leadership &amp; Operations</p>
            <p style={{ fontSize: '0.925rem', color: 'var(--muted-light)' }}>
              Managed technical support teams, defined escalation SLAs, and oversaw hardware and network infrastructure reliability.
            </p>
          </article>

          <article className="timeline-item">
            <h3>System Executive — ICore</h3>
            <p className="meta">System Administration</p>
            <p style={{ fontSize: '0.925rem', color: 'var(--muted-light)' }}>
              Administered Windows Server environments, domain controllers, Active Directory user groups, and local backup policies.
            </p>
          </article>

          <article className="timeline-item">
            <h3>System Administrator — Khadims</h3>
            <p className="meta">Enterprise IT Operations</p>
            <p style={{ fontSize: '0.925rem', color: 'var(--muted-light)' }}>
              Managed multi-branch retail network connectivity, POS system hardware maintenance, and server backups.
            </p>
          </article>

          <article className="timeline-item">
            <h3>Technical Support Executive — Altos</h3>
            <p className="meta">Hardware &amp; Network Support</p>
            <p style={{ fontSize: '0.925rem', color: 'var(--muted-light)' }}>
              First-line technical support, hardware component replacement, and desktop software troubleshooting.
            </p>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Mission &amp; Publisher Quality Commitment</h2>
        <p>
          I created <strong>Jawed.co.in</strong> to bridge the gap between abstract vendor documentation and real-world IT field execution. Every field guide, diagnostic checklist, and interactive utility published here adheres to rigorous technical standards:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li><strong>Sanitized &amp; Public-Safe:</strong> All examples are generalized to protect employer confidentiality while teaching reusable diagnostic principles.</li>
          <li><strong>Client-Side &amp; Privacy-First:</strong> All diagnostic tools process user input locally in the browser without server uploads.</li>
          <li><strong>Google AdSense Compliant:</strong> Adhering to publisher guidelines for original, high-value editorial content.</li>
        </ul>
      </section>

      <section className="content-section">
        <h2>Explore My Work &amp; Services</h2>
        <div className="actions">
          <Link className="button button-primary" to="/services">
            View IT Field Services &amp; Dispatch →
          </Link>
          <Link className="button button-secondary" to="/notes">
            Browse Technical Field Guides →
          </Link>
          <Link className="button button-secondary" to="/contact">
            Get In Touch →
          </Link>
        </div>
      </section>
    </main>
  );
};
