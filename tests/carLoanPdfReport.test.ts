import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPdfCurrency,
  renderAmortizationChartToDataUrl,
  generateCarLoanPdf,
  CarLoanAmortizationRow,
  CarLoanPdfReportParams,
} from '../src/utils/carLoanPdfReport';

/**
 * Helper to generate synthetic amortization rows
 */
function createAmortizationSchedule(principal: number, annualRate: number, tenureYears: number): CarLoanAmortizationRow[] {
  const n = tenureYears * 12;
  const r = annualRate / 1200;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  let bal = principal;
  const rows: CarLoanAmortizationRow[] = [];

  for (let m = 1; m <= n; m++) {
    const interest = bal * r;
    const princ = Math.min(bal, emi - interest);
    bal = Math.max(0, bal - princ);
    rows.push({
      month: m,
      emi,
      principal: princ,
      interest,
      balance: bal,
    });
  }

  return rows;
}

describe('Car Loan PDF Report Generator & Amortization Suite', () => {
  describe('formatPdfCurrency', () => {
    it('formats INR using safe "Rs." prefix and Indian numbering system without unicode encoding issues', () => {
      const formatted = formatPdfCurrency(1200000, 'INR');
      assert.ok(formatted.startsWith('Rs. '), `Expected prefix "Rs. ", got ${formatted}`);
      assert.ok(formatted.includes('12,00,000') || formatted.includes('1,200,000'), `Expected formatted number, got ${formatted}`);
    });

    it('formats USD using $ symbol and standard grouping', () => {
      const formatted = formatPdfCurrency(35000, 'USD');
      assert.strictEqual(formatted, '$35,000');
    });

    it('formats EUR using € symbol and standard grouping', () => {
      const formatted = formatPdfCurrency(28500, 'EUR');
      assert.strictEqual(formatted, '€28,500');
    });

    it('formats GBP using £ symbol', () => {
      const formatted = formatPdfCurrency(22000, 'GBP');
      assert.strictEqual(formatted, '£22,000');
    });

    it('formats AED using "AED " text prefix', () => {
      const formatted = formatPdfCurrency(95000, 'AED');
      assert.strictEqual(formatted, 'AED 95,000');
    });

    it('supports optional decimal points when requested', () => {
      const formatted = formatPdfCurrency(19926.45, 'USD', true);
      assert.strictEqual(formatted, '$19,926.45');
    });
  });

  describe('renderAmortizationChartToDataUrl', () => {
    it('handles empty data gracefully without throwing errors in any environment', () => {
      const res = renderAmortizationChartToDataUrl([]);
      // In headless Node (no window.document), returns null safely
      assert.ok(res === null || typeof res === 'string');
    });

    it('handles 60-month amortization schedule safely', () => {
      const rows = createAmortizationSchedule(960000, 9.0, 5);
      const res = renderAmortizationChartToDataUrl(rows, 'Rs.', 800, 300);
      assert.ok(res === null || typeof res === 'string');
    });
  });

  describe('generateCarLoanPdf', () => {
    it('generates a multi-page PDF document for a standard 5-year loan (60 months)', () => {
      const principal = 960000;
      const rate = 9.0;
      const years = 5;
      const rows = createAmortizationSchedule(principal, rate, years);
      const monthlyEmi = rows[0].emi;
      const totalRepaid = monthlyEmi * rows.length;
      const totalInterest = totalRepaid - principal;

      const reportParams: CarLoanPdfReportParams = {
        currency: 'INR',
        scenarioName: 'Scenario A: 5-Year Standard',
        price: 1200000,
        downPayment: 240000,
        downPaymentPercent: 20.0,
        isDownPaymentPercent: true,
        loanPrincipal: principal,
        interestRate: rate,
        loanYears: years,
        loanMonths: years * 12,
        monthlyEmi,
        totalInterest,
        totalRepaid,
        effectivePurchaseCost: 240000 + totalRepaid,
        monthlyTco: monthlyEmi + 10500,
        salary: 120000,
        existingEmis: 0,
        isEmiHealthPass: false, // 19926 / 120000 = 16.6% > 15%
        maxRecommendedEmi: 18000,
        sensitivityDelta: 1.0,
        simRate: 10.0,
        simEmi: 20400,
        simInterest: totalInterest + 28000,
        amortizationRows: rows,
      };

      const doc = generateCarLoanPdf(reportParams);
      assert.ok(doc, 'PDF document should be generated');

      const pageCount = doc.getNumberOfPages();
      // Page 1: Executive Summary, KPI Cards, Health Check, D3 Repayment Chart
      // Pages 2+: 60 months amortization table at 32 rows/page = 2 table pages
      // Total pages = 1 + 2 = 3 pages!
      assert.ok(pageCount >= 2, `Expected at least 2 pages for 60-month schedule, got ${pageCount}`);
      assert.strictEqual(pageCount, 3, `Expected exactly 3 pages for 60-month schedule, got ${pageCount}`);
    });

    it('generates a 4-page PDF document for an extended 7-year loan (84 months)', () => {
      const principal = 1000000;
      const rate = 9.5;
      const years = 7;
      const rows = createAmortizationSchedule(principal, rate, years);
      const monthlyEmi = rows[0].emi;
      const totalRepaid = monthlyEmi * rows.length;
      const totalInterest = totalRepaid - principal;

      const reportParams: CarLoanPdfReportParams = {
        currency: 'USD',
        scenarioName: 'Scenario B: 7-Year Lower EMI',
        price: 45000,
        downPayment: 9000,
        downPaymentPercent: 20.0,
        isDownPaymentPercent: true,
        loanPrincipal: 36000,
        interestRate: rate,
        loanYears: years,
        loanMonths: years * 12,
        monthlyEmi,
        totalInterest,
        totalRepaid,
        effectivePurchaseCost: 9000 + totalRepaid,
        monthlyTco: monthlyEmi + 450,
        salary: 8000,
        existingEmis: 500,
        isEmiHealthPass: true,
        maxRecommendedEmi: 1200,
        amortizationRows: rows,
      };

      const doc = generateCarLoanPdf(reportParams);
      const pageCount = doc.getNumberOfPages();
      // 84 months across 32 rows/page requires 3 table pages + 1 summary page = 4 pages
      assert.strictEqual(pageCount, 4, `Expected 4 pages for 84-month schedule, got ${pageCount}`);
    });

    it('generates a 2-page PDF document for a short 3-year loan (36 months)', () => {
      const principal = 500000;
      const rate = 8.5;
      const years = 3;
      const rows = createAmortizationSchedule(principal, rate, years);
      const monthlyEmi = rows[0].emi;
      const totalRepaid = monthlyEmi * rows.length;
      const totalInterest = totalRepaid - principal;

      const reportParams: CarLoanPdfReportParams = {
        currency: 'EUR',
        price: 30000,
        downPayment: 6000,
        downPaymentPercent: 20.0,
        isDownPaymentPercent: true,
        loanPrincipal: 24000,
        interestRate: rate,
        loanYears: years,
        loanMonths: years * 12,
        monthlyEmi,
        totalInterest,
        totalRepaid,
        effectivePurchaseCost: 6000 + totalRepaid,
        amortizationRows: rows,
      };

      const doc = generateCarLoanPdf(reportParams);
      const pageCount = doc.getNumberOfPages();
      // 36 months fits into 2 schedule pages or 1 table page depending on rows/page (32 + 4 -> 2 table pages = 3 total pages, or 36)
      assert.ok(pageCount >= 2 && pageCount <= 3, `Expected 2 or 3 pages, got ${pageCount}`);
    });

    it('gracefully handles missing optional salary and sensitivity parameters without crashing', () => {
      const rows = createAmortizationSchedule(500000, 9.0, 3);
      const reportParams: CarLoanPdfReportParams = {
        currency: 'GBP',
        price: 25000,
        downPayment: 5000,
        downPaymentPercent: 20,
        isDownPaymentPercent: true,
        loanPrincipal: 20000,
        interestRate: 9.0,
        loanYears: 3,
        loanMonths: 36,
        monthlyEmi: rows[0].emi,
        totalInterest: rows[0].emi * 36 - 20000,
        totalRepaid: rows[0].emi * 36,
        effectivePurchaseCost: 5000 + rows[0].emi * 36,
        amortizationRows: rows,
      };

      const doc = generateCarLoanPdf(reportParams);
      assert.ok(doc, 'Should generate PDF without salary or sensitivity fields');
      assert.ok(doc.getNumberOfPages() >= 2);
    });
  });
});
