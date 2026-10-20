import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const ContactPage: React.FC = () => {
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('IT Field Dispatch Request');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const qParam = searchParams.get('question') || searchParams.get('query') || searchParams.get('message');
    const topicParam = searchParams.get('topic');

    if (qParam) {
      setMessage(`Regarding your question: "${qParam}"\n\nHi Jawed,\nI was asking the assistant about this and would love your direct technical advice or service assistance.\n`);
      setTopic('Technical Advisory / Consulting');
    }
    if (topicParam) {
      setTopic(topicParam);
    }
  }, [location.search]);

  const emailAddress = 'webmaster@jawed.co.in';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
      `[${topic}] Inquiry from ${name} (${company || 'Individual'})`
    )}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCompany: ${company}\nTopic: ${topic}\n\nMessage / Request:\n${message}`)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Contact Us</span>
      </nav>

      <p className="eyebrow">Business &amp; Technical Inquiries</p>
      <h1>Contact Us</h1>
      <p className="lead">
        Reach out for IT field support dispatch, business inquiries, technical consulting, or feedback on our published guides and diagnostic utilities.
      </p>

      {/* Response SLAs & Business Hours */}
      <section className="content-section">
        <div className="card-grid two">
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3>Direct Email Contact</h3>
            <p style={{ fontSize: '0.9rem', margin: '6px 0' }}>
              Primary Mail: <strong>webmaster@jawed.co.in</strong>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Expected SLA: General inquiries acknowledged within 24 business hours.
            </p>
            <button className="button button-secondary" type="button" onClick={handleCopyEmail} style={{ marginTop: '10px' }}>
              {copied ? '✓ Email Copied!' : 'Copy Email Address'}
            </button>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--teal)' }}>
            <h3>Field Coverage &amp; Hours</h3>
            <p style={{ fontSize: '0.9rem', margin: '6px 0' }}>
              Location: Visakhapatnam / Remote Global Operations
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Hours: Mon - Fri, 9:00 AM - 6:00 PM IST (Emergency Dispatch Available)
            </p>
            <Link className="button button-secondary" to="/services" style={{ marginTop: '10px' }}>
              View Field Services &amp; SLA Estimator →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="content-section">
        <h2>Submit an Inquiry or Request</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="contact-name">Your Full Name *</label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-email">Email Address *</label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@company.com"
              />
            </div>
          </div>

          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="contact-company">Company / Organization</label>
              <input
                id="contact-company"
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Enterprises"
              />
            </div>

            <div className="form-field">
              <label htmlFor="contact-topic">Inquiry Type / Topic *</label>
              <select
                id="contact-topic"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              >
                <option value="IT Field Dispatch Request">IT Field Support &amp; Dispatch Request</option>
                <option value="Work Opportunity / Career">Work Opportunity / Career Inquiries</option>
                <option value="Technical Advisory / Consulting">Technical Advisory &amp; Consulting</option>
                <option value="Website Feedback / Bug Report">Website Feedback / Bug Report</option>
                <option value="AdSense / Media Partnership">AdSense / Media / Publisher Inquiries</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="contact-message">Message Details *</label>
            <textarea
              id="contact-message"
              rows={6}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Provide context regarding your technical environment, dispatch needs, or inquiry..."
            />
          </div>

          <button className="button button-primary" type="submit">
            Open Email Client &amp; Send →
          </button>
        </form>
      </section>

      <section className="content-section">
        <h2>Professional Network</h2>
        <p>
          Connect on LinkedIn for professional endorsements and technical network connections:
        </p>
        <p>
          <a
            href="https://www.linkedin.com/in/jawedimtiaz/"
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary"
          >
            Connect on LinkedIn →
          </a>
        </p>
      </section>
    </main>
  );
};
