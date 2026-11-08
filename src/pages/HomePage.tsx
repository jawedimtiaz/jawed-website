import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';
import {
  Image,
  DEFAULT_LQIP_DATA_URL,
  ensureImagePreloadLink,
} from '../components/Image';
import { ShareButton } from '../components/ShareButton';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const HERO_MAIN_IMAGE_SRC = '/assets/images/social-preview.png';
export const HERO_MAIN_IMAGE_WEBP_SRC = '/assets/images/social-preview.webp';
export const HERO_LQIP_PLACEHOLDER = DEFAULT_LQIP_DATA_URL;

/**
 * Preloads the main hero background image into the browser cache and injects
 * a high-priority <link rel="preload" as="image"> tag for optimal LCP performance.
 */
export function preloadHeroMainImage(
  onReady?: (resolvedSrc: string) => void
): () => void {
  ensureImagePreloadLink(HERO_MAIN_IMAGE_WEBP_SRC, 'image/webp');

  if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
    return () => {};
  }

  let cancelled = false;
  const preloader = new window.Image();
  preloader.decoding = 'sync';
  if ('fetchPriority' in preloader) {
    (preloader as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
  }

  const handleDone = (resolved: string) => {
    if (!cancelled && onReady) {
      onReady(resolved);
    }
  };

  preloader.onload = () => handleDone(HERO_MAIN_IMAGE_WEBP_SRC);
  preloader.onerror = () => {
    const fallbackLoader = new window.Image();
    fallbackLoader.onload = () => handleDone(HERO_MAIN_IMAGE_SRC);
    fallbackLoader.onerror = () => handleDone(HERO_MAIN_IMAGE_SRC);
    fallbackLoader.src = HERO_MAIN_IMAGE_SRC;
  };
  preloader.src = HERO_MAIN_IMAGE_WEBP_SRC;

  if (preloader.complete && preloader.naturalWidth > 0) {
    handleDone(HERO_MAIN_IMAGE_WEBP_SRC);
  }

  return () => {
    cancelled = true;
  };
}

