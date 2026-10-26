import React, { useState, useEffect, useId } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Copy,
  Download,
  Bookmark,
  Check,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

interface SavedLetterItem {
  id: string;
  text: string;
  role: string;
  company: string;
  date: string;
}

interface CoverLetterForm {
  name: string;
  role: string;
  company: string;
  manager: string;
  years: string;
  skills: string;
  tone: 'formal' | 'friendly';
  length: 'standard' | 'short';
  ach: string;
  why: string;
}

const INITIAL_FORM: CoverLetterForm = {
  name: '',
  role: '',
  company: '',
  manager: '',
  years: '',
  skills: '',
  tone: 'formal',
  length: 'standard',
  ach: '',
  why: '',
};

const DEMO_DATA: CoverLetterForm = {
  name: 'Alex Sample',
  role: 'Network Support Engineer',
  company: 'Example Corp',
  manager: '',
  years: '6 years',
  skills: 'Active Directory, Cisco Meraki, VMware, PowerShell',
  tone: 'friendly',
  length: 'standard',
  ach: 'I migrated 120 users to Microsoft 365 and upgraded three branch routers with zero unscheduled downtime',
  why: 'it manages enterprise healthcare infrastructure where high reliability and fast incident resolution directly safeguard patient care',
};

function generateLetterText(f: CoverLetterForm): string {
  const NP = (x: string) => `[${x} — Not Provided]`;
  const v = (s?: string) => (s || '').trim();

  const name = v(f.name);
  const role = v(f.role);
  const co = v(f.company);
  const mgr = v(f.manager);
  const yrs = v(f.years);
  const sk = v(f.skills);
  const ach = v(f.ach).replace(/[.]+$/, '');
  const why = v(f.why).replace(/[.]+$/, '');

  const fr = f.tone === 'friendly';

  const p1 = `${fr ? "I'm excited to apply" : "I am writing to apply"} for the ${
    role || NP('job title')
  } position${co ? ' at ' + co : ''}. ${
    yrs ? `With ${yrs} of experience in IT, I` : 'I'
  } bring hands-on experience with ${sk || NP('key skills and tools')}.`;

  const p2 = ach
    ? `${fr ? 'A recent example' : 'One example from my recent work'}: ${ach}.`
    : NP('add one verified achievement with a measurable result');

  const p3 = why
    ? `I am drawn to ${co || 'your organisation'} because ${why}.`
    : NP(`add one specific reason you want to work at ${co || 'this company'}`);

  const close = fr
    ? "Thanks for taking the time to read my application. I'd be glad to talk about how I can help your team."
    : "Thank you for your time and consideration. I would welcome the opportunity to discuss how my experience fits your team's needs.";

  const paras = f.length === 'short' ? [p1, p2, close] : [p1, p2, p3, close];

  return `Dear ${mgr || 'Hiring Manager'},\n\n${paras.join('\n\n')}\n\n${
    fr ? 'Best regards' : 'Sincerely'
  },\n${name || NP('your name')}`;
}

