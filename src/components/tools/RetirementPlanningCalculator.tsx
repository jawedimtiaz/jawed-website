import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const RetirementPlanningCalculator: React.FC = () => {
  const [age, setAge] = useState(45);
  const [spending, setSpending] = useState(720000);
  const [corpus, setCorpus] = useState(3000000);
  const [contribution, setContribution] = useState(30000);
  const [retirementAge, setRetirementAge] = useState(58);
  const [lifespan, setLifespan] = useState(88);
  const [inflation, setInflation] = useState(6);
  const [preReturn, setPreReturn] = useState(10);
  const [realReturn, setRealReturn] = useState(3);
  const [errorMsg, setErrorMsg] = useState('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const calculate = () => {
    if (retirementAge <= age) {
      setErrorMsg('Planned retirement age must be greater than current age.');
      return null;
    }
    if (lifespan <= retirementAge) {
      setErrorMsg('Planning lifespan must be greater than planned retirement age.');
      return null;
    }
    if (
      age < 0 ||
      spending < 0 ||
      corpus < 0 ||
      contribution < 0 ||
      inflation < 0 ||
      preReturn < 0 ||
      realReturn < 0
    ) {
      setErrorMsg('All inputs must be zero or positive.');
      return null;
    }

    const years = retirementAge - age;
    const months = Math.round(years * 12);
    const horizon = lifespan - retirementAge;
    const infRate = inflation / 100;
    const preMonthly = preReturn / 100 / 12;
    const real = realReturn / 100;

    const futureSpending = spending * Math.pow(1 + infRate, years);

    let projected = 0;
    if (preMonthly === 0) {
      projected = corpus + contribution * months;
    } else {
      const factor = Math.pow(1 + preMonthly, months);
      projected = corpus * factor + contribution * ((factor - 1) / preMonthly);
    }

    let required = 0;
    if (real === 0) {
      required = futureSpending * horizon;
    } else {
      required = (futureSpending * (1 - Math.pow(1 + real, -horizon))) / real;
    }

    const gap = projected - required;

    if (![futureSpending, projected, required, gap].every(Number.isFinite)) {
      setErrorMsg('The inputs resulted in numbers too large to calculate.');
      return null;
    }

    setErrorMsg('');
    return {
      years,
      horizon,
      futureSpending,
      required,
      projected,
      gap
    };
  };

  const results = calculate();

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
        <span aria-current="page">Retirement Planning Calculator</span>
      </div>

      <h1>Retirement Planning Calculator</h1>
      <p className="lead">
        Explore a hypothetical retirement corpus requirement and projected corpus using living expenses, inflation, and investment return assumptions.
      </p>

      <section className="content-section">
        <h2>1. Today's Situation</h2>
        <div className="card-grid two">
          <div className="form-field">
            <label htmlFor="age">Current age</label>
            <input
              id="age"
              type="number"
              min="18"
              max="100"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="spending">Current annual retirement spending (₹)</label>
            <input
              id="spending"
              type="number"
              min="0"
              step="10000"
              value={spending}
              onChange={(e) => setSpending(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="corpus">Current retirement corpus (₹)</label>
            <input
              id="corpus"
              type="number"
              min="0"
              step="50000"
              value={corpus}
              onChange={(e) => setCorpus(Number(e.target.value))}
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
              onChange={(e) => setContribution(Number(e.target.value))}
            />
          </div>
        </div>

        <h2 style={{ marginTop: '24px' }}>2. Planning Assumptions</h2>
        <div className="card-grid two">
          <div className="form-field">
            <label htmlFor="retAge">Planned retirement age</label>
            <input
              id="retAge"
              type="number"
              min="20"
              max="100"
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="lifespan">Planning lifespan (age)</label>
            <input
              id="lifespan"
              type="number"
              min="40"
              max="120"
              value={lifespan}
              onChange={(e) => setLifespan(Number(e.target.value))}
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
            />
          </div>
          <div className="form-field">
            <label htmlFor="preReturn">Pre-retirement return (%)</label>
            <input
              id="preReturn"
              type="number"
              min="0"
              step="0.1"
              value={preReturn}
              onChange={(e) => setPreReturn(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="realReturn">In-retirement real return (%)</label>
            <input
              id="realReturn"
              type="number"
              min="0"
              step="0.1"
              value={realReturn}
              onChange={(e) => setRealReturn(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="actions" style={{ marginTop: '16px' }}>
          <button className="button button-secondary" type="button" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>
        {errorMsg && (
          <p className="form-note" style={{ color: '#b91c1c', marginTop: '10px' }}>
            {errorMsg}
          </p>
        )}
      </section>

      <section className="content-section" aria-live="polite">
        <h2>3. Illustrative results</h2>
        <div className="stats-grid">
          <div className="stat">
            <strong>{results ? `${results.years} years` : '—'}</strong>
            <span>Years to retirement</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.futureSpending) : '—'}</strong>
            <span>First-year retirement spending</span>
          </div>
          <div className="stat">
            <strong>{results ? `${results.horizon} years` : '—'}</strong>
            <span>Retirement funding horizon</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.required) : '—'}</strong>
            <span>Estimated corpus required</span>
          </div>
          <div className="stat">
            <strong>{results ? formatMoney(results.projected) : '—'}</strong>
            <span>Projected corpus at retirement</span>
          </div>
          <div className="stat">
            <strong
              style={{
                color: results && results.gap >= 0 ? '#166534' : '#b91c1c'
              }}
            >
              {results ? formatMoney(results.gap) : '—'}
            </strong>
            <span>Projected gap / surplus</span>
          </div>
        </div>
      </section>

      <section className="content-section">
        <h2>Methodology</h2>
        <p className="tool-output">
          Retirement-year spending = Current annual spending × (1 + inflation)ʸᵉᵃʳˢ
          {'\n\n'}
          Required corpus = W × [1 − (1 + r)⁻ᴺ] ÷ r
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
