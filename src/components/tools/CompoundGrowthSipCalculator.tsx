import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const CompoundGrowthSipCalculator: React.FC = () => {
  const [initial, setInitial] = useState(100000);
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const calculate = () => {
    if (
      initial < 0 ||
      monthly < 0 ||
      years < 0 ||
      annualReturn < 0 ||
      !Number.isFinite(initial) ||
      !Number.isFinite(monthly) ||
      !Number.isFinite(years) ||
      !Number.isFinite(annualReturn)
    ) {
      setErrorMsg('Enter zero or positive numbers in all fields.');
      return null;
    }

    const n = Math.round(years * 12);
    const r = annualReturn / 100 / 12;

    let fv = 0;
    if (r === 0) {
      fv = initial + monthly * n;
    } else {
      const factor = Math.pow(1 + r, n);
      fv = initial * factor + monthly * ((factor - 1) / r);
    }

    if (!Number.isFinite(fv)) {
      setErrorMsg('The calculation resulted in numbers too large to display.');
      return null;
    }

    setErrorMsg('');
    const totalInvested = initial + monthly * n;
    const growth = fv - totalInvested;

    return {
      futureValue: fv,
      totalInvested,
      growth,
      months: n
    };
  };

  const results = calculate();

  const handleReset = () => {
    setInitial(100000);
    setMonthly(10000);
    setYears(10);
    setAnnualReturn(10);
    setErrorMsg('');
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · Finance</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Compound Growth &amp; SIP Calculator</span>
      </div>

      <h1>Compound Growth &amp; SIP Calculator</h1>
      <p className="lead">
        Explore how a starting amount and monthly contributions could grow over time under a constant assumed annual return.
      </p>

      <section className="content-section">
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="form-field">
            <label htmlFor="initial">Starting amount (₹)</label>
            <input
              id="initial"
              type="number"
              min="0"
              step="1000"
              value={initial}
              onChange={(e) => setInitial(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="monthly">Monthly contribution (₹)</label>
            <input
              id="monthly"
              type="number"
              min="0"
              step="500"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="years">Time period (years)</label>
            <input
              id="years"
              type="number"
              min="0.5"
              step="0.5"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="return">Assumed annual return (%)</label>
            <input
              id="return"
              type="number"
              min="0"
              step="0.1"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              required
            />
          </div>

          <div className="actions">
            <button className="button button-secondary" type="button" onClick={handleReset}>
              Reset to Defaults
            </button>
          </div>
          {errorMsg && (
            <p className="form-note" style={{ color: '#b91c1c' }}>
              {errorMsg}
            </p>
          )}
        </form>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Illustrative result</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{results ? formatMoney(results.futureValue) : '—'}</strong>
            <span>Estimated future value</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.totalInvested) : '—'}</strong>
            <span>Total amount contributed</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.growth) : '—'}</strong>
            <span>Illustrative growth</span>
          </div>
        </div>

        {results && (
          <p className="form-note" style={{ marginTop: '14px' }}>
            Illustration using {results.months} monthly periods, {annualReturn}% assumed annual return, and end-of-month contributions.
          </p>
        )}
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p>
          The model uses monthly compounding and assumes the monthly contribution is made at the end of each month. The annual return is converted to a monthly rate using <em>annual return ÷ 12</em>.
        </p>
        <p className="tool-output">Future value = P(1 + r)ⁿ + C × [(1 + r)ⁿ − 1] ÷ r</p>
      </section>

      <section className="content-section financial-disclosure">
        <h2>Financial Content Disclosure</h2>
        <p>
          This website provides general educational information only. It does not provide personalized investment, financial, tax or trading advice. I do not recommend or endorse any specific stock, ETF, mutual fund, security, broker, transaction, price target, or buy/sell/hold action.
        </p>
        <p>
          Jawed Imtiaz is not a SEBI-registered Investment Adviser or Research Analyst. Investing involves risk, including possible loss of capital. You are responsible for your own investment decisions.
        </p>
      </section>
    </main>
  );
};
