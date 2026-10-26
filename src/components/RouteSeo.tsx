import React from 'react';
import { useLocation } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import blogData from '../data/blogData.json';

const SITE_ORIGIN = 'https://jawed.co.in';

interface RouteMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  robots?: string;
}

const STATIC_METADATA: Record<string, RouteMetadata> = {
  '/': {
    title: 'Jawed Imtiaz | IT Field Tech, Troubleshooting Guides & Practical Tools',
    description: 'Practical IT field guides, IPv4 subnet calculators, server rack power calculators, and interactive IT service desk diagnostic utilities by Jawed Imtiaz.',
    canonicalPath: '/',
    ogType: 'website',
  },
  '/about': {
    title: 'About Jawed Imtiaz',
    description: "Learn about Jawed Imtiaz's IT support experience, workplace technology background, certifications, and practical technical interests.",
    canonicalPath: '/about/',
    ogType: 'website',
  },
  '/work': {
    title: 'IT Support Experience & Skills',
    description: "Explore Jawed Imtiaz's IT support experience, technical skills, certifications, and practical workplace technology projects.",
    canonicalPath: '/work/',
    ogType: 'website',
  },
  '/work/projects': {
    title: 'IT Projects and Practical Tools',
    description: 'A portfolio of practical technology projects and browser-based tools, with public-safe examples and clear boundaries around measured outcomes.',
    canonicalPath: '/work/projects/',
    ogType: 'website',
  },
  '/work/experience': {
    title: 'IT Support Experience and Highlights',
    description: "Professional experience across IT support, Service Desk operations, system administration, and workplace technology.",
    canonicalPath: '/work/experience/',
    ogType: 'website',
  },
  '/work/certifications': {
    title: 'Certifications & Education',
    description: 'Professional IT support training, certifications, and ongoing learning in workplace technology and device management.',
    canonicalPath: '/work/certifications/',
    ogType: 'website',
  },
  '/work/skills': {
    title: 'IT Support Skills and Tools',
    description: "Technical and operational skills across IT support, workplace technology, Apple devices, device management, networking, and automation.",
    canonicalPath: '/work/skills/',
    ogType: 'website',
  },
  '/notes': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/field-guides': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/guides': {
    title: 'Field Guides & Knowledge Base',
    description: 'Practical IT troubleshooting guides, knowledge-base articles, and step-by-step technical references from Jawed Imtiaz.',
    canonicalPath: '/field-guides/',
    ogType: 'website',
  },
  '/tools': {
    title: 'IT Tools & Calculators',
    description: 'Explore browser-based IT, career, and personal-finance calculators and practical utilities built by Jawed Imtiaz.',
    canonicalPath: '/tools/',
    ogType: 'website',
  },
  '/diagnostic-tools': {
    title: 'IT Tools & Calculators',
    description: 'Explore browser-based IT, career, and personal-finance calculators and practical utilities built by Jawed Imtiaz.',
    canonicalPath: '/tools/',
    ogType: 'website',
  },
  '/topics': {
    title: 'Practical Technology, AI and Finance Topics',
    description: "Browse Jawed Imtiaz's practical knowledge topics across technology, AI, investing, personal finance, and tools.",
    canonicalPath: '/topics/',
    ogType: 'website',
  },
  '/resources': {
    title: 'IT Support & Web Resources',
    description: 'Curated IT support, workplace technology, troubleshooting, and web resources for practical problem-solving.',
    canonicalPath: '/resources/',
    ogType: 'website',
  },
  '/blog': {
    title: 'Blog',
    description: 'Updates and reflections on rebuilding Jawed.co.in, IT work, tools, and practical technology projects.',
    canonicalPath: '/blog/',
    ogType: 'website',
  },
  '/ai': {
    title: 'Jawed AI Assistant',
    description: 'Ask questions about published technical guides, IT troubleshooting methods, and tools on Jawed.co.in.',
    canonicalPath: '/ai/',
    ogType: 'website',
    robots: 'noindex, follow',
  },
  '/contact': {
    title: 'Contact Jawed Imtiaz',
    description: 'Contact Jawed Imtiaz about IT support, workplace technology, technical resources, and professional opportunities.',
    canonicalPath: '/contact/',
    ogType: 'website',
  },
  '/privacy': {
    title: 'Website Privacy and Data Handling',
    description: 'How jawed.co.in handles contact messages, browser-based tools, local storage, third-party services, and privacy choices.',
    canonicalPath: '/privacy/',
    ogType: 'website',
  },
  '/terms': {
    title: 'Terms of Service',
    description: 'Terms for using the guides, tools, and resources published on jawed.co.in.',
    canonicalPath: '/terms/',
    ogType: 'website',
  },
  '/cookies': {
    title: 'Cookie Policy & Preferences',
    description: 'Cookie and local-storage choices used by jawed.co.in, including how to review or change browser preferences.',
    canonicalPath: '/cookies/',
    ogType: 'website',
  },
  '/services': {
    title: 'Services & IT Field Dispatch',
    description: 'Information about IT field support, workplace technology, and service dispatch resources.',
    canonicalPath: '/services-dispatch/',
    ogType: 'website',
  },
  '/services-dispatch': {
    title: 'Services & IT Field Dispatch',
    description: 'Information about IT field support, workplace technology, and service dispatch resources.',
    canonicalPath: '/services-dispatch/',
    ogType: 'website',
  },
};

