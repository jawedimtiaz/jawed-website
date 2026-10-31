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
  ogTitle?: string;
  ogDescription?: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  robots?: string;
}

export const STATIC_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools',
    description: 'Practical IT field guides, IPv4 subnet calculators, server rack power calculators, and interactive IT service desk diagnostic utilities by Jawed Imtiaz.',
    ogTitle: 'Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools',
    ogDescription: 'Explore browser-based IT infrastructure calculators, career utilities, AI workspaces, and practical troubleshooting guides by Jawed Imtiaz.',
    canonicalPath: '/',
    ogType: 'website',
  },
  '/about': {
    title: 'About Jawed Imtiaz',
    description: "Learn about Jawed Imtiaz's IT support experience, workplace technology background, certifications, and practical technical interests.",
    ogDescription: "Discover Jawed Imtiaz's background in enterprise IT support, systems administration, workplace technology, and practical tool development.",
    canonicalPath: '/about/',
    ogType: 'website',
  },
  '/work': {
    title: 'IT Support Experience & Skills',
    description: "Explore Jawed Imtiaz's IT support experience, technical skills, certifications, and practical workplace technology projects.",
    ogDescription: "Review Jawed Imtiaz's hands-on experience in IT service desk operations, endpoint management, infrastructure troubleshooting, and technical projects.",
    canonicalPath: '/work/',
    ogType: 'website',
  },
  '/work/projects': {
    title: 'IT Projects and Practical Tools',
    description: 'A portfolio of practical technology projects and browser-based tools, with public-safe examples and clear boundaries around measured outcomes.',
    ogDescription: 'Browse interactive browser-based utilities and IT infrastructure projects engineered for real-world service desk and field workflows.',
    canonicalPath: '/work/projects/',
    ogType: 'website',
  },
  '/work/experience': {
    title: 'IT Support Experience and Highlights',
    description: 'Professional experience across IT support, Service Desk operations, system administration, and workplace technology.',
    ogDescription: 'Detailed career timeline and operational highlights across IT service desk, endpoint engineering, and workplace systems.',
    canonicalPath: '/work/experience/',
    ogType: 'website',
  },
  '/work/certifications': {
    title: 'Certifications & Education',
    description: 'Professional IT support training, certifications, and ongoing learning in workplace technology and device management.',
    ogDescription: 'Verified industry certifications, technical training, and continuous learning credentials in IT infrastructure and support.',
    canonicalPath: '/work/certifications/',
    ogType: 'website',
  },
  '/work/skills': {
    title: 'IT Support Skills and Tools',
    description: 'Technical and operational skills across IT support, workplace technology, Apple devices, device management, networking, and automation.',
    ogDescription: 'Core technical competencies spanning networking, Windows & macOS administration, ITSM workflows, and hardware diagnostics.',
    canonicalPath: '/work/skills/',
    ogType: 'website',
  },
  '/notes': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    ogDescription: 'Step-by-step IT field guides, standard operating procedures, and troubleshooting playbooks for enterprise technicians.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/field-guides': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    ogDescription: 'Step-by-step IT field guides, standard operating procedures, and troubleshooting playbooks for enterprise technicians.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/guides': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    ogDescription: 'Step-by-step IT field guides, standard operating procedures, and troubleshooting playbooks for enterprise technicians.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/tools': {
    title: 'IT Tools & Calculators',
    description: 'Explore browser-based IT, career, and personal-finance calculators and practical utilities built by Jawed Imtiaz.',
    ogDescription: 'Interactive suite of browser-based IT calculators, RAID & PoE planners, AI utilities, career tools, and financial calculators.',
    canonicalPath: '/tools/',
    ogType: 'website',
  },
  '/diagnostic-tools': {
    title: 'IT Tools & Calculators',
    description: 'Explore browser-based IT, career, and personal-finance calculators and practical utilities built by Jawed Imtiaz.',
    ogDescription: 'Interactive suite of browser-based IT calculators, RAID & PoE planners, AI utilities, career tools, and financial calculators.',
    canonicalPath: '/tools/',
    ogType: 'website',
  },
  '/offline': {
    title: 'Offline Mode — Cached IT Calculators & Field Utilities',
    description: 'Access cached client-side IT engineering calculators including the IPv4 Subnet Calculator and Cable Length & PoE Budget Checker without an internet connection.',
    ogDescription: 'Run browser-cached IT utilities offline, including the IPv4 Subnet Calculator, PoE & Cable Budget Checker, RAID Calculator, and Server Rack Power Calculator.',
    canonicalPath: '/offline/',
    ogType: 'website',
    robots: 'noindex, follow',
  },
  '/topics': {
    title: 'Practical Technology, AI and Finance Topics',
    description: "Browse Jawed Imtiaz's practical knowledge topics across technology, AI, investing, personal finance, and tools.",
    ogDescription: 'Curated topic hubs covering enterprise IT support, practical AI workflows, personal finance calculators, and career readiness.',
    canonicalPath: '/topics/',
    ogType: 'website',
  },
  '/resources': {
    title: 'IT Support & Web Resources',
    description: 'Curated IT support, workplace technology, troubleshooting, and web resources for practical problem-solving.',
    ogDescription: 'Hand-picked reference links, diagnostic utilities, and technical documentation for IT professionals.',
    canonicalPath: '/resources/',
    ogType: 'website',
  },
  '/blog': {
    title: 'Blog',
    description: 'Updates and reflections on rebuilding Jawed.co.in, IT work, tools, and practical technology projects.',
    ogDescription: 'Articles, release notes, and technical reflections on IT operations, browser tool engineering, and workplace technology.',
    canonicalPath: '/blog/',
    ogType: 'website',
  },
  '/ai': {
    title: 'Jawed AI Assistant',
    description: 'Ask questions about published technical guides, IT troubleshooting methods, and tools on Jawed.co.in.',
    ogDescription: 'Interactive AI assistant for searching published IT troubleshooting guides, calculators, and technical documentation on Jawed.co.in.',
    canonicalPath: '/ai/',
    ogType: 'website',
    robots: 'noindex, follow',
  },
  '/contact': {
    title: 'Contact Jawed Imtiaz',
    description: 'Contact Jawed Imtiaz about IT support, workplace technology, technical resources, and professional opportunities.',
    ogDescription: 'Get in touch with Jawed Imtiaz regarding IT engineering roles, technical collaborations, or feedback on published tools.',
    canonicalPath: '/contact/',
    ogType: 'website',
  },
  '/privacy': {
    title: 'Website Privacy and Data Handling',
    description: 'How jawed.co.in handles contact messages, browser-based tools, local storage, third-party services, and privacy choices.',
    ogDescription: 'Read the privacy policy and client-side data handling practices for browser tools on jawed.co.in.',
    canonicalPath: '/privacy/',
    ogType: 'website',
  },
  '/terms': {
    title: 'Terms of Service',
    description: 'Terms for using the guides, tools, and resources published on jawed.co.in.',
    ogDescription: 'Review the terms of use and disclaimers for calculators, guides, and technical resources on jawed.co.in.',
    canonicalPath: '/terms/',
    ogType: 'website',
  },
  '/cookies': {
    title: 'Cookie Policy & Preferences',
    description: 'Cookie and local-storage choices used by jawed.co.in, including how to review or change browser preferences.',
    ogDescription: 'Understand how cookies and browser localStorage are used to persist tool preferences and consent settings.',
    canonicalPath: '/cookies/',
    ogType: 'website',
  },
  '/services': {
    title: 'Services & IT Field Dispatch',
    description: 'Information about IT field support, workplace technology, and service dispatch resources.',
    ogDescription: 'On-site IT field engineering, rack & stack deployment, network troubleshooting, and workplace technology dispatch services.',
    canonicalPath: '/services-dispatch/',
    ogType: 'website',
  },
  '/services-dispatch': {
    title: 'Services & IT Field Dispatch',
    description: 'Information about IT field support, workplace technology, and service dispatch resources.',
    ogDescription: 'On-site IT field engineering, rack & stack deployment, network troubleshooting, and workplace technology dispatch services.',
    canonicalPath: '/services-dispatch/',
    ogType: 'website',
  },
};

