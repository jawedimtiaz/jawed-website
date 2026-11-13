import React from 'react';
import {
  ExportToPdfButton,
  EXPORT_TO_PDF_LABEL,
  triggerA4PdfExport,
  formatPdfDocumentTitle,
  type ExportToPdfButtonProps,
  type TriggerA4PdfExportOptions,
  type ExportToPdfResult,
} from './ExportToPdfButton';

export {
  ExportToPdfButton,
  EXPORT_TO_PDF_LABEL,
  triggerA4PdfExport,
  formatPdfDocumentTitle,
  type ExportToPdfButtonProps,
  type TriggerA4PdfExportOptions,
  type ExportToPdfResult,
};

export interface PdfExportButtonProps extends ExportToPdfButtonProps {
  /** Optional custom button label (default: "Export to PDF") */
  label?: string;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  label = EXPORT_TO_PDF_LABEL,
  variant = 'secondary',
  size = 'sm',
  className = '',
  style = {},
  title = 'Export active report or guide to a clean A4 PDF using the browser print dialog',
  onExport,
  documentTitle,
  targetSelector,
  exportScope = 'tool-report',
  orientation = 'portrait',
  iconType = 'printer',
}) => {
  return (
    <ExportToPdfButton
      label={label}
      variant={variant}
      size={size}
      className={className}
      style={style}
      title={title}
      onExport={onExport}
      documentTitle={documentTitle}
      targetSelector={targetSelector}
      exportScope={exportScope}
      orientation={orientation}
      iconType={iconType}
    />
  );
};

export default PdfExportButton;

