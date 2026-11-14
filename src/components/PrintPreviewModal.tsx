import React, { useState, useEffect, useMemo } from 'react';
import { Printer, Eye, X, List, Image as ImageIcon, Code, FileText } from 'lucide-react';
import {
  triggerA4PdfExport,
  type TriggerA4PdfExportOptions,
  type ExportToPdfResult,
  type PrintDocumentLike,
} from './common/ExportToPdfButton';
import type { TocItem } from '../utils/tocGenerator';

export const PRINT_PREVIEW_LABEL = 'Print Preview';

export const A4_DIMENSIONS_MM = {
  widthMm: 210,
  heightMm: 297,
  aspectRatio: '210 / 297',
} as const;

export interface PrintPreviewToggleOptions {
  /** Whether to include the Table of Contents in the A4 preview and print output */
  includeToc: boolean;
  /** Whether to include images, figures, and diagrams in the A4 preview and print output */
  includeImages: boolean;
  /** Whether to include technical code blocks in the A4 preview and print output */
  includeCodeBlocks: boolean;
  /** Whether to include the engineering metadata header block at the top of the A4 page */
  includeMetadataHeader: boolean;
}

export const DEFAULT_PRINT_PREVIEW_OPTIONS: PrintPreviewToggleOptions = {
  includeToc: true,
  includeImages: true,
  includeCodeBlocks: true,
  includeMetadataHeader: true,
};

export function resolvePrintPreviewOptions(
  overrides?: Partial<PrintPreviewToggleOptions>
): PrintPreviewToggleOptions {
  return {
    includeToc: overrides?.includeToc ?? DEFAULT_PRINT_PREVIEW_OPTIONS.includeToc,
    includeImages: overrides?.includeImages ?? DEFAULT_PRINT_PREVIEW_OPTIONS.includeImages,
    includeCodeBlocks:
      overrides?.includeCodeBlocks ?? DEFAULT_PRINT_PREVIEW_OPTIONS.includeCodeBlocks,
    includeMetadataHeader:
      overrides?.includeMetadataHeader ??
      DEFAULT_PRINT_PREVIEW_OPTIONS.includeMetadataHeader,
  };
}

/**
 * Transforms guide HTML content for the simulated A4 view based on user-selected
 * visual element toggles (e.g., hiding images/diagrams or code blocks) and strips
 * interactive-only buttons (such as heading copy-link and code copy-markdown buttons).
 */
export function applyPrintPreviewTogglesToHtml(
  rawHtml: string,
  options?: Partial<PrintPreviewToggleOptions>
): string {
  if (!rawHtml) return '';
  const resolved = resolvePrintPreviewOptions(options);
  let output = rawHtml;

  // Strip interactive-only copy buttons so the simulated A4 page looks like clean paper
  output = output.replace(
    /<button[^>]*class="[^"]*(?:note-heading-copy-btn|note-code-markdown-copy-btn)[^"]*"[^>]*>[\s\S]*?<\/button>/gi,
    ''
  );
  output = output.replace(
    /<div[^>]*class="[^"]*note-code-block-toolbar[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  if (!resolved.includeImages) {
    output = output.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '');
    output = output.replace(/<img\b[^>]*\/?>/gi, '');
    output = output.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
  }

  if (!resolved.includeCodeBlocks) {
    output = output.replace(
      /<div[^>]*class="[^"]*note-code-block-wrapper[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      ''
    );
    output = output.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, '');
  }

  return output;
}

/**
 * Synchronizes the user's Print Preview element visibility toggles onto the root
 * document element so `@media print` CSS rules honor them during native printing.
 */
export function syncPrintPreviewAttributesToDom(
  options?: Partial<PrintPreviewToggleOptions>,
  docOverride?: PrintDocumentLike
): PrintPreviewToggleOptions {
  const resolved = resolvePrintPreviewOptions(options);
  const doc: PrintDocumentLike | undefined =
    docOverride ?? (typeof document !== 'undefined' ? document : undefined);
  const rootEl = doc?.documentElement;

  if (rootEl?.setAttribute) {
    rootEl.setAttribute('data-print-hide-toc', resolved.includeToc ? 'false' : 'true');
    rootEl.setAttribute(
      'data-print-hide-images',
      resolved.includeImages ? 'false' : 'true'
    );
    rootEl.setAttribute(
      'data-print-hide-code',
      resolved.includeCodeBlocks ? 'false' : 'true'
    );
    rootEl.setAttribute(
      'data-print-hide-header',
      resolved.includeMetadataHeader ? 'false' : 'true'
    );
  }

  return resolved;
}

