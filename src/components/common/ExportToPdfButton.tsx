import React, { useState } from 'react';
import { FileDown, Printer, Check } from 'lucide-react';

export const EXPORT_TO_PDF_LABEL = 'Export to PDF';

export interface PrintWindowLike {
  print?: () => void;
}

export interface PrintElementLike {
  setAttribute?: (name: string, value: string) => void;
  removeAttribute?: (name: string) => void;
}

export interface PrintDocumentLike {
  title?: string;
  documentElement?: PrintElementLike;
  querySelector?: (selector: string) => PrintElementLike | null;
}

export interface TriggerA4PdfExportOptions {
  /**
   * Optional document title used as the default PDF filename in the browser's Save as PDF dialog.
   */
  documentTitle?: string;
  /**
   * CSS selector for the active tool report or guide content container to isolate for A4 printing.
   */
  targetSelector?: string;
  /**
   * Scope of the export ('guide' | 'tool-report' | 'auto').
   */
  exportScope?: 'guide' | 'tool-report' | 'auto';
  /**
   * Page orientation for the A4 export ('portrait' | 'landscape'). Defaults to 'portrait'.
   */
  orientation?: 'portrait' | 'landscape';
  /**
   * Optional hook invoked immediately before `window.print()`.
   */
  onBeforePrint?: () => void;
  /**
   * Optional hook invoked after `window.print()` completes.
   */
  onAfterPrint?: () => void;
  /**
   * Optional window override for unit testing.
   */
  winOverride?: PrintWindowLike;
  /**
   * Optional document override for unit testing.
   */
  docOverride?: PrintDocumentLike;
}

export interface ExportToPdfResult {
  ok: boolean;
  pdfTitle: string;
  format: 'A4';
  orientation: 'portrait' | 'landscape';
  exportScope: 'guide' | 'tool-report' | 'auto';
  targetSelector: string;
}

const DEFAULT_ACTIVE_CONTENT_SELECTOR =
  '.quick-note-article, .article-body, [data-testid="note-rendered-content"], [data-print-report], main';

/**
 * Normalizes a guide or tool report title into a clean PDF filename for the native print dialog.
 */
export function formatPdfDocumentTitle(rawTitle?: string): string {
  const cleaned = (rawTitle || '')
    .replace(/\s*\|\s*Jawed.*$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Technical-Report-A4';
  }
  return cleaned;
}

/**
 * Triggers the browser's native print dialog (`window.print()`) configured for
 * a clean ISO 216 A4 export of the active tool report or technical guide content.
 */
export function triggerA4PdfExport(
  options: TriggerA4PdfExportOptions = {}
): ExportToPdfResult {
  const orientation = options.orientation ?? 'portrait';
  const exportScope = options.exportScope ?? 'auto';
  const targetSelector = options.targetSelector || DEFAULT_ACTIVE_CONTENT_SELECTOR;

  if (options.onBeforePrint) {
    try {
      options.onBeforePrint();
    } catch {
      // Ignore pre-print callback errors so native print still proceeds
    }
  }

  const win: PrintWindowLike | undefined =
    options.winOverride ?? (typeof window !== 'undefined' ? window : undefined);
  const doc: PrintDocumentLike | undefined =
    options.docOverride ?? (typeof document !== 'undefined' ? document : undefined);

  const previousTitle = doc?.title ?? '';
  const pdfTitle = formatPdfDocumentTitle(options.documentTitle || previousTitle);

  if (!win || typeof win.print !== 'function') {
    return {
      ok: false,
      pdfTitle,
      format: 'A4',
      orientation,
      exportScope,
      targetSelector,
    };
  }

  const rootEl = doc?.documentElement;
  const targetEl =
    doc && typeof doc.querySelector === 'function'
      ? doc.querySelector(targetSelector)
      : null;

  if (doc) {
    doc.title = pdfTitle;
  }
  rootEl?.setAttribute?.('data-print-format', 'A4');
  rootEl?.setAttribute?.('data-print-orientation', orientation);
  rootEl?.setAttribute?.('data-print-scope', exportScope);
  targetEl?.setAttribute?.('data-active-print-target', 'true');

  try {
    win.print();
    return {
      ok: true,
      pdfTitle,
      format: 'A4',
      orientation,
      exportScope,
      targetSelector,
    };
  } catch {
    return {
      ok: false,
      pdfTitle,
      format: 'A4',
      orientation,
      exportScope,
      targetSelector,
    };
  } finally {
    if (doc && previousTitle) {
      doc.title = previousTitle;
    }
    targetEl?.removeAttribute?.('data-active-print-target');
    rootEl?.removeAttribute?.('data-print-scope');
    if (options.onAfterPrint) {
      try {
        options.onAfterPrint();
      } catch {
        // Ignore post-print callback errors
      }
    }
  }
}

