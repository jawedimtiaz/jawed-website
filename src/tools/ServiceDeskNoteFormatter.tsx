import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';

export const ServiceDeskNoteFormatter: React.FC = () => {
  const [ticketId, setTicketId] = useState('INC-84920');
  const [caller, setCaller] = useState('Priya Sharma (Finance)');
  const [issueSummary, setIssueSummary] = useState('Outlook disconnected status when roaming between office APs.');
  const [troubleshootingDone, setTroubleshootingDone] = useState('Flushed DNS cache, re-authenticated with MFA, verified exchange endpoint connectivity.');
  const [rootCause, setRootCause] = useState('Cached OAuth token mismatch following user UPN change.');
  const [resolutionOrNextStep, setResolutionOrNextStep] = useState('Removed legacy Windows credential vault entry; re-launched Outlook with seamless single sign-on.');
  const [status, setStatus] = useState('Resolved');
  const [copied, setCopied] = useState(false);

  const formattedNote = `### SERVICE DESK TICKET NOTE
Ticket ID: ${ticketId}
Caller / User: ${caller}
Status: ${status}
Issue Summary:
${issueSummary}

---
### Work Performed & Troubleshooting:
${troubleshootingDone}

---
### Root Cause / Analysis:
${rootCause}

---
### ${status === 'Resolved' ? 'Resolution & Verification:' : 'Next Steps & Pending Action:'}
${resolutionOrNextStep}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Service Desk Note Formatter' },
          ]}
        />

        <header className="page-header">
          <h1 className="page-title">Service Desk Note Formatter</h1>
          <p className="page-lead">
            Turn disorganized ticket notes into crisp, audit-ready ITSM logs (ServiceNow, Jira Service Management, Zendesk).
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Ticket Information</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="ticketId">Ticket ID / Reference</label>
                <input
                  id="ticketId"
                  type="text"
                  value={ticketId}
                  onChange={e => setTicketId(e.target.value)}
                  placeholder="e.g. INC-10294"
                />
              </div>

              <div className="field-group">
                <label htmlFor="caller">User / Department</label>
                <input
                  id="caller"
                  type="text"
                  value={caller}
                  onChange={e => setCaller(e.target.value)}
                  placeholder="e.g. Jane Doe (Marketing)"
                />
              </div>

              <div className="field-group">
                <label htmlFor="status">Ticket Status</label>
                <select id="status" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="In Progress">In Progress (Work in progress)</option>
                  <option value="Pending Customer">Pending Customer Response</option>
                  <option value="Escalated">Escalated to Tier 2/Tier 3</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="issueSummary">Reported Issue Summary</label>
              <textarea
                id="issueSummary"
                rows={2}
                value={issueSummary}
                onChange={e => setIssueSummary(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="troubleshootingDone">Actions Taken / Troubleshooting Steps</label>
              <textarea
                id="troubleshootingDone"
                rows={3}
                value={troubleshootingDone}
                onChange={e => setTroubleshootingDone(e.target.value)}
              />
            </div>

            <div className="field-grid" style={{ marginTop: '14px' }}>
              <div className="field-group">
                <label htmlFor="rootCause">Root Cause / Identified Issue</label>
                <textarea
                  id="rootCause"
                  rows={2}
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="resolutionOrNextStep">Resolution or Next Action</label>
                <textarea
                  id="resolutionOrNextStep"
                  rows={2}
                  value={resolutionOrNextStep}
                  onChange={e => setResolutionOrNextStep(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Formatted Note</h2>
              <button className="button button-primary" type="button" onClick={handleCopy}>
                {copied ? 'Copied to Clipboard!' : 'Copy Formatted Note'}
              </button>
            </div>

            <pre className="tool-output">
              {formattedNote}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
