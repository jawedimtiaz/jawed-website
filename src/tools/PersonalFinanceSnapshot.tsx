import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const PersonalFinanceSnapshot: React.FC = () => {
  const [income, setIncome] = useState(100000);
  const [essential, setEssential] = useState(40000);
  const [discretionary, setDiscretionary] = useState(10000);
  const [debt, setDebt] = useState(10000);

  const [targetMonths, setTargetMonths] = useState(6);
  const [emergencySavings, setEmergencySavings] = useState(150000);

  const [cash, setCash] = useState(100000);
  const [investments, setInvestments] = useState(1000000);
  const [retirement, setRetirement] = useState(500000);
  const [property, setProperty] = useState(0);
  const [otherAssets, setOtherAssets] = useState(0);

  const [homeLoan, setHomeLoan] = useState(0);
  const [vehicleLoan, setVehicleLoan] = useState(0);
  const [personalLoan, setPersonalLoan] = useState(0);
  const [otherDebt, setOtherDebt] = useState(0);

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  const totalSpending = essential + discretionary + debt;
  const surplus = income - totalSpending;
  const savingsRate = income > 0 ? (surplus / income * 100).toFixed(1) + '%' : '—';

  const reserveTarget = essential * targetMonths;
  const reserveGap = emergencySavings - reserveTarget;
  const monthsCovered = essential > 0 ? (emergencySavings / essential).toFixed(1) : '0';

  const totalAssets = cash + investments + retirement + property + otherAssets;
  const totalLiabilities = homeLoan + vehicleLoan + personalLoan + otherDebt;
  const netWorth = totalAssets - totalLiabilities;

  const handleReset = () => {
    setIncome(100000);
    setEssential(40000);
    setDiscretionary(10000);
    setDebt(10000);
    setTargetMonths(6);
    setEmergencySavings(150000);
    setCash(100000);
    setInvestments(1000000);
    setRetirement(500000);
    setProperty(0);
    setOtherAssets(0);
    setHomeLoan(0);
    setVehicleLoan(0);
    setPersonalLoan(0);
    setOtherDebt(0);
  };

  return (
    <main className="container narrow page">
      <p className="eyebrow">Tool · Finance</p>
      <p className="breadcrumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/tools/">Tools</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Personal Finance Snapshot</span>
      </p>
      <h1>Personal Finance Snapshot</h1>
      <p className="lead">
        Bring three everyday money concepts together: monthly cash flow, an emergency reserve and net worth. Everything is calculated in your browser from the numbers you enter.
      </p>

      {/* 1. Monthly Cash Flow */}
      <section className="content-section">
        <h2>1. Monthly Cash Flow</h2>
        <div className="contact-form">
          <div className="form-field">
            <label htmlFor="income">Monthly income (₹)</label>
            <input
              id="income"
              type="number"
              min="0"
              step="1000"
              value={income}
              onChange={e => setIncome(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="essential">Essential monthly expenses (₹)</label>
            <input
              id="essential"
              type="number"
              min="0"
              step="1000"
              value={essential}
              onChange={e => setEssential(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="discretionary">Discretionary monthly expenses (₹)</label>
            <input
              id="discretionary"
              type="number"
              min="0"
              step="1000"
              value={discretionary}
              onChange={e => setDiscretionary(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="debt">Monthly debt payments (₹)</label>
            <input
              id="debt"
              type="number"
              min="0"
              step="1000"
              value={debt}
              onChange={e => setDebt(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="stats-grid" style={{ marginTop: '18px' }}>
          <div className="stat">
            <strong>{money(totalSpending)}</strong>
            <span>Total monthly spending</span>
          </div>
          <div className="stat">
            <strong>{money(surplus)}</strong>
            <span>Monthly surplus / deficit</span>
          </div>
          <div className="stat">
            <strong>{savingsRate}</strong>
            <span>Cash-flow margin</span>
          </div>
        </div>
      </section>

      {/* 2. Emergency Reserve */}
      <section className="content-section">
        <h2>2. Emergency Reserve</h2>
        <div className="contact-form">
          <div className="form-field">
            <label htmlFor="target">Target reserve (months of essential expenses)</label>
            <input
              id="target"
              type="number"
              min="0"
              step="0.5"
              value={targetMonths}
              onChange={e => setTargetMonths(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="emergency">Current emergency savings (₹)</label>
            <input
              id="emergency"
              type="number"
              min="0"
              step="1000"
              value={emergencySavings}
              onChange={e => setEmergencySavings(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="stats-grid" style={{ marginTop: '18px' }}>
          <div className="stat">
            <strong>{money(reserveTarget)}</strong>
            <span>Target emergency reserve</span>
          </div>
          <div className="stat">
            <strong>{money(reserveGap)}</strong>
            <span>Reserve gap / surplus</span>
          </div>
          <div className="stat">
            <strong>{monthsCovered} months</strong>
            <span>Months currently covered</span>
          </div>
        </div>
      </section>

      {/* 3. Net Worth */}
      <section className="content-section">
        <h2>3. Net Worth Snapshot</h2>
        <div className="card-grid two">
          <div>
            <h3>Assets</h3>
            <div className="form-field">
              <label htmlFor="cash">Cash (₹)</label>
              <input
                id="cash"
                type="number"
                min="0"
                value={cash}
                onChange={e => setCash(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="investments">Investments (₹)</label>
              <input
                id="investments"
                type="number"
                min="0"
                value={investments}
                onChange={e => setInvestments(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="retirement">Retirement assets (₹)</label>
              <input
                id="retirement"
                type="number"
                min="0"
                value={retirement}
                onChange={e => setRetirement(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="property">Real estate (₹)</label>
              <input
                id="property"
                type="number"
                min="0"
                value={property}
                onChange={e => setProperty(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="otherAssets">Other assets (₹)</label>
              <input
                id="otherAssets"
                type="number"
                min="0"
                value={otherAssets}
                onChange={e => setOtherAssets(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <h3>Liabilities</h3>
            <div className="form-field">
              <label htmlFor="homeLoan">Home loan (₹)</label>
              <input
                id="homeLoan"
                type="number"
                min="0"
                value={homeLoan}
                onChange={e => setHomeLoan(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="vehicleLoan">Vehicle loan (₹)</label>
              <input
                id="vehicleLoan"
                type="number"
                min="0"
                value={vehicleLoan}
                onChange={e => setVehicleLoan(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="personalLoan">Personal loans (₹)</label>
              <input
                id="personalLoan"
                type="number"
                min="0"
                value={personalLoan}
                onChange={e => setPersonalLoan(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ marginTop: '8px' }}>
              <label htmlFor="otherDebt">Credit-card / other debt (₹)</label>
              <input
                id="otherDebt"
                type="number"
                min="0"
                value={otherDebt}
                onChange={e => setOtherDebt(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ marginTop: '18px' }}>
          <div className="stat">
            <strong>{money(totalAssets)}</strong>
            <span>Total assets</span>
          </div>
          <div className="stat">
            <strong>{money(totalLiabilities)}</strong>
            <span>Total liabilities</span>
          </div>
          <div className="stat">
            <strong>{money(netWorth)}</strong>
            <span>Net worth</span>
          </div>
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button className="button button-secondary" type="button" onClick={handleReset}>
            Reset Snapshot
          </button>
        </div>
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
