import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const TicketToKbDraft: React.FC = () => {
  const [kbTitle, setKbTitle] = useState('Resolving Teams Camera Initialization Failure on macOS Sonoma');
  const [targetAudience, setTargetAudience] = useState('All Employees / IT Tier 1');
  const [environment, setEnvironment] = useState('macOS 14+ (Sonoma/Sequoia), Microsoft Teams 24.x, external USB-C webcam.');
  const [symptoms, setSymptoms] = useState('Teams displays a black screen or "No available camera detected" despite camera working in Photo Booth and FaceTime.');
  const [rootCause, setRootCause] = useState('TCC privacy database permissions became stale following automatic Teams background client update.');
  const [resolutionSteps, setResolutionSteps] = useState(`1. Quit Microsoft Teams completely (Cmd + Q).
2. Open System Settings > Privacy & Security > Camera.
3. Toggle the switch for "Microsoft Teams" OFF, wait 5 seconds, and toggle it back ON.
4. If Teams is not listed, run in Terminal: tccutil reset Camera com.microsoft.teams2
5. Re-open Teams and verify video preview in Settings > Devices.`);
  const [copied, setCopied] = useState(false);

  const kbArticle = `# Knowledge Base Article: ${kbTitle}
**Audience:** ${targetAudience}  
**Environment / Affected Systems:** ${environment}

---
### Issue Symptoms:
${symptoms}

---
### Underlying Cause:
${rootCause}

---
### Step-by-Step Resolution:
${resolutionSteps}

---
### Internal IT Tips & Verification:
- Confirm user is on the approved company release ring.
- Escalate to MDM engineering if TCC reset is blocked by configuration profile restrictions.
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(kbArticle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/tools">Tools</Link> &gt; <span>Ticket to Knowledge Base Draft</span>
        </nav>

        <header className="page-header">
          <h1 className="page-title">Ticket to Knowledge Base Draft</h1>
          <p className="page-lead">
            Convert one-off IT resolutions into reusable, searchable self-service articles and standard operating procedures.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Knowledge Base Attributes</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="kbTitle">Article Title</label>
                <input
                  id="kbTitle"
                  type="text"
                  value={kbTitle}
                  onChange={e => setKbTitle(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="targetAudience">Target Audience</label>
                <input
                  id="targetAudience"
                  type="text"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="environment">Environment / Supported Platforms</label>
              <input
                id="environment"
                type="text"
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="symptoms">Symptoms & Error Messages</label>
              <textarea
                id="symptoms"
                rows={2}
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="rootCause">Root Cause Summary</label>
              <textarea
                id="rootCause"
                rows={2}
                value={rootCause}
                onChange={e => setRootCause(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="resolutionSteps">Step-by-Step Resolution Steps</label>
              <textarea
                id="resolutionSteps"
                rows={5}
                value={resolutionSteps}
                onChange={e => setResolutionSteps(e.target.value)}
              />
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Generated Knowledge Base Article</h2>
              <button className="button button-primary" type="button" onClick={handleCopy}>
                {copied ? 'Copied to Clipboard!' : 'Copy Markdown'}
              </button>
            </div>

            <pre className="tool-output">
              {kbArticle}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