export function clearPrintPreviewAttributesFromDom(
  docOverride?: PrintDocumentLike
): void {
  const doc: PrintDocumentLike | undefined =
    docOverride ?? (typeof document !== 'undefined' ? document : undefined);
  const rootEl = doc?.documentElement;

  if (rootEl?.removeAttribute) {
    rootEl.removeAttribute('data-print-hide-toc');
    rootEl.removeAttribute('data-print-hide-images');
    rootEl.removeAttribute('data-print-hide-code');
    rootEl.removeAttribute('data-print-hide-header');
  }
}

export interface SendPreviewToPrinterOptions
  extends Partial<PrintPreviewToggleOptions>,
    TriggerA4PdfExportOptions {}

export interface SendPreviewToPrinterResult extends ExportToPdfResult {
  toggles: PrintPreviewToggleOptions;
}

/**
 * Applies the selected visual element toggles (Table of Contents, images, code blocks, header)
 * and sends the active A4 guide view to the browser's native print dialog.
 */
export function sendPreviewToNativePrinter(
  options: SendPreviewToPrinterOptions = {}
): SendPreviewToPrinterResult {
  const toggles = syncPrintPreviewAttributesToDom(options, options.docOverride);

  try {
    const exportResult = triggerA4PdfExport({
      ...options,
      exportScope: options.exportScope ?? 'guide',
      orientation: options.orientation ?? 'portrait',
    });

    return {
      ...exportResult,
      toggles,
    };
  } finally {
    clearPrintPreviewAttributesFromDom(options.docOverride);
  }
}

