import React, { useState } from 'react';
import { Printer, Check, FileDown } from 'lucide-react';

export interface PdfExportButtonProps {
  /** Optional custom button label (default: "Export PDF") */
  label?: string;
  /** Visual variant styling */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'subtle' | 'header';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Tooltip title */
  title?: string;
  /** Optional callback fired prior to triggering PDF print */
  onExport?: () => void;
  /** Optional document title override to give the saved PDF file a clean filename */
  documentTitle?: string;
  /** Icon choice: 'printer' | 'download' (default: 'printer') */
  iconType?: 'printer' | 'download';
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  label = 'Export PDF',
  variant = 'secondary',
  size = 'sm',
  className = '',
  style = {},
  title = 'Export or print clean PDF document using print-friendly layout',
  onExport,
  documentTitle,
  iconType = 'printer',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = () => {
    setIsExporting(true);

    if (onExport) {
      try {
        onExport();
      } catch (err) {
        console.warn('PDF Export pre-hook error:', err);
      }
    }

    const previousTitle = document.title;
    if (documentTitle) {
      document.title = documentTitle;
    }

    // Small delay to allow state updates or UI layout adjustments before print dialog
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Failed to trigger window.print():', err);
      } finally {
        if (documentTitle) {
          document.title = previousTitle;
        }
        setTimeout(() => setIsExporting(false), 1200);
      }
    }, 100);
  };

  // Base styling depending on variant & size
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--accent, #0284c7)',
          color: '#ffffff',
          border: '1px solid transparent',
          fontWeight: 600,
        };
      case 'secondary':
        return {
          background: 'rgba(56, 189, 248, 0.12)',
          color: 'var(--accent, #38bdf8)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          fontWeight: 600,
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--text)',
          border: '1px solid var(--border, #334155)',
          fontWeight: 500,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-muted)',
          border: '1px solid transparent',
          fontWeight: 500,
        };
      case 'subtle':
        return {
          background: 'var(--surface-hover, rgba(255, 255, 255, 0.05))',
          color: 'var(--text-muted)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          fontWeight: 500,
        };
      case 'header':
        return {
          background: 'rgba(15, 23, 42, 0.6)',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontWeight: 600,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '4px 10px',
          fontSize: '0.8rem',
          borderRadius: '6px',
          gap: '5px',
        };
      case 'lg':
        return {
          padding: '10px 18px',
          fontSize: '0.95rem',
          borderRadius: '10px',
          gap: '8px',
        };
      case 'md':
      default:
        return {
          padding: '7px 14px',
          fontSize: '0.875rem',
          borderRadius: '8px',
          gap: '6px',
        };
    }
  };

  const IconComponent = isExporting ? Check : iconType === 'download' ? FileDown : Printer;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button
      type="button"
      onClick={handleExportPdf}
      className={`no-print button-no-print ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      title={title}
      aria-label={label}
    >
      <IconComponent
        size={iconSize}
        className={isExporting ? 'text-emerald-400' : ''}
        style={{ flexShrink: 0 }}
      />
      <span>{isExporting ? 'Opening PDF...' : label}</span>
    </button>
  );
};

export default PdfExportButton;
