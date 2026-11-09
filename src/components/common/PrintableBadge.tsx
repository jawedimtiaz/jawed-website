import React from 'react';
import { Printer } from 'lucide-react';

export interface PrintableBadgeProps {
  /** Text label (defaults to 'Printable') */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Visual variant: 'subtle' (default), 'compact' (smaller), or 'outline' */
  variant?: 'subtle' | 'compact' | 'outline';
  /** Tooltip explanation */
  title?: string;
  /** Additional custom class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Whether to render the small printer icon (default: true) */
  showIcon?: boolean;
}

/**
 * PrintableBadge
 * A small, visually subtle indicator that explicitly signifies an IT tool or
 * technical guide has dedicated print stylesheet and A4/Letter PDF export support.
 */
export const PrintableBadge: React.FC<PrintableBadgeProps> = ({
  label = 'Printable',
  size = 'sm',
  variant = 'subtle',
  title = 'Print-optimized: Supports clean A4/Letter PDF and paper export',
  className = '',
  style,
  showIcon = true,
}) => {
  const iconSize = size === 'sm' ? 11 : 12;
  const fontSize = size === 'sm' ? '0.72rem' : '0.78rem';
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span
      className={`printable-badge variant-${variant} size-${size} no-print ${className}`.trim()}
      data-testid="printable-badge"
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize,
        fontWeight: 600,
        color: 'var(--muted, #94a3b8)',
        background: 'rgba(148, 163, 184, 0.08)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderRadius: '5px',
        padding,
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
      }}
    >
      {showIcon && (
        <Printer
          size={iconSize}
          className="printable-icon"
          style={{ opacity: 0.85, flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

export default PrintableBadge;