export interface PrintPreviewModalProps {
  /** Whether the Print Preview modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Guide title */
  title: string;
  /** Guide subtitle or summary */
  description?: string;
  /** Guide category label */
  category?: string;
  /** Verified/updated date string */
  lastUpdated?: string;
  /** Guide slug for canonical source display */
  slug?: string;
  /** Rendered HTML content of the guide */
  htmlContent: string;
  /** Parsed h2/h3 Table of Contents headings */
  tocItems?: TocItem[];
  /** Target selector for native print isolation */
  targetSelector?: string;
  /** Initial toggle state overrides */
  defaultOptions?: Partial<PrintPreviewToggleOptions>;
  /** Optional callback fired when sending to the native printer */
  onSendToPrinter?: (result: SendPreviewToPrinterResult) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  category = 'Technical Guide',
  lastUpdated,
  slug,
  htmlContent,
  tocItems = [],
  targetSelector = '.quick-note-article',
  defaultOptions,
  onSendToPrinter,
}) => {
  const [options, setOptions] = useState<PrintPreviewToggleOptions>(() =>
    resolvePrintPreviewOptions(defaultOptions)
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const previewHtml = useMemo(
    () => applyPrintPreviewTogglesToHtml(htmlContent, options),
    [htmlContent, options]
  );

  if (!isOpen) {
    return null;
  }

  const handleToggleOption = (key: keyof PrintPreviewToggleOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrintNow = () => {
    const result = sendPreviewToNativePrinter({
      ...options,
      documentTitle: title,
      targetSelector,
      exportScope: 'guide',
      orientation: 'portrait',
    });
    onSendToPrinter?.(result);
  };

  return (
    <div
      className="print-preview-modal-backdrop no-print"
      data-testid="print-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Print Preview — ${title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="print-preview-modal-dialog" data-testid="print-preview-dialog">
        {/* Top Toolbar: Title, Visual Element Toggles & Native Print Trigger */}
        <header className="print-preview-toolbar">
          <div className="print-preview-toolbar-left">
            <span className="print-preview-badge">ISO 216 A4 (210 × 297 mm)</span>
            <h2 className="print-preview-title">Print Preview</h2>
          </div>

          <div
            className="print-preview-toggles"
            role="group"
            aria-label="Toggle visual elements in print output"
            data-testid="print-preview-toggles"
          >
            <label className="print-preview-toggle-item">
              <input
                type="checkbox"
                checked={options.includeToc}
                onChange={() => handleToggleOption('includeToc')}
                data-testid="print-preview-toggle-toc"
              />
              <List size={14} aria-hidden="true" />
              <span>Table of Contents</span>
            </label>

            <label className="print-preview-toggle-item">
              <input
                type="checkbox"
                checked={options.includeImages}
                onChange={() => handleToggleOption('includeImages')}
                data-testid="print-preview-toggle-images"
              />
              <ImageIcon size={14} aria-hidden="true" />
              <span>Images &amp; Diagrams</span>
            </label>

            <label className="print-preview-toggle-item">
              <input
                type="checkbox"
                checked={options.includeCodeBlocks}
                onChange={() => handleToggleOption('includeCodeBlocks')}
                data-testid="print-preview-toggle-code"
              />
              <Code size={14} aria-hidden="true" />
              <span>Code Blocks</span>
            </label>

            <label className="print-preview-toggle-item">
              <input
                type="checkbox"
                checked={options.includeMetadataHeader}
                onChange={() => handleToggleOption('includeMetadataHeader')}
                data-testid="print-preview-toggle-header"
              />
              <FileText size={14} aria-hidden="true" />
              <span>Metadata Header</span>
            </label>
          </div>

          <div className="print-preview-actions">
            <button
              type="button"
              onClick={handlePrintNow}
              data-testid="print-preview-confirm-print-btn"
              className="button button-primary print-preview-print-btn"
              title="Send this configured A4 layout to the browser's native printer or Save as PDF"
            >
              <Printer size={15} aria-hidden="true" />
              <span>Send to Printer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="print-preview-close-btn"
              className="button button-secondary print-preview-close-btn"
              aria-label="Close Print Preview"
              title="Close Print Preview (Esc)"
            >
              <X size={15} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
        </header>

        {/* Simulated A4 Viewport & Sheet */}
        <div className="print-preview-stage" data-testid="print-preview-stage">
          <article
            className="print-preview-a4-sheet"
            data-testid="print-preview-a4-sheet"
            data-paper-size="A4"
            data-width-mm={A4_DIMENSIONS_MM.widthMm}
            data-height-mm={A4_DIMENSIONS_MM.heightMm}
            data-include-toc={options.includeToc}
            data-include-images={options.includeImages}
            data-include-code={options.includeCodeBlocks}
            data-include-header={options.includeMetadataHeader}
          >
            {/* Optional Engineering Header inside A4 Sheet */}
            {options.includeMetadataHeader && (
              <header
                className="print-preview-a4-header"
                data-testid="print-preview-a4-header"
              >
                <div className="print-preview-a4-brand">
                  Jawed Imtiaz • Technical Engineering Guide &amp; Knowledge Base
                </div>
                <h1 className="print-preview-a4-doc-title">{title}</h1>
                {description && (
                  <p className="print-preview-a4-doc-desc">{description}</p>
                )}
                <div className="print-preview-a4-meta-row">
                  <span>
                    <strong>Category:</strong> {category}
                  </span>
                  {lastUpdated && (
                    <span>
                      <strong>Last Verified:</strong> {lastUpdated}
                    </span>
                  )}
                  {slug && (
                    <span>
                      <strong>Source:</strong> jawed.co.in/notes/{slug}
                    </span>
                  )}
                </div>
              </header>
            )}

            {/* Optional Table of Contents inside A4 Sheet */}
            {options.includeToc && tocItems.length > 0 && (
              <nav
                className="print-preview-a4-toc"
                data-testid="print-preview-a4-toc"
                aria-label="Print Preview Table of Contents"
              >
                <div className="print-preview-a4-toc-title">
                  Table of Contents ({tocItems.length} sections)
                </div>
                <ol className="print-preview-a4-toc-list">
                  {tocItems.map((item) => (
                    <li
                      key={item.id}
                      className={`print-preview-a4-toc-item level-${item.level}`}
                    >
                      {item.text}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Simulated A4 Body Content */}
            <div
              className="print-preview-a4-body"
              data-testid="print-preview-a4-body"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </article>
        </div>
      </div>
    </div>
  );
};

export interface PrintPreviewButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PrintPreviewButton: React.FC<PrintPreviewButtonProps> = ({
  onClick,
  label = PRINT_PREVIEW_LABEL,
  className = '',
  style = {},
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="print-preview-open-btn"
      className={`button button-secondary no-print print-preview-open-btn ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
        ...style,
      }}
      aria-label="Open A4 Print Preview modal"
      title="Open simulated A4 Print Preview and toggle Table of Contents or images before printing"
    >
      <Eye size={14} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
};

export default PrintPreviewModal;
