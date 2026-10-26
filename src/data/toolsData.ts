export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'it', label: 'IT Support & ITSM' },
  { id: 'career', label: 'Career & Resume' },
  { id: 'finance', label: 'Finance & Calculators' },
  { id: 'ai', label: 'AI Prompting' },
] as const;

export type ToolCategoryId = typeof TOOL_CATEGORIES[number]['id'];
export type BaseToolCategoryId = Exclude<ToolCategoryId, 'all'>;
export type ToolCategoryLabel = typeof TOOL_CATEGORIES[number]['label'];
export type BaseToolCategoryLabel = Exclude<ToolCategoryLabel, 'All Tools'>;

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category?: 'it' | 'career' | 'ai' | 'finance' | 'IT Support & ITSM' | 'Career & Resume' | 'Finance & Calculators' | 'AI Prompting' | 'auto' | string;
  route: string;
  keywords?: string[];
}

export const IT_KEYWORDS = [
  'incident',
  'troubleshooting',
  'cabling',
  'network',
  'port',
  'idrac',
  'active directory',
  'support',
  'helpdesk',
  'sla',
  'itsm',
  'cli',
];

export const CAREER_KEYWORDS = [
  'resume',
  'career',
  'job',
  'interview',
  'bullet',
  'hiring',
  'ats',
  'cover letter',
  'linkedin',
];

export const FINANCE_KEYWORDS = [
  'finance',
  'calculator',
  'tax',
  'loan',
  'roi',
  'budget',
  'salary',
  'interest',
  'currency',
  'investment',
];

export const AI_KEYWORDS = [
  'prompt',
  'ai',
  'gpt',
  'llm',
  'token',
  'system prompt',
  'claude',
  'gemini',
];

function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword.length <= 3) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  }
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Determines the category ID ('it' | 'career' | 'finance' | 'ai') for a tool.
 * If an explicit category is provided, it resolves and normalizes it.
 * If category is missing, empty, or 'auto', keyword matching determines category:
 *   - AI Prompting ('ai'): ['prompt', 'ai', 'gpt', 'llm', 'token', 'system prompt', 'claude', 'gemini']
 *   - Career & Resume ('career'): ['resume', 'career', 'job', 'interview', 'bullet', 'hiring', 'ats', 'cover letter', 'linkedin']
 *   - Finance & Calculators ('finance'): ['finance', 'calculator', 'tax', 'loan', 'roi', 'budget', 'salary', 'interest', 'currency', 'investment']
 *   - IT Support & ITSM ('it'): ['incident', 'troubleshooting', 'cabling', 'network', 'port', 'idrac', 'active directory', 'support', 'helpdesk', 'sla', 'itsm', 'cli']
 *   - Fallback: 'IT Support & ITSM' ('it')
 */
export function determineToolCategoryId(item: {
  id?: string;
  name?: string;
  description?: string;
  category?: string | null;
  keywords?: string[];
}): BaseToolCategoryId {
  const rawCat = (item.category || '').trim().toLowerCase();

  // Explicit mappings
  if (rawCat && rawCat !== 'auto' && rawCat !== 'all') {
    if (rawCat === 'it' || rawCat === 'it support & itsm' || rawCat === 'itsm') return 'it';
    if (rawCat === 'career' || rawCat === 'career & resume') return 'career';
    if (rawCat === 'finance' || rawCat === 'finance & calculators') return 'finance';
    if (rawCat === 'ai' || rawCat === 'ai prompting') return 'ai';
  }

  // Scan text from name, description, keywords, id
  const textToScan = [
    item.name || '',
    item.description || '',
    (item.keywords || []).join(' '),
    item.id ? item.id.replace(/[-_]/g, ' ') : '',
  ].join(' ');

  // 1. Match AI Prompting
  if (AI_KEYWORDS.some(kw => matchesKeyword(textToScan, kw))) {
    return 'ai';
  }

  // 2. Match Career & Resume
  if (CAREER_KEYWORDS.some(kw => matchesKeyword(textToScan, kw))) {
    return 'career';
  }

  // 3. Match Finance & Calculators
  if (FINANCE_KEYWORDS.some(kw => matchesKeyword(textToScan, kw))) {
    return 'finance';
  }

  // 4. Match IT Support & ITSM
  if (IT_KEYWORDS.some(kw => matchesKeyword(textToScan, kw))) {
    return 'it';
  }

  // Fallback: IT Support & ITSM
  return 'it';
}

/**
 * Returns human-readable label for a tool's resolved category.
 */
export function determineToolCategory(item: {
  id?: string;
  name?: string;
  description?: string;
  category?: string | null;
  keywords?: string[];
}): BaseToolCategoryLabel {
  const catId = determineToolCategoryId(item);
  switch (catId) {
    case 'it':
      return 'IT Support & ITSM';
    case 'career':
      return 'Career & Resume';
    case 'finance':
      return 'Finance & Calculators';
    case 'ai':
      return 'AI Prompting';
  }
}

export const TOOLS: ToolItem[] = [
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
    id: 'it-resume-bullet-builder',
    name: 'IT Resume Bullet Builder',
    description: 'Turn enterprise IT field, sysadmin, and support experience into metric-driven, ATS-friendly resume bullets.',
    category: 'career',
    route: '/tools/it-resume-bullet-builder',
  },
  {
    id: 'interview-planner',
    name: 'Interview Preparation Planner',
    description: 'Prepare behavioral STAR stories and reverse-interview questions for IT roles.',
    category: 'career',
    route: '/tools/interview-preparation-planner',
  },
  {
    id: 'it-cover-letter-builder',
    name: 'IT Cover Letter Builder',
    description: 'Build a short, tailored cover letter from what you really did, with clear placeholders for missing details.',
    category: 'career',
    route: '/tools/it-cover-letter-builder',
    keywords: ['cover letter', 'it cover letter', 'career', 'resume', 'hiring manager', 'job application'],
  },
  {
    id: 'it-interview-practice',
    name: 'IT Interview Practice',
    description: 'Practise real IT interview questions with an interactive timer, answer workspace, and key talking points checklist across Help Desk, SysAdmin, Network, Cloud, and Security roles.',
    category: 'career',
    route: '/tools/it-interview-practice',
    keywords: ['interview', 'practice', 'help desk', 'sysadmin', 'interview questions', 'technical interview', 'career', 'service desk'],
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
