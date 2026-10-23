import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { FieldGuideDetailPage } from './FieldGuideDetailPage';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

// Visual Guide Interactive Components
import { WorkflowDiagram } from '../components/guides/WorkflowDiagram';
import { InteractiveChecklist } from '../components/guides/InteractiveChecklist';
import { CalloutBlock } from '../components/guides/CalloutBlock';

export const NoteDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Check if slug belongs to a Field Guide first
  const fieldGuide = FIELD_GUIDES.find(g => g.slug === slug);
  if (fieldGuide) {
    return <FieldGuideDetailPage />;
  }

  // Otherwise check notesData
  const note = notesData.find(n => n.slug === slug);

  if (!note) {
    return <Navigate to="/guides" replace />;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/notes/${note.slug}`;

  // Custom visual module overlays for quick notes
  const renderNoteVisualModules = () => {
    switch (note.slug) {
      case 'apple-device-management-enrollment-models':
        return (
          <div style={{ marginTop: '28px' }}>
            <WorkflowDiagram
              title="Apple Device Management & Enrollment Stage Workflows"
              subtitle="Comparison of Automated Device Enrollment (ADE), Account-Driven Device Enrollment, and User Enrollment (BYOD)."
              stages={[
                {
                  step: 1,
                  title: 'Automated Device Enrollment (ADE)',
                  badge: 'Org-Owned / Supervised',
                  description: 'Zero-touch deployment during initial Setup Assistant. Device locks to MDM server automatically.',
                  checklist: [
                    'Apple Business Manager (ABM) token synced to Jamf Pro.',
                    'Mandatory supervision profile enforced during unboxing.',
                    'FileVault 2 key escrowed to Jamf key vault.'
                  ]
                },
                {
                  step: 2,
                  title: 'Account-Driven Device Enrollment',
                  badge: 'Org-Owned / Active',
                  description: 'User enters Managed Apple ID in System Settings -> Privacy & Security to enroll existing Macs.',
                  checklist: [
                    'System prompts for organizational Okta/Entra ID SSO.',
                    'MDM profile installed without wiping user data.',
                    'Full device management capabilities enabled.'
                  ]
                },
                {
                  step: 3,
                  title: 'Account-Driven User Enrollment',
                  badge: 'BYOD / Privacy First',
                  description: 'Designed for employee-owned personal Mac/iOS devices with strict data separation.',
                  checklist: [
                    'Creates separate APFS volume for corporate work data.',
                    'IT cannot wipe personal data or view personal apps.',
                    'Per-app VPN and managed identity applied.'
                  ]
                }
              ]}
            />
          </div>
        );

      case 'apple-macos-first-response-checklist':
        return (
          <div style={{ marginTop: '28px' }}>
            <CalloutBlock type="tip" title="macOS Support Pro-Tip">
              Always isolate scope first: check whether an issue follows the user account (test in a Guest account) or the hardware endpoint (test via Safe Mode boot: hold Shift or Power button on Apple Silicon).
            </CalloutBlock>

            <InteractiveChecklist
              id="macos_first_response_checklist"
              title="macOS First-Response Triage Checklist"
              subtitle="Step-by-step diagnostic checklist for macOS support technicians."
              items={[
                {
                  id: 'mac_1',
                  label: 'Capture Exact Error Message & System Logs',
                  description: 'Copy Console.app crash log or exact UI alert dialog text before closing app.',
                  critical: true
                },
                {
                  id: 'mac_2',
                  label: 'Verify System Storage & FileVault Status',
                  description: 'Ensure Mac has at least 15GB free storage space in System Settings -> General -> Storage.',
                  critical: true
                },
                {
                  id: 'mac_3',
                  label: 'Check Network Interface & Jamf MDM Agent Health',
                  description: 'Run `sudo jamf check` in Terminal to confirm management connection to server.',
                  critical: false
                },
                {
                  id: 'mac_4',
                  label: 'Test Issue in Safe Mode / Alternate User Profile',
                  description: 'Isolate whether third-party launch daemons or corrupt user preferences cause the crash.',
                  critical: true
                },
                {
                  id: 'mac_5',
                  label: 'Validate User Workflow After Remediation',
                  description: 'Have user re-authenticate and repeat original workflow task before closing ticket.',
                  critical: true
                }
              ]}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Guides', href: '/guides' },
            { label: note.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title={note.title}
          text={note.description}
          url={shareUrl}
        />
      </div>

      {/* Rendered Note Content */}
      <article className="quick-note-article card" style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <div
          className="note-rendered-content"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />

        {/* Visual Module Overlays */}
        {renderNoteVisualModules()}
      </article>

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to="/guides">
            ← Back to All Guides &amp; Notes
          </Link>
          <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
            Launch IT Troubleshooting Assistant →
          </Link>
        </div>
        <SocialShareBar
          title={note.title}
          text={note.description}
          url={shareUrl}
        />
      </div>
    </main>
  );
};
