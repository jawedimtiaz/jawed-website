import { jsPDF } from 'jspdf';
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
} from './currencyFormatter';

export interface CarLoanAmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface CarLoanPdfReportParams {
  currency: CurrencyCode;
  scenarioName?: string;
  price: number;
  downPayment: number;
  downPaymentPercent: number;
  isDownPaymentPercent: boolean;
  loanPrincipal: number;
  interestRate: number;
  loanYears: number;
  loanMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalRepaid: number;
  effectivePurchaseCost: number;
  monthlyTco?: number;
  salary?: number;
  existingEmis?: number;
  isEmiHealthPass?: boolean | null;
  maxRecommendedEmi?: number;
  sensitivityDelta?: number;
  simRate?: number;
  simEmi?: number;
  simInterest?: number;
  amortizationRows: CarLoanAmortizationRow[];
  chartSvgElement?: SVGSVGElement | null;
}

/**
 * Format currency safely for jsPDF text rendering (using Latin-1 compatible symbols to avoid WinAnsi encoding issues)
 */
export function formatPdfCurrency(val: number, currency: CurrencyCode, includeDecimals = false): string {
  const cfg = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  const numFormatted = val.toLocaleString(cfg.locale, {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  // Use clean ASCII representation for jsPDF standard fonts
  let symbol = cfg.symbol;
  if (currency === 'INR') {
    symbol = 'Rs. ';
  } else if (currency === 'AED') {
    symbol = 'AED ';
  } else if (currency === 'CAD') {
    symbol = 'CA$';
  } else if (currency === 'AUD') {
    symbol = 'A$';
  }

  return `${symbol}${numFormatted}`;
}

/**
 * Render the D3 Stacked Area Chart onto an offscreen canvas at high resolution
 * to embed as a crisp 300-DPI raster in the PDF report.
 * Works reliably regardless of whether the UI chart is collapsed or expanded.
 */
export function renderAmortizationChartToDataUrl(
  rows: CarLoanAmortizationRow[],
  currencySymbol = 'Rs.',
  width = 1200,
  height = 420
): string | null {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Background & Container Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle outer border & header bar
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Top Card Header Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(2, 2, width - 4, 46);
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(width, 48);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AMORTIZATION REPAYMENT TRAJECTORY (PRINCIPAL vs. INTEREST)', 24, 30);

    // Legend
    const legendRight = width - 24;
    // Legend: Interest (Rose)
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(legendRight - 150, 18, 14, 14);
    ctx.fillStyle = '#475569';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Interest Payment', legendRight - 130, 30);

    // Legend: Principal (Sky Blue)
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(legendRight - 320, 18, 14, 14);
    ctx.fillStyle = '#475569';
    ctx.fillText('Principal Payment', legendRight - 300, 30);

    if (!rows || rows.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText('No amortization data available', width / 2, height / 2);
      return canvas.toDataURL('image/png');
    }

    // Chart margins
    const margin = { top: 68, right: 35, bottom: 50, left: 85 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    const n = rows.length;
    const maxVal = Math.max(...rows.map((r) => r.principal + r.interest), 100);
    const yCeil = Math.ceil(maxVal * 1.08);

    const xMap = (m: number) => margin.left + ((m - 1) / Math.max(1, n - 1)) * chartW;
    const yMap = (val: number) => margin.top + chartH - (val / yCeil) * chartH;

    // Draw horizontal grid lines & Y axis ticks
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const yTicks = 5;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    for (let i = 0; i <= yTicks; i++) {
      const val = (yCeil / yTicks) * i;
      const yPos = yMap(val);

      ctx.beginPath();
      ctx.moveTo(margin.left, yPos);
      ctx.lineTo(margin.left + chartW, yPos);
      ctx.stroke();

      const label = `${currencySymbol} ${(val / 1000).toFixed(0)}k`;
      ctx.fillText(label, margin.left - 10, yPos + 4);
    }
    ctx.setLineDash([]); // reset line dash

    // Draw X-axis line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartH);
    ctx.lineTo(margin.left + chartW, margin.top + chartH);
    ctx.stroke();

    // Draw X-axis ticks (Year marks: Month 1, Month 12, Month 24, etc., plus final month)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const xTicksMonths = [1];
    for (let m = 12; m < n; m += 12) {
      xTicksMonths.push(m);
    }
    if (!xTicksMonths.includes(n)) {
      xTicksMonths.push(n);
    }

    xTicksMonths.forEach((m) => {
      const xPos = xMap(m);
      ctx.beginPath();
      ctx.moveTo(xPos, margin.top + chartH);
      ctx.lineTo(xPos, margin.top + chartH + 5);
      ctx.stroke();

      const label = m === 1 ? 'M1' : m === n ? `M${m} (End)` : `M${m} (Yr ${m / 12})`;
      ctx.fillText(label, xPos, margin.top + chartH + 20);
    });

    // 1. Draw Interest Area (Top layer: from Principal to Principal + Interest)
    ctx.beginPath();
    // Start at bottom line of interest (= top of principal) at month 1
    ctx.moveTo(xMap(rows[0].month), yMap(rows[0].principal + rows[0].interest));
    for (let i = 1; i < rows.length; i++) {
      ctx.lineTo(xMap(rows[i].month), yMap(rows[i].principal + rows[i].interest));
    }
    // Return along top of principal line in reverse
    for (let i = rows.length - 1; i >= 0; i--) {
      ctx.lineTo(xMap(rows[i].month), yMap(rows[i].principal));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.88)'; // rose-500
    ctx.fill();

    // 2. Draw Principal Area (Bottom layer: from 0 to Principal)
    ctx.beginPath();
    ctx.moveTo(xMap(rows[0].month), yMap(rows[0].principal));
    for (let i = 1; i < rows.length; i++) {
      ctx.lineTo(xMap(rows[i].month), yMap(rows[i].principal));
    }
    // Down to base line
    ctx.lineTo(xMap(rows[rows.length - 1].month), yMap(0));
    ctx.lineTo(xMap(rows[0].month), yMap(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.88)'; // sky-500
    ctx.fill();

    // 3. Highlight boundary curves
    ctx.lineWidth = 2;
    // Total EMI curve
    ctx.strokeStyle = '#e11d48'; // rose-600
    ctx.beginPath();
    ctx.moveTo(xMap(rows[0].month), yMap(rows[0].principal + rows[0].interest));
    for (let i = 1; i < rows.length; i++) {
      ctx.lineTo(xMap(rows[i].month), yMap(rows[i].principal + rows[i].interest));
    }
    ctx.stroke();

    // Principal boundary curve
    ctx.strokeStyle = '#0284c7'; // sky-600
    ctx.beginPath();
    ctx.moveTo(xMap(rows[0].month), yMap(rows[0].principal));
    for (let i = 1; i < rows.length; i++) {
      ctx.lineTo(xMap(rows[i].month), yMap(rows[i].principal));
    }
    ctx.stroke();

    // 4. Crossover point annotation (where principal > interest)
    const crossover = rows.find((r) => r.principal >= r.interest);
    if (crossover && crossover.month > 1 && crossover.month < n) {
      const crossX = xMap(crossover.month);
      ctx.strokeStyle = '#059669';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(crossX, margin.top);
      ctx.lineTo(crossX, margin.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Crossover: M${crossover.month}`, crossX, margin.top - 6);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to render amortization canvas image:', err);
    return null;
  }
}

/**
 * Generate a complete, professionally formatted multi-page PDF report
 * containing loan summary, D3 stacked area repayment chart, and month-by-month amortization schedule.
 */
export function generateCarLoanPdf(params: CarLoanPdfReportParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencyCfg = getCurrencyConfig(params.currency);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const fmt = (val: number, decimals = false) => formatPdfCurrency(val, params.currency, decimals);

  // ==========================================
  // PAGE 1: EXECUTIVE LOAN SUMMARY & D3 CHART
  // ==========================================

  // 1. Top Navy Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.roundedRect(14, 12, 182, 25, 2.5, 2.5, 'F');

  // Accent Left Bar
  doc.setFillColor(14, 165, 233); // Sky-500
  doc.roundedRect(14, 12, 3.5, 25, 1.5, 1.5, 'F');

  // Header Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CAR AFFORDABILITY & EMI LOAN REPORT', 21, 20);

  doc.setTextColor(203, 213, 225); // Slate-300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text('Complete Loan Financial Breakdown, Repayment Dynamics & Amortization Profile', 21, 26);

  // Right-aligned Metadata
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${dateStr} ${timeStr}`, 192, 18.5, { align: 'right' });
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text(`Currency: ${currencyCfg.name} (${currencyCfg.symbol})`, 192, 23.5, { align: 'right' });
  doc.setTextColor(52, 211, 153); // Emerald-400
  doc.text(params.scenarioName ? `Scenario: ${params.scenarioName}` : 'jawed.co.in/tools/car-affordability-calculator', 192, 28.5, { align: 'right' });

  // 2. Section 1: Key Financial Highlights Grid (6 KPI Cards in 2 rows)
  const cardY1 = 41;
  const cardW = 58;
  const cardH = 22;

  // Card 1: On-Road Vehicle Price
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, cardY1, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ON-ROAD VEHICLE PRICE', 18, cardY1 + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(fmt(params.price), 18, cardY1 + 13);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Total vehicle acquisition cost', 18, cardY1 + 18.5);

  // Card 2: Down Payment & Loan Principal
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(76, cardY1, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DOWN PAYMENT (EQUITY)', 80, cardY1 + 5.5);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.setFontSize(12.5);
  doc.text(`${fmt(params.downPayment)} (${params.downPaymentPercent.toFixed(1)}%)`, 80, cardY1 + 13);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`Financed Principal: ${fmt(params.loanPrincipal)}`, 80, cardY1 + 18.5);

  // Card 3: Monthly Loan EMI
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.roundedRect(138, cardY1, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MONTHLY LOAN EMI', 142, cardY1 + 5.5);
  doc.setFontSize(13);
  doc.text(`${fmt(params.monthlyEmi)} / mo`, 142, cardY1 + 13);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`${params.interestRate}% p.a. · ${params.loanYears} Yrs (${params.loanMonths} Mos)`, 142, cardY1 + 18.5);

  // Row 2 Cards
  const cardY2 = 66;

  // Card 4: Total Interest Payable
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.setDrawColor(254, 205, 211); // Rose-200
  doc.roundedRect(14, cardY2, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(225, 29, 72); // Rose-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TOTAL INTEREST PAYABLE', 18, cardY2 + 5.5);
  doc.setFontSize(12.5);
  doc.text(fmt(params.totalInterest), 18, cardY2 + 13);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const intPct = params.loanPrincipal > 0 ? (params.totalInterest / params.loanPrincipal) * 100 : 0;
  doc.text(`${intPct.toFixed(1)}% of original loan amount`, 18, cardY2 + 18.5);

  // Card 5: Total Amount Repaid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(76, cardY2, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TOTAL AMOUNT REPAID', 80, cardY2 + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12.5);
  doc.text(fmt(params.totalRepaid), 80, cardY2 + 13);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`Effective Cost: ${fmt(params.effectivePurchaseCost)}`, 80, cardY2 + 18.5);

  // Card 6: Estimated Monthly Running TCO
  doc.setFillColor(254, 243, 199); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(138, cardY2, cardW, cardH, 2, 2, 'FD');
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ESTIMATED MONTHLY RUNNING (TCO)', 142, cardY2 + 5.5);
  doc.setFontSize(12.5);
  doc.text(`${fmt(params.monthlyTco || params.monthlyEmi)} / mo`, 142, cardY2 + 13);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Includes EMI + Fuel, Insurance & Care', 142, cardY2 + 18.5);

  // 3. Financial Health Check Banner (if Salary is specified)
  let nextY = 91;

  if (params.salary && params.salary > 0) {
    const isPass = params.isEmiHealthPass ?? (params.monthlyEmi <= params.salary * 0.15);
    const emiRatioPct = (params.monthlyEmi / params.salary) * 100;
    const maxRec = params.maxRecommendedEmi || params.salary * 0.15;
    const diffVal = Math.abs(params.monthlyEmi - maxRec);

    doc.setFillColor(isPass ? 240 : 255, isPass ? 253 : 241, isPass ? 244 : 242);
    doc.setDrawColor(isPass ? 167 : 254, isPass ? 243 : 205, isPass ? 208 : 211);
    doc.roundedRect(14, nextY, 182, 17, 2, 2, 'FD');

    // Health Check Badge
    doc.setFillColor(isPass ? 16 : 244, isPass ? 185 : 63, isPass ? 129 : 94);
    doc.roundedRect(18, nextY + 3.5, 30, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.text(isPass ? 'HEALTHY (<= 15%)' : 'EXCEEDS 15% RULE', 33, nextY + 7, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(isPass ? 6 : 190, isPass ? 95 : 18, isPass ? 70 : 60);
    doc.text(
      `Financial Health Check: Monthly EMI consumes ${emiRatioPct.toFixed(1)}% of your ${fmt(params.salary)} take-home salary.`,
      52,
      nextY + 7.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const healthNote = isPass
      ? `Within safe limits. Recommended ceiling is ${fmt(maxRec)}/mo (Safe buffer headroom: +${fmt(diffVal)}/mo).`
      : `High burden! Recommended ceiling is ${fmt(maxRec)}/mo (Excess obligation: +${fmt(diffVal)}/mo over safe limit).`;
    doc.text(healthNote, 18, nextY + 13.5);

    nextY += 21;
  }

  // 4. Section 2: D3 Stacked Area Chart (Principal vs. Interest Repayment Trajectory)
  doc.setFillColor(15, 23, 42);
  doc.rect(14, nextY, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('2. PRINCIPAL VS. INTEREST REPAYMENT CURVE (D3 STACKED TRAJECTORY)', 17, nextY + 4.2);

  const chartY = nextY + 7;
  const chartHeightMm = 62;

  // Generate or embed high-res chart image
  const chartImgData = renderAmortizationChartToDataUrl(
    params.amortizationRows,
    currencyCfg.symbol === '₹' ? 'Rs.' : currencyCfg.symbol,
    1200,
    410
  );

  if (chartImgData) {
    try {
      doc.addImage(chartImgData, 'PNG', 14, chartY, 182, chartHeightMm);
    } catch (err) {
      console.warn('Could not add chart image to PDF:', err);
    }
  } else {
    // Vector fallback card if canvas is unavailable
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, chartY, 182, chartHeightMm, 2, 2, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Amortization Repayment Curve', 18, chartY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Total Tenure: ${params.loanMonths} Months (${params.loanYears} Years)`, 18, chartY + 22);
    doc.text(`Total Financed: ${fmt(params.loanPrincipal)} Principal + ${fmt(params.totalInterest)} Interest`, 18, chartY + 28);
  }

  // Under-chart explanatory footnote
  const footY = chartY + chartHeightMm + 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, footY, 182, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Amortization Dynamics Note:', 17, footY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Initial payments are predominantly interest charges (Rose) before transitioning to accelerated principal reduction (Blue).',
    17,
    footY + 8.5
  );

  if (params.sensitivityDelta && params.sensitivityDelta !== 0 && params.simRate && params.simEmi) {
    const sDiff = params.simEmi - params.monthlyEmi;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(
      `Sensitivity Insight: A ${params.sensitivityDelta > 0 ? '+' : ''}${params.sensitivityDelta.toFixed(1)}% rate shift (${params.simRate.toFixed(1)}% p.a.) alters EMI to ${fmt(params.simEmi)} (${sDiff >= 0 ? '+' : ''}${fmt(sDiff)}/mo).`,
      17,
      footY + 12
    );
  }

  // Page 1 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text('Jawed Imtiaz Tools · jawed.co.in/tools/car-affordability-calculator', 14, 287);
  doc.text('Page 1 of {total_pages}', 196, 287, { align: 'right' });

  // ==========================================
  // PAGE 2+: MONTH-BY-MONTH AMORTIZATION TABLE
  // ==========================================

  const rowsPerPage = 32;
  const totalMonths = params.amortizationRows.length;
  let currentRowIdx = 0;

  const colX = {
    month: 16,
    emi: 60,
    principal: 98,
    interest: 136,
    balance: 174,
  };

  while (currentRowIdx < totalMonths) {
    doc.addPage();

    // Top Header Banner
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, 12, 182, 16, 2, 2, 'F');
    doc.setFillColor(14, 165, 233);
    doc.roundedRect(14, 12, 3.5, 16, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('MONTH-BY-MONTH LOAN AMORTIZATION SCHEDULE', 21, 18.5);

    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(
      `Principal: ${fmt(params.loanPrincipal)} · Rate: ${params.interestRate}% · Tenure: ${params.loanMonths} Months · Monthly EMI: ${fmt(params.monthlyEmi)}`,
      21,
      24
    );

    // Table Header Row
    const tableHeaderY = 32;
    doc.setFillColor(2, 132, 199); // Sky-600
    doc.rect(14, tableHeaderY, 182, 6.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Month', colX.month, tableHeaderY + 4.5);
    doc.text('EMI Amount', colX.emi, tableHeaderY + 4.5, { align: 'right' });
    doc.text('Principal Paid', colX.principal, tableHeaderY + 4.5, { align: 'right' });
    doc.text('Interest Paid', colX.interest, tableHeaderY + 4.5, { align: 'right' });
    doc.text('Outstanding Balance', colX.balance, tableHeaderY + 4.5, { align: 'right' });

    // Table Data Rows
    let tableCurY = tableHeaderY + 6.5;
    const endRowIdx = Math.min(currentRowIdx + rowsPerPage, totalMonths);

    for (let i = currentRowIdx; i < endRowIdx; i++) {
      const row = params.amortizationRows[i];
      const isOdd = i % 2 === 1;

      if (isOdd) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, tableCurY, 182, 6.6, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(14, tableCurY + 6.6, 196, tableCurY + 6.6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Month ${row.month}`, colX.month, tableCurY + 4.6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(fmt(row.emi), colX.emi, tableCurY + 4.6, { align: 'right' });

      doc.setTextColor(2, 132, 199); // Sky-600
      doc.text(fmt(row.principal), colX.principal, tableCurY + 4.6, { align: 'right' });

      doc.setTextColor(225, 29, 72); // Rose-600
      doc.text(fmt(row.interest), colX.interest, tableCurY + 4.6, { align: 'right' });

      doc.setTextColor(15, 23, 42);
      doc.text(fmt(row.balance), colX.balance, tableCurY + 4.6, { align: 'right' });

      tableCurY += 6.6;
    }

    currentRowIdx = endRowIdx;

    // If final page and table complete, add Totals Summary Row & Disclaimer
    if (currentRowIdx >= totalMonths) {
      doc.setFillColor(240, 249, 255); // Sky-50
      doc.setDrawColor(2, 132, 199);
      doc.rect(14, tableCurY, 182, 7.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL REPAYMENT', colX.month, tableCurY + 5.2);
      doc.text(fmt(params.totalRepaid), colX.emi, tableCurY + 5.2, { align: 'right' });
      doc.setTextColor(2, 132, 199);
      doc.text(fmt(params.loanPrincipal), colX.principal, tableCurY + 5.2, { align: 'right' });
      doc.setTextColor(225, 29, 72);
      doc.text(fmt(params.totalInterest), colX.interest, tableCurY + 5.2, { align: 'right' });
      doc.setTextColor(16, 185, 129);
      doc.text(fmt(0), colX.balance, tableCurY + 5.2, { align: 'right' });

      tableCurY += 12;

      // Legal & Accuracy Disclaimer
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, tableCurY, 182, 15, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('Important Lending & Calculation Disclaimer:', 17, tableCurY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'This amortization schedule is modeled using standard monthly reducing balance interest compounding.',
        17,
        tableCurY + 8.5
      );
      doc.text(
        'Bank statements may vary slightly due to day-count conventions (actual/365 vs 30/360), advance EMIs, or loan origination fees.',
        17,
        tableCurY + 12
      );
    }

    // Page Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text('Jawed Imtiaz Tools · jawed.co.in/tools/car-affordability-calculator', 14, 287);
    doc.text(`Amortization Schedule · Page ${doc.getNumberOfPages()} of {total_pages}`, 196, 287, { align: 'right' });
  }

  // Replace {total_pages} placeholder across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Draw over placeholder if needed or replacement string
    // In jsPDF, we can set text directly on each page
    doc.setFillColor(255, 255, 255);
    doc.rect(170, 283, 28, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${totalPages}`, 196, 287, { align: 'right' });
  }

  return doc;
}

/**
 * Trigger immediate client-side PDF generation and download
 */
export function downloadCarLoanPdfReport(params: CarLoanPdfReportParams, customFilename?: string): void {
  const doc = generateCarLoanPdf(params);
  const dateStamp = new Date().toISOString().split('T')[0];
  const cleanPrice = Math.round(params.price);
  const defaultFilename = `car-loan-report-${params.loanYears}yr-${cleanPrice}-${dateStamp}.pdf`;
  doc.save(customFilename || defaultFilename);
}
