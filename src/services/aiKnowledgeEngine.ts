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

// 1. Stop-Words List (Common filler words to filter out before scoring)
const STOP_WORDS = new Set([
  "who", "is", "the", "of", "a", "an", "and", "in", "on", "at", "to", "for",
  "he", "she", "it", "his", "him", "where", "what", "how", "can", "tell",
  "me", "about", "stay", "lives", "wife", "husband", "family", "my", "your",
  "are", "do", "does", "did", "was", "were", "been", "being", "have", "has",
  "had", "would", "should", "could", "from", "with", "which"
]);

// Personal / Out-of-Scope Query Tokens requiring immediate fallback
const PERSONAL_OUT_OF_SCOPE = new Set([
  "wife", "husband", "married", "marriage", "spouse", "family", "children",
  "kids", "daughter", "son", "father", "mother", "parents", "brother", "sister",
  "salary", "income", "age", "birthday", "birthdate", "phone number", "personal phone",
  "personal address", "home address", "house"
]);

const rawEntries: KnowledgeEntry[] = (rawKnowledge as any).entries || [];

// Ensure entries are clean and fully hydrated
const entries: KnowledgeEntry[] = rawEntries.map((entry) => {
  if (entry.url === '/about/' || entry.title.toLowerCase().includes('about jawed')) {
    return {
      ...entry,
      summary:
        "Jawed Imtiaz is an IT professional and IT Field Tech based in Kolkata, India, providing Enterprise Workplace Support (Uber environment via Milestone Technologies). He specializes in technical support, system administration, IT operations, Service Desk operations, and workplace technology, and holds a Bachelor of Science from the University of Calcutta.",
      keywords: Array.from(
        new Set([
          ...(entry.keywords || []),
          "based",
          "location",
          "kolkata",
          "india",
          "where",
          "work",
          "employer",
          "uber",
          "milestone technologies",
          "enterprise workplace support",
        ])
      ),
    };
  }
  return entry;
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 2. Exact & Whole-Word Token Matching
function containsWholeWord(text: string, term: string): boolean {
  if (!text || !term) return false;
  const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
  return regex.test(text);
}

// 3. Intent & Relevance Scoring Engine
export function searchKnowledge(query: string): KnowledgeEntry[] {
  if (!query || !query.trim()) return [];
  const trimmed = query.trim().toLowerCase();

  // Tokenize alphanumeric words
  const rawTokens = trimmed.split(/[^a-z0-9]+/i).filter(Boolean);

  // Check for personal / out-of-scope query intent
  for (const token of rawTokens) {
    if (PERSONAL_OUT_OF_SCOPE.has(token.toLowerCase())) {
      return []; // Immediate Fallback
    }
  }

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

    // Require strict qualification:
    // 1. Exact phrase match in title or summary, OR
    // 2. At least 2 distinct meaningful keywords matched, OR
    // 3. 1 term matched if meaningfulTerms has only 1 non-generic term (e.g., "jamf", "subnet")
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

// 4. Main Query Handling & Fallback Logic
export async function askJawedAi(query: string): Promise<AiResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      reply:
        "Please enter a question about IT support, workplace tech, diagnostic tools, or Jawed's work experience.",
      sources: [],
    };
  }

  const matches = searchKnowledge(trimmed);

  // Graceful Fallback Trigger if relevance threshold is not met
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
