import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { useLocalStorageDraft } from '../hooks/useLocalStorageDraft';
import { useRegisterShortcut } from '../hooks/useKeyboardShortcuts';
import { DraftSaveToolbar } from '../components/common/DraftSaveToolbar';
import { CopyButton } from '../components/common/CopyButton';
import { PdfExportButton } from '../components/common/PdfExportButton';

export interface ServiceDeskDraft {
  ticketId: string;
  caller: string;
  status: string;
  issueSummary: string;
  troubleshootingDone: string;
  rootCause: string;
  resolutionOrNextStep: string;
}

export const SERVICE_DESK_STORAGE_KEY = 'service_desk_note_formatter_draft_v1';

export const DEFAULT_SERVICE_DESK_DRAFT: ServiceDeskDraft = {
  ticketId: 'INC-84920',
  caller: 'Priya Sharma (Finance)',
  status: 'Resolved',
  issueSummary: 'Outlook disconnected status when roaming between office APs.',
  troubleshootingDone: 'Flushed DNS cache, re-authenticated with MFA, verified exchange endpoint connectivity.',
  rootCause: 'Cached OAuth token mismatch following user UPN change.',
  resolutionOrNextStep: 'Removed legacy Windows credential vault entry; re-launched Outlook with seamless single sign-on.',
};

export const ServiceDeskNoteFormatter: React.FC = () => {
  const {
    values,
    updateField,
    saveDraftNow,
    clearDraft,
    formattedLastSaved,
    isOnline,
    isRestored,
    hasSavedDraft,
    isDirty,
    saveStatus,
    statusMessage,
  } = useLocalStorageDraft<ServiceDeskDraft>({
    key: SERVICE_DESK_STORAGE_KEY,
    defaultValues: DEFAULT_SERVICE_DESK_DRAFT,
  });

  const {
    ticketId,
    caller,
    status,
    issueSummary,
    troubleshootingDone,
    rootCause,
    resolutionOrNextStep,
  } = values;
  const [copied, setCopied] = useState(false);

  useRegisterShortcut([
    {
      id: 'sd-note-generate',
      combo: 'mod+enter',
      label: 'Format Service Desk Note',
      description: 'Format raw input fields into clean ticket notes',
      category: 'Service Desk Formatter',
      allowInInput: true,
      overrideSystem: true,
      action: () => {
        saveDraftNow();
      },
    },
    {
      id: 'sd-note-save',
      combo: 'mod+s',
      label: 'Save Note Draft',
      description: 'Save current ticket note values to browser local storage',
      category: 'Service Desk Formatter',
      allowInInput: true,
      overrideSystem: true,
      action: () => {
        saveDraftNow();
      },
    },
  ]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'Service Desk Note Formatter' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="Service Desk Note Formatter"
            text="Convert scattered notes into clean, audit-ready ITSM ticket updates."
          />
        </div>

        <header className="page-header">
          <h1 className="page-title">Service Desk Note Formatter</h1>
          <p className="page-lead">
            Turn disorganized ticket notes into crisp, audit-ready ITSM logs (ServiceNow, Jira Service Management, Zendesk).
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <DraftSaveToolbar
              isOnline={isOnline}
              hasSavedDraft={hasSavedDraft}
              isRestored={isRestored}
              isDirty={isDirty}
              formattedLastSaved={formattedLastSaved}
              statusMessage={statusMessage}
              saveStatus={saveStatus}
              onSaveNow={saveDraftNow}
              onClearDraft={clearDraft}
              toolName="Service Desk Ticket Note"
            />

            <h2 className="section-title">Ticket Information</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="ticketId">Ticket ID / Reference</label>
                <input
                  id="ticketId"
                  type="text"
                  value={ticketId}
                  onChange={e => updateField('ticketId', e.target.value)}
                  placeholder="e.g. INC-10294"
                />
              </div>

              <div className="field-group">
                <label htmlFor="caller">User / Department</label>
                <input
                  id="caller"
                  type="text"
                  value={caller}
                  onChange={e => updateField('caller', e.target.value)}
                  placeholder="e.g. Jane Doe (Marketing)"
                />
              </div>

              <div className="field-group">
                <label htmlFor="status">Ticket Status</label>
                <select id="status" value={status} onChange={e => updateField('status', e.target.value)}>
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
                onChange={e => updateField('issueSummary', e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="troubleshootingDone">Actions Taken / Troubleshooting Steps</label>
              <textarea
                id="troubleshootingDone"
                rows={3}
                value={troubleshootingDone}
                onChange={e => updateField('troubleshootingDone', e.target.value)}
              />
            </div>

            <div className="field-grid" style={{ marginTop: '14px' }}>
              <div className="field-group">
                <label htmlFor="rootCause">Root Cause / Identified Issue</label>
                <textarea
                  id="rootCause"
                  rows={2}
                  value={rootCause}
                  onChange={e => updateField('rootCause', e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="resolutionOrNextStep">Resolution or Next Action</label>
                <textarea
                  id="resolutionOrNextStep"
                  rows={2}
                  value={resolutionOrNextStep}
                  onChange={e => updateField('resolutionOrNextStep', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Formatted Note</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <PdfExportButton documentTitle={ticketId ? `Ticket-${ticketId}-Formatted-Note` : 'Service-Desk-Note'} variant="secondary" size="sm" />
                <CopyButton text={formattedNote} label="Copy Formatted Note" variant="primary" />
              </div>
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
