import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { useLocalStorageDraft } from '../hooks/useLocalStorageDraft';
import { useToolInteractionLogger } from '../hooks/useToolInteractionLogger';
import { DraftSaveToolbar } from '../components/common/DraftSaveToolbar';
import { CopyButton } from '../components/common/CopyButton';
import { PdfExportButton } from '../components/common/PdfExportButton';
import { PrintReportButton } from '../components/common/PrintReportButton';
import { A4PrintPreviewModal } from '../components/A4PrintPreviewModal';
import { Car, Calculator, Wallet, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown, Download, Copy, RefreshCw, Sliders } from 'lucide-react';
import { CarAmortizationAreaChart } from '../components/common/CarAmortizationAreaChart';

export interface CarAffordabilityDraft {
  price: string;
  downPayment: string;
  isDownPaymentPercent: boolean;
  interestRate: string;
  loanYears: number;
  compareLoans: boolean;
  compareInterestRate: string;
  compareLoanYears: number;
  sensitivityDelta: number;
  salary: string;
  existingEmis: string;
  fuel: string;
  insurance: string;
  maintenance: string;
  parking: string;
  misc: string;
  savings: string;
  car2Price: string;
  car3Price: string;
}

const DEFAULT_CAR_DRAFT: CarAffordabilityDraft = {
  price: '1200000',
  downPayment: '20',
  isDownPaymentPercent: true,
  interestRate: '9',
  loanYears: 5,
  compareLoans: false,
  compareInterestRate: '10.5',
  compareLoanYears: 4,
  sensitivityDelta: 1.0,
  salary: '',
  existingEmis: '',
  fuel: '',
  insurance: '',
  maintenance: '',
  parking: '',
  misc: '',
  savings: '',
  car2Price: '900000',
  car3Price: '1500000',
};

