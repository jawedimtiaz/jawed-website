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
  'cctv',
  'camera',
  'surveillance',
  'raid',
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
    description: 'Turn what you actually did in IT into clear, measurable, ATS-friendly resume bullets, or score a bullet you already wrote. Runs 100% in your browser.',
    category: 'career',
    route: '/tools/it-resume-bullet-builder',
    keywords: ['resume', 'bullet', 'bullet builder', 'it resume', 'ats', 'action verb', 'career', 'metrics', 'cv'],
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
  {
    id: 'it-salary-offer-calculator',
    name: 'IT Salary & Offer Calculator',
    description: 'Work out your hike %, compare two job offers realistically with variable pay and bonus adjustments, and calculate notice-period buyout costs.',
    category: 'career',
    route: '/tools/it-salary-offer-calculator',
    keywords: ['salary', 'hike', 'offer', 'compensation', 'ctc', 'variable pay', 'joining bonus', 'notice buyout', 'career', 'calculator', 'it salary', 'take home', 'tax'],
  },
  {
    id: 'cctv-storage-calculator',
    name: 'CCTV Storage Calculator',
    description: 'Estimate how many terabytes and hard drives your IP camera system needs based on resolution, bitrate, retention days, duty cycle, and RAID level.',
    category: 'it',
    route: '/tools/cctv-storage-calculator',
    keywords: ['cctv', 'camera', 'storage', 'retention', 'nvr', 'surveillance', 'raid', 'terabytes', 'bitrate', 'hard drive', 'security'],
  },
  {
    id: 'hardware-storage-calculator',
    name: 'Hardware Storage & RAID Calculator',
    description: 'Determine the exact number of hard drives required for your target usable capacity based on RAID level (RAID 5, 6, 10, 50, 60), individual drive size, hot spares, and server chassis bays.',
    category: 'it',
    route: '/tools/hardware-storage-calculator',
    keywords: ['storage', 'raid', 'hard drive', 'drive', 'hdd', 'ssd', 'nas', 'san', 'parity', 'raid 5', 'raid 6', 'raid 10', 'raid 50', 'bay', 'chassis', 'terabytes', 'nvr', 'server'],
  },
  {
    id: 'cable-length-poe-checker',
    name: 'Cable Length & PoE Budget Checker',
    description: 'Check whether an Ethernet cable run is within limits for your speed (Cat5e/Cat6/Cat6a) and calculate your switch PoE power budget across 802.3af, 802.3at, and 802.3bt devices.',
    category: 'it',
    route: '/tools/cable-length-poe-budget-checker',
    keywords: ['poe', 'cable', 'cat5e', 'cat6', 'cat6a', 'ethernet', 'poe+', 'poe++', '802.3af', '802.3at', '802.3bt', 'switch', 'power', 'budget', 'watts', 'camera', 'access point', 'voip', 'length'],
  },
  {
    id: 'ai-audio-transcriber',
    name: 'AI Audio Transcriber & Voice Notes',
    description: 'Record or upload audio to generate accurate transcripts, ITSM ticket notes, and technical summaries powered by Gemini 3.5 Transcribe.',
    category: 'ai',
    route: '/tools/ai-audio-transcriber',
    keywords: ['transcribe', 'audio', 'voice', 'recording', 'speech', 'microphone', 'gemini', 'service desk', 'voice note', 'call summary', 'ai'],
  },
  {
    id: 'animate-image-to-video',
    name: 'Animate Images into Video',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with custom motion prompts powered by Gemini Omni Flash.',
    category: 'ai',
    route: '/tools/animate-image-to-video',
    keywords: ['video', 'animate', 'image to video', 'omni flash', 'movie', 'ai', 'gemini', 'cinematic'],
  },
];
