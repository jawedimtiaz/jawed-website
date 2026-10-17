export interface NoteItem {
  slug: string;
  title: string;
  eyebrow: string;
  subject: string;
  category?: string;
  task: string;
  type: string;
  audience?: string;
  publishedDate: string;
  updatedDate: string;
  readTime: string;
  lead: string;
  summary: string;
  tags: string[];
  contentHtml?: string;
  relatedNotes?: { title: string; path: string }[];
  relatedTools?: { title: string; path: string }[];
}

export const getNoteCategory = (note: NoteItem): string => {
  return note.category || note.subject || 'General';
};

export const notesList: NoteItem[] = [
  {
    slug: 'it-service-desk-troubleshooting-workflow',
    title: 'A Practical Service Desk Troubleshooting Workflow',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Troubleshooting',
    type: 'Guide',
    audience: 'Service Desk & Support Analysts',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A repeatable first-response troubleshooting sequence for clarifying symptoms, isolating scope, testing small changes safely, validating user tasks, and documenting or escalating cleanly.',
    summary: 'A repeatable Service Desk first-response workflow covering problem definition, evidence collection, user/device/application/service scoping, one-change-at-a-time testing, validation, and escalation.',
    tags: ['troubleshooting', 'service desk', 'first response', 'scoping', 'evidence', 'validation'],
    relatedNotes: [
      { title: 'User, Device or Service? A Simple Way to Scope IT Issues', path: '/notes/scoping-it-issues-user-device-service/' },
      { title: 'Writing Better Service Desk Ticket Notes', path: '/notes/service-desk-ticket-documentation/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' },
      { title: 'Service Desk Note Formatter', path: '/tools/service-desk-note-formatter/' }
    ]
  },
  {
    slug: 'apple-macos-first-response-checklist',
    title: 'macOS First-Response Troubleshooting Checklist',
    eyebrow: 'Notes · Apple / Jamf',
    subject: 'Apple / Jamf',
    task: 'Troubleshooting',
    type: 'Checklist',
    audience: 'Mac Support Technicians',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '5 min read',
    lead: 'A practical first-response checklist for common macOS support cases before moving to deeper investigation or escalation.',
    summary: 'Symptom-based triage paths for macOS: app crashes, Wi-Fi connectivity, account sign-in, storage, and system preferences.',
    tags: ['macos', 'apple', 'jamf', 'first response', 'troubleshooting'],
    relatedNotes: [
      { title: 'Apple Device Management: Understanding Enrollment Models', path: '/notes/apple-device-management-enrollment-models/' },
      { title: 'Device Provisioning and Handoff Checklist', path: '/notes/device-provisioning-handoff-checklist/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' }
    ]
  },
  {
    slug: 'device-provisioning-handoff-checklist',
    title: 'Device Provisioning and Handoff Checklist',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Device Lifecycle',
    type: 'Checklist',
    audience: 'Workplace Tech & Field Engineers',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-12',
    readTime: '4 min read',
    lead: 'A simple checklist for preparing, validating, and handing over an IT device while keeping support documentation clear and accurate.',
    summary: 'Covers preparation, management enrollment, application deployment, user validation, exception handling, and asset record closure.',
    tags: ['device lifecycle', 'provisioning', 'handoff', 'asset management', 'mdm'],
    relatedNotes: [
      { title: 'Apple Device Management: Understanding Enrollment Models', path: '/notes/apple-device-management-enrollment-models/' },
      { title: 'A Practical Service Desk Troubleshooting Workflow', path: '/notes/it-service-desk-troubleshooting-workflow/' }
    ],
    relatedTools: [
      { title: 'Service Desk Note Formatter', path: '/tools/service-desk-note-formatter/' }
    ]
  },
  {
    slug: 'service-desk-ticket-documentation',
    title: 'Writing Better Service Desk Ticket Notes',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Documentation',
    type: 'Guide',
    audience: 'IT Support Practitioners',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical approach to documenting symptoms, evidence, checks performed, validation, and actionable escalation context without disclosing confidential information.',
    summary: 'Distinguish observed facts from hypotheses, structure ticket updates clearly, and make handoffs seamless for peer technicians.',
    tags: ['ticket documentation', 'service desk', 'incident notes', 'evidence', 'handoff'],
    relatedNotes: [
      { title: 'IT Support Escalation: A Practical Handoff Checklist', path: '/notes/it-support-escalation-handoff-checklist/' },
      { title: 'Writing Better IT Troubleshooting Guides: From Incident to Knowledge Base', path: '/notes/it-troubleshooting-guide-knowledge-base/' }
    ],
    relatedTools: [
      { title: 'Service Desk Note Formatter', path: '/tools/service-desk-note-formatter/' }
    ]
  },
  {
    slug: 'scoping-it-issues-user-device-service',
    title: 'User, Device or Service? A Simple Way to Scope IT Issues',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Scoping & Triage',
    type: 'Framework',
    audience: 'Support Engineers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-12',
    readTime: '5 min read',
    lead: 'A fast diagnostic comparison method to determine whether an IT issue follows an individual account, a physical machine, or a backend service outage.',
    summary: 'Compare user, device, application, and service patterns without jumping to conclusions. Includes comparison decision matrix.',
    tags: ['scoping', 'triage', 'problem isolation', 'user device service'],
    relatedNotes: [
      { title: 'A Practical Service Desk Troubleshooting Workflow', path: '/notes/it-service-desk-troubleshooting-workflow/' },
      { title: 'Network Connectivity First-Response Troubleshooting Checklist', path: '/notes/network-connectivity-first-response-checklist/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' }
    ]
  },
  {
    slug: 'small-it-automation-starting-point',
    title: 'Building Small IT Automations: Start With the Repetitive Step',
    eyebrow: 'Notes · Automation',
    subject: 'Automation',
    task: 'Practical Workflow',
    type: 'Guide',
    audience: 'IT Support & Systems Specialists',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-11',
    readTime: '5 min read',
    lead: 'A practical starting point for small, low-risk automation: define inputs, validate assumptions, handle errors visibly, and build manual fallbacks.',
    summary: 'Principles for selecting automation targets, avoiding over-engineering, logging failure states, and testing reversibility.',
    tags: ['automation', 'scripting', 'powershell', 'workflow', 'efficiency'],
    relatedNotes: [
      { title: 'Building Safe Browser-Based IT Tools: A Practical Framework', path: '/notes/building-safe-browser-based-it-tools/' },
      { title: 'APIs Explained for IT Support: A Practical Starting Point', path: '/notes/apis-explained-for-it-support/' }
    ],
    relatedTools: [
      { title: 'AI Prompt Builder', path: '/tools/ai-prompt-builder/' }
    ]
  },
  {
    slug: 'it-support-escalation-handoff-checklist',
    title: 'IT Support Escalation: A Practical Handoff Checklist',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Escalation',
    type: 'Checklist',
    audience: 'Support Technicians',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-12',
    readTime: '4 min read',
    lead: 'A practical checklist for handing off an issue with clear scope, evidence, current state, and specific requested actions.',
    summary: 'Ensure tier 2/3 and engineering teams have all necessary reproduction steps, timestamps, and error captures without restarting triage.',
    tags: ['escalation', 'handoff', 'service desk', 'tier 2'],
    relatedNotes: [
      { title: 'Writing Better Service Desk Ticket Notes', path: '/notes/service-desk-ticket-documentation/' },
      { title: 'A Practical Service Desk Troubleshooting Workflow', path: '/notes/it-service-desk-troubleshooting-workflow/' }
    ],
    relatedTools: [
      { title: 'Service Desk Note Formatter', path: '/tools/service-desk-note-formatter/' }
    ]
  },
  {
    slug: 'windows-first-response-troubleshooting-checklist',
    title: 'Windows First-Response Troubleshooting Checklist',
    eyebrow: 'Notes · Microsoft',
    subject: 'Microsoft',
    task: 'Troubleshooting',
    type: 'Checklist',
    audience: 'Windows Support Technicians',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '5 min read',
    lead: 'A practical checklist for common Windows support cases before deeper investigation or escalation.',
    summary: 'Covers user account lockouts, network connection checks, event log reviews, safe boot options, and service diagnostics.',
    tags: ['windows', 'microsoft', 'first response', 'troubleshooting'],
    relatedNotes: [
      { title: 'Microsoft Sign-In Troubleshooting: A Practical First-Response Guide', path: '/notes/microsoft-sign-in-troubleshooting-guide/' },
      { title: 'Network Connectivity First-Response Troubleshooting Checklist', path: '/notes/network-connectivity-first-response-checklist/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' }
    ]
  },
  {
    slug: 'network-connectivity-first-response-checklist',
    title: 'Network Connectivity First-Response Troubleshooting Checklist',
    eyebrow: 'Notes · Networking',
    subject: 'Networking',
    task: 'Troubleshooting',
    type: 'Checklist',
    audience: 'Network & Desktop Engineers',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical checklist for isolating network failures across physical connections, DHCP/IP assignment, default gateway reachability, DNS resolution, and routing.',
    summary: 'Step-by-step diagnostic sequence for separating local device issues from infrastructure outages.',
    tags: ['networking', 'troubleshooting', 'dns', 'gateway', 'dhcp', 'ping'],
    relatedNotes: [
      { title: 'Networking Troubleshooting: A Layer-by-Layer Diagnostic Framework', path: '/notes/networking-layer-by-layer-diagnostic-framework/' },
      { title: 'APIs Explained for IT Support: A Practical Starting Point', path: '/notes/apis-explained-for-it-support/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' }
    ]
  },
  {
    slug: 'apis-explained-for-it-support',
    title: 'APIs Explained for IT Support: A Practical Starting Point',
    eyebrow: 'Notes · General Tech',
    subject: 'General Tech',
    task: 'Fundamentals',
    type: 'Guide',
    audience: 'IT Support Practitioners',
    publishedDate: '2026-09-27',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical introduction to APIs for IT support: what an API does, how requests work, status codes, and how to troubleshoot API-based workflows.',
    summary: 'Understand HTTP methods, status codes (200, 400, 401, 403, 404, 429, 500), payload headers, and SaaS integration failures.',
    tags: ['apis', 'rest', 'http status codes', 'web services', 'troubleshooting'],
    relatedNotes: [
      { title: 'Building Small IT Automations: Start With the Repetitive Step', path: '/notes/small-it-automation-starting-point/' },
      { title: 'Building Safe Browser-Based IT Tools: A Practical Framework', path: '/notes/building-safe-browser-based-it-tools/' }
    ]
  },
  {
    slug: 'apple-device-management-enrollment-models',
    title: 'Apple Device Management: Understanding Enrollment Models',
    eyebrow: 'Notes · Apple / Jamf',
    subject: 'Apple / Jamf',
    task: 'Device Management',
    type: 'Guide',
    audience: 'Apple Workplace Technicians',
    publishedDate: '2026-09-29',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical introduction to Apple device-management enrollment models: User Enrollment, Device Enrollment, and Automated Device Enrollment (ADE).',
    summary: 'Understand device ownership boundaries, BYOD privacy safeguards, supervised management capabilities, and Jamf Pro workflows.',
    tags: ['apple', 'macos', 'jamf', 'mdm', 'ade', 'user enrollment'],
    relatedNotes: [
      { title: 'macOS First-Response Troubleshooting Checklist', path: '/notes/apple-macos-first-response-checklist/' },
      { title: 'Device Provisioning and Handoff Checklist', path: '/notes/device-provisioning-handoff-checklist/' }
    ]
  },
  {
    slug: 'microsoft-sign-in-troubleshooting-guide',
    title: 'Microsoft Sign-In Troubleshooting: A Practical First-Response Guide',
    eyebrow: 'Notes · Microsoft',
    subject: 'Microsoft',
    task: 'Troubleshooting',
    type: 'Guide',
    audience: 'IT Support & Helpdesk Analysts',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A structured way to isolate Microsoft 365 and Windows sign-in failures between account lockouts, MFA configuration, device trust, and tenant service outages.',
    summary: 'Distinguish local authentication issues from cloud identity policies without asking users for credentials or OTP codes.',
    tags: ['microsoft', 'azure ad', 'entra id', 'sign in', 'mfa', 'troubleshooting'],
    relatedNotes: [
      { title: 'Windows First-Response Troubleshooting Checklist', path: '/notes/windows-first-response-troubleshooting-checklist/' },
      { title: 'A Practical Service Desk Troubleshooting Workflow', path: '/notes/it-service-desk-troubleshooting-workflow/' }
    ],
    relatedTools: [
      { title: 'IT Troubleshooting Assistant', path: '/tools/it-troubleshooting-assistant/' }
    ]
  },
  {
    slug: 'it-troubleshooting-guide-knowledge-base',
    title: 'Writing Better IT Troubleshooting Guides: From Incident to Knowledge Base',
    eyebrow: 'Notes · IT & Service Desk',
    subject: 'IT & Service Desk',
    task: 'Knowledge Base',
    type: 'Guide',
    audience: 'Support Engineers & Team Leads',
    publishedDate: '2026-09-29',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'How to transform a one-off resolved incident into a reusable, sanitized knowledge-base article that helps peers and users solve issues faster.',
    summary: 'Turn verified technical actions into concise, searchable documentation with clear prerequisites and validation checks.',
    tags: ['knowledge base', 'kb article', 'documentation', 'runbook'],
    relatedNotes: [
      { title: 'Writing Better Service Desk Ticket Notes', path: '/notes/service-desk-ticket-documentation/' }
    ],
    relatedTools: [
      { title: 'Ticket → Knowledge Base Draft', path: '/tools/ticket-to-knowledge-base-draft/' }
    ]
  },
  {
    slug: 'choosing-ai-tools-privacy-cost-fit',
    title: 'Choosing AI Tools: Privacy, Cost and Practical Fit',
    eyebrow: 'Notes · AI & Productivity',
    subject: 'AI & Productivity',
    task: 'Tool Selection',
    type: 'Guide',
    audience: 'General Knowledge Workers',
    publishedDate: '2026-09-29',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'A simple framework for evaluating an AI tool before putting it into a personal or workplace workflow: task fit, data handling, cost, and human verification.',
    summary: 'Evaluate privacy policies, training opt-outs, subscription ceilings, and accuracy trade-offs before adopting AI tools.',
    tags: ['ai', 'ai tools', 'privacy', 'evaluation', 'data handling'],
    relatedNotes: [
      { title: 'AI for IT Support: A Practical Starting Workflow', path: '/notes/ai-for-it-support-practical-workflow/' },
      { title: 'AI Prompting for Everyday Work: A Simple Starting Pattern', path: '/notes/ai-prompting-everyday-work/' }
    ]
  },
  {
    slug: 'ai-for-it-support-practical-workflow',
    title: 'AI for IT Support: A Practical Starting Workflow',
    eyebrow: 'Notes · AI & Productivity',
    subject: 'AI & Productivity',
    task: 'Workflow',
    type: 'Guide',
    audience: 'IT Support Practitioners',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'A low-risk workflow for using AI to assist troubleshooting, summarize messy notes, and organize knowledge work while keeping human judgment in control.',
    summary: 'Safe prompting strategies, input sanitization boundaries, and verification checklists for support engineers.',
    tags: ['ai support', 'it support', 'prompting', 'workflow', 'sanitization'],
    relatedNotes: [
      { title: 'AI Prompting for Everyday Work: A Simple Starting Pattern', path: '/notes/ai-prompting-everyday-work/' },
      { title: 'A Practical Service Desk Troubleshooting Workflow', path: '/notes/it-service-desk-troubleshooting-workflow/' }
    ],
    relatedTools: [
      { title: 'AI Prompt Builder', path: '/tools/ai-prompt-builder/' }
    ]
  },
  {
    slug: 'ai-prompting-everyday-work',
    title: 'AI Prompting for Everyday Work: A Simple Starting Pattern',
    eyebrow: 'Notes · AI & Productivity',
    subject: 'AI & Productivity',
    task: 'Prompting',
    type: 'Guide',
    audience: 'Knowledge Workers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-09-28',
    readTime: '5 min read',
    lead: 'A reusable structure for asking AI to help with writing, summarizing, researching, and repetitive tasks: Goal, Context, Output, and Constraints.',
    summary: 'Get clearer results and fewer hallucinations with a 4-part prompt template and rapid iteration cycles.',
    tags: ['ai prompting', 'prompt engineering', 'productivity', 'writing'],
    relatedNotes: [
      { title: 'AI for IT Support: A Practical Starting Workflow', path: '/notes/ai-for-it-support-practical-workflow/' }
    ],
    relatedTools: [
      { title: 'AI Prompt Builder', path: '/tools/ai-prompt-builder/' }
    ]
  },
  {
    slug: 'building-safe-browser-based-it-tools',
    title: 'Building Safe Browser-Based IT Tools: A Practical Framework',
    eyebrow: 'Notes · Automation & Web',
    subject: 'Automation',
    task: 'Architecture',
    type: 'Framework',
    audience: 'IT Technicians & Web Builders',
    publishedDate: '2026-09-29',
    updatedDate: '2026-10-12',
    readTime: '7 min read',
    lead: 'A practical framework for turning a small repetitive task into a useful browser utility without making the tool unnecessarily complex, risky, or leaky.',
    summary: 'Architect client-side utilities with local processing, secure storage boundaries, and resilient manual fallbacks.',
    tags: ['browser tools', 'client-side', 'privacy', 'security', 'web development'],
    relatedNotes: [
      { title: 'Interactive Tools & AI-Assisted Experiences: A Practical Architecture', path: '/notes/interactive-tools-ai-assisted-experiences-architecture/' },
      { title: 'Building Small IT Automations: Start With the Repetitive Step', path: '/notes/small-it-automation-starting-point/' }
    ]
  },
  {
    slug: 'interactive-tools-ai-assisted-experiences-architecture',
    title: 'Interactive Tools & AI-Assisted Experiences: A Practical Architecture',
    eyebrow: 'Notes · Architecture',
    subject: 'Automation',
    task: 'Architecture',
    type: 'Framework',
    audience: 'Developers & System Architects',
    publishedDate: '2026-10-02',
    updatedDate: '2026-10-13',
    readTime: '8 min read',
    lead: 'A modular architecture framework that separates interactive user interfaces, deterministic calculation logic, data storage, and optional AI services.',
    summary: 'Keep calculations deterministic, local data strictly client-side, and AI assistance review-first rather than autonomous.',
    tags: ['architecture', 'interactive tools', 'ai experiences', 'data boundaries'],
    relatedNotes: [
      { title: 'Building Safe Browser-Based IT Tools: A Practical Framework', path: '/notes/building-safe-browser-based-it-tools/' }
    ]
  },
  {
    slug: 'networking-layer-by-layer-diagnostic-framework',
    title: 'Networking Troubleshooting: A Layer-by-Layer Diagnostic Framework',
    eyebrow: 'Notes · Networking',
    subject: 'Networking',
    task: 'Diagnostic Framework',
    type: 'Framework',
    audience: 'Network Engineers & Support Technicians',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-12',
    readTime: '7 min read',
    lead: 'A structured OSI and TCP/IP diagnostic sequence from Physical cable to Application service that keeps root cause isolation methodical.',
    summary: 'Isolate link state, IP address assignment, ARP, routing hops, firewall policies, DNS, and TLS certificates step by step.',
    tags: ['networking', 'osi model', 'tcp ip', 'troubleshooting framework'],
    relatedNotes: [
      { title: 'Network Connectivity First-Response Troubleshooting Checklist', path: '/notes/network-connectivity-first-response-checklist/' }
    ]
  },
  {
    slug: 'money-basics-budget-emergency-net-worth',
    title: 'Money Basics: Budgeting, Emergency Funds and Net Worth',
    eyebrow: 'Notes · Personal Finance',
    subject: 'Personal Finance',
    task: 'Planning',
    type: 'Guide',
    audience: 'General Readers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A simple educational framework for tracking monthly cash flow, building 3-to-6-month emergency reserves, and calculating net worth over time.',
    summary: 'Foundational money principles: income vs essentials vs discretionary, liquid safety buffers, and assets minus liabilities balance sheet.',
    tags: ['personal finance', 'budgeting', 'emergency fund', 'net worth'],
    relatedNotes: [
      { title: 'Health Insurance: Understanding the Basics', path: '/notes/health-insurance-understanding-the-basics/' },
      { title: 'Retirement Planning: Start With the Number', path: '/notes/retirement-planning-start-with-the-number/' }
    ],
    relatedTools: [
      { title: 'Personal Finance Snapshot', path: '/tools/personal-finance-snapshot/' },
      { title: 'Finance Planning Workspace', path: '/tools/finance-planning-workspace/' }
    ]
  },
  {
    slug: 'health-insurance-understanding-the-basics',
    title: 'Health Insurance: Understanding the Basics',
    eyebrow: 'Notes · Personal Finance · Insurance',
    subject: 'Personal Finance',
    task: 'Planning',
    type: 'Guide',
    audience: 'General Readers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '8 min read',
    lead: 'A practical educational introduction to health insurance in India: sum insured, waiting periods, exclusions, co-payments, and claims.',
    summary: 'Understand insurance as risk transfer, IRDAI guidelines, cashless vs reimbursement claim mechanics, and grievance redressal through Bima Bharosa.',
    tags: ['health insurance', 'insurance', 'sum insured', 'irdai', 'bima bharosa'],
    relatedNotes: [
      { title: 'Money Basics: Budgeting, Emergency Funds and Net Worth', path: '/notes/money-basics-budget-emergency-net-worth/' }
    ]
  },
  {
    slug: 'indian-income-tax-practical-starting-point',
    title: 'Indian Income Tax: A Practical Starting Point',
    eyebrow: 'Notes · Personal Finance · Tax',
    subject: 'Personal Finance',
    task: 'Tax Planning',
    type: 'Guide',
    audience: 'Salaried Professionals',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'An educational starting point for understanding Indian individual income tax for AY 2026-27, taxable income calculation, and common exemptions.',
    summary: 'Overview of income heads, standard deduction, rebate under Section 87A, and tax return filing fundamentals.',
    tags: ['income tax', 'india tax', 'tax slabs', 'ay 2026 27'],
    relatedNotes: [
      { title: 'New vs Old Tax Regime: How to Think About the Comparison', path: '/notes/new-vs-old-tax-regime-comparison/' }
    ]
  },
  {
    slug: 'new-vs-old-tax-regime-comparison',
    title: 'New vs Old Tax Regime: How to Think About the Comparison',
    eyebrow: 'Notes · Personal Finance · Tax',
    subject: 'Personal Finance',
    task: 'Tax Comparison',
    type: 'Guide',
    audience: 'Indian Taxpayers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical educational framework for comparing India’s two individual tax regimes for AY 2026-27: lower slab rates vs Chapter VI-A deductions.',
    summary: 'How to calculate your breakeven deduction threshold to choose between the simplified new regime and deduction-heavy old regime.',
    tags: ['new tax regime', 'old tax regime', 'tax comparison', 'deductions'],
    relatedNotes: [
      { title: 'Indian Income Tax: A Practical Starting Point', path: '/notes/indian-income-tax-practical-starting-point/' }
    ]
  },
  {
    slug: 'us-stocks-etfs-starting-point',
    title: 'US Stocks and ETFs: A Practical Starting Point',
    eyebrow: 'Notes · Investing',
    subject: 'Personal Finance',
    task: 'Investing Fundamentals',
    type: 'Guide',
    audience: 'General Investors',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'A practical starting framework for understanding individual stocks, ETFs, index diversification, and portfolio overlap risks.',
    summary: 'Understand total expense ratios, sector concentration, currency considerations, and why holding multiple ETFs can duplicate underlying mega-caps.',
    tags: ['investing', 'us stocks', 'etfs', 'diversification', 'index funds'],
    relatedNotes: [
      { title: 'Indian Mutual Funds, Index Funds and ETFs: A Practical Starting Point', path: '/notes/indian-mutual-funds-index-etfs-starting-point/' },
      { title: 'Portfolio Allocation and Rebalancing: A Practical Framework', path: '/notes/portfolio-allocation-rebalancing-framework/' }
    ]
  },
  {
    slug: 'indian-mutual-funds-index-etfs-starting-point',
    title: 'Indian Mutual Funds, Index Funds and ETFs: A Practical Starting Point',
    eyebrow: 'Notes · Investing',
    subject: 'Personal Finance',
    task: 'Investing Fundamentals',
    type: 'Guide',
    audience: 'General Investors',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'An educational introduction to common Indian pooled investment structures: mutual funds, passive index funds, and ETFs.',
    summary: 'Understand TER, tracking error, NAV pricing, direct vs regular plans, and disciplined SIP mechanics.',
    tags: ['mutual funds', 'index funds', 'etfs', 'india investing', 'sip'],
    relatedNotes: [
      { title: 'Portfolio Allocation and Rebalancing: A Practical Framework', path: '/notes/portfolio-allocation-rebalancing-framework/' }
    ],
    relatedTools: [
      { title: 'Compound Growth & SIP Calculator', path: '/tools/compound-growth-sip-calculator/' }
    ]
  },
  {
    slug: 'portfolio-allocation-rebalancing-framework',
    title: 'Portfolio Allocation and Rebalancing: A Practical Framework',
    eyebrow: 'Notes · Portfolio Management',
    subject: 'Personal Finance',
    task: 'Portfolio Management',
    type: 'Framework',
    audience: 'Disciplined Investors',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'A repeatable way to think about asset allocation, monitoring percentage-point drift, and rebalancing without emotional timing.',
    summary: 'Calendar-based vs tolerance-band rebalancing policies, tax impact, and directing new contributions to underweighted asset classes.',
    tags: ['portfolio allocation', 'rebalancing', 'asset allocation', 'drift'],
    relatedNotes: [
      { title: 'Retirement Planning: Start With the Number', path: '/notes/retirement-planning-start-with-the-number/' }
    ],
    relatedTools: [
      { title: 'Finance Planning Workspace', path: '/tools/finance-planning-workspace/' }
    ]
  },
  {
    slug: 'retirement-planning-start-with-the-number',
    title: 'Retirement Planning: Start With the Number',
    eyebrow: 'Notes · Personal Finance · Retirement',
    subject: 'Personal Finance',
    task: 'Retirement Planning',
    type: 'Guide',
    audience: 'Individuals Planning Retirement',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'A practical framework for starting retirement planning with lifestyle spending, time horizon, inflation adjustments, and a target corpus.',
    summary: 'How to calculate annual living expenses, inflate them to retirement age, and determine the corpus required to sustain decumulation.',
    tags: ['retirement', 'corpus', 'financial independence', 'target number'],
    relatedNotes: [
      { title: 'Retirement Corpus: A Simple Calculation Framework', path: '/notes/retirement-corpus-calculation-framework/' },
      { title: 'Retirement Withdrawals: Sequence Risk, Income and Annual Reviews', path: '/notes/retirement-withdrawals-sequence-risk-income-review/' }
    ],
    relatedTools: [
      { title: 'Retirement Planning Calculator', path: '/tools/retirement-planning-calculator/' }
    ]
  },
  {
    slug: 'retirement-corpus-calculation-framework',
    title: 'Retirement Corpus: A Simple Calculation Framework',
    eyebrow: 'Notes · Personal Finance · Retirement',
    subject: 'Personal Finance',
    task: 'Calculation Framework',
    type: 'Framework',
    audience: 'Retirement Planners',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '8 min read',
    lead: 'A transparent framework for estimating a retirement corpus using future spending, inflation, real returns, and annuity formulas.',
    summary: 'Understand the mathematical present-value annuity formula, real rate of return assumptions, and sensitivity stress testing.',
    tags: ['retirement corpus', 'annuity formula', 'real return', 'inflation math'],
    relatedNotes: [
      { title: 'Retirement Planning: Start With the Number', path: '/notes/retirement-planning-start-with-the-number/' },
      { title: 'Inflation and Future Goal Planning', path: '/notes/inflation-and-future-goal-planning/' }
    ],
    relatedTools: [
      { title: 'Retirement Planning Calculator', path: '/tools/retirement-planning-calculator/' },
      { title: 'Finance Planning Workspace', path: '/tools/finance-planning-workspace/' }
    ]
  },
  {
    slug: 'retirement-withdrawals-sequence-risk-income-review',
    title: 'Retirement Withdrawals: Sequence Risk, Income and Annual Reviews',
    eyebrow: 'Notes · Personal Finance · Retirement',
    subject: 'Personal Finance',
    task: 'Decumulation & Risk',
    type: 'Guide',
    audience: 'Near-Retirees & Retirees',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '7 min read',
    lead: 'A practical guide to decumulation, managing sequence-of-returns risk in the fragile early retirement window, and establishing annual withdrawal reviews.',
    summary: 'How early bear markets deplete a drawing portfolio faster, combining pension/NPS floor income with liquid reserves, and dynamic withdrawal rules.',
    tags: ['retirement withdrawals', 'sequence of returns risk', 'decumulation', 'retirement income'],
    relatedNotes: [
      { title: 'Retirement Corpus: A Simple Calculation Framework', path: '/notes/retirement-corpus-calculation-framework/' }
    ],
    relatedTools: [
      { title: 'Retirement Planning Calculator', path: '/tools/retirement-planning-calculator/' }
    ]
  },
  {
    slug: 'inflation-and-future-goal-planning',
    title: 'Inflation and Future Goal Planning',
    eyebrow: 'Notes · Personal Finance',
    subject: 'Personal Finance',
    task: 'Goal Planning',
    type: 'Guide',
    audience: 'General Readers',
    publishedDate: '2026-09-28',
    updatedDate: '2026-10-13',
    readTime: '6 min read',
    lead: 'An educational framework for projecting future goal costs with explicit inflation assumptions across 5, 10, and 20-year horizons.',
    summary: 'Why today\'s price is not tomorrow\'s price, category-specific inflation (education, healthcare vs CPI), and compounding formulas.',
    tags: ['inflation', 'future value', 'financial goals', 'purchasing power'],
    relatedNotes: [
      { title: 'Money Basics: Budgeting, Emergency Funds and Net Worth', path: '/notes/money-basics-budget-emergency-net-worth/' },
      { title: 'Retirement Planning: Start With the Number', path: '/notes/retirement-planning-start-with-the-number/' }
    ],
    relatedTools: [
      { title: 'Inflation & Goal Planning Calculator', path: '/tools/inflation-goal-planning-calculator/' },
      { title: 'Compound Growth & SIP Calculator', path: '/tools/compound-growth-sip-calculator/' }
    ]
  }
];
