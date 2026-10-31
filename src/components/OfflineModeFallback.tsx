import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface CachedOfflineTool {
  id: string;
  title: string;
  shortName: string;
  path: string;
  aliases: string[];
  category: string;
  summary: string;
  capabilities: string;
  featured?: boolean;
}

export const CACHED_OFFLINE_TOOLS: CachedOfflineTool[] = [
  {
    id: 'ipv4-subnet-calculator',
    title: 'IPv4 Subnet Calculator',
    shortName: 'IPv4 Calculator',
    path: '/tools/ipv4-subnet-calculator',
    aliases: ['/tools/ipv4-subnet-calculator'],
    category: 'Network Engineering · Zero Network Dependency',
    summary:
      'Calculate CIDR subnet masks, network and broadcast addresses, usable host ranges, wildcard masks, and binary octets directly in your browser.',
    capabilities: 'CIDR /0–/32 · Usable Host Range · Binary Breakdown',
    featured: true,
  },
  {
    id: 'cable-length-poe-budget-checker',
    title: 'Cable Length & PoE Budget Checker',
    shortName: 'PoE & Cable Calculator',
    path: '/tools/cable-length-poe-budget-checker',
    aliases: [
      '/tools/cable-length-poe-budget-checker',
      '/tools/cable-length-poe-checker',
      '/tools/poe-budget-calculator',
      '/tools/cable-length-checker',
      '/cable-length-poe-budget-checker',
    ],
    category: 'Field Cabling & Power · Zero Network Dependency',
    summary:
      'Validate Ethernet cable run lengths across Cat5e, Cat6, and Cat6a, estimate conductor voltage drop, and verify IEEE 802.3af/at/bt PoE switch budgets.',
    capabilities: '802.3af/at/bt PoE · Voltage Drop · 100m TIA/EIA Check',
    featured: true,
  },
  {
    id: 'server-rack-power-btu-calculator',
    title: 'Server Rack Power & BTU Calculator',
    shortName: 'Rack Power & BTU',
    path: '/tools/server-rack-power-btu-calculator',
    aliases: ['/tools/server-rack-power-btu-calculator'],
    category: 'Data Center Infrastructure · Cached Client-Side',
    summary:
      'Estimate server rack power draw in watts, VA, and amps, calculate UPS runtime headroom, and determine HVAC thermal output in BTU/hr.',
    capabilities: 'Watts / VA / Amps · 80% NEC Breaker Load · BTU/hr Cooling',
    featured: true,
  },
  {
    id: 'hardware-storage-calculator',
    title: 'Hardware Storage & RAID Calculator',
    shortName: 'RAID & Storage',
    path: '/tools/hardware-storage-calculator',
    aliases: [
      '/tools/hardware-storage-calculator',
      '/tools/raid-calculator',
      '/tools/hardware-storage',
      '/hardware-storage-calculator',
      '/raid-calculator',
    ],
    category: 'Storage Architecture · Cached Client-Side',
    summary:
      'Compute usable storage capacity, raw TB vs actual TiB conversion, parity overhead, and disk fault tolerance across RAID 0, 1, 5, 6, 10, and ZFS.',
    capabilities: 'RAID 0/1/5/6/10/ZFS · TB to TiB · Fault Tolerance',
  },
  {
    id: 'cctv-storage-calculator',
    title: 'CCTV Storage Calculator',
    shortName: 'CCTV NVR Storage',
    path: '/tools/cctv-storage-calculator',
    aliases: [
      '/tools/cctv-storage-calculator',
      '/tools/cctv-calculator',
      '/cctv-storage-calculator',
    ],
    category: 'Surveillance & Security · Cached Client-Side',
    summary:
      'Size NVR hard drive arrays for IP camera deployments using H.264/H.265 compression, resolution, frame rate, daily motion hours, and retention targets.',
    capabilities: 'H.264 / H.265 · Retention Days · Uplink Mbps',
  },
  {
    id: 'service-desk-note-formatter',
    title: 'Service Desk Note Formatter',
    shortName: 'ITSM Note Formatter',
    path: '/tools/service-desk-note-formatter',
    aliases: ['/tools/service-desk-note-formatter'],
    category: 'IT Operations · Local Storage Ready',
    summary:
      'Draft structured L1–L3 incident work notes, root-cause summaries, and escalation handovers offline before syncing back to your ticketing queue.',
    capabilities: 'Incident Templates · Clipboard Copy · Local Persistence',
  },
];

