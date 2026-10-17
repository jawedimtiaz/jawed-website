import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const TicketToKbDraft: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [scope, setScope] = useState('');
  const [checks, setChecks] = useState('');
  const [resolution, setResolution] = useState('');
  const [validation, setValidation] = useState('');
  const [escalation, setEscalation] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;

    const sections = [
      ['Problem', problem.trim()],
      ['Scope', scope.trim() || '[Add verified conditions and scope before publishing]'],
      ['Checks & Observations', checks.trim() || '[Add verified diagnostic checks before publishing]'],
      ['Resolution', resolution.trim() || '[Add verified action before publishing]'],
      ['Validation', validation.trim() || '[Add verification steps before publishing]'],
      ['Escalation', escalation.trim() || '[Add escalation path and conditions before publishing]'],
      ['Maintenance Trigger', maintenance.trim() || '[Add review triggers before publishing]']
    ];

    const result = sections.map(([k, val]) => `${k}:\n${val}`).join('\n\n');
    setOutput(result);
    setCopied(false);
    setStatusMsg('Draft built locally. Review and sanitize it before reuse.');
  };

  const handleClear = () => {
    setProblem('');
    setScope('');
    setChecks('');
    setResolution('');
    setValidation('');
    setEscalation('');
    setMaintenance('');
    setOutput('');
    setCopied(false);
    setStatusMsg('');
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setStatusMsg('Copied to clipboard.');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setStatusMsg('Copy is not available in this browser; select the text manually.');
    }
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · IT Support · Interactive</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Ticket → Knowledge Base Draft</span>
      </div>

      <h1>Ticket → Knowledge Base Draft</h1>
      <p className="lead">
        Turn verified Service Desk evidence into a reviewable knowledge-base draft without copying sensitive ticket details into a reusable article.
      </p>

      <section className="content-section">
        <div className="card">
          <p>
            <strong>Browser-only.</strong> Your text stays in this page and is not sent to an AI service or server by this tool. Use sanitized examples. Do not enter passwords, authentication codes, private keys, private employee information, confidential company data, internal-only URLs or restricted security information.
          </p>
        </div>
      </section>

      <section className="content-section">
        <form className="contact-form" onSubmit={handleBuild}>
          <div className="form-field">
            <label htmlFor="kb-problem">1. Problem / recognizable symptom</label>
            <textarea
              id="kb-problem"
              rows={4}
              placeholder="What problem should another technician recognize?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-scope">2. Scope / conditions</label>
            <textarea
              id="kb-scope"
              rows={3}
              placeholder="Who or what was affected? Include platform/version only when useful."
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-checks">3. Verified checks and observations</label>
            <textarea
              id="kb-checks"
              rows={4}
              placeholder="What was checked, and what did each result establish?"
              value={checks}
              onChange={(e) => setChecks(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-resolution">4. Verified resolution or supported action</label>
            <textarea
              id="kb-resolution"
              rows={4}
              placeholder="What action was confirmed to resolve the documented pattern?"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-validation">5. Validation</label>
            <textarea
              id="kb-validation"
              rows={3}
              placeholder="How was the original task tested after the action?"
              value={validation}
              onChange={(e) => setValidation(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-escalation">6. Escalation boundary</label>
            <textarea
              id="kb-escalation"
              rows={3}
              placeholder="When should a technician stop and escalate?"
              value={escalation}
              onChange={(e) => setEscalation(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="kb-maintenance">7. Maintenance / review trigger</label>
            <textarea
              id="kb-maintenance"
              rows={3}
              placeholder="What product, version, process or policy change should trigger review?"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="button" type="submit">
              Build KB Draft
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Knowledge-base draft</h2>
        <pre className="tool-output">{output || 'Your draft will appear here.'}</pre>

        {output && (
          <button className="button" type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Draft'}
          </button>
        )}
        {statusMsg && (
          <p className="form-note" style={{ marginTop: '8px' }}>
            {statusMsg}
          </p>
        )}
      </section>

      <section className="content-section">
        <h2>Worked example (fictional)</h2>
        <div className="card">
          <h3>Problem</h3>
          <p>A user reports that a supported work application returns to the sign-in screen after an update.</p>
          <h3>Scope</h3>
          <p>One test account and one supported application version; no broader outage has been confirmed.</p>
          <h3>Checks and observations</h3>
          <ul>
            <li>Check the approved service-status source and record the time checked.</li>
            <li>Reproduce the behavior with a test account and note the application version and exact symptom.</li>
            <li>Separate observed facts from possible causes; do not infer a cause from timing alone.</li>
          </ul>
        </div>
      </section>
    </main>
  );
};
