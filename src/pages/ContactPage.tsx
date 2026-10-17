import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

interface FormState {
  name: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
  website: string; // Honeypot field for bot detection
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  reason?: string;
  message?: string;
}

const REASONS = [
  'IT Support & Service Desk Guidance',
  'Apple, macOS & Jamf Deployment',
  'Workplace Technology & Identity (Okta / M365)',
  'Technical Documentation & Runbooks',
  'AI Productivity & Prompt Engineering',
  'Full-Time Role / Hiring Inquiry',
  'Interactive Tool Feedback or Question',
  'Other Professional Inquiry'
];

export const ContactPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedReason = searchParams.get('reason') || '';

  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    reason: '',
    message: '',
    website: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const [formLoadedAt] = useState<number>(Date.now());
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  // Preselect reason if coming from specific pathways
  useEffect(() => {
    if (preselectedReason) {
      const lower = preselectedReason.toLowerCase();
      const match = REASONS.find((r) => r.toLowerCase().includes(lower));
      if (match) {
        setFormData((prev) => ({ ...prev, reason: match }));
      }
    }
  }, [preselectedReason]);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = 'Please enter your name (at least 2 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errs.phone = 'Please enter a valid phone number (or leave blank).';
      }
    }

    if (!formData.reason) {
      errs.reason = 'Please select a reason for your inquiry.';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please provide a message with at least 10 characters.';
    }

    return errs;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validate();
    if (currentErrors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: currentErrors[field as keyof FormErrors] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      reason: true,
      message: true
    });

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check honeypot
    if (formData.website) {
      setSubmitStatus('success');
      setServerMessage('Thank you for reaching out!');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setServerMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          reason: formData.reason,
          message: formData.message.trim(),
          form_loaded_at: formLoadedAt
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        setServerMessage(result.message || 'Thank you! Your message has been sent successfully.');
        setSubmissionId(result.id || '');
        setFormData({
          name: '',
          email: '',
          phone: '',
          reason: '',
          message: '',
          website: ''
        });
        setTouched({});
      } else {
        setSubmitStatus('error');
        setServerMessage(result.error || 'Unable to submit your message right now. Please try again or email directly.');
      }
    } catch {
      setSubmitStatus('error');
      setServerMessage('Network error: Unable to reach the server. Please check your internet connection or email directly at webmaster@jawed.co.in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('webmaster@jawed.co.in');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <main id="main-content" className="container narrow page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span aria-current="page">Contact</span>
      </div>

      <p className="eyebrow">Get in touch &amp; Collaboration</p>
      <h1>Contact &amp; Work With Me</h1>
      <p className="lead" style={{ marginBottom: '2.5rem' }}>
        Whether you have an IT support opening, need practical guidance on macOS &amp; Jamf device management, require technical runbooks, or want to discuss browser-based tooling, I’d love to connect.
      </p>

      {/* "Work With Me" Section */}
      <section
        className="content-section"
        style={{
          backgroundColor: 'var(--surface)',
          padding: '1.75rem',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          marginBottom: '2.5rem'
        }}
      >
        <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem' }}>Work With Me: Available Areas of Help</h2>
        <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Here are the core functional areas where I provide hands-on experience, operational frameworks, and consultative assistance:
        </p>

        <div className="card-grid two" style={{ gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--accent)' }}>
              🛠️ IT Support &amp; Service Desk Guidance
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              Establishing repeatable first-response triage sequences, user/device/service scoping models, escalation standards, and high-quality ticket documentation.
            </p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--accent)' }}>
              🍏 Apple, macOS &amp; Jamf Deployment
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              Automated Device Enrollment (ADE), Jamf Pro configuration profiles, FileVault encryption escrow, and macOS Sequoia/Sonoma enterprise endpoint compliance.
            </p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--accent)' }}>
              ☁️ Workplace Technology &amp; Cloud Identity
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              Single Sign-On (SSO) and lifecycle identity across Okta, OneLogin, Google Workspace, and Microsoft 365 / Entra ID (Azure AD).
            </p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--accent)' }}>
              📝 Technical Documentation &amp; Runbooks
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              Transforming complex troubleshooting incidents into sanitized, reusable knowledge-base articles, SOPs, and handoff checklists.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--accent)' }}>
            🤖 AI Productivity &amp; Browser-Based Tools
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
            Developing private, client-side tools and safe prompt engineering frameworks that augment support technicians without leaking confidential company data.
          </p>
        </div>
      </section>

      {/* Main Contact Form Section */}
      <section className="content-section">
        <h2>Send an Inquiry</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          Please fill out the form below. Submissions are securely validated, stored, and trigger an instant notification.
        </p>

        {/* Success Alert Banner */}
        {submitStatus === 'success' && (
          <div
            role="alert"
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '2rem',
              color: '#065f46'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <strong style={{ fontSize: '1.05rem' }}>Message Received Successfully!</strong>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {serverMessage}
            </p>
            {submissionId && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#047857' }}>
                Confirmation Reference: <code>{submissionId}</code>
              </p>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setSubmitStatus('idle')}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            >
              Send Another Message
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {submitStatus === 'error' && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '2rem',
              color: '#991b1b'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
              <strong style={{ fontSize: '1.05rem' }}>Submission Error</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5 }}>
              {serverMessage}
            </p>
          </div>
        )}

        {/* Form Element */}
        {submitStatus !== 'success' && (
          <form
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Honeypot field (hidden from legitimate users, trapped for bots) */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="contact-website">Website (Leave blank)</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            {/* Name */}
            <div className="form-field">
              <label
                htmlFor="contact-name"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Full Name <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={Boolean(touched.name && errors.name)}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur('name')}
                placeholder="e.g. Alex Morgan"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: touched.name && errors.name ? '2px solid #dc2626' : '1px solid var(--line)',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
              {touched.name && errors.name && (
                <p id="contact-name-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="form-field">
              <label
                htmlFor="contact-email"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Email Address <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={Boolean(touched.email && errors.email)}
                aria-describedby={errors.email ? 'contact-email-error' : undefined}
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                placeholder="alex.morgan@company.com"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: touched.email && errors.email ? '2px solid #dc2626' : '1px solid var(--line)',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
              {touched.email && errors.email && (
                <p id="contact-email-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Optional Phone */}
            <div className="form-field">
              <label
                htmlFor="contact-phone"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Phone Number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(touched.phone && errors.phone)}
                aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => handleBlur('phone')}
                placeholder="+1 (555) 000-0000"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: touched.phone && errors.phone ? '2px solid #dc2626' : '1px solid var(--line)',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
              {touched.phone && errors.phone && (
                <p id="contact-phone-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="form-field">
              <label
                htmlFor="contact-reason"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Reason for Inquiry <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <select
                id="contact-reason"
                name="reason"
                required
                aria-required="true"
                aria-invalid={Boolean(touched.reason && errors.reason)}
                aria-describedby={errors.reason ? 'contact-reason-error' : undefined}
                value={formData.reason}
                onChange={handleChange}
                onBlur={() => handleBlur('reason')}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: touched.reason && errors.reason ? '2px solid #dc2626' : '1px solid var(--line)',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  fontSize: '0.95rem'
                }}
              >
                <option value="" disabled>
                  -- Select the nature of your message --
                </option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {touched.reason && errors.reason && (
                <p id="contact-reason-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.reason}
                </p>
              )}
            </div>

            {/* Message */}
            <div className="form-field">
              <label
                htmlFor="contact-message"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Message <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                required
                aria-required="true"
                aria-invalid={Boolean(touched.message && errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                value={formData.message}
                onChange={handleChange}
                onBlur={() => handleBlur('message')}
                placeholder="Please describe your project, opportunity, or feedback in detail..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: touched.message && errors.message ? '2px solid #dc2626' : '1px solid var(--line)',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                {touched.message && errors.message ? (
                  <p id="contact-message-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>
                    {errors.message}
                  </p>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Minimum 10 characters.
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {formData.message.length}/3000
                </span>
              </div>
            </div>

            <button
              className="button"
              type="submit"
              disabled={isSubmitting}
              style={{
                alignSelf: 'flex-start',
                minWidth: '180px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <span>⏳</span>
                  <span>Sending Message...</span>
                </>
              ) : (
                'Send Message →'
              )}
            </button>
          </form>
        )}
      </section>

      {/* Direct Contact Alternatives Card */}
      <section
        className="content-section"
        style={{
          marginTop: '3rem',
          backgroundColor: 'var(--surface)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--line)'
        }}
      >
        <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem' }}>Direct Communication Channels</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: 'var(--text)' }}>
          Prefer direct email or professional networking? You can reach me through either channel:
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="button" href="mailto:webmaster@jawed.co.in">
            Email webmaster@jawed.co.in
          </a>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleCopyEmail}
          >
            {copiedEmail ? '✓ Copied to clipboard!' : 'Copy email address'}
          </button>
          <a
            className="button button-secondary"
            href="https://www.linkedin.com/in/jawedimtiaz/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn Profile ↗
          </a>
        </div>
      </section>

      {/* Privacy Notice */}
      <section className="content-section">
        <h2>Privacy Notice</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Your submitted name, email, and message are used solely to reply to your inquiry. They are stored securely and never sold, shared with marketing networks, or used for spam. Never submit passwords, credit card numbers, or internal credentials.
        </p>
      </section>
    </main>
  );
};
