import React, { useState } from 'react';
import { Server, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

export interface LedStatusItem {
  code: string;
  vendor: 'Dell PowerEdge' | 'HPE ProLiant';
  ledColor: 'amber' | 'blue' | 'flashing-amber' | 'flashing-blue' | 'red';
  subsystem: 'Memory / DIMM' | 'Storage / RAID' | 'Power / PSU' | 'CPU / Thermals' | 'Chassis Health';
  meaning: string;
  rootCause: string;
  actionSteps: string[];
}

export const LedStatusMatrix: React.FC = () => {
  const [filterVendor, setFilterVendor] = useState<'all' | 'Dell PowerEdge' | 'HPE ProLiant'>('all');

  const ledItems: LedStatusItem[] = [
    {
      code: 'MEM0001 / MEM0702',
      vendor: 'Dell PowerEdge',
      ledColor: 'flashing-amber',
      subsystem: 'Memory / DIMM',
      meaning: 'ECC Multi-Bit Uncorrectable Memory Error or Faulty DIMM Slot',
      rootCause: 'Hardware memory fault or uncorrectable bus parity error detected on specific channel during POST or runtime.',
      actionSteps: [
        'Log into iDRAC9 web interface -> Maintenance -> System Event Log (SEL).',
        'Identify exact faulted socket and slot (e.g., DIMM A4).',
        'Power off node, perform flea power release, swap DIMM A4 with A5 to isolate slot vs module failure.',
        'Replace degraded DIMM module if error follows the stick.'
      ]
    },
    {
      code: 'PDR1001 / PDR0001',
      vendor: 'Dell PowerEdge',
      ledColor: 'amber',
      subsystem: 'Storage / RAID',
      meaning: 'Physical Disk Faulted / Drive Offline in Backplane Slot',
      rootCause: 'SAS/SATA drive reported SMART physical sector failure or dropped off PERC controller bus.',
      actionSteps: [
        'Check drive bay LED (Solid Amber = Failed, Flashing Amber = Rebuilding).',
        'Verify RAID array redundancy status in iDRAC / PERC CLI.',
        'Hot-swap defective disk with genuine Dell certified replacement drive of equal/greater capacity.',
        'Monitor automatic background rebuilding progress in iDRAC storage tab.'
      ]
    },
    {
      code: 'PSU0003 / PSU0006',
      vendor: 'Dell PowerEdge',
      ledColor: 'flashing-amber',
      subsystem: 'Power / PSU',
      meaning: 'Power Supply Unit Input Loss or Voltage Out of Range',
      rootCause: 'AC power source failure, tripped PDU breaker, or internal PSU thermal overload shutdown.',
      actionSteps: [
        'Inspect rear PSU LED indicator (Blinking Amber = Faulty input / degraded).',
        'Check PDU power cord seating and voltage input on Feed B.',
        'Reseat PSU in chassis bay. If blinking persists, replace PSU assembly.'
      ]
    },
    {
      code: 'CPU0001 / CPU0700',
      vendor: 'Dell PowerEdge',
      ledColor: 'red',
      subsystem: 'CPU / Thermals',
      meaning: 'Processor Internal Error (IERR) or Thermal Throttling Trip',
      rootCause: 'CPU core voltage regulator failure, heatsink detachment, or thermal pasta breakdown.',
      actionSteps: [
        'Power down node immediately. Check chassis intake/exhaust fan modules.',
        'Inspect heatsink retention screws and re-apply thermal compound.',
        'Clear iDRAC SEL logs and re-test POST with minimum hardware configuration.'
      ]
    },
    {
      code: 'Systems Insight Display (SID) DIMM LED',
      vendor: 'HPE ProLiant',
      ledColor: 'amber',
      subsystem: 'Memory / DIMM',
      meaning: 'ProLiant Internal SID Diagnostics: Specific Memory Slot Amber',
      rootCause: 'HPE SmartMemory module failed online advanced ECC threshold or lockstep check.',
      actionSteps: [
        'Pull down Systems Insight Display diagnostic panel on front bezel.',
        'Locate illuminated amber LED corresponding to Channel/Slot.',
        'Log into HPE iLO 6 -> Integrated Management Log (IML) for exact DIMM serial.',
        'Reseat or replace DIMM module.'
      ]
    },
    {
      code: 'HPE Internal Health LED Amber / Red',
      vendor: 'HPE ProLiant',
      ledColor: 'amber',
      subsystem: 'Chassis Health',
      meaning: 'System Degraded (Amber) or Critical System Failure (Red)',
      rootCause: 'Redundant power supply lost or chassis cover intrusion sensor triggered.',
      actionSteps: [
        'Check front Health LED (Solid Amber = Degraded redundancy, Flashing Red = Fatal).',
        'Check iLO Health Summary page for active hardware alerts.',
        'Verify fan rotor speeds and PDU circuit breakers.'
      ]
    }
  ];

  const filtered = ledItems.filter(item => filterVendor === 'all' || item.vendor === filterVendor);

  const renderBadge = (ledColor: LedStatusItem['ledColor']) => {
    switch (ledColor) {
      case 'amber':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid var(--amber)', color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)' }} />
            Solid Amber
          </span>
        );
      case 'flashing-amber':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid var(--amber)', color: 'var(--amber)', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)', animation: 'blinkPulse 1s infinite' }} />
            Blinking Amber
          </span>
        );
      case 'red':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid var(--rose)', color: 'var(--rose)', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rose)', boxShadow: '0 0 8px var(--rose)' }} />
            Solid Red
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
            Blue / ID
          </span>
        );
    }
  };

  return (
    <div style={{ margin: '28px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server style={{ color: 'var(--amber)' }} size={22} />
          Dell PowerEdge &amp; HPE ProLiant LED Diagnostic Matrix
        </h3>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-darker)', padding: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <button
            onClick={() => setFilterVendor('all')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: filterVendor === 'all' ? 'var(--accent)' : 'transparent', color: filterVendor === 'all' ? '#0f172a' : 'var(--muted-light)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            All Server Vendors
          </button>
          <button
            onClick={() => setFilterVendor('Dell PowerEdge')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: filterVendor === 'Dell PowerEdge' ? 'var(--accent)' : 'transparent', color: filterVendor === 'Dell PowerEdge' ? '#0f172a' : 'var(--muted-light)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Dell iDRAC
          </button>
          <button
            onClick={() => setFilterVendor('HPE ProLiant')}
            style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: filterVendor === 'HPE ProLiant' ? 'var(--accent)' : 'transparent', color: filterVendor === 'HPE ProLiant' ? '#0f172a' : 'var(--muted-light)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            HPE SID / iLO
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {filtered.map((item, idx) => (
          <div key={idx} style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', background: 'var(--bg-darker)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                {item.vendor}
              </span>
              {renderBadge(item.ledColor)}
            </div>

            <div>
              <h4 style={{ margin: '4px 0 2px', fontSize: '1.05rem', color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                {item.code}
              </h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--accent-hover)', fontWeight: 600 }}>
                {item.meaning}
              </p>
            </div>

            <div style={{ background: 'var(--bg-darker)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '0.85rem', color: 'var(--muted-light)', lineHeight: 1.45 }}>
              <strong>Root Cause:</strong> {item.rootCause}
            </div>

            <div>
              <strong style={{ fontSize: '0.825rem', color: 'var(--teal)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Field Resolution Protocol:
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.45 }}>
                {item.actionSteps.map((step, sIdx) => (
                  <li key={sIdx}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
