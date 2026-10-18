import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const FinancePlanningWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'snapshot' | 'goals' | 'retirement' | 'review'>('snapshot');

  // Snapshot State
  const [income, setIncome] = useState(100000);
  const [essential, setEssential] = useState(50000);
  const [discretionary, setDiscretionary] = useState(10000);
  const [debt, setDebt] = useState(0);
  const [targetMonths, setTargetMonths] = useState(6);
  const [emergency, setEmergency] = useState(200000);
  const [cash, setCash] = useState(0);
  const [investments, setInvestments] = useState(0);
  const [retirementAssets, setRetirementAssets] = useState(0);
  const [property, setProperty] = useState(0);
  const [otherAssets, setOtherAssets] = useState(0);
  const [homeLoan, setHomeLoan] = useState(0);
  const [vehicleLoan, setVehicleLoan] = useState(0);
  const [otherDebt, setOtherDebt] = useState(0);

  // Goals State
  const [goalCost, setGoalCost] = useState(1000000);
  const [goalYears, setGoalYears] = useState(10);
  const [goalInflation, setGoalInflation] = useState(6);
  const [goalSaved, setGoalSaved] = useState(200000);

  // Growth State
  const [initial, setInitial] = useState(100000);
  const [monthly, setMonthly] = useState(10000);
  const [growthYears, setGrowthYears] = useState(10);
  const [growthReturn, setGrowthReturn] = useState(10);

  // Retirement State
  const [age, setAge] = useState(40);
  const [retSpending, setRetSpending] = useState(720000);
  const [corpus, setCorpus] = useState(3000000);
  const [retContribution, setRetContribution] = useState(20000);
  const [retAge, setRetAge] = useState(60);
  const [lifespan, setLifespan] = useState(85);
  const [retInflation, setRetInflation] = useState(6);
  const [preReturn, setPreReturn] = useState(10);
  const [realReturn, setRealReturn] = useState(3);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  // Calculations: Snapshot
  const spending = essential + discretionary + debt;
  const surplus = income - spending;
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
  const reserveTarget = essential * targetMonths;
  const monthsCovered = essential > 0 ? emergency / essential : 0;
  const totalAssets = cash + investments + retirementAssets + property + otherAssets;
  const totalLiab = homeLoan + vehicleLoan + otherDebt;
  const netWorth = totalAssets - totalLiab;

  // Calculations: Goals
  const iGoal = goalInflation / 100;
  const futureGoal = goalCost * Math.pow(1 + iGoal, goalYears);
  const goalIncrease = futureGoal - goalCost;
  const goalGap = Math.max(0, futureGoal - goalSaved);

  // Calculations: Growth
  const nGrowth = Math.round(growthYears * 12);
  const rGrowth = growthReturn / 100 / 12;
  const factorGrowth = Math.pow(1 + rGrowth, nGrowth);
  const fv = rGrowth === 0 ? initial + monthly * nGrowth : initial * factorGrowth + monthly * ((factorGrowth - 1) / rGrowth);
  const totalContributed = initial + monthly * nGrowth;
  const estimatedGrowth = fv - totalContributed;

  // Calculations: Retirement
  const retYears = retAge - age;
  const retMonths = Math.round(retYears * 12);
  const retHorizon = lifespan - retAge;
  const iRet = retInflation / 100;
  const rPre = preReturn / 100 / 12;
  const rReal = realReturn / 100;
  const retFutureSpend = retSpending * Math.pow(1 + iRet, retYears);
  const factorRet = Math.pow(1 + rPre, retMonths);
  const projectedCorpus = rPre === 0 ? corpus + retContribution * retMonths : corpus * factorRet + retContribution * ((factorRet - 1) / rPre);
  const requiredCorpus = rReal === 0 ? retFutureSpend * retHorizon : (retFutureSpend * (1 - Math.pow(1 + rReal, -retHorizon))) / rReal;
  const retGap = projectedCorpus - requiredCorpus;

  return (
    <main id="main-content" className="container page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Finance Planning Workspace</span>
      </div>
      <p className="eyebrow">Finance · Interactive Workspace</p>
      <h1>Finance Planning Workspace</h1>
      <p className="lead">
        One browser-based workspace for organizing a personal-finance picture and exploring common planning calculations. Enter your numbers, review outputs, then adjust assumptions to see how the illustration changes.
      </p>

      {/* Tabs */}
      <div className="actions" style={{ marginBottom: '24px' }} role="tablist">
        <button
          type="button"
          className={`button ${activeTab === 'snapshot' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('snapshot')}
        >
          1. Snapshot
        </button>
        <button
          type="button"
          className={`button ${activeTab === 'goals' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('goals')}
        >
          2. Goals &amp; Growth
        </button>
        <button
          type="button"
          className={`button ${activeTab === 'retirement' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('retirement')}
        >
          3. Retirement
        </button>
        <button
          type="button"
          className={`button ${activeTab === 'review' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('review')}
        >
          4. Review
        </button>
      </div>

      {activeTab === 'snapshot' && (
        <section className="card">
          <h2>Monthly Cash Flow &amp; Reserve</h2>
          <div className="card-grid two">
            <div className="form-field">
              <label htmlFor="fp-income">Monthly income (₹)</label>
              <input id="fp-income" type="number" min="0" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-essential">Essential expenses (₹)</label>
              <input id="fp-essential" type="number" min="0" value={essential} onChange={(e) => setEssential(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-discretionary">Discretionary expenses (₹)</label>
              <input id="fp-discretionary" type="number" min="0" value={discretionary} onChange={(e) => setDiscretionary(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-debt">Debt payments (₹)</label>
              <input id="fp-debt" type="number" min="0" value={debt} onChange={(e) => setDebt(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-target-months">Target reserve (months)</label>
              <input id="fp-target-months" type="number" min="0" step="0.5" value={targetMonths} onChange={(e) => setTargetMonths(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-emergency">Emergency savings (₹)</label>
              <input id="fp-emergency" type="number" min="0" value={emergency} onChange={(e) => setEmergency(Number(e.target.value))} />
            </div>
          </div>

          <h3 style={{ marginTop: '24px' }}>Net Worth Inputs</h3>
          <div className="card-grid two">
            <div className="form-field">
              <label htmlFor="fp-cash">Cash &amp; Bank (₹)</label>
              <input id="fp-cash" type="number" min="0" value={cash} onChange={(e) => setCash(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-investments">Investments (₹)</label>
              <input id="fp-investments" type="number" min="0" value={investments} onChange={(e) => setInvestments(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-retirement-assets">Retirement assets (₹)</label>
              <input id="fp-retirement-assets" type="number" min="0" value={retirementAssets} onChange={(e) => setRetirementAssets(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-property">Real Estate &amp; Other (₹)</label>
              <input id="fp-property" type="number" min="0" value={property + otherAssets} onChange={(e) => setProperty(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-debt-total">Total Debt / Loans (₹)</label>
              <input id="fp-debt-total" type="number" min="0" value={totalLiab} onChange={(e) => setHomeLoan(Number(e.target.value))} />
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: '24px' }}>
            <div className="stat">
              <strong>{formatMoney(spending)}</strong>
              <span>Total spending</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(surplus)}</strong>
              <span>Monthly surplus</span>
            </div>
            <div className="stat">
              <strong>{savingsRate.toFixed(1)}%</strong>
              <span>Savings rate</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(reserveTarget)}</strong>
              <span>Target reserve</span>
            </div>
            <div className="stat">
              <strong>{monthsCovered.toFixed(1)} months</strong>
              <span>Months covered</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(netWorth)}</strong>
              <span>Net worth</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'goals' && (
        <section className="card">
          <h2>Future Goal Cost &amp; Compound Growth</h2>
          <div className="card-grid two">
            <div>
              <h3>Goal Inflation</h3>
              <div className="form-field">
                <label htmlFor="fp-goal-cost">Goal cost today (₹)</label>
                <input id="fp-goal-cost" type="number" min="0" value={goalCost} onChange={(e) => setGoalCost(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-goal-years">Years to goal</label>
                <input id="fp-goal-years" type="number" min="0" value={goalYears} onChange={(e) => setGoalYears(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-goal-inflation">Assumed annual inflation (%)</label>
                <input id="fp-goal-inflation" type="number" min="0" step="0.1" value={goalInflation} onChange={(e) => setGoalInflation(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-goal-saved">Already set aside (₹)</label>
                <input id="fp-goal-saved" type="number" min="0" value={goalSaved} onChange={(e) => setGoalSaved(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <h3>SIP / Compound Growth</h3>
              <div className="form-field">
                <label htmlFor="fp-sip-initial">Starting principal (₹)</label>
                <input id="fp-sip-initial" type="number" min="0" value={initial} onChange={(e) => setInitial(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-sip-monthly">Monthly contribution (₹)</label>
                <input id="fp-sip-monthly" type="number" min="0" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-sip-years">Duration (years)</label>
                <input id="fp-sip-years" type="number" min="0" value={growthYears} onChange={(e) => setGrowthYears(Number(e.target.value))} />
              </div>
              <div className="form-field" style={{ marginTop: '8px' }}>
                <label htmlFor="fp-sip-return">Assumed annual return (%)</label>
                <input id="fp-sip-return" type="number" min="0" step="0.1" value={growthReturn} onChange={(e) => setGrowthReturn(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: '24px' }}>
            <div className="stat">
              <strong>{formatMoney(futureGoal)}</strong>
              <span>Estimated future goal cost</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(goalGap)}</strong>
              <span>Uncovered goal gap</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(fv)}</strong>
              <span>Projected SIP value</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(estimatedGrowth)}</strong>
              <span>Illustrative growth</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'retirement' && (
        <section className="card">
          <h2>Retirement Planning</h2>
          <div className="card-grid two">
            <div className="form-field">
              <label htmlFor="fp-ret-age">Current age</label>
              <input id="fp-ret-age" type="number" min="18" value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-planned-age">Planned retirement age</label>
              <input id="fp-ret-planned-age" type="number" min="20" value={retAge} onChange={(e) => setRetAge(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-lifespan">Planning lifespan</label>
              <input id="fp-ret-lifespan" type="number" min="40" value={lifespan} onChange={(e) => setLifespan(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-spending">Current annual retirement spending (₹)</label>
              <input id="fp-ret-spending" type="number" min="0" value={retSpending} onChange={(e) => setRetSpending(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-corpus">Current retirement corpus (₹)</label>
              <input id="fp-ret-corpus" type="number" min="0" value={corpus} onChange={(e) => setCorpus(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-contribution">Monthly contribution (₹)</label>
              <input id="fp-ret-contribution" type="number" min="0" value={retContribution} onChange={(e) => setRetContribution(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-inflation">Assumed inflation (%)</label>
              <input id="fp-ret-inflation" type="number" min="0" step="0.1" value={retInflation} onChange={(e) => setRetInflation(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-pre-return">Pre-retirement return (%)</label>
              <input id="fp-ret-pre-return" type="number" min="0" step="0.1" value={preReturn} onChange={(e) => setPreReturn(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="fp-ret-real-return">In-retirement real return (%)</label>
              <input id="fp-ret-real-return" type="number" min="0" step="0.1" value={realReturn} onChange={(e) => setRealReturn(Number(e.target.value))} />
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: '24px' }}>
            <div className="stat">
              <strong>{retYears} years</strong>
              <span>Years to retirement</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(retFutureSpend)}</strong>
              <span>Year 1 retirement spending</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(requiredCorpus)}</strong>
              <span>Estimated corpus required</span>
            </div>
            <div className="stat">
              <strong>{formatMoney(projectedCorpus)}</strong>
              <span>Projected corpus</span>
            </div>
            <div className="stat">
              <strong style={{ color: retGap >= 0 ? '#166534' : '#b91c1c' }}>
                {formatMoney(retGap)}
              </strong>
              <span>Projected gap / surplus</span>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'review' && (
        <section className="card">
          <h2>Planning Review</h2>
          <p>
            Use this page as a structured review of the numbers you entered. It deliberately does not convert the results into a buy/sell recommendation or a personalized financial plan.
          </p>
          <div className="card-grid two" style={{ marginTop: '16px' }}>
            <div className="card">
              <h3>What to Review</h3>
              <ul>
                <li>Is monthly spending based on representative periods?</li>
                <li>Does your emergency reserve target reflect real family risk?</li>
                <li>Are inflation assumptions conservative for healthcare and education?</li>
                <li>Are return assumptions treated as scenarios rather than guarantees?</li>
              </ul>
            </div>
            <div className="card">
              <h3>Useful Source Notes</h3>
              <ul>
                <li>
                  <Link to="/notes/money-basics-budget-emergency-net-worth/">
                    Money Basics: Budgeting, Emergency Funds and Net Worth
                  </Link>
                </li>
                <li>
                  <Link to="/notes/inflation-and-future-goal-planning/">
                    Inflation and Future Goal Planning
                  </Link>
                </li>
                <li>
                  <Link to="/notes/retirement-planning-start-with-the-number/">
                    Retirement Planning: Start With the Number
                  </Link>
                </li>
                <li>
                  <Link to="/notes/retirement-corpus-calculation-framework/">
                    Retirement Corpus: A Simple Calculation Framework
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="content-section financial-disclosure">
        <h2>Financial Content Disclosure</h2>
        <p>
          This workspace provides general educational information and illustrative calculations only. It does not provide personalized investment, financial, tax or trading advice.
        </p>
      </section>
    </main>
  );
};
