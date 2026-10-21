import rawKnowledge from '../data/aiKnowledge.json';

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
  // Family & Relationships
  "wife", "husband", "spouse", "partner", "married", "marriage", "children",
  "child", "son", "daughter", "kids", "family", "father", "mother", "parents",
  "brother", "sister", "sibling", "relatives",
  // Sensitive personal details. Broad terms like "income" and "net worth" are
  // intentionally handled by context rather than blanket-blocked because they
  // are also used by legitimate educational finance content.
  "age", "birthday", "birthdate", "born", "home address", "exact address",
  "personal phone", "mobile number", "whatsapp number", "salary", "religion", "caste"
];

const PERSONAL_LOCATION_QUESTIONS = [
  /\bwhere\s+(?:does|is)\s+(?:jawed|he)\s+(?:live|based|located)\b/i,
  /\bwhat\s+(?:city|town|area|address)\s+(?:is|does)\s+(?:jawed|he)\b/i,
  /\bwhere\s+(?:is|does)\s+(?:jawed|he)\s+(?:from|work|stay)\b/i,
  /\b(?:jawed|he)(?:'s|\s+is)\s+(?:home|residence|location|address)\b/i
];

// 2. Stop-Words List (Common filler words to filter out before scoring technical queries)
const STOP_WORDS = new Set([
  "who", "is", "the", "of", "a", "an", "and", "in", "on", "at", "to", "for",
  "he", "she", "it", "his", "him", "where", "what", "how", "can", "tell",
  "me", "about", "stay", "lives", "my", "your", "are", "do", "does", "did",
  "was", "were", "been", "being", "have", "has", "had", "would", "should",
  "could", "from", "with", "which"
]);

const rawEntries: KnowledgeEntry[] = (rawKnowledge as any).entries || [];

// Use aiKnowledge.json as the single source of truth for public summaries
// and searchable terms. This avoids silently overriding editorial content here.
const entries: KnowledgeEntry[] = rawEntries;

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word regex matching helper
function containsWholeWord(text: string, term: string): boolean {
  if (!text || !term) return false;
  const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
  return regex.test(text);
}

// Dedicated Personal / Private Query Detector
export function isPersonalQuery(query: string): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();

  if (PERSONAL_LOCATION_QUESTIONS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  for (const item of PERSONAL_CATEGORIES) {
    if (item.includes(' ')) {
      // Multi-word phrase check
      if (lower.includes(item)) return true;
    } else {
      // Single word boundary check
      const regex = new RegExp(`\\b${escapeRegExp(item)}\\b`, 'i');
      if (regex.test(lower)) return true;
    }
  }

  return false;
}

// Technical Knowledge Search Engine
export function searchKnowledge(query: string): KnowledgeEntry[] {
  if (!query || !query.trim()) return [];
  const trimmed = query.trim().toLowerCase();

  // Tokenize alphanumeric words
  const rawTokens = trimmed.split(/[^a-z0-9]+/i).filter(Boolean);

  // Filter out stop words
  const meaningfulTerms = rawTokens.filter(
    (t) => !STOP_WORDS.has(t.toLowerCase()) && t.length >= 2
  );

  // Fall back immediately if no meaningful search terms remain
  if (meaningfulTerms.length === 0) {
    return [];
  }

  const scored = entries.map((entry) => {
    let score = 0;
    let matchedTermCount = 0;
    const title = entry.title;
    const summary = entry.summary;
    const keywords = entry.keywords || [];

    // Exact full query phrase match
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

    // Qualification rules:
    // 1. Exact phrase match in title or summary, OR
    // 2. At least 2 distinct meaningful keywords matched, OR
    // 3. 1 term matched if meaningfulTerms has only 1 non-generic term (e.g. "jamf", "subnet")
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

// Main Query Handling with Privacy Guardrails
export async function askJawedAi(query: string): Promise<AiResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      reply:
        "Please enter a question about IT support, workplace tech, diagnostic tools, or Jawed's work experience.",
      sources: [],
    };
  }

  // Guardrail 1: Intercept Personal & Private Queries
  if (isPersonalQuery(trimmed)) {
    return {
      reply:
        "I only share professional background and technical documentation here. For personal questions or direct inquiries, please reach out to Jawed directly.",
      sources: [],
      isFallback: true,
      userQuery: trimmed,
    };
  }

  // Guardrail 2: Execute Knowledge Search
  const matches = searchKnowledge(trimmed);

  // Guardrail 3: Graceful Fallback for missing/unindexed technical topics
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
