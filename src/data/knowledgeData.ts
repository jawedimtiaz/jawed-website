export interface KnowledgeEntry {
  url: string;
  title: string;
  summary: string;
  keywords: string[];
}

export const knowledgeEntries: KnowledgeEntry[] = [
  {
    url: "/",
    title: "Home",
    summary: "Professional homepage for Jawed Imtiaz, an IT Field Tech focused on IT support, Service Desk operations, workplace technology, Apple and macOS, device management, practical problem-solving and browser-based tools. The homepage connects visitors to public-safe work examples, career experience, current learning, professional recognition, technical notes, tools and Jawed AI.",
    keywords: ["site", "home", "it support", "it field tech", "service desk", "workplace technology", "apple", "macos", "device management", "tools", "work examples", "technical notes"]
  },
  {
    url: "/about/",
    title: "About Jawed Imtiaz",
    summary: "Jawed Imtiaz is an IT professional and IT Field Tech with experience across technical support, system administration, IT operations, Service Desk operations, and workplace technology. He holds a Bachelor of Science from the University of Calcutta and is currently learning Jamf and ITIL.",
    keywords: ["about", "jawed", "jawed imtiaz", "profile", "person", "it professional", "education", "bachelor of science", "calcutta university", "it field tech", "technical support", "service desk", "workplace technology", "jamf", "itil"]
  },
  {
    url: "/work/",
    title: "Work Overview",
    summary: "Overview of Jawed's professional work area, including experience, technical skills, certifications, and selected projects.",
    keywords: ["work", "career", "experience", "skills", "certifications", "projects"]
  },
  {
    url: "/work/experience/",
    title: "Work Experience",
    summary: "Jawed's professional experience across IT Field Tech support for Milestone Technologies (supporting the Uber environment) and earlier technical support management, system administration, and technical support roles at Currents Technology, ICore, Khadims, and Altos. Covers Service Desk operations, user and device troubleshooting, Apple/macOS support, device provisioning, and ticketing tools.",
    keywords: ["work experience", "experience", "it field tech", "milestone technologies", "uber", "currents technology", "icore", "khadims", "altos", "technical support", "system administration", "service desk", "user support", "device support", "macos", "device provisioning", "servicenow", "jira", "slack"]
  },
  {
    url: "/work/skills/",
    title: "Skills",
    summary: "Jawed's skills span IT support and Service Desk work, workplace technology, Apple and macOS support, device management (Jamf, Apple Business Manager), IT operations, networking (TCP/IP, DNS, VPN, Meraki), cloud identity (Okta, OneLogin, Google Workspace, Azure AD / Microsoft Entra), and automation scripting (PowerShell, JavaScript).",
    keywords: ["skills", "it support", "it support skills", "skills jawed has", "service desk", "troubleshooting", "user support", "remote support", "apple", "macos", "apple business manager", "jamf", "device provisioning", "device management", "servicenow", "jira", "google workspace", "okta", "microsoft 365", "azure", "vpn", "powershell", "javascript", "automation", "networking"]
  },
  {
    url: "/work/certifications/",
    title: "Certifications",
    summary: "Jawed's education and credentials: B.Sc. from University of Calcutta, current Jamf 100 Course and ITIL 4 learning, Azure Fundamentals (AZ-900), Apple Certified Support Professional, and historical MCSE.",
    keywords: ["certifications", "education", "azure fundamentals", "az-900", "apple certified support professional", "mcse", "jamf 100", "jamf", "itil", "university of calcutta", "what is jawed learning", "current learning", "learning"]
  },
  {
    url: "/work/projects/",
    title: "Projects",
    summary: "Selected public work evidence and projects: the Jawed.co.in web rebuild, first-response troubleshooting frameworks, device provisioning & handoff workflows, and ticket-to-knowledge-base drafting.",
    keywords: ["projects", "jawed.co.in", "website rebuild", "troubleshooting", "device provisioning", "handoff", "documentation", "ticket history", "it support"]
  },
  {
    url: "/tools/",
    title: "Tools Directory",
    summary: "Index of browser-based practical utilities for IT support, AI prompting, career match, resume reviews, and finance planning.",
    keywords: ["tools", "utilities", "calculators", "browser tools"]
  },
  {
    url: "/tools/service-desk-note-formatter/",
    title: "Service Desk Note Formatter",
    summary: "A browser-only Service Desk note formatter that structures an issue/request, actions taken, resolution/status and follow-up for clean ticket logging without exposing secrets.",
    keywords: ["service desk note formatter", "note formatter", "ticket note", "documentation", "it support tool"]
  },
  {
    url: "/tools/it-troubleshooting-assistant/",
    title: "IT Troubleshooting Assistant",
    summary: "A browser-only deterministic IT troubleshooting assistant that asks targeted questions and builds a reviewable first-response checklist across general IT, macOS, Windows, Microsoft sign-in, and networking.",
    keywords: ["it troubleshooting assistant", "decision tree", "first response", "guided troubleshooting", "macos", "windows", "microsoft 365", "network", "connectivity"]
  },
  {
    url: "/tools/ticket-to-knowledge-base-draft/",
    title: "Ticket to Knowledge Base Draft",
    summary: "Turn verified support evidence into a reusable, sanitized knowledge-base article draft covering problem, scope, checks, resolution, validation, escalation, and maintenance triggers.",
    keywords: ["ticket to kb", "knowledge base draft", "documentation", "knowledge base", "runbook"]
  },
  {
    url: "/tools/ai-prompt-builder/",
    title: "AI Prompt Builder",
    summary: "A browser-only AI Prompt Builder that structures a prompt around Goal, Context, Desired Output, Constraints, and Examples to get clearer results from AI.",
    keywords: ["ai prompt builder", "prompt engineering", "goal", "context", "constraints", "output"]
  },
  {
    url: "/tools/career-match-resume-review/",
    title: "Career Match & Resume Review",
    summary: "A browser-based career match and resume review tool that compares resume and job-description text locally to identify skills overlap, missing keywords, and track applications with local storage.",
    keywords: ["career match", "resume review", "job description", "resume", "skills gap", "application tracker", "career", "career tools", "which tools can help my career"]
  },
  {
    url: "/tools/resume-bullet-strength-checker/",
    title: "Resume Bullet Strength Checker",
    summary: "A browser-based resume-writing tool that checks experience bullets for action verbs, measurable evidence, length, and filler phrasing.",
    keywords: ["resume bullet strength checker", "resume bullets", "action verbs", "evidence", "metrics", "ats", "career", "career tools"]
  },
  {
    url: "/tools/interview-preparation-planner/",
    title: "Interview Preparation Planner",
    summary: "A browser-only interview preparation planner that extracts skill signals from a job description, compares against your resume, and creates customized practice interview questions.",
    keywords: ["interview preparation planner", "interview planner", "job description", "practice questions", "star method", "career", "career tools", "interview prep"]
  },
  {
    url: "/tools/compound-growth-sip-calculator/",
    title: "Compound Growth & SIP Calculator",
    summary: "Interactive calculator for exploring hypothetical future values from starting capital and recurring monthly contributions with visible mathematical methodology.",
    keywords: ["compound growth sip calculator", "sip calculator", "compound interest", "monthly investment"]
  },
  {
    url: "/tools/inflation-goal-planning-calculator/",
    title: "Inflation & Goal Planning Calculator",
    summary: "Interactive calculator for estimating future financial goal costs adjusted for annual inflation and tracking current savings gaps.",
    keywords: ["inflation goal planning calculator", "inflation calculator", "future value", "financial goals"]
  },
  {
    url: "/tools/personal-finance-snapshot/",
    title: "Personal Finance Snapshot",
    summary: "Browser-based personal finance snapshot combining monthly cash flow, emergency reserve runway in months, and net worth balance sheet.",
    keywords: ["personal finance snapshot", "budget", "emergency reserve", "net worth", "cash flow"]
  },
  {
    url: "/tools/retirement-planning-calculator/",
    title: "Retirement Planning Calculator",
    summary: "Calculator for exploring required retirement corpus and projected wealth based on inflation, pre-retirement return, post-retirement real return, and lifespan horizon.",
    keywords: ["retirement planning calculator", "retirement calculator", "corpus calculation", "real return", "inflation"]
  },
  {
    url: "/tools/finance-planning-workspace/",
    title: "Finance Planning Workspace",
    summary: "Unified browser workspace integrating Cash Flow Snapshot, Goals & Compound Growth, Retirement Corpus Planning, and Planning Review.",
    keywords: ["finance planning workspace", "financial workspace", "budget", "retirement", "goals"]
  },
  {
    url: "/notes/",
    title: "IT Support & Technology Notes",
    summary: "Index of 25+ practical troubleshooting guides, checklists, and learning notes covering IT support, Apple/Jamf, Microsoft, networking, AI, and personal finance.",
    keywords: ["notes", "guides", "troubleshooting", "checklists", "learning"]
  },
  {
    url: "/notes/it-service-desk-troubleshooting-workflow/",
    title: "IT Service Desk Troubleshooting Workflow",
    summary: "A repeatable Service Desk first-response workflow covering problem definition, evidence collection, user/device/application/service scoping, one-change-at-a-time testing, validation, and escalation.",
    keywords: ["it service desk troubleshooting workflow", "first response", "troubleshooting workflow", "evidence", "scoping", "root cause", "troubleshooting approach", "how does jawed approach troubleshooting", "methodology"]
  },
  {
    url: "/notes/apple-macos-first-response-checklist/",
    title: "macOS First-Response Troubleshooting Checklist",
    summary: "A practical first-response checklist for common macOS support cases: symptom isolation, device state, network, application launch, and safe escalation.",
    keywords: ["macos first response troubleshooting checklist", "macos", "mac troubleshooting", "apple support"]
  },
  {
    url: "/notes/device-provisioning-handoff-checklist/",
    title: "Device Provisioning and Handoff Checklist",
    summary: "Checklist for preparing, validating, and handing over an IT device while maintaining clear asset records and user support guidance.",
    keywords: ["device provisioning and handoff checklist", "device provisioning", "asset management", "handoff"]
  },
  {
    url: "/notes/service-desk-ticket-documentation/",
    title: "Writing Better Service Desk Ticket Notes",
    summary: "A practical approach to documenting symptoms, evidence, checks performed, validation, and actionable escalation context.",
    keywords: ["service desk ticket documentation", "ticket notes", "documentation", "incident notes"]
  },
  {
    url: "/notes/scoping-it-issues-user-device-service/",
    title: "User, Device or Service? A Simple Way to Scope IT Issues",
    summary: "Framework for establishing whether a technical issue follows an individual user, a specific physical device, or a shared backend service.",
    keywords: ["scoping it issues", "user device service", "problem isolation", "scope"]
  },
  {
    url: "/notes/small-it-automation-starting-point/",
    title: "Building Small IT Automations: Start With the Repetitive Step",
    summary: "A practical starting point for low-risk IT automations using PowerShell, Bash, or JavaScript with visible validation and recovery.",
    keywords: ["small it automation", "automation", "powershell", "scripting", "workflow"]
  },
  {
    url: "/notes/it-support-escalation-handoff-checklist/",
    title: "IT Support Escalation: A Practical Handoff Checklist",
    summary: "Checklist for escalating IT issues to senior engineers, tier 2/3, or specialized teams with complete context and no repeated troubleshooting.",
    keywords: ["it support escalation handoff checklist", "escalation", "handoff", "tier 2", "tier 3"]
  },
  {
    url: "/notes/windows-first-response-troubleshooting-checklist/",
    title: "Windows First-Response Troubleshooting Checklist",
    summary: "A practical first-response checklist for Windows support: application crashes, sign-in failures, network connectivity, and update issues.",
    keywords: ["windows first response troubleshooting checklist", "windows troubleshooting", "windows 11", "windows 10"]
  },
  {
    url: "/notes/network-connectivity-first-response-checklist/",
    title: "Network Connectivity First-Response Troubleshooting Checklist",
    summary: "Checklist for diagnosing network issues: physical layer, IP assignment, gateway ping, DNS resolution, and target service reachability.",
    keywords: ["network connectivity first response checklist", "network troubleshooting", "dns", "ping", "gateway"]
  },
  {
    url: "/notes/apis-explained-for-it-support/",
    title: "APIs Explained for IT Support: A Practical Starting Point",
    summary: "A practical introduction to APIs for IT support: request methods, status codes (200, 401, 403, 404, 429, 500), and how to triage SaaS integrations.",
    keywords: ["apis explained for it support", "apis", "rest api", "status codes", "http"]
  },
  {
    url: "/notes/apple-device-management-enrollment-models/",
    title: "Apple Device Management: Understanding Enrollment Models",
    summary: "Practical guide to Apple enrollment models: User Enrollment, Device Enrollment, and Automated Device Enrollment (ADE) with Jamf Pro.",
    keywords: ["apple device management enrollment models", "jamf", "automated device enrollment", "ade", "user enrollment", "mdm"]
  },
  {
    url: "/notes/microsoft-sign-in-troubleshooting-guide/",
    title: "Microsoft Sign-In Troubleshooting: A Practical First-Response Guide",
    summary: "Structured investigation of Microsoft 365, Azure AD / Entra ID, and Windows sign-in failures.",
    keywords: ["microsoft sign in troubleshooting guide", "microsoft 365", "azure ad", "entra id", "mfa"]
  },
  {
    url: "/notes/it-troubleshooting-guide-knowledge-base/",
    title: "Writing Better IT Troubleshooting Guides: From Incident to Knowledge Base",
    summary: "How to turn a solved support case into a sanitized, repeatable, easy-to-read knowledge-base article.",
    keywords: ["it troubleshooting guide knowledge base", "knowledge base article", "runbook", "kb article"]
  },
  {
    url: "/notes/choosing-ai-tools-privacy-cost-fit/",
    title: "Choosing AI Tools: Privacy, Cost and Practical Fit",
    summary: "A practical evaluation framework for AI tools covering task fit, privacy boundaries, data retention, cost, and human verification.",
    keywords: ["choosing ai tools privacy cost fit", "ai evaluation", "privacy", "cost", "data handling"]
  },
  {
    url: "/notes/ai-for-it-support-practical-workflow/",
    title: "AI for IT Support: A Practical Starting Workflow",
    summary: "A safe workflow for using AI to assist IT support tasks (scoping questions, drafting notes, explaining errors) while keeping human judgment in control.",
    keywords: ["ai for it support practical workflow", "ai support", "ticket drafting", "prompting"]
  },
  {
    url: "/notes/ai-prompting-everyday-work/",
    title: "AI Prompting for Everyday Work: A Simple Starting Pattern",
    summary: "A reusable prompt structure based on Goal, Context, Output, and Constraints for everyday knowledge work.",
    keywords: ["ai prompting everyday work", "prompting guide", "prompt pattern"]
  },
  {
    url: "/notes/building-safe-browser-based-it-tools/",
    title: "Building Safe Browser-Based IT Tools: A Practical Framework",
    summary: "Design principles for lightweight browser utilities: input validation, local processing, local storage boundaries, and explicit permissions.",
    keywords: ["building safe browser based it tools", "browser tools", "client-side tools", "privacy"]
  },
  {
    url: "/notes/interactive-tools-ai-assisted-experiences-architecture/",
    title: "Interactive Tools & AI-Assisted Experiences: A Practical Architecture",
    summary: "Architecture framework for browser tools that separates UI, deterministic calculation logic, data boundaries, and optional AI assistance.",
    keywords: ["interactive tools ai assisted experiences architecture", "architecture", "browser apps", "review first"]
  },
  {
    url: "/notes/networking-layer-by-layer-diagnostic-framework/",
    title: "Networking Troubleshooting: A Layer-by-Layer Diagnostic Framework",
    summary: "Systematic OSI and TCP/IP layer-by-layer troubleshooting framework from physical link to application layer.",
    keywords: ["networking layer by layer diagnostic framework", "osi model", "tcp ip", "troubleshooting"]
  },
  {
    url: "/notes/money-basics-budget-emergency-net-worth/",
    title: "Money Basics: Budgeting, Emergency Funds and Net Worth",
    summary: "A personal-finance foundation guide covering monthly cash flow, 3-to-6-month emergency reserve targets, and net worth balance sheets.",
    keywords: ["money basics budget emergency net worth", "budgeting", "emergency fund", "net worth"]
  },
  {
    url: "/notes/health-insurance-understanding-the-basics/",
    title: "Health Insurance: Understanding the Basics",
    summary: "Practical educational guide to health insurance terms: sum insured, waiting periods, pre-existing diseases, exclusions, co-pay, and claims.",
    keywords: ["health insurance basics", "health insurance", "sum insured", "waiting period", "co pay", "claim"]
  },
  {
    url: "/notes/indian-income-tax-practical-starting-point/",
    title: "Indian Income Tax: A Practical Starting Point",
    summary: "Educational guide to individual income tax in India for AY 2026-27, tax slabs, deductions, and basic compliance concepts.",
    keywords: ["indian income tax practical starting point", "income tax", "tax slabs", "india tax"]
  },
  {
    url: "/notes/new-vs-old-tax-regime-comparison/",
    title: "New vs Old Tax Regime: How to Think About the Comparison",
    summary: "A practical framework for comparing India's new and old tax regimes for salaried individuals.",
    keywords: ["new vs old tax regime comparison", "new tax regime", "old tax regime", "deductions"]
  },
  {
    url: "/notes/us-stocks-etfs-starting-point/",
    title: "US Stocks and ETFs: A Practical Starting Point",
    summary: "Educational overview of investing in US equities and index ETFs, portfolio diversification, and overlap risks.",
    keywords: ["us stocks etfs starting point", "us stocks", "etfs", "diversification", "index funds"]
  },
  {
    url: "/notes/indian-mutual-funds-index-etfs-starting-point/",
    title: "Indian Mutual Funds, Index Funds and ETFs: A Practical Starting Point",
    summary: "Educational introduction to mutual funds, index funds, and ETFs in India, TER costs, and asset allocation.",
    keywords: ["indian mutual funds index etfs starting point", "mutual funds", "index funds", "etfs"]
  },
  {
    url: "/notes/portfolio-allocation-rebalancing-framework/",
    title: "Portfolio Allocation and Rebalancing: A Practical Framework",
    summary: "Repeatable framework for setting target asset allocation, monitoring drift, and rebalancing disciplined portfolios.",
    keywords: ["portfolio allocation rebalancing framework", "asset allocation", "rebalancing", "portfolio drift"]
  },
  {
    url: "/notes/retirement-planning-start-with-the-number/",
    title: "Retirement Planning: Start With the Number",
    summary: "Framework for retirement planning starting with living expenses, years to retirement, inflation adjustment, and target corpus.",
    keywords: ["retirement planning start with the number", "retirement planning", "target corpus", "fire"]
  },
  {
    url: "/notes/retirement-corpus-calculation-framework/",
    title: "Retirement Corpus: A Simple Calculation Framework",
    summary: "Educational calculation framework for estimating a retirement corpus using future spending, real returns, and annuity formulas.",
    keywords: ["retirement corpus calculation framework", "corpus calculation", "real return", "retirement formula"]
  },
  {
    url: "/notes/retirement-withdrawals-sequence-risk-income-review/",
    title: "Retirement Withdrawals: Sequence Risk, Income and Annual Reviews",
    summary: "Guide to decumulation, managing sequence-of-returns risk in early retirement, and annual withdrawal reviews.",
    keywords: ["retirement withdrawals sequence risk income review", "sequence of returns risk", "withdrawals", "decumulation"]
  },
  {
    url: "/notes/inflation-and-future-goal-planning/",
    title: "Inflation and Future Goal Planning",
    summary: "How inflation erodes purchasing power over 5, 10, and 20-year horizons and how to adjust financial goal amounts.",
    keywords: ["inflation and future goal planning", "inflation", "goal planning", "purchasing power"]
  },
  {
    url: "/blog/",
    title: "Blog",
    summary: "Longer-form writing, technical walkthroughs, and case studies by Jawed Imtiaz.",
    keywords: ["blog", "articles", "case study", "writing"]
  },
  {
    url: "/blog/triage-workplace-app-access-issue/",
    title: "How to Triage a Workplace App Access Issue",
    summary: "An illustrative IT support walkthrough for scoping application access problems, testing assumptions safely, validating fixes, and preparing actionable handoffs.",
    keywords: ["triage workplace app access issue", "app access", "troubleshooting walkthrough", "escalation", "case study"]
  },
  {
    url: "/blog/rebuilding-jawed-co-in/",
    title: "Rebuilding Jawed.co.in",
    summary: "The story, audit decisions, and engineering methodology behind rebuilding Jawed.co.in into a fast, accessible, mobile-first technology hub.",
    keywords: ["rebuilding jawed co in", "website rebuild", "case study", "portfolio rebuild"]
  },
  {
    url: "/topics/",
    title: "Topics",
    summary: "Browse Jawed.co.in knowledge grouped by topic: IT Support, Apple & Jamf, Microsoft, Networking, AI & Productivity, Personal Finance, and Web Automation.",
    keywords: ["topics", "subjects", "categories", "knowledge index"]
  },
  {
    url: "/resources/",
    title: "Resources",
    summary: "Curated collection of official documentation, primary technical manuals, and learning resources across Apple, Microsoft, Jamf, Web APIs, and personal finance regulations.",
    keywords: ["resources", "official documentation", "apple documentation", "microsoft learn", "jamf pro", "manuals"]
  },
  {
    url: "/contact/",
    title: "Contact Jawed Imtiaz",
    summary: "Contact Jawed Imtiaz for IT support opportunities, website feedback, technology questions, or LinkedIn connections.",
    keywords: ["contact", "email", "get in touch", "linkedin", "how can i contact jawed", "reach jawed"]
  },
  {
    url: "/privacy/",
    title: "Privacy Policy",
    summary: "Privacy policy explaining local browser processing of tools, Jawed AI queries and context, site analytics, and strict data boundaries.",
    keywords: ["privacy", "privacy policy", "data handling", "cookie policy"]
  }
];