export const CACHED_OFFLINE_PATHS = new Set<string>(
  CACHED_OFFLINE_TOOLS.flatMap((tool) => [tool.path, ...tool.aliases])
);

export function isCachedOfflineToolPath(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return CACHED_OFFLINE_PATHS.has(normalized);
}

export interface OfflineModeFallbackProps {
  isOnline?: boolean;
  onRetryConnection?: () => void;
  onSelectTool?: (path: string) => void;
  compact?: boolean;
  onExpandHub?: () => void;
}

export const OfflineModeFallback: React.FC<OfflineModeFallbackProps> = ({
  isOnline = false,
  onRetryConnection,
  onSelectTool,
  compact = false,
  onExpandHub,
}) => {
  const { pathname } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [lastCheckedTime, setLastCheckedTime] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  const handleRetry = () => {
    const nowFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastCheckedTime(nowFormatted);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setCheckFeedback('Connection restored. Synchronizing route...');
    } else {
      setCheckFeedback(`Still offline as of ${nowFormatted}. Cached tools remain fully available.`);
    }

    if (onRetryConnection) {
      onRetryConnection();
    }
  };

  const filteredTools = CACHED_OFFLINE_TOOLS.filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tool.title.toLowerCase().includes(q) ||
      tool.shortName.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.summary.toLowerCase().includes(q) ||
      tool.capabilities.toLowerCase().includes(q)
    );
  });

  if (compact) {
    return (
      <section
        aria-label="Offline Mode Active Banner"
        style={{
          maxWidth: '1160px',
          margin: '16px auto 0',
          padding: '0 20px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#D97706',
                }}
              >
                Offline Mode Active
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>·</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-heading)', fontWeight: 600 }}>
                Running from local browser cache
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
              You lost network connectivity, but this calculator executes 100% locally. Switch between cached field tools below:
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              to="/tools/ipv4-subnet-calculator"
              onClick={() => onSelectTool?.('/tools/ipv4-subnet-calculator')}
              className="button button-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '7px 12px',
                whiteSpace: 'nowrap',
                borderColor: pathname.includes('ipv4-subnet-calculator') ? 'var(--accent)' : undefined,
              }}
            >
              IPv4 Subnet Calculator
            </Link>
            <Link
              to="/tools/cable-length-poe-budget-checker"
              onClick={() => onSelectTool?.('/tools/cable-length-poe-budget-checker')}
              className="button button-secondary"
              style={{
                fontSize: '0.82rem',
                padding: '7px 12px',
                whiteSpace: 'nowrap',
                borderColor: pathname.includes('poe') || pathname.includes('cable-length') ? 'var(--accent)' : undefined,
              }}
            >
              PoE &amp; Cable Calculator
            </Link>
            {onExpandHub && (
              <button
                type="button"
                onClick={onExpandHub}
                className="button button-secondary"
                style={{ fontSize: '0.82rem', padding: '7px 12px', whiteSpace: 'nowrap' }}
              >
                All Offline Tools
              </button>
            )}
            <button
              type="button"
              onClick={handleRetry}
              className="button button-primary"
              style={{ fontSize: '0.82rem', padding: '7px 12px', whiteSpace: 'nowrap' }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <main
      className="container page"
      aria-labelledby="offline-mode-heading"
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '36px 20px 64px',
      }}
    >
      {/* Hero Fallback Header Card */}
      <div
        className="card"
        style={{
          padding: '32px',
          borderRadius: '18px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ maxWidth: '680px' }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: isOnline ? '#16A34A' : '#D97706',
                marginBottom: '10px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isOnline ? 'Connection Restored · Ready' : 'Offline Mode · Local Workspace Fallback'} · Last Check {lastCheckedTime}
            </div>

            <h1
              id="offline-mode-heading"
              style={{
                fontSize: 'clamp(1.75rem, 3.2vw, 2.35rem)',
                lineHeight: 1.2,
                margin: '0 0 12px',
                color: 'var(--text-heading)',
              }}
            >
              You’re currently offline, but field engineering tools are ready.
            </h1>

            <p
              style={{
                margin: '0 0 20px',
                fontSize: '1rem',
                lineHeight: 1.6,
                color: 'var(--muted)',
              }}
            >
              It looks like your device lost network connectivity—common in server rooms, MDF/IDF closets, and sub-grade telecom vaults. Cached client-side calculators like the{' '}
              <strong style={{ color: 'var(--text-heading)' }}>IPv4 Subnet Calculator</strong> and{' '}
              <strong style={{ color: 'var(--text-heading)' }}>Cable Length &amp; PoE Budget Checker</strong> run 100% in your browser with zero external API calls.
            </p>

            {/* Primary Featured Quick Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <Link
                to="/tools/ipv4-subnet-calculator"
                onClick={() => onSelectTool?.('/tools/ipv4-subnet-calculator')}
                className="button button-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Open IPv4 Subnet Calculator
              </Link>
              <Link
                to="/tools/cable-length-poe-budget-checker"
                onClick={() => onSelectTool?.('/tools/cable-length-poe-budget-checker')}
                className="button button-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Open PoE &amp; Cable Calculator
              </Link>
              <button
                type="button"
                onClick={handleRetry}
                className="button button-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Retry Connection
              </button>
            </div>

            {checkFeedback && (
              <p
                role="status"
                style={{
                  margin: '14px 0 0',
                  fontSize: '0.86rem',
                  color: 'var(--text-heading)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {checkFeedback}
              </p>
            )}
          </div>

          {/* Offline Readiness Summary Box */}
          <div
            style={{
              minWidth: '240px',
              flex: '1 1 260px',
              maxWidth: '320px',
              padding: '18px 20px',
              borderRadius: '14px',
              border: '1px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
                marginBottom: '10px',
              }}
            >
              Offline Capability Summary
            </div>
            <div
              style={{
                display: 'grid',
                gap: '10px',
                fontSize: '0.86rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--muted)' }}>Cached Calculators</span>
                <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                  {CACHED_OFFLINE_TOOLS.length} Ready
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--muted)' }}>Execution Engine</span>
                <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>100% Browser Local</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--muted)' }}>Active Route</span>
                <strong
                  style={{
                    color: 'var(--text-heading)',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '150px',
                  }}
                  title={pathname}
                >
                  {pathname}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Section Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: 'var(--text-heading)' }}>
            Cached Offline Calculators &amp; Field Utilities
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
            Select any tool below to launch it immediately without an internet connection.
          </p>
        </div>

        <div style={{ minWidth: '260px', flex: '0 1 320px' }}>
          <input
            type="search"
            className="discovery-input"
            placeholder="Filter cached tools (e.g., IPv4, PoE, RAID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter cached offline tools"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Cached Tools Grid */}
      {filteredTools.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '28px',
            textAlign: 'center',
            borderRadius: '14px',
            border: '1px solid var(--line)',
          }}
        >
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
            No cached offline calculators matched “{searchQuery}”.
          </p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setSearchQuery('')}
            style={{ whiteSpace: 'nowrap' }}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredTools.map((tool) => (
            <article
              key={tool.id}
              className="card"
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: tool.featured ? 'var(--accent)' : 'var(--muted)',
                    marginBottom: '8px',
                  }}
                >
                  {tool.category}
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: '1.12rem', color: 'var(--text-heading)' }}>
                  <Link
                    to={tool.path}
                    onClick={() => onSelectTool?.(tool.path)}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {tool.title}
                  </Link>
                </h3>

                <p style={{ margin: '0 0 12px', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--muted)' }}>
                  {tool.summary}
                </p>
              </div>

              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                    fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {tool.capabilities}
                </span>

                <Link
                  to={tool.path}
                  onClick={() => onSelectTool?.(tool.path)}
                  className="button button-secondary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Launch {tool.shortName} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default OfflineModeFallback;
