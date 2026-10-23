import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { FieldGuideDetailPage } from './FieldGuideDetailPage';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { SeoHead } from '../components/SeoHead';
import { calculateReadTime } from '../utils/readTimeHelper';

// Visual Guide Interactive Components
import {
  WorkflowDiagram,
  InteractiveChecklist,
  CalloutBlock,
  DoAndDontCard,
  CopyableCliBlock,
  PowerEdgeProLiantLedMatrix,
  ColorCodedRJ45Pinout,
  InteractiveServerRackElevation
} from '../components/guides';

/**
 * Automated Mapping Object: NOTE_VISUAL_MODULES
 * Maps note slugs to rich interactive components (Checklists, Do's & Don'ts Cards,
 * Callout Blocks, Diagrams, and Matrices) to enrich the guide rendering pipeline.
 */
const NOTE_VISUAL_MODULES: Record<string, React.ReactNode> = {
  'apple-device-management-enrollment-models': (
    <div style={{ marginTop: '28px' }}>
      <CalloutBlock type="info" title="Apple Platform Supervision Policy">
        Automated Device Enrollment (ADE) automatically applies mandatory MDM supervision and escrows FileVault recovery keys to your organizational key vault during initial out-of-box setup.
      </CalloutBlock>

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
              'Apple Business Manager (ABM) token synced to Jamf Pro / Intune.',
              'Mandatory supervision profile enforced during unboxing.',
              'FileVault 2 key escrowed to enterprise key vault.'
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

      <DoAndDontCard
        title="Apple Deployment Model Strategy"
        dos={{
          title: 'Supervised Corporate Endpoints',
          points: [
            'Use ADE for all company-owned Mac and iOS hardware.',
            'Escrow FileVault recovery keys immediately upon setup.',
            'Require Managed Apple IDs for corporate app deployment.'
          ]
        }}
        donts={{
          title: 'Unmanaged & Rogue Setups',
          points: [
            'Never allow unmanaged personal Apple IDs as primary device account.',
            'Avoid manual profile downloads without MDM server anchor.',
            'Do not bypass Activation Lock without ABM ownership records.'
          ]
        }}
      />
    </div>
  ),

  'apple-macos-first-response-checklist': (
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
  ),

  'windows-first-response-troubleshooting-checklist': (
    <div style={{ marginTop: '28px' }}>
      <CalloutBlock type="warning" title="BitLocker Security Notice">
        Always verify BitLocker recovery key status in Entra ID / Active Directory before running DISM/SFC system repairs or modifying system boot configurations.
      </CalloutBlock>

      <DoAndDontCard
        title="Windows Triage Best Practices"
        dos={{
          title: 'Structured Diagnostics',
          points: [
            'Run `sfc /scannow` and `DISM /Online /Cleanup-Image /RestoreHealth` for OS corruption.',
            'Verify line of sight to Domain Controller / Entra ID for auth failures.',
            'Check Event Viewer System and Application logs before rebooting.'
          ]
        }}
        donts={{
          title: 'Destructive Shortcuts',
          points: [
            'Never blindly re-image a workstation before backing up local profile data.',
            'Do not disable Windows Defender / Firewall as a permanent workaround.',
            'Avoid force-killing Windows Update services during active database commits.'
          ]
        }}
      />

      <InteractiveChecklist
        id="windows_triage_checklist"
        title="Windows First-Response Diagnostic Checklist"
        subtitle="Standardized procedure for Windows workstation triage."
        items={[
          {
            id: 'win_1',
            label: 'Verify OS Version, Build & Pending Reboot Status',
            description: 'Run `winver` and check if a pending Windows Update restart is blocking services.',
            critical: true
          },
          {
            id: 'win_2',
            label: 'Run System File Integrity Checks',
            description: 'Execute `sfc /scannow` in an elevated PowerShell prompt.',
            critical: true
          },
          {
            id: 'win_3',
            label: 'Validate Network Adapter & DNS Resolution',
            description: 'Execute `ipconfig /flushdns` and test resolution with `nslookup`.',
            critical: false
          },
          {
            id: 'win_4',
            label: 'Check Intune / Group Policy Sync Health',
            description: 'Run `gpupdate /force` or sync device from Settings -> Accounts -> Access work or school.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'microsoft-sign-in-troubleshooting-guide': (
    <div style={{ marginTop: '28px' }}>
      <CalloutBlock type="spec" title="Entra ID Conditional Access Rules">
        Conditional Access policies evaluate sign-in attempts in real time based on user location, device compliance status, and application risk score.
      </CalloutBlock>

      <DoAndDontCard
        title="Microsoft 365 Authentication Triage"
        dos={{
          title: 'Targeted Remediation',
          points: [
            'Check Entra ID Sign-in logs for exact error status code (e.g. 50126, 53003).',
            'Verify Microsoft Authenticator push notification settings and device clock sync.',
            'Test sign-in using an InPrivate / Incognito browser window to bypass stale tokens.'
          ]
        }}
        donts={{
          title: 'Risky Workarounds',
          points: [
            'Never grant Permanent MFA exemptions without CISO approval.',
            'Do not clear user credentials in Credential Manager without backing up Outlook profiles.',
            'Avoid disabling Conditional Access rules for individual troubleshooting tickets.'
          ]
        }}
      />

      <InteractiveChecklist
        id="m365_signin_checklist"
        title="Microsoft Sign-In & MFA Resolution Checklist"
        subtitle="Step-by-step resolution path for Entra ID sign-in failures."
        items={[
          {
            id: 'm365_1',
            label: 'Query Entra ID Sign-In Diagnostic Logs',
            description: 'Identify exact Conditional Access policy blocking the user request.',
            critical: true
          },
          {
            id: 'm365_2',
            label: 'Verify Device Compliance in Intune Portal',
            description: 'Confirm hardware state is marked Compliant in Endpoint Manager.',
            critical: true
          },
          {
            id: 'm365_3',
            label: 'Reset Stale Windows Credential Cache',
            description: 'Clear cached OAuth tokens in Credential Manager -> Windows Credentials.',
            critical: false
          },
          {
            id: 'm365_4',
            label: 'Re-register Authenticator App MFA Method',
            description: 'Trigger Temporary Access Pass (TAP) if hardware token is lost.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'service-desk-ticket-documentation': (
    <div style={{ marginTop: '28px' }}>
      <DoAndDontCard
        title="Ticket Quality Standards"
        dos={{
          title: 'Structured Handoff Notes',
          points: [
            'Record exact error text, step-by-step repro, and verified fix.',
            'Sanitize log attachments to remove PII, tokens, and plain-text passwords.',
            'Tag correct Configuration Item (CI) and Root Cause Category.'
          ]
        }}
        donts={{
          title: 'Vague Documentation',
          points: [
            'Never close tickets with empty resolutions like "Fixed" or "User worked it out".',
            'Avoid pasting raw, unformatted log dumps without line references.',
            'Do not mix multiple unrelated user issues into a single support ticket.'
          ]
        }}
      />

      <InteractiveChecklist
        id="ticket_doc_checklist"
        title="Ticket Quality & Handoff Audit Checklist"
        subtitle="Verification steps before resolving or escalating a support ticket."
        items={[
          {
            id: 'td_1',
            label: 'Sanitize Ticket Attachments & Notes',
            description: 'Verify no passwords, API tokens, or user PII remain in public notes.',
            critical: true
          },
          {
            id: 'td_2',
            label: 'Document Diagnostic Steps & Observed Behavior',
            description: 'List hypothesis, command outputs, and validation steps clearly.',
            critical: true
          },
          {
            id: 'td_3',
            label: 'Confirm End-User Task Validation',
            description: 'Verify the end-user has successfully tested the fix before closing.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'it-service-desk-troubleshooting-workflow': (
    <div style={{ marginTop: '28px' }}>
      <WorkflowDiagram
        title="IT Service Desk Standard Incident Lifecycle"
        subtitle="Structured 5-stage framework for repeatable support operations."
        stages={[
          {
            step: 1,
            title: 'Triage & Categorization',
            badge: 'First Response',
            description: 'Capture exact user symptom, affected CI, and initial severity impact.',
            checklist: ['Identify user role & impact scope', 'Assign priority matrix level']
          },
          {
            step: 2,
            title: 'Scope Isolation',
            badge: 'Investigation',
            description: 'Differentiate single-user vs system-wide outage using known-good baseline.',
            checklist: ['Test alternate account', 'Verify network routing']
          },
          {
            step: 3,
            title: 'Remediation',
            badge: 'Action',
            description: 'Apply least disruptive documented fix according to standard operating procedures.',
            checklist: ['Execute vendor-approved SOP', 'Document changes in real-time']
          },
          {
            step: 4,
            title: 'Validation & Sign-Off',
            badge: 'Quality Control',
            description: 'Have user repeat original failing workflow to confirm complete recovery.',
            checklist: ['User functional sign-off', 'Close active monitoring']
          }
        ]}
      />

      <InteractiveChecklist
        id="incident_lifecycle_checklist"
        title="Incident Lifecycle Sign-Off Checklist"
        subtitle="Ensure complete operational compliance before ticket resolution."
        items={[
          {
            id: 'il_1',
            label: 'Scope & Baseline Confirmed',
            description: 'Verified whether issue was localized or enterprise-wide.',
            critical: true
          },
          {
            id: 'il_2',
            label: 'Remediation Executed & Recorded',
            description: 'All system changes and CLI commands logged in ticket timeline.',
            critical: true
          },
          {
            id: 'il_3',
            label: 'End-User Functional Sign-Off Obtained',
            description: 'User confirmed normal workflow operation in production environment.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'ai-for-it-support-practical-workflow': (
    <div style={{ marginTop: '28px' }}>
      <CalloutBlock type="warning" title="Data Privacy & Sanitization Mandate">
        Never paste plain-text passwords, session tokens, user PII, or confidential network topologies into external AI models.
      </CalloutBlock>

      <DoAndDontCard
        title="AI Assistance Boundaries"
        dos={{
          title: 'Safe AI Support Uses',
          points: [
            'Use AI to format rough diagnostic notes into concise ticket summaries.',
            'Generate test hypotheses for unfamiliar CLI error codes.',
            'Draft knowledge base article outlines from sanitized command logs.'
          ]
        }}
        donts={{
          title: 'Unsafe AI Practices',
          points: [
            'Never treat unverified AI code snippets as production-ready without testing.',
            'Do not trust AI root cause assertions without local log confirmation.',
            'Avoid pasting confidential employee HR or financial data into AI prompts.'
          ]
        }}
      />
    </div>
  ),

  'small-it-automation-starting-point': (
    <div style={{ marginTop: '28px' }}>
      <DoAndDontCard
        title="IT Automation Safety Boundaries"
        dos={{
          title: 'Production Automation Rules',
          points: [
            'Start with read-only audit scripts before writing destructive automations.',
            'Incorporate explicit dry-run flags (`-WhatIf`) in PowerShell scripts.',
            'Log all script executions with timestamp and host execution metadata.'
          ]
        }}
        donts={{
          title: 'High-Risk Scripting Habits',
          points: [
            'Never hardcode domain admin credentials inside plain-text scripts.',
            'Avoid running untested batch scripts directly against domain controllers.',
            'Do not ignore error handling or suppress error output (`ErrorAction SilentlyContinue`).'
          ]
        }}
      />

      <InteractiveChecklist
        id="automation_safety_checklist"
        title="Automation Script Pre-Deployment Audit"
        subtitle="Mandatory checks before executing automated scripts in production."
        items={[
          {
            id: 'as_1',
            label: 'Credential Safety Audit',
            description: 'Verify no passwords or API tokens are hardcoded in script source.',
            critical: true
          },
          {
            id: 'as_2',
            label: 'Dry-Run Execution Test',
            description: 'Executed script with `-WhatIf` / dry-run parameter successfully.',
            critical: true
          },
          {
            id: 'as_3',
            label: 'Logging & Error Handling Verification',
            description: 'Confirm script logs errors to file and halts on fatal exceptions.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'server-rack-cable-management-best-practices': (
    <div style={{ marginTop: '28px' }}>
      <InteractiveServerRackElevation />

      <CalloutBlock type="warning" title="ANSI/TIA-606-D Safety & Separation Standard">
        Maintain a minimum 5-inch separation between high-voltage power cables (PDU lines) and Low-Voltage Cat6A UTP data runs to prevent electromagnetic interference (EMI) and power induction errors.
      </CalloutBlock>

      <DoAndDontCard
        title="Field Fastener Standard: Velcro vs Zip-Ties"
        dos={{
          title: 'Hook-and-Loop (Velcro) Straps',
          points: [
            'Allows cable expansion and heat dissipation.',
            'Reusable during patch panel re-grooming.',
            'Zero risk of crushing Cat6A internal spline.'
          ]
        }}
        donts={{
          title: 'Plastic Zip-Ties',
          points: [
            'Over-tightening causes micro-fractures in copper pairs.',
            'Sharp cut edges create cut hazards for technician hands.',
            'Must be destroyed and cut off for any cable move/add/change.'
          ]
        }}
      />

      <InteractiveChecklist
        id="rack_dressing_checklist"
        title="Server Rack Dressing & Airflow Audit Checklist"
        subtitle="Verification checklist for field technicians upon completing rack cable dressing."
        items={[
          {
            id: 'rack_1',
            label: 'Verify ToR Switch Patch Cable Lengths',
            description: 'Ensure 0.5m/1m patch cables are used for 1U ToR switch-to-patch panel drops without excess slack.',
            critical: true
          },
          {
            id: 'rack_2',
            label: 'Power (A/B) and Data Pathway Separation',
            description: 'Confirm left-side vertical manager handles PDU A/B feeds while right-side manager handles data.',
            critical: true
          },
          {
            id: 'rack_3',
            label: 'Blanking Panel Installation',
            description: 'Verify 100% blanking panel coverage across open U spaces to prevent hot air recirculation.',
            critical: false
          },
          {
            id: 'rack_4',
            label: 'TIA-606-D Cable Labeling Verification',
            description: 'Check machine-printed labels at both ends of every horizontal drop (Cabinet ID - Rack U - Port).',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'rj45-cabling-t568a-vs-t568b-guide': (
    <div style={{ marginTop: '28px' }}>
      <ColorCodedRJ45Pinout />

      <DoAndDontCard
        title="Cat6 Termination Field Standards"
        dos={{
          title: 'Recommended Termination Procedure',
          points: [
            'Maintain pair twist to within 0.5 inches (13mm) of RJ45 crimp plug.',
            'Use strain relief boots to protect locking tab from snagging.',
            'Verify wire sequence under clear plug body before applying ratcheted crimp pressure.'
          ]
        }}
        donts={{
          title: 'Termination Defects to Avoid',
          points: [
            'Do not untwist pairs beyond 0.5 inches (causes Near-End Crosstalk - NEXT).',
            'Avoid stripping cable outer jacket outside the RJ45 strain-relief wedge.',
            'Never mix T568A on one end and T568B on the other unless intentionally making a crossover cable.'
          ]
        }}
      />

      <InteractiveChecklist
        id="cabling_certification_checklist"
        title="Structured Cabling & Termination Checklist"
        subtitle="Field sign-off checklist for RJ45 termination and wiremap testing."
        items={[
          {
            id: 'cab_1',
            label: 'Wiremap & Continuity Verification',
            description: 'Verify all 8 pins pass 1-to-1 continuity test on Fluke / wiremapper tool.',
            critical: true
          },
          {
            id: 'cab_2',
            label: 'Jacket Retention Check',
            description: 'Ensure outer cable jacket is secured firmly under the RJ45 internal crimp wedge.',
            critical: true
          },
          {
            id: 'cab_3',
            label: 'Cat6 Certification Test (NEXT & Return Loss)',
            description: 'Confirm cable length meets 90m channel limits with certified headroom.',
            critical: false
          }
        ]}
      />
    </div>
  ),

  'diagnosing-network-port-flapping-cli-guide': (
    <div style={{ marginTop: '28px' }}>
      <CopyableCliBlock
        label="Cisco IOS / Aruba CX Port Flapping Triage Commands"
        command={`# Cisco IOS: Check interface flap counters & SFP optical power\nshow interface GigabitEthernet1/0/1 | include flaps|errors|crc\nshow interface GigabitEthernet1/0/1 transceiver detail\n\n# Aruba CX: Check interface status & error counters\nshow interface 1/1/1\nshow interface 1/1/1 extended-counters`}
        promptSymbol="Switch#"
      />

      <WorkflowDiagram
        title="Port Flapping Isolation Decision Tree"
        subtitle="Step-by-step diagnostic workflow for Layer 1, 2, and 3 port flapping triage."
        stages={[
          {
            step: 1,
            title: 'Physical Layer Check (L1)',
            badge: 'Layer 1',
            description: 'Inspect patch cable, SFP optical TX/RX levels, and physical seating.',
            checklist: ['Swap patch cable with certified Cat6', 'Check SFP optical RX dBm power']
          },
          {
            step: 2,
            title: 'Interface Errors & Duplex (L2)',
            badge: 'Layer 2',
            description: 'Check CRC errors, duplex mismatch, and auto-negotiation status.',
            checklist: ['Verify 1000/Full negotiation', 'Clear interface counters and observe']
          },
          {
            step: 3,
            title: 'Spanning Tree & Flap Damping (L3/OS)',
            badge: 'Layer 3 / STP',
            description: 'Check STP BPDU guard, link flap dampening timers, and SFP compatibility.',
            checklist: ['Check `show spanning-tree detail`', 'Verify dampening penalty threshold']
          }
        ]}
      />

      <InteractiveChecklist
        id="port_flapping_checklist"
        title="Port Flapping Resolution Checklist"
        subtitle="Field triage procedure for stabilizing unstable switch ports."
        items={[
          {
            id: 'pf_1',
            label: 'Swap Physical Patch Cable & Clean SFP Optics',
            description: 'Eliminate damaged copper pair or dirty fiber connector first.',
            critical: true
          },
          {
            id: 'pf_2',
            label: 'Verify Speed / Duplex Auto-Negotiation Alignment',
            description: 'Confirm both switch port and end device are set to Auto/Auto or hardcoded identically.',
            critical: true
          },
          {
            id: 'pf_3',
            label: 'Review Switch Error Counters & Clear Interface',
            description: 'Run `clear counters` and verify CRC/symbol errors stop increasing.',
            critical: true
          }
        ]}
      />
    </div>
  ),

  'poweredge-proliant-amber-led-indicator-cheatsheet': (
    <div style={{ marginTop: '28px' }}>
      <PowerEdgeProLiantLedMatrix />

      <CalloutBlock type="warning" title="Critical Flea Power Drain Safety Procedure">
        Before removing system memory, PCIe expansion cards, or system board components, disconnect all AC power cables and hold down the server power button for 15 seconds to drain remaining flea power.
      </CalloutBlock>

      <InteractiveChecklist
        id="server_post_recovery_checklist"
        title="Server POST & Hardware Diagnostic Recovery Checklist"
        subtitle="Systematic hardware recovery steps for amber diagnostic LED faults."
        items={[
          {
            id: 'srv_1',
            label: 'Inspect iDRAC / iLO System Event Log (SEL)',
            description: 'Log into out-of-band management IP to retrieve exact sensor log error code.',
            critical: true
          },
          {
            id: 'srv_2',
            label: 'Execute Flea Power Drain',
            description: 'Disconnect all power cords and hold power button for 15 seconds before opening chassis.',
            critical: true
          },
          {
            id: 'srv_3',
            label: 'Minimum to POST Component Reduction',
            description: 'Reseat CPU 1, DIMM A1, and single PSU to isolate faulty hardware component.',
            critical: true
          },
          {
            id: 'srv_4',
            label: 'Verify PSU Redundancy & Amber LED Status',
            description: 'Confirm both power supply LEDs show solid green before returning server to production cluster.',
            critical: false
          }
        ]}
      />
    </div>
  ),

  'apis-explained-for-it-support': (
    <div style={{ marginTop: '28px' }}>
      <CalloutBlock type="tip" title="HTTP Status Code Triage Rule">
        4xx codes indicate client-side issues (auth, bad format, permissions). 5xx codes indicate server-side failures (backend crash, service outage, database timeout).
      </CalloutBlock>

      <DoAndDontCard
        title="API Security & Troubleshooting"
        dos={{
          title: 'API Best Practices',
          points: [
            'Use OAuth Bearer tokens stored securely in environment variables.',
            'Verify API response headers for rate limit thresholds (`X-RateLimit-Remaining`).',
            'Sanitize JSON payloads before sending log dumps to support tickets.'
          ]
        }}
        donts={{
          title: 'API Security Pitfalls',
          points: [
            'Never pass API keys in URL query parameters where web servers log them.',
            'Avoid looping rapid API calls without exponential backoff retry logic.',
            'Do not ignore SSL/TLS certificate verification in curl or Python scripts.'
          ]
        }}
      />
    </div>
  )
};

/**
 * Helper function: extractGuideMetadata
 * Extracts 'title' and 'description' fields from markdown frontmatter (YAML block)
 * or falls back to note object metadata or HTML heading/lead elements.
 */
const extractGuideMetadata = (note: { title?: string; description?: string; content?: string }) => {
  let metaTitle = note.title || '';
  let metaDescription = note.description || '';

  if (note.content) {
    const rawContent = note.content;

    // 1. Check for YAML frontmatter block: --- title: "..." description: "..." ---
    const frontmatterMatch = rawContent.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/) ||
                             rawContent.match(/---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);

    if (frontmatterMatch) {
      const yamlBlock = frontmatterMatch[1];
      const titleMatch = yamlBlock.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m);
      const descMatch = yamlBlock.match(/^description:\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m);

      if (titleMatch) {
        const extractedTitle = (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim();
        if (extractedTitle) metaTitle = extractedTitle;
      }
      if (descMatch) {
        const extractedDesc = (descMatch[1] || descMatch[2] || descMatch[3] || '').trim();
        if (extractedDesc) metaDescription = extractedDesc;
      }
    }

    // 2. Fallback to <h1> / <p class="lead"> HTML elements if missing
    if (!metaTitle) {
      const h1Match = rawContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match?.[1]) {
        metaTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    if (!metaDescription) {
      const leadMatch = rawContent.match(/<p\s+class=["']lead["'][^>]*>(.*?)<\/p>/i);
      if (leadMatch?.[1]) {
        metaDescription = leadMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }
  }

  return {
    title: metaTitle,
    description: metaDescription
  };
};

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

  // Automatically extract meta title and description from markdown frontmatter or fallback fields
  const guideMetadata = extractGuideMetadata(note);

  // Dynamically update document.title and <meta name="description" /> in document head
  React.useEffect(() => {
    if (guideMetadata.title) {
      const fullTitle = guideMetadata.title.includes('Jawed Imtiaz')
        ? guideMetadata.title
        : `${guideMetadata.title} | Jawed Imtiaz`;
      document.title = fullTitle;
    }

    if (guideMetadata.description) {
      let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', guideMetadata.description);
    }
  }, [guideMetadata.title, guideMetadata.description]);

  // Strip frontmatter header block from HTML content prior to rendering
  const cleanHtmlContent = note.content ? note.content.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*/, '') : '';

  // Retrieve injected visual module from automated mapping object
  const visualModule = slug ? NOTE_VISUAL_MODULES[slug] : null;

  return (
    <main className="container page">
      {/* Dynamically set head tags (title, description, OpenGraph, Twitter cards, canonical link) */}
      <SeoHead
        title={guideMetadata.title}
        description={guideMetadata.description}
        canonicalUrl={shareUrl}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Guides', href: '/guides' },
            { label: guideMetadata.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title={guideMetadata.title}
          text={guideMetadata.description}
          url={shareUrl}
        />
      </div>

      {/* Note Metadata Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem' }}>
          {note.category || 'Quick Note'}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
          {calculateReadTime(cleanHtmlContent || note.description)}
        </span>
      </div>

      {/* Rendered Note Content */}
      <article className="quick-note-article card" style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <div
          className="note-rendered-content"
          dangerouslySetInnerHTML={{ __html: cleanHtmlContent }}
        />

        {/* Injected Automated Visual Modules */}
        {visualModule && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            {visualModule}
          </div>
        )}
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
          title={guideMetadata.title}
          text={guideMetadata.description}
          url={shareUrl}
        />
      </div>
    </main>
  );
};

