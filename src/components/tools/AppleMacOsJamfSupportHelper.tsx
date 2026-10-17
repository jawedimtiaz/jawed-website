import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface IssueOption {
  id: string;
  label: string;
  description: string;
  checks: string[];
  terminalCommands: string[];
  escalationNote: string;
}

const ISSUE_OPTIONS: IssueOption[] = [
  {
    id: 'app-crash',
    label: 'Application Crash / Gatekeeper Block',
    description: 'An approved enterprise app crashes on launch, displays "damaged application", or is blocked by Gatekeeper.',
    checks: [
      'Verify macOS version and chip architecture (Apple Silicon vs Intel rosetta2 requirement).',
      'Check system log for quarantine flags or Gatekeeper notarization rejections.',
      'Test launch from /Applications folder directly without third-party docks.',
      'Check if a required background helper or daemon is running under LaunchDaemons.'
    ],
    terminalCommands: [
      '# Inspect extended attributes & Gatekeeper quarantine\nxattr -l /Applications/<AppName>.app',
      '# Remove quarantine attribute (testing on managed device)\nsudo xattr -d com.apple.quarantine /Applications/<AppName>.app',
      '# Check code signature and notarization\ncodesign -dvvv --deep /Applications/<AppName>.app',
      '# Verify Rosetta 2 translation (for Apple Silicon Macs running Intel apps)\narch -x86_64 /Applications/<AppName>.app/Contents/MacOS/<Executable>'
    ],
    escalationNote: 'Document exact crash log from Console.app (Crash Reports), notarization status, and whether other machines on the same macOS build reproduce the failure.'
  },
  {
    id: 'jamf-enrollment',
    label: 'Jamf MDM Profile Missing or Expired',
    description: 'Device shows unmanaged in Jamf Pro, MDM communication timed out, or client configuration profiles are missing.',
    checks: [
      'Check System Settings > Privacy & Security > Profiles (or Profiles in System Preferences) for the MDM Enrollment profile.',
      'Verify network reachability to Jamf Pro server URL and APNs (Apple Push Notification service port 5223).',
      'Check Jamf binary status and communication logs in /var/log/jamf.log.',
      'Confirm the device serial number matches Apple Business Manager (ABM) assignment.'
    ],
    terminalCommands: [
      '# Check MDM profile status and installed profiles\nsudo profiles status -type enrollment\nsudo profiles list',
      '# Verify jamf binary version and check-in\nsudo jamf checkJSSConnection\nsudo jamf manage',
      '# Force policy update and recon inventory submission\nsudo jamf policy\nsudo jamf recon',
      '# Review recent Jamf operational logs\ntail -n 50 /var/log/jamf.log'
    ],
    escalationNote: 'Provide serial number, Jamf computer record ID, enrollment profile expiration date, and APNs connection reachability test results.'
  },
  {
    id: 'filevault-key',
    label: 'FileVault Encryption & Escrow Sync Issue',
    description: 'FileVault recovery key is not updating to Jamf Pro or user cannot unlock startup volume.',
    checks: [
      'Check whether FileVault is enabled, decrypting, or actively encrypting.',
      'Verify SecureToken / Bootstrap Token status for current local user account.',
      'Check whether institutional or individual recovery key is configured in Jamf configuration profile.',
      'Confirm disk volume is formatted as APFS Encrypted.'
    ],
    terminalCommands: [
      '# Check FileVault encryption status\nfdesetup status',
      '# List accounts authorized for FileVault\nfdesetup list',
      '# Verify Bootstrap Token status (macOS 11+)\nsudo profiles status -type bootstriptoken',
      '# Validate FileVault escrow payload with Jamf\nsudo jamf fvkey'
    ],
    escalationNote: 'Confirm if user has SecureToken. Never transmit unencrypted recovery keys over unapproved channels.'
  },
  {
    id: 'enterprise-wifi',
    label: 'Enterprise 802.1X Wi-Fi / Identity Certificate',
    description: 'Mac fails to connect to corporate Wi-Fi (802.1X EAP-TLS / PEAP) or certificate prompt loops.',
    checks: [
      'Check System Settings > Wi-Fi > Known Networks for corporate SSID profile.',
      'Inspect Keychain Access (System Keychain) for valid enterprise user or machine identity certificate.',
      'Verify intermediate and root CA certificate trust chains.',
      'Check if device time is synchronized with network NTP server (time drift breaks TLS).'
    ],
    terminalCommands: [
      '# Check Wi-Fi interface device name\nnetworksetup -listallhardwareports',
      '# Verify current Wi-Fi network and power status\nnetworksetup -getairportnetwork en0\nnetworksetup -getairportpower en0',
      '# Check system time synchronization (drift breaks Kerberos/802.1X)\nsudo sntp -sS time.apple.com',
      '# Test DNS resolution on the wireless interface\nscutil --dns'
    ],
    escalationNote: 'Capture Wi-Fi diagnostics packet capture or syslog entries for EAP-TLS negotiation failure and certificate expiration dates.'
  }
];

