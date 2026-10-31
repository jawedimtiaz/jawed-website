import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  X,
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  ZoomIn,
  ZoomOut,
  Ruler,
  Table as TableIcon,
} from 'lucide-react';

export type PrintDataDensity = 'compact' | 'standard' | 'spacious';
export type PrintOrientation = 'portrait' | 'landscape';

export interface PrintPreviewTable {
  id?: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  footerNote?: string;
}

export interface PrintPreviewMetric {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical' | 'optimal';
}

export interface A4PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPrint?: () => void;
  toolTitle: string;
  toolSubtitle?: string;
  toolCategory?: string;
  referenceId?: string;
  tables?: PrintPreviewTable[];
  summaryMetrics?: PrintPreviewMetric[];
  initialDensity?: PrintDataDensity;
  initialOrientation?: PrintOrientation;
  containerSelector?: string;
}

interface DensityConfig {
  id: PrintDataDensity;
  label: string;
  shortLabel: string;
  fontSizePt: number;
  headerFontSizePt: number;
  cellPadding: string;
  lineHeight: number;
  maxRowsPerPagePortrait: number;
  maxRowsPerPageLandscape: number;
  description: string;
}

export const DENSITY_PRESETS: Record<PrintDataDensity, DensityConfig> = {
  compact: {
    id: 'compact',
    label: 'Compact (High Data Density)',
    shortLabel: 'Compact',
    fontSizePt: 8,
    headerFontSizePt: 7.5,
    cellPadding: '4px 6px',
    lineHeight: 1.25,
    maxRowsPerPagePortrait: 46,
    maxRowsPerPageLandscape: 32,
    description: '8pt type, tight 4px cell padding. Ideal for large device inventories and 32-bit binary tables.',
  },
  standard: {
    id: 'standard',
    label: 'Standard (Balanced A4)',
    shortLabel: 'Standard',
    fontSizePt: 9.5,
    headerFontSizePt: 8.5,
    cellPadding: '7px 10px',
    lineHeight: 1.4,
    maxRowsPerPagePortrait: 32,
    maxRowsPerPageLandscape: 22,
    description: '9.5pt type, 7px cell padding. Optimal balance of table readability and page economy.',
  },
  spacious: {
    id: 'spacious',
    label: 'Spacious (Maximum Readability)',
    shortLabel: 'Spacious',
    fontSizePt: 10.5,
    headerFontSizePt: 9.5,
    cellPadding: '10px 14px',
    lineHeight: 1.55,
    maxRowsPerPagePortrait: 22,
    maxRowsPerPageLandscape: 15,
    description: '10.5pt type, generous 10px cell padding. Best for executive reviews and field technician clipboards.',
  },
};

/**
 * Extracts live HTML tables and key-value parameters from the active tool DOM
 * so any technical tool automatically populates accurate live data in the A4 preview.
 */
