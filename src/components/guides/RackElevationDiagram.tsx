import React, { useState } from 'react';
import { Server, Zap, ArrowDown, ArrowUp, Activity } from 'lucide-react';

export const RackElevationDiagram: React.FC = () => {
  const [selectedU, setSelectedU] = useState<string | null>('u41-42');

  const rackItems = [
    { u: 'U42', id: 'u41-42', name: '48-Port ToR Core Switch 01 (Primary)', type: 'switch', status: 'Online (100GbE Uplink)', detail: 'ToR switch connected via redundant fiber trunks. Routes server management & data plane.', color: 'var(--accent)' },
    { u: 'U41', id: 'u41-42', name: '48-Port ToR Core Switch 02 (Redundant)', type: 'switch', status: 'Online (100GbE Uplink)', detail: 'Secondary ToR switch in MLAG / VPC stack pair.', color: 'var(--accent)' },
    { u: 'U40', id: 'u40', name: '24-Port Modular Keystone Patch Panel', type: 'patch', status: 'Structured Cabling', detail: 'Cat6A STP Keystone Panel. All horizontal cabling terminated with ANSI/TIA-606-D labels.', color: 'var(--teal)' },
    { u: 'U39', id: 'u39', name: '1U Horizontal Cable Manager (D-Rings)', type: 'manager', status: 'Velcro Strapped', detail: 'Maintains minimum 4x cable diameter bend radius for copper patch cords.', color: 'var(--muted-light-bg)' },
    { u: 'U38', id: 'u38', name: '24-Port Modular Keystone Patch Panel B', type: 'patch', status: 'Structured Cabling', detail: 'Patch Panel B serving Rack rows 02-04.', color: 'var(--teal)' },
    { u: 'U37', id: 'u37', name: 'Blanking Panel (Airflow Seal)', type: 'blank', status: 'Sealed Cold Aisle', detail: 'Prevents hot exhaust re-circulation back into the cold aisle intake.', color: '#1e293b' },
    { u: 'U36', id: 'u35-36', name: '2U Enterprise Storage Array (SAN Head)', type: 'storage', status: 'Healthy - RAID 10', detail: '12x NVMe U.2 SSD bays. Dual redundant hot-swappable 1100W PSUs.', color: 'var(--indigo)' },
    { u: 'U35', id: 'u35-36', name: '2U Enterprise Storage Array (Cont.)', type: 'storage', status: 'Healthy', detail: 'Storage chassis lower unit.', color: 'var(--indigo)' },
    { u: 'U34', id: 'u33-34', name: 'Dell PowerEdge R760 2U Compute Node 01', type: 'server', status: 'Healthy - iDRAC9 Green', detail: 'Dual Xeon Platinum, 512GB ECC RAM, Quad 25GbE NICs.', color: 'var(--emerald)' },
    { u: 'U33', id: 'u33-34', name: 'Dell PowerEdge R760 (Cont.)', type: 'server', status: 'Healthy', detail: '2U chassis lower bay.', color: 'var(--emerald)' },
    { u: 'U32', id: 'u31-32', name: 'Dell PowerEdge R760 2U Compute Node 02', type: 'server', status: 'Healthy - iDRAC9 Green', detail: 'Dual Xeon Platinum, 512GB ECC RAM, Quad 25GbE NICs.', color: 'var(--emerald)' },
    { u: 'U31', id: 'u31-32', name: 'Dell PowerEdge R760 (Cont.)', type: 'server', status: 'Healthy', detail: '2U chassis lower bay.', color: 'var(--emerald)' },
    { u: 'U30', id: 'u30', name: 'Blanking Panel', type: 'blank', status: 'Sealed', detail: '1U Blanking Panel.', color: '#1e293b' },
    { u: 'U29', id: 'u28-29', name: 'HPE ProLiant DL380 Gen11 Node 03', type: 'server', status: 'Healthy - iLO6 Green', detail: 'Virtualization Host Cluster Node 03.', color: 'var(--emerald)' },
    { u: 'U28', id: 'u28-29', name: 'HPE ProLiant DL380 (Cont.)', type: 'server', status: 'Healthy', detail: '2U chassis lower bay.', color: 'var(--emerald)' },
    { u: 'U1-U27', id: 'u-expansion', name: 'Expansion Space (U1 to U27) & Zero-U Dual Vertical PDUs', type: 'pdu', status: '2x 30A L6-30P Vertical PDUs', detail: 'Side rail mounted zero-U metered/switched PDUs supplying A+B redundant power feeds.', color: 'var(--amber)' }
  ];

  const currentDetail = rackItems.find(item => item.id === selectedU) || rackItems[0];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '24px',
      margin: '28px 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server style={{ color: 'var(--accent)' }} size={22} />
            Interactive 42U Server Rack Elevation &amp; Cabling Schematic
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
            ToR switch interconnect, patch panels, hot/cold aisle thermal vectoring, and zero-U PDU layout.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
            <ArrowDown size={14} /> Cold Air Front Intake
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--rose)' }}>
            <ArrowUp size={14} /> Hot Air Rear Exhaust
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: '24px', alignItems: 'start' }}>
        <div style={{
          background: 'var(--bg-darker)',
          border: '2px solid var(--line)',
          borderRadius: '12px',
          padding: '16px',
          fontFamily: 'monospace'
        }}>
          <div style={{
            background: '#090d16',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--accent)'
          }}>
            <span>42U DATA CENTER RACK #01</span>
            <span style={{ color: 'var(--teal)' }}>100GbE / Cat6A STP</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rackItems.map((item, idx) => {
              const isSelected = selectedU === item.id;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedU(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface)',
                    border: isSelected ? `1.5px solid ${item.color}` : '1px solid var(--line)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--muted)',
                    width: '36px',
                    flexShrink: 0
                  }}>
                    {item.u}
                  </span>

                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 6px ${item.color}`,
                    flexShrink: 0
                  }} />

                  <span style={{
                    fontSize: '0.8rem',
                    color: isSelected ? 'var(--text-heading)' : 'var(--text)',
                    fontWeight: isSelected ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {item.name}
                  </span>

                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    background: 'var(--bg-darker)'
                  }}>
                    {item.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-darker)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--accent)',
              display: 'block',
              marginBottom: '4px'
            }}>
              RACK POSITION INSPECTOR: {currentDetail.u}
            </span>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>
              {currentDetail.name}
            </h4>
          </div>

          <div>
            <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Operational Status:
            </strong>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: `1px solid ${currentDetail.color}`,
              color: currentDetail.color,
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <Activity size={14} /> {currentDetail.status}
            </span>
          </div>

          <div>
            <strong style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Field Cabling &amp; Architectural Specifications:
            </strong>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.55 }}>
              {currentDetail.detail}
            </p>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '14px',
            marginTop: '8px'
          }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Zap size={14} /> Thermal &amp; Cabling Best Practice
            </strong>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--muted-light)', lineHeight: 1.45 }}>
              Always route high-density patch cords down vertical wire managers on the sides to prevent blocking front cold-air intake grills. Use 1U blanking panels in all empty U slots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
