import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const InflationGoalCalculator: React.FC = () => {
  const [cost, setCost] = useState<number>(1000000);
  const [years, setYears] = useState<number>(10);
  const [inflation, setInflation] = useState<number>(6);
  const [savings, setSavings] = useState<number>(200000);

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const i = inflation / 100;
  const futureCost = cost * Math.pow(1 + i, years);
  const inc = futureCost - cost;
  const gap = Math.max(0, futureCost - savings);

  const handleReset = () => {
    setCost(1000000);
    setYears(10);
    setInflation(6);
    setSavings(200000);
  };

  return (
    <main className="container narrow page">
      <p className="eyebrow">Tool · Finance</p>
      <p className="breadcrumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/tools/">Tools</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Inflation &amp; Goal Planning Calculator</span>
      </p>
      <h1>Inflation &amp; Goal Planning Calculator</h1>
      <p className="lead">
        Explore how the future cost of a goal can change when today's price is adjusted for an assumed inflation rate.
      </p>

      <section className="content-section">
        <h2>Goal assumptions</h2>
        <form className="contact-form" onSubmit={e => e.preventDefault()}>
          <div className="form-field">
            <label htmlFor="cost">Goal cost today (₹)</label>
            <input
              id="cost"
              type="number"
              min="0"
              step="1000"
              value={cost}
              onChange={e => setCost(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="years">Years until the goal</label>
            <input
              id="years"
              type="number"
              min="0"
              max="100"
              step="1"
              value={years}
              onChange={e => setYears(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="inflation">Assumed annual inflation (%)</label>
            <input
              id="inflation"
              type="number"
              min="0"
              step="0.1"
              value={inflation}
              onChange={e => setInflation(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="savings">Current amount already set aside for this goal (₹)</label>
            <input
              id="savings"
              type="number"
              min="0"
              step="1000"
              value={savings}
              onChange={e => setSavings(Number(e.target.value))}
              required
            />
          </div>
          <div className="actions">
            <button className="button button-secondary" type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="content-section" aria-live="polite" aria-atomic="true">
        <h2>Illustrative results</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{money(futureCost)}</strong>
            <span>Estimated future goal cost</span>
          </div>
          <div className="stat">
            <strong>{money(inc)}</strong>
            <span>Increase caused by assumed inflation</span>
          </div>
          <div className="stat">
            <strong>{money(gap)}</strong>
            <span>Amount not covered by current savings</span>
          </div>
        </div>
        <p className="form-note" style={{ marginTop: '14px' }}>
          Illustration using {years} years and an assumed {inflation}% annual inflation rate.
        </p>
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p>The future goal cost is calculated as:</p>
        <p><strong>Future goal cost = Current goal cost × (1 + inflation rate)<sup>years</sup></strong></p>
        <p>
          The inflation increase is the estimated future cost minus today's cost. The uncovered amount is the estimated future cost minus the amount currently set aside, floored at zero for display.
        </p>
      </section>

      <section className="content-section financial-disclosure">
        <h2>Financial Content Disclosure</h2>
        <p>
          This website provides general educational information only. It does not provide personalized investment, financial, tax or trading advice.
        </p>
      </section>
    </main>
  );
};
