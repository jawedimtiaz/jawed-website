import React from 'react';
import { useLocation } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { TOOLS } from '../data/toolsData';
import blogData from '../data/blogData.json';

const SITE_ORIGIN = 'https://jawed.co.in';

export interface RouteMetadata {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription?: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  robots?: string;
}

export const STATIC_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools',
    description: 'Practical IT field guides, IPv4 subnet calculators, server rack power calculators, and interactive IT service desk diagnostic utilities by Jawed Imtiaz.',
    keywords: 'Jawed Imtiaz, IT field tech, IT troubleshooting guides, IPv4 subnet calculator, server rack power calculator, ITSM diagnostic tools, enterprise IT support',
    ogTitle: 'Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools',
    ogDescription: 'Explore browser-based IT infrastructure calculators, career utilities, AI workspaces, and practical troubleshooting guides by Jawed Imtiaz.',
    canonicalPath: '/',
    ogType: 'website',
  },
  '/about': {
    title: 'About Jawed Imtiaz – IT Infrastructure, Endpoint Support & Systems Engineering',
    description: "Learn about Jawed Imtiaz's IT support experience, enterprise workplace technology background, industry certifications, and practical tool engineering.",
    keywords: 'About Jawed Imtiaz, IT infrastructure engineer, endpoint support specialist, workplace technology, systems administration, IT service desk profile',
    ogTitle: 'About Jawed Imtiaz | Enterprise IT Support, Systems & Workplace Engineering',
    ogDescription: "Discover Jawed Imtiaz's background in enterprise IT support, systems administration, workplace technology, and practical tool development.",
    canonicalPath: '/about',
    ogType: 'website',
  },
  '/work': {
    title: 'IT Support Experience, Infrastructure Projects & Technical Skills',
    description: "Explore Jawed Imtiaz's enterprise IT support experience, technical skills matrix, industry certifications, and workplace technology projects.",
    keywords: 'IT support portfolio, enterprise IT experience, infrastructure projects, service desk operations, technical skills matrix, Jawed Imtiaz work',
    ogTitle: 'IT Support Portfolio & Operational Experience | Jawed Imtiaz',
    ogDescription: "Review Jawed Imtiaz's hands-on experience in IT service desk operations, endpoint management, infrastructure troubleshooting, and technical projects.",
    canonicalPath: '/work',
    ogType: 'website',
  },
  '/work/projects': {
    title: 'IT Infrastructure Projects & Browser-Based Diagnostic Utilities',
    description: 'A portfolio of practical IT engineering projects and browser-based diagnostic tools with public-safe architecture and measurable operational outcomes.',
    keywords: 'IT engineering projects, browser diagnostic tools, network engineering portfolio, ITSM workflow automation, client-side IT calculators',
    ogTitle: 'IT Engineering Projects & Practical Browser Tools | Jawed Imtiaz',
    ogDescription: 'Browse interactive browser-based utilities and IT infrastructure projects engineered for real-world service desk and field workflows.',
    canonicalPath: '/work/projects',
    ogType: 'website',
  },
  '/work/experience': {
    title: 'IT Service Desk, Endpoint Engineering & Systems Support Experience',
    description: 'Professional career timeline across L1–L3 IT support, ITSM service desk operations, system administration, and enterprise workplace technology.',
    keywords: 'IT service desk experience, L2 L3 IT support timeline, endpoint engineering career, system administration highlights, workplace technology operations',
    ogTitle: 'Professional IT Support & Infrastructure Career Timeline | Jawed Imtiaz',
    ogDescription: 'Detailed career timeline and operational highlights across IT service desk, endpoint engineering, and workplace systems.',
    canonicalPath: '/work/experience',
    ogType: 'website',
  },
  '/work/certifications': {
    title: 'IT Certifications, Technical Credentials & Professional Training',
    description: 'Verified IT support certifications, networking and endpoint management credentials, and continuous professional training in workplace technology.',
    keywords: 'IT support certifications, technical credentials, networking training, Apple MDM certification, Microsoft 365 administration training, Jawed Imtiaz education',
    ogTitle: 'IT Support Certifications & Technical Education | Jawed Imtiaz',
    ogDescription: 'Verified industry certifications, technical training, and continuous learning credentials in IT infrastructure and support.',
    canonicalPath: '/work/certifications',
    ogType: 'website',
  },
  '/work/skills': {
    title: 'Enterprise IT Support Skills – Networking, macOS, Windows & ITSM',
    description: 'Core technical and operational skills across enterprise networking, Apple macOS/iOS MDM, Windows administration, hardware diagnostics, and ITSM.',
    keywords: 'enterprise IT skills, macOS MDM administration, Windows endpoint troubleshooting, TCP/IP networking skills, ITSM incident management, hardware diagnostics',
    ogTitle: 'Technical Skills Matrix: Networking, Apple MDM, Windows & Automation',
    ogDescription: 'Core technical competencies spanning networking, Windows & macOS administration, ITSM workflows, and hardware diagnostics.',
    canonicalPath: '/work/skills',
    ogType: 'website',
  },
  '/notes': {
    title: 'Technical Reference Notes – IT Operations, AI Workflows & Personal Finance',
    description: 'Structured technical reference notes and operational checklists covering enterprise IT support, incident escalation, AI prompting, and personal finance.',
    keywords: 'IT reference notes, L1 L2 escalation checklists, Active Directory sign-in troubleshooting, AI workflow notes, personal finance notes India',
    ogTitle: 'Technical Reference Notes & Operational Checklists | Jawed Imtiaz',
    ogDescription: 'Concise reference notes on L1/L2 troubleshooting, Active Directory & Microsoft 365 sign-in triage, AI tooling, and long-term financial planning.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/field-guides': {
    title: 'On-Site IT Field Guides – Rack Cabling, Switching, Server LEDs & Apple MDM',
    description: 'Hands-on IT field engineering guides covering server rack cable management, T568A/T568B RJ45 wiring, port flapping CLI diagnostics, and Apple enterprise triage.',
    keywords: 'IT field guides, server rack cable management, T568A vs T568B RJ45 pinout, switch port flapping CLI, Dell PowerEdge HPE ProLiant amber LED, macOS MDM field guide',
    ogTitle: 'IT Field Engineering Guides & Data Center Playbooks | Jawed Imtiaz',
    ogDescription: 'Field-tested SOPs for server rack cabling, Dell/HPE amber fault LEDs, switch port flapping diagnostics, and macOS/iOS MDM troubleshooting.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/guides': {
    title: 'IT Troubleshooting Guides, Runbooks & Technical Knowledge Base',
    description: 'Browse practical IT troubleshooting guides, network diagnostic workflows, macOS and Windows runbooks, and personal finance reference notes by Jawed Imtiaz.',
    keywords: 'IT troubleshooting guides, service desk runbooks, technical knowledge base, network diagnostic playbooks, macOS Windows troubleshooting, Jawed Imtiaz guides',
    ogTitle: 'IT Troubleshooting Guides & Technical Knowledge Base | Jawed Imtiaz',
    ogDescription: 'Search step-by-step IT service desk runbooks, networking playbooks, Apple MDM guides, and practical reference notes.',
    canonicalPath: '/guides',
    ogType: 'website',
  },
  '/tools': {
    title: 'Interactive IT, Network, Career & Personal Finance Calculators',
    description: 'Run free browser-based IT infrastructure calculators, IPv4 subnet and RAID planners, ITSM note formatters, resume builders, and local-first finance tools.',
    keywords: 'IT tools and calculators, browser network calculators, IPv4 CIDR tool, RAID storage planner, PoE budget calculator, IT career resume tools, personal finance calculators',
    ogTitle: 'Interactive IT Infrastructure, Career & Finance Tools | Jawed Imtiaz',
    ogDescription: 'Explore 25+ client-side utilities for network subnetting, rack power/BTU sizing, CCTV & RAID storage, ITSM documentation, and personal finance.',
    canonicalPath: '/tools',
    ogType: 'website',
  },
  '/diagnostic-tools': {
    title: 'IT Diagnostic Calculators & Network Infrastructure Sizing Tools',
    description: 'Client-side IT diagnostic utilities for IPv4 CIDR subnetting, PoE cable budget verification, server rack power/BTU load modeling, and guided triage.',
    keywords: 'IT diagnostic calculators, network infrastructure sizing, server room BTU planner, 802.3bt PoE budget checker, CCTV NVR storage sizing, L2 diagnostic utilities',
    ogTitle: 'IT Diagnostic Calculators & Infrastructure Sizing Suite | Jawed Imtiaz',
    ogDescription: 'Troubleshoot network links, verify 802.3af/at/bt PoE budgets, calculate RAID parity, and format service desk incident notes in your browser.',
    canonicalPath: '/tools',
    ogType: 'website',
  },
  '/offline': {
    title: 'Offline Mode – Cached IT Calculators & Field Diagnostic Utilities',
    description: 'Access cached client-side IT engineering calculators including the IPv4 Subnet Calculator and Cable Length & PoE Budget Checker without an internet connection.',
    keywords: 'offline IT calculators, PWA field tech tools, offline subnet calculator, offline PoE budget checker, cached data center utilities',
    ogTitle: 'Offline IT Field Calculators & PWA Diagnostic Hub | Jawed Imtiaz',
    ogDescription: 'Run browser-cached IT utilities offline, including the IPv4 Subnet Calculator, PoE & Cable Budget Checker, RAID Calculator, and Server Rack Power Calculator.',
    canonicalPath: '/offline',
    ogType: 'website',
    robots: 'noindex, follow',
  },
  '/topics': {
    title: 'Technology, Enterprise IT Support, AI Workflows & Finance Topic Hubs',
    description: "Browse Jawed Imtiaz's curated knowledge topics across enterprise IT infrastructure, practical AI workflows, investing, and personal finance.",
    keywords: 'IT knowledge topics, enterprise technology hubs, AI productivity workflows, personal finance topics India, networking and endpoint topic clusters',
    ogTitle: 'Curated Topic Hubs: IT Infrastructure, Practical AI & Personal Finance',
    ogDescription: 'Curated topic hubs covering enterprise IT support, practical AI workflows, personal finance calculators, and career readiness.',
    canonicalPath: '/topics',
    ogType: 'website',
  },
  '/resources': {
    title: 'Curated IT Support, SysAdmin & Network Engineering Reference Resources',
    description: 'Hand-picked IT support documentation, vendor diagnostic portals, RFC references, and workplace technology resources for fast incident resolution.',
    keywords: 'IT support resources, sysadmin reference links, network engineering documentation, vendor hardware lookup, workplace technology bookmarks',
    ogTitle: 'IT Engineering Reference Library & Diagnostic Bookmarks | Jawed Imtiaz',
    ogDescription: 'Hand-picked reference links, diagnostic utilities, and technical documentation for IT professionals.',
    canonicalPath: '/resources',
    ogType: 'website',
  },
  '/blog': {
    title: 'Technical Blog – IT Operations, Tool Engineering & Field Dispatches',
    description: 'Engineering articles, architecture notes, and field reflections on enterprise IT support, browser tool development, and workplace technology.',
    keywords: 'IT operations blog, technical field dispatches, workplace app access triage, browser tool architecture, Jawed Imtiaz blog',
    ogTitle: 'Technical Blog & Engineering Dispatches | Jawed Imtiaz',
    ogDescription: 'Articles, release notes, and technical reflections on IT operations, browser tool engineering, and workplace technology.',
    canonicalPath: '/blog',
    ogType: 'website',
  },
  '/ai': {
    title: 'Jawed AI Assistant – Search IT Guides, Runbooks & Diagnostic Tools',
    description: 'Ask technical questions and search published IT troubleshooting guides, field engineering runbooks, and browser calculators on Jawed.co.in.',
    keywords: 'Jawed AI assistant, IT knowledge base search, interactive troubleshooting assistant, search IT field guides, technical runbook lookup',
    ogTitle: 'Jawed AI Assistant | Interactive IT Troubleshooting & Knowledge Search',
    ogDescription: 'Interactive AI assistant for searching published IT troubleshooting guides, calculators, and technical documentation on Jawed.co.in.',
    canonicalPath: '/ai',
    ogType: 'website',
  },
  '/contact': {
    title: 'Contact Jawed Imtiaz – IT Engineering, Consulting & Technical Inquiries',
    description: 'Contact Jawed Imtiaz regarding enterprise IT support, field engineering dispatches, workplace technology consulting, and professional opportunities.',
    keywords: 'contact Jawed Imtiaz, IT field engineering inquiry, enterprise IT support contact, technical collaboration, workplace technology consulting',
    ogTitle: 'Contact Jawed Imtiaz | IT Support, Field Engineering & Collaboration',
    ogDescription: 'Get in touch with Jawed Imtiaz regarding IT engineering roles, technical collaborations, or feedback on published tools.',
    canonicalPath: '/contact',
    ogType: 'website',
  },
  '/privacy': {
    title: 'Privacy Policy & Local-First Browser Data Handling',
    description: 'Learn how jawed.co.in protects user privacy with client-side IndexedDB/localStorage tool processing, contact form handling, and cookie controls.',
    keywords: 'jawed.co.in privacy policy, local-first browser privacy, IndexedDB client-side data handling, zero-server data storage, GDPR privacy controls',
    ogTitle: 'Privacy Policy & Client-Side Data Architecture | Jawed Imtiaz',
    ogDescription: 'Read the privacy policy and client-side data handling practices for browser tools on jawed.co.in.',
    canonicalPath: '/privacy',
    ogType: 'website',
  },
  '/terms': {
    title: 'Terms of Service & Technical Tool Usage Guidelines',
    description: 'Review the terms of service, educational disclaimers, and usage guidelines for technical calculators, field guides, and resources on jawed.co.in.',
    keywords: 'jawed.co.in terms of service, IT calculator usage disclaimer, technical guide terms of use, website legal terms, educational tool guidelines',
    ogTitle: 'Terms of Service & Usage Disclaimers | Jawed Imtiaz',
    ogDescription: 'Review the terms of use and disclaimers for calculators, guides, and technical resources on jawed.co.in.',
    canonicalPath: '/terms',
    ogType: 'website',
  },
  '/cookies': {
    title: 'Cookie Policy, LocalStorage & Browser Privacy Preferences',
    description: 'Understand how jawed.co.in uses browser cookies, localStorage, and IndexedDB to save tool states and how to manage your consent preferences.',
    keywords: 'cookie policy jawed.co.in, browser localStorage preferences, IndexedDB persistence settings, analytics consent management, cookie controls',
    ogTitle: 'Cookie Policy & Browser Storage Controls | Jawed Imtiaz',
    ogDescription: 'Understand how cookies and browser localStorage are used to persist tool preferences and consent settings.',
    canonicalPath: '/cookies',
    ogType: 'website',
  },
  '/services': {
    title: 'IT Field Engineering, Rack Deployment & Workplace Support Services',
    description: 'Professional on-site IT field engineering, server rack and stack installations, structured cabling verification, and enterprise endpoint support services.',
    keywords: 'IT field engineering services, server rack and stack deployment, structured cabling verification, enterprise endpoint rollout, on-site IT support India',
    ogTitle: 'IT Field Engineering & Infrastructure Support Services | Jawed Imtiaz',
    ogDescription: 'Enterprise on-site IT support covering server room rack deployments, network switch cutovers, Wi-Fi site surveys, and macOS/Windows endpoint rollouts.',
    canonicalPath: '/services',
    ogType: 'website',
  },
  '/services-dispatch': {
    title: 'IT Field Dispatch Readiness, SLA Coverage & On-Site Triage Scope',
    description: 'Review on-site IT field dispatch engagement models, L2/L3 smart-hands escalation workflows, hardware replacement readiness, and pre-dispatch checklists.',
    keywords: 'IT field dispatch SLA, data center smart hands support, on-site L2 L3 escalation triage, emergency network cutover dispatch, hardware swap checklist',
    ogTitle: 'On-Site IT Field Dispatch & Smart-Hands Triage | Jawed Imtiaz',
    ogDescription: 'Structured field dispatch protocols, data center smart-hands support, emergency network cutover assistance, and SLA documentation.',
    canonicalPath: '/services-dispatch',
    ogType: 'website',
  },
};

export const TOOL_METADATA: Record<string, RouteMetadata> = {
  '/tools/ai-prompt-builder': {
    title: 'AI Prompt Builder – Structured Technical & ITSM Prompts',
    description: 'Build structured prompts with role, context, constraints, and output formatting for IT troubleshooting, RCA reports, and technical writing.',
    keywords: 'AI prompt builder, ITSM prompt generator, incident RCA prompt template, technical writing prompt engineer, structured LLM prompts for IT',
    ogTitle: 'AI Prompt Builder | Structured Technical & ITSM Prompt Generator',
    ogDescription: 'Craft high-context AI prompts with role, goal, constraints, and examples for incident RCA reports, KB articles, and technical communications.',
    canonicalPath: '/tools/ai-prompt-builder',
    ogType: 'website',
  },
  '/tools/career-match-resume-review': {
    title: 'Career Match & Resume Review – ATS Keyword Gap Analyzer',
    description: 'Compare your IT resume against a target job description to identify matched technical skills, missing ATS keywords, and tailored improvements.',
    keywords: 'career match resume review, ATS keyword gap analyzer, IT resume job description matcher, technical skill alignment score, resume keyword scanner',
    ogTitle: 'Career Match & Resume Review | ATS Keyword & Skill Gap Analyzer',
    ogDescription: 'Paste your resume and target job description to uncover missing technical keywords, alignment scores, and tailored improvement suggestions.',
    canonicalPath: '/tools/career-match-resume-review',
    ogType: 'website',
  },
  '/tools/resume-bullet-strength-checker': {
    title: 'Resume Bullet Strength Checker – Action Verb & Impact Scorer',
    description: 'Audit your resume bullet points for strong action verbs, quantified operational outcomes, relevant technical keywords, and concise phrasing.',
    keywords: 'resume bullet strength checker, action verb impact scorer, quantified resume bullet analyzer, ATS bullet point grader, CV bullet improver',
    ogTitle: 'Resume Bullet Strength Checker | Quantified Impact & ATS Scorer',
    ogDescription: 'Audit your resume bullet points instantly for strong action verbs, measurable outcomes, technical keywords, and optimal word length.',
    canonicalPath: '/tools/resume-bullet-strength-checker',
    ogType: 'website',
  },
  '/tools/it-resume-bullet-builder': {
    title: 'IT Resume Bullet Builder – Measurable ATS Bullet Generator',
    description: 'Turn everyday helpdesk, sysadmin, and network engineering work into clear, quantified, ATS-friendly resume bullets right in your browser.',
    keywords: 'IT resume bullet builder, helpdesk resume bullet generator, sysadmin ATS resume accomplishments, network engineer CV bullets, SLA metric resume writer',
    ogTitle: 'IT Resume Bullet Builder | Create & Score ATS-Ready IT Resume Bullets',
    ogDescription: 'Transform everyday helpdesk, sysadmin, and network engineering tasks into high-impact, metric-driven resume bullets right in your browser.',
    canonicalPath: '/tools/it-resume-bullet-builder',
    ogType: 'website',
  },
  '/tools/it-cover-letter-builder': {
    title: 'IT Cover Letter Builder – Tailored Tech Application Generator',
    description: 'Build a concise, authentic IT cover letter tailored to your hands-on technical achievements, target role requirements, and verified metrics.',
    keywords: 'IT cover letter builder, technical support cover letter generator, sysadmin job application letter, tailored tech cover letter template, hiring manager IT pitch',
    ogTitle: 'IT Cover Letter Builder | Tailored Cover Letters for Tech Roles',
    ogDescription: 'Generate a concise, authentic IT cover letter aligned with your hands-on technical achievements and target job requirements.',
    canonicalPath: '/tools/it-cover-letter-builder',
    ogType: 'website',
  },
  '/tools/it-interview-practice': {
    title: 'IT Interview Practice – Interactive Timer & Role Checklists',
    description: 'Practice real-world Help Desk, SysAdmin, Network, Cloud, and Security interview questions with an interactive timer and talking-point checklist.',
    keywords: 'IT interview practice tool, help desk mock interview questions, sysadmin technical interview timer, network engineer interview rubric, cybersecurity interview prep',
    ogTitle: 'IT Interview Practice | Interactive Technical & Behavioral Mock Studio',
    ogDescription: 'Practice real-world Help Desk, SysAdmin, Network, Cloud, and Security interview questions with a live timer and talking-point rubrics.',
    canonicalPath: '/tools/it-interview-practice',
    ogType: 'website',
  },
  '/tools/interview-preparation-planner': {
    title: 'Interview Preparation Planner – STAR Story & Question Organizer',
    description: 'Prepare role-specific behavioral STAR stories, technical architecture talking points, and reverse-interview questions for IT interviews.',
    keywords: 'interview preparation planner, STAR method story organizer, behavioral IT interview worksheet, reverse interview questions tech, incident response interview story',
    ogTitle: 'Interview Preparation Planner | STAR Method Story & Prep Workspace',
    ogDescription: 'Organize behavioral STAR stories, technical talking points, and reverse-interview questions for your next IT role.',
    canonicalPath: '/tools/interview-preparation-planner',
    ogType: 'website',
  },
  '/tools/it-troubleshooting-assistant': {
    title: 'IT Troubleshooting Assistant – Guided Diagnostic Checklists',
    description: 'Follow structured, layer-by-layer diagnostic checklists for enterprise networking, Apple macOS/iOS, Windows endpoints, and workplace hardware issues.',
    keywords: 'IT troubleshooting assistant, OSI layer diagnostic checklist, macOS enterprise triage workflow, Windows endpoint troubleshooting tree, network outage checklist',
    ogTitle: 'IT Troubleshooting Assistant | Layer-by-Layer Diagnostic Flows',
    ogDescription: 'Run systematic, step-by-step troubleshooting checklists for enterprise networking, macOS, Windows endpoints, and hardware faults.',
    canonicalPath: '/tools/it-troubleshooting-assistant',
    ogType: 'website',
  },
  '/tools/service-desk-note-formatter': {
    title: 'Service Desk Note Formatter – Audit-Ready ITSM Ticket Notes',
    description: 'Turn rough incident troubleshooting notes into clean, standardized ITSM ticket updates, L2/L3 escalation handoffs, and resolution summaries.',
    keywords: 'service desk note formatter, ITSM ticket update template, ServiceNow Jira incident work notes, L2 L3 escalation handoff formatter, audit-ready ticket documentation',
    ogTitle: 'Service Desk Note Formatter | Structured ITSM Incident & Work Notes',
    ogDescription: 'Convert rough troubleshooting scratchpads into clean, standardized ITSM ticket updates, escalation handoffs, and resolution summaries.',
    canonicalPath: '/tools/service-desk-note-formatter',
    ogType: 'website',
  },
  '/tools/ticket-to-knowledge-base-draft': {
    title: 'Ticket to Knowledge Base Draft – SOP & KB Article Converter',
    description: 'Convert resolved IT support tickets and incident root causes into structured, reusable knowledge-base articles and standard operating procedures.',
    keywords: 'ticket to knowledge base converter, ITSM KB article draft generator, SOP documentation builder, incident resolution to runbook, KCS knowledge article template',
    ogTitle: 'Ticket to Knowledge Base Draft | Turn Resolved Tickets into SOPs',
    ogDescription: 'Transform resolved incident notes and root causes into structured, searchable knowledge base articles and standard operating procedures.',
    canonicalPath: '/tools/ticket-to-knowledge-base-draft',
    ogType: 'website',
  },
  '/tools/ipv4-subnet-calculator': {
    title: 'IPv4 Subnet & CIDR Calculator – Network Range & Binary Mask Tool',
    description: 'Calculate IPv4 CIDR network bounds, usable host IP ranges, broadcast addresses, wildcard masks, and 32-bit binary subnet masks instantly.',
    keywords: 'IPv4 subnet calculator, CIDR notation calculator, usable host IP range finder, wildcard mask calculator, 32-bit binary subnet mask, VLSM network planner',
    ogTitle: 'IPv4 Subnet & CIDR Calculator | Usable Host Range & Wildcard Mask Tool',
    ogDescription: 'Instantly calculate IPv4 network addresses, usable host ranges, broadcast IPs, wildcard masks, and 32-bit binary breakdowns.',
    canonicalPath: '/tools/ipv4-subnet-calculator',
    ogType: 'website',
  },
  '/tools/server-rack-power-btu-calculator': {
    title: 'Server Rack Power & BTU Calculator – Data Center Load Planner',
    description: 'Estimate server rack electrical load in Watts, VA, and Amps, check NEC 80% circuit breaker derating, and calculate HVAC BTU/hr cooling output.',
    keywords: 'server rack power calculator, data center BTU cooling calculator, PDU amperage load planner, UPS VA sizing tool, NEC 80% circuit breaker derating, server room HVAC',
    ogTitle: 'Server Rack Power & BTU Calculator | Watts, Amps, UPS & HVAC Load',
    ogDescription: 'Model server rack electrical draw in Watts, VA, and Amps, verify NEC 80% circuit breaker derating, and calculate cooling BTU/hr requirements.',
    canonicalPath: '/tools/server-rack-power-btu-calculator',
    ogType: 'website',
  },
  '/tools/personal-finance-snapshot': {
    title: 'Personal Finance Snapshot – Savings, Debt & Emergency Fund Check',
    description: 'Evaluate your monthly savings ratio, emergency fund runway, debt-to-income health, and asset allocation in a private browser dashboard.',
    keywords: 'personal finance snapshot calculator, emergency fund runway checker, debt to income ratio calculator, monthly savings rate analyzer, net worth allocation dashboard',
    ogTitle: 'Personal Finance Snapshot | Cash Flow, Emergency Reserve & Net Ratios',
    ogDescription: 'Evaluate your monthly savings rate, emergency fund runway, debt-to-income ratio, and asset allocation in a private browser dashboard.',
    canonicalPath: '/tools/personal-finance-snapshot',
    ogType: 'website',
  },
  '/tools/finance-planning-workspace': {
    title: 'Finance Planning Workspace – Cash Flow, Goals & Review Planner',
    description: 'Organize monthly cash flow budgets, savings milestones, investment assumptions, and financial review notes in one local-first browser workspace.',
    keywords: 'finance planning workspace, monthly cash flow planner, financial milestone tracker, local-first budget workspace, annual financial review checklist',
    ogTitle: 'Finance Planning Workspace | Integrated Multi-Tab Financial Planner',
    ogDescription: 'Manage monthly budgets, savings milestones, investment assumptions, and financial review checklists in one local-first workspace.',
    canonicalPath: '/tools/finance-planning-workspace',
    ogType: 'website',
  },
  '/tools/compound-growth-sip-calculator': {
    title: 'Compound Growth & SIP Calculator – Monthly Investment Simulator',
    description: 'Simulate long-term portfolio growth from lump-sum principal and recurring monthly SIP contributions with customizable return and inflation rates.',
    keywords: 'compound growth SIP calculator, monthly mutual fund SIP simulator, lump sum compound interest calculator, inflation adjusted investment return, wealth corpus projector',
    ogTitle: 'Compound Growth & SIP Calculator | Long-Term Wealth & Return Modeler',
    ogDescription: 'Project portfolio growth from lump-sum and monthly SIP contributions with customizable compounding rates and inflation adjustments.',
    canonicalPath: '/tools/compound-growth-sip-calculator',
    ogType: 'website',
  },
  '/tools/inflation-goal-planning-calculator': {
    title: 'Inflation & Goal Planning Calculator – Future Cost Estimator',
    description: 'Forecast the inflation-adjusted future cost of major life milestones and calculate the monthly savings required to reach your target.',
    keywords: 'inflation goal planning calculator, future milestone cost estimator, purchasing power erosion calculator, target savings SIP planner, education wedding inflation calculator',
    ogTitle: 'Inflation & Goal Planning Calculator | Future Milestone Cost Forecaster',
    ogDescription: 'Calculate the inflation-adjusted future cost of major life milestones and determine the monthly savings needed to stay on track.',
    canonicalPath: '/tools/inflation-goal-planning-calculator',
    ogType: 'website',
  },
  '/tools/retirement-planning-calculator': {
    title: 'Retirement Planning Calculator – Corpus & Funding Gap Modeler',
    description: 'Estimate your required retirement corpus, post-retirement inflation-adjusted expenses, and monthly savings gap using editable financial assumptions.',
    keywords: 'retirement planning calculator India, retirement corpus estimator, safe withdrawal rate modeler, post-retirement expense inflation, retirement funding gap calculator',
    ogTitle: 'Retirement Planning Calculator | Target Corpus & Safe Withdrawal Planner',
    ogDescription: 'Forecast your required retirement nest egg, post-retirement inflation-adjusted expenses, and monthly contribution gap.',
    canonicalPath: '/tools/retirement-planning-calculator',
    ogType: 'website',
  },
  '/tools/calculator': {
    title: 'Retirement Corpus & Financial Independence Calculator (Alias)',
    description: 'Interactive retirement corpus and safe withdrawal rate calculator for modeling post-retirement expenses and long-term funding gaps.',
    keywords: 'retirement corpus alias calculator, financial independence FIRE number tool, safe withdrawal rate planner, nest egg gap simulator',
    ogTitle: 'Retirement Corpus & Financial Independence Calculator | Jawed Imtiaz',
    ogDescription: 'Model retirement savings targets, inflation-adjusted withdrawal rates, and monthly investment contributions.',
    canonicalPath: '/tools/retirement-planning-calculator',
    ogType: 'website',
  },
  '/tools/it-salary-offer-calculator': {
    title: 'IT Salary & Offer Calculator – Hike %, CTC & Buyout Comparison',
    description: 'Calculate your exact salary hike percentage, compare two competing IT job offers with variable pay weighting, and model notice-period buyout costs.',
    keywords: 'IT salary offer calculator, CTC hike percentage calculator, compare two job offers India, variable pay bonus calculator, notice period buyout recovery calculator',
    ogTitle: 'IT Salary & Offer Calculator | Compare Job Offers, Hike % & In-Hand Pay',
    ogDescription: 'Compare competing IT job offers side by side with fixed vs. variable pay weighting, joining bonuses, tax estimates, and notice buyout math.',
    canonicalPath: '/tools/it-salary-offer-calculator',
    ogType: 'website',
  },
  '/tools/salary-calculator': {
    title: 'IT Job Offer & CTC Take-Home Comparison Calculator (Alias)',
    description: 'Compare fixed CTC, variable performance bonuses, joining incentives, and notice buyout recovery across competing IT job offers.',
    keywords: 'IT CTC take-home calculator alias, fixed vs variable salary comparison, joining bonus break-even tool, tech offer evaluator',
    ogTitle: 'IT Job Offer & CTC Take-Home Comparison Calculator | Jawed Imtiaz',
    ogDescription: 'Evaluate net take-home pay differences, hike percentages, and notice-period buyout break-even timelines.',
    canonicalPath: '/tools/it-salary-offer-calculator',
    ogType: 'website',
  },
  '/tools/cctv-storage-calculator': {
    title: 'CCTV Storage Calculator – Cameras, Retention, Bitrate & RAID',
    description: 'Calculate CCTV and IP camera NVR storage capacity from camera count, resolution, H.264/H.265 bitrate, retention days, motion duty cycle, and RAID level.',
    keywords: 'CCTV storage calculator, IP camera NVR hard drive calculator, H.265 H.264 surveillance bitrate, camera retention days TB calculator, CCTV RAID disk sizing',
    ogTitle: 'CCTV Storage Calculator | IP Camera NVR Capacity, Bandwidth & RAID Planner',
    ogDescription: 'Estimate NVR hard drive capacity, H.265/H.264 network bandwidth, retention days, and RAID parity overhead for multi-camera CCTV deployments.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/tools/cctv-calculator': {
    title: 'IP Camera & NVR Retention Storage Planner (Alias)',
    description: 'Estimate NVR disk capacity and network throughput in Mbps for IP surveillance cameras across 1080p, 4MP, and 4K resolutions.',
    keywords: 'IP camera retention planner alias, 4K CCTV Mbps bandwidth calculator, NVR disk bay estimator, surveillance recording duty cycle',
    ogTitle: 'IP Camera & NVR Retention Storage Planner | Jawed Imtiaz',
    ogDescription: 'Quickly size surveillance hard drives and switch bandwidth for 24/7 or motion-triggered CCTV recording.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/cctv-storage-calculator': {
    title: 'Surveillance NVR Disk & Bandwidth Sizing Calculator (Legacy Route)',
    description: 'Browser-based CCTV storage sizing utility for calculating terabyte requirements, drive bay counts, and RAID redundancy.',
    keywords: 'surveillance NVR disk calculator legacy, CCTV terabyte requirement tool, multi-camera storage bandwidth planner',
    ogTitle: 'Surveillance NVR Disk & Bandwidth Sizing Calculator | Jawed Imtiaz',
    ogDescription: 'Size CCTV NVR storage arrays and network uplink bandwidth for enterprise IP camera installations.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/tools/hardware-storage-calculator': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate exact hard drive counts and usable capacity across RAID 0, 1, 5, 6, 10, 50, and 60 with hot spares, TB vs. TiB conversion, and chassis bay limits.',
    keywords: 'hardware storage RAID calculator, RAID 5 RAID 6 RAID 10 usable capacity, TB to TiB drive calculator, server chassis bay planner, NAS SAN parity overhead calculator',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/raid-calculator': {
    title: 'Enterprise Server RAID Array & Parity Capacity Calculator (Alias)',
    description: 'Model RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 usable storage, parity disk overhead, and fault tolerance for NAS/SAN servers.',
    keywords: 'enterprise RAID array calculator alias, RAID 50 RAID 60 parity calculator, hot spare drive count planner, server disk fault tolerance',
    ogTitle: 'Enterprise Server RAID Array & Parity Capacity Calculator | Jawed Imtiaz',
    ogDescription: 'Compare RAID parity efficiency, minimum drive requirements, and hot-spare bay allocation.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/hardware-storage': {
    title: 'Server Chassis Drive Bay & Usable Storage Planner (Alias)',
    description: 'Plan server and NAS drive bay utilization, raw vs. usable TiB capacity, and RAID rebuild fault tolerance.',
    keywords: 'server chassis drive bay planner alias, raw TB to usable TiB converter, 2U 4U storage server disk sizing',
    ogTitle: 'Server Chassis Drive Bay & Usable Storage Planner | Jawed Imtiaz',
    ogDescription: 'Size enterprise storage arrays with exact decimal TB to binary TiB conversions and chassis bay checks.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/hardware-storage-calculator': {
    title: 'SAN/NAS Disk Array & RAID Capacity Calculator (Legacy Route)',
    description: 'Calculate usable storage capacity, parity loss, and drive count requirements for enterprise server and NAS deployments.',
    keywords: 'SAN NAS disk array calculator legacy, enterprise storage parity loss tool, HDD SSD RAID sizing utility',
    ogTitle: 'SAN/NAS Disk Array & RAID Capacity Calculator | Jawed Imtiaz',
    ogDescription: 'Interactive RAID 0/1/5/6/10/50/60 disk array capacity and chassis bay planner.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/raid-calculator': {
    title: 'RAID 5/6/10/50/60 Usable Disk Capacity Calculator (Legacy Route)',
    description: 'Compute usable disk space, parity overhead, and disk failure tolerance across standard and nested RAID levels.',
    keywords: 'RAID 5 6 10 50 60 disk calculator legacy, nested RAID capacity planner, storage redundancy fault tolerance calculator',
    ogTitle: 'RAID 5/6/10/50/60 Usable Disk Capacity Calculator | Jawed Imtiaz',
    ogDescription: 'Verify usable TB/TiB storage and drive requirements across RAID 0, 1, 5, 6, 10, 50, and 60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/cable-length-poe-budget-checker': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Verify Cat5e, Cat6, and Cat6a Ethernet cable distance limits by link speed and calculate switch PoE power budgets for 802.3af/at/bt devices.',
    keywords: 'cable length PoE budget checker, Cat5e Cat6 Cat6a distance limit, 802.3af 802.3at 802.3bt PoE switch budget, PoE+ PoE++ wattage calculator, 10GBASE-T cable length',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/cable-length-poe-checker': {
    title: 'Ethernet Cable Run & Switch PoE Power Validator (Alias)',
    description: 'Check copper Ethernet attenuation limits and aggregate 802.3af/at/bt PoE wattage draw for IP cameras, Wi-Fi APs, and VoIP phones.',
    keywords: 'Ethernet cable run validator alias, switch PoE power headroom checker, IP camera Wi-Fi AP PoE wattage tool',
    ogTitle: 'Ethernet Cable Run & Switch PoE Power Validator | Jawed Imtiaz',
    ogDescription: 'Verify Cat5e/Cat6/Cat6a run lengths and switch PoE power headroom before pulling cable.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/poe-budget-calculator': {
    title: 'Network Switch 802.3af/at/bt PoE Power Budget Calculator (Alias)',
    description: 'Calculate total PoE, PoE+, and PoE++ wattage consumption across switch ports with recommended power supply safety margins.',
    keywords: 'PoE switch power budget calculator alias, 802.3bt Type 3 Type 4 wattage planner, switch port PoE load calculator',
    ogTitle: 'Network Switch 802.3af/at/bt PoE Power Budget Calculator | Jawed Imtiaz',
    ogDescription: 'Size PoE switch power budgets for wireless access points, PTZ cameras, and VoIP desk phones.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/cable-length-checker': {
    title: 'Cat5e, Cat6 & Cat6a Ethernet Distance Limit Checker (Alias)',
    description: 'Verify maximum supported copper cable lengths for 1GBASE-T, 2.5GBASE-T, 5GBASE-T, and 10GBASE-T Ethernet links.',
    keywords: 'Cat5e Cat6 Cat6a distance checker alias, 10GBASE-T 55m 100m copper limit, TIA EIA 568 horizontal cable run checker',
    ogTitle: 'Cat5e, Cat6 & Cat6a Ethernet Distance Limit Checker | Jawed Imtiaz',
    ogDescription: 'Check TIA/EIA-568 horizontal cabling distance thresholds and PoE voltage drop.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/cable-length-poe-budget-checker': {
    title: 'Structured Cabling Distance & PoE Switch Budget Planner (Legacy Route)',
    description: 'Field utility for checking Ethernet cable run lengths and PoE switch wattage capacity on enterprise network deployments.',
    keywords: 'structured cabling PoE planner legacy, Ethernet voltage drop distance checker, enterprise switch PoE sizing',
    ogTitle: 'Structured Cabling Distance & PoE Switch Budget Planner | Jawed Imtiaz',
    ogDescription: 'Validate Ethernet cable distances and 802.3af/at/bt PoE switch budgets in your browser.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/ai-audio-transcriber': {
    title: 'AI Audio Transcriber & Voice Notes – Speech to ITSM Ticket Summary',
    description: 'Record voice notes or upload audio files to generate accurate transcripts, structured ITSM ticket updates, and technical summaries powered by Gemini.',
    keywords: 'AI audio transcriber, voice note to ITSM ticket summary, Gemini speech to text tool, incident bridge call transcriber, IT support voice recorder',
    ogTitle: 'AI Audio Transcriber & Voice Notes | Convert Speech to ITSM Notes & Summaries',
    ogDescription: 'Record voice notes or upload audio files to generate timestamped transcripts, structured ITSM incident updates, and action items.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/audio-transcriber': {
    title: 'IT Incident Voice Note & Audio Transcription Studio (Alias)',
    description: 'Transcribe recorded bridge calls and technician voice notes into structured incident summaries and action items.',
    keywords: 'incident voice note transcriber alias, bridge call audio summary generator, technician speech to ticket note',
    ogTitle: 'IT Incident Voice Note & Audio Transcription Studio | Jawed Imtiaz',
    ogDescription: 'Turn spoken troubleshooting notes and audio recordings into clean technical transcripts.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/transcribe': {
    title: 'Speech-to-Text Technical Summary & Ticket Note Generator (Alias)',
    description: 'Convert live microphone recordings or uploaded audio files into formatted service desk documentation.',
    keywords: 'speech to text ticket generator alias, browser microphone technical transcriber, AI audio incident documentation',
    ogTitle: 'Speech-to-Text Technical Summary & Ticket Note Generator | Jawed Imtiaz',
    ogDescription: 'Fast browser audio recording and AI-assisted transcription for IT support workflows.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/animate-image-to-video': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    keywords: 'animate image to video, Ken Burns pan zoom video maker, AI motion video generator, multi-frame photo slideshow studio, 16:9 9:16 browser video renderer',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/tools/animate-images-to-video': {
    title: 'Multi-Frame Photo to Video Animation & Keyframe Studio (Alias)',
    description: 'Sequence multiple images into smooth MP4/WebM animations with custom pan/zoom keyframes, crossfade transitions, and audio synchronization.',
    keywords: 'multi-frame photo animation studio alias, WebM MP4 keyframe video builder, crossfade image slideshow creator',
    ogTitle: 'Multi-Frame Photo to Video Animation & Keyframe Studio | Jawed Imtiaz',
    ogDescription: 'Create multi-frame video slideshows and AI-animated clips directly in your browser.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/tools/animate-image': {
    title: 'Ken Burns Pan/Zoom & AI Image Motion Video Creator (Alias)',
    description: 'Apply cinematic camera motion, particle effects, and custom aspect ratios to static images for instant video export.',
    keywords: 'Ken Burns camera motion creator alias, static photo to 60fps video tool, particle overlay video animator',
    ogTitle: 'Ken Burns Pan/Zoom & AI Image Motion Video Creator | Jawed Imtiaz',
    ogDescription: 'Animate single or multiple photos into high-frame-rate videos with custom motion controls.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/animate-image-to-video': {
    title: 'Browser Image-to-Video Animation & Motion Renderer (Legacy Route)',
    description: 'Render 16:9 landscape or 9:16 vertical videos from static images using canvas keyframe interpolation and AI motion.',
    keywords: 'browser image to video renderer legacy, canvas keyframe animation exporter, 9:16 vertical photo video maker',
    ogTitle: 'Browser Image-to-Video Animation & Motion Renderer | Jawed Imtiaz',
    ogDescription: 'Transform static images into animated videos with browser-based keyframe rendering.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/animate-images-to-video': {
    title: 'Batch Photo Slideshow & AI Motion Video Generator (Legacy Route)',
    description: 'Combine static photos, transition effects, and background audio into downloadable video clips in your browser.',
    keywords: 'batch photo slideshow video generator legacy, multi-image audio sync video maker, client-side video animation tool',
    ogTitle: 'Batch Photo Slideshow & AI Motion Video Generator | Jawed Imtiaz',
    ogDescription: 'Build animated video sequences from multiple static images with custom timing and transitions.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/tools/car-affordability-calculator': {
    title: 'Car Affordability & EMI Calculator (India) – Auto Loan & TCO Planner',
    description: 'Check what car price you can afford in India based on annual income, calculate monthly EMI, running costs, emergency fund, and compare up to 3 cars side by side.',
    keywords: 'car affordability calculator India, 20/4/10 car buying rule calculator, auto loan EMI amortization schedule, car total cost of ownership TCO India, multi-car comparison tool',
    ogTitle: 'Car Affordability & EMI Calculator (India) | Auto Loan & Total Cost of Ownership Planner',
    ogDescription: 'Calculate car affordability guidelines, monthly EMIs, complete amortization schedules, fuel and maintenance running costs, and multi-car comparisons.',
    canonicalPath: '/tools/car-affordability-calculator',
    ogType: 'website',
  },
  '/tools/money-manager': {
    title: 'Money Manager & Multi-Bank Ledger – Client-Side Personal Finance Tracker',
    description: 'Track income, expenses, bank transfers, receipt photos, and annual sinking funds across multiple accounts (ICICI, SBI, UBI, Cash) 100% locally in your browser IndexedDB.',
    keywords: 'money manager multi-bank ledger, IndexedDB personal finance tracker, Realbyte style expense manager, ICICI SBI UBI bank ledger, category monthly budget variance tracker, CSV ledger import export',
    ogTitle: 'Money Manager & Multi-Bank Ledger | Private IndexedDB Expense & Bank Tracker',
    ogDescription: 'Realbyte-styled double-entry personal finance ledger with Daily, Calendar, Accounts, and Stats views, photo receipts, sinking funds, and SheetJS Excel export.',
    canonicalPath: '/tools/money-manager',
    ogType: 'website',
  },
};

export function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '');
}

export function canonicalUrl(path: string): string {
  return SITE_ORIGIN + normalizePath(path);
}

const NOT_FOUND_METADATA: RouteMetadata = {
  title: 'Page Not Found (404) – Jawed Imtiaz Technical Guides & IT Tools',
  description: 'The requested page could not be found on jawed.co.in. Browse our published IT field guides, troubleshooting runbooks, and browser calculators.',
  keywords: '404 page not found, jawed.co.in directory, IT field guides, troubleshooting calculators, Jawed Imtiaz tools',
  ogTitle: 'Page Not Found (404) | Jawed Imtiaz',
  ogDescription: 'The requested page could not be found on jawed.co.in. Explore IT field guides, network calculators, and diagnostic utilities.',
  canonicalPath: '/404',
  ogType: 'website',
  robots: 'noindex, follow',
};

function buildSlugKeywords(title: string, slug: string, category: string, sectionTag: string): string {
  const slugTerms = slug.replace(/-/g, ' ');
  return `${title}, ${slugTerms}, ${category}, ${sectionTag}, Jawed Imtiaz`;
}

export function resolveMetadata(pathname: string): RouteMetadata {
  const path = normalizePath(pathname);
  const direct = STATIC_METADATA[path] || TOOL_METADATA[path];
  if (direct) return direct;

  const matchedTool = TOOLS.find((t) => normalizePath(t.route) === path);
  if (matchedTool) {
    const toolKeywords = matchedTool.keywords?.length
      ? `${matchedTool.name}, ${matchedTool.keywords.join(', ')}, Jawed Imtiaz`
      : `${matchedTool.name}, ${matchedTool.id.replace(/-/g, ' ')}, interactive IT calculator, Jawed Imtiaz`;
    return {
      title: `${matchedTool.name} – Interactive Browser Utility`,
      description: matchedTool.description,
      keywords: toolKeywords,
      ogTitle: `${matchedTool.name} | Interactive Tool by Jawed Imtiaz`,
      ogDescription: matchedTool.description,
      canonicalPath: matchedTool.route,
      ogType: 'website',
    };
  }

  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) {
    const note = notesData.find((entry) => entry.slug === noteMatch[1]);
    if (!note) return NOT_FOUND_METADATA;
    return {
      title: `${note.title} – Technical Reference Note`,
      description: note.description,
      keywords: buildSlugKeywords(note.title, note.slug, note.category || 'IT & Finance', 'technical reference note'),
      ogTitle: `${note.title} | IT & Finance Reference Note by Jawed Imtiaz`,
      ogDescription: note.description,
      canonicalPath: '/notes/' + note.slug,
      ogType: 'article',
    };
  }

  const fieldGuideMatch = path.match(/^\/(?:guides|field-guides)\/([^/]+)$/);
  if (fieldGuideMatch) {
    const guide = FIELD_GUIDES.find((entry) => entry.slug === fieldGuideMatch[1]);
    if (guide) {
      const guideKeywords = guide.keywords?.length
        ? `${guide.keywords.join(', ')}, ${guide.category}, IT field guide, Jawed Imtiaz`
        : buildSlugKeywords(guide.title, guide.slug, guide.category || 'IT Field Engineering', 'IT field guide');
      return {
        title: `${guide.title} – IT Field Guide`,
        description: guide.description,
        keywords: guideKeywords,
        ogTitle: `${guide.title} | IT Field Engineering Guide by Jawed Imtiaz`,
        ogDescription: guide.description,
        canonicalPath: '/field-guides/' + guide.slug,
        ogType: 'article',
      };
    }

    // These legacy route aliases can also render notesData entries via NoteDetailPage.
    // Preserve their content metadata and canonicalize notes to their canonical /notes/ URL.
    const note = notesData.find((entry) => entry.slug === fieldGuideMatch[1]);
    if (note) {
      return {
        title: `${note.title} – Technical Reference Note`,
        description: note.description,
        keywords: buildSlugKeywords(note.title, note.slug, note.category || 'IT & Finance', 'technical reference note'),
        ogTitle: `${note.title} | IT & Finance Reference Note by Jawed Imtiaz`,
        ogDescription: note.description,
        canonicalPath: '/notes/' + note.slug,
        ogType: 'article',
      };
    }

    return NOT_FOUND_METADATA;
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = blogData.find((entry) => entry.slug === blogMatch[1]);
    if (!post) return NOT_FOUND_METADATA;
    return {
      title: `${post.title} – Technical Blog`,
      description: post.description,
      keywords: buildSlugKeywords(post.title, post.slug, 'IT Operations & Engineering', 'technical blog'),
      ogTitle: `${post.title} | Technical Blog by Jawed Imtiaz`,
      ogDescription: post.description,
      canonicalPath: '/blog/' + post.slug,
      ogType: 'article',
    };
  }

  if (path.startsWith('/work/')) return STATIC_METADATA['/work'];
  if (path.startsWith('/about/')) return STATIC_METADATA['/about'];
  if (path.startsWith('/topics/')) return STATIC_METADATA['/topics'];
  if (path.startsWith('/resources/')) return STATIC_METADATA['/resources'];
  if (path.startsWith('/contact/')) return STATIC_METADATA['/contact'];
  if (path.startsWith('/privacy/')) return STATIC_METADATA['/privacy'];
  if (path.startsWith('/terms/')) return STATIC_METADATA['/terms'];
  if (path.startsWith('/cookies/')) return STATIC_METADATA['/cookies'];
  if (path.startsWith('/ai/')) return STATIC_METADATA['/ai'];
  if (path.startsWith('/services/')) return STATIC_METADATA['/services'];

  return NOT_FOUND_METADATA;
}

export const RouteSeo: React.FC = () => {
  const { pathname } = useLocation();
  const metadata = resolveMetadata(pathname);
  return (
    <SeoHead
      title={metadata.title}
      description={metadata.description}
      keywords={metadata.keywords}
      ogTitle={metadata.ogTitle}
      ogDescription={metadata.ogDescription}
      canonicalUrl={canonicalUrl(metadata.canonicalPath)}
      ogType={metadata.ogType || 'website'}
      robots={metadata.robots || 'index, follow'}
    />
  );
};