export const ITCoverLetterBuilder: React.FC = () => {
  const [formData, setFormData] = useState<CoverLetterForm>(INITIAL_FORM);
  const [letterText, setLetterText] = useState<string>('');
  const [savedLetters, setSavedLetters] = useState<SavedLetterItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const nameId = useId();
  const roleId = useId();
  const companyId = useId();
  const managerId = useId();
  const yearsId = useId();
  const skillsId = useId();
  const toneId = useId();
  const lengthId = useId();
  const achId = useId();
  const whyId = useId();

  // Load saved letters from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cl_saved');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Normalize if plain string array or object array
          const normalized: SavedLetterItem[] = parsed.map((item, idx) => {
            if (typeof item === 'string') {
              return {
                id: `saved-${Date.now()}-${idx}`,
                text: item,
                role: 'IT Application',
                company: 'Saved Letter',
                date: new Date().toLocaleDateString(),
              };
            }
            return item;
          });
          setSavedLetters(normalized);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2500);
  };

  const persistSavedLetters = (items: SavedLetterItem[]) => {
    setSavedLetters(items);
    try {
      localStorage.setItem('cl_saved', JSON.stringify(items));
    } catch {
      // storage unavailable
    }
  };

  const handleGenerate = () => {
    const generated = generateLetterText(formData);
    setLetterText(generated);
    showToast('Cover letter generated!');
  };

  const handleFillDemo = () => {
    setFormData(DEMO_DATA);
    const generated = generateLetterText(DEMO_DATA);
    setLetterText(generated);
    showToast('Loaded demo example');
  };

  const handleClear = () => {
    setFormData(INITIAL_FORM);
    setLetterText('');
    showToast('Form cleared');
  };

  const handleCopy = async (textToCopy?: string) => {
    const text = textToCopy || letterText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch {
      const x = document.createElement('textarea');
      x.value = text;
      document.body.appendChild(x);
      x.select();
      document.execCommand('copy');
      x.remove();
      showToast('Copied to clipboard!');
    }
  };

  const handleDownloadTxt = (textToDownload?: string, customName?: string) => {
    const text = textToDownload || letterText;
    if (!text) return;
    const filename = customName || (formData.company ? `${formData.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}-cover-letter.txt` : 'it-cover-letter.txt');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  };

  const handleDownloadPdf = () => {
    if (!letterText) return;
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    // Header styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate 800
    const applicantName = formData.name.trim() || 'IT Professional';
    doc.text(applicantName, margin, margin + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    const subtitle = [
      formData.role.trim() ? `Application for: ${formData.role.trim()}` : '',
      formData.company.trim() ? `at ${formData.company.trim()}` : '',
      new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    ].filter(Boolean).join(' • ');

    doc.text(subtitle, margin, margin + 10);

    // Divider line
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 14, pageWidth - margin, margin + 14);

    // Letter Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate 900

    let cursorY = margin + 24;
    const paragraphs = letterText.split('\n\n');

    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) return;

      const lines = doc.splitTextToSize(trimmed, maxWidth);
      if (cursorY + lines.length * 6 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 5.8 + 5;
    });

    const filePrefix = formData.company ? formData.company.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'it';
    const filename = `${filePrefix}-cover-letter.pdf`;
    doc.save(filename);
    showToast(`Downloaded ${filename}`);
  };

  const handleSaveLetter = () => {
    if (!letterText.trim()) return;
    const newItem: SavedLetterItem = {
      id: `letter-${Date.now()}`,
      text: letterText,
      role: formData.role.trim() || 'IT Role',
      company: formData.company.trim() || 'Company',
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updated = [newItem, ...savedLetters.filter(i => i.text !== letterText)].slice(0, 10);
    persistSavedLetters(updated);
    showToast('Saved to browser storage');
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedLetters.filter(item => item.id !== id);
    persistSavedLetters(updated);
    showToast('Deleted saved letter');
  };

  const handleLoadSaved = (item: SavedLetterItem) => {
    setLetterText(item.text);
    showToast('Loaded saved letter into preview');
  };

  // Metrics
  const wordCount = letterText.trim() ? letterText.trim().split(/\s+/).length : 0;
  const placeholderMatches = letterText.match(/\[[^\]]*Not Provided\]/g) || [];
  const placeholderCount = placeholderMatches.length;

  return (
    <div className="page">
      {/* Tactile floating toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '10px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} color="var(--emerald)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="container">
        {/* Top Breadcrumb & Share */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'IT Cover Letter Builder' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="IT Cover Letter Builder | Jawed Imtiaz"
            text="Build a short, tailored, truthful cover letter for IT jobs. Missing details stay as clear placeholders, never invented."
            url={typeof window !== 'undefined' ? `${window.location.origin}/tools/it-cover-letter-builder` : 'https://jawed.co.in/tools/it-cover-letter-builder'}
          />
        </div>

        {/* Page Header */}
        <header style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent)',
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              Free Tool • Runs 100% In Browser
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={14} color="var(--emerald)" aria-hidden="true" /> Zero Data Uploaded
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              color: 'var(--text-heading)',
            }}
          >
            IT Cover Letter Builder
          </h1>
          <p
            className="lead"
            style={{
              fontSize: '1.05rem',
              color: 'var(--muted)',
              maxWidth: '820px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Build a short, tailored cover letter from what you really did. Missing details stay as clear placeholders (<code style={{ color: 'var(--amber)', fontSize: '0.9em' }}>[... — Not Provided]</code>), never invented or embellished.
          </p>
        </header>

        {/* Builder Form Panel */}
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '14px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Application Parameters
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Provide what you know; leave unknown details blank to see exact placeholders.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} color="var(--accent)" aria-hidden="true" />
                Fill Example
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Clear
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
            {/* 2-column responsive layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '18px',
                marginBottom: '18px',
              }}
            >
              {/* Column 1: Core Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    htmlFor={nameId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Your Name
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Alex Sample"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor={roleId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Job Title Applying For <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    id={roleId}
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Network Support Engineer"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor={companyId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Company Name
                  </label>
                  <input
                    id={companyId}
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Example Corp"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor={managerId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Hiring Manager <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    id={managerId}
                    type="text"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    placeholder="Leave blank for 'Hiring Manager'"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              {/* Column 2: Experience & Tone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    htmlFor={yearsId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Years of IT Experience <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    id={yearsId}
                    type="text"
                    value={formData.years}
                    onChange={(e) => setFormData({ ...formData, years: e.target.value })}
                    placeholder="e.g. 5+ years"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor={skillsId}
                    style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                  >
                    Top Skills / Tools You Truly Have
                  </label>
                  <input
                    id={skillsId}
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g. Active Directory, Cisco, VMware, PowerShell"
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: 'var(--text)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label
                      htmlFor={toneId}
                      style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                    >
                      Tone
                    </label>
                    <select
                      id={toneId}
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value as 'formal' | 'friendly' })}
                      style={{
                        width: '100%',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'var(--text)',
                        fontSize: '0.92rem',
                      }}
                    >
                      <option value="formal">Formal</option>
                      <option value="friendly">Friendly professional</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={lengthId}
                      style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                    >
                      Length
                    </label>
                    <select
                      id={lengthId}
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value as 'standard' | 'short' })}
                      style={{
                        width: '100%',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'var(--text)',
                        fontSize: '0.92rem',
                      }}
                    >
                      <option value="standard">Standard (4 paras)</option>
                      <option value="short">Short (3 paras)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement & Company Hook Textareas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px', marginBottom: '20px' }}>
              <div>
                <label
                  htmlFor={achId}
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                >
                  One Real Achievement <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  id={achId}
                  rows={3}
                  value={formData.ach}
                  onChange={(e) => setFormData({ ...formData, ach: e.target.value })}
                  placeholder="e.g. I migrated 120 users to Microsoft 365 with zero data loss and automated password resets via PowerShell"
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor={whyId}
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text)' }}
                >
                  Why This Company? <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  id={whyId}
                  rows={3}
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="e.g. it supports healthcare sites and I want to dedicate my networking skills to critical uptime environments"
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(90deg, var(--accent), var(--indigo))',
                  border: 0,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  padding: '11px 26px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
                }}
              >
                <FileText size={18} aria-hidden="true" />
                Generate Cover Letter
              </button>
            </div>
          </form>
        </section>

        {/* Letter Output Panel */}
        {letterText && (
          <section
            aria-label="Generated Cover Letter"
            className="panel"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 6px 24px -4px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Draft Cover Letter
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Live editable preview. You can edit directly before saving or exporting.
                </span>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                >
                  {wordCount} words
                </span>

                {placeholderCount > 0 ? (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.35)',
                      color: 'var(--amber)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <AlertCircle size={14} aria-hidden="true" />
                    {placeholderCount} placeholder{placeholderCount === 1 ? '' : 's'} to fill
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(52, 211, 153, 0.12)',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                      color: 'var(--emerald)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    No placeholders left (Ready to send)
                  </span>
                )}
              </div>
            </div>

            {/* Editable Text Area */}
            <div
              style={{
                position: 'relative',
                marginBottom: '16px',
              }}
            >
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                rows={12}
                aria-label="Editable cover letter output"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  lineHeight: '1.7',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleCopy()}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Copy size={15} aria-hidden="true" />
                  Copy Text
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadTxt()}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={15} aria-hidden="true" />
                  Download .TXT
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={15} color="var(--accent)" aria-hidden="true" />
                  Download PDF
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveLetter}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--accent)',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Bookmark size={15} aria-hidden="true" />
                Save in Browser
              </button>
            </div>
          </section>
        )}

        {/* Saved Letters Section */}
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={18} color="var(--accent)" aria-hidden="true" />
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Saved Letters ({savedLetters.length})
              </h2>
            </div>
            {savedLetters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all saved letters?')) {
                    persistSavedLetters([]);
                    showToast('Cleared all saved letters');
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {savedLetters.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: 0, fontStyle: 'italic' }}>
              No letters saved yet. Generate a letter and click &quot;Save in Browser&quot; to keep drafts handy for future revisions.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {savedLetters.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                        {item.role} {item.company && item.company !== 'Company' ? `@ ${item.company}` : ''}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: '10px' }}>
                        {item.date}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleLoadSaved(item)}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          color: 'var(--text)',
                        }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.text)}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          color: 'var(--text)',
                        }}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadTxt(item.text, `${item.company ? item.company.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'saved'}-cover-letter.txt`)}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          color: 'var(--text)',
                        }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(item.id)}
                        aria-label="Delete saved letter"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--bad, #f87171)',
                          padding: '4px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--muted)',
                      whiteSpace: 'pre-line',
                      maxHeight: '75px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.text.slice(0, 220)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Guide Section */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-heading)' }}>
            How to write a cover letter for IT jobs
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 16px' }}>
            A good IT cover letter is short, specific, and honest. It should connect two or three things you have actually done to what the job asks for, in about 150 to 250 words. Technical hiring managers do not have time to read generic corporate fluff; they want to see verified capability and alignment.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              margin: '20px 0',
            }}
          >
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                1. The Hook &amp; Matching Skills
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Directly name the role, company, and your top hands-on tools (e.g. Active Directory, Cisco Meraki, Intune, AWS).
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                2. Verifiable Achievement
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Highlight one real project with scale or numbers you can verify: users migrated, ticket resolution percentage, or downtime eliminated.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                3. Company Fit (Why Them?)
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                One genuine reason you want to work with this specific team or infrastructure, referencing their industry or operational environment.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
                4. Polite Close
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                A respectful thank-you without exaggerated assertions, high-pressure demands, or canned clichés.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '14px 18px',
              color: 'var(--text)',
              fontSize: '0.92rem',
              lineHeight: 1.6,
            }}
          >
            <strong>The Anti-Hallucination Guarantee:</strong> This tool only structures what you input. Any details you leave blank appear as high-visibility bracketed placeholders (<code style={{ color: 'var(--amber)' }}>[... — Not Provided]</code>) so you never send fabricated claims. Always review and personalize in your natural voice before submitting.
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '40px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-heading)' }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                q: 'Is my text sent anywhere or stored on a server?',
                a: 'No. Everything executes 100% inside your local web browser. Your inputs and saved draft letters never leave your computer or touch any external server.',
              },
              {
                q: 'Do I actually need a cover letter for IT and engineering roles?',
                a: 'While many automated application portals make cover letters optional, a concise, 150-to-200-word targeted letter gives you a decisive advantage when switching technical specializations, explaining career transitions, or targeting competitive enterprise roles.',
              },
              {
                q: 'Can this tool guarantee an interview reply?',
                a: 'No. Hiring decisions depend on multiple factors outside any tool, including headcount, budget, technical assessments, and internal candidates. This tool provides clarity and ATS-friendly structure so your authentic strengths stand out.',
              },
              {
                q: 'What should I do if I do not know the hiring manager name?',
                a: "Simply leave the 'Hiring manager' field blank. The generator defaults to 'Dear Hiring Manager,', which is clean, universally accepted, and professional.",
              },
              {
                q: 'How should I describe my technical achievement in paragraph 2?',
                a: 'Focus on action + scope + outcome. For example: "Led deployment of Cisco Meraki SD-WAN across 14 remote clinic sites, cutting failover latency to under 2 seconds and eliminating branch network drops."',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: 'none',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-heading)',
                      fontWeight: 600,
                      fontSize: '0.98rem',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="var(--muted)" /> : <ChevronDown size={18} color="var(--muted)" />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '14px 18px',
                        background: 'var(--card)',
                        borderTop: '1px solid var(--line)',
                        color: 'var(--muted)',
                        fontSize: '0.92rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