export const AppleMacOsJamfSupportHelper: React.FC = () => {
  const [selectedIssueId, setSelectedIssueId] = useState<string>('app-crash');
  const [macOSVersion, setMacOSVersion] = useState<string>('macOS 15 Sequoia');
  const [chipType, setChipType] = useState<string>('Apple Silicon (M-Series)');
  const [assetTag, setAssetTag] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const activeIssue = ISSUE_OPTIONS.find((opt) => opt.id === selectedIssueId) || ISSUE_OPTIONS[0];

  const generateTicketSummary = () => {
    return [
      `[Triage Note: Apple macOS & Jamf Support]`,
      `Device Context: ${chipType} | ${macOSVersion}${assetTag ? ` | Asset: ${assetTag}` : ''}`,
      `Selected Issue Category: ${activeIssue.label}`,
      ``,
      `Observed Symptom:`,
      activeIssue.description,
      ``,
      `Diagnostic Checks Completed:`,
      ...activeIssue.checks.map((c) => `- [x] ${c}`),
      ``,
      `Standard Terminal Diagnostics Run:`,
      activeIssue.terminalCommands.join('\n'),
      ``,
      `Escalation Guidance & Boundaries:`,
      activeIssue.escalationNote
    ].join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTicketSummary());
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
            <label htmlFor="jamf-issue-select" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Select macOS / Jamf Issue:
            </label>
            <select
              id="jamf-issue-select"
              value={selectedIssueId}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            >
              {ISSUE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="jamf-macos-version" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Target macOS Release:
            </label>
            <select
              id="jamf-macos-version"
              value={macOSVersion}
              onChange={(e) => setMacOSVersion(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            >
              <option value="macOS 15 Sequoia">macOS 15 Sequoia</option>
              <option value="macOS 14 Sonoma">macOS 14 Sonoma</option>
              <option value="macOS 13 Ventura">macOS 13 Ventura</option>
              <option value="macOS 12 Monterey">macOS 12 Monterey</option>
            </select>
          </div>

          <div>
            <label htmlFor="jamf-chip-type" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Architecture:
            </label>
            <select
              id="jamf-chip-type"
              value={chipType}
              onChange={(e) => setChipType(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            >
              <option value="Apple Silicon (M-Series)">Apple Silicon (M-Series)</option>
              <option value="Intel (x86_64)">Intel (x86_64)</option>
            </select>
          </div>

          <div>
            <label htmlFor="jamf-asset-tag" style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Sanitized Asset / Identifier (Optional):
            </label>
            <input
              id="jamf-asset-tag"
              type="text"
              placeholder="e.g. MAC-LAB-042"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              maxLength={40}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '0.92rem' }}
            />
          </div>
        </div>

        {/* Selected Diagnostic Checklist */}
        <div style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Recommended Diagnostic Sequence</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {activeIssue.description}
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem', lineHeight: 1.6, fontSize: '0.92rem' }}>
            {activeIssue.checks.map((check, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>{check}</li>
            ))}
          </ul>

          <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem', color: 'var(--accent)' }}>
            Safe Terminal Verification Commands
          </h4>
          <pre style={{ backgroundColor: '#1e293b', color: '#f8fafc', padding: '0.85rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.85rem', lineHeight: 1.5 }}>
            {activeIssue.terminalCommands.join('\n')}
          </pre>
        </div>

        {/* Generated Ticket Note */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label htmlFor="jamf-generated-output" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Generated Service Desk / Handoff Note:
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
            id="jamf-generated-output"
            readOnly
            rows={8}
            value={generateTicketSummary()}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--line)', fontFamily: 'monospace', fontSize: '0.88rem', backgroundColor: '#f9fafb' }}
          />
        </div>
      </form>
    </div>
  );
};
