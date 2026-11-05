import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  type MonthlyMetrics,
  type MoneyTransaction,
  type SinkingFund,
  formatINR,
} from '../../db/db';
import {
  type MonthlyBudgetPlanSummary,
} from './StatsView';
import {
  downloadMonthlySpendingPdf,
  generateMonthlySpendingPdf,
  getFullMonthYearLabel,
} from './spendingPdfReport';

export interface SpendingPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  plan: MonthlyBudgetPlanSummary;
  metrics: MonthlyMetrics;
  transactions?: MoneyTransaction[];
  sinkingFunds?: SinkingFund[];
  onPdfGenerated?: (fileName: string) => void;
}

export const SpendingPdfModal: React.FC<SpendingPdfModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  plan,
  metrics,
  transactions = [],
  sinkingFunds = [],
  onPdfGenerated,
}) => {
  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = useState(true);
  const [includeTopTransactions, setIncludeTopTransactions] = useState(true);
  const [topTxCount, setTopTxCount] = useState<number>(10);
  const [includeSinkingFunds, setIncludeSinkingFunds] = useState(true);
  const [reportNotes, setReportNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const monthLabel = getFullMonthYearLabel(selectedMonth);
  const isOverBudget = plan.totalSpent > plan.totalBudgeted && plan.totalBudgeted > 0;
  const monthExpensesCount = transactions.filter(
    (t) => t.type === 'Expense' && t.date.slice(0, 7) === selectedMonth
  ).length;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      const fileName = `Monthly_Spending_Report_${selectedMonth}.pdf`;
      downloadMonthlySpendingPdf({
        selectedMonth,
        plan,
        metrics,
        transactions,
        sinkingFunds,
        reportNotes,
        includeCategoryBreakdown,
        includeTopTransactions,
        topTransactionsLimit: topTxCount,
        includeSinkingFunds,
        fileName,
      });

      setSuccessNotice(`Successfully exported formatted PDF: ${fileName}`);
      if (onPdfGenerated) {
        onPdfGenerated(fileName);
      }
      setTimeout(() => {
        setSuccessNotice(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to generate spending PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPreview = () => {
    try {
      const doc = generateMonthlySpendingPdf({
        selectedMonth,
        plan,
        metrics,
        transactions,
        sinkingFunds,
        reportNotes,
        includeCategoryBreakdown,
        includeTopTransactions,
        topTransactionsLimit: topTxCount,
        includeSinkingFunds,
      });

      // Output as blob url for preview / print
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        // If popup blocked, download directly
        handleDownloadPdf();
      }
    } catch (err) {
      console.error('Failed to open PDF preview:', err);
      handleDownloadPdf();
    }
  };

  return (
    <div
      className="mm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-pdf-modal-title"
      data-testid="mm-spending-pdf-modal"
    >
      <div
        className="mm-modal-card"
        style={{ maxWidth: 620, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="mm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(56, 189, 248, 0.16)',
                color: 'var(--accent, #38bdf8)',
              }}
            >
              <FileText size={18} />
            </span>
            <div>
              <h2 id="mm-pdf-modal-title" className="mm-modal-title" style={{ margin: 0 }}>
                Export Monthly Spending PDF Report
              </h2>
              <span className="mm-stat-panel-sub" style={{ margin: '2px 0 0', display: 'block' }}>
                Period: {monthLabel} ({selectedMonth}) · Publication-Ready Formatted Vector PDF
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mm-modal-close-btn"
            aria-label="Close PDF export modal"
            data-testid="mm-close-pdf-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Confirmation Toast */}
        {successNotice && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: 14,
            }}
            data-testid="mm-pdf-success-feedback"
          >
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Live Executive Summary Overview Pill Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 8,
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--bg-darker, rgba(15, 23, 42, 0.6))',
            border: '1px solid var(--border)',
          }}
          data-testid="mm-pdf-preview-stats-grid"
        >
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>
              Total Spending
            </span>
            <strong
              style={{
                fontSize: '0.98rem',
                color: isOverBudget ? '#ef4444' : 'var(--text-heading)',
              }}
            >
              {formatINR(plan.totalSpent)}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>
              Planned Limit
            </span>
            <strong style={{ fontSize: '0.98rem', color: 'var(--text-heading)' }}>
              {formatINR(plan.totalBudgeted)}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>
              Burn Rate
            </span>
            <strong
              style={{
                fontSize: '0.98rem',
                color: isOverBudget ? '#ef4444' : plan.warning90Count > 0 ? '#f59e0b' : '#10b981',
              }}
            >
              {plan.overallUtilizationPercent}%
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>
              Headroom
            </span>
            <strong
              style={{
                fontSize: '0.98rem',
                color: isOverBudget ? '#ef4444' : '#10b981',
              }}
            >
              {isOverBudget ? `+${formatINR(plan.totalOverage)}` : formatINR(plan.totalRemaining)}
            </strong>
          </div>
        </div>

        {/* 90% Warning Callout Notice if applicable */}
        {plan.warning90Count > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b',
              fontSize: '0.78rem',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={14} />
            <span>
              Report includes visual highlighting for {plan.warning90Count} spending{' '}
              {plan.warning90Count === 1 ? 'category' : 'categories'} at or exceeding 90% limit.
            </span>
          </div>
        )}

        {/* Report Customization Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          <h3
            style={{
              margin: '0 0 2px',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: 'var(--text-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sliders size={14} style={{ color: 'var(--accent)' }} />
            <span>Report Sections &amp; Options</span>
          </h3>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.84rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={includeCategoryBreakdown}
              onChange={(e) => setIncludeCategoryBreakdown(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              data-testid="mm-pdf-option-category-breakdown"
            />
            <span>
              <strong>Category Budget Breakdown Table</strong> ({plan.items.length} categories with
              planned limit, spent, variance &amp; utilization status)
            </span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.84rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeTopTransactions}
                onChange={(e) => setIncludeTopTransactions(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                data-testid="mm-pdf-option-top-transactions"
              />
              <span>
                <strong>Major Expense Transactions List</strong> ({monthExpensesCount} available in {selectedMonth})
              </span>
            </label>

            {includeTopTransactions && (
              <select
                value={topTxCount}
                onChange={(e) => setTopTxCount(Number(e.target.value))}
                className="mm-input"
                style={{
                  width: 'auto',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  marginLeft: 26,
                }}
                data-testid="mm-pdf-option-tx-limit-select"
              >
                <option value={5}>Top 5 Largest</option>
                <option value={10}>Top 10 Largest</option>
                <option value={20}>Top 20 Largest</option>
                <option value={0}>All Transactions</option>
              </select>
            )}
          </div>

          {sinkingFunds.length > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.84rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeSinkingFunds}
                onChange={(e) => setIncludeSinkingFunds(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                data-testid="mm-pdf-option-sinking-funds"
              />
              <span>
                <strong>Sinking Funds &amp; Provisions Progress</strong> ({sinkingFunds.length} active
                funds)
              </span>
            </label>
          )}

          <div>
            <label
              htmlFor="mm-pdf-notes-input"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              Custom Assessment / Executive Note (Optional):
            </label>
            <textarea
              id="mm-pdf-notes-input"
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="e.g. November spending was kept within target bounds. Discretionary dining and leisure remained on track..."
              rows={2}
              className="mm-input"
              style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
              data-testid="mm-pdf-notes-input"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--muted)' }}>
            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            <span>A4 Portrait Vector PDF · 100% Client-Side Render</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrintPreview}
              className="mm-btn mm-btn-secondary"
              title="Open print-friendly preview dialog"
              data-testid="mm-pdf-modal-preview-btn"
            >
              <Printer size={14} />
              <span>Preview / Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="mm-btn mm-btn-primary"
              data-testid="mm-pdf-modal-download-btn"
            >
              <Download size={14} />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingPdfModal;
