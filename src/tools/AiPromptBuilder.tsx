import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShareButton } from '../components/ShareButton';

export const AiPromptBuilder: React.FC = () => {
  const [role, setRole] = useState('IT Support Specialist');
  const [goal, setGoal] = useState('Draft an announcement informing users about an upcoming scheduled network maintenance window.');
  const [context, setContext] = useState('The core firewall firmware is being updated on Saturday from 2:00 AM to 5:00 AM IST. Direct Internet and VPN access will be intermittently unavailable.');
  const [format, setFormat] = useState('Concise announcement email with bullet points for timing, expected impact, and emergency contact details.');
  const [constraints, setConstraints] = useState('Avoid overly deep jargon; clear for non-technical employees; professional and reassuring tone.');
  const [examples, setExamples] = useState('Include a clear subject line and recommended user actions (save open files before leaving Friday).');
  const [copied, setCopied] = useState(false);

  const generatedPrompt = `### Role:
Act as a seasoned ${role}.

### Objective:
${goal}

### Context & Details:
${context}

### Desired Output Format:
${format}

### Constraints & Instructions:
${constraints}
${examples.trim() ? `\n### Examples / Additional Guidance:\n${examples}` : ''}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setRole('');
    setGoal('');
    setContext('');
    setFormat('');
    setConstraints('');
    setExamples('');
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/tools">Tools</Link> &gt; <span>AI Prompt Builder</span>
        </nav>

        <header className="page-header">
          <h1 className="page-title">AI Prompt Builder for Workplace Productivity</h1>
          <p className="page-lead">
            Craft high-precision, context-rich prompts tailored for workplace troubleshooting, knowledge base authoring, and professional correspondence.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Prompt Parameters</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="role">Persona / Role</label>
                <input
                  id="role"
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Senior IT Support Engineer"
                />
              </div>

              <div className="field-group">
                <label htmlFor="goal">Primary Goal / Task</label>
                <input
                  id="goal"
                  type="text"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="e.g. Triage an intermittent VPN disconnection"
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="context">Context & Background Information</label>
              <textarea
                id="context"
                rows={3}
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Background details, system environment, impacted users..."
              />
            </div>

            <div className="field-grid" style={{ marginTop: '14px' }}>
              <div className="field-group">
                <label htmlFor="format">Desired Output Format</label>
                <input
                  id="format"
                  type="text"
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  placeholder="e.g. Step-by-step checklist, markdown table, email"
                />
              </div>

              <div className="field-group">
                <label htmlFor="constraints">Constraints & Tone</label>
                <input
                  id="constraints"
                  type="text"
                  value={constraints}
                  onChange={e => setConstraints(e.target.value)}
                  placeholder="e.g. Plain language, under 200 words, action-oriented"
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="examples">Examples / Specific Inclusions (Optional)</label>
              <textarea
                id="examples"
                rows={2}
                value={examples}
                onChange={e => setExamples(e.target.value)}
                placeholder="Key terms to include, preferred structure..."
              />
            </div>

            <div className="bullet-actions" style={{ marginTop: '18px' }}>
              <button className="button button-secondary" type="button" onClick={handleReset}>
                Reset Inputs
              </button>
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Generated Prompt</h2>
              <button className="button button-primary" type="button" onClick={handleCopy}>
                {copied ? 'Copied to Clipboard!' : 'Copy Prompt'}
              </button>
            </div>

            <pre className="tool-output" style={{ minHeight: '220px' }}>
              {generatedPrompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
