import React, { useState } from 'react';
import { useUnitSystem, UnitSystem } from '../../hooks/useUnitSystem';
import { Globe, Info } from 'lucide-react';
import { AtAGlanceUnitConversionsModal } from './AtAGlanceUnitConversionsModal';

interface UnitSystemToggleProps {
  compact?: boolean;
  className?: string;
  label?: string;
  showDetails?: boolean;
}

export const UnitSystemToggle: React.FC<UnitSystemToggleProps> = ({
  compact = false,
  className = '',
  label = 'Unit System:',
  showDetails = true,
}) => {
  const { unitSystem, setUnitSystem, isMetric } = useUnitSystem();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        className={`unit-system-toggle-container ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '4px 8px' : '6px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          fontSize: '0.8rem',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-heading)', fontWeight: 700 }}>
          <Globe size={14} className="text-sky-400" />
          {!compact && label && <span style={{ color: 'var(--text-muted)' }}>{label}</span>}
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg)',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={() => setUnitSystem('metric')}
            style={{
              padding: compact ? '2px 8px' : '4px 10px',
              fontSize: compact ? '0.72rem' : '0.78rem',
              fontWeight: isMetric ? 800 : 500,
              borderRadius: '6px',
              background: isMetric ? 'var(--accent)' : 'transparent',
              color: isMetric ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Metric Unit System (Meters, Celsius, kW, m³/h, kg)"
          >
            <span>🌍 Metric</span>
            {!compact && showDetails && <span style={{ opacity: 0.8, fontSize: '0.68rem' }}>(m, °C, kW)</span>}
          </button>

          <button
            type="button"
            onClick={() => setUnitSystem('imperial')}
            style={{
              padding: compact ? '2px 8px' : '4px 10px',
              fontSize: compact ? '0.72rem' : '0.78rem',
              fontWeight: !isMetric ? 800 : 500,
              borderRadius: '6px',
              background: !isMetric ? 'var(--accent)' : 'transparent',
              color: !isMetric ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Imperial Unit System (Feet, Fahrenheit, BTU/hr, CFM, lbs)"
          >
            <span>🇺🇸 Imperial</span>
            {!compact && showDetails && <span style={{ opacity: 0.8, fontSize: '0.68rem' }}>(ft, °F, BTU)</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="button button-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: compact ? '3px 6px' : '4px 8px',
            borderRadius: '6px',
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
          }}
          title="View At-a-Glance Unit Conversion Reference Table for IT Field Techs"
          aria-label="View unit conversion reference table"
        >
          <Info size={13} className="text-sky-400" />
        </button>
      </div>

      <AtAGlanceUnitConversionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
