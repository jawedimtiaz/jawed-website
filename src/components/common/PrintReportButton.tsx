import React from 'react';
import { Printer } from 'lucide-react';

export interface PrintReportButtonProps {
  onOpenPrintPreview: () => void;
  label?: string;
  className?: string;
  title?: string;
}

export const PrintReportButton: React.FC<PrintReportButtonProps> = ({
  onOpenPrintPreview,
  label = 'Print Report',
  className = 'button button-secondary no-print',
  title = 'Open print-optimized professional A4/Letter engineering report preview',
}) => {
  return (
    <button
      type="button"
      className={className}
      onClick={onOpenPrintPreview}
      data-testid="print-report-btn"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.82rem',
        padding: '6px 14px',
        borderRadius: '8px',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        background: 'var(--surface)',
        color: 'var(--accent)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      title={title}
    >
      <Printer className="w-4 h-4 text-sky-400" />
      {label}
    </button>
  );
};
