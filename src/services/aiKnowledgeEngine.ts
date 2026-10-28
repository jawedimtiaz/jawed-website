import rawKnowledge from '../data/aiKnowledge.json';
import blogData from '../data/blogData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { TOOLS } from '../data/toolsData';

export interface KnowledgeEntry {
  url: string;
  title: string;
  summary: string;
  keywords: string[];
}

export interface AiResponse {
  reply: string;
  sources: { url: string; title: string; summary: string }[];
  isFallback?: boolean;
  userQuery?: string;
}

// 1. Personal & Privacy Query Categories Guardrail
const PERSONAL_CATEGORIES = [
  "wife", "husband", "spouse", "partner", "married", "marriage", "children",
  "child", "son", "daughter", "kids", "family", "father", "mother", "parents",
  "brother", "sister", "sibling", "relatives",
  "home address", "exact address", "personal phone", "mobile number",
  "whatsapp number", "religion", "caste"
];

const PERSONAL_FACT_TERMS = ["salary", "income", "net worth", "age", "birthday", "birthdate", "born"];

const asksAboutPersonalSubject = (query: string): boolean => {
  const lower = query.toLowerCase();
  const subject = /\b(jawed|he|his|him|jawed's|jawed’s)\b/i.test(lower);
  const personalIntent = /\b(what|how old|tell me|give me|reveal|share|find|know|is|are|about|tell)\b/i.test(lower);
  return subject && personalIntent;
};

const PERSONAL_LOCATION_QUESTIONS = [
  /\bwhere\s+(?:does|is)\s+(?:jawed|he)\s+(?:live|based|located)\b/i,
  /\bwhat\s+(?:city|town|area|address)\s+(?:is|does)\s+(?:jawed|he)\b/i,
  /\bwhere\s+(?:is|does)\s+(?:jawed|he)\s+(?:from|stay)\b/i,
  /\b(?:jawed|he)(?:'s|\s+is)\s+(?:home|residence|location|address)\b/i
];

// 2. Stop-Words List
const STOP_WORDS = new Set([
  "who", "is", "the", "of", "a", "an", "and", "in", "on", "at", "to", "for",
  "he", "she", "it", "his", "him", "where", "what", "how", "can", "tell",
  "me", "about", "stay", "lives", "my", "your", "are", "do", "does", "did",
  "was", "were", "been", "being", "have", "has", "had", "would", "should",
  "could", "from", "with", "which"
]);

// Build index of static knowledge entries, tools, field guides, and blog posts
const rawEntries: KnowledgeEntry[] = (rawKnowledge as any).entries || [];

// Convert FIELD_GUIDES into KnowledgeEntry objects
const fieldGuideEntries: KnowledgeEntry[] = FIELD_GUIDES.map((g) => ({
  url: `/guides/${g.slug}`,
  title: g.title,
  summary: g.description,
  keywords: g.keywords || [],
}));

// Convert TOOLS into KnowledgeEntry objects
const toolEntries: KnowledgeEntry[] = TOOLS.map((t) => ({
  url: t.route,
  title: t.name,
  summary: t.description,
  keywords: t.keywords || ['tool', 'utility', 'calculator'],
}));

// Convert blogData into KnowledgeEntry objects
const blogEntries: KnowledgeEntry[] = (blogData as any[]).map((b) => ({
  url: `/blog/${b.slug}`,
  title: b.title,
  summary: b.description,
  keywords: ['blog', 'article', 'case study', ...(b.slug ? b.slug.split('-') : [])],
}));

// Core Pages
const corePageEntries: KnowledgeEntry[] = [
  {
    url: '/',
    title: 'Home - Jawed Imtiaz',
    summary: 'Portfolio, practical technical notes, career tools, and interactive utilities for IT support and workplace technology.',
    keywords: ['home', 'portfolio', 'jawed', 'imtiaz', 'it field tech'],
  },
  {
    url: '/guides',
    title: 'Technical Field Guides & IT Notes',
    summary: 'In-depth IT field notes on networking, macOS, Windows administration, cable verification, and workplace support workflows.',
    keywords: ['field guides', 'notes', 'documentation', 'cheatsheet', 'sop'],
  },
  {
    url: '/tools',
    title: 'Interactive IT & Career Tools Directory',
    summary: 'Browser-based calculators and interactive utilities for cabling, subnetting, power/BTU, resume review, and ticket formatting.',
    keywords: ['tools', 'calculators', 'interactive', 'utilities'],
  },
  {
    url: '/services',
    title: 'Services & On-Site IT Support Dispatch',
    summary: 'On-site workplace technology support, hardware setup, network cabling verification, and service desk dispatch.',
    keywords: ['services', 'dispatch', 'on site support', 'hardware setup'],
  },
  {
    url: '/about',
    title: 'About Jawed Imtiaz',
    summary: 'Professional experience, certifications, hardware lab setup, and approach to workplace technology.',
    keywords: ['about', 'bio', 'resume', 'experience', 'certifications'],
  },
  {
    url: '/ai',
    title: 'Ask Jawed AI',
    summary: 'Interactive AI search and question answering grounded in site documentation and IT troubleshooting frameworks.',
    keywords: ['ask ai', 'jawed ai', 'knowledge base', 'assistant'],
  },
  {
    url: '/contact',
    title: 'Contact & Inquiries',
    summary: 'Direct contact form for IT consulting, workplace tech projects, and job opportunities.',
    keywords: ['contact', 'email', 'inquiry', 'message'],
  },
];

// Deduplicate all entries by normalized URL
const urlSet = new Set<string>();
const combinedEntries: KnowledgeEntry[] = [];

[...toolEntries, ...fieldGuideEntries, ...blogEntries, ...corePageEntries, ...rawEntries].forEach((entry) => {
  const normUrl = entry.url.replace(/\/+$/, '') || '/';
  if (!urlSet.has(normUrl)) {
    urlSet.add(normUrl);
    combinedEntries.push(entry);
  }
});

const entries: KnowledgeEntry[] = combinedEntries;

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholeWord(text: string, term: string): boolean {
  if (!text || !term) return false;
  const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
  return regex.test(text);
}

export function isPersonalQuery(query: string): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();

  if (PERSONAL_LOCATION_QUESTIONS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  const asksAboutJawed = /\b(jawed|he|his|him)\b/i.test(lower);
  const containsPersonalFact = PERSONAL_FACT_TERMS.some((term) =>
    term.includes(' ') ? lower.includes(term) : containsWholeWord(lower, term)
  );
  if (asksAboutJawed && containsPersonalFact && asksAboutPersonalSubject(query)) {
    return true;
  }

  for (const item of PERSONAL_CATEGORIES) {
    if (item.includes(' ')) {
      if (lower.includes(item)) return true;
    } else {
      const regex = new RegExp(`\\b${escapeRegExp(item)}\\b`, 'i');
      if (regex.test(lower)) return true;
    }
  }

  return false;
}

export function searchKnowledge(query: string): KnowledgeEntry[] {
  if (!query || !query.trim()) return [];
  const trimmed = query.trim().toLowerCase();

  const rawTokens = trimmed.split(/[^a-z0-9]+/i).filter(Boolean);
  const meaningfulTerms = rawTokens.filter(
    (t) => !STOP_WORDS.has(t.toLowerCase()) && t.length >= 2
  );

  if (meaningfulTerms.length === 0) {
    return [];
  }

  const scored = entries.map((entry) => {
    let score = 0;
    let matchedTermCount = 0;
    const title = entry.title;
    const summary = entry.summary;
    const keywords = entry.keywords || [];

    const isExactTitleMatch = containsWholeWord(title, trimmed);
    const isExactSummaryMatch = containsWholeWord(summary, trimmed);

    if (isExactTitleMatch) score += 100;
    if (isExactSummaryMatch) score += 60;

    for (const term of meaningfulTerms) {
      let termMatched = false;

      if (containsWholeWord(title, term)) {
        score += 30;
        termMatched = true;
      }

      if (containsWholeWord(summary, term)) {
        score += 20;
        termMatched = true;
      }

      for (const kw of keywords) {
        if (kw.toLowerCase() === term || containsWholeWord(kw, term)) {
          score += 25;
          termMatched = true;
          break;
        }
      }

      if (termMatched) {
        matchedTermCount++;
      }
    }

    const isGenericSingleWord =
      meaningfulTerms.length === 1 &&
      ["jawed", "imtiaz", "note", "notes", "tool", "tools", "it", "guide", "guides"].includes(
        meaningfulTerms[0]
      );

    let qualifies = false;

    if (isExactTitleMatch || isExactSummaryMatch) {
      qualifies = true;
    } else if (matchedTermCount >= 2) {
      qualifies = true;
    } else if (matchedTermCount === 1 && meaningfulTerms.length === 1 && !isGenericSingleWord) {
      qualifies = true;
    }

    return { entry, score: qualifies ? score : 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score >= 25).slice(0, 4).map((s) => s.entry);
}

export async function askJawedAi(query: string): Promise<AiResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      reply:
        "Please enter a question about IT support, workplace tech, diagnostic tools, or Jawed's work experience.",
      sources: [],
    };
  }

  if (isPersonalQuery(trimmed)) {
    return {
      reply:
        "I only share professional background and technical documentation here. For personal questions or direct inquiries, please reach out to Jawed directly.",
      sources: [],
      isFallback: true,
      userQuery: trimmed,
    };
  }

  const matches = searchKnowledge(trimmed);

  if (matches.length === 0) {
    return {
      reply:
        "I don't have verified notes on that topic in my index yet. For specific inquiries or direct consultation, feel free to contact Jawed directly.",
      sources: [],
      isFallback: true,
      userQuery: trimmed,
    };
  }

  const primary = matches[0];
  let reply = primary.summary;

  if (matches.length > 1) {
    reply += `\n\nRelated topics include ${matches.slice(1).map((m) => `"${m.title}"`).join(', ')}.`;
  }

  return {
    reply,
    sources: matches.map((m) => ({
      url: m.url,
      title: m.title,
      summary: m.summary,
    })),
  };
}

export type SiteCategory = 'tool' | 'guide' | 'blog' | 'page';

export interface SiteSearchResult extends KnowledgeEntry {
  category: SiteCategory;
  categoryLabel: string;
  score: number;
}

export interface CategorizedSearchResults {
  all: SiteSearchResult[];
  tools: SiteSearchResult[];
  guides: SiteSearchResult[];
  blogs: SiteSearchResult[];
  pages: SiteSearchResult[];
  query: string;
  isPersonal?: boolean;
}

export function categorizeEntry(url: string, title: string = ''): { category: SiteCategory; categoryLabel: string } {
  const u = url.toLowerCase().replace(/\/+$/, '');
  const t = title.toLowerCase();

  // Blog posts
  if (u.startsWith('/blog') && u !== '/blog') {
    return { category: 'blog', categoryLabel: 'Blog Post' };
  }

  // Tools
  if (
    u.startsWith('/tools') ||
    u.startsWith('/diagnostic-tools') ||
    u.includes('calculator') ||
    u.includes('assistant') ||
    u.includes('builder') ||
    u.includes('planner') ||
    u.includes('checker') ||
    u.includes('formatter') ||
    t.includes('calculator') ||
    t.includes('builder') ||
    t.includes('formatter') ||
    t.includes('planner')
  ) {
    return { category: 'tool', categoryLabel: 'Tool' };
  }

  // Field Guides & Technical Notes
  if (
    u.startsWith('/notes') ||
    u.startsWith('/guides') ||
    u.startsWith('/field-guides') ||
    t.includes('checklist') ||
    t.includes('guide') ||
    t.includes('workflow') ||
    t.includes('framework')
  ) {
    return { category: 'guide', categoryLabel: 'Field Guide' };
  }

  return { category: 'page', categoryLabel: 'Page' };
}

export function searchSite(query: string, maxResults: number = 40): CategorizedSearchResults {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return {
      all: [],
      tools: [],
      guides: [],
      blogs: [],
      pages: [],
      query: '',
    };
  }

  if (isPersonalQuery(trimmed)) {
    return {
      all: [],
      tools: [],
      guides: [],
      blogs: [],
      pages: [],
      query: trimmed,
      isPersonal: true,
    };
  }

  const rawTokens = trimmed.split(/[^a-z0-9]+/i).filter(Boolean);
  const searchTerms = rawTokens.length > 0 ? rawTokens : [trimmed];

  const scoredResults: SiteSearchResult[] = [];

  for (const entry of entries) {
    const { category, categoryLabel } = categorizeEntry(entry.url, entry.title);
    const titleLower = entry.title.toLowerCase();
    const summaryLower = entry.summary.toLowerCase();
    const urlLower = entry.url.toLowerCase();
    const keywordsLower = (entry.keywords || []).map((k) => k.toLowerCase());

    let score = 0;

    // Direct title match
    if (titleLower === trimmed) {
      score += 200;
    } else if (titleLower.includes(trimmed)) {
      score += 100;
    }

    if (keywordsLower.includes(trimmed)) {
      score += 90;
    }

    if (summaryLower.includes(trimmed)) {
      score += 50;
    }

    // Term-based scoring
    for (const term of searchTerms) {
      if (term.length < 2 && searchTerms.length > 1) continue;

      if (containsWholeWord(entry.title, term)) {
        score += 50;
      } else if (titleLower.includes(term)) {
        score += 25;
      }

      for (const kw of keywordsLower) {
        if (kw === term) {
          score += 40;
          break;
        } else if (kw.includes(term)) {
          score += 20;
          break;
        }
      }

      if (containsWholeWord(entry.summary, term)) {
        score += 25;
      } else if (summaryLower.includes(term)) {
        score += 10;
      }

      if (urlLower.includes(term)) {
        score += 20;
      }
    }

    if (score > 0) {
      scoredResults.push({
        ...entry,
        category,
        categoryLabel,
        score,
      });
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);

  const limited = scoredResults.slice(0, maxResults);
  const tools = limited.filter((r) => r.category === 'tool');
  const guides = limited.filter((r) => r.category === 'guide');
  const blogs = limited.filter((r) => r.category === 'blog');
  const pages = limited.filter((r) => r.category === 'page');

  return {
    all: limited,
    tools,
    guides,
    blogs,
    pages,
    query: trimmed,
    isPersonal: false,
  };
}

export function getQuickSearchRecommendations(): SiteSearchResult[] {
  const recommendedUrls = [
    '/tools/ai-audio-transcriber',
    '/tools/cable-length-poe-budget-checker',
    '/tools/ipv4-subnet-calculator',
    '/tools/ai-prompt-builder',
    '/guides/rj45-cabling-t568a-vs-t568b-guide',
    '/blog/rebuilding-jawed-co-in',
    '/blog/triage-workplace-app-access-issue',
    '/about',
    '/services',
  ];

  const results: SiteSearchResult[] = [];

  for (const targetUrl of recommendedUrls) {
    const cleanTarget = targetUrl.toLowerCase().replace(/\/+$/, '');
    const found = entries.find(
      (e) => e.url.toLowerCase().replace(/\/+$/, '') === cleanTarget
    );
    if (found) {
      const { category, categoryLabel } = categorizeEntry(found.url, found.title);
      results.push({
        ...found,
        category,
        categoryLabel,
        score: 100,
      });
    }
  }

  return results;
}
