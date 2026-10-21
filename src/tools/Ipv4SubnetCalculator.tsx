import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';

interface SubnetOption {
  cidr: number;
  mask: string;
  hosts: number;
}

const SUBNET_MASKS: SubnetOption[] = [
  { cidr: 32, mask: '255.255.255.255', hosts: 1 },
  { cidr: 31, mask: '255.255.255.254', hosts: 2 },
  { cidr: 30, mask: '255.255.255.252', hosts: 2 },
  { cidr: 29, mask: '255.255.255.248', hosts: 6 },
  { cidr: 28, mask: '255.255.255.240', hosts: 14 },
  { cidr: 27, mask: '255.255.255.224', hosts: 30 },
  { cidr: 26, mask: '255.255.255.192', hosts: 62 },
  { cidr: 25, mask: '255.255.255.128', hosts: 126 },
  { cidr: 24, mask: '255.255.255.0', hosts: 254 },
  { cidr: 23, mask: '255.255.254.0', hosts: 510 },
  { cidr: 22, mask: '255.255.252.0', hosts: 1022 },
  { cidr: 21, mask: '255.255.248.0', hosts: 2046 },
  { cidr: 20, mask: '255.255.240.0', hosts: 4094 },
  { cidr: 19, mask: '255.255.224.0', hosts: 8190 },
  { cidr: 18, mask: '255.255.192.0', hosts: 16382 },
  { cidr: 17, mask: '255.255.128.0', hosts: 32766 },
  { cidr: 16, mask: '255.255.0.0', hosts: 65534 },
  { cidr: 15, mask: '255.254.0.0', hosts: 131070 },
  { cidr: 14, mask: '255.252.0.0', hosts: 262142 },
  { cidr: 13, mask: '255.248.0.0', hosts: 524286 },
  { cidr: 12, mask: '255.240.0.0', hosts: 1048574 },
  { cidr: 11, mask: '255.224.0.0', hosts: 2097150 },
  { cidr: 10, mask: '255.192.0.0', hosts: 4194302 },
  { cidr: 9, mask: '255.128.0.0', hosts: 8388606 },
  { cidr: 8, mask: '255.0.0.0', hosts: 16777214 },
];

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255 || (parts[i].length > 1 && parts[i].startsWith('0'))) {
      return null;
    }
    num = (num << 8) | octet;
  }
  return num >>> 0;
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

function intToBinaryString(int: number): string {
  const binary = (int >>> 0).toString(2).padStart(32, '0');
  return `${binary.slice(0, 8)}.${binary.slice(8, 16)}.${binary.slice(16, 24)}.${binary.slice(24, 32)}`;
}

