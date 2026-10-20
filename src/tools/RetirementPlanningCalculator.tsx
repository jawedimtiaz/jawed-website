import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const RetirementPlanningCalculator: React.FC = () => {
  const [age, setAge] = useState<number>(45);
  const [spending, setSpending] = useState<number>(720000);
  const [corpus, setCorpus] = useState<number>(3000000);
  const [contribution, setContribution] = useState<number>(30000);
  const [retirementAge, setRetirementAge] = useState<number>(58);
  const [lifespan, setLifespan] = useState<number>(88);
  const [inflation, setInflation] = useState<number>(6);
  const [preReturn, setPreReturn] = useState<number>(10);
  const [realReturn, setRealReturn] = useState<number>(3);
  const [error, setError] = useState('');

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  let years = retirementAge - age;
  let months = Math.round(years * 12);
  let horizon = lifespan - retirementAge;
  let futureSpending = 0;
  let projected = 0;
  let required = 0;
  let gap = 0;
  let isValid = true;

  if (retirementAge <= age) {
    isValid = false;
  } else if (lifespan <= retirementAge) {
    isValid = false;
  } else {
    const inf = inflation / 100;
    const preMonthly = preReturn / 100 / 12;
    const real = realReturn / 100;

    futureSpending = spending * Math.pow(1 + inf, years);

    if (preMonthly === 0) {
      projected = corpus + contribution * months;
    } else {
      const factor = Math.pow(1 + preMonthly, months);
      projected = corpus * factor + contribution * ((factor - 1) / preMonthly);
    }

    if (real === 0) {
      required = futureSpending * horizon;
    } else {
      required = futureSpending * (1 - Math.pow(1 + real, -horizon)) / real;
    }

    gap = projected - required;
  }

  const handleReset = () => {
    setAge(45);
    setSpending(720000);
    setCorpus(3000000);
    setContribution(30000);
    setRetirementAge(58);
    setLifespan(88);
    setInflation(6);
    setPreReturn(10);
    setRealReturn(3);
    setError('');
  };

  return (
    <main className="container narrow page">
      <p className="eyebrow">Tool · Finance</p>
      <p className="breadcrumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/tools/">Tools</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Retirement Planning Calculator</span>
      </p>
      <h1>Retirement Planning Calculator</h1>
      <p className="lead">
        Explore a hypothetical retirement corpus requirement and projected corpus using spending, inflation, time and return assumptions.
      </p>

      <section className="content-section">
        <h2>1. Today</h2>
        <form className="contact-form" onSubmit={e => e.preventDefault()}>
          <div className="form-field">
            <label htmlFor="age">Current age</label>
            <input
              id="age"
              type="number"
              min="0"
              max="120"
              value={age}
              onChange={e => setAge(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="spending">Current annual retirement spending (₹)</label>
            <input
              id="spending"
              type="number"
              min="0"
              step="1000"
              value={spending}
              onChange={e => setSpending(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="corpus">Current retirement corpus (₹)</label>
            <input
              id="corpus"
              type="number"
              min="0"
              step="1000"
              value={corpus}
              onChange={e => setCorpus(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="contribution">Monthly retirement contribution (₹)</label>
            <input
              id="contribution"
              type="number"
              min="0"
              step="1000"
              value={contribution}
              onChange={e => setContribution(Number(e.target.value))}
            />
          </div>

          <h2 style={{ marginTop: '24px' }}>2. Retirement assumptions</h2>
          <div className="form-field">
            <label htmlFor="retirementAge">Planned retirement age</label>
            <input
              id="retirementAge"
              type="number"
              min="1"
              max="120"
              value={retirementAge}
              onChange={e => setRetirementAge(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="lifespan">Planning lifespan (age)</label>
            <input
              id="lifespan"
              type="number"
              min="1"
              max="120"
              value={lifespan}
              onChange={e => setLifespan(Number(e.target.value))}
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
            />
          </div>
          <div className="form-field">
            <label htmlFor="preReturn">Assumed annual pre-retirement return (%)</label>
            <input
              id="preReturn"
              type="number"
              min="0"
              step="0.1"
              value={preReturn}
              onChange={e => setPreReturn(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="realReturn">Assumed annual real return in retirement (%)</label>
            <input
              id="realReturn"
              type="number"
              min="0"
              step="0.1"
              value={realReturn}
              onChange={e => setRealReturn(Number(e.target.value))}
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
        <h2>3. Illustrative results</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{isValid ? `${years} years` : '—'}</strong>
            <span>Years to retirement</span>
          </div>
          <div className="stat">
            <strong>{isValid ? money(futureSpending) : '—'}</strong>
            <span>Retirement-year annual spending</span>
          </div>
          <div className="stat">
            <strong>{isValid ? `${horizon} years` : '—'}</strong>
            <span>Retirement funding horizon</span>
          </div>
          <div className="stat">
            <strong>{isValid ? money(required) : '—'}</strong>
            <span>Estimated corpus required</span>
          </div>
          <div className="stat">
            <strong>{isValid ? money(projected) : '—'}</strong>
            <span>Projected corpus at retirement</span>
          </div>
          <div className="stat">
            <strong>{isValid ? money(gap) : '—'}</strong>
            <span>Projected corpus gap / surplus</span>
          </div>
        </div>
        {isValid && (
          <p className="form-note" style={{ marginTop: '14px' }}>
            Illustration using {years} years to retirement, {horizon} years of retirement funding, {inflation}% inflation, {preReturn}% pre-retirement return and {realReturn}% real return in retirement.
          </p>
        )}
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p>
          <strong>Retirement-year spending</strong> is projected as current annual spending × (1 + inflation)<sup>years to retirement</sup>.
        </p>
        <p>
          <strong>Projected corpus</strong> uses monthly compounding for the current corpus and monthly retirement contributions, assuming contributions are made at the end of each month.
        </p>
        <p>
          <strong>Required corpus</strong> uses a finite-horizon, inflation-adjusted withdrawal model:
        </p>
        <p><strong>Required corpus ≈ W × [1 − (1 + r)<sup>−N</sup>] ÷ r</strong></p>
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