const TOOL_METADATA: Record<string, RouteMetadata> = {
  '/tools/ai-prompt-builder': { title: 'AI Prompt Builder', description: 'Build structured prompts for troubleshooting, communication, and technical writing.', canonicalPath: '/tools/ai-prompt-builder', ogType: 'website' },
  '/tools/career-match-resume-review': { title: 'Career Match & Resume Review', description: 'Compare resume experience with a job description and identify relevant skills, gaps, and improvements.', canonicalPath: '/tools/career-match-resume-review', ogType: 'website' },
  '/tools/resume-bullet-strength-checker': { title: 'Resume Bullet Strength Checker', description: 'Review resume bullets for clear actions, quantified outcomes, relevant keywords, and concise writing.', canonicalPath: '/tools/resume-bullet-strength-checker', ogType: 'website' },
  '/tools/it-cover-letter-builder': { title: 'IT Cover Letter Builder', description: 'Build a short, tailored, truthful IT cover letter from what you really did with clear placeholders for missing details.', canonicalPath: '/tools/it-cover-letter-builder', ogType: 'website' },
  '/tools/it-interview-practice': { title: 'IT Interview Practice', description: 'Practise real IT interview questions with an interactive timer, answer workspace, and key talking points checklist.', canonicalPath: '/tools/it-interview-practice', ogType: 'website' },
  '/tools/interview-preparation-planner': { title: 'Interview Preparation Planner', description: 'Prepare role-specific interview stories, practice questions, and a focused interview plan.', canonicalPath: '/tools/interview-preparation-planner', ogType: 'website' },
  '/tools/it-troubleshooting-assistant': { title: 'IT Troubleshooting Assistant', description: 'Follow structured diagnostic steps for common network, Apple, Windows, and workplace IT issues.', canonicalPath: '/tools/it-troubleshooting-assistant', ogType: 'website' },
  '/tools/service-desk-note-formatter': { title: 'Service Desk Note Formatter', description: 'Turn rough incident notes into clear, structured service desk updates.', canonicalPath: '/tools/service-desk-note-formatter', ogType: 'website' },
  '/tools/ticket-to-knowledge-base-draft': { title: 'Ticket to Knowledge Base Draft', description: 'Convert a resolved support ticket into a reusable knowledge-base article draft.', canonicalPath: '/tools/ticket-to-knowledge-base-draft', ogType: 'website' },
  '/tools/ipv4-subnet-calculator': { title: 'IPv4 Subnet Calculator', description: 'Calculate IPv4 network ranges, masks, usable addresses, and subnet details.', canonicalPath: '/tools/ipv4-subnet-calculator', ogType: 'website' },
  '/tools/server-rack-power-btu-calculator': { title: 'Server Rack Power & BTU Calculator', description: 'Estimate rack power consumption and heat output for IT infrastructure planning.', canonicalPath: '/tools/server-rack-power-btu-calculator', ogType: 'website' },
  '/tools/personal-finance-snapshot': { title: 'Personal Finance Snapshot', description: 'Organize a personal finance overview and understand key income, spending, and savings indicators.', canonicalPath: '/tools/personal-finance-snapshot', ogType: 'website' },
  '/tools/finance-planning-workspace': { title: 'Finance Planning Workspace', description: 'Organize personal finance planning tasks, snapshots, and review notes in one browser-based workspace.', canonicalPath: '/tools/finance-planning-workspace', ogType: 'website' },
  '/tools/compound-growth-sip-calculator': { title: 'Compound Growth & SIP Calculator', description: 'Estimate investment growth from a starting amount and recurring monthly contributions using editable assumptions.', canonicalPath: '/tools/compound-growth-sip-calculator', ogType: 'website' },
  '/tools/inflation-goal-planning-calculator': { title: 'Inflation & Goal Planning Calculator', description: 'Estimate future goal costs using an editable inflation assumption and compare them with savings.', canonicalPath: '/tools/inflation-goal-planning-calculator', ogType: 'website' },
  '/tools/retirement-planning-calculator': { title: 'Retirement Planning Calculator', description: 'Estimate a retirement corpus, future spending, and a simplified funding gap using editable assumptions.', canonicalPath: '/tools/retirement-planning-calculator', ogType: 'website' },
  '/tools/calculator': { title: 'Retirement Planning Calculator', description: 'Estimate a retirement corpus, future spending, and a simplified funding gap using editable assumptions.', canonicalPath: '/tools/retirement-planning-calculator', ogType: 'website' },
  '/tools/it-salary-offer-calculator': { title: 'IT Salary & Offer Calculator', description: 'Work out your hike %, compare two job offers realistically with variable pay adjustments, and calculate notice-period buyout costs.', canonicalPath: '/tools/it-salary-offer-calculator', ogType: 'website' },
  '/tools/salary-calculator': { title: 'IT Salary & Offer Calculator', description: 'Work out your hike %, compare two job offers realistically with variable pay adjustments, and calculate notice-period buyout costs.', canonicalPath: '/tools/it-salary-offer-calculator', ogType: 'website' },
};

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '');
}

function canonicalUrl(path: string): string {
  return SITE_ORIGIN + path;
}

function resolveMetadata(pathname: string): RouteMetadata {
  const path = normalizePath(pathname);
  const direct = STATIC_METADATA[path] || TOOL_METADATA[path];
  if (direct) return direct;

  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) {
    const note = notesData.find((entry) => entry.slug === noteMatch[1]);
    if (!note) return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
    return {
      title: note.title,
      description: note.description,
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
        canonicalPath: '/notes/' + note.slug,
        ogType: 'article',
      };
    }

    return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = blogData.find((entry) => entry.slug === blogMatch[1]);
    if (!post) return { title: 'Page Not Found', description: 'The requested page could not be found on jawed.co.in.', canonicalPath: '/404', robots: 'noindex, follow' };
    return {
      title: post.title,
      description: post.description,
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
      canonicalUrl={canonicalUrl(metadata.canonicalPath)}
      ogType={metadata.ogType || 'website'}
      robots={metadata.robots || 'index, follow'}
    />
  );
};
