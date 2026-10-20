import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const CookiePolicyPage: React.FC = () => {
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [adConsent, setAdConsent] = useState(true);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const storedAnalytics = localStorage.getItem('cookie_analytics_consent');
    const storedAd = localStorage.getItem('cookie_ad_consent');
    if (storedAnalytics !== null) setAnalyticsConsent(storedAnalytics === 'true');
    if (storedAd !== null) setAdConsent(storedAd === 'true');
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('cookie_analytics_consent', String(analyticsConsent));
    localStorage.setItem('cookie_ad_consent', String(adConsent));
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <main className="container narrow page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Cookie Policy</span>
      </nav>

      <p className="eyebrow">Legal &amp; Compliance</p>
      <h1>Cookie Policy &amp; Preferences</h1>
      <p className="meta" style={{ color: 'var(--muted)', marginBottom: '24px' }}>
        Effective Date: October 20, 2026
      </p>

      <section className="content-section">
        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files stored on your computer or mobile device when you visit a website. They help the site remember your actions and preferences over time, enhance navigation, and enable relevant advertising.
        </p>
      </section>

      <section className="content-section">
        <h2>2. Cookie Categories Used on Jawed.co.in</h2>
        
        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--emerald)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--emerald)' }}>Essential / Strictly Necessary Cookies</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Required for basic website security, dark-slate dashboard theme rendering, and storing your consent preferences. These cannot be disabled.
            </p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--accent)' }}>Analytics Cookies (Google Analytics 4)</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Helps us aggregate anonymized traffic patterns (pageviews, session time, device type) so we can improve technical field guides and tools.
            </p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--indigo)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--indigo)' }}>Advertising Cookies (Google AdSense)</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Used by Google AdSense and certified advertising partners to deliver relevant ads, prevent ad repetition, and measure campaign performance.
            </p>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2>3. Manage Your Cookie Preferences</h2>
        <p>
          You can customize your cookie consent settings below. Your choices will be saved locally in your browser:
        </p>

        <div className="panel" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <strong style={{ color: 'var(--text-heading)' }}>Strictly Necessary Cookies</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Session &amp; Security</p>
            </div>
            <span className="badge" style={{ color: 'var(--emerald)' }}>Always Active</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <strong style={{ color: 'var(--text-heading)' }}>Analytics &amp; Performance Cookies</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Google Analytics 4 Telemetry</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="checkbox"
                checked={analyticsConsent}
                onChange={e => setAnalyticsConsent(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: '0.9rem' }}>{analyticsConsent ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <strong style={{ color: 'var(--text-heading)' }}>Advertising &amp; AdSense Cookies</strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Personalized Google AdSense</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="checkbox"
                checked={adConsent}
                onChange={e => setAdConsent(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontSize: '0.9rem' }}>{adConsent ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="button button-primary" type="button" onClick={handleSavePreferences}>
              Save Cookie Preferences
            </button>
            {savedStatus && (
              <span style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: '0.9rem' }}>
                ✓ Preferences Saved!
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2>4. External Cookie Controls</h2>
        <p>
          You can also manage or block cookies through your browser settings (Chrome, Safari, Firefox, Edge). To opt out of Google’s ad cookies directly across the web, visit <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
        </p>
      </section>
    </main>
  );
};
