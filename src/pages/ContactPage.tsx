import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Work opportunity');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const emailAddress = 'webmaster@jawed.co.in';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(
      `[${topic}] Contact from ${name}`
    )}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Contact</span>
      </nav>

      <p className="eyebrow">Get in touch</p>
      <h1>Contact</h1>
      <p className="lead">
        If you’d like to get in touch about work, technology, projects or something related to this website, feel free to reach out.
      </p>

      <section className="content-section">
        <h2>Direct Email</h2>
        <p className="actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="button" href={`mailto:${emailAddress}`}>
            Email {emailAddress}
          </a>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleCopyEmail}
          >
            {copied ? 'Copied to Clipboard!' : 'Copy email address'}
          </button>
        </p>
      </section>

      <section className="content-section">
        <h2>Contact Form</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="contact-name">Name</label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-topic">What can I help with?</label>
            <select
              id="contact-topic"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            >
              <option value="Work opportunity">Work opportunity</option>
              <option value="Freelance or project">Freelance or project</option>
              <option value="Website feedback">Website feedback</option>
              <option value="IT or technology question">IT or technology question</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              rows={6}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <button className="button button-primary" type="submit">
            Send Message
          </button>
        </form>
      </section>

      <section className="content-section">
        <h2>Connect on LinkedIn</h2>
        <p>
          <a
            href="https://www.linkedin.com/in/jawedimtiaz/"
            target="_blank"
            rel="noopener noreferrer"
            className="button button-secondary"
          >
            View LinkedIn Profile →
          </a>
        </p>
      </section>
    </main>
  );
};
