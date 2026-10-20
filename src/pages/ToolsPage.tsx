import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: 'it' | 'career' | 'ai' | 'finance';
  route: string;
}

const TOOLS: ToolItem[] = [
  {
    id: 'ai-prompt-builder',
    name: 'AI Prompt Builder',
    description: 'Craft structured, high-context prompts for troubleshooting, communication, and technical writing.',
    category: 'ai',
    route: '/tools/ai-prompt-builder',
  },
  {
    id: 'career-match',
    name: 'Career Match Resume Review',
    description: 'Compare your resume with any job description to uncover keyword gaps and keyword alignment.',
    category: 'career',
    route: '/tools/career-match-resume-review',
  },
  {
    id: 'bullet-checker',
    name: 'Resume Bullet Strength Checker',
    description: 'Score and polish resume bullet points for action verbs, quantified metrics, and brevity.',
    category: 'career',
    route: '/tools/resume-bullet-strength-checker',
  },
  {
    id: 'interview-planner',
    name: 'Interview Preparation Planner',
    description: 'Prepare behavioral STAR stories and reverse-interview questions for IT roles.',
    category: 'career',
    route: '/tools/interview-preparation-planner',
  },
  {
    id: 'it-troubleshooter',
    name: 'IT Troubleshooting Assistant',
    description: 'Follow systematic, layer-by-layer diagnostic checklists for network, Apple, and Windows issues.',
    category: 'it',
    route: '/tools/it-troubleshooting-assistant',
  },
  {
    id: 'service-desk-notes',
    name: 'Service Desk Note Formatter',
    description: 'Convert scattered notes into clean, audit-ready ITSM ticket updates.',
    category: 'it',
    route: '/tools/service-desk-note-formatter',
  },
  {
    id: 'ticket-to-kb',
    name: 'Ticket to Knowledge Base Draft',
    description: 'Transform resolved IT tickets into searchable knowledge base articles and SOPs.',
    category: 'it',
    route: '/tools/ticket-to-knowledge-base-draft',
  },
  {
    id: 'ipv4-subnet-calculator',
    name: 'IPv4 Subnet & CIDR Calculator',
    description: 'Calculate network bounds, host ranges, broadcast addresses, wildcard masks, and 32-bit binary notation.',
    category: 'it',
    route: '/tools/ipv4-subnet-calculator',
  },
  {
    id: 'server-rack-power-btu',
    name: 'Server Rack Power & BTU Calculator',
    description: 'Estimate server equipment electrical draw (Watts/Amps), circuit breaker derating, and HVAC BTU/hr cooling load.',
    category: 'it',
    route: '/tools/server-rack-power-btu-calculator',
  },
  {
    id: 'finance-snapshot',
    name: 'Personal Finance Snapshot',
    description: 'Assess emergency reserves, savings ratios, debt load, and asset distribution in one view.',
    category: 'finance',
    route: '/tools/personal-finance-snapshot',
  },
  {
    id: 'finance-workspace',
    name: 'Finance Planning Workspace',
    description: 'Integrated multi-tab planner for cash flow, goals, and retirement readiness.',
    category: 'finance',
    route: '/tools/finance-planning-workspace',
  },
  {
    id: 'compound-growth',
    name: 'Compound Growth & SIP Calculator',
    description: 'Simulate monthly SIP investments with compound growth and inflation adjustments.',
    category: 'finance',
    route: '/tools/compound-growth-sip-calculator',
  },
  {
    id: 'inflation-goal',
    name: 'Inflation & Goal Planning Calculator',
    description: 'Calculate the true future cost of long-term milestones adjusted for inflation.',
    category: 'finance',
    route: '/tools/inflation-goal-planning-calculator',
  },
  {
    id: 'retirement-planner',
    name: 'Retirement Planning Calculator',
    description: 'Determine required retirement corpus and ongoing contributions needed to retire comfortably.',
    category: 'finance',
    route: '/tools/retirement-planning-calculator',
  },
];

export const ToolsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'it' | 'career' | 'ai' | 'finance'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = TOOLS.filter(t => {
    const matchesCat = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Tools</span>
      </nav>

      <p className="eyebrow">Interactive Utilities</p>
      <h1>Tools &amp; Calculators</h1>
      <p className="lead">
        Free, browser-based utilities for IT service desk workflows, resume optimization, career preparation, and personal finance planning. No sign-up or data upload required.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button
            type="button"
            className={`tab-button ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Tools ({TOOLS.length})
          </button>
          <button
            type="button"
            className={`tab-button ${activeCategory === 'it' ? 'active' : ''}`}
            onClick={() => setActiveCategory('it')}
          >
            IT Support &amp; ITSM
          </button>
          <button
            type="button"
            className={`tab-button ${activeCategory === 'career' ? 'active' : ''}`}
            onClick={() => setActiveCategory('career')}
          >
            Career &amp; Resume
          </button>
          <button
            type="button"
            className={`tab-button ${activeCategory === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveCategory('finance')}
          >
            Finance &amp; Calculators
          </button>
          <button
            type="button"
            className={`tab-button ${activeCategory === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ai')}
          >
            AI Prompting
          </button>
        </div>

        <div className="discovery-controls">
          <input
            type="search"
            className="discovery-input"
            placeholder="Search tools..."
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

      <div className="card-grid">
        {filtered.map(tool => (
          <article key={tool.id} className="card">
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <Link to={tool.route}>Open Tool →</Link>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ marginTop: '20px', color: 'var(--muted)' }}>
          No tools found matching your criteria.
        </p>
      )}
    </main>
  );
};
