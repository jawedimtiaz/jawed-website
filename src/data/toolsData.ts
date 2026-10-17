export interface ToolItem {
  slug: string;
  title: string;
  category: 'IT Support' | 'Career' | 'AI & Productivity' | 'Finance';
  eyebrow: string;
  description: string;
  path: string;
}

export const toolsList: ToolItem[] = [
  {
    slug: 'service-desk-note-formatter',
    title: 'Service Desk Note Formatter',
    category: 'IT Support',
    eyebrow: 'Tool · IT Support',
    description: 'Turn rough ticket notes into a clean, consistent summary of Issue, Actions Taken, Resolution/Status, and Follow-up for your ticketing system.',
    path: '/tools/service-desk-note-formatter/'
  },
  {
    slug: 'it-troubleshooting-assistant',
    title: 'IT Troubleshooting Assistant',
    category: 'IT Support',
    eyebrow: 'Tool · IT Support · Decision Tree',
    description: 'A guided first-response workflow that helps you scope an IT issue across macOS, Windows, Microsoft 365, or Network, and builds a reviewable next-step checklist.',
    path: '/tools/it-troubleshooting-assistant/'
  },
  {
    slug: 'ticket-to-knowledge-base-draft',
    title: 'Ticket → Knowledge Base Draft',
    category: 'IT Support',
    eyebrow: 'Tool · IT Support · Interactive',
    description: 'Turn verified Service Desk evidence into a reusable, sanitized knowledge-base draft with problem scope, checks, validation, and escalation boundaries.',
    path: '/tools/ticket-to-knowledge-base-draft/'
  },
  {
    slug: 'ai-prompt-builder',
    title: 'AI Prompt Builder',
    category: 'AI & Productivity',
    eyebrow: 'Tool · AI & Productivity',
    description: 'Turn a rough request into a clearer AI prompt using four simple building blocks: Goal, Context, Desired Output, and Constraints.',
    path: '/tools/ai-prompt-builder/'
  },
  {
    slug: 'career-match-resume-review',
    title: 'Career Match & Resume Review',
    category: 'Career',
    eyebrow: 'Tool · Career · Interactive Suite',
    description: 'Compare your resume against a job description in your browser to detect skills overlap, uncover gaps, review action metrics, and track applications.',
    path: '/tools/career-match-resume-review/'
  },
  {
    slug: 'resume-bullet-strength-checker',
    title: 'Resume Bullet Strength Checker',
    category: 'Career',
    eyebrow: 'Tool · Career',
    description: 'Check whether your resume experience bullets clearly demonstrate action verbs, verifiable scope, measurable evidence, and concise wording.',
    path: '/tools/resume-bullet-strength-checker/'
  },
  {
    slug: 'interview-preparation-planner',
    title: 'Interview Preparation Planner',
    category: 'Career',
    eyebrow: 'Tool · Career',
    description: 'Detect common skill and responsibility signals in a job description and generate tailored practice interview questions using the STAR framework.',
    path: '/tools/interview-preparation-planner/'
  },
  {
    slug: 'compound-growth-sip-calculator',
    title: 'Compound Growth & SIP Calculator',
    category: 'Finance',
    eyebrow: 'Tool · Finance',
    description: 'Explore how a starting amount and recurring monthly contributions could grow over time under an assumed annual return with visible formulas.',
    path: '/tools/compound-growth-sip-calculator/'
  },
  {
    slug: 'inflation-goal-planning-calculator',
    title: 'Inflation & Goal Planning Calculator',
    category: 'Finance',
    eyebrow: 'Tool · Finance',
    description: 'Explore how inflation changes the future cost of a goal and compare it against current savings to see the funding gap.',
    path: '/tools/inflation-goal-planning-calculator/'
  },
  {
    slug: 'personal-finance-snapshot',
    title: 'Personal Finance Snapshot',
    category: 'Finance',
    eyebrow: 'Tool · Finance',
    description: 'Bring three everyday money concepts together: monthly cash flow, an emergency reserve runway, and a net worth balance sheet.',
    path: '/tools/personal-finance-snapshot/'
  },
  {
    slug: 'retirement-planning-calculator',
    title: 'Retirement Planning Calculator',
    category: 'Finance',
    eyebrow: 'Tool · Finance',
    description: 'Explore a hypothetical retirement corpus requirement and projected assets using living expenses, inflation, pre-retirement return, and real return.',
    path: '/tools/retirement-planning-calculator/'
  },
  {
    slug: 'finance-planning-workspace',
    title: 'Finance Planning Workspace',
    category: 'Finance',
    eyebrow: 'Tool · Finance · Interactive Workspace',
    description: 'A unified browser workspace integrating Cash Flow Snapshot, Goals & Compound Growth, Retirement Corpus Planning, and Planning Review.',
    path: '/tools/finance-planning-workspace/'
  }
];