export const CarAffordabilityCalculator: React.FC = () => {
  const {
    values,
    updateField,
    saveDraftNow,
    clearDraft,
    isDirty,
    hasSavedDraft,
    isRestored,
    formattedLastSaved,
    statusMessage,
    saveStatus,
  } = useLocalStorageDraft<CarAffordabilityDraft>({
    key: 'car_affordability_calculator_draft_v1',
    defaultValues: DEFAULT_CAR_DRAFT,
  });

  const { logCalculationSubmitted, logResultCopied, logPdfExported } = useToolInteractionLogger({
    toolId: 'car-affordability-calculator',
  });

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);

  const {
    price,
    downPayment,
    isDownPaymentPercent,
    interestRate,
    loanYears,
    compareLoans,
    compareInterestRate,
    compareLoanYears,
    sensitivityDelta = 1.0,
    salary,
    existingEmis,
    fuel,
    insurance,
    maintenance,
    parking,
    misc,
    savings,
    car2Price,
    car3Price,
  } = values;

  const num = (v: any) => {
    const x = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(x) ? 0 : x;
  };

  const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
  const pc = (n: number) => (n * 100).toFixed(1) + '%';
  const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
  
  const getFillStyle = (p: number, c: string): React.CSSProperties => ({
    width: `${clamp(p, 0, 100).toFixed(1)}%`,
    background: c,
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.4s ease',
  });

  const P = Math.max(0, num(price));
  const sal = num(salary) > 0 ? num(salary) : 0;
  const ex = Math.max(0, num(existingEmis));
  const rate = clamp(num(interestRate), 0, 25);
  const yrs = clamp(Number(loanYears) || 1, 1, 7);
  const n = yrs * 12;
  const r = rate / 1200;

  const dpRaw = Math.max(0, num(downPayment));
  const dpAmt = isDownPaymentPercent ? P * Math.min(100, dpRaw) / 100 : Math.min(P, dpRaw);
  const dpFrac = P > 0 ? dpAmt / P : 0;
  const L = Math.max(0, P - dpAmt);

  const emiOf = (loanAmount: number) => {
    if (loanAmount <= 0) return 0;
    if (r === 0) return loanAmount / n;
    return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const emi = emiOf(L);
  const repaid = emi * n;
  const interest = Math.max(0, repaid - L);

  const cRate = clamp(num(compareInterestRate), 0, 25);
  const cYrs = clamp(Number(compareLoanYears) || 1, 1, 7);
  const cN = cYrs * 12;
  const cR = cRate / 1200;
  const cEmiOf = (loanAmount: number) => {
    if (loanAmount <= 0) return 0;
    if (cR === 0) return loanAmount / cN;
    return (loanAmount * cR * Math.pow(1 + cR, cN)) / (Math.pow(1 + cR, cN) - 1);
  };
  const cEmi = cEmiOf(L);
  const cRepaid = cEmi * cN;
  const cInterest = Math.max(0, cRepaid - L);

  // Sensitivity Analysis (±2% Range Adjustment)
  const sDelta = typeof sensitivityDelta === 'number' ? sensitivityDelta : 1.0;
  const simRate = Math.max(0.1, Math.min(25, rate + sDelta));
  const simR = simRate / 1200;
  const simEmi = simR === 0 ? L / n : (L * simR * Math.pow(1 + simR, n)) / (Math.pow(1 + simR, n) - 1);
  const simRepaid = simEmi * n;
  const simInterest = Math.max(0, simRepaid - L);
  const diffEmi = simEmi - emi;
  const diffInterest = simInterest - interest;
  const pctEmiDiff = emi > 0 ? (diffEmi / emi) * 100 : 0;
  const pctInterestDiff = interest > 0 ? (diffInterest / interest) * 100 : 0;

  const sensitivityPresets = [-2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0];

  const sensitivityScenarios = useMemo(() => {
    return [-2, -1, 0, 1, 2].map((d) => {
      const scRate = Math.max(0.1, Math.min(25, rate + d));
      const scR = scRate / 1200;
      const scEmi = scR === 0 ? L / n : (L * scR * Math.pow(1 + scR, n)) / (Math.pow(1 + scR, n) - 1);
      const scRepaid = scEmi * n;
      const scInterest = Math.max(0, scRepaid - L);
      const scDiffEmi = scEmi - emi;
      const scDiffInterest = scInterest - interest;
      return {
        delta: d,
        rate: scRate,
        emi: scEmi,
        interest: scInterest,
        repaid: scRepaid,
        diffEmi: scDiffEmi,
        diffInterest: scDiffInterest,
        isBase: d === 0,
        isSelected: Math.abs(sDelta - d) < 0.05,
      };
    });
  }, [L, rate, n, emi, interest, sDelta]);

  const g = (val: string) => Math.max(0, num(val));
  const otherMonthly = g(fuel) + g(insurance) / 12 + g(maintenance) / 12 + g(parking) + g(misc);
  const sav = g(savings);
  const tco = emi + otherMonthly;

  // Validation errors
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (num(price) <= 0) errs.push('Enter a car on-road price greater than ₹0.');
    if (num(interestRate) > 25) errs.push('Interest rate should be between 0% and 25%.');
    if (isDownPaymentPercent && dpRaw > 100) errs.push('Down payment percentage cannot exceed 100%.');
    if (!isDownPaymentPercent && dpRaw > P) errs.push('Down payment amount cannot exceed the car price.');
    if (salary && num(salary) <= 0) errs.push('Monthly salary must be greater than ₹0.');
    return errs;
  }, [price, interestRate, isDownPaymentPercent, dpRaw, P, salary]);

  // Amortization schedule calculation
  const amortizationData = useMemo(() => {
    let bal = L;
    let rows = [];
    let csvRows = [];
    let yp = 0;
    let yi = 0;
    const yMax = emi * 12 || 1;
    let yearlyBars = [];

    for (let m = 1; m <= n; m++) {
      const interestPayment = bal * r;
      const principalPayment = Math.min(bal, emi - interestPayment);
      bal = Math.max(0, bal - principalPayment);

      rows.push({ month: m, emi, principal: principalPayment, interest: interestPayment, balance: bal });
      csvRows.push([m, emi.toFixed(2), principalPayment.toFixed(2), interestPayment.toFixed(2), bal.toFixed(2)].join(','));

      yp += principalPayment;
      yi += interestPayment;

      if (m % 12 === 0 || m === n) {
        yearlyBars.push({
          year: Math.ceil(m / 12),
          principal: yp,
          interest: yi,
          pPct: (yp / yMax) * 100,
          iPct: (yi / yMax) * 100,
        });
        yp = 0;
        yi = 0;
      }
    }

    return { rows, csv: 'Month,EMI,Principal,Interest,Balance\n' + csvRows.join('\n'), yearlyBars };
  }, [L, emi, n, r]);

  // Scoring factors
  const factorsFor = (pVal: number, eVal: number): [string, number, number][] => {
    const a = sal ? pVal / (sal * 12) : 0;
    const b = sal ? (ex + eVal) / sal : 0;
    const d = sal ? ex / sal : 0;
    const t = sal ? (eVal + otherMonthly) / sal : 0;
    const mo = sav > 0 ? sav / (eVal + otherMonthly || 1) : -1;

    return [
      ['Price vs income', a <= 0.4 ? 25 : a <= 0.6 ? 18 : a <= 0.8 ? 10 : 3, 25],
      ['EMI burden', b <= 0.15 ? 25 : b <= 0.25 ? 18 : b <= 0.35 ? 9 : 2, 25],
      ['Existing debt', d <= 0.1 ? 15 : d <= 0.2 ? 11 : d <= 0.3 ? 6 : 2, 15],
      ['Emergency fund', mo < 0 ? 8 : mo >= 6 ? 20 : mo >= 3 ? 12 : 4, 20],
      ['Ownership cost', t <= 0.25 ? 15 : t <= 0.35 ? 11 : t <= 0.45 ? 6 : 2, 15],
    ];
  };

  const scoreOf = (pVal: number, eVal: number) => factorsFor(pVal, eVal).reduce((acc, f) => acc + (f[1] as number), 0);

  const getRisk = (b: number) => b <= 0.15 ? ['Comfortable', 'var(--emerald)'] : b <= 0.25 ? ['Manageable', 'var(--amber)'] : b <= 0.35 ? ['Stretched', 'var(--rose)'] : ['High risk', 'var(--rose)'];
  const getVerdict = (s: number) => s >= 80 ? ['Highly affordable', 'var(--emerald)'] : s >= 60 ? ['Affordable', 'var(--amber)'] : s >= 40 ? ['Stretch purchase', 'var(--rose)'] : ['Financially risky', 'var(--rose)'];

  const ratio = sal ? P / (sal * 12) : 0;
  const bF = sal ? (ex + emi) / sal : 0;
  const rk = getRisk(bF);
  const score = sal ? scoreOf(P, emi) : 0;
  const vd = getVerdict(score);

  const handleCopySummary = () => {
    const text = `Car Affordability & EMI Report (India):\nCar Price: ${fmt(P)}\nDown Payment: ${fmt(dpAmt)}\nLoan Amount: ${fmt(L)} (${rate}% for ${yrs} yrs)\nMonthly EMI: ${fmt(emi)}\nTotal Interest: ${fmt(interest)}\nTotal Repaid: ${fmt(repaid)}\nMonthly TCO: ${fmt(tco)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(true);
      logResultCopied();
      setTimeout(() => setCopyStatus(false), 2000);
    });
  };

  const handleShareSummary = () => {
    const text = `🚗 Car Affordability & EMI Report (India)\n` +
      `• On-Road Price: ${fmt(P)}\n` +
      `• Down Payment: ${fmt(dpAmt)} (${isDownPaymentPercent ? `${downPayment}%` : 'Custom'})\n` +
      `• Loan Amount: ${fmt(L)} (${rate}% p.a. for ${loanYears} yrs)\n` +
      `• Monthly EMI: ${fmt(emi)}\n` +
      `• Total Interest: ${fmt(interest)}\n` +
      `• Total Repaid: ${fmt(repaid)}\n` +
      `• Monthly TCO (Running Costs): ${fmt(tco)}\n` +
      (sDelta !== 0 ? `• Interest Rate Sensitivity Shift (${sDelta > 0 ? '+' : ''}${sDelta.toFixed(1)}% at ${simRate.toFixed(1)}% p.a.): EMI ${fmt(simEmi)} (${diffEmi >= 0 ? '+' : '−'}${fmt(Math.abs(diffEmi))}/mo), Total Int ${fmt(simInterest)} (${diffInterest >= 0 ? '+' : '−'}${fmt(Math.abs(diffInterest))})\n` : '') +
      (sal ? `• Salary & EMI Burden: ${pc(bF)} of income (${rk[0]})\n` : '') +
      `\nCalculated on Jawed Imtiaz Tools (https://jawed.co.in/tools/car-affordability-calculator)`;

    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(true);
      logResultCopied();
      setTimeout(() => setCopyStatus(false), 2500);
    });
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([amortizationData.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'car-loan-amortization-schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logCalculationSubmitted({ action: 'download_csv' });
    setCsvNotice('Amortization CSV downloaded successfully!');
    setTimeout(() => setCsvNotice(null), 3000);
  };

  return (
    <div className="page">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'Car Affordability & EMI Calculator (India)' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="Car Affordability & EMI Calculator (India)"
            text="Check what car price you can afford, monthly EMI, total cost of ownership, and compare cars side by side."
          />
        </div>

        <header className="page-header">
          <h1 className="page-title">Car Affordability &amp; EMI Calculator (India)</h1>
          <p className="page-lead">
            Check what car price you can afford based on your annual income in India, compute your monthly EMI, amortization schedule, running costs, emergency fund runway, and compare up to 3 cars side by side.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <DraftSaveToolbar
                isOnline={true}
                hasSavedDraft={hasSavedDraft}
                isRestored={isRestored}
                isDirty={isDirty}
                formattedLastSaved={formattedLastSaved}
                statusMessage={statusMessage}
                saveStatus={saveStatus}
                onSaveNow={saveDraftNow}
                onClearDraft={clearDraft}
                toolName="Car Affordability Calculator"
              />
              <button
                type="button"
                onClick={handleShareSummary}
                className="button button-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Copy size={14} /> {copyStatus ? 'Copied Summary for Email/Chat!' : 'Share / Copy Loan Summary'}
              </button>
            </div>

            {errors.length > 0 && (
              <div className="err" role="alert" style={{ marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--rose)', borderRadius: '12px', padding: '14px' }}>
                <strong style={{ color: 'var(--rose)' }}>Please fix the following validation issues:</strong>
                {errors.map((e, idx) => (
                  <p key={idx} style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--rose)' }}>• {e}</p>
                ))}
              </div>
            )}

            {/* Section 1: Car Affordability Check */}
            <section style={{ marginBottom: '28px' }}>
              <h2 className="section-title">1 · Car Affordability Check</h2>
              <p className="page-lead" style={{ fontSize: '0.9rem', marginBottom: '14px' }}>
                A commonly used financial guideline in India is that a car should cost roughly 40–60% of your net annual income. Spending significantly more may limit your ability to save, invest, and maintain financial flexibility.
              </p>
              <div className="field-grid" style={{ alignItems: 'end' }}>
                <div className="field-group">
                  <label htmlFor="price">Car On-Road Price (₹)</label>
                  <input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={e => updateField('price', e.target.value)}
                  />
                </div>
              </div>

              <div className="calc-summary" style={{ marginTop: '16px' }}>
                <div className="summary-item">
                  <span>Car Price</span>
                  <span>{fmt(P)}</span>
                </div>
                <div className="summary-item">
                  <span>Recommended Annual Income (40%–60%)</span>
                  <span>{fmt(P / 0.6)} – {fmt(P / 0.4)}</span>
                </div>
                <div className="summary-item">
                  <span>Recommended Monthly Salary</span>
                  <span>{fmt(P / 0.6 / 12)} – {fmt(P / 0.4 / 12)}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div className="k">Affordability Gauge · Car price as % of annual income</div>
                <div
                  role="img"
                  aria-label={sal ? `Car price is ${pc(ratio)} of annual income` : 'Enter salary in Section 3 to see gauge position'}
                  style={{
                    position: 'relative',
                    marginTop: '10px',
                    height: '14px',
                    borderRadius: '99px',
                    background: 'linear-gradient(90deg, #10b981 0 40%, #f59e0b 40% 60%, #f43f5e 60% 100%)',
                  }}
                >
                  {sal && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        width: '6px',
                        height: '24px',
                        borderRadius: '3px',
                        background: 'var(--text-heading)',
                        left: `calc(${Math.min(100, ratio * 100).toFixed(1)}% - 3px)`,
                        boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                      }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>0%</span>
                  <span>40% (Comfortable)</span>
                  <span>60% (Stretched)</span>
                  <span>100%+</span>
                </div>
                {sal ? (
                  <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                    This car represents <strong>{pc(ratio)}</strong> of your annual take-home income.
                  </p>
                ) : (
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Add your take-home salary in Section 3 below to place your position on the affordability gauge.
                  </p>
                )}
              </div>
            </section>

            {/* Section 2: EMI Calculator */}
            <section style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">2 · EMI Calculator &amp; Amortization</h2>
              <div className="field-grid" style={{ alignItems: 'end', marginTop: '14px' }}>
                <div className="field-group">
                  <label>Car Price (from Section 1)</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, padding: '10px 0', color: 'var(--accent)' }}>{fmt(P)}</div>
                </div>

                <div className="field-group">
                  <label htmlFor="downPayment">Down Payment ({isDownPaymentPercent ? '%' : '₹'})</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="downPayment"
                      type="text"
                      inputMode="decimal"
                      value={downPayment}
                      onChange={e => updateField('downPayment', e.target.value)}
                    />
                    <button
                      type="button"
                      className={isDownPaymentPercent ? 'on' : ''}
                      onClick={() => updateField('isDownPaymentPercent', true)}
                      style={{ padding: '0 12px' }}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={!isDownPaymentPercent ? 'on' : ''}
                      onClick={() => updateField('isDownPaymentPercent', false)}
                      style={{ padding: '0 12px' }}
                    >
                      ₹
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="interestRate">Interest Rate (% p.a.)</label>
                  <input
                    id="interestRate"
                    type="text"
                    inputMode="decimal"
                    value={interestRate}
                    onChange={e => updateField('interestRate', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="loanYears">Loan Tenure: {loanYears} {loanYears === 1 ? 'year' : 'years'}</label>
                  <input
                    id="loanYears"
                    type="range"
                    min="1"
                    max="7"
                    step="1"
                    value={loanYears}
                    onChange={e => updateField('loanYears', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="calc-summary" style={{ marginTop: '18px' }}>
                <div className="summary-item">
                  <span>Down Payment ({isDownPaymentPercent ? `${downPayment}%` : 'Amount'})</span>
                  <span>{fmt(dpAmt)}</span>
                </div>
                <div className="summary-item">
                  <span>Loan Amount</span>
                  <span>{fmt(L)}</span>
                </div>
                <div className="summary-item">
                  <span>Monthly EMI</span>
                  <span style={{ color: 'var(--accent)' }}>{fmt(emi)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Interest Paid</span>
                  <span>{fmt(interest)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Amount Repaid</span>
                  <span>{fmt(repaid)}</span>
                </div>
                <div className="summary-item">
                  <span>Effective Purchase Cost</span>
                  <span>{fmt(dpAmt + repaid)}</span>
                </div>
              </div>

              {/* Compare Loans Toggle & Comparison View */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="compareLoansToggle"
                      checked={compareLoans}
                      onChange={e => updateField('compareLoans', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <label htmlFor="compareLoansToggle" style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                      Compare Loans (Side-by-Side Scenario B)
                    </label>
                  </div>
                  {compareLoans && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                      Comparing Option A vs. Option B
                    </span>
                  )}
                </div>

                {compareLoans && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <div className="field-grid" style={{ marginBottom: '16px' }}>
                      <div className="field-group">
                        <label htmlFor="compareInterestRate">Scenario B Interest Rate (% p.a.)</label>
                        <input
                          id="compareInterestRate"
                          type="text"
                          inputMode="decimal"
                          value={compareInterestRate}
                          onChange={e => updateField('compareInterestRate', e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="compareLoanYears">Scenario B Tenure: {compareLoanYears} {compareLoanYears === 1 ? 'year' : 'years'}</label>
                        <input
                          id="compareLoanYears"
                          type="range"
                          min="1"
                          max="7"
                          step="1"
                          value={compareLoanYears}
                          onChange={e => updateField('compareLoanYears', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="g" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                      <div className="panel" style={{ background: 'var(--bg)', padding: '14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px' }}>
                          Option A (Current: {rate}% / {yrs} yrs)
                        </div>
                        <div className="kv" style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px' }}>
                          <span>Monthly EMI</span>
                          <strong style={{ color: 'var(--text-heading)' }}>{fmt(emi)}</strong>
                          <span>Total Interest</span>
                          <span>{fmt(interest)}</span>
                          <span>Total Repaid</span>
                          <span>{fmt(repaid)}</span>
                        </div>
                      </div>

                      <div className="panel" style={{ background: 'var(--bg)', padding: '14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--rose)', marginBottom: '8px' }}>
                          Option B (Compare: {cRate}% / {cYrs} yrs)
                        </div>
                        <div className="kv" style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px' }}>
                          <span>Monthly EMI</span>
                          <strong style={{ color: 'var(--text-heading)' }}>{fmt(cEmi)}</strong>
                          <span>Total Interest</span>
                          <span>{fmt(cInterest)}</span>
                          <span>Total Repaid</span>
                          <span>{fmt(cRepaid)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <strong>Difference (Option B vs A):</strong> Monthly EMI difference is <strong>{fmt(Math.abs(cEmi - emi))}</strong> ({cEmi > emi ? 'higher' : 'lower'}), and total interest difference is <strong>{fmt(Math.abs(cInterest - interest))}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {/* Sensitivity Analysis (±2% Range Adjustment & Benchmark Matrix) */}
              <div style={{ marginTop: '20px', padding: '18px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={18} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>Interest Rate Sensitivity Analysis (±2.0%)</h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-accent)', color: 'var(--accent)', fontWeight: 700 }}>
                    Instant Rate Impact Model
                  </span>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Visualize how interest rate fluctuations of ±1% to ±2% impact your monthly EMI and total interest paid for your {fmt(L)} loan across the {yrs}-year tenure.
                </p>

                {/* Slider Control Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label htmlFor="sensitivitySlider" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Simulated Rate Shift:{' '}
                      <span style={{ color: sDelta > 0 ? 'var(--rose)' : sDelta < 0 ? 'var(--emerald)' : 'var(--accent)', fontWeight: 800 }}>
                        {sDelta > 0 ? `+${sDelta.toFixed(2)}%` : sDelta < 0 ? `${sDelta.toFixed(2)}%` : '0.00% (Baseline)'}
                      </span>
                    </label>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Adjusted Rate: <strong style={{ color: 'var(--text-heading)' }}>{simRate.toFixed(2)}% p.a.</strong> (Base: {rate.toFixed(2)}%)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)', minWidth: '40px' }}>−2.0%</span>
                    <input
                      id="sensitivitySlider"
                      type="range"
                      min="-2"
                      max="2"
                      step="0.25"
                      value={sDelta}
                      onChange={e => updateField('sensitivityDelta', parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      aria-label="Interest rate sensitivity adjustment slider"
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rose)', minWidth: '40px', textAlign: 'right' }}>+2.0%</span>
                  </div>

                  {/* Preset Quick Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '4px' }}>Quick Shifts:</span>
                    {sensitivityPresets.map(preset => {
                      const isSelected = Math.abs(sDelta - preset) < 0.05;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateField('sensitivityDelta', preset)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--accent)' : 'var(--surface)',
                            color: isSelected ? '#ffffff' : 'var(--text)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {preset === 0 ? 'Base (0%)' : preset > 0 ? `+${preset}%` : `${preset}%`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-Time Impact Metric Cards */}
                <div className="calc-summary" style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <div className="summary-item">
                    <span>Simulated Monthly EMI</span>
                    <span style={{ color: diffEmi > 0 ? 'var(--rose)' : diffEmi < 0 ? 'var(--emerald)' : 'var(--accent)' }}>
                      {fmt(simEmi)}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: diffEmi > 0 ? 'var(--rose)' : diffEmi < 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                      {diffEmi === 0 ? 'Equal to baseline' : `${diffEmi > 0 ? '+' : '−'}${fmt(Math.abs(diffEmi))}/mo (${diffEmi > 0 ? '+' : ''}${pctEmiDiff.toFixed(1)}%)`}
                    </span>
                  </div>

                  <div className="summary-item">
                    <span>Simulated Total Interest</span>
                    <span style={{ color: diffInterest > 0 ? 'var(--rose)' : diffInterest < 0 ? 'var(--emerald)' : 'var(--text-heading)' }}>
                      {fmt(simInterest)}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: diffInterest > 0 ? 'var(--rose)' : diffInterest < 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                      {diffInterest === 0 ? 'Equal to baseline' : `${diffInterest > 0 ? '+' : '−'}${fmt(Math.abs(diffInterest))} (${diffInterest > 0 ? '+' : ''}${pctInterestDiff.toFixed(1)}%)`}
                    </span>
                  </div>

                  <div className="summary-item">
                    <span>Total Amount Repaid</span>
                    <span>{fmt(simRepaid)}</span>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      Over {yrs} years ({n} payments)
                    </span>
                  </div>
                </div>

                {/* Benchmark Sensitivity Matrix Table */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Rate Shift Benchmark Matrix (Select any row to test)
                  </div>
                  <div className="sc" style={{ maxHeight: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Rate Shift</th>
                          <th>Effective Rate</th>
                          <th>Monthly EMI</th>
                          <th>Monthly Impact</th>
                          <th>Total Interest</th>
                          <th>Total Lifetime Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityScenarios.map(sc => (
                          <tr
                            key={sc.delta}
                            onClick={() => updateField('sensitivityDelta', sc.delta)}
                            style={{
                              cursor: 'pointer',
                              background: sc.isSelected ? 'var(--surface-accent)' : undefined,
                              fontWeight: sc.isSelected || sc.isBase ? 700 : 400,
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td>
                              {sc.isBase ? 'Base Rate (0%)' : sc.delta > 0 ? `+${sc.delta}%` : `${sc.delta}%`}
                              {sc.isSelected && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--accent)' }}>◀ Active</span>}
                            </td>
                            <td>{sc.rate.toFixed(2)}%</td>
                            <td style={{ color: sc.diffEmi > 0 ? 'var(--rose)' : sc.diffEmi < 0 ? 'var(--emerald)' : undefined }}>
                              {fmt(sc.emi)}
                            </td>
                            <td style={{ color: sc.diffEmi > 0 ? 'var(--rose)' : sc.diffEmi < 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                              {sc.diffEmi === 0 ? '—' : `${sc.diffEmi > 0 ? '+' : '−'}${fmt(Math.abs(sc.diffEmi))}`}
                            </td>
                            <td>{fmt(sc.interest)}</td>
                            <td style={{ color: sc.diffInterest > 0 ? 'var(--rose)' : sc.diffInterest < 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                              {sc.diffInterest === 0 ? '—' : `${sc.diffInterest > 0 ? '+' : '−'}${fmt(Math.abs(sc.diffInterest))}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Charts & Breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '22px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    role="img"
                    aria-label={`Principal ${(L / (repaid || 1) * 100).toFixed(1)}%, interest ${(interest / (repaid || 1) * 100).toFixed(1)}%`}
                    style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      flex: 'none',
                      background: `conic-gradient(var(--accent) 0 ${(L / (repaid || 1) * 100).toFixed(1)}%, var(--rose) 0)`,
                    }}
                  />
                  <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span><span className="dot" style={{ background: 'var(--accent)' }} /> Principal ({pc(L / (repaid || 1))})</span>
                    <span><span className="dot" style={{ background: 'var(--rose)' }} /> Interest ({pc(interest / (repaid || 1))})</span>
                  </div>
                </div>

                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <div className="k" style={{ marginBottom: '8px' }}>Loan Breakdown by Year (Principal vs Interest)</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '130px', padding: '10px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    {amortizationData.yearlyBars.map(bar => (
                      <div key={bar.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} title={`Year ${bar.year}: Principal ${fmt(bar.principal)}, Interest ${fmt(bar.interest)}`}>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '90px' }}>
                          <div style={{ width: '100%', background: 'var(--rose)', height: `${bar.iPct}%` }} />
                          <div style={{ width: '100%', background: 'var(--accent)', height: `${bar.pPct}%` }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Y{bar.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* D3.js Stacked Area Chart */}
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Principal vs. Interest Payments (Stacked Area Chart)</h3>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem' }}>
                    <span><span className="dot" style={{ background: '#0ea5e9' }} /> Principal</span>
                    <span><span className="dot" style={{ background: '#f43f5e' }} /> Interest</span>
                  </div>
                </div>
                <CarAmortizationAreaChart data={amortizationData.rows} height={260} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>Amortization Schedule</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleDownloadCsv} className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={14} /> Download CSV
                  </button>
                  <button type="button" onClick={handleCopySummary} className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Copy size={14} /> {copyStatus ? 'Copied!' : 'Copy Summary'}
                  </button>
                  {csvNotice && <span style={{ fontSize: '0.8rem', color: 'var(--emerald)', fontWeight: 600 }}>{csvNotice}</span>}
                </div>
              </div>

              <div className="sc" style={{ marginTop: '10px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>EMI</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationData.rows.map(row => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>{fmt(row.emi)}</td>
                        <td>{fmt(row.principal)}</td>
                        <td>{fmt(row.interest)}</td>
                        <td>{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Salary & Existing EMI Analysis */}
            <section style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">3 · Salary &amp; Existing EMI Analysis</h2>
              <p className="page-lead" style={{ fontSize: '0.9rem', marginBottom: '14px' }}>
                Optional. Existing monthly liabilities can include home loans, personal loans, education loans, bike loans, and credit card EMIs.
              </p>
              <div className="field-grid">
                <div className="field-group">
                  <label htmlFor="salary">Monthly Take-Home Salary (₹)</label>
                  <input
                    id="salary"
                    type="text"
                    inputMode="decimal"
                    value={salary}
                    onChange={e => updateField('salary', e.target.value)}
                    placeholder="e.g. 120000"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="existingEmis">Existing Monthly EMIs (₹)</label>
                  <input
                    id="existingEmis"
                    type="text"
                    inputMode="decimal"
                    value={existingEmis}
                    onChange={e => updateField('existingEmis', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {sal ? (
                <div style={{ marginTop: '18px' }}>
                  <div className="calc-summary">
                    <div className="summary-item">
                      <span>Current Salary</span>
                      <span>{fmt(sal)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Existing EMIs</span>
                      <span>{fmt(ex)}</span>
                    </div>
                    <div className="summary-item">
                      <span>New Car EMI</span>
                      <span style={{ color: 'var(--accent)' }}>{fmt(emi)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total EMIs After Purchase</span>
                      <span>{fmt(ex + emi)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div className="k">Total EMI Burden as % of Income</div>
                      <div className="v" style={{ fontSize: '1.4rem' }}>{pc(bF)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>(Current: {pc(ex / sal)})</span></div>
                    </div>
                    <span style={{ padding: '6px 14px', borderRadius: '99px', background: 'var(--bg)', border: `1px solid ${rk[1]}`, color: rk[1], fontWeight: 700 }}>
                      ● {rk[0]}
                    </span>
                  </div>

                  <div className="bar" style={{ marginTop: '10px' }}>
                    <div style={getFillStyle(bF * 100, rk[1])} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <span>≤15% Comfortable</span>
                    <span>15–25% Manageable</span>
                    <span>25–35% Stretched</span>
                    <span>&gt;35% High Risk</span>
                  </div>
                </div>
              ) : (
                <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enter your monthly take-home salary above to analyze your total debt-to-income EMI burden.
                </p>
              )}
            </section>

            {/* Section 4: Total Cost of Ownership */}
            <section style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">4 · Total Cost of Ownership (Running Costs)</h2>
              <div className="field-grid" style={{ marginTop: '14px' }}>
                <div className="field-group">
                  <label htmlFor="fuel">Fuel Cost / Month (₹)</label>
                  <input id="fuel" type="text" inputMode="decimal" value={fuel} onChange={e => updateField('fuel', e.target.value)} placeholder="0" />
                </div>
                <div className="field-group">
                  <label htmlFor="insurance">Insurance Cost / Year (₹)</label>
                  <input id="insurance" type="text" inputMode="decimal" value={insurance} onChange={e => updateField('insurance', e.target.value)} placeholder="0" />
                </div>
                <div className="field-group">
                  <label htmlFor="maintenance">Maintenance / Year (₹)</label>
                  <input id="maintenance" type="text" inputMode="decimal" value={maintenance} onChange={e => updateField('maintenance', e.target.value)} placeholder="0" />
                </div>
                <div className="field-group">
                  <label htmlFor="parking">Parking / Month (₹)</label>
                  <input id="parking" type="text" inputMode="decimal" value={parking} onChange={e => updateField('parking', e.target.value)} placeholder="0" />
                </div>
                <div className="field-group">
                  <label htmlFor="misc">Toll &amp; Misc / Month (₹)</label>
                  <input id="misc" type="text" inputMode="decimal" value={misc} onChange={e => updateField('misc', e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="calc-summary" style={{ marginTop: '18px' }}>
                <div className="summary-item"><span>Monthly EMI</span><span>{fmt(emi)}</span></div>
                <div className="summary-item"><span>Monthly Fuel</span><span>{fmt(g(fuel))}</span></div>
                <div className="summary-item"><span>Monthly Insurance</span><span>{fmt(g(insurance) / 12)}</span></div>
                <div className="summary-item"><span>Monthly Maintenance</span><span>{fmt(g(maintenance) / 12)}</span></div>
                <div className="summary-item"><span>Monthly Parking &amp; Misc</span><span>{fmt(g(parking) + g(misc))}</span></div>
                <div className="summary-item"><span>Total Monthly TCO</span><span style={{ color: 'var(--accent)' }}>{fmt(tco)}</span></div>
              </div>
              {sal ? (
                <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>
                  Total monthly ownership cost consumes <strong>{pc(tco / sal)}</strong> of your monthly take-home salary.
                </p>
              ) : null}
            </section>

            {/* Section 5: Emergency Fund Check */}
            <section style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">5 · Emergency Fund Check</h2>
              <div className="field-group" style={{ maxWidth: '360px', marginTop: '14px' }}>
                <label htmlFor="savings">Emergency Savings Available (₹)</label>
                <input id="savings" type="text" inputMode="decimal" value={savings} onChange={e => updateField('savings', e.target.value)} placeholder="0" />
              </div>
              {sav > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {(() => {
                    const months = tco > 0 ? sav / tco : 0;
                    const em = months >= 6 ? ['Healthy', 'var(--emerald)'] : months >= 3 ? ['Moderate', 'var(--amber)'] : ['Risky', 'var(--rose)'];
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="k">Emergency Buffer Runway</div>
                            <div className="v" style={{ fontSize: '1.3rem' }}>{months.toFixed(1)} months of TCO covered</div>
                          </div>
                          <span style={{ padding: '6px 14px', borderRadius: '99px', background: 'var(--bg)', border: `1px solid ${em[1]}`, color: em[1], fontWeight: 700 }}>
                            ● {em[0]}
                          </span>
                        </div>
                        <div className="bar" style={{ marginTop: '10px' }}>
                          <div style={getFillStyle(Math.min(100, (months / 6) * 100), em[1])} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                          <span>0 Months</span>
                          <span>3 Months (Minimum)</span>
                          <span>6+ Months (Recommended)</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </section>

            {/* Section 6: Multi-Car Comparison */}
            <section style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">6 · Multi-Car Comparison</h2>
              <p className="page-lead" style={{ fontSize: '0.9rem', marginBottom: '14px' }}>
                Car 1 uses the price in Section 1. Add up to two more vehicle prices; the same down-payment %, rate, tenure, and running costs apply.
              </p>
              <div className="field-grid" style={{ maxWidth: '600px', marginBottom: '16px' }}>
                <div className="field-group">
                  <label htmlFor="car2Price">Car 2 On-Road Price (₹)</label>
                  <input id="car2Price" type="text" inputMode="decimal" value={car2Price} onChange={e => updateField('car2Price', e.target.value)} placeholder="e.g. 900000" />
                </div>
                <div className="field-group">
                  <label htmlFor="car3Price">Car 3 On-Road Price (₹)</label>
                  <input id="car3Price" type="text" inputMode="decimal" value={car3Price} onChange={e => updateField('car3Price', e.target.value)} placeholder="e.g. 1500000" />
                </div>
              </div>

              <div className="g" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {[P, num(car2Price), num(car3Price)].map((prVal, idx) => {
                  const pr = Math.max(0, prVal);
                  if (!pr) return <div key={idx} className="panel" style={{ background: 'var(--bg)' }}><strong>Car {idx + 1}</strong><p className="m">Enter a price to compare.</p></div>;
                  const loanAmt = pr * (1 - dpFrac);
                  const eAmt = emiOf(loanAmt);
                  const sc = sal ? scoreOf(pr, eAmt) : null;
                  const v = sc !== null ? getVerdict(sc) : null;

                  return (
                    <div key={idx} className="panel" style={{ background: 'var(--bg)' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '10px' }}>Car {idx + 1}</div>
                      <div className="kv" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Price</span>
                        <span style={{ fontWeight: 700 }}>{fmt(pr)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Loan Amount</span>
                        <span>{fmt(loanAmt)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Monthly EMI</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(eAmt)}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Total Interest</span>
                        <span>{fmt(Math.max(0, eAmt * n - loanAmt))}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Required Salary</span>
                        <span>{fmt(pr / 0.6 / 12)} /mo</span>
                        <span style={{ color: 'var(--text-muted)' }}>Affordability Score</span>
                        <span style={{ fontWeight: 700 }}>{sc !== null ? `${sc} / 100` : 'Add Salary'}</span>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        {v ? (
                          <span style={{ padding: '4px 10px', borderRadius: '99px', background: 'var(--card)', border: `1px solid ${v[1]}`, color: v[1], fontWeight: 700, fontSize: '0.78rem' }}>
                            ● {v[0]}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Add salary in Sec 3 for score</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 7: Smart Recommendation */}
            <section style={{ paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-title">7 · Smart Financial Recommendation</h2>
              {!sal ? (
                <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Add your monthly take-home salary in Section 3 to generate your comprehensive affordability score, risk verdict, and financial recommendation breakdown.
                </p>
              ) : (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1, color: vd[1] }}>{score}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>out of 100</div>
                    </div>
                    <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                      <span style={{ padding: '6px 14px', borderRadius: '99px', background: 'var(--bg)', border: `1px solid ${vd[1]}`, color: vd[1], fontWeight: 700 }}>
                        ● {vd[0]}
                      </span>
                      <div className="bar" style={{ marginTop: '12px' }}>
                        <div style={getFillStyle(score, vd[1])} />
                      </div>
                    </div>
                  </div>
                  <p style={{ marginTop: '16px', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    Based on your take-home salary of <strong>{fmt(sal)}/month</strong>, existing EMIs of <strong>{fmt(ex)}/month</strong>, and a new car EMI of <strong>{fmt(emi)}/month</strong>, this vehicle {score >= 80 ? 'appears highly affordable' : score >= 60 ? 'appears manageable' : score >= 40 ? 'looks like a stretch purchase' : 'looks financially risky'}. Total EMI obligations would consume <strong>{pc(bF)}</strong> of your income.
                  </p>
                  <div className="g" style={{ marginTop: '14px' }}>
                    {factorsFor(P, emi).map(([label, pts, maxPts], idx) => (
                      <div key={idx} className="panel" style={{ background: 'var(--bg)', padding: '12px' }}>
                        <div className="k">{label}</div>
                        <div style={{ fontWeight: 700, margin: '4px 0' }}>{pts} / {maxPts}</div>
                        <div className="bar" style={{ height: '6px' }}>
                          <div style={getFillStyle(((pts as number) / (maxPts as number)) * 100, 'var(--accent)')} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <footer className="panel" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-heading)' }}>Important Disclaimer</strong>
          <p style={{ margin: '6px 0' }}>This calculator is intended for educational and informational purposes only. All calculations, scores, recommendations, and risk indicators are based on simplified assumptions and general financial guidelines. They do not constitute financial, investment, tax, legal, or lending advice.</p>
          <p style={{ margin: '6px 0' }}>Actual loan eligibility, interest rates, lender decisions, and affordability depend on factors including income, credit history, existing liabilities, expenses, taxes, insurance premiums, and lender policies.</p>
          <p style={{ margin: '6px 0' }}>Always verify loan terms with your lender and consider consulting a qualified financial adviser before making purchasing or borrowing decisions.</p>
        </footer>
      </div>

      <A4PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        toolTitle="Car Affordability & EMI Calculator Report"
        toolSubtitle={`Car Price: ${fmt(P)} · EMI: ${fmt(emi)} · Tenure: ${loanYears} yrs`}
        toolCategory="Finance & Calculators"
        summaryMetrics={[
          { label: 'Car Price', value: fmt(P) },
          { label: 'Down Payment', value: fmt(dpAmt) },
          { label: 'Monthly EMI', value: fmt(emi) },
          { label: 'Total Interest', value: fmt(interest) },
        ]}
      />
    </div>
  );
};
