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

const FALLBACK_VARIATIONS = [
  "I don't have a specific field guide or note on that topic indexed in my current knowledge base yet, but Jawed would be happy to answer your question directly!",
  "I wasn't able to find an exact match in Jawed's technical documentation for that query. For tailored guidance or dispatch support, feel free to connect with Jawed directly.",
  "That specific scenario isn't covered in my instant index yet! You can send your inquiry straight to Jawed's inbox, and he'll review it personally."
];

const entries: KnowledgeEntry[] = (rawKnowledge as any).entries || [];

export function searchKnowledge(query: string): KnowledgeEntry[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const queryTerms = q.split(/\s+/).filter(Boolean);

  const scored = entries.map(entry => {
    let score = 0;
    const title = entry.title.toLowerCase();
    const summary = entry.summary.toLowerCase();
    const keywords = (entry.keywords || []).map(k => k.toLowerCase());

    if (title.includes(q)) score += 50;
    if (summary.includes(q)) score += 30;

    for (const term of queryTerms) {
      if (title.includes(term)) score += 15;
      if (summary.includes(term)) score += 10;
      for (const kw of keywords) {
        if (kw === term) score += 20;
        else if (kw.includes(term) || term.includes(kw)) score += 8;
      }
    }

    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, 4).map(s => s.entry);
}

export async function askJawedAi(query: string): Promise<AiResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      reply: "Please enter a question about IT support, workplace tech, personal finance, or Jawed's work.",
      sources: []
    };
  }

  const matches = searchKnowledge(trimmed);

  if (matches.length === 0) {
    // Pick random variation from the 3 fallback drafts
    const randomVariation = FALLBACK_VARIATIONS[Math.floor(Math.random() * FALLBACK_VARIATIONS.length)];
    return {
      reply: randomVariation,
      sources: [],
      isFallback: true,
      userQuery: trimmed
    };
  }

  const primary = matches[0];
  let reply = `${primary.summary}`;

  if (matches.length > 1) {
    reply += `\n\nRelated topics include ${matches.slice(1).map(m => `"${m.title}"`).join(', ')}.`;
  }

  return {
    reply,
    sources: matches.map(m => ({
      url: m.url,
      title: m.title,
      summary: m.summary
    }))
  };
}
