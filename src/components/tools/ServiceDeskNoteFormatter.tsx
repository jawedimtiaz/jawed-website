import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ServiceDeskNoteFormatter: React.FC = () => {
  const [issue, setIssue] = useState('');
  const [actions, setActions] = useState('');
  const [resolution, setResolution] = useState('');
  const [followup, setFollowup] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;

    const lines = [`Issue / Request: ${issue.trim()}`];
    if (actions.trim()) lines.push(`Actions Taken: ${actions.trim()}`);
    if (resolution.trim()) lines.push(`Resolution / Current Status: ${resolution.trim()}`);
    if (followup.trim()) lines.push(`Follow-up: ${followup.trim()}`);

    const result = lines.join('\n\n');
    setOutput(result);
    setCopied(false);
    setStatusMsg('Note formatted locally in your browser.');
  };

  const handleClear = () => {
    setIssue('');
    setActions('');
    setResolution('');
    setFollowup('');
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
      <p className="eyebrow">Tool · IT Support</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Service Desk Note Formatter</span>
      </div>

      <h1>Service Desk Note Formatter</h1>
      <p className="lead">
        Turn rough ticket notes into a simple, consistent summary you can review before adding it to a ticket or handoff.
      </p>

      <section className="content-section">
        <form className="contact-form" onSubmit={handleFormat}>
          <div className="form-field">
            <label htmlFor="note-issue">Issue / Request</label>
            <textarea
              id="note-issue"
              rows={4}
              placeholder="What was reported or requested?"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="note-actions">Actions Taken</label>
            <textarea
              id="note-actions"
              rows={5}
              placeholder="What did you check or change?"
              value={actions}
              onChange={(e) => setActions(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="note-resolution">Resolution / Current Status</label>
            <textarea
              id="note-resolution"
              rows={4}
              placeholder="What was resolved, or what is the current status?"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="note-followup">Follow-up</label>
            <textarea
              id="note-followup"
              rows={3}
              placeholder="Any pending action, owner or next step?"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="button" type="submit">
              Format Note
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Formatted note</h2>
        <pre className="tool-output">{output || 'Your formatted note will appear here.'}</pre>

        {output && (
          <button className="button" type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Note'}
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
        <p>This invented example demonstrates how to distinguish observed facts from an unresolved cause. It is not a record of a real user, employer or incident.</p>
        <div className="card">
          <h3>Example input</h3>
          <p>
            <strong>Issue / Request:</strong> An approved work application closes immediately after launch on one managed test device. Broader impact has not been established.
          </p>
          <p>
            <strong>Actions Taken:</strong> Recorded the application and operating-system versions. Restarted the application once. Checked the official service-status page at 10:15; no incident was listed. Reproduced the symptom once. No settings or security controls were changed.
          </p>
          <p>
            <strong>Resolution / Current Status:</strong> Unresolved. The cause is not confirmed and the original workflow has not been restored.
          </p>
          <p>
            <strong>Follow-up:</strong> Escalate through the approved support path with timestamps, versions and sanitized error details. Recheck the service-status page before retrying.
          </p>
        </div>
      </section>

      <section className="content-section">
        <h2>Privacy</h2>
        <p>This tool runs in your browser. The text you enter is not sent to a server by this site and is not stored by the tool.</p>
      </section>

      <section className="content-section">
        <h2>Continue the support workflow</h2>
        <div className="card-grid two">
          <article className="card">
            <h3>Start with troubleshooting</h3>
            <Link to="/tools/it-troubleshooting-assistant/">Use the IT Troubleshooting Assistant →</Link>
          </article>
          <article className="card">
            <h3>Create a reusable guide</h3>
            <Link to="/tools/ticket-to-knowledge-base-draft/">Build a Knowledge Base Draft →</Link>
          </article>
        </div>
      </section>
    </main>
  );
};
