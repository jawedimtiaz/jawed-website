import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { DraftSaveToolbar } from '../components/common/DraftSaveToolbar';
import { CopyButton } from '../components/common/CopyButton';
import { PdfExportButton } from '../components/common/PdfExportButton';
import { useDiagnosticToolStorage } from '../hooks/useDiagnosticToolStorage';
import { useRegisterShortcut } from '../hooks/useKeyboardShortcuts';

export interface TicketToKbDraftValues {
  kbTitle: string;
  targetAudience: string;
  environment: string;
  symptoms: string;
  rootCause: string;
  resolutionSteps: string;
}

export const TICKET_TO_KB_STORAGE_KEY = 'ticket_to_kb_draft_v1';

export const DEFAULT_TICKET_TO_KB_DRAFT: TicketToKbDraftValues = {
  kbTitle: 'Resolving Teams Camera Initialization Failure on macOS Sonoma',
  targetAudience: 'All Employees / IT Tier 1',
  environment: 'macOS 14+ (Sonoma/Sequoia), Microsoft Teams 24.x, external USB-C webcam.',
  symptoms: 'Teams displays a black screen or "No available camera detected" despite camera working in Photo Booth and FaceTime.',
  rootCause: 'TCC privacy database permissions became stale following automatic Teams background client update.',
  resolutionSteps: `1. Quit Microsoft Teams completely (Cmd + Q).
2. Open System Settings > Privacy & Security > Camera.
3. Toggle the switch for "Microsoft Teams" OFF, wait 5 seconds, and toggle it back ON.
4. If Teams is not listed, run in Terminal: tccutil reset Camera com.microsoft.teams2
5. Re-open Teams and verify video preview in Settings > Devices.`,
};

export const TicketToKbDraft: React.FC = () => {
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
  } = useDiagnosticToolStorage<TicketToKbDraftValues>({
    toolId: TICKET_TO_KB_STORAGE_KEY,
    defaultValues: DEFAULT_TICKET_TO_KB_DRAFT,
  });

  useRegisterShortcut([
    {
      id: 'kb-generate',
      combo: 'mod+enter',
      label: 'Generate KB Article',
      description: 'Format ticket details into Knowledge Base article draft',
      category: 'KB Article Draft',
      allowInInput: true,
      overrideSystem: true,
      action: () => {
        saveDraftNow();
      },
    },
    {
      id: 'kb-save',
      combo: 'mod+s',
      label: 'Save KB Article Draft',
      description: 'Save current KB article fields to local storage',
      category: 'KB Article Draft',
      allowInInput: true,
      overrideSystem: true,
      action: () => {
        saveDraftNow();
      },
    },
  ]);

  const [copied, setCopied] = useState(false);

  const kbArticle = `# Knowledge Base Article: ${values.kbTitle}
**Audience:** ${values.targetAudience}  
**Environment / Affected Systems:** ${values.environment}

---
### Issue Symptoms:
${values.symptoms}

---
### Underlying Cause:
${values.rootCause}

---
### Step-by-Step Resolution:
${values.resolutionSteps}

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'Ticket to Knowledge Base Draft' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="Ticket to Knowledge Base Draft"
            text="Transform resolved IT tickets into searchable knowledge base articles and SOPs."
          />
        </div>

        <header className="page-header">
          <h1 className="page-title">Ticket to Knowledge Base Draft</h1>
          <p className="page-lead">
            Convert one-off IT resolutions into reusable, searchable self-service articles and standard operating procedures.
          </p>
        </header>

        {/* Local Storage & Offline Persistence Toolbar */}
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
          toolName="Knowledge Base Draft"
        />

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Knowledge Base Attributes</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="kbTitle">Article Title</label>
                <input
                  id="kbTitle"
                  type="text"
                  value={values.kbTitle}
                  onChange={e => updateField('kbTitle', e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="targetAudience">Target Audience</label>
                <input
                  id="targetAudience"
                  type="text"
                  value={values.targetAudience}
                  onChange={e => updateField('targetAudience', e.target.value)}
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="environment">Environment / Supported Platforms</label>
              <input
                id="environment"
                type="text"
                value={values.environment}
                onChange={e => updateField('environment', e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="symptoms">Symptoms & Error Messages</label>
              <textarea
                id="symptoms"
                rows={2}
                value={values.symptoms}
                onChange={e => updateField('symptoms', e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="rootCause">Root Cause Summary</label>
              <textarea
                id="rootCause"
                rows={2}
                value={values.rootCause}
                onChange={e => updateField('rootCause', e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="resolutionSteps">Step-by-Step Resolution Steps</label>
              <textarea
                id="resolutionSteps"
                rows={5}
                value={values.resolutionSteps}
                onChange={e => updateField('resolutionSteps', e.target.value)}
              />
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Generated Knowledge Base Article</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <PdfExportButton documentTitle={values.kbTitle ? `${values.kbTitle} - KB Article` : 'KB-Article'} variant="secondary" size="sm" />
                <CopyButton text={kbArticle} label="Copy Markdown" variant="primary" />
              </div>
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
