import React from 'react';

interface AdUnitProps {
  slotType: 'top-leaderboard' | 'sidebar-unit' | 'in-feed';
  label?: string;
  style?: React.CSSProperties;
}

interface SlotConfig {
  minHeight: string;
  width?: string;
  maxWidth?: string;
  margin: string;
  padding: string;
  description: string;
}

const ADSENSE_PLACEHOLDERS_ENABLED = false;

export const AdUnitPlaceholder: React.FC<AdUnitProps> = ({ slotType, label = 'Advertisement', style }) => {
  if (!ADSENSE_PLACEHOLDERS_ENABLED) return null;
  const configs: Record<'top-leaderboard' | 'sidebar-unit' | 'in-feed', SlotConfig> = {
    'top-leaderboard': {
      minHeight: '90px',
      width: '100%',
      maxWidth: '970px',
      margin: '16px auto',
      padding: '12px',
      description: 'Responsive Top Leaderboard (728x90 / 970x90)',
    },
    'sidebar-unit': {
      minHeight: '250px',
      width: '100%',
      maxWidth: '300px',
      margin: '20px 0',
      padding: '16px',
      description: 'Sidebar Unit (300x250 Medium Rectangle / 300x600 Skyscraper)',
    },
    'in-feed': {
      minHeight: '120px',
      width: '100%',
      maxWidth: '100%',
      margin: '28px 0',
      padding: '16px',
      description: 'In-Feed Article Native Banner',
    },
  };

  const config = configs[slotType];

  return (
    <div
      className={`adsense-container adsense-${slotType}`}
      style={{
        minHeight: config.minHeight,
        width: config.width,
        maxWidth: config.maxWidth,
        margin: config.margin,
        padding: config.padding,
        background: 'var(--surface)',
        border: '1px dashed var(--line)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
        contentVisibility: 'auto',
        containIntrinsicSize: `0 ${config.minHeight}`,
        ...style,
      }}
      aria-label={`${label} Placeholder`}
    >
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--muted)',
          fontFamily: 'monospace',
          textAlign: 'center',
          opacity: 0.75,
        }}
      >
        Google AdSense Slot • {config.description}
      </span>
    </div>
  );
};
