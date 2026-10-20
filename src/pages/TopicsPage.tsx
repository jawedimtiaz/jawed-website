import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const TopicsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const q = searchTerm.toLowerCase();

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Topics</span>
      </nav>

      <p className="eyebrow">Knowledge hub</p>
      <h1>Topics</h1>
      <p className="lead">
        Explore the main areas of practical knowledge covered on this site, from technology and AI to investing, personal finance and interactive tools.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        <h2>Find a Topic</h2>
        <div className="discovery-controls" style={{ marginTop: '8px' }}>
          <input
            className="discovery-input"
            type="search"
            placeholder="Search topics by name, subject or purpose..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="button button-secondary discovery-reset"
              type="button"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {(!q || 'technology it support apple windows networking automation'.includes(q)) && (
        <section className="content-section">
          <h2>Technology</h2>
          <p>Practical workplace technology and technical problem solving.</p>
          <div className="card-grid">
            <article className="card">
              <h3>IT Support &amp; Service Desk</h3>
              <p>Troubleshooting, documentation, scoping, escalation and device support.</p>
              <Link to="/notes">Explore Technology Notes →</Link>
            </article>
            <article className="card">
              <h3>Apple / Jamf</h3>
              <p>macOS, Apple devices, enrollment models and device management.</p>
              <Link to="/notes/apple-macos-first-response-checklist">Explore Apple Notes →</Link>
            </article>
            <article className="card">
              <h3>Windows &amp; Microsoft</h3>
              <p>Windows troubleshooting, Microsoft sign-in and service-support fundamentals.</p>
              <Link to="/notes/windows-first-response-troubleshooting-checklist">Explore Microsoft Notes →</Link>
            </article>
            <article className="card">
              <h3>Networking</h3>
              <p>Connectivity, network scope and layer-by-layer troubleshooting.</p>
              <Link to="/notes/network-connectivity-first-response-checklist">Explore Networking Notes →</Link>
            </article>
            <article className="card">
              <h3>Automation &amp; Web</h3>
              <p>Small automations, browser-based tools, practical scripting and website development.</p>
              <Link to="/notes/small-it-automation-starting-point">Explore Automation Notes →</Link>
            </article>
          </div>
        </section>
      )}

      {(!q || 'ai productivity prompting tools'.includes(q)) && (
        <section className="content-section">
          <h2>AI &amp; Productivity</h2>
          <p>Practical AI use for work and IT support, with an emphasis on useful workflows, prompting, tool selection and responsible use.</p>
          <div className="card-grid">
            <article className="card">
              <h3>AI for Work</h3>
              <p>Practical workflows for writing, research, analysis and repetitive tasks.</p>
              <Link to="/notes/ai-prompting-everyday-work">Read AI prompting note →</Link>
            </article>
            <article className="card">
              <h3>AI for IT Support</h3>
              <p>Ways AI can assist troubleshooting, documentation and knowledge work.</p>
              <Link to="/notes/ai-for-it-support-practical-workflow">Read AI for IT Support note →</Link>
            </article>
            <article className="card">
              <h3>Choosing AI Tools</h3>
              <p>Practical checks for task fit, privacy, cost, output quality and organizational requirements.</p>
              <Link to="/notes/choosing-ai-tools-privacy-cost-fit">Read AI tool selection note →</Link>
            </article>
          </div>
        </section>
      )}

      {(!q || 'investing stocks etf mutual funds portfolio'.includes(q)) && (
        <section className="content-section">
          <h2>Investing</h2>
          <p>Educational content on long-term investing, portfolio organization and practical money decisions.</p>
          <div className="card-grid">
            <article className="card">
              <h3>US Investing</h3>
              <p>US equities, ETFs, portfolio construction and research frameworks.</p>
              <Link to="/notes/us-stocks-etfs-starting-point">Read US Investing note →</Link>
            </article>
            <article className="card">
              <h3>Indian Investing</h3>
              <p>Mutual funds, index funds, ETFs and portfolio allocation.</p>
              <Link to="/notes/indian-mutual-funds-index-etfs-starting-point">Read Indian Investing note →</Link>
            </article>
            <article className="card">
              <h3>Portfolio Management</h3>
              <p>Allocation, rebalancing, risk, performance tracking and long-term planning.</p>
              <Link to="/notes/portfolio-allocation-rebalancing-framework">Read portfolio framework →</Link>
            </article>
          </div>
        </section>
      )}

      {(!q || 'finance tax retirement insurance budget net worth'.includes(q)) && (
        <section className="content-section">
          <h2>Personal Finance</h2>
          <p>Practical guides around managing money, tax concepts and preparing for long-term goals.</p>
          <div className="card-grid">
            <article className="card">
              <h3>Tax</h3>
              <p>Tax planning, tax concepts and practical checklists for Indian taxpayers.</p>
              <Link to="/notes/indian-income-tax-practical-starting-point">Read Indian Income Tax note →</Link>
            </article>
            <article className="card">
              <h3>Retirement</h3>
              <p>Start by estimating a target, then test inflation assumptions and review withdrawal risks.</p>
              <Link to="/notes/retirement-planning-start-with-the-number">Start with a target →</Link>
            </article>
            <article className="card">
              <h3>Insurance</h3>
              <p>Health insurance terms, coverage limits, exclusions and claim questions.</p>
              <Link to="/notes/health-insurance-understanding-the-basics">Read health insurance basics →</Link>
            </article>
            <article className="card">
              <h3>Budgeting &amp; Net Worth</h3>
              <p>Monthly budget, emergency-fund target and a clear view of assets and liabilities.</p>
              <Link to="/notes/money-basics-budget-emergency-net-worth">Read budgeting guide →</Link>
            </article>
          </div>
        </section>
      )}

      <section className="content-section financial-disclosure">
        <h2>Financial Content Disclosure</h2>
        <p>
          This website provides general educational information only. It does not provide personalized investment, financial, tax or trading advice. I do not recommend or endorse any specific stock, ETF, mutual fund, security, broker, transaction, price target, or buy/sell/hold action.
        </p>
      </section>
    </main>
  );
};