export const HeroSection: React.FC = () => {
  const [bgLoadedSrc, setBgLoadedSrc] = useState<string | null>(null);
  const [isLcpVisualLoaded, setIsLcpVisualLoaded] = useState<boolean>(false);
  const { isInstallable, triggerInstall } = usePWAInstall();

  useEffect(() => {
    return preloadHeroMainImage((resolvedSrc) => {
      setBgLoadedSrc(resolvedSrc);
    });
  }, []);

  const isProgressiveReady = Boolean(bgLoadedSrc) || isLcpVisualLoaded;

  return (
    <section
      className="hero container"
      data-testid="homepage-hero"
      data-lcp-preloaded={isProgressiveReady ? 'true' : 'false'}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Progressive Ambient Background Layer (LQIP -> Preloaded High-Res WebP) */}
      <div
        aria-hidden="true"
        data-testid="hero-progressive-bg"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundImage: `url("${HERO_LQIP_PLACEHOLDER}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.14,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: bgLoadedSrc ? `url("${bgLoadedSrc}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(28px) saturate(1.15)',
            transform: 'scale(1.06)',
            opacity: bgLoadedSrc ? 0.35 : 0,
            transition: 'opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      <div className="hero-content" style={{ position: 'relative', zIndex: 1 }}>
        <p className="eyebrow">Enterprise Workplace Infrastructure · IT Field Engineering</p>
        <h1>Enterprise IT Support, Technical Field Guides &amp; Practical Utilities</h1>
        <p className="lead">
          I’m <strong>Jawed Imtiaz</strong>, a Senior IT Field Tech supporting enterprise workplace infrastructure at <strong>Uber</strong> (via Milestone Technologies). I specialize in high-SLA workplace technology, macOS/Jamf fleets, network cabling diagnostics, and practical IT utilities.
        </p>

        {/* Proof & Credentials Strip */}
        <div className="hero-proof-strip">
          <span className="proof-item">10+ Years IT Experience</span>
          <span className="proof-sep">·</span>
          <span className="proof-item">Uber (Milestone Technologies)</span>
          <span className="proof-sep">·</span>
          <span className="proof-item">Microsoft AZ-900 Certified</span>
        </div>

        {/* Primary High-Intent Actions (Recruiters / Hiring Managers / Clients) */}
        <div className="actions primary-actions">
          <Link className="button button-primary" to="/contact">
            Get in Touch / Hire Jawed →
          </Link>
          <Link className="button button-secondary" to="/about">
            View Career Profile
          </Link>
          <ShareButton
            title="Jawed Imtiaz - Senior IT Field Tech & Workplace Engineering Lead"
            text="Senior IT Field Tech supporting enterprise workplace infrastructure at Uber. High-SLA workplace technology, macOS/Jamf fleets, network cabling diagnostics, and practical IT utilities."
            url="https://jawed.co.in"
            label="Share Profile"
            hashtags={['ITFieldTech', 'EnterpriseIT', 'JawedImtiaz', 'Uber']}
          />
        </div>

        {/* Secondary Exploration Ribbon (Tools / Guides / AI / Search) */}
        <div className="hero-secondary-ribbon flex flex-wrap items-center gap-2 pt-4">
          <span className="ribbon-label text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Interactive Resources:
          </span>
          <Link
            className="ribbon-link inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 transition"
            to="/guides"
          >
            📖 Guides
          </Link>
          <Link
            className="ribbon-link inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 transition"
            to="/tools"
          >
            🛠️ Tools
          </Link>
          <Link
            className="ribbon-link inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 transition"
            to="/ai"
          >
            🤖 Ask AI
          </Link>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-search-modal'));
            }}
            className="ribbon-link inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 transition cursor-pointer"
            aria-label="Open Site Search (⌘K or Ctrl+K)"
            aria-keyshortcuts="Control+K Meta+K /"
            data-testid="hero-search-trigger"
          >
            🔍 Search
            <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-900/90 text-slate-400 rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>
          {isInstallable && (
            <button
              type="button"
              onClick={triggerInstall}
              className="ribbon-link inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 transition cursor-pointer"
              aria-label="Install Jawed Imtiaz App"
              data-testid="hero-install-app-btn"
            >
              📲 Install App
            </button>
          )}
        </div>

        {/* Hero Visual Card (LCP Optimized with Progressive Blur-Up, Preload & WebP) */}
        <div
          className="hero-image-wrapper"
          data-testid="hero-lcp-image-container"
          data-progressive-state={isProgressiveReady ? 'loaded' : 'loading'}
          style={{
            position: 'relative',
            marginTop: '36px',
            maxWidth: '920px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.22)',
            background: 'var(--surface)',
            aspectRatio: '16 / 9',
          }}
        >
          {/* Low-Quality Image Placeholder (LQIP) layer for instant zero-CLS first paint */}
          <div
            aria-hidden="true"
            data-testid="hero-lqip-placeholder"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url("${HERO_LQIP_PLACEHOLDER}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(12px)',
              transform: 'scale(1.03)',
              opacity: isProgressiveReady ? 0 : 1,
              transition: 'opacity 0.35s ease-out',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          <Image
            src={HERO_MAIN_IMAGE_SRC}
            webpSrc={HERO_MAIN_IMAGE_WEBP_SRC}
            alt="Jawed Imtiaz Enterprise IT Support, Field Engineering & Utilities Overview"
            width={1200}
            height={630}
            priority={true}
            progressive={true}
            preload={true}
            placeholderSrc={HERO_LQIP_PLACEHOLDER}
            aspectRatio="16 / 9"
            className="img-aspect-16-9"
            onLoad={() => setIsLcpVisualLoaded(true)}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>
    </section>
  );
};

