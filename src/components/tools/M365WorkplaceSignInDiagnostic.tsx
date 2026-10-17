import React, { useState } from 'react';

interface M365Scenario {
  id: string;
  name: string;
  description: string;
  likelyRootCauses: string[];
  diagnosticChecks: string[];
  remediationSteps: string[];
}

const M365_SCENARIOS: M365Scenario[] = [
  {
    id: 'mfa-loop',
    name: 'MFA Notification Loop / Number Matching Failure',
    description: 'User enters credentials, but Microsoft Authenticator app notification never arrives or number matching prompt loops continuously.',
    likelyRootCauses: [
      'Battery optimization or background app refresh killed Authenticator push token on mobile device.',
      'Device clock out of sync (>5 minutes drift breaks TOTP and OAuth timestamp validation).',
      'Stale OAuth broker registration or multiple work accounts conflicting in Microsoft Authenticator.'
    ],
    diagnosticChecks: [
      'Have user open Microsoft Authenticator actively on mobile before triggering sign-in.',
      'Check if user can use alternative verification (SMS/Voice or TOTP 6-digit rolling code).',
      'Verify mobile device system time against time.windows.com or time.google.com.',
      'Review Entra ID Sign-In logs for Failure Code 50074 (Strong Authentication Required).'
    ],
    remediationSteps: [
      'Toggle device Airplane mode for 10 seconds or reboot mobile device.',
      'In Authenticator: Settings > Turn off Battery Optimization, verify Notifications are Allowed.',
      'If push notification remains broken, use the 6-digit one-time code generated inside Authenticator.',
      'If permanent token corruption exists, request an IT Service Desk MFA temporary access pass (TAP) to re-register.'
    ]
  },
  {
    id: 'conditional-access',
    name: 'Conditional Access Device Compliance Block',
    description: 'Error: "You cannot access this right now" or Error Code 53000 / 53003 (Device does not meet organization compliance requirements).',
    likelyRootCauses: [
      'Device is not Intune / Jamf enrolled or compliance check is pending evaluated policies.',
      'OS version, bitlocker/filevault, or endpoint antivirus definitions are out of date.',
      'Corporate VPN required by named location policy is disconnected.'
    ],
    diagnosticChecks: [
      'Check Company Portal app / Jamf Self Service for device compliance status.',
      'Verify if the user is connecting from an approved corporate IP or trusted egress proxy.',
      'Inspect Entra ID Sign-in log: Filter by Correlation ID / Error 53003 to identify the exact blocking policy.'
    ],
    remediationSteps: [
      'Open Company Portal / MDM Agent, run "Check Access / Check Compliance".',
      'Install required OS security updates and verify disk encryption is 100% active.',
      'Connect to authorized enterprise VPN if remote before accessing protected tenant resources.'
    ]
  },
  {
    id: 'prt-token',
    name: 'Windows PRT (Primary Refresh Token) Stale / Corrupt',
    description: 'Outlook, Teams, and OneDrive show yellow warning triangle: "Need password" or "We need to fix your account" (AADSTS50005).',
    likelyRootCauses: [
      'Password changed on another device or domain controller while local machine had stale cached credentials.',
      'Web Account Manager (WAM) token cache corrupted in %LOCALAPPDATA%\\Packages\\Microsoft.AAD.BrokerPlugin.',
      'Hybrid Azure AD Join Workplace Join certificate expired or broken secure channel.'
    ],
    diagnosticChecks: [
      'Open Command Prompt as user, run: dsregcmd /status and verify AzureAdJoined: YES and AzureAdPrt: YES.',
      'Check Windows Settings > Accounts > Access work or school to see if account is connected.',
      'Verify if web sign-in at https://portal.office.com works in an InPrivate browser window.'
    ],
    remediationSteps: [
      'Lock and unlock Windows (Win + L) to trigger Kerberos / PRT token renewal.',
      'Disconnect and reconnect work account in Windows Settings > Accounts > Access work or school.',
      'Clear identity broker cache or run Microsoft Support and Recovery Assistant (SaRA).',
      'Run command prompt as administrator: dsregcmd /debug /leave followed by re-join if PRT is corrupted.'
    ]
  },
  {
    id: 'macos-office-keychain',
    name: 'macOS Office 365 Keychain Lock / SSO Loop',
    description: 'Teams or Outlook for Mac repeatedly prompts for password despite entering correct credentials.',
    likelyRootCauses: [
      'Stale Microsoft Office tokens stored in macOS Keychain Access (Microsoft Office Identities Cache).',
      'Company Portal / Jamf Enterprise SSO plug-in credential mismatch.'
    ],
    diagnosticChecks: [
      'Check if Office web apps function in Safari/Chrome.',
      'Inspect Keychain Access for duplicate "Microsoft Office Identities Cache" entries.',
      'Verify Company Portal app is installed and device compliance is validated.'
    ],
    remediationSteps: [
      'Quit all Microsoft apps (Outlook, Teams, Word, Excel).',
      'Open Keychain Access > search "Microsoft Office" and remove cached credential entries.',
      'Restart the Mac and re-launch Outlook to trigger a fresh Modern Authentication prompt.'
    ]
  }
];

