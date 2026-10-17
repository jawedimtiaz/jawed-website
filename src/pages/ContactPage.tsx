import React, { useState } from 'react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('webmaster@jawed.co.in');
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${topic || 'Website Inquiry'}] Message from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:webmaster@jawed.co.in?subject=${subject}&body=${body}`;
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Get in touch</p>
      <h1>Contact</h1>
      <p className="lead">
        If you’d like to get in touch about IT support opportunities, workplace technology projects, tool feedback, or collaboration, feel free to reach out.
      </p>

      {/* Direct Email Card */}
      <section className="content-section" style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Direct Email</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--text)' }}>
          Reach out anytime at <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--line)' }}>webmaster@jawed.co.in</code>
        </p>
        <div className="actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="button" href="mailto:webmaster@jawed.co.in">
            Email webmaster@jawed.co.in
          </a>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleCopyEmail}
          >
            {copiedStatus ? '✓ Copied to clipboard!' : 'Copy email address'}
          </button>
        </div>
        <p className="form-note" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {copiedStatus
            ? 'Address copied! You can paste it into your preferred email client.'
            : 'If no email app opens automatically, copy the address above and compose your message manually.'}
        </p>
      </section>

      {/* Contact Form */}
      <section className="content-section" style={{ marginTop: '2.5rem' }}>
        <h2>Send a Message</h2>
        <form className="contact-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-field">
            <label htmlFor="contact-name" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Your Name *
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--line)', borderRadius: '6px' }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-email" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Your Email Address *
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--line)', borderRadius: '6px' }}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-topic" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              What can I help with? *
            </label>
            <select
              id="contact-topic"
              name="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--line)', borderRadius: '6px', backgroundColor: '#fff' }}
            >
              <option value="" disabled>Select a topic</option>
              <option value="Work opportunity">Work opportunity / Full-time role</option>
              <option value="Freelance or project">Freelance / Workplace technology consulting</option>
              <option value="Website feedback">Website feedback or tool suggestion</option>
              <option value="IT or technology question">IT troubleshooting or technical inquiry</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="contact-message" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              Message *
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Describe your inquiry, project scope, or feedback..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--line)', borderRadius: '6px', fontFamily: 'inherit' }}
            />
          </div>

          <button className="button" type="submit" style={{ alignSelf: 'flex-start' }}>
            Compose Email →
          </button>
        </form>
        <p className="form-note" style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Submitting this form prepares an email draft addressed to <code>webmaster@jawed.co.in</code>. The website does not store or transmit your message to third parties.
        </p>
      </section>

      {/* Guidelines */}
      <section className="content-section">
        <h2>Before You Send</h2>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
          <li>Choose the closest topic and include enough non-sensitive context to explain your question or feedback.</li>
          <li><strong>Never send sensitive data:</strong> Do not include passwords, MFA codes, recovery tokens, internal employee IDs, or confidential customer data.</li>
          <li>This personal website is not an emergency response service and does not replace your company’s internal IT ticketing system.</li>
        </ul>
      </section>

      {/* LinkedIn Section */}
      <section className="content-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
        <h2>LinkedIn</h2>
        <p>
          Connect on LinkedIn to view recommendations, network, or message directly:{' '}
          <a href="https://www.linkedin.com/in/jawedimtiaz/" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
            linkedin.com/in/jawedimtiaz ↗
          </a>
        </p>
      </section>
    </main>
  );
};
