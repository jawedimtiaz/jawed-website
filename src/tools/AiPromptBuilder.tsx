import React, { useState, useEffect } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Bookmark,
  Trash2,
  ExternalLink,
  Layers,
  FileText,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PresetPrompt {
  id: string;
  title: string;
  category: string;
  description: string;
  role: string;
  goal: string;
  context: string;
  format: string;
  constraints: string;
  examples: string;
}

const PRESET_TEMPLATES: PresetPrompt[] = [
  {
    id: 'maint-announcement',
    title: 'Scheduled Network Maintenance Announcement',
    category: 'IT Operations',
    description: 'Clear, non-technical broadcast email informing employees of upcoming infrastructure downtime.',
    role: 'IT Infrastructure Lead',
    goal: 'Draft an announcement informing users about an upcoming scheduled network maintenance window.',
    context: 'The core firewall firmware is being updated on Saturday from 2:00 AM to 5:00 AM IST. Direct Internet and VPN access will be intermittently unavailable.',
    format: 'Concise announcement email with bullet points for timing, expected impact, and emergency support details.',
    constraints: 'Avoid overly deep jargon; clear for non-technical employees; professional and reassuring tone.',
    examples: 'Include a clear subject line and recommended user actions (save open files before leaving Friday).',
  },
  {
    id: 'rca-postmortem',
    title: 'Incident Root Cause Analysis (RCA) Report',
    category: 'Service Management',
    description: 'Structured post-mortem document summarizing service impact, root cause, and remediation timeline for management.',
    role: 'Senior Reliability Engineer',
    goal: 'Author a formal Root Cause Analysis (RCA) report for a 45-minute database connection pool exhaustion incident.',
    context: 'At 14:15 UTC, the primary PostgreSQL cluster reached max_connections due to an unindexed query spawned by a batch report worker.',
    format: 'Executive summary format: Executive Summary, Timeline, Root Cause, Immediate Mitigation, Long-Term Preventative Actions.',
    constraints: 'Objective and factual; focus on system safeguards rather than individual blame.',
    examples: 'Include 5-Whys root cause breakdown and Jira ticket tracking placeholders.',
  },
  {
    id: 'kb-article-draft',
    title: 'Self-Service Knowledge Base (KB) Article',
    category: 'Helpdesk & Support',
    description: 'Step-by-step troubleshooting guide for end-users to resolve common software or hardware issues.',
    role: 'Technical Knowledge Base Author',
    goal: 'Write an end-user self-service KB guide titled "How to Re-authenticate Outlook Desktop when MFA Fails".',
    context: 'Recent Azure AD conditional access updates cause Outlook desktop clients to prompt for credentials continuously until credential manager tokens are cleared.',
    format: 'Markdown article with Overview, Symptoms, Step-by-Step Resolution (numbered), and Escalation Guidance.',
    constraints: 'Plain English; short sentences; assume basic computer literacy without technical jargon.',
    examples: 'Include callout notes for Windows vs macOS steps and estimated time to complete (3 minutes).',
  },
  {
    id: 'executive-update',
    title: 'Executive Infrastructure Status Update',
    category: 'Management',
    description: 'High-level weekly briefing for CTO/IT Directors summarizing project milestones, risks, and budget posture.',
    role: 'IT Project Manager',
    goal: 'Provide a weekly status update on the Cloud Migration & Zero Trust Access initiative.',
    context: 'Phase 2 (Identity Provider Migration) is 85% complete. Delay in legacy ERP SAML integration requires 3 days contingency.',
    format: '3-bullet Executive Summary followed by Milestones Achieved, Current Risks & Mitigations, and Next Week Priorities.',
    constraints: 'Max 300 words; bulleted; highlight business value and risk exposure.',
    examples: 'Include green/amber/red status indicator for Schedule, Budget, and Scope.',
  },
  {
    id: 'code-review-audit',
    title: 'Code Review & Security Audit Request',
    category: 'Development',
    description: 'Detailed code review prompt inspecting pull requests for performance bottlenecks and OWASP Top 10 vulnerabilities.',
    role: 'Lead Application Security Engineer',
    goal: 'Perform a comprehensive security and performance code review on an Express.js authentication middleware PR.',
    context: 'The pull request handles JWT token verification, refresh token rotation, and SQL query parameterization.',
    format: 'Categorized review feedback: Security Vulnerabilities (Critical/High), Performance Issues, Code Style & Readability, and Approval Recommendation.',
    constraints: 'Reference specific OWASP standards (e.g. Broken Authentication, Injection); provide refactored code snippets.',
    examples: 'Include checks for constant-time string comparison on hash validation.',
  },
  {
    id: 'customer-escalation',
    title: 'Critical Outage Customer Response',
    category: 'Customer Success',
    description: 'Empathic, transparent correspondence addressing customer leadership after a major SLA breach.',
    role: 'Director of Customer Experience',
    goal: 'Draft a high-priority customer response acknowledging a 2-hour API gateway outage impacting their production order processing.',
    context: 'A BGP routing loop at our upstream ISP caused packet drop across North American edge POPs. Service was fully restored at 11:30 AM EST.',
    format: 'Formal letter/email: Apology & Acknowledgment, Cause Summary, Actions Taken to Restore, Remediation & SLA Credit Offer.',
    constraints: 'Empathetic, non-defensive, highly professional, reassuring.',
    examples: 'Include SLA credit application process and offer a direct follow-up call with the Infrastructure Director.',
  },
  {
    id: 'resume-bullet-star',
    title: 'STAR-Format Resume Bullet Optimizer',
    category: 'Career & HR',
    description: 'Transforms weak, passive job duties into high-impact, metric-driven STAR resume accomplishments.',
    role: 'Senior Technical Resume Specialist',
    goal: 'Rewrite passive IT support resume bullets into powerful STAR (Situation, Task, Action, Result) achievement statements.',
    context: 'Original bullet: "Handled user tickets and configured computers for new employees."',
    format: 'Provide 3 alternative optimized bullet points featuring active action verbs, technical specifics, and metric placeholders.',
    constraints: 'Focus on quantifiable outcomes (e.g. reduced MTTR by X%, onboarded Y users/month); zero fluff.',
    examples: 'Use verbs like "Engineered", "Orchestrated", "Automated", "Streamlined".',
  },
  {
    id: 'api-tech-spec',
    title: 'API Integration Technical Specification',
    category: 'Engineering',
    description: 'Generates a clean REST API integration guide for third-party developers.',
    role: 'API Solution Architect',
    goal: 'Write an integration specification for an OAuth2-protected Customer Data Synchronization Webhook endpoint.',
    context: 'Webhook pushes JSON payloads containing customer ID, event timestamp, updated fields, and cryptographic signature header.',
    format: 'OpenAPI-aligned spec: Endpoint Definition, Headers, Request Body Schema, Sample JSON Payload, Error Responses (400/401/500).',
    constraints: 'Precise field types (string, ISO-8601, UUID); HMAC SHA-256 signature verification guidance.',
    examples: 'Provide curl command example and retry policy recommendations for 5xx errors.',
  },
];