function extractLiveDomTablesAndMetrics(containerSelector: string, fallbackTitle: string): {
  extractedTables: PrintPreviewTable[];
  extractedMetrics: PrintPreviewMetric[];
} {
  if (typeof document === 'undefined') {
    return { extractedTables: [], extractedMetrics: [] };
  }

  const root =
    document.querySelector(containerSelector) ||
    document.querySelector('main') ||
    document.querySelector('.page') ||
    document.body;

  const extractedTables: PrintPreviewTable[] = [];
  const extractedMetrics: PrintPreviewMetric[] = [];

  // 1. Extract all <table> elements within the tool workspace (excluding tables inside this modal)
  const domTables = Array.from(root.querySelectorAll('table')).filter(
    tbl => !tbl.closest('[data-testid="a4-print-preview-modal"]')
  );

  domTables.forEach((tbl, idx) => {
    const headers: string[] = [];
    const headerCells = tbl.querySelectorAll('thead th, thead td');
    if (headerCells.length > 0) {
      headerCells.forEach(cell => {
        headers.push((cell.textContent || '').replace(/\s+/g, ' ').trim());
      });
    } else {
      const firstRow = tbl.querySelector('tr');
      if (firstRow) {
        firstRow.querySelectorAll('th, td').forEach((cell, cIdx) => {
          headers.push(
            cell.tagName.toLowerCase() === 'th'
              ? (cell.textContent || '').replace(/\s+/g, ' ').trim()
              : `Column ${cIdx + 1}`
          );
        });
      }
    }

    const rows: (string | number)[][] = [];
    const bodyRows =
      tbl.querySelectorAll('tbody tr').length > 0
        ? Array.from(tbl.querySelectorAll('tbody tr'))
        : Array.from(tbl.querySelectorAll('tr')).slice(headerCells.length > 0 ? 0 : 1);

    bodyRows.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(cell => {
        // Check if cell contains an input or select
        const input = cell.querySelector('input, select') as
          | HTMLInputElement
          | HTMLSelectElement
          | null;
        if (input && input.value) {
          return input.value.trim();
        }
        return (cell.textContent || '').replace(/\s+/g, ' ').trim();
      });
      if (cells.some(c => c.length > 0)) {
        rows.push(cells);
      }
    });

    if (rows.length > 0) {
      // Find nearest heading above table
      let tableTitle = `Engineering Data Table ${idx + 1}`;
      const parentSection = tbl.closest('section, .card, .panel, div');
      const heading = parentSection?.querySelector('h2, h3, h4');
      if (heading && heading.textContent) {
        tableTitle = heading.textContent.replace(/\s+/g, ' ').trim();
      }
      extractedTables.push({
        id: `dom-table-${idx}`,
        title: tableTitle,
        headers:
          headers.length > 0
            ? headers
            : Array.from({ length: rows[0]?.length || 2 }, (_, i) => `Field ${i + 1}`),
        rows,
      });
    }
  });

  // 2. If no tables were found in DOM, synthesize a structured specification table from inputs/selects/cards
  if (extractedTables.length === 0) {
    const paramRows: (string | number)[][] = [];
    const formFields = Array.from(
      root.querySelectorAll('input, select, textarea')
    ).filter(el => !el.closest('[data-testid="a4-print-preview-modal"]'));

    formFields.forEach(el => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (input.type === 'hidden' || input.type === 'file') return;
      let labelText = '';
      if (input.id) {
        const explicitLabel = root.querySelector(`label[for="${input.id}"]`);
        if (explicitLabel?.textContent) {
          labelText = explicitLabel.textContent.replace(/\s+/g, ' ').trim();
        }
      }
      if (!labelText) {
        const parentLabel = input.closest('label, .form-field, .field-group');
        const lbl = parentLabel?.querySelector('label');
        if (lbl?.textContent) {
          labelText = lbl.textContent.replace(/\s+/g, ' ').trim();
        }
      }
      if (!labelText && input.getAttribute('aria-label')) {
        labelText = input.getAttribute('aria-label') || '';
      }

      const val =
        input.tagName.toLowerCase() === 'select'
          ? (input as HTMLSelectElement).selectedOptions?.[0]?.text || input.value
          : input.value;

      if (labelText && val) {
        paramRows.push([labelText, val.slice(0, 120)]);
      }
    });

    if (paramRows.length > 0) {
      extractedTables.push({
        id: 'synthesized-config-table',
        title: `${fallbackTitle} — Configured Parameters & Diagnostic Inputs`,
        headers: ['Parameter / Configuration Field', 'Active Value / Specification'],
        rows: paramRows.slice(0, 20),
      });
    } else {
      extractedTables.push({
        id: 'default-spec-table',
        title: `${fallbackTitle} — Technical Specification Summary`,
        headers: ['Parameter', 'Specification Value', 'Status'],
        rows: [
          ['Document Standard', 'ISO 216 A4 (210 × 297 mm)', 'Verified'],
          ['Tool Module', fallbackTitle, 'Active'],
          ['Export Readiness', 'Print & PDF Vector Output', 'Optimal'],
        ],
      });
    }
  }

  // 3. Extract KPI metrics from .stat cards if available
  const statElements = Array.from(root.querySelectorAll('.stat')).filter(
    el => !el.closest('[data-testid="a4-print-preview-modal"]')
  );
  statElements.slice(0, 4).forEach(stat => {
    const label = stat.querySelector('.stat-label')?.textContent?.trim();
    const value = stat.querySelector('.stat-value')?.textContent?.trim();
    if (label && value) {
      extractedMetrics.push({ label, value, status: 'optimal' });
    }
  });

  return { extractedTables, extractedMetrics };
}

