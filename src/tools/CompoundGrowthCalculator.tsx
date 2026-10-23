import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

export const CompoundGrowthCalculator: React.FC = () => {
  const [initial, setInitial] = useState<number>(100000);
  const [monthly, setMonthly] = useState<number>(10000);
  const [years, setYears] = useState<number>(10);
  const [returnRate, setReturnRate] = useState<number>(10);
  const [error, setError] = useState('');

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const n = Math.round(years * 12);
  const r = returnRate / 100 / 12;

  let futureValue = 0;
  let totalInvested = initial + monthly * n;
  let estimatedGrowth = 0;
  let isCalculable = true;

  if (initial < 0 || monthly < 0 || years < 0 || returnRate < 0 || isNaN(initial) || isNaN(monthly) || isNaN(years) || isNaN(returnRate)) {
    isCalculable = false;
  } else {
    if (r === 0) {
      futureValue = initial + monthly * n;
    } else {
      const factor = Math.pow(1 + r, n);
      futureValue = initial * factor + monthly * ((factor - 1) / r);
    }
    estimatedGrowth = futureValue - totalInvested;
  }

  const handleReset = () => {
    setInitial(100000);
    setMonthly(10000);
    setYears(10);
    setReturnRate(10);
    setError('');
  };

  return (
    <main className="container narrow page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Compound Growth & SIP Calculator' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="Compound Growth & SIP Calculator"
          text="Simulate monthly SIP investments with compound growth and inflation adjustments."
        />
      </div>
      <h1>Compound Growth &amp; SIP Calculator</h1>
      <p className="lead">
        Explore how a starting amount and monthly contributions could grow over time under a constant assumed annual return.
      </p>
      <p className="form-note">
        <strong>Data handling:</strong> calculations run in your browser. This calculator does not submit entered values to an account, broker or server, or save them for a later visit.
      </p>

      <section className="content-section">
        <form className="contact-form" onSubmit={e => e.preventDefault()}>
          <div className="form-field">
            <label htmlFor="initial">Starting amount (₹)</label>
            <input
              id="initial"
              type="number"
              min="0"
              step="100"
              value={initial}
              onChange={e => setInitial(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="monthly">Monthly contribution (₹)</label>
            <input
              id="monthly"
              type="number"
              min="0"
              step="100"
              value={monthly}
              onChange={e => setMonthly(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="years">Time period (years)</label>
            <input
              id="years"
              type="number"
              min="0"
              step="0.5"
              value={years}
              onChange={e => setYears(Number(e.target.value))}
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
              value={returnRate}
              onChange={e => setReturnRate(Number(e.target.value))}
              required
            />
          </div>
          <div className="actions">
            <button className="button button-secondary" type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
          {error && <p className="form-note" role="alert">{error}</p>}
        </form>
      </section>

      <section className="content-section" aria-live="polite" aria-atomic="true">
        <h2>Illustrative result</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{isCalculable ? money(futureValue) : '—'}</strong>
            <span>Estimated future value</span>
          </div>
          <div className="stat">
            <strong>{isCalculable ? money(totalInvested) : '—'}</strong>
            <span>Total amount contributed</span>
          </div>
          <div className="stat">
            <strong>{isCalculable ? money(estimatedGrowth) : '—'}</strong>
            <span>Illustrative growth</span>
          </div>
        </div>
        {isCalculable && (
          <p className="form-note" style={{ marginTop: '14px' }}>
            Illustration using {n} monthly periods, {returnRate}% assumed annual return and end-of-month contributions.
          </p>
        )}
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p>
          The model uses monthly compounding and assumes the monthly contribution is made at the <strong>end of each month</strong>. The annual return is converted to a monthly rate using <strong>annual return ÷ 12</strong>.
        </p>
        <p>
          For a starting amount <strong>P</strong>, monthly contribution <strong>C</strong>, monthly rate <strong>r</strong> and number of months <strong>n</strong>:
        </p>
        <p><strong>Future value = P(1 + r)<sup>n</sup> + C × [(1 + r)<sup>n</sup> − 1] ÷ r</strong></p>
      </section>

      <section className="content-section financial-disclosure">
        <h2>Financial Content Disclosure</h2>
        <p>
          This website provides general educational information only. It does not provide personalized investment, financial, tax or trading advice. I do not recommend or endorse any specific stock, ETF, mutual fund, security, broker, transaction, price target, or buy/sell/hold action.
        </p>
      </section>
    </main>
  );
};