export const Ipv4SubnetCalculator: React.FC = () => {
  const [ipInput, setIpInput] = useState('192.168.1.50');
  const [cidrPrefix, setCidrPrefix] = useState<number>(24);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const ipInt = ipToInt(ipInput);
    if (ipInt === null) {
      return { isValid: false, error: 'Invalid IPv4 Address syntax. Please use dotted decimal format (e.g., 192.168.1.50).' };
    }

    const maskInt = cidrPrefix === 0 ? 0 : (~0 << (32 - cidrPrefix)) >>> 0;
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    const totalAddresses = Math.pow(2, 32 - cidrPrefix);
    let usableHosts = 0;
    let firstUsableIp = '';
    let lastUsableIp = '';

    if (cidrPrefix === 32) {
      usableHosts = 1;
      firstUsableIp = intToIp(networkInt);
      lastUsableIp = intToIp(networkInt);
    } else if (cidrPrefix === 31) {
      // RFC 3021 point-to-point links
      usableHosts = 2;
      firstUsableIp = intToIp(networkInt);
      lastUsableIp = intToIp(broadcastInt);
    } else {
      usableHosts = totalAddresses - 2;
      firstUsableIp = intToIp(networkInt + 1);
      lastUsableIp = intToIp(broadcastInt - 1);
    }

    // IP Address Class & Type
    const firstOctet = (ipInt >>> 24) & 255;
    let ipClass = 'Classless';
    if (firstOctet >= 1 && firstOctet <= 126) ipClass = 'Class A';
    else if (firstOctet >= 128 && firstOctet <= 191) ipClass = 'Class B';
    else if (firstOctet >= 192 && firstOctet <= 223) ipClass = 'Class C';
    else if (firstOctet >= 224 && firstOctet <= 239) ipClass = 'Class D (Multicast)';
    else if (firstOctet >= 240 && firstOctet <= 255) ipClass = 'Class E (Experimental)';

    let ipScope = 'Public Global IPv4';
    if (
      (firstOctet === 10) ||
      (firstOctet === 172 && ((ipInt >>> 16) & 255) >= 16 && ((ipInt >>> 16) & 255) <= 31) ||
      (firstOctet === 192 && ((ipInt >>> 16) & 255) === 168)
    ) {
      ipScope = 'Private (RFC 1918)';
    } else if (firstOctet === 127) {
      ipScope = 'Loopback (RFC 1122)';
    } else if (firstOctet === 169 && ((ipInt >>> 16) & 255) === 254) {
      ipScope = 'Link-Local / APIPA (RFC 3927)';
    }

    return {
      isValid: true,
      error: null,
      ipAddress: intToIp(ipInt),
      networkAddress: intToIp(networkInt),
      broadcastAddress: intToIp(broadcastInt),
      subnetMask: intToIp(maskInt),
      wildcardMask: intToIp(wildcardInt),
      firstUsableIp,
      lastUsableIp,
      usableHosts,
      totalAddresses,
      ipClass,
      ipScope,
      binaryIp: intToBinaryString(ipInt),
      binaryMask: intToBinaryString(maskInt),
      binaryNetwork: intToBinaryString(networkInt),
      binaryBroadcast: intToBinaryString(broadcastInt),
    };
  }, [ipInput, cidrPrefix]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePreset = (presetIp: string, presetCidr: number) => {
    setIpInput(presetIp);
    setCidrPrefix(presetCidr);
  };

  return (
    <main className="container page">

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <Link to="/tools">Tools</Link> &gt; <span>IPv4 Subnet &amp; CIDR Calculator</span>
      </nav>

      {/* Top Leaderboard Ad Unit */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <p className="eyebrow">Diagnostic Tool — Network Engineering</p>
      <h1>IPv4 Subnet &amp; CIDR Calculator</h1>
      <p className="lead">
        Calculate IPv4 network boundaries, usable host ranges, broadcast addresses, wildcard masks, and 32-bit binary octet representations for network engineering, firewall rules, and Cisco ACLs.
      </p>

      {/* Calculator Interface */}
      <div className="card" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--line)', marginBottom: '36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* IP Input */}
          <div className="form-field">
            <label htmlFor="ip-input" style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px', display: 'block' }}>
              IPv4 Address *
            </label>
            <input
              id="ip-input"
              type="text"
              value={ipInput}
              onChange={e => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.50"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '1.05rem', padding: '10px 14px' }}
            />
          </div>

          {/* Subnet Mask Dropdown */}
          <div className="form-field">
            <label htmlFor="cidr-select" style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px', display: 'block' }}>
              Subnet Mask / CIDR Prefix *
            </label>
            <select
              id="cidr-select"
              value={cidrPrefix}
              onChange={e => setCidrPrefix(parseInt(e.target.value, 10))}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.95rem', padding: '10px 14px' }}
            >
              {SUBNET_MASKS.map(item => (
                <option key={item.cidr} value={item.cidr}>
                  /{item.cidr} — {item.mask} ({item.hosts.toLocaleString()} hosts)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>Common Field Presets:</span>
          <button type="button" className="button button-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handlePreset('192.168.1.50', 24)}>
            192.168.1.50/24 (LAN)
          </button>
          <button type="button" className="button button-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handlePreset('10.100.4.15', 22)}>
            10.100.4.15/22 (Corp Wi-Fi)
          </button>
          <button type="button" className="button button-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handlePreset('172.16.50.1', 28)}>
            172.16.50.1/28 (DMZ Subnet)
          </button>
          <button type="button" className="button button-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handlePreset('10.255.0.1', 30)}>
            10.255.0.1/30 (Router P2P)
          </button>
        </div>

        {/* Error Display */}
        {!parsed.isValid && (
          <div style={{ padding: '16px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--rose)', borderRadius: '8px', color: 'var(--rose)', fontWeight: 500 }}>
            ⚠️ {parsed.error}
          </div>
        )}

        {/* Calculation Results Grid */}
        {parsed.isValid && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.2rem' }}>
                📊 Network Calculation Results for {parsed.ipAddress}/{cidrPrefix}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                  {parsed.ipClass}
                </span>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)' }}>
                  {parsed.ipScope}
                </span>
              </div>
            </div>

            {/* Key Output Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network Address</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--accent)', fontFamily: 'monospace', display: 'block', margin: '4px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {parsed.networkAddress}
                </strong>
                <button type="button" className="cookie-trigger-btn" onClick={() => handleCopy(parsed.networkAddress || '', 'Network Address')} style={{ fontSize: '0.75rem' }}>
                  {copiedField === 'Network Address' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usable Host Range</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--emerald)', fontFamily: 'monospace', display: 'block', margin: '4px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {parsed.firstUsableIp} - {parsed.lastUsableIp}
                </strong>
                <button type="button" className="cookie-trigger-btn" onClick={() => handleCopy(`${parsed.firstUsableIp} - ${parsed.lastUsableIp}`, 'Usable Range')} style={{ fontSize: '0.75rem' }}>
                  {copiedField === 'Usable Range' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broadcast Address</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--amber)', fontFamily: 'monospace', display: 'block', margin: '4px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {parsed.broadcastAddress}
                </strong>
                <button type="button" className="cookie-trigger-btn" onClick={() => handleCopy(parsed.broadcastAddress || '', 'Broadcast Address')} style={{ fontSize: '0.75rem' }}>
                  {copiedField === 'Broadcast Address' ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div className="card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Usable Hosts</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-heading)', fontFamily: 'monospace', display: 'block', margin: '4px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {parsed.usableHosts?.toLocaleString()}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  ({parsed.totalAddresses?.toLocaleString()} total addresses)
                </span>
              </div>
            </div>

            {/* Detailed Parameters Table */}
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-darker)', border: '1px solid var(--line)', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-heading)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', border: '1px solid var(--line)' }}>Parameter</th>
                    <th style={{ padding: '10px 14px', border: '1px solid var(--line)' }}>Dotted Decimal Value</th>
                    <th style={{ padding: '10px 14px', border: '1px solid var(--line)' }}>Cisco CLI / Note Format</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600 }}>Subnet Mask</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace', color: 'var(--accent)' }}>{parsed.subnetMask}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>netmask {parsed.subnetMask}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600 }}>Wildcard Mask (Inverted)</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace', color: 'var(--amber)' }}>{parsed.wildcardMask}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>access-list 10 permit {parsed.networkAddress} {parsed.wildcardMask}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontWeight: 600 }}>CIDR Notation</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>{parsed.ipAddress}/{cidrPrefix}</td>
                    <td style={{ padding: '10px 14px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>ip address {parsed.ipAddress} {parsed.subnetMask}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Binary Octet Breakdown */}
            <div>
              <h4 style={{ color: 'var(--text-heading)', marginBottom: '12px', fontSize: '1rem' }}>
                🔢 32-Bit Binary Breakdown (Network Bits vs Host Bits)
              </h4>
              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--line)', padding: '16px', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ width: '130px', color: 'var(--muted)', flexShrink: 0 }}>IP Address:</span>
                    <span style={{ color: 'var(--accent)' }}>{parsed.binaryIp}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ width: '130px', color: 'var(--muted)', flexShrink: 0 }}>Subnet Mask:</span>
                    <span style={{ color: 'var(--emerald)' }}>{parsed.binaryMask}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ width: '130px', color: 'var(--muted)', flexShrink: 0 }}>Network Address:</span>
                    <span style={{ color: 'var(--text-heading)' }}>{parsed.binaryNetwork}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ width: '130px', color: 'var(--muted)', flexShrink: 0 }}>Broadcast:</span>
                    <span style={{ color: 'var(--amber)' }}>{parsed.binaryBroadcast}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Educational Prose & Technical Principles */}
      <section className="content-section" style={{ borderTop: '2px solid var(--line)', paddingTop: '32px' }}>
        <h2>Understanding IPv4 Subnetting &amp; CIDR Network Principles</h2>
        <p>
          An IPv4 address consists of 32 binary bits divided into four 8-bit octets separated by periods (dotted-decimal format, e.g., <code>192.168.1.50</code>). The subnet mask determines where the <strong>Network ID</strong> ends and the <strong>Host ID</strong> begins.
        </p>

        <h3>1. The Subnet Host Formula: 2<sup>(32 - prefix)</sup> - 2</h3>
        <p>
          The total number of available IP addresses within a CIDR prefix is 2<sup>(32 - N)</sup>, where <code>N</code> represents the prefix length. Standard subnets subtract two addresses:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li><strong>Network Address (First Address):</strong> Identified when all host bits are set to binary <code>0</code>. Identifies the route boundary in routing tables.</li>
          <li><strong>Broadcast Address (Last Address):</strong> Identified when all host bits are set to binary <code>1</code>. Used to send packets to all hosts on the local layer-2 broadcast domain.</li>
        </ul>

        <h3>2. Special Subnet Prefix Exceptions (/31 &amp; /32)</h3>
        <div className="card" style={{ background: 'var(--surface)', borderLeft: '4px solid var(--accent)', padding: '16px', margin: '16px 0' }}>
          <strong style={{ color: 'var(--accent)' }}>Point-to-Point Links (RFC 3021 /31 Subnets)</strong>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
            Traditional subnetting wasted two IP addresses per router-to-router point-to-point link. RFC 3021 allows <code>/31</code> prefixes (2 total addresses, 0 host bits reserved for broadcast) on point-to-point serial and Ethernet router links, doubling IPv4 address utilization efficiency.
          </p>
        </div>

        <h3>3. RFC 1918 Private IPv4 Address Allocations</h3>
        <p>
          To conserve global public IPv4 addresses, the Internet Engineering Task Force (IETF) reserved three address ranges under RFC 1918 for private internal local area networks (LANs):
        </p>
        <div style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-darker)', border: '1px solid var(--line)', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-heading)', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid var(--line)' }}>Private Address Block</th>
                <th style={{ padding: '10px', border: '1px solid var(--line)' }}>CIDR Range</th>
                <th style={{ padding: '10px', border: '1px solid var(--line)' }}>Total Available Addresses</th>
                <th style={{ padding: '10px', border: '1px solid var(--line)' }}>Typical Deployment Context</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace', fontWeight: 600 }}>10.0.0.0 - 10.255.255.255</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>10.0.0.0/8</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>16,777,216</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>Large Enterprise Global Networks &amp; Data Centers</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace', fontWeight: 600 }}>172.16.0.0 - 172.31.255.255</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>172.16.0.0/12</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>1,048,576</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>Medium Enterprise DMZs, VPN Pools &amp; Branch Offices</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace', fontWeight: 600 }}>192.168.0.0 - 192.168.255.255</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>192.168.0.0/16</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>65,536</td>
                <td style={{ padding: '10px', border: '1px solid var(--line)' }}>Small Office / Home Office (SOHO) &amp; Consumer Routers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>4. Wildcard Masks in Cisco ACLs &amp; Routing Protocols</h3>
        <p>
          A <strong>Wildcard Mask</strong> is the bitwise inverse of a subnet mask (calculated by subtracting each octet of the subnet mask from <code>255.255.255.255</code>).
        </p>
        <p>
          In Cisco IOS Access Control Lists (ACLs) and OSPF network configuration commands, a <code>0</code> bit indicates "must match exact bit value," whereas a <code>1</code> bit indicates "ignore this bit (wildcard)." For example, matching a <code>192.168.1.0/24</code> subnet in a Cisco ACL uses <code>access-list 101 permit ip 192.168.1.0 0.0.0.255 any</code>.
        </p>
      </section>
    </main>
  );
};