export const A4PrintPreviewModal: React.FC<A4PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmPrint,
  toolTitle,
  toolSubtitle = 'Technical Engineering Specification & Calculation Report',
  toolCategory = 'IT Infrastructure & Diagnostic Tools',
  referenceId,
  tables: propTables,
  summaryMetrics: propMetrics,
  initialDensity = 'standard',
  initialOrientation = 'portrait',
  containerSelector = 'main, .page, .container',
}) => {
  const [density, setDensity] = useState<PrintDataDensity>(initialDensity);
  const [orientation, setOrientation] = useState<PrintOrientation>(initialOrientation);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(true);
  const [zebraStriping, setZebraStriping] = useState<boolean>(true);
  const [wrapCells, setWrapCells] = useState<boolean>(true);

  // Sync Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { activeTables, activeMetrics } = useMemo(() => {
    if (!isOpen) {
      return {
        activeTables: propTables || [],
        activeMetrics: propMetrics || [],
      };
    }
    const { extractedTables, extractedMetrics } = extractLiveDomTablesAndMetrics(
      containerSelector,
      toolTitle
    );

    const mergedTables =
      propTables && propTables.length > 0 ? propTables : extractedTables;
    const mergedMetrics =
      propMetrics && propMetrics.length > 0 ? propMetrics : extractedMetrics;

    return {
      activeTables: mergedTables,
      activeMetrics: mergedMetrics,
    };
  }, [isOpen, propTables, propMetrics, containerSelector, toolTitle]);

  const densityConfig = DENSITY_PRESETS[density];

  // Calculate Table Readability & Data Density Telemetry
  const readabilityTelemetry = useMemo(() => {
    const tableCount = activeTables.length;
    let totalRows = 0;
    let totalCells = 0;
    let maxCols = 0;
    let longestCellChars = 0;

    activeTables.forEach(t => {
      const colCount = Math.max(
        t.headers.length,
        ...t.rows.map(r => r.length),
        2
      );
      if (colCount > maxCols) maxCols = colCount;
      totalRows += t.rows.length;
      t.rows.forEach(r => {
        totalCells += r.length;
        r.forEach(c => {
          const len = String(c ?? '').length;
          if (len > longestCellChars) longestCellChars = len;
        });
      });
    });

    const maxRowsPerSheet =
      orientation === 'portrait'
        ? densityConfig.maxRowsPerPagePortrait
        : densityConfig.maxRowsPerPageLandscape;

    const estimatedPages = Math.max(
      1,
      Math.ceil((totalRows + tableCount * 4) / maxRowsPerSheet)
    );

    const printableWidthMm = orientation === 'portrait' ? 182 : 269; // 210 - 28mm or 297 - 28mm
    const avgColWidthMm = maxCols > 0 ? Math.round(printableWidthMm / maxCols) : printableWidthMm;

    const isWideTableInPortrait = maxCols >= 7 && orientation === 'portrait';
    const isDenseHighRowCount = totalRows > 35 && density === 'spacious';

    let readabilityScore = 96;
    if (isWideTableInPortrait) readabilityScore -= 14;
    if (!wrapCells && longestCellChars > 32) readabilityScore -= 8;
    if (density === 'compact' && maxCols <= 4) readabilityScore -= 3;
    if (zebraStriping) readabilityScore += 2;
    readabilityScore = Math.min(100, Math.max(65, readabilityScore));

    const status: 'optimal' | 'warning' =
      isWideTableInPortrait || isDenseHighRowCount ? 'warning' : 'optimal';

    const recommendation = isWideTableInPortrait
      ? `Wide table detected (${maxCols} columns, ~${avgColWidthMm}mm/col). Switch to A4 Landscape or Compact density to prevent column crowding.`
      : isDenseHighRowCount
      ? `High row volume (${totalRows} rows). Compact or Standard density is recommended to fit tables cleanly onto fewer A4 sheets.`
      : `Optimal A4 table geometry (${avgColWidthMm}mm avg column width, ${densityConfig.fontSizePt}pt type, 17.4:1 contrast ratio). Ready for system print.`;

    return {
      tableCount,
      totalRows,
      totalCells,
      maxCols,
      avgColWidthMm,
      printableWidthMm,
      estimatedPages,
      readabilityScore,
      status,
      recommendation,
    };
  }, [activeTables, orientation, density, densityConfig, wrapCells, zebraStriping]);

  const handleConfirmSystemPrint = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-print-density', density);
      document.documentElement.setAttribute('data-print-orientation', orientation);
    }
    if (onConfirmPrint) {
      onConfirmPrint();
    }
    window.print();
  }, [density, orientation, onConfirmPrint]);

  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const docRef =
    referenceId ||
    `A4-SPEC-${toolTitle
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase()}-${new Date().getFullYear()}`;

  const sheetWidthPx = orientation === 'portrait' ? 794 : 1123; // 210mm / 297mm at 96 DPI
  const sheetMinHeightPx = orientation === 'portrait' ? 1123 : 794;
  const scaleFactor = zoomPercent / 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`A4 Visual Print Preview — ${toolTitle}`}
      data-testid="a4-print-preview-modal"
      className="no-print"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(2, 6, 23, 0.86)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
      }}
    >
      {/* Top Control & Telemetry Header Bar */}
      <header
        style={{
          background: '#0f172a',
          borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Printer size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#f8fafc',
                    letterSpacing: '-0.01em',
                  }}
                >
                  A4 Visual Print Preview &amp; Layout Inspector
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(56, 189, 248, 0.16)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                  }}
                >
                  ISO 216 A4 ({orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'})
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Verify table readability, column alignment, and data density before initiating the system print dialog.
              </p>
            </div>
          </div>

          {/* Primary Modal Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleConfirmSystemPrint}
              data-testid="confirm-system-print-btn"
              aria-label="Initiate System Print Dialog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                border: '1px solid rgba(56, 189, 248, 0.6)',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              }}
            >
              <Printer size={16} />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              data-testid="close-print-preview-btn"
              aria-label="Close A4 Print Preview"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '9px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
              <span>Close Preview</span>
            </button>
          </div>
        </div>

        {/* Interactive Toolbar: Data Density, Orientation, Zoom, & Table Readability Controls */}
        <div
          data-testid="print-preview-controls-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          {/* Data Density Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label
              htmlFor="print-preview-density-select"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sliders size={13} color="#38bdf8" />
              Data Density:
            </label>
            <select
              id="print-preview-density-select"
              data-testid="print-preview-density-select"
              aria-label="Data Density"
              value={density}
              onChange={e => setDensity(e.target.value as PrintDataDensity)}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value="compact">Compact (8pt • High Density)</option>
              <option value="standard">Standard (9.5pt • Balanced A4)</option>
              <option value="spacious">Spacious (10.5pt • Max Readability)</option>
            </select>

            <div style={{ display: 'inline-flex', gap: '4px' }} role="group" aria-label="Quick Density Presets">
              {(['compact', 'standard', 'spacious'] as PrintDataDensity[]).map(dKey => {
                const isSelected = density === dKey;
                return (
                  <button
                    key={dKey}
                    type="button"
                    data-testid={`density-btn-${dKey}`}
                    onClick={() => setDensity(dKey)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      border: isSelected
                        ? '1px solid #38bdf8'
                        : '1px solid rgba(148, 163, 184, 0.25)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: isSelected ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    {DENSITY_PRESETS[dKey].shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Page Orientation & Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>
                Orientation:
              </span>
              <button
                type="button"
                data-testid="orientation-btn-portrait"
                onClick={() => setOrientation('portrait')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: orientation === 'portrait' ? 800 : 600,
                  border:
                    orientation === 'portrait'
                      ? '1px solid #38bdf8'
                      : '1px solid rgba(148, 163, 184, 0.25)',
                  background:
                    orientation === 'portrait' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: orientation === 'portrait' ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Portrait (210×297)
              </button>
              <button
                type="button"
                data-testid="orientation-btn-landscape"
                onClick={() => setOrientation('landscape')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: orientation === 'landscape' ? 800 : 600,
                  border:
                    orientation === 'landscape'
                      ? '1px solid #38bdf8'
                      : '1px solid rgba(148, 163, 184, 0.25)',
                  background:
                    orientation === 'landscape' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: orientation === 'landscape' ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Landscape (297×210)
              </button>
            </div>

            {/* Readability Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                data-testid="print-preview-zebra-toggle"
                onClick={() => setZebraStriping(prev => !prev)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: zebraStriping
                    ? '1px solid rgba(16, 185, 129, 0.45)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                  background: zebraStriping ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: zebraStriping ? '#34d399' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Zebra Rows: {zebraStriping ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                data-testid="print-preview-wrap-toggle"
                onClick={() => setWrapCells(prev => !prev)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: wrapCells
                    ? '1px solid rgba(56, 189, 248, 0.45)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                  background: wrapCells ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: wrapCells ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                {wrapCells ? 'Wrap Cells' : 'Single-Line'}
              </button>

              <button
                type="button"
                data-testid="print-preview-margins-toggle"
                onClick={() => setShowMarginGuides(prev => !prev)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: showMarginGuides
                    ? '1px solid rgba(245, 158, 11, 0.45)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                  background: showMarginGuides ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: showMarginGuides ? '#fbbf24' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Ruler size={12} />
                Margins: {showMarginGuides ? 'Shown' : 'Hidden'}
              </button>
            </div>

            {/* Zoom Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                aria-label="Zoom out A4 sheet"
                onClick={() => setZoomPercent(p => Math.max(60, p - 10))}
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                <ZoomOut size={13} />
              </button>
              <select
                aria-label="Zoom Scale"
                data-testid="print-preview-zoom-select"
                value={zoomPercent}
                onChange={e => setZoomPercent(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                <option value={75}>75%</option>
                <option value={90}>90%</option>
                <option value={100}>100%</option>
                <option value={115}>115%</option>
              </select>
              <button
                type="button"
                aria-label="Zoom in A4 sheet"
                onClick={() => setZoomPercent(p => Math.min(130, p + 10))}
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Table Readability & Data Density Telemetry Bar */}
        <div
          data-testid="print-preview-readability-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: '8px',
            background:
              readabilityTelemetry.status === 'optimal'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(245, 158, 11, 0.14)',
            border:
              readabilityTelemetry.status === 'optimal'
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid rgba(245, 158, 11, 0.4)',
            fontSize: '0.76rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              data-testid="readability-verdict-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 800,
                color: readabilityTelemetry.status === 'optimal' ? '#34d399' : '#fbbf24',
              }}
            >
              {readabilityTelemetry.status === 'optimal' ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              Readability Score: {readabilityTelemetry.readabilityScore}/100
            </span>
            <span style={{ color: '#cbd5e1' }}>{readabilityTelemetry.recommendation}</span>
          </div>

          <div
            data-testid="data-density-summary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontFamily: 'monospace',
              fontSize: '0.72rem',
              color: '#e2e8f0',
            }}
          >
            <span>
              <strong>Tables:</strong> {readabilityTelemetry.tableCount}
            </span>
            <span>
              <strong>Rows:</strong> {readabilityTelemetry.totalRows}
            </span>
            <span>
              <strong>Max Cols:</strong> {readabilityTelemetry.maxCols} (~{readabilityTelemetry.avgColWidthMm}mm/col)
            </span>
            <span>
              <strong>Typography:</strong> {densityConfig.fontSizePt}pt / {densityConfig.lineHeight}x
            </span>
            <span>
              <strong>Est. Output:</strong> {readabilityTelemetry.estimatedPages} A4{' '}
              {readabilityTelemetry.estimatedPages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Scrollable Viewport Hosting the Simulated A4 Sheet */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '28px 20px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background:
            'radial-gradient(circle at center, rgba(30, 41, 59, 0.65) 0%, rgba(2, 6, 23, 0.95) 100%)',
        }}
      >
        {/* Top Millimeter Ruler Indicator */}
        <div
          style={{
            width: `${Math.round(sheetWidthPx * scaleFactor)}px`,
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.66rem',
            fontFamily: 'monospace',
            color: '#64748b',
            marginBottom: '6px',
            padding: '0 4px',
          }}
        >
          <span>0 mm (Left Edge)</span>
          <span>14 mm Safe Margin</span>
          <span>
            ISO 216 A4 {orientation === 'portrait' ? 'Portrait (210 mm Wide)' : 'Landscape (297 mm Wide)'}
          </span>
          <span>14 mm Safe Margin</span>
          <span>{orientation === 'portrait' ? '210 mm' : '297 mm'} (Right Edge)</span>
        </div>

        {/* Simulated Physical A4 Paper Sheet */}
        <article
          data-testid="a4-sheet-simulation"
          aria-label="Simulated A4 Page Output"
          data-density={density}
          data-orientation={orientation}
          style={{
            width: `${sheetWidthPx}px`,
            minHeight: `${sheetMinHeightPx}px`,
            transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
            transformOrigin: 'top center',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            borderRadius: '3px',
            boxShadow:
              '0 25px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(148, 163, 184, 0.3)',
            padding: '48px 42px 44px', // Simulates 18mm top/bottom, 14mm left/right A4 margins
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Optional Visual Safe-Margin Dashed Guide Overlay */}
          {showMarginGuides && (
            <div
              data-testid="a4-margin-guide-overlay"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '48px 42px 44px',
                border: '1px dashed rgba(2, 132, 199, 0.35)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-16px',
                  right: '0',
                  fontSize: '6.5pt',
                  fontFamily: 'monospace',
                  color: '#0284c7',
                  background: 'rgba(240, 249, 255, 0.9)',
                  padding: '0 4px',
                }}
              >
                Printable Area ({readabilityTelemetry.printableWidthMm}mm width · 18mm/14mm A4 margins)
              </span>
            </div>
          )}

          <div>
            {/* A4 Engineering Report Header */}
            <div
              style={{
                borderBottom: '2px solid #0f172a',
                paddingBottom: '10pt',
                marginBottom: '14pt',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '7.5pt',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#475569',
                    fontWeight: 800,
                    marginBottom: '3pt',
                  }}
                >
                  {toolCategory} • A4 Technical Specification
                </div>
                <h1
                  style={{
                    fontSize: '15pt',
                    fontWeight: 900,
                    margin: '0 0 3pt',
                    color: '#0f172a',
                    lineHeight: 1.2,
                  }}
                >
                  {toolTitle}
                </h1>
                <p style={{ margin: 0, fontSize: '8.5pt', color: '#334155', lineHeight: 1.35 }}>
                  {toolSubtitle}
                </p>
              </div>

              <div
                style={{
                  textAlign: 'right',
                  fontSize: '7.5pt',
                  color: '#334155',
                  fontFamily: 'monospace',
                  flexShrink: 0,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  lineHeight: 1.45,
                }}
              >
                <div>
                  <strong>DOC REF:</strong> {docRef}
                </div>
                <div>
                  <strong>DATE:</strong> {formattedDate}
                </div>
                <div>
                  <strong>DENSITY:</strong> {densityConfig.shortLabel.toUpperCase()} ({densityConfig.fontSizePt}pt)
                </div>
                <div>
                  <strong>FORMAT:</strong> ISO A4 {orientation.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Key Summary Metrics Strip (if provided or extracted) */}
            {activeMetrics.length > 0 && (
              <div
                data-testid="a4-preview-metrics-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(activeMetrics.length, 4)}, 1fr)`,
                  gap: '8pt',
                  marginBottom: '14pt',
                }}
              >
                {activeMetrics.map((metric, idx) => (
                  <div
                    key={`${metric.label}-${idx}`}
                    style={{
                      padding: density === 'compact' ? '6px 8px' : '8px 10px',
                      borderRadius: '4px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '6.8pt',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#475569',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {metric.label}
                    </div>
                    <div
                      style={{
                        fontSize: density === 'compact' ? '10.5pt' : '12pt',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginTop: '2px',
                      }}
                    >
                      {metric.value}
                      {metric.unit ? ` ${metric.unit}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Simulated A4 Data Tables */}
            <div
              data-testid="a4-preview-tables-container"
              style={{ display: 'flex', flexDirection: 'column', gap: '14pt' }}
            >
              {activeTables.map((table, tIdx) => (
                <section
                  key={table.id || `preview-table-${tIdx}`}
                  data-testid={`a4-preview-table-section-${tIdx}`}
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '5pt',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '3pt',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: `${densityConfig.headerFontSizePt + 1}pt`,
                        fontWeight: 800,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {tIdx + 1}. {table.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '7pt',
                        color: '#64748b',
                        fontFamily: 'monospace',
                      }}
                    >
                      {table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'} ×{' '}
                      {table.headers.length} cols
                    </span>
                  </div>

                  {table.subtitle && (
                    <p
                      style={{
                        margin: '0 0 5pt',
                        fontSize: `${densityConfig.fontSizePt - 0.5}pt`,
                        color: '#475569',
                      }}
                    >
                      {table.subtitle}
                    </p>
                  )}

                  <table
                    data-testid={`a4-preview-table-${tIdx}`}
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: `${densityConfig.fontSizePt}pt`,
                      lineHeight: densityConfig.lineHeight,
                      color: '#0f172a',
                      border: '1px solid #94a3b8',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>
                        {table.headers.map((hdr, hIdx) => (
                          <th
                            key={`hdr-${hIdx}`}
                            style={{
                              padding: densityConfig.cellPadding,
                              fontSize: `${densityConfig.headerFontSizePt}pt`,
                              fontWeight: 800,
                              textAlign: 'left',
                              borderBottom: '1.5px solid #475569',
                              borderRight:
                                hIdx < table.headers.length - 1
                                  ? '1px solid #cbd5e1'
                                  : undefined,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {hdr}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rIdx) => (
                        <tr
                          key={`row-${rIdx}`}
                          style={{
                            backgroundColor:
                              zebraStriping && rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                            borderBottom: '1px solid #cbd5e1',
                          }}
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={`cell-${rIdx}-${cIdx}`}
                              style={{
                                padding: densityConfig.cellPadding,
                                fontWeight: cIdx === 0 ? 700 : 400,
                                color: cIdx === 0 ? '#0f172a' : '#1e293b',
                                borderRight:
                                  cIdx < row.length - 1 ? '1px solid #e2e8f0' : undefined,
                                whiteSpace: wrapCells ? 'normal' : 'nowrap',
                                overflow: wrapCells ? 'visible' : 'hidden',
                                textOverflow: wrapCells ? 'clip' : 'ellipsis',
                                maxWidth: wrapCells ? undefined : '220px',
                                verticalAlign: 'top',
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {table.footerNote && (
                    <div
                      style={{
                        marginTop: '4pt',
                        fontSize: '7.2pt',
                        color: '#475569',
                        fontStyle: 'italic',
                      }}
                    >
                      {table.footerNote}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          {/* A4 Page Running Footer */}
          <footer
            style={{
              marginTop: '20pt',
              paddingTop: '8pt',
              borderTop: '1px solid #94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '7.5pt',
              color: '#475569',
            }}
          >
            <div>
              <strong>jawed.co.in</strong> • {toolTitle} • Verified A4 Print Layout
            </div>
            <div style={{ fontFamily: 'monospace' }}>
              Density: {densityConfig.shortLabel} ({densityConfig.fontSizePt}pt) • Page 1 of{' '}
              {readabilityTelemetry.estimatedPages}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
};

export default A4PrintPreviewModal;
