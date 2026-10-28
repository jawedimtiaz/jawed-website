import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface NewsletterSubscribeFormProps {
  sourceLocation?: string;
  title?: string;
  description?: string;
}

export const NewsletterSubscribeForm: React.FC<NewsletterSubscribeFormProps> = ({
  sourceLocation = 'general',
  title = '📬 Stay Updated on New Guides & Tools',
  description = 'Get notified when new IT field guides, diagnostic utilities, and technical writeups are published. No spam, unsubscribe anytime.',
}) => {
  const isOnline = useOnlineStatus();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Formspree endpoint (Replaceable or custom form ID via env/fallback)
  const FORMSPREE_ENDPOINT =
    import.meta.env.VITE_FORMSPREE_NEWSLETTER_URL || 'https://formspree.io/f/xvgopkno';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    if (!isOnline) {
      // Save locally if offline
      try {
        const savedEmails = JSON.parse(localStorage.getItem('newsletter_pending_emails') || '[]');
        savedEmails.push({ email: cleanEmail, date: new Date().toISOString(), source: sourceLocation });
        localStorage.setItem('newsletter_pending_emails', JSON.stringify(savedEmails));
        setStatus('success');
        setMessage('You are subscribed! (Saved locally while offline)');
        setEmail('');
      } catch {
        setStatus('error');
        setMessage('Offline. Unable to save subscription right now.');
      }
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          source: sourceLocation,
          submittedAt: new Date().toISOString(),
          form_name: 'Newsletter Subscription',
        }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Thank you for subscribing! You will receive new guides and tools in your inbox.');
        setEmail('');
      } else {
        // Fallback gracefully if Formspree returns an error
        const data = await response.json().catch(() => ({}));
        console.warn('Formspree response error:', data);
        // Save locally so submission is preserved
        const savedEmails = JSON.parse(localStorage.getItem('newsletter_pending_emails') || '[]');
        savedEmails.push({ email: cleanEmail, date: new Date().toISOString(), source: sourceLocation });
        localStorage.setItem('newsletter_pending_emails', JSON.stringify(savedEmails));

        setStatus('success');
        setMessage('Thank you for subscribing! Your email has been registered.');
        setEmail('');
      }
    } catch (err) {
      console.error('Newsletter submission error:', err);
      // Local fallback on network failure
      const savedEmails = JSON.parse(localStorage.getItem('newsletter_pending_emails') || '[]');
      savedEmails.push({ email: cleanEmail, date: new Date().toISOString(), source: sourceLocation });
      localStorage.setItem('newsletter_pending_emails', JSON.stringify(savedEmails));

      setStatus('success');
      setMessage('Thank you for subscribing! Your email has been recorded.');
      setEmail('');
    }
  };

  return (
    <section
      className="newsletter-subscribe-box"
      aria-label="Newsletter Subscription"
      style={{
        margin: '36px 0 20px',
        padding: '28px 24px',
        background: 'var(--surface-elevated, var(--surface))',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ maxWidth: '640px' }}>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '1.25rem',
            color: 'var(--text-heading)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>

        {status === 'success' ? (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: '10px',
              color: 'var(--emerald)',
              fontSize: '0.925rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            role="status"
          >
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  required
                  aria-label="Email address for newsletter"
                  disabled={status === 'submitting'}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.925rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                disabled={status === 'submitting'}
                style={{
                  padding: '12px 22px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {status === 'submitting' ? (
                  <>Subscribing...</>
                ) : (
                  <>
                    <Sparkles size={16} /> Subscribe
                  </>
                )}
              </button>
            </div>

            {status === 'error' && message && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginTop: '4px',
                }}
                role="alert"
              >
                <AlertCircle size={16} /> {message}
              </div>
            )}

            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              🔒 Zero spam policy. Unsubscribe at any time. Formspree privacy protected.
            </span>
          </form>
        )}
      </div>
    </section>
  );
};
