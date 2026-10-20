import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ItTroubleshootingAssistant: React.FC = () => {
  const [category, setCategory] = useState('network');
  const [scope, setScope] = useState('single');
  const [urgency, setUrgency] = useState('medium');
  const [symptom, setSymptom] = useState('User cannot connect to company WiFi after updating OS. Other devices connect fine.');
  const [copied, setCopied] = useState(false);

  const getTriageFramework = () => {
    let steps: string[] = [];
    let diagnostics: string[] = [];
    let escalation: string = '';

    if (category === 'network') {
      steps = [
        'Physical / Adapter Check: Verify Wi-Fi toggle is ON, airplane mode is OFF, and SSID is broadcasting.',
        'IP Configuration: Inspect IP address (look for self-assigned 169.254.x.x APIPA). Run `ipconfig /renew` or toggle DHCP lease.',
        'DNS & Gateway Reachability: Ping default gateway, ping 8.8.8.8, and ping company intranet DNS hostname.',
        'Network Profile Reset: Forget known network profile and reconnect with fresh credentials / certificate.'
      ];
      diagnostics = [
        'Does the issue persist on an alternate network (e.g. mobile hotspot)?',
        'Are other users on the same access point or subnet reporting slowdowns?',
        'Was a system update, security policy, or VPN client installed recently?'
      ];
      escalation = 'Network Engineering / Infrastructure Team (Provide MAC address, AP name, and ping/traceroute logs).';
    } else if (category === 'identity') {
      steps = [
        'Service Health: Check Microsoft 365 / Google Workspace service health status page for active outages.',
        'Credential Verification: Test login in an InPrivate / Incognito browser window to rule out expired cache/tokens.',
        'MFA / Authenticator Audit: Confirm push notifications are reaching the registered authenticator device; verify device time sync.',
        'Account State: Check Entra ID / Google Admin console for locked status, sign-in risk flags, or conditional access policy blocks.'
      ];
      diagnostics = [
        'What exact error code or correlation ID is displayed?',
        'Does the user have an active compliance flag in Intune/MDM?',
        'Is the user attempting sign-in from an untrusted geolocation or foreign IP?'
      ];
      escalation = 'Identity & Access Management (IAM) Tier 2 / Security Operations.';
    } else if (category === 'apple') {
      steps = [
        'Keychain / Token Flush: Check for conflicting expired login certificates or enterprise keychain items.',
        'MDM Profile Check: Verify profile status in System Settings > Privacy & Security > Profiles.',
        'Safe Boot Test: Restart while holding Shift (Intel) or power button (Apple Silicon) to test safe mode.',
        'Console Log Triage: Run `log show --predicate "process == \'WiFiAgent\'" --last 10m` for subsystem errors.'
      ];
      diagnostics = [
        'Is FileVault encryption healthy and synced with recovery escrow?',
        'Has macOS Sonoma / Sequoia introduced local network permission prompts?'
      ];
      escalation = 'Apple Device Management (JAMF / Intune MacOS Team).';
    } else {
      steps = [
        'Baseline Reboot: Perform a clean restart and check pending Windows updates / driver rollbacks.',
        'System File Check: Run `sfc /scannow` and `dism /online /cleanup-image /restorehealth` in elevated CMD.',
        'Event Viewer Review: Filter System & Application logs for Event ID 1000, 1001, or 7000.',
        'Hardware Diagnostics: Run built-in vendor diagnostic tool (Dell SupportAssist, Lenovo Vantage, HP Hardware Diagnostics).'
      ];
      diagnostics = [
        'Is disk storage running below 10% capacity?',
        'Are thermal or battery wear indicators degrading performance?'
      ];
      escalation = 'Desktop Engineering / OEM Warranty Hardware Support.';
    }

    return { steps, diagnostics, escalation };
  };

  const triage = getTriageFramework();

  const fullReport = `### IT Incident Triage Sheet
Category: ${category.toUpperCase()} | Scope: ${scope.toUpperCase()} | Priority: ${urgency.toUpperCase()}
Reported Symptom: ${symptom}

### 1. Initial Diagnostic Checks:
${triage.diagnostics.map((d, i) => `${i + 1}. [ ] ${d}`).join('\n')}

### 2. Systematic Troubleshooting Steps:
${triage.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 3. Escalation Pathway:
${triage.escalation}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(fullReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/tools">Tools</Link> &gt; <span>IT Troubleshooting Assistant</span>
        </nav>

        <header className="page-header">
          <h1 className="page-title">IT Troubleshooting Assistant</h1>
          <p className="page-lead">
            Structured diagnostic flows, isolation checklists, and escalation guidelines based on real-world IT service desk workflows.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Issue Parameters</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="network">Network & Connectivity (WiFi, VPN, DNS)</option>
                  <option value="identity">Identity, M365 & Single Sign-On</option>
                  <option value="apple">Apple macOS / Jamf Management</option>
                  <option value="windows">Windows OS / PC Hardware</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="scope">Scope</label>
                <select
                  id="scope"
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                >
                  <option value="single">Single User / Isolated Device</option>
                  <option value="team">Team / Department</option>
                  <option value="organization">Organization-wide / Critical Service</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="urgency">Urgency / Impact</label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                >
                  <option value="low">Low - General inquiry or workaround available</option>
                  <option value="medium">Medium - Productivity impaired</option>
                  <option value="high">High - Total work stoppage</option>
                </select>
              </div>
            </div>

            <div className="field-group" style={{ marginTop: '14px' }}>
              <label htmlFor="symptom">Symptom Description</label>
              <textarea
                id="symptom"
                rows={3}
                value={symptom}
                onChange={e => setSymptom(e.target.value)}
                placeholder="Describe exact symptoms, error messages, recent changes..."
              />
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Diagnostic Checklist & Triage Plan</h2>
              <button className="button button-primary" type="button" onClick={handleCopy}>
                {copied ? 'Copied to Clipboard!' : 'Copy Triage Sheet'}
              </button>
            </div>

            <pre className="tool-output">
              {fullReport}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
