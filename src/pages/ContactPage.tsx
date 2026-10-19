import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { User, Mail, Phone, HelpCircle, MessageSquare, ShieldCheck } from 'lucide-react';
import { logContactAttempt } from '../services/contactLogger';

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
  const [shakingFields, setShakingFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOpenEmailLoading, setIsOpenEmailLoading] = useState<boolean>(false);
  const [submissionMethod, setSubmissionMethod] = useState<'api' | 'email-client'>('api');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const [formLoadedAt] = useState<number>(Date.now());
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up shake timeout on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  const triggerShake = (fieldNames: string[]) => {
    if (!fieldNames.length) return;
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    const newShakes: Record<string, boolean> = {};
    fieldNames.forEach((field) => {
      newShakes[field] = true;
    });
    setShakingFields(newShakes);

    shakeTimeoutRef.current = setTimeout(() => {
      setShakingFields({});
      shakeTimeoutRef.current = null;
    }, 450);
  };

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

  const validateField = (field: string, value: string): string | undefined => {
    const trimmed = value.trim();
    switch (field) {
      case 'name':
        if (!trimmed) {
          return 'Please enter your name.';
        }
        if (trimmed.length < 2) {
          return `Name must be at least 2 characters (currently ${trimmed.length} character).`;
        }
        if (trimmed.length > 100) {
          return 'Name cannot exceed 100 characters.';
        }
        return undefined;

      case 'email':
        if (!trimmed) {
          return 'Please enter your email address.';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return 'Please enter a valid email address.';
        }
        if (trimmed.length > 150) {
          return 'Email address cannot exceed 150 characters.';
        }
        return undefined;

      case 'phone':
        if (!trimmed) return undefined;
        if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/.test(trimmed)) {
          return 'Please enter a valid phone number (or leave blank).';
        }
        if (trimmed.length > 30) {
          return 'Phone number cannot exceed 30 characters.';
        }
        return undefined;

      case 'reason':
        if (!value) {
          return 'Please select a reason for your inquiry.';
        }
        return undefined;

      case 'message':
        if (!trimmed) {
          return 'Please enter your message.';
        }
        if (trimmed.length < 10) {
          const needed = 10 - trimmed.length;
          return `Message must be at least 10 characters (currently ${trimmed.length}/10 — please add ${needed} more character${needed === 1 ? '' : 's'}).`;
        }
        if (trimmed.length > 3000) {
          return 'Message cannot exceed 3,000 characters.';
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const nameErr = validateField('name', formData.name);
    if (nameErr) errs.name = nameErr;

    const emailErr = validateField('email', formData.email);
    if (emailErr) errs.email = emailErr;

    const phoneErr = validateField('phone', formData.phone);
    if (phoneErr) errs.phone = phoneErr;

    const reasonErr = validateField('reason', formData.reason);
    if (reasonErr) errs.reason = reasonErr;

    const messageErr = validateField('message', formData.message);
    if (messageErr) errs.message = messageErr;

    return errs;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time live validation if the user has already touched this field or if it currently displays an error
    if (touched[name] || errors[name as keyof FormErrors]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = formData[field as keyof FormState] || '';
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      triggerShake([field]);
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
      triggerShake(Object.keys(validationErrors));

      // Track failed validation attempt
      logContactAttempt({
        status: 'fail',
        reason: 'VALIDATION_ERROR',
        name: formData.name.trim(),
        email: formData.email.trim(),
        topic: formData.reason,
        messageLength: formData.message.trim().length,
        submissionMethod: 'api',
        error: Object.entries(validationErrors)
          .map(([f, msg]) => `${f}: ${msg}`)
          .join('; ')
      });

      // Auto-focus first field that failed validation for accessibility
      const firstInvalidField = ['name', 'email', 'phone', 'reason', 'message'].find(
        (field) => validationErrors[field as keyof FormErrors]
      );
      if (firstInvalidField) {
        const el = document.getElementById(`contact-${firstInvalidField}`);
        el?.focus();
      }
      return;
    }

    // Check honeypot
    if (formData.website) {
      logContactAttempt({
        status: 'fail',
        reason: 'BOT_HONEYPOT_DETECTED',
        name: formData.name.trim(),
        email: formData.email.trim(),
        topic: formData.reason,
        messageLength: formData.message.trim().length,
        submissionMethod: 'api',
        error: 'Honeypot bot field triggered'
      });
      setSubmissionMethod('api');
      setSubmitStatus('success');
      setServerMessage('Thank you for reaching out!');
      return;
    }

    setSubmissionMethod('api');
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
        // Track successful submission attempt
        logContactAttempt({
          status: 'success',
          reason: 'SUBMISSION_SUCCESS',
          name: formData.name.trim(),
          email: formData.email.trim(),
          topic: formData.reason,
          messageLength: formData.message.trim().length,
          submissionMethod: 'api'
        });

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
        // Track server rejection attempt
        logContactAttempt({
          status: 'fail',
          reason: 'SERVER_ERROR',
          name: formData.name.trim(),
          email: formData.email.trim(),
          topic: formData.reason,
          messageLength: formData.message.trim().length,
          submissionMethod: 'api',
          error: result.error || 'Server rejected submission'
        });

        setSubmitStatus('error');
        setServerMessage(result.error || 'Unable to submit your message right now. Please try again or email directly.');
      }
    } catch {
      // Track network failure attempt
      logContactAttempt({
        status: 'fail',
        reason: 'NETWORK_ERROR',
        name: formData.name.trim(),
        email: formData.email.trim(),
        topic: formData.reason,
        messageLength: formData.message.trim().length,
        submissionMethod: 'api',
        error: 'Network connection failed'
      });

      setSubmitStatus('error');
      setServerMessage('Network error: Unable to reach the server. Please check your internet connection or email directly at webmaster@jawed.co.in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEmail = () => {
    // Validate form fields first
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
      triggerShake(Object.keys(validationErrors));

      // Track failed validation attempt for email client opening
      logContactAttempt({
        status: 'fail',
        reason: 'VALIDATION_ERROR',
        name: formData.name.trim(),
        email: formData.email.trim(),
        topic: formData.reason,
        messageLength: formData.message.trim().length,
        submissionMethod: 'email-client',
        error: Object.entries(validationErrors)
          .map(([f, msg]) => `${f}: ${msg}`)
          .join('; ')
      });

      const firstInvalidField = ['name', 'email', 'phone', 'reason', 'message'].find(
        (field) => validationErrors[field as keyof FormErrors]
      );
      if (firstInvalidField) {
        const el = document.getElementById(`contact-${firstInvalidField}`);
        el?.focus();
      }
      return;
    }

    // Enter loading state for button feedback
    setIsOpenEmailLoading(true);
    setSubmitStatus('idle');
    setServerMessage('');

    const topic = formData.reason || 'General Inquiry';
    const name = formData.name.trim() || 'Website Visitor';
    const subject = `${topic} — ${name}`;
    const bodyParts = [
      `Name: ${formData.name.trim()}`,
      `Email: ${formData.email.trim()}`
    ];
    if (formData.phone.trim()) {
      bodyParts.push(`Phone: ${formData.phone.trim()}`);
    }
    bodyParts.push(`Reason: ${topic}`);
    bodyParts.push('');
    bodyParts.push(formData.message.trim());

    const body = bodyParts.join('\n');
    const mailtoUrl = `mailto:webmaster@jawed.co.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Brief timeout to ensure loading indicator is clearly perceived and accessible
    setTimeout(() => {
      try {
        window.location.href = mailtoUrl;
      } catch (err) {
        console.warn('Failed to launch mailto client automatically:', err);
      }

      // Track successful open email attempt
      logContactAttempt({
        status: 'success',
        reason: 'EMAIL_CLIENT_OPENED',
        name: formData.name.trim(),
        email: formData.email.trim(),
        topic: formData.reason,
        messageLength: formData.message.trim().length,
        submissionMethod: 'email-client'
      });

      setSubmissionMethod('email-client');
      setSubmitStatus('success');
      setServerMessage(
        'Opening your default email application with your pre-filled message addressed to webmaster@jawed.co.in. If no email client opens, copy the message details or email address below.'
      );
      setIsOpenEmailLoading(false);
    }, 450);
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

        {/* Instructional Header: Submissions processed via email without storing data on server */}
        <div
          className="contact-instructional-header"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: '6px',
            padding: '1.1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'flex-start'
          }}
        >
          <ShieldCheck
            size={22}
            style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}
            aria-hidden="true"
          />
          <div style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
            <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
              Submissions Are Processed via Email
            </strong>
            <p style={{ margin: 0, color: 'var(--text)' }}>
              Inquiries sent through this form are forwarded directly via email to{' '}
              <a href="mailto:webmaster@jawed.co.in" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                webmaster@jawed.co.in
              </a>
              . <strong>This website does not directly store your messages or form data on the site server or database.</strong> You can submit directly using this form or click <em>Open Email</em> to compose and send from your local email client.
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {submitStatus === 'success' && (
          <div
            role="status"
            aria-live="polite"
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
              <strong style={{ fontSize: '1.05rem' }}>
                {submissionMethod === 'email-client' ? 'Email Client Opened!' : 'Message Received Successfully!'}
              </strong>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {serverMessage}
            </p>
            {submissionMethod === 'api' && submissionId && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#047857' }}>
                Confirmation Reference: <code>{submissionId}</code>
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSubmitStatus('idle')}
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
              >
                Send Another Message
              </button>
              {submissionMethod === 'email-client' && (
                <>
                  <a
                    href="mailto:webmaster@jawed.co.in"
                    className="button"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                  >
                    Launch Email App Again
                  </a>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCopyEmail}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                  >
                    {copiedEmail ? '✓ Copied Email Address!' : 'Copy webmaster@jawed.co.in'}
                  </button>
                </>
              )}
            </div>
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
            <div className={`form-field ${shakingFields.name ? 'form-field-shake' : ''}`}>
              <label
                htmlFor="contact-name"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Full Name <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div className={`input-icon-wrapper ${touched.name && errors.name ? 'has-error' : touched.name && formData.name.trim().length >= 2 ? 'is-valid' : ''}`}>
                <User className="input-icon" size={18} strokeWidth={2} aria-hidden="true" />
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={Boolean(touched.name && errors.name)}
                  aria-describedby={
                    touched.name && errors.name
                      ? 'contact-name-error'
                      : 'contact-name-hint'
                  }
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Alex Morgan"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                    border:
                      touched.name && errors.name
                        ? '2px solid #dc2626'
                        : touched.name && formData.name.trim().length >= 2
                        ? '1px solid #10b981'
                        : '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                {touched.name && errors.name ? (
                  <p id="contact-name-error" role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>
                    {errors.name}
                  </p>
                ) : touched.name && formData.name.trim().length >= 2 ? (
                  <span id="contact-name-hint" style={{ color: '#059669', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✓</span> Name meets length requirement
                  </span>
                ) : (
                  <span id="contact-name-hint" style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                    Minimum 2 characters required.
                  </span>
                )}
                {formData.name.length > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {formData.name.trim().length}/100
                  </span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className={`form-field ${shakingFields.email ? 'form-field-shake' : ''}`}>
              <label
                htmlFor="contact-email"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Email Address <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div className={`input-icon-wrapper ${touched.email && errors.email ? 'has-error' : touched.email && formData.email.trim() && !errors.email ? 'is-valid' : ''}`}>
                <Mail className="input-icon" size={18} strokeWidth={2} aria-hidden="true" />
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
                    padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                    border: touched.email && errors.email ? '2px solid #dc2626' : '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              {touched.email && errors.email && (
                <p id="contact-email-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Optional Phone */}
            <div className={`form-field ${shakingFields.phone ? 'form-field-shake' : ''}`}>
              <label
                htmlFor="contact-phone"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Phone Number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <div className={`input-icon-wrapper ${touched.phone && errors.phone ? 'has-error' : ''}`}>
                <Phone className="input-icon" size={18} strokeWidth={2} aria-hidden="true" />
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
                    padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                    border: touched.phone && errors.phone ? '2px solid #dc2626' : '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              {touched.phone && errors.phone && (
                <p id="contact-phone-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className={`form-field ${shakingFields.reason ? 'form-field-shake' : ''}`}>
              <label
                htmlFor="contact-reason"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Reason for Inquiry <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div className={`input-icon-wrapper ${touched.reason && errors.reason ? 'has-error' : touched.reason && formData.reason ? 'is-valid' : ''}`}>
                <HelpCircle className="input-icon" size={18} strokeWidth={2} aria-hidden="true" />
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
                    padding: '0.65rem 0.85rem 0.65rem 2.5rem',
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
              </div>
              {touched.reason && errors.reason && (
                <p id="contact-reason-error" style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                  {errors.reason}
                </p>
              )}
            </div>

            {/* Message */}
            <div className={`form-field ${shakingFields.message ? 'form-field-shake' : ''}`}>
              <label
                htmlFor="contact-message"
                style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}
              >
                Message <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <div className={`input-icon-wrapper textarea-icon-wrapper ${touched.message && errors.message ? 'has-error' : touched.message && formData.message.trim().length >= 10 ? 'is-valid' : ''}`}>
                <MessageSquare className="input-icon" size={18} strokeWidth={2} aria-hidden="true" />
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  required
                  minLength={10}
                  maxLength={3000}
                  aria-required="true"
                  aria-invalid={Boolean(touched.message && errors.message)}
                  aria-describedby={
                    touched.message && errors.message
                      ? 'contact-message-error'
                      : 'contact-message-hint'
                  }
                  value={formData.message}
                  onChange={handleChange}
                  onBlur={() => handleBlur('message')}
                  placeholder="Please describe your project, opportunity, or feedback in detail..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                    border:
                      touched.message && errors.message
                        ? '2px solid #dc2626'
                        : touched.message && formData.message.trim().length >= 10
                        ? '1px solid #10b981'
                        : '1px solid var(--line)',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                {touched.message && errors.message ? (
                  <p id="contact-message-error" role="alert" style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>
                    {errors.message}
                  </p>
                ) : touched.message && formData.message.trim().length >= 10 ? (
                  <span id="contact-message-hint" style={{ fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>✓</span> Minimum length met ({formData.message.trim().length} characters)
                  </span>
                ) : (
                  <span id="contact-message-hint" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Minimum 10 characters required{formData.message.trim().length > 0 ? ` (${10 - formData.message.trim().length} more needed)` : ''}.
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: formData.message.length > 2900 ? '#dc2626' : 'var(--muted)' }}>
                  {formData.message.length}/3000
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                className="button"
                type="submit"
                disabled={isSubmitting || isOpenEmailLoading}
                aria-busy={isSubmitting}
                style={{
                  minWidth: '180px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <span aria-hidden="true">⏳</span>
                    <span>Sending Message...</span>
                  </>
                ) : (
                  'Send Message →'
                )}
              </button>

              <button
                className="button button-secondary"
                type="button"
                id="open-email-btn"
                onClick={handleOpenEmail}
                disabled={isSubmitting || isOpenEmailLoading}
                aria-busy={isOpenEmailLoading}
                style={{
                  minWidth: '160px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isOpenEmailLoading ? (
                  <>
                    <span aria-hidden="true">⏳</span>
                    <span>Opening Email...</span>
                  </>
                ) : (
                  '✉️ Open Email'
                )}
              </button>
            </div>
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
          Your submitted name, email, and message are used solely to reply to your inquiry. Form submissions are processed via email and do not directly store your data on the website server or in a database. Your details are never sold, shared with marketing networks, or used for unsolicited communication. Never submit passwords, credit card numbers, or internal credentials.
        </p>
      </section>
    </main>
  );
};
