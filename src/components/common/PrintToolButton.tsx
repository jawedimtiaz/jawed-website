import React, { useState } from 'react';
import { Printer, Check } from 'lucide-react';

export interface TriggerToolPrintOptions {
  documentTitle?: string;
  onBeforePrint?: () => void;
}

/**
 * Triggers the browser's native print dialog (`window.print()`), leveraging
 * the application's `@media print` CSS rules for clean document exports.
 */
export function triggerToolPrint(options?: TriggerToolPrintOptions): boolean {
  if (options?.onBeforePrint) {
    try {
      options.onBeforePrint();
    } catch {
      // Ignore pre-print hook errors
    }
  }

  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    return false;
  }

  const hasDoc = typeof document !== 'undefined';
  const previousTitle = hasDoc ? document.title : '';

  if (hasDoc && options?.documentTitle) {
    document.title = options.documentTitle;
  }

  try {
    window.print();
    return true;
  } finally {
    if (hasDoc && options?.documentTitle) {
      document.title = previousTitle;
    }
  }
}

export interface PrintToolButtonProps {
  label?: string;
  documentTitle?: string;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onBeforePrint?: () => void;
}

export const PrintToolButton: React.FC<PrintToolButtonProps> = ({
  label = 'Print this Tool',
  documentTitle,
  size = 'md',
  className = '',
  style,
  title = 'Print this Tool — Export a clean engineering report using @media print styles',
  onBeforePrint,
}) => {
  const [justTriggered, setJustTriggered] = useState(false);

  const handleClick = () => {
    const printed = triggerToolPrint({ documentTitle, onBeforePrint });
    if (printed) {
      setJustTriggered(true);
      window.setTimeout(() => {
        setJustTriggered(false);
      }, 1500);
    }
  };

  const padding = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? '0.78rem' : '0.82rem';
  const iconSize = size === 'sm' ? 13 : 15;

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="print-this-tool-btn"
      aria-label={label}
      title={title}
      className={`button button-secondary print-this-tool-btn no-print ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        ...style,
      }}
    >
      {justTriggered ? (
        <Check width={iconSize} height={iconSize} className="text-emerald-400" aria-hidden="true" />
      ) : (
        <Printer width={iconSize} height={iconSize} className="text-sky-400" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
};

export default PrintToolButton;