interface SavedPrompt {
  id: string;
  title: string;
  date: string;
  role: string;
  goal: string;
  context: string;
  format: string;
  constraints: string;
  examples: string;
  generatedText: string;
}

export const AiPromptBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'presets' | 'saved'>('builder');

  // Parameters State
  const [role, setRole] = useState('IT Support Specialist');
  const [goal, setGoal] = useState('Draft an announcement informing users about an upcoming scheduled network maintenance window.');
  const [context, setContext] = useState('The core firewall firmware is being updated on Saturday from 2:00 AM to 5:00 AM IST. Direct Internet and VPN access will be intermittently unavailable.');
  const [format, setFormat] = useState('Concise announcement email with bullet points for timing, expected impact, and emergency contact details.');
  const [constraints, setConstraints] = useState('Avoid overly deep jargon; clear for non-technical employees; professional and reassuring tone.');
  const [examples, setExamples] = useState('Include a clear subject line and recommended user actions (save open files before leaving Friday).');

  // Feedback State
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');

  // Saved Prompts List
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('apb_saved_prompts') || '[]');
    } catch {
      return [];
    }
  });

  // Construct Formatted Output Prompt
  const generatedPrompt = `### Role:
Act as a seasoned ${role || '[Specified Role / Persona]'}.

### Objective:
${goal || '[Primary Task / Goal]'}

### Context & Details:
${context || '[Background Context & Environment Details]'}

### Desired Output Format:
${format || '[Preferred Output Structure & Length]'}

### Constraints & Instructions:
${constraints || '[Key Constraints, Tone, & Exclusions]'}
${examples.trim() ? `\n### Examples / Additional Guidance:\n${examples}` : ''}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleReset = () => {
    setRole('');
    setGoal('');
    setContext('');
    setFormat('');
    setConstraints('');
    setExamples('');
  };

  const handleApplyPreset = (preset: PresetPrompt) => {
    setRole(preset.role);
    setGoal(preset.goal);
    setContext(preset.context);
    setFormat(preset.format);
    setConstraints(preset.constraints);
    setExamples(preset.examples);
    setActiveTab('builder');
  };

  const handleSavePrompt = () => {
    if (!role.trim() && !goal.trim()) return;

    const newSaved: SavedPrompt = {
      id: Date.now().toString(36),
      title: goal.trim() ? (goal.length > 50 ? goal.substring(0, 48) + '...' : goal) : `${role} Prompt`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      role,
      goal,
      context,
      format,
      constraints,
      examples,
      generatedText: generatedPrompt,
    };

    const updated = [newSaved, ...savedPrompts];
    setSavedPrompts(updated);
    try {
      localStorage.setItem('apb_saved_prompts', JSON.stringify(updated));
    } catch {}

    setSavedSuccess('Prompt saved to local storage!');
    setTimeout(() => setSavedSuccess(''), 2500);
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    try {
      localStorage.setItem('apb_saved_prompts', JSON.stringify(updated));
    } catch {}
  };

  const handleLoadSaved = (item: SavedPrompt) => {
    setRole(item.role);
    setGoal(item.goal);
    setContext(item.context);
    setFormat(item.format);
    setConstraints(item.constraints);
    setExamples(item.examples);
    setActiveTab('builder');
  };

  return (
    <main className="container page ai-prompt-builder-root">
      {/* Top Navigation & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'AI Prompt Builder' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="AI Prompt Builder for Workplace Productivity"
          text="Craft high-precision, context-rich prompts tailored for workplace troubleshooting, knowledge base authoring, and professional correspondence."
        />
      </div>

      {/* Header Bar Navigation Tabs */}
      <div className="tool-top">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles className="w-5 h-5 text-amber-400" />
          AI Prompt Builder for Workplace Productivity
        </div>
        <nav className="tool-nav" role="tablist">
          <button
            type="button"
            className={activeTab === 'builder' ? 'on' : ''}
            onClick={() => setActiveTab('builder')}
          >
            Prompt Builder
          </button>
          <button
            type="button"
            className={activeTab === 'presets' ? 'on' : ''}
            onClick={() => setActiveTab('presets')}
          >
            Template Library ({PRESET_TEMPLATES.length})
          </button>
          <button
            type="button"
            className={activeTab === 'saved' ? 'on' : ''}
            onClick={() => setActiveTab('saved')}
          >
            Saved ({savedPrompts.length})
          </button>
        </nav>
      </div>

      {savedSuccess && (
        <div className="notice" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--emerald)', fontWeight: 600 }}>
          ✓ {savedSuccess}
        </div>
      )}

      {/* Hero Header */}
      <div className="tool-hero">
        <h1 style={{ margin: '0 0 8px', fontWeight: 800 }}>Craft Context-Rich AI Prompts That Get Results</h1>
        <p className="lead" style={{ margin: 0, maxWidth: '840px' }}>
          Stop getting vague or generic LLM responses. Use this structured prompt framework to specify persona, objective, context, output format, and operational constraints for ChatGPT, Claude, Gemini, and Copilot.
        </p>
      </div>

      <div className="notice" role="note">
        <strong>Privacy Note:</strong> All prompts and inputs execute 100% locally in your browser. Avoid pasting confidential passwords, private credentials, or restricted PII.
      </div>

      {/* VIEW 1: PROMPT BUILDER WORKSPACE */}
      {activeTab === 'builder' && (
        <div>
          {/* Quick Preset Strip */}
          <div className="panel" style={{ marginBottom: '16px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Preset Templates:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESET_TEMPLATES.slice(0, 5).map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleApplyPreset(preset)}
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    title={preset.description}
                  >
                    {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                  </button>
                ))}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setActiveTab('presets')}
                  style={{ fontSize: '0.78rem', padding: '4px 10px', color: 'var(--accent)' }}
                >
                  More ({PRESET_TEMPLATES.length}) →
                </button>
              </div>
            </div>
          </div>

          <div className="grid2">
            {/* Left Column: Input Parameters */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-heading)' }}>
                  1. Define Prompt Parameters
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Fill in the core parameters below to build a clear, multi-shot structured prompt.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label htmlFor="role">Persona / Role</label>
                  <input
                    id="role"
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g. Senior IT Support Engineer"
                  />
                </div>

                <div>
                  <label htmlFor="goal">Primary Goal / Objective</label>
                  <input
                    id="goal"
                    type="text"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="e.g. Draft scheduled maintenance announcement"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="context">Context &amp; Background Information</label>
                <textarea
                  id="context"
                  rows={4}
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Provide essential details: software versions, impacted systems, maintenance windows, or team background..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label htmlFor="format">Desired Output Format</label>
                  <input
                    id="format"
                    type="text"
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    placeholder="e.g. Step-by-step checklist, markdown table, email"
                  />
                </div>

                <div>
                  <label htmlFor="constraints">Constraints &amp; Tone</label>
                  <input
                    id="constraints"
                    type="text"
                    value={constraints}
                    onChange={e => setConstraints(e.target.value)}
                    placeholder="e.g. Plain language; under 200 words; reassuring"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="examples">Examples / Additional Guidance (Optional)</label>
                <textarea
                  id="examples"
                  rows={3}
                  value={examples}
                  onChange={e => setExamples(e.target.value)}
                  placeholder="Key terms to include, preferred formatting style, or sample outputs..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button className="button button-secondary" type="button" onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Reset Inputs
                </button>
              </div>
            </div>

            {/* Right Column: Output & Action Controls */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText className="w-5 h-5 text-sky-400" />
                    2. Generated Prompt Output
                  </h2>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={handleSavePrompt}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                      title="Save prompt template to local browser storage"
                    >
                      <Bookmark className="w-4 h-4 text-teal-400" />
                      Save Prompt
                    </button>
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={handleCopy}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
                      title="Copy complete prompt markdown to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied Prompt!' : 'Copy Prompt'}
                    </button>
                  </div>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Copy this structured markdown text and paste it into ChatGPT, Claude, Gemini, or Microsoft Copilot.
                </p>

                <pre className="tool-output" style={{ minHeight: '340px', fontSize: '0.88rem', lineHeight: '1.6' }}>
                  {generatedPrompt}
                </pre>
              </div>

              {/* Prompt Quality Audit Scorecard */}
              <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', marginTop: '16px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Prompt Precision Scorecard:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
                  <div style={{ color: role.trim() ? 'var(--emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <span>{role.trim() ? '✓ Persona Defined' : '○ Persona Missing'}</span>
                  </div>
                  <div style={{ color: goal.trim() ? 'var(--emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <span>{goal.trim() ? '✓ Objective Defined' : '○ Objective Missing'}</span>
                  </div>
                  <div style={{ color: context.trim() ? 'var(--emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <span>{context.trim() ? '✓ Context Included' : '○ Context Missing'}</span>
                  </div>
                  <div style={{ color: format.trim() ? 'var(--emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <span>{format.trim() ? '✓ Format Specified' : '○ Format Missing'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TEMPLATE PRESET LIBRARY */}
      {activeTab === 'presets' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-heading)' }}>
              Industry &amp; Enterprise Prompt Templates
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select a pre-configured, tested prompt template below to automatically load its parameters into the builder.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {PRESET_TEMPLATES.map(preset => (
              <div key={preset.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'var(--surface-accent)', color: 'var(--accent)' }}>
                      {preset.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-heading)' }}>
                    {preset.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {preset.description}
                  </p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)', background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <strong>Persona:</strong> {preset.role}<br />
                    <strong>Goal:</strong> {preset.goal}
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => handleApplyPreset(preset)}
                  style={{ width: '100%', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  Load Template into Builder →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: SAVED PROMPTS */}
      {activeTab === 'saved' && (
        <div>
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-heading)' }}>
              Your Saved Prompt Templates
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Prompts saved to your browser's local storage ({savedPrompts.length} items).
            </p>
          </div>

          {savedPrompts.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Bookmark className="w-8 h-8 text-slate-500" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px' }}>No Saved Prompts Found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Create a custom prompt in the Builder tab and click "Save Prompt" to save it here for future reuse.
              </p>
              <button type="button" className="button button-primary" onClick={() => setActiveTab('builder')}>
                Go to Prompt Builder
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {savedPrompts.map(item => (
                <div key={item.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saved {item.date}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '2px' }}
                        title="Delete saved prompt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-heading)' }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      <strong>Role:</strong> {item.role || 'Unspecified'}
                    </div>

                    <pre className="tool-output" style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '0.78rem', padding: '10px' }}>
                      {item.generatedText}
                    </pre>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => handleLoadSaved(item)}
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    >
                      Load in Builder
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(item.generatedText);
                        alert('Prompt copied to clipboard!');
                      }}
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    >
                      Copy Prompt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
