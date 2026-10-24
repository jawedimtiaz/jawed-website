import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ServicesDispatchPage: React.FC = () => {
  // Dispatch Estimator State
  const [serviceType, setServiceType] = useState('hardware');
  const [urgency, setUrgency] = useState('standard');
  const [locationType, setLocationType] = useState('office');

  // Ticket Lookup State
  const [dispatchIdInput, setDispatchIdInput] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  // Booking Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [company, setCompany] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Calculate estimated SLA and tier
  const calculateEstimate = () => {
    let baseSla = '24-48 Hours';
    let priority = 'Standard Dispatch';
    let team = 'Tier 1 / Tier 2 Field Tech';

    if (urgency === 'critical') {
      baseSla = '4-8 Hours (Priority Field Dispatch)';
      priority = 'P1 Emergency Dispatch';
      team = 'Senior Field Engineer';
    } else if (urgency === 'same-day') {
      baseSla = '12 Hours';
      priority = 'P2 High Priority';
      team = 'Workplace Systems Engineer';
    }

    return { baseSla, priority, team };
  };

  const estimate = calculateEstimate();

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchIdInput.trim()) return;

    const id = dispatchIdInput.trim().toUpperCase();
    if (id.startsWith('DSP-') || id.startsWith('INC-')) {
      setSearchResult({
        id,
        status: 'Technician Assigned',
        engineer: 'Jawed Imtiaz',
        eta: 'Today, 2:30 PM IST',
        location: 'Vizag COE / On-Site Branch',
        notes: 'Pre-dispatch diagnostic completed. Replacement Cisco Meraki AP and Jamf enrolment profile prepared.',
      });
    } else {
      setSearchResult({
        id,
        status: 'Active Request In Queue',
        engineer: 'Unassigned (Awaiting SLA Confirmation)',
        eta: 'Within 24 Hours',
        location: 'Remote Dispatch Triage',
        notes: 'Dispatch request logged in queue. Dispatch manager reviewing location coverage.',
      });
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);
  };

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Services &amp; Dispatch</span>
      </nav>

      <p className="eyebrow">Workplace Support &amp; Field Engineering</p>
      <h1>Services &amp; IT Field Dispatch</h1>
      <p className="lead">
        On-site technical field support, endpoint lifecycle management, network infrastructure triage, and emergency IT dispatch services.
      </p>

      {/* Service Offerings */}
      <section className="content-section">
        <h2>Field Support Capabilities</h2>
        <div className="card-grid">
          <article className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3>On-Site Hardware Swap &amp; Triage</h3>
            <p>Hot-swap core switches, replace faulty laptop motherboards, install RAM/NVMe upgrades, and perform thermal/power checks.</p>
            <span className="badge">On-Site Dispatch</span>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--teal)' }}>
            <h3>Apple macOS &amp; Jamf Deployment</h3>
            <p>Zero-touch deployment via Apple Business Manager &amp; Jamf Pro, FileVault escrow, and macOS Sonoma/Sequoia first-response troubleshooting.</p>
            <span className="badge">Apple &amp; MDM</span>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--indigo)' }}>
            <h3>Network Drop &amp; Wi-Fi Optimization</h3>
            <p>Layer-by-layer network diagnostics, Meraki AP replacement, VLAN port tagging, and enterprise Wi-Fi signal site surveys.</p>
            <span className="badge">Networking</span>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
            <h3>VIP &amp; Executive Tech Support</h3>
            <p>Dedicated white-glove technology support for executives, boardrooms, C-suite mobility, and critical presentation readiness.</p>
            <span className="badge">VIP Support</span>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--emerald)' }}>
            <h3>Microsoft 365 &amp; Entra ID SSO</h3>
            <p>Conditional Access policy troubleshooting, MFA reset, Exchange Online migration, and identity token remediation.</p>
            <span className="badge">Identity &amp; Cloud</span>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--rose)' }}>
            <h3>IT Asset Recovery &amp; Provisioning</h3>
            <p>Secure device wipe (DoD 5220.22-M), asset tagging, inventory audit in ServiceNow/Jira, and standardized employee handoffs.</p>
            <span className="badge">Asset Lifecycle</span>
          </article>
        </div>
      </section>

      {/* Dispatch SLA Estimator */}
      <section className="content-section">
        <h2>Dispatch Response &amp; SLA Estimator</h2>
        <div className="workspace">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Configure Service Requirements</h3>
            <div className="field-grid">
              <div className="field-group">
                <label>Service Category</label>
                <select value={serviceType} onChange={e => setServiceType(e.target.value)}>
                  <option value="hardware">Hardware Triage &amp; Replacement</option>
                  <option value="network">Network / Wi-Fi Access Point Swap</option>
                  <option value="apple">Apple macOS / Jamf Deployment</option>
                  <option value="vip">Executive VIP On-Site Support</option>
                </select>
              </div>

              <div className="field-group">
                <label>Target SLA Urgency</label>
                <select value={urgency} onChange={e => setUrgency(e.target.value)}>
                  <option value="standard">Standard Business Hours (24-48 Hrs)</option>
                  <option value="same-day">Same-Day Priority (12 Hrs)</option>
                  <option value="critical">Critical Production Work Stoppage (4-8 Hrs)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Site Location Type</label>
                <select value={locationType} onChange={e => setLocationType(e.target.value)}>
                  <option value="office">Corporate Headquarters / Office Branch</option>
                  <option value="data-center">Data Center / Network Closet</option>
                  <option value="remote">Remote Employee Residence</option>
                </select>
              </div>
            </div>

            <div className="calc-summary" style={{ marginTop: '20px' }}>
              <div className="summary-item">
                <span>Estimated SLA Window</span>
                <span style={{ color: 'var(--accent)' }}>{estimate.baseSla}</span>
              </div>
              <div className="summary-item">
                <span>Dispatch Priority Tier</span>
                <span style={{ color: 'var(--teal)' }}>{estimate.priority}</span>
              </div>
              <div className="summary-item">
                <span>Assigned Technical Lead</span>
                <span style={{ color: 'var(--text-heading)' }}>{estimate.team}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticket / Dispatch Status Tracker */}
      <section className="content-section">
        <h2>Live Dispatch / Ticket Status Lookup</h2>
        <div className="panel">
          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="discovery-input"
              style={{ flex: 1, minWidth: '260px' }}
              placeholder="Enter Dispatch Ticket ID (e.g., DSP-8402 or INC-1029)"
              value={dispatchIdInput}
              onChange={e => setDispatchIdInput(e.target.value)}
            />
            <button className="button button-primary" type="submit">
              Check Status
            </button>
          </form>

          {searchResult && (
            <div className="result-box" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>Dispatch Record: {searchResult.id}</strong>
                <span className="badge" style={{ color: 'var(--emerald)' }}>{searchResult.status}</span>
              </div>
              <p style={{ margin: '4px 0' }}><strong>Assigned Lead:</strong> {searchResult.engineer}</p>
              <p style={{ margin: '4px 0' }}><strong>Target Arrival ETA:</strong> {searchResult.eta}</p>
              <p style={{ margin: '4px 0' }}><strong>Site Location:</strong> {searchResult.location}</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--muted-light)', background: 'var(--bg-darker)', padding: '10px', borderRadius: '8px' }}>
                <strong>Dispatch Note:</strong> {searchResult.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Booking & Inquiry Form */}
      <section className="content-section">
        <h2>Request IT Dispatch or Business Inquiry</h2>
        {bookingSuccess ? (
          <div className="card" style={{ borderLeft: '4px solid var(--emerald)', padding: '24px' }}>
            <h3 style={{ color: 'var(--emerald)', margin: 0 }}>✓ Dispatch Request Received!</h3>
            <p style={{ marginTop: '8px' }}>
              Thank you, {contactName}. Your dispatch ticket request has been logged. An email confirmation has been dispatched to <strong>{contactEmail}</strong>, and our IT field engineer will contact you within the specified SLA window.
            </p>
            <button className="button button-secondary" type="button" onClick={() => setBookingSuccess(false)}>
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleBookingSubmit}>
            <div className="field-grid">
              <div className="form-field">
                <label>Contact Name *</label>
                <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="form-field">
                <label>Business Email *</label>
                <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
            </div>

            <div className="field-grid">
              <div className="form-field">
                <label>Company / Organization</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Enterprise" />
              </div>
              <div className="form-field">
                <label>Site Location Address *</label>
                <input type="text" required value={siteLocation} onChange={e => setSiteLocation(e.target.value)} placeholder="Vizag COE / Branch Office" />
              </div>
            </div>

            <div className="form-field">
              <label>Issue Description &amp; Scope *</label>
              <textarea rows={5} required value={issueSummary} onChange={e => setIssueSummary(e.target.value)} placeholder="Describe the technical issue, hardware affected, user impact, and site access requirements..." />
            </div>

            <button className="button button-primary" type="submit">
              Submit Field Dispatch Request →
            </button>
          </form>
        )}
      </section>
    </main>
  );
};