export const HomePage: React.FC = () => {
  return (
    <main>
      <SeoHead
        title="Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools"
        description="Practical IT field guides, IPv4 subnet calculators, server rack power calculators, and interactive IT service desk diagnostic utilities by Jawed Imtiaz."
        canonicalUrl="https://jawed.co.in/"
        ogType="website"
      />

      {/* Hero Section - Progressive Image Loading & LCP Preloaded */}
      <HeroSection />

      {/* Featured Technical Guides Section */}
      <section className="container page-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">In-Depth Technical Documentation</p>
            <h2 style={{ margin: 0 }}>Featured Guides &amp; Knowledge Base</h2>
          </div>
          <Link to="/guides" className="button button-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            View All Guides →
          </Link>
        </div>

        <div className="card-grid two">
          <article className="card" style={{ borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                Network Infrastructure
              </span>
              <h3 style={{ fontSize: '1.15rem', margin: '6px 0 10px', lineHeight: '1.35' }}>
                <Link to="/field-guides/rj45-cabling-t568a-vs-t568b-guide" style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                  RJ45 Cabling: T568A vs T568B Standards &amp; Pinouts
                </Link>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                Master RJ45 color coding standards, T568A vs T568B wiremaps, crimping best practices, and wiremapper diagnostic fault readings.
              </p>
            </div>
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>8 min read</span>
              <Link to="/field-guides/rj45-cabling-t568a-vs-t568b-guide" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                Read Guide →
              </Link>
            </div>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--teal)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', background: 'rgba(20, 184, 166, 0.15)', color: 'var(--teal)' }}>
                Data Center &amp; Hardware
              </span>
              <h3 style={{ fontSize: '1.15rem', margin: '6px 0 10px', lineHeight: '1.35' }}>
                <Link to="/field-guides/server-rack-cable-management-best-practices" style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                  Server Rack Cable Management: Patch Panel to Switch
                </Link>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                Professional server rack cable routing, Cat6A bend radius rules, Velcro vs zip-tie rules, hot/cold aisle thermal optimization, and ANSI/TIA-606-C labeling.
              </p>
            </div>
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>9 min read</span>
              <Link to="/field-guides/server-rack-cable-management-best-practices" style={{ fontWeight: 600, color: 'var(--teal)' }}>
                Read Guide →
              </Link>
            </div>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--indigo)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--indigo)' }}>
                Network Switching &amp; Triage
              </span>
              <h3 style={{ fontSize: '1.15rem', margin: '6px 0 10px', lineHeight: '1.35' }}>
                <Link to="/field-guides/diagnosing-network-port-flapping-cli-guide" style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                  Diagnosing Network Port Flapping: CLI &amp; Layer 1 Checks
                </Link>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                Troubleshoot link flapping, speed/duplex autonegotiation mismatches, CRC FCS errors, and SFP transceiver optical dBm levels in Cisco IOS &amp; Aruba CX.
              </p>
            </div>
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>10 min read</span>
              <Link to="/field-guides/diagnosing-network-port-flapping-cli-guide" style={{ fontWeight: 600, color: 'var(--indigo)' }}>
                Read Guide →
              </Link>
            </div>
          </article>

          <article className="card" style={{ borderLeft: '4px solid var(--amber)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
                Server Hardware &amp; Field Service
              </span>
              <h3 style={{ fontSize: '1.15rem', margin: '6px 0 10px', lineHeight: '1.35' }}>
                <Link to="/field-guides/poweredge-proliant-amber-led-indicator-cheatsheet" style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                  PowerEdge &amp; ProLiant Amber Indicator Code Cheatsheet
                </Link>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px' }}>
                On-site diagnostic reference for Dell PowerEdge iDRAC status codes and HPE ProLiant Systems Insight Display (SID) LEDs, detailing RAM, PSU, and RAID fault recovery.
              </p>
            </div>
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>9 min read</span>
              <Link to="/field-guides/poweredge-proliant-amber-led-indicator-cheatsheet" style={{ fontWeight: 600, color: 'var(--amber)' }}>
                Read Guide →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Practical Diagnostic Utilities Grid */}
      <section className="container page-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">Interactive Browser Calculators</p>
            <h2 style={{ margin: 0 }}>Practical Diagnostic Utilities</h2>
          </div>
          <Link to="/tools" className="button button-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            View All Utilities →
          </Link>
        </div>

        <div className="card-grid">
          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>Network Calculator</span>
              <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px' }}>IPv4 Subnet &amp; CIDR Calculator</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 14px' }}>
                Calculate network boundaries, host ranges, broadcast IDs, Cisco ACL wildcard masks, and 32-bit binary octets.
              </p>
            </div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to="/tools/ipv4-subnet-calculator" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                Open Subnet Calculator →
              </Link>
            </div>
          </article>

          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>Data Center Tool</span>
              <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px' }}>Server Rack Power &amp; BTU Calculator</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 14px' }}>
                Estimate equipment power draw (Watts/kW), circuit amperage (120V/208V), NEC 80% continuous load circuit derating, and HVAC BTU/hr cooling load.
              </p>
            </div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to="/tools/server-rack-power-btu-calculator" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--emerald)' }}>
                Open Power &amp; BTU Calculator →
              </Link>
            </div>
          </article>

          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>ITSM Workflow</span>
              <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px' }}>IT Troubleshooting Assistant</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 14px' }}>
                Step-by-step layer-by-layer diagnostic checklists for network connectivity, Apple macOS Sonoma/Sequoia, and Microsoft 365 issues.
              </p>
            </div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to="/tools/it-troubleshooting-assistant" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--indigo)' }}>
                Launch Troubleshooting Assistant →
              </Link>
            </div>
          </article>

          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>Ticket Formatting</span>
              <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px' }}>Service Desk Note Formatter</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 14px' }}>
                Convert raw notes into structured, audit-ready ITSM ticket resolution updates with root-cause formatting.
              </p>
            </div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to="/tools/service-desk-note-formatter" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--amber)' }}>
                Open Note Formatter →
              </Link>
            </div>
          </article>

          <article className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>Personal Finance</span>
              <h3 style={{ fontSize: '1.1rem', margin: '6px 0 8px' }}>Money Manager &amp; Ledger</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 14px' }}>
                Multi-bank account tracking, monthly budget planning, spending velocity forecasts, and receipt OCR scanning.
              </p>
            </div>
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to="/tools/money-manager" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                Open Money Manager →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Professional Career Timeline Section */}
      <section className="container page-section">
        <p className="eyebrow">Professional Background</p>
        <h2>Career &amp; Field Experience</h2>
        <p style={{ color: 'var(--muted-light)', marginBottom: '24px' }}>
          Over a decade of enterprise technical support, workplace engineering, system administration, and IT service management.
        </p>

        <div className="timeline">
          <article className="timeline-item">
            <h3>IT Field Tech</h3>
            <p className="meta">Milestone Technologies, Inc. — Supporting Uber Enterprise Workplace Technology</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Delivering white-glove on-site support, Apple/Jamf macOS provisioning, Microsoft Entra ID management, physical cabling diagnostics, and high-SLA ticket resolutions.
            </p>
          </article>

          <article className="timeline-item">
            <h3>Technical Support Manager</h3>
            <p className="meta">Currents Technology</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Led Tier 1-3 technical support teams, established incident escalation protocols, and managed infrastructure uptime.
            </p>
          </article>

          <article className="timeline-item">
            <h3>System Executive</h3>
            <p className="meta">ICore</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Administered Active Directory domain controllers, Group Policy Objects (GPOs), network backups, and user access roles.
            </p>
          </article>

          <article className="timeline-item">
            <h3>System Administrator</h3>
            <p className="meta">Khadims</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Managed retail network infrastructure, point-of-sale hardware reliability, and multi-branch data synchronization.
            </p>
          </article>

          <article className="timeline-item">
            <h3>Technical Support Executive</h3>
            <p className="meta">Altos</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              First-line hardware diagnostics, desktop OS repairs, network socket patching, and client support.
            </p>
          </article>
        </div>

        <p style={{ marginTop: '20px' }}>
          <Link className="button button-secondary" to="/about">View Full Professional Credentials &amp; Certifications →</Link>
        </p>
      </section>

      {/* Highlights & Recognitions */}
      <section className="container page-section">
        <p className="eyebrow">Recognitions</p>
        <h2>Performance Recognition Highlights</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>User Satisfaction</strong>
            <span>Consistently top-rated ticket feedback</span>
          </div>
          <div className="stat">
            <strong>People’s Choice Award</strong>
            <span>Uber Vizag COE peer recognition</span>
          </div>
          <div className="stat">
            <strong>Employee of the Quarter</strong>
            <span>Awarded for field service performance</span>
          </div>
          <div className="stat">
            <strong>Tech Support Guru</strong>
            <span>People’s Choice technical recognition</span>
          </div>
          <div className="stat">
            <strong>Jugaad Genius Award</strong>
            <span>Recognized for innovative field problem-solving</span>
          </div>
          <div className="stat">
            <strong>The Solar Power Award</strong>
            <span>“Always charged up, even on Mondays”</span>
          </div>
        </div>
      </section>
    </main>
  );
};
