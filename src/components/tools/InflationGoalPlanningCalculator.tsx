import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const InflationGoalPlanningCalculator: React.FC = () => {
  const [costToday, setCostToday] = useState(1000000);
  const [years, setYears] = useState(10);
  const [inflation, setInflation] = useState(6);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [errorMsg, setErrorMsg] = useState('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const calculate = () => {
    if (
      costToday < 0 ||
      years < 0 ||
      inflation < 0 ||
      currentSavings < 0 ||
      !Number.isFinite(costToday) ||
      !Number.isFinite(years) ||
      !Number.isFinite(inflation) ||
      !Number.isFinite(currentSavings)
    ) {
      setErrorMsg('Enter zero or positive numbers in all fields.');
      return null;
    }

    const i = inflation / 100;
    const futureCost = costToday * Math.pow(1 + i, years);
    const increase = futureCost - costToday;
    const gap = Math.max(0, futureCost - currentSavings);

    if (![futureCost, increase, gap].every(Number.isFinite)) {
      setErrorMsg('The inputs resulted in numbers too large to calculate.');
      return null;
    }

    setErrorMsg('');
    return {
      futureCost,
      increase,
      gap
    };
  };

  const results = calculate();

  const handleReset = () => {
    setCostToday(1000000);
    setYears(10);
    setInflation(6);
    setCurrentSavings(200000);
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
        <span aria-current="page">Inflation &amp; Goal Planning Calculator</span>
      </div>

      <h1>Inflation &amp; Goal Planning Calculator</h1>
      <p className="lead">
        Explore how the future cost of a goal changes when today’s price is adjusted for an assumed annual inflation rate.
      </p>

      <section className="content-section">
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="form-field">
            <label htmlFor="cost">Goal cost today (₹)</label>
            <input
              id="cost"
              type="number"
              min="0"
              step="5000"
              value={costToday}
              onChange={(e) => setCostToday(Number(e.target.value))}
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
              onChange={(e) => setYears(Number(e.target.value))}
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
              onChange={(e) => setInflation(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="savings">Current amount already set aside (₹)</label>
            <input
              id="savings"
              type="number"
              min="0"
              step="5000"
              value={currentSavings}
              onChange={(e) => setCurrentSavings(Number(e.target.value))}
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
        <h2>Illustrative results</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{results ? formatMoney(results.futureCost) : '—'}</strong>
            <span>Estimated future goal cost</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.increase) : '—'}</strong>
            <span>Increase caused by inflation</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.gap) : '—'}</strong>
            <span>Amount not covered by savings</span>
          </div>
        </div>

        {results && (
          <p className="form-note" style={{ marginTop: '14px' }}>
            Illustration using {years} years and an assumed {inflation}% annual inflation rate.
          </p>
        )}
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p className="tool-output">Future goal cost = Current goal cost × (1 + inflation rate)ʸᵉᵃʳˢ</p>
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
