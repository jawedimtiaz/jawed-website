import React from 'react';
import { X, Scale, Globe, ArrowRightLeft, BookOpen } from 'lucide-react';

interface AtAGlanceUnitConversionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConversionRow {
  category: string;
  metric: string;
  imperial: string;
  itContext: string;
}

const CONVERSION_ROWS: ConversionRow[] = [
  { category: 'Length & Distance', metric: '1 Meter (m)', imperial: '3.28 Feet (ft)', itContext: 'Standard horizontal cable run limit (90m channel)' },
  { category: 'Length & Distance', metric: '30.5 Centimeters (cm)', imperial: '1 Foot (ft)', itContext: 'Patch cable length & rack vertical spacing' },
  { category: 'Length & Distance', metric: '2.54 Centimeters (cm)', imperial: '1 Inch (in)', itContext: 'Rack U-height (1U = 1.75 in / 44.45 mm)' },
  { category: 'Length & Distance', metric: '100 Meters (m)', imperial: '328 Feet (ft)', itContext: 'Max horizontal structured cabling channel limit (TIA/EIA-568)' },
  { category: 'Temperature', metric: '20° Celsius (°C)', imperial: '68° Fahrenheit (°F)', itContext: 'Standard TIA-568 ambient reference environment' },
  { category: 'Temperature', metric: '25° Celsius (°C)', imperial: '77° Fahrenheit (°F)', itContext: 'Recommended server room / datacenter operating temp' },
  { category: 'Temperature', metric: '35° Celsius (°C)', imperial: '95° Fahrenheit (°F)', itContext: 'Maximum warm warehouse / IDF closet ambient' },
  { category: 'Temperature', metric: '50° Celsius (°C)', imperial: '122° Fahrenheit (°F)', itContext: 'Elevated ceiling plenum / conduit thermal threshold' },
  { category: 'Power & Cooling', metric: '1 Kilowatt (kW)', imperial: '3,412 BTU/hr', itContext: 'Active server power consumption to thermal dissipation' },
  { category: 'Power & Cooling', metric: '1 Ton of Cooling', imperial: '12,000 BTU/hr (3.52 kW)', itContext: 'HVAC datacenter CRAC / In-row cooler capacity' },
  { category: 'Power & Cooling', metric: '100 Watts (W)', imperial: '341.2 BTU/hr', itContext: 'PoE switch port / edge device thermal load' },
  { category: 'Rack Dimensions', metric: '1U Height (44.45 mm)', imperial: '1.75 Inches (in)', itContext: 'Standard server / switch vertical rack unit' },
  { category: 'Rack Dimensions', metric: '42U Enclosure', imperial: '73.5 Inches (6.12 ft)', itContext: 'Standard enterprise floor rack height' },
];

export const AtAGlanceUnitConversionsModal: React.FC<AtAGlanceUnitConversionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="at-a-glance-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '8px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent)',
              }}
            >
              <Scale className="w-5 h-5 text-sky-400" />
            </span>
            <div>
              <h2
                id="at-a-glance-title"
                style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}
              >
                At-a-Glance Unit Conversion Reference
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Common Metric to Imperial conversions for international IT field technicians &amp; engineers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="button button-secondary"
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.84rem',
              color: 'var(--text)',
            }}
          >
            <BookOpen className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>
              Values update automatically across all active server rack, cable length, and storage calculation tools based on your global settings toggle.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Metric Unit</th>
                  <th style={{ padding: '10px 12px' }}>Imperial Unit</th>
                  <th style={{ padding: '10px 12px' }}>IT Field Application Context</th>
                </tr>
              </thead>
              <tbody>
                {CONVERSION_ROWS.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--surface-accent)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.8rem' }}>
                      {row.category}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#38bdf8' }}>
                      {row.metric}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#10b981' }}>
                      {row.imperial}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {row.itContext}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--surface-accent)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="button button-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Got it, return to tools
          </button>
        </div>
      </div>
    </div>
  );
};