export const TOOL_METADATA: Record<string, RouteMetadata> = {
  '/tools/ai-prompt-builder': {
    title: 'AI Prompt Builder – Structured Technical & ITSM Prompts',
    description: 'Build structured prompts for troubleshooting, communication, and technical writing.',
    ogTitle: 'AI Prompt Builder | Structured Technical & ITSM Prompt Generator',
    ogDescription: 'Craft high-context AI prompts with role, goal, constraints, and examples for incident RCA reports, KB articles, and technical communications.',
    canonicalPath: '/tools/ai-prompt-builder',
    ogType: 'website',
  },
  '/tools/career-match-resume-review': {
    title: 'Career Match & Resume Review – ATS Keyword Gap Analyzer',
    description: 'Compare resume experience with a job description and identify relevant skills, gaps, and improvements.',
    ogTitle: 'Career Match & Resume Review | ATS Keyword & Skill Gap Analyzer',
    ogDescription: 'Paste your resume and target job description to uncover missing technical keywords, alignment scores, and tailored improvement suggestions.',
    canonicalPath: '/tools/career-match-resume-review',
    ogType: 'website',
  },
  '/tools/resume-bullet-strength-checker': {
    title: 'Resume Bullet Strength Checker – Action Verb & Impact Scorer',
    description: 'Review resume bullets for clear actions, quantified outcomes, relevant keywords, and concise writing.',
    ogTitle: 'Resume Bullet Strength Checker | Quantified Impact & ATS Scorer',
    ogDescription: 'Audit your resume bullet points instantly for strong action verbs, measurable outcomes, technical keywords, and optimal word length.',
    canonicalPath: '/tools/resume-bullet-strength-checker',
    ogType: 'website',
  },
  '/tools/it-resume-bullet-builder': {
    title: 'IT Resume Bullet Builder – Measurable ATS Bullet Generator',
    description: 'Turn what you actually did in IT into clear, measurable, ATS-friendly resume bullets, or score a bullet you already wrote.',
    ogTitle: 'IT Resume Bullet Builder | Create & Score ATS-Ready IT Resume Bullets',
    ogDescription: 'Transform everyday helpdesk, sysadmin, and network engineering tasks into high-impact, metric-driven resume bullets right in your browser.',
    canonicalPath: '/tools/it-resume-bullet-builder',
    ogType: 'website',
  },
  '/tools/it-cover-letter-builder': {
    title: 'IT Cover Letter Builder – Tailored Tech Application Generator',
    description: 'Build a short, tailored, truthful IT cover letter from what you really did with clear placeholders for missing details.',
    ogTitle: 'IT Cover Letter Builder | Tailored Cover Letters for Tech Roles',
    ogDescription: 'Generate a concise, authentic IT cover letter aligned with your hands-on technical achievements and target job requirements.',
    canonicalPath: '/tools/it-cover-letter-builder',
    ogType: 'website',
  },
  '/tools/it-interview-practice': {
    title: 'IT Interview Practice – Interactive Timer & Role Checklists',
    description: 'Practise real IT interview questions with an interactive timer, answer workspace, and key talking points checklist.',
    ogTitle: 'IT Interview Practice | Interactive Technical & Behavioral Mock Studio',
    ogDescription: 'Practice real-world Help Desk, SysAdmin, Network, Cloud, and Security interview questions with a live timer and talking-point rubrics.',
    canonicalPath: '/tools/it-interview-practice',
    ogType: 'website',
  },
  '/tools/interview-preparation-planner': {
    title: 'Interview Preparation Planner – STAR Story & Question Organizer',
    description: 'Prepare role-specific interview stories, practice questions, and a focused interview plan.',
    ogTitle: 'Interview Preparation Planner | STAR Method Story & Prep Workspace',
    ogDescription: 'Organize behavioral STAR stories, technical talking points, and reverse-interview questions for your next IT role.',
    canonicalPath: '/tools/interview-preparation-planner',
    ogType: 'website',
  },
  '/tools/it-troubleshooting-assistant': {
    title: 'IT Troubleshooting Assistant – Guided Diagnostic Checklists',
    description: 'Follow structured diagnostic steps for common network, Apple, Windows, and workplace IT issues.',
    ogTitle: 'IT Troubleshooting Assistant | Layer-by-Layer Diagnostic Flows',
    ogDescription: 'Run systematic, step-by-step troubleshooting checklists for enterprise networking, macOS, Windows endpoints, and hardware faults.',
    canonicalPath: '/tools/it-troubleshooting-assistant',
    ogType: 'website',
  },
  '/tools/service-desk-note-formatter': {
    title: 'Service Desk Note Formatter – Audit-Ready ITSM Ticket Notes',
    description: 'Turn rough incident notes into clear, structured service desk updates.',
    ogTitle: 'Service Desk Note Formatter | Structured ITSM Incident & Work Notes',
    ogDescription: 'Convert rough troubleshooting scratchpads into clean, standardized ITSM ticket updates, escalation handoffs, and resolution summaries.',
    canonicalPath: '/tools/service-desk-note-formatter',
    ogType: 'website',
  },
  '/tools/ticket-to-knowledge-base-draft': {
    title: 'Ticket to Knowledge Base Draft – SOP & KB Article Converter',
    description: 'Convert a resolved support ticket into a reusable knowledge-base article draft.',
    ogTitle: 'Ticket to Knowledge Base Draft | Turn Resolved Tickets into SOPs',
    ogDescription: 'Transform resolved incident notes and root causes into structured, searchable knowledge base articles and standard operating procedures.',
    canonicalPath: '/tools/ticket-to-knowledge-base-draft',
    ogType: 'website',
  },
  '/tools/ipv4-subnet-calculator': {
    title: 'IPv4 Subnet & CIDR Calculator – Network Range & Binary Mask Tool',
    description: 'Calculate IPv4 network ranges, masks, usable addresses, and subnet details.',
    ogTitle: 'IPv4 Subnet & CIDR Calculator | Usable Host Range & Wildcard Mask Tool',
    ogDescription: 'Instantly calculate IPv4 network addresses, usable host ranges, broadcast IPs, wildcard masks, and 32-bit binary breakdowns.',
    canonicalPath: '/tools/ipv4-subnet-calculator',
    ogType: 'website',
  },
  '/tools/server-rack-power-btu-calculator': {
    title: 'Server Rack Power & BTU Calculator – Data Center Load Planner',
    description: 'Estimate rack power consumption and heat output for IT infrastructure planning.',
    ogTitle: 'Server Rack Power & BTU Calculator | Watts, Amps, UPS & HVAC Load',
    ogDescription: 'Model server rack electrical draw in Watts, VA, and Amps, verify NEC 80% circuit breaker derating, and calculate cooling BTU/hr requirements.',
    canonicalPath: '/tools/server-rack-power-btu-calculator',
    ogType: 'website',
  },
  '/tools/personal-finance-snapshot': {
    title: 'Personal Finance Snapshot – Savings, Debt & Emergency Fund Check',
    description: 'Organize a personal finance overview and understand key income, spending, and savings indicators.',
    ogTitle: 'Personal Finance Snapshot | Cash Flow, Emergency Reserve & Net Ratios',
    ogDescription: 'Evaluate your monthly savings rate, emergency fund runway, debt-to-income ratio, and asset allocation in a private browser dashboard.',
    canonicalPath: '/tools/personal-finance-snapshot',
    ogType: 'website',
  },
  '/tools/finance-planning-workspace': {
    title: 'Finance Planning Workspace – Cash Flow, Goals & Review Planner',
    description: 'Organize personal finance planning tasks, snapshots, and review notes in one browser-based workspace.',
    ogTitle: 'Finance Planning Workspace | Integrated Multi-Tab Financial Planner',
    ogDescription: 'Manage monthly budgets, savings milestones, investment assumptions, and financial review checklists in one local-first workspace.',
    canonicalPath: '/tools/finance-planning-workspace',
    ogType: 'website',
  },
  '/tools/compound-growth-sip-calculator': {
    title: 'Compound Growth & SIP Calculator – Monthly Investment Simulator',
    description: 'Estimate investment growth from a starting amount and recurring monthly contributions using editable assumptions.',
    ogTitle: 'Compound Growth & SIP Calculator | Long-Term Wealth & Return Modeler',
    ogDescription: 'Project portfolio growth from lump-sum and monthly SIP contributions with customizable compounding rates and inflation adjustments.',
    canonicalPath: '/tools/compound-growth-sip-calculator',
    ogType: 'website',
  },
  '/tools/inflation-goal-planning-calculator': {
    title: 'Inflation & Goal Planning Calculator – Future Cost Estimator',
    description: 'Estimate future goal costs using an editable inflation assumption and compare them with savings.',
    ogTitle: 'Inflation & Goal Planning Calculator | Future Milestone Cost Forecaster',
    ogDescription: 'Calculate the inflation-adjusted future cost of major life milestones and determine the monthly savings needed to stay on track.',
    canonicalPath: '/tools/inflation-goal-planning-calculator',
    ogType: 'website',
  },
  '/tools/retirement-planning-calculator': {
    title: 'Retirement Planning Calculator – Corpus & Funding Gap Modeler',
    description: 'Estimate a retirement corpus, future spending, and a simplified funding gap using editable assumptions.',
    ogTitle: 'Retirement Planning Calculator | Target Corpus & Safe Withdrawal Planner',
    ogDescription: 'Forecast your required retirement nest egg, post-retirement inflation-adjusted expenses, and monthly contribution gap.',
    canonicalPath: '/tools/retirement-planning-calculator',
    ogType: 'website',
  },
  '/tools/calculator': {
    title: 'Retirement Planning Calculator – Corpus & Funding Gap Modeler',
    description: 'Estimate a retirement corpus, future spending, and a simplified funding gap using editable assumptions.',
    ogTitle: 'Retirement Planning Calculator | Target Corpus & Safe Withdrawal Planner',
    ogDescription: 'Forecast your required retirement nest egg, post-retirement inflation-adjusted expenses, and monthly contribution gap.',
    canonicalPath: '/tools/retirement-planning-calculator',
    ogType: 'website',
  },
  '/tools/it-salary-offer-calculator': {
    title: 'IT Salary & Offer Calculator – Hike %, CTC & Buyout Comparison',
    description: 'Work out your hike %, compare two job offers realistically with variable pay adjustments, and calculate notice-period buyout costs.',
    ogTitle: 'IT Salary & Offer Calculator | Compare Job Offers, Hike % & In-Hand Pay',
    ogDescription: 'Compare competing IT job offers side by side with fixed vs. variable pay weighting, joining bonuses, tax estimates, and notice buyout math.',
    canonicalPath: '/tools/it-salary-offer-calculator',
    ogType: 'website',
  },
  '/tools/salary-calculator': {
    title: 'IT Salary & Offer Calculator – Hike %, CTC & Buyout Comparison',
    description: 'Work out your hike %, compare two job offers realistically with variable pay adjustments, and calculate notice-period buyout costs.',
    ogTitle: 'IT Salary & Offer Calculator | Compare Job Offers, Hike % & In-Hand Pay',
    ogDescription: 'Compare competing IT job offers side by side with fixed vs. variable pay weighting, joining bonuses, tax estimates, and notice buyout math.',
    canonicalPath: '/tools/it-salary-offer-calculator',
    ogType: 'website',
  },
  '/tools/cctv-storage-calculator': {
    title: 'CCTV Storage Calculator – Cameras, Retention, Bitrate & RAID',
    description: 'Calculate CCTV and IP camera storage from number of cameras, resolution, bitrate, retention days and RAID level. Free, runs in your browser.',
    ogTitle: 'CCTV Storage Calculator | IP Camera NVR Capacity, Bandwidth & RAID Planner',
    ogDescription: 'Estimate NVR hard drive capacity, H.265/H.264 network bandwidth, retention days, and RAID parity overhead for multi-camera CCTV deployments.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/tools/cctv-calculator': {
    title: 'CCTV Storage Calculator – Cameras, Retention, Bitrate & RAID',
    description: 'Calculate CCTV and IP camera storage from number of cameras, resolution, bitrate, retention days and RAID level. Free, runs in your browser.',
    ogTitle: 'CCTV Storage Calculator | IP Camera NVR Capacity, Bandwidth & RAID Planner',
    ogDescription: 'Estimate NVR hard drive capacity, H.265/H.264 network bandwidth, retention days, and RAID parity overhead for multi-camera CCTV deployments.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/cctv-storage-calculator': {
    title: 'CCTV Storage Calculator – Cameras, Retention, Bitrate & RAID',
    description: 'Calculate CCTV and IP camera storage from number of cameras, resolution, bitrate, retention days and RAID level. Free, runs in your browser.',
    ogTitle: 'CCTV Storage Calculator | IP Camera NVR Capacity, Bandwidth & RAID Planner',
    ogDescription: 'Estimate NVR hard drive capacity, H.265/H.264 network bandwidth, retention days, and RAID parity overhead for multi-camera CCTV deployments.',
    canonicalPath: '/tools/cctv-storage-calculator',
    ogType: 'website',
  },
  '/tools/hardware-storage-calculator': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate number of hard drives needed for usable capacity across RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 with drive size and chassis bays.',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/raid-calculator': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate number of hard drives needed for usable capacity across RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 with drive size and chassis bays.',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/hardware-storage': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate number of hard drives needed for usable capacity across RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 with drive size and chassis bays.',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/hardware-storage-calculator': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate number of hard drives needed for usable capacity across RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 with drive size and chassis bays.',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/raid-calculator': {
    title: 'Hardware Storage & RAID Calculator – Drive Count & Usable Capacity',
    description: 'Calculate number of hard drives needed for usable capacity across RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60 with drive size and chassis bays.',
    ogTitle: 'Hardware Storage & RAID Calculator | Usable Capacity, Parity & Chassis Planner',
    ogDescription: 'Calculate exact drive counts, usable TB vs. TiB capacity, parity overhead, fault tolerance, and server bay utilization across RAID 0/1/5/6/10/50/60.',
    canonicalPath: '/tools/hardware-storage-calculator',
    ogType: 'website',
  },
  '/tools/cable-length-poe-budget-checker': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Check Cat5e, Cat6 and Cat6a cable length limits by speed and calculate switch PoE power budget for IP cameras, Wi-Fi APs, and VoIP phones.',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/cable-length-poe-checker': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Check Cat5e, Cat6 and Cat6a cable length limits by speed and calculate switch PoE power budget for IP cameras, Wi-Fi APs, and VoIP phones.',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/poe-budget-calculator': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Check Cat5e, Cat6 and Cat6a cable length limits by speed and calculate switch PoE power budget for IP cameras, Wi-Fi APs, and VoIP phones.',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/cable-length-checker': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Check Cat5e, Cat6 and Cat6a cable length limits by speed and calculate switch PoE power budget for IP cameras, Wi-Fi APs, and VoIP phones.',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/cable-length-poe-budget-checker': {
    title: 'Cable Length & PoE Budget Checker – Ethernet & Switch Power Calculator',
    description: 'Check Cat5e, Cat6 and Cat6a cable length limits by speed and calculate switch PoE power budget for IP cameras, Wi-Fi APs, and VoIP phones.',
    ogTitle: 'Cable Length & PoE Budget Checker | Ethernet Distance & 802.3af/at/bt Planner',
    ogDescription: 'Validate Ethernet cable run distances for 1G/2.5G/5G/10G speeds, model voltage drop, and calculate switch PoE power budgets for cameras and APs.',
    canonicalPath: '/tools/cable-length-poe-budget-checker',
    ogType: 'website',
  },
  '/tools/ai-audio-transcriber': {
    title: 'AI Audio Transcriber & Voice Notes – Speech to ITSM Ticket Summary',
    description: 'Record or upload audio to generate accurate transcripts, ITSM ticket notes, and technical summaries powered by Gemini 3.5 Transcribe.',
    ogTitle: 'AI Audio Transcriber & Voice Notes | Convert Speech to ITSM Notes & Summaries',
    ogDescription: 'Record voice notes or upload audio files to generate timestamped transcripts, structured ITSM incident updates, and action items.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/audio-transcriber': {
    title: 'AI Audio Transcriber & Voice Notes – Speech to ITSM Ticket Summary',
    description: 'Record or upload audio to generate accurate transcripts, ITSM ticket notes, and technical summaries powered by Gemini 3.5 Transcribe.',
    ogTitle: 'AI Audio Transcriber & Voice Notes | Convert Speech to ITSM Notes & Summaries',
    ogDescription: 'Record voice notes or upload audio files to generate timestamped transcripts, structured ITSM incident updates, and action items.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/transcribe': {
    title: 'AI Audio Transcriber & Voice Notes – Speech to ITSM Ticket Summary',
    description: 'Record or upload audio to generate accurate transcripts, ITSM ticket notes, and technical summaries powered by Gemini 3.5 Transcribe.',
    ogTitle: 'AI Audio Transcriber & Voice Notes | Convert Speech to ITSM Notes & Summaries',
    ogDescription: 'Record voice notes or upload audio files to generate timestamped transcripts, structured ITSM incident updates, and action items.',
    canonicalPath: '/tools/ai-audio-transcriber',
    ogType: 'website',
  },
  '/tools/animate-image-to-video': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/tools/animate-images-to-video': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/tools/animate-image': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/animate-image-to-video': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
  '/animate-images-to-video': {
    title: 'Animate Images into Video – Free Studio & AI Motion Engine',
    description: 'Transform static photos into cinematic 16:9 or 9:16 videos with Ken Burns pan/zoom effects, particle overlays, and AI motion prompts.',
    ogTitle: 'Animate Images into Video | Multi-Frame Studio, Keyframe Transitions & AI Motion',
    ogDescription: 'Turn static images into smooth 24/30/60fps videos with Ken Burns motion, custom transitions, audio track sync, loop crossfading, and trimming.',
    canonicalPath: '/tools/animate-image-to-video',
    ogType: 'website',
  },
};

export function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '');
}

export function canonicalUrl(path: string): string {
  return SITE_ORIGIN + path;
}

export function resolveMetadata(pathname: string): RouteMetadata {
  const path = normalizePath(pathname);
  const direct = STATIC_METADATA[path] || TOOL_METADATA[path];
  if (direct) return direct;

  const matchedTool = TOOLS.find((t) => normalizePath(t.route) === path);
  if (matchedTool) {
    return {
      title: matchedTool.name,
      description: matchedTool.description,
      ogTitle: `${matchedTool.name} | Jawed Imtiaz`,
      ogDescription: matchedTool.description,
      canonicalPath: matchedTool.route,
      ogType: 'website',
    };
  }

  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) {
    const note = notesData.find((entry) => entry.slug === noteMatch[1]);
    if (!note) return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', ogDescription: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
    return {
      title: note.title,
      description: note.description,
      ogTitle: note.title,
      ogDescription: note.description,
      canonicalPath: '/notes/' + note.slug,
      ogType: 'article',
    };
  }

  const fieldGuideMatch = path.match(/^\/(?:guides|field-guides)\/([^/]+)$/);
  if (fieldGuideMatch) {
    const guide = FIELD_GUIDES.find((entry) => entry.slug === fieldGuideMatch[1]);
    if (guide) {
      return {
        title: guide.title,
        description: guide.description,
        ogTitle: guide.title,
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
        title: note.title,
        description: note.description,
        ogTitle: note.title,
        ogDescription: note.description,
        canonicalPath: '/notes/' + note.slug,
        ogType: 'article',
      };
    }

    return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', ogDescription: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = blogData.find((entry) => entry.slug === blogMatch[1]);
    if (!post) return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', ogDescription: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
    return {
      title: post.title,
      description: post.description,
      ogTitle: post.title,
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

  return {
    title: 'Page Not Found',
    description: 'The requested page could not be found on jawed.co.in.',
    ogDescription: 'The requested page could not be found on jawed.co.in.',
    canonicalPath: '/404',
    robots: 'noindex, follow',
  };
}

export const RouteSeo: React.FC = () => {
  const { pathname } = useLocation();
  const metadata = resolveMetadata(pathname);
  return (
    <SeoHead
      title={metadata.title}
      description={metadata.description}
      ogTitle={metadata.ogTitle}
      ogDescription={metadata.ogDescription}
      canonicalUrl={canonicalUrl(metadata.canonicalPath)}
      ogType={metadata.ogType || 'website'}
      robots={metadata.robots || 'index, follow'}
    />
  );
};