export const M365WorkplaceSignInDiagnostic: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('mfa-loop');
  const [clientPlatform, setClientPlatform] = useState<string>('Windows 11 Enterprise');
  const [ticketRef, setTicketRef] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const scenario = M365_SCENARIOS.find((s) => s.id === selectedScenarioId) || M365_SCENARIOS[0];

  const generateTicketNote = () => {
    return [
      `[Triage Note: Microsoft 365 & Workplace Authentication]`,
      `Platform: ${clientPlatform}${ticketRef ? ` | Ref: ${ticketRef}` : ''}`,
      `Scenario: ${scenario.name}`,
      ``,
      `Reported Symptom:`,
      scenario.description,
      ``,
      `Diagnostic Verification Performed:`,
      ...scenario.diagnosticChecks.map((check) => `- [x] ${check}`),
      ``,
      `Recommended Resolution Sequence:`,
      ...scenario.remediationSteps.map((step, i) => `${i + 1}. ${step}`),
      ``,
      `Escalation Boundary:`,
      `If unresolved after these steps, capture Correlation ID, Timestamp (UTC), and User Principal Name (UPN) for Entra ID admin review.`
    ].join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTicketNote());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="tool-workspace" style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '2rem' }}>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="m365-scenario-select" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Select Sign-In Failure Symptom:
            </label>
            <select
              id="m365-scenario-select"
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            >
              {M365_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="m365-platform-select" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Client Platform:
            </label>
            <select
              id="m365-platform-select"
              value={clientPlatform}
              onChange={(e) => setClientPlatform(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            >
              <option value="Windows 11 Enterprise">Windows 11 Enterprise</option>
              <option value="Windows 10 Enterprise">Windows 10 Enterprise</option>
              <option value="macOS (Sonoma / Sequoia)">macOS (Sonoma / Sequoia)</option>
              <option value="iOS / iPadOS">iOS / iPadOS</option>
              <option value="Android Enterprise">Android Enterprise</option>
            </select>
          </div>

          <div>
            <label htmlFor="m365-ticket-ref" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Sanitized Case / Ticket Ref (Optional):
            </label>
            <input
              id="m365-ticket-ref"
              type="text"
              placeholder="e.g. INC-M365-108"
              value={ticketRef}
              onChange={(e) => setTicketRef(e.target.value)}
              maxLength={40}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            />
          </div>
        </div>

        {/* Diagnosis & Remediation Breakdown */}
        <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Symptom &amp; Likely Root Causes</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {scenario.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.92rem', color: 'var(--accent)' }}>
                🔍 Key Diagnostic Checks:
              </h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
                {scenario.diagnosticChecks.map((item, i) => (
                  <li key={i} style={{ marginBottom: '0.35rem' }}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.92rem', color: 'var(--accent)' }}>
                ⚡ Structured Remediation Steps:
              </h4>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.88rem', lineHeight: 1.5 }}>
                {scenario.remediationSteps.map((item, i) => (
                  <li key={i} style={{ marginBottom: '0.35rem' }}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Formatted Ticket Note */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label htmlFor="m365-generated-output" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Generated Service Desk / Escalation Note:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="button"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Note'}
            </button>
          </div>
          <textarea
            id="m365-generated-output"
            readOnly
            rows={8}
            value={generateTicketNote()}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--line)', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f9fafb' }}
          />
        </div>
      </form>
    </div>
  );
};