export interface ExportToPdfButtonProps {
  /**
   * Button label (defaults to "Export to PDF").
   */
  label?: string;
  /**
   * Document title used as the clean PDF filename when saving from the native print dialog.
   */
  documentTitle?: string;
  /**
   * CSS selector for the active tool report or guide content container.
   */
  targetSelector?: string;
  /**
   * Scope of the export ('guide' | 'tool-report' | 'auto').
   */
  exportScope?: 'guide' | 'tool-report' | 'auto';
  /**
   * Page orientation ('portrait' | 'landscape'). Defaults to 'portrait'.
   */
  orientation?: 'portrait' | 'landscape';
  /**
   * Visual variant styling.
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'subtle' | 'header';
  /**
   * Button size ('sm' | 'md' | 'lg').
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Icon choice: 'download' | 'printer' (default: 'download').
   */
  iconType?: 'download' | 'printer';
  /**
   * Optional callback fired prior to triggering the A4 PDF print dialog.
   */
  onExport?: () => void;
  /**
   * Additional CSS class names.
   */
  className?: string;
  /**
   * Inline style overrides.
   */
  style?: React.CSSProperties;
  /**
   * Tooltip explanation.
   */
  title?: string;
}

/**
 * ExportToPdfButton
 * Triggers the browser's native print dialog specifically configured for the active
 * tool report or technical guide content in a clean ISO 216 A4 export format.
 */
export const ExportToPdfButton: React.FC<ExportToPdfButtonProps> = ({
  label = EXPORT_TO_PDF_LABEL,
  documentTitle,
  targetSelector,
  exportScope = 'auto',
  orientation = 'portrait',
  variant = 'secondary',
  size = 'sm',
  iconType = 'download',
  onExport,
  className = '',
  style = {},
  title = 'Export active report or guide to a clean A4 PDF using the browser print dialog',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = () => {
    setIsExporting(true);
    triggerA4PdfExport({
      documentTitle,
      targetSelector,
      exportScope,
      orientation,
      onBeforePrint: onExport,
    });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setIsExporting(false);
      }, 1200);
    } else {
      setIsExporting(false);
    }
  };

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
          padding: '4px 12px',
          fontSize: '0.8rem',
          borderRadius: '8px',
          gap: '6px',
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
          padding: '6px 14px',
          fontSize: '0.84rem',
          borderRadius: '8px',
          gap: '6px',
        };
    }
  };

  const IconComponent = isExporting ? Check : iconType === 'printer' ? Printer : FileDown;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 15;

  return (
    <button
      type="button"
      onClick={handleExportClick}
      data-testid="export-pdf-btn"
      data-export-format="A4"
      data-export-scope={exportScope}
      data-export-orientation={orientation}
      className={`export-to-pdf-btn pdf-export-btn no-print button-no-print ${className}`.trim()}
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
        aria-hidden="true"
      />
      <span data-testid="export-pdf-btn-label">{isExporting ? 'Preparing A4 PDF...' : label}</span>
    </button>
  );
};

export default ExportToPdfButton;
