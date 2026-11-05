import { jsPDF } from 'jspdf';
import {
  type MonthlyMetrics,
  type MoneyTransaction,
  type SinkingFund,
} from '../../db/db';
import { type MonthlyBudgetPlanSummary } from './StatsView';

export interface SpendingPdfReportOptions {
  selectedMonth: string; // YYYY-MM
  plan: MonthlyBudgetPlanSummary;
  metrics: MonthlyMetrics;
  transactions?: MoneyTransaction[];
  sinkingFunds?: SinkingFund[];
  reportNotes?: string;
  includeCategoryBreakdown?: boolean;
  includeTopTransactions?: boolean;
  topTransactionsLimit?: number; // default 10
  includeSinkingFunds?: boolean;
  fileName?: string;
}

/**
 * Clean ASCII-safe Indian Rupee formatter for jsPDF standard Helvetica fonts.
 * Avoids character encoding bugs with unicode currency glyphs in WinAnsi.
 */
export function formatPdfINR(amount: number, includeSign = false): string {
  const num = Number(amount) || 0;
  const absFormatted = Math.abs(Math.round(num)).toLocaleString('en-IN');
  const prefix = num < 0 ? '-Rs. ' : includeSign && num > 0 ? '+Rs. ' : 'Rs. ';
  return `${prefix}${absFormatted}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getFullMonthYearLabel(yearMonth: string): string {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;
  return `${MONTH_NAMES[monthIdx] || 'November'} ${year}`;
}

/**
 * Generates a formatted, publication-ready A4 PDF document summarizing monthly spending,
 * budget limits, burn rate, and top expense transactions.
 */
export function generateMonthlySpendingPdf(options: SpendingPdfReportOptions): jsPDF {
  const {
    selectedMonth,
    plan,
    metrics,
    transactions = [],
    sinkingFunds = [],
    reportNotes = '',
    includeCategoryBreakdown = true,
    includeTopTransactions = true,
    topTransactionsLimit = 10,
    includeSinkingFunds = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to check page break and draw header/footer
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin;
      drawPageHeaderCompact();
    }
  };

  const drawPageHeaderCompact = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Monthly Spending & Budget Report - ${getFullMonthYearLabel(selectedMonth)}`, margin + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Money Manager & Personal Ledger', margin + contentWidth - 4, y + 5.5, { align: 'right' });
    y += 12;
  };

  // 1. Top Header Banner (Cover Style)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Title & Subtitle inside banner
  doc.setTextColor(56, 189, 248); // sky-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MONEY MANAGER & PERSONAL LEDGER', margin + 6, y + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`Monthly Spending & Budget Performance Report`, margin + 6, y + 14);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const monthPeriod = getFullMonthYearLabel(selectedMonth);
  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Billing Period: ${monthPeriod} (${selectedMonth}) | Generated: ${nowStr}`, margin + 6, y + 21);

  // Status Badge in header banner
  const isOverallOver = plan.totalSpent > plan.totalBudgeted && plan.totalBudgeted > 0;
  const isBurn90 = plan.warning90Count > 0;
  let badgeColor: [number, number, number] = [16, 185, 129]; // emerald
  let badgeText = 'ON TRACK';
  if (isOverallOver) {
    badgeColor = [239, 68, 68]; // red
    badgeText = 'OVER BUDGET';
  } else if (isBurn90) {
    badgeColor = [245, 158, 11]; // amber
    badgeText = `${plan.warning90Count} CATS >=90%`;
  } else if (plan.overallUtilizationPercent >= 85) {
    badgeColor = [245, 158, 11];
    badgeText = 'NEAR LIMIT';
  }

  doc.setFillColor(...badgeColor);
  doc.roundedRect(margin + contentWidth - 36, y + 6, 30, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(badgeText, margin + contentWidth - 21, y + 10.8, { align: 'center' });

  y += 31;

  // 2. Executive KPI Summary Cards Row (4 cards in 1 row)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Financial Summary', margin, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    {
      label: 'TOTAL INCOME',
      value: formatPdfINR(metrics.income),
      sub: `${plan.items.length} Expense Categories`,
      color: [37, 99, 235] as [number, number, number], // blue
    },
    {
      label: 'TOTAL SPENT',
      value: formatPdfINR(plan.totalSpent),
      sub: `${plan.overallUtilizationPercent}% of Total Budget`,
      color: isOverallOver ? [239, 68, 68] as [number, number, number] : [15, 23, 42] as [number, number, number],
    },
    {
      label: 'SET BUDGET LIMIT',
      value: formatPdfINR(plan.totalBudgeted),
      sub: `${plan.items.length - plan.unbudgetedCount} Budgeted Categories`,
      color: [100, 116, 139] as [number, number, number],
    },
    {
      label: isOverallOver ? 'TOTAL OVERAGE' : 'REMAINING HEADROOM',
      value: isOverallOver ? `+${formatPdfINR(plan.totalOverage)}` : formatPdfINR(plan.totalRemaining),
      sub: isOverallOver ? `${plan.overBudgetCount} limits exceeded` : 'Available unspent',
      color: isOverallOver ? [239, 68, 68] as [number, number, number] : [16, 185, 129] as [number, number, number],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(kx, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + 3.5, y + 4.5);

    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx + 3.5, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kx + 3.5, y + 15);
  });

  y += cardHeight + 5;

  // 3. Secondary Metrics Bar (Burn Rate, Velocity, Fixed/Variable Split, Net Savings)
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const dailyBurn = plan.daysElapsed > 0 ? Math.round(plan.totalSpent / plan.daysElapsed) : 0;
  const netSavings = metrics.netBalance;
  const savingsPct = metrics.savingsRate;
  const fixedRatio = plan.fixedBudgeted > 0 ? Math.round((plan.fixedSpent / plan.fixedBudgeted) * 100) : 0;
  const varRatio = plan.variableBudgeted > 0 ? Math.round((plan.variableSpent / plan.variableBudgeted) * 100) : 0;

  doc.text(
    `Burn Rate: ${plan.overallUtilizationPercent}% | Velocity: ${formatPdfINR(dailyBurn)}/day | Fixed Needs: ${fixedRatio}% | Variable: ${varRatio}% | Net Savings: ${formatPdfINR(netSavings, true)} (${savingsPct}%)`,
    margin + 4,
    y + 6.2
  );

  y += 14;

  // Optional Custom Notes Box
  if (reportNotes.trim()) {
    checkPageBreak(16);
    doc.setFillColor(254, 249, 195); // yellow-100
    doc.setDrawColor(250, 204, 21); // yellow-400
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(133, 77, 14);
    doc.text('Note / Assessment:', margin + 3.5, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 63, 18);
    const splitNote = doc.splitTextToSize(reportNotes, contentWidth - 7);
    doc.text(splitNote, margin + 3.5, y + 8.5);
    y += 15;
  }

  // 4. Category Spending & Budget Limits Breakdown Table
  if (includeCategoryBreakdown && plan.items.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Category Budget Planning & Spending Utilization', margin, y);
    y += 4;

    // Table Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    // Columns: Category (44), Type (16), Planned Limit (24), Actual Spent (24), Variance (24), Utilization (22), Status (26)
    const colX = {
      cat: margin + 3,
      type: margin + 46,
      limit: margin + 74,
      spent: margin + 98,
      variance: margin + 122,
      util: margin + 144,
      status: margin + 164,
    };

    doc.text('CATEGORY', colX.cat, y + 4.8);
    doc.text('TYPE', colX.type, y + 4.8);
    doc.text('PLANNED LIMIT', colX.limit, y + 4.8, { align: 'right' });
    doc.text('ACTUAL SPENT', colX.spent, y + 4.8, { align: 'right' });
    doc.text('VARIANCE', colX.variance, y + 4.8, { align: 'right' });
    doc.text('UTIL %', colX.util, y + 4.8, { align: 'right' });
    doc.text('STATUS', colX.status, y + 4.8);

    y += 7;

    // Render Table Rows
    plan.items.forEach((item, idx) => {
      checkPageBreak(6.5);

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, contentWidth, 6, 'F');
      }

      // Border line under row
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const catName = item.category.length > 22 ? `${item.category.slice(0, 20)}...` : item.category;
      doc.text(catName, colX.cat, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(item.defaultFixedOrVariable, colX.type, y + 4.2);

      doc.setTextColor(71, 85, 105);
      doc.text(formatPdfINR(item.monthlyLimit), colX.limit, y + 4.2, { align: 'right' });

      // Spent
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(item.status === 'over' ? 239 : 15, item.status === 'over' ? 68 : 23, item.status === 'over' ? 68 : 42);
      doc.text(formatPdfINR(item.spent), colX.spent, y + 4.2, { align: 'right' });

      // Variance
      doc.setFont('helvetica', 'normal');
      if (item.status === 'over') {
        doc.setTextColor(239, 68, 68);
        doc.text(`+${formatPdfINR(item.overage)}`, colX.variance, y + 4.2, { align: 'right' });
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text(formatPdfINR(item.remaining), colX.variance, y + 4.2, { align: 'right' });
      }

      // Util %
      doc.setFont('helvetica', 'bold');
      if (item.status === 'over') {
        doc.setTextColor(239, 68, 68);
      } else if (item.isExceeding90Percent) {
        doc.setTextColor(217, 119, 6); // amber-600
      } else if (item.status === 'near') {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(`${item.utilizationPercent}%`, colX.util, y + 4.2, { align: 'right' });

      // Status label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      if (item.status === 'over') {
        doc.setTextColor(239, 68, 68);
        doc.text('OVER BUDGET', colX.status, y + 4.2);
      } else if (item.isExceeding90Percent) {
        doc.setTextColor(217, 119, 6);
        doc.text('>=90% LIMIT', colX.status, y + 4.2);
      } else if (item.status === 'near') {
        doc.setTextColor(245, 158, 11);
        doc.text('NEAR LIMIT', colX.status, y + 4.2);
      } else if (item.status === 'on-track') {
        doc.setTextColor(16, 185, 129);
        doc.text('ON TRACK', colX.status, y + 4.2);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('UNBUDGETED', colX.status, y + 4.2);
      }

      y += 6;
    });

    // Summary Totals Row
    checkPageBreak(8);
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL SUMMARY', colX.cat, y + 4.8);
    doc.text(`${plan.items.length} Cats`, colX.type, y + 4.8);
    doc.text(formatPdfINR(plan.totalBudgeted), colX.limit, y + 4.8, { align: 'right' });
    doc.text(formatPdfINR(plan.totalSpent), colX.spent, y + 4.8, { align: 'right' });
    doc.text(
      isOverallOver ? `+${formatPdfINR(plan.totalOverage)}` : formatPdfINR(plan.totalRemaining),
      colX.variance,
      y + 4.8,
      { align: 'right' }
    );
    doc.text(`${plan.overallUtilizationPercent}%`, colX.util, y + 4.8, { align: 'right' });
    doc.text(isOverallOver ? 'OVER PLAN' : isBurn90 ? 'WARNING (90%)' : 'ON TRACK', colX.status, y + 4.8);

    y += 12;
  }

  // 5. Major Transactions Section (Top Expenses of the Month)
  if (includeTopTransactions && transactions.length > 0) {
    checkPageBreak(30);

    const monthExpenses = transactions
      .filter((t) => t.type === 'Expense' && t.date.slice(0, 7) === selectedMonth)
      .sort((a, b) => b.amount - a.amount);

    const rowsToPrint =
      topTransactionsLimit > 0
        ? monthExpenses.slice(0, topTransactionsLimit)
        : monthExpenses;

    if (rowsToPrint.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Major Expense Transactions (${rowsToPrint.length} of ${monthExpenses.length} entries)`,
        margin,
        y
      );
      y += 4;

      // Table Header
      doc.setFillColor(51, 65, 85); // slate-700
      doc.rect(margin, y, contentWidth, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(255, 255, 255);

      const txColX = {
        date: margin + 3,
        cat: margin + 26,
        note: margin + 65,
        type: margin + 140,
        amount: margin + contentWidth - 4,
      };

      doc.text('DATE', txColX.date, y + 4.4);
      doc.text('CATEGORY', txColX.cat, y + 4.4);
      doc.text('DESCRIPTION / NOTE', txColX.note, y + 4.4);
      doc.text('TYPE', txColX.type, y + 4.4);
      doc.text('AMOUNT (INR)', txColX.amount, y + 4.4, { align: 'right' });

      y += 6.5;

      rowsToPrint.forEach((tx, idx) => {
        checkPageBreak(6);

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, 5.5, 'F');
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text(tx.date.slice(0, 10), txColX.date, y + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const catCut = tx.category.length > 18 ? `${tx.category.slice(0, 16)}..` : tx.category;
        doc.text(catCut, txColX.cat, y + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const noteStr = tx.note || tx.subCategory || 'Expense entry';
        const noteCut = noteStr.length > 40 ? `${noteStr.slice(0, 38)}...` : noteStr;
        doc.text(noteCut, txColX.note, y + 3.8);

        doc.setTextColor(148, 163, 184);
        doc.text(tx.fixedOrVariable || 'Variable', txColX.type, y + 3.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text(formatPdfINR(tx.amount), txColX.amount, y + 3.8, { align: 'right' });

        y += 5.5;
      });

      y += 8;
    }
  }

  // 6. Sinking Funds & Annual Provisions (if enabled and present)
  if (includeSinkingFunds && sinkingFunds.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Sinking Funds & Annual Provisions Progress', margin, y);
    y += 4;

    const sfWidth = (contentWidth - 6) / Math.min(3, sinkingFunds.length);
    sinkingFunds.slice(0, 6).forEach((fund, idx) => {
      const colIdx = idx % 3;
      if (colIdx === 0 && idx > 0) {
        y += 18;
        checkPageBreak(18);
      }
      const sfx = margin + colIdx * (sfWidth + 3);
      const sfPct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.currentAccrued / fund.targetAmount) * 100)) : 0;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(sfx, y, sfWidth, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const nameCut = fund.name.length > 24 ? `${fund.name.slice(0, 22)}..` : fund.name;
      doc.text(nameCut, sfx + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${formatPdfINR(fund.currentAccrued)} / ${formatPdfINR(fund.targetAmount)} (${sfPct}%)`, sfx + 3, y + 8.5);

      // Mini Progress bar
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(sfx + 3, y + 10.5, sfWidth - 6, 2.5, 1, 1, 'F');
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(sfx + 3, y + 10.5, (sfWidth - 6) * (sfPct / 100), 2.5, 1, 1, 'F');
    });

    y += 20;
  }

  // 7. Page Footer on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Money Manager & Personal Ledger - 100% Client-Side Private Storage (IndexedDB)',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

/**
 * Triggers a browser download of the generated Monthly Spending PDF report.
 */
export function downloadMonthlySpendingPdf(options: SpendingPdfReportOptions): string {
  const doc = generateMonthlySpendingPdf(options);
  const defaultName = `Monthly_Spending_Report_${options.selectedMonth}.pdf`;
  const finalName = options.fileName || defaultName;
  doc.save(finalName);
  return finalName;
}
