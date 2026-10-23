import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShareButton } from '../components/ShareButton';

export const FinancePlanningWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'snapshot' | 'goals' | 'retirement' | 'review'>('snapshot');

  // Snapshot State
  const [income, setIncome] = useState(100000);
  const [essential, setEssential] = useState(50000);
  const [discretionary, setDiscretionary] = useState(10000);
  const [debt, setDebt] = useState(0);
  const [targetMonths, setTargetMonths] = useState(6);
  const [emergencySavings, setEmergencySavings] = useState(200000);
  const [cash, setCash] = useState(0);
  const [investments, setInvestments] = useState(0);
  const [retirementAssets, setRetirementAssets] = useState(0);
  const [property, setProperty] = useState(0);
  const [otherAssets, setOtherAssets] = useState(0);
  const [homeLoan, setHomeLoan] = useState(0);
  const [vehicleLoan, setVehicleLoan] = useState(0);
  const [otherDebt, setOtherDebt] = useState(0);

  // Goals & Growth State
  const [goalCost, setGoalCost] = useState(1000000);
  const [goalYears, setGoalYears] = useState(10);
  const [goalInflation, setGoalInflation] = useState(6);
  const [goalSaved, setGoalSaved] = useState(200000);
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

  const money = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);

  // Snapshot calculations
  const totalSpending = essential + discretionary + debt;
  const surplus = income - totalSpending;
  const savingsRate = income > 0 ? (surplus / income * 100).toFixed(1) + '%' : '—';
  const reserveTarget = essential * targetMonths;
  const monthsCovered = essential > 0 ? (emergencySavings / essential).toFixed(1) : '0';
  const assets = cash + investments + retirementAssets + property + otherAssets;
  const liabilities = homeLoan + vehicleLoan + otherDebt;
  const netWorth = assets - liabilities;

  // Goals calculations
  const futureGoal = goalCost * Math.pow(1 + goalInflation / 100, goalYears);
  const goalIncrease = futureGoal - goalCost;
  const goalGap = Math.max(0, futureGoal - goalSaved);

  const growthPeriods = Math.round(growthYears * 12);
  const growthRate = growthReturn / 100 / 12;
  const growthTotalInvested = initial + monthly * growthPeriods;
  let futureValue = 0;
  if (growthRate === 0) {
    futureValue = growthTotalInvested;
  } else {
    const factor = Math.pow(1 + growthRate, growthPeriods);
    futureValue = initial * factor + monthly * ((factor - 1) / growthRate);
  }
  const estimatedGrowth = futureValue - growthTotalInvested;

  // Retirement calculations
  let retYears = retAge - age;
  let retMonths = Math.round(retYears * 12);
  let retHorizon = lifespan - retAge;
  let retFutureSpend = retSpending * Math.pow(1 + retInflation / 100, retYears);
  let projectedCorpus = 0;
  const preMonthly = preReturn / 100 / 12;
  if (preMonthly === 0) {
    projectedCorpus = corpus + retContribution * retMonths;
  } else {
    const factor = Math.pow(1 + preMonthly, retMonths);
    projectedCorpus = corpus * factor + retContribution * ((factor - 1) / preMonthly);
  }
  let requiredCorpus = 0;
  const rr = realReturn / 100;
  if (rr === 0) {
    requiredCorpus = retFutureSpend * retHorizon;
  } else {
    requiredCorpus = retFutureSpend * (1 - Math.pow(1 + rr, -retHorizon)) / rr;
  }
  const retGap = projectedCorpus - requiredCorpus;

  return (
    <main className="workspace">
      <div className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'Finance Planning Workspace' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <ShareButton
            title="Finance Planning Workspace"
            text="Integrated multi-tab planner for cash flow, goals, and retirement readiness."
          />
        </div>
        <p className="eyebrow">Finance · Interactive Workspace</p>
        <h1>Finance Planning Workspace</h1>
        <p className="lead">
          One browser-based workspace for organizing a personal-finance picture and exploring common planning calculations. Enter your numbers, review the outputs, then adjust assumptions to see how the illustration changes.
        </p>
        <p className="note">
          This workspace is educational and illustrative. It does not connect to accounts, recommend financial products, predict returns or provide individualized financial, investment or tax advice.
        </p>
      </div>

      <div className="tabs" role="tablist">
        <button
          className={activeTab === 'snapshot' ? 'on' : ''}
          type="button"
          onClick={() => setActiveTab('snapshot')}
        >
          Snapshot
        </button>
        <button
          className={activeTab === 'goals' ? 'on' : ''}
          type="button"
          onClick={() => setActiveTab('goals')}
        >
          Goals &amp; Growth
        </button>
        <button
          className={activeTab === 'retirement' ? 'on' : ''}
          type="button"
          onClick={() => setActiveTab('retirement')}
        >
          Retirement
        </button>
        <button
          className={activeTab === 'review' ? 'on' : ''}
          type="button"
          onClick={() => setActiveTab('review')}
        >
          Review
        </button>
      </div>

      {/* SNAPSHOT TAB */}
      {activeTab === 'snapshot' && (
        <section className="view on">
          <div className="grid">
            <div className="panel">
              <h2>Monthly cash flow</h2>
              <div className="fields">
                <div className="field">
                  <label htmlFor="inc">Monthly income (₹)</label>
                  <input
                    id="inc"
                    type="number"
                    min="0"
                    value={income}
                    onChange={e => setIncome(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ess">Essential expenses (₹)</label>
                  <input
                    id="ess"
                    type="number"
                    min="0"
                    value={essential}
                    onChange={e => setEssential(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="disc">Discretionary expenses (₹)</label>
                  <input
                    id="disc"
                    type="number"
                    min="0"
                    value={discretionary}
                    onChange={e => setDiscretionary(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="dbt">Debt payments (₹)</label>
                  <input
                    id="dbt"
                    type="number"
                    min="0"
                    value={debt}
                    onChange={e => setDebt(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="panel">
              <h2>Emergency reserve</h2>
              <div className="fields">
                <div className="field">
                  <label htmlFor="tm">Target months</label>
                  <input
                    id="tm"
                    type="number"
                    min="0"
                    step="0.5"
                    value={targetMonths}
                    onChange={e => setTargetMonths(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="es">Current savings (₹)</label>
                  <input
                    id="es"
                    type="number"
                    min="0"
                    value={emergencySavings}
                    onChange={e => setEmergencySavings(Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="summary" style={{ marginTop: '14px' }}>
                Current reserve covers about {monthsCovered} months; target reserve is {money(reserveTarget)}.
              </p>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '16px' }}>
            <h2>Net worth</h2>
            <div className="fields">
              <div className="field">
                <label htmlFor="csh">Cash (₹)</label>
                <input id="csh" type="number" min="0" value={cash} onChange={e => setCash(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="inv">Investments (₹)</label>
                <input id="inv" type="number" min="0" value={investments} onChange={e => setInvestments(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="retA">Retirement assets (₹)</label>
                <input id="retA" type="number" min="0" value={retirementAssets} onChange={e => setRetirementAssets(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="prop">Real estate (₹)</label>
                <input id="prop" type="number" min="0" value={property} onChange={e => setProperty(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="oth">Other assets (₹)</label>
                <input id="oth" type="number" min="0" value={otherAssets} onChange={e => setOtherAssets(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="hl">Home loan (₹)</label>
                <input id="hl" type="number" min="0" value={homeLoan} onChange={e => setHomeLoan(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="vl">Vehicle loan (₹)</label>
                <input id="vl" type="number" min="0" value={vehicleLoan} onChange={e => setVehicleLoan(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="od">Personal / other debt (₹)</label>
                <input id="od" type="number" min="0" value={otherDebt} onChange={e => setOtherDebt(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="kpi"><small>Total spending</small><strong>{money(totalSpending)}</strong></div>
            <div className="kpi"><small>Monthly surplus / deficit</small><strong>{money(surplus)}</strong></div>
            <div className="kpi"><small>Savings rate</small><strong>{savingsRate}</strong></div>
            <div className="kpi"><small>Emergency target</small><strong>{money(reserveTarget)}</strong></div>
            <div className="kpi"><small>Months covered</small><strong>{monthsCovered} mo</strong></div>
            <div className="kpi"><small>Net worth</small><strong>{money(netWorth)}</strong></div>
          </div>
        </section>
      )}

      {/* GOALS TAB */}
      {activeTab === 'goals' && (
        <section className="view on">
          <div className="grid">
            <div className="panel">
              <h2>Future goal cost</h2>
              <div className="fields">
                <div className="field">
                  <label htmlFor="gc">Goal cost today (₹)</label>
                  <input id="gc" type="number" min="0" value={goalCost} onChange={e => setGoalCost(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="gy">Years</label>
                  <input id="gy" type="number" min="0" value={goalYears} onChange={e => setGoalYears(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="gi">Inflation (%)</label>
                  <input id="gi" type="number" min="0" step="0.1" value={goalInflation} onChange={e => setGoalInflation(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="gs">Already set aside (₹)</label>
                  <input id="gs" type="number" min="0" value={goalSaved} onChange={e => setGoalSaved(Number(e.target.value))} />
                </div>
              </div>
              <div className="kpis">
                <div className="kpi"><small>Estimated future cost</small><strong>{money(futureGoal)}</strong></div>
                <div className="kpi"><small>Inflation increase</small><strong>{money(goalIncrease)}</strong></div>
                <div className="kpi"><small>Uncovered amount</small><strong>{money(goalGap)}</strong></div>
              </div>
            </div>

            <div className="panel">
              <h2>Compound growth illustration</h2>
              <div className="fields">
                <div className="field">
                  <label htmlFor="ini">Starting amount (₹)</label>
                  <input id="ini" type="number" min="0" value={initial} onChange={e => setInitial(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="mon">Monthly contribution (₹)</label>
                  <input id="mon" type="number" min="0" value={monthly} onChange={e => setMonthly(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="gry">Years</label>
                  <input id="gry" type="number" min="0" value={growthYears} onChange={e => setGrowthYears(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor="grr">Annual return (%)</label>
                  <input id="grr" type="number" min="0" step="0.1" value={growthReturn} onChange={e => setGrowthReturn(Number(e.target.value))} />
                </div>
              </div>
              <div className="kpis">
                <div className="kpi"><small>Future value</small><strong>{money(futureValue)}</strong></div>
                <div className="kpi"><small>Total contributed</small><strong>{money(growthTotalInvested)}</strong></div>
                <div className="kpi"><small>Illustrative growth</small><strong>{money(estimatedGrowth)}</strong></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RETIREMENT TAB */}
      {activeTab === 'retirement' && (
        <section className="view on">
          <div className="panel">
            <h2>Retirement planning illustration</h2>
            <div className="fields">
              <div className="field">
                <label htmlFor="rag">Current age</label>
                <input id="rag" type="number" min="0" value={age} onChange={e => setAge(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rsp">Annual spending today (₹)</label>
                <input id="rsp" type="number" min="0" value={retSpending} onChange={e => setRetSpending(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rcp">Current corpus (₹)</label>
                <input id="rcp" type="number" min="0" value={corpus} onChange={e => setCorpus(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rct">Monthly contribution (₹)</label>
                <input id="rct" type="number" min="0" value={retContribution} onChange={e => setRetContribution(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rta">Retirement age</label>
                <input id="rta" type="number" min="1" value={retAge} onChange={e => setRetAge(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rlf">Planning lifespan</label>
                <input id="rlf" type="number" min="1" value={lifespan} onChange={e => setLifespan(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rinf">Inflation (%)</label>
                <input id="rinf" type="number" min="0" step="0.1" value={retInflation} onChange={e => setRetInflation(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rpre">Pre-ret return (%)</label>
                <input id="rpre" type="number" min="0" step="0.1" value={preReturn} onChange={e => setPreReturn(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="rrea">Post-ret real return (%)</label>
                <input id="rrea" type="number" min="0" step="0.1" value={realReturn} onChange={e => setRealReturn(Number(e.target.value))} />
              </div>
            </div>

            <div className="kpis" style={{ marginTop: '20px' }}>
              <div className="kpi"><small>Years to retirement</small><strong>{retYears} years</strong></div>
              <div className="kpi"><small>Retirement-year spending</small><strong>{money(retFutureSpend)}</strong></div>
              <div className="kpi"><small>Retirement horizon</small><strong>{retHorizon} years</strong></div>
              <div className="kpi"><small>Required corpus</small><strong>{money(requiredCorpus)}</strong></div>
              <div className="kpi"><small>Projected corpus</small><strong>{money(projectedCorpus)}</strong></div>
              <div className="kpi"><small>Gap / Surplus</small><strong>{money(retGap)}</strong></div>
            </div>
          </div>
        </section>
      )}

      {/* REVIEW TAB */}
      {activeTab === 'review' && (
        <section className="view on">
          <div className="panel">
            <h2>Planning review</h2>
            <p>
              Use this page as a structured review of the numbers you entered. It deliberately does not convert the results into a buy/sell recommendation or a personalized financial plan.
            </p>
            <div className="grid">
              <div className="panel">
                <h3>What to review</h3>
                <ul>
                  <li>Is monthly spending based on a representative period?</li>
                  <li>Does the emergency-reserve target reflect your own circumstances?</li>
                  <li>Are goal costs and inflation assumptions clearly identified?</li>
                  <li>Are return assumptions treated as scenarios rather than promises?</li>
                  <li>Is retirement spending expressed in today's terms and then inflated?</li>
                  <li>Have you considered taxes, fees, insurance, pensions and other relevant items outside this simplified workspace?</li>
                </ul>
              </div>
              <div className="panel">
                <h3>Useful source notes</h3>
                <ul>
                  <li><Link to="/notes/money-basics-budget-emergency-net-worth/">Money Basics: Budgeting, Emergency Funds and Net Worth</Link></li>
                  <li><Link to="/notes/inflation-and-future-goal-planning/">Inflation and Future Goal Planning</Link></li>
                  <li><Link to="/notes/retirement-planning-start-with-the-number/">Retirement Planning: Start With the Number</Link></li>
                  <li><Link to="/notes/retirement-corpus-calculation-framework/">Retirement Corpus: A Simple Calculation Framework</Link></li>
                </ul>
              </div>
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
