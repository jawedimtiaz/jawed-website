import { knowledgeEntries, KnowledgeEntry } from '../data/knowledgeData';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  url: string;
  title: string;
  summary?: string;
}

export interface AiResponse {
  reply: string;
  sources: ChatSource[];
  isDeterministic?: boolean;
}

const PERSONAL_BOUNDARY_REPLY =
  "I can help with Jawed.co.in's public professional information, notes, tools and resources, but I don't provide personal-life details such as marital status, family details, private location, salary, age, or net worth.";

const personalPatterns = [
  /\b(?:is|was|are)\s+jawed(?:\s+imtiaz)?\s+(?:married|single|bachelor|divorced|widowed)\b/i,
  /\b(?:marital|marriage)\s+status\b/i,
  /\b(?:wife|husband|spouse|children|child|son|daughter|family|kids?|brother|sister|sibling|father|mother|parent|parents)\b/i,
  /\b(?:where|which city|what city)\b.*\b(?:live|lives|stay|stays|reside|resides|home|house|address)\b/i,
  /\b(?:home address|private address|personal address|phone number|mobile number|personal phone)\b/i,
  /\b(?:salary|pay|income|earnings|ctc|compensation|net\s*worth|wealth)\b/i,
  /\b(?:religion|religious|political affiliation|political party|sexual orientation)\b/i,
  /\b(?:nationality|citizenship|passport|aadhaar|pan number|tax id|government id)\b/i,
  /\b(?:how old|age|date of birth|dob|birthday)\b/i,
  /\b(?:bank account|credit card|debit card|brokerage account)\b/i,
  /\b(?:personal password|private password|api key|secret|otp|recovery code)\b/i,
  /\b(?:medical history|diagnosis|prescription|doctor|health condition)\b/i
];

export function checkDeterministicReply(
  question: string,
  history: ChatMessage[] = []
): AiResponse | null {
  const value = question.trim().toLowerCase().replace(/[?!.]+$/g, '').trim();

  // Closing greetings
  const closing = [
    'bye',
    'goodbye',
    'good night',
    'see you',
    'see ya',
    'talk to you later',
    'thanks',
    'thank you',
    'thx',
    'ok bye',
    'okay bye'
  ];
  if (closing.includes(value)) {
    return { reply: 'Goodbye! Feel free to ask whenever you need help exploring the site. 👋', sources: [], isDeterministic: true };
  }

  // Personal privacy check
  if (personalPatterns.some((p) => p.test(value))) {
    return { reply: PERSONAL_BOUNDARY_REPLY, sources: [], isDeterministic: true };
  }

  // Identity
  const identity = [
    'who is jawed',
    'who is jawed imtiaz',
    'who was jawed',
    'about jawed',
    'about jawed imtiaz',
    'who are you'
  ];
  if (identity.includes(value)) {
    const entry = knowledgeEntries.find((e) => e.url === '/about/');
    if (entry) {
      return {
        reply: `${entry.summary} You can read more on the [About Me page](/about/).`,
        sources: [{ url: entry.url, title: entry.title }],
        isDeterministic: true
      };
    }
  }

  // Work question
  const isWork =
    (value.startsWith('where ') || value.startsWith('what ') || value.startsWith('tell me about')) &&
    ['work', 'working', 'job', 'employed', 'employer', 'employment', 'company', 'uber', 'role'].some((term) =>
      value.includes(term)
    );
  if (isWork) {
    const entry = knowledgeEntries.find((e) => e.url === '/work/experience/');
    if (entry) {
      return {
        reply: `${entry.summary} Explore full details on the [Work Experience page](/work/experience/).`,
        sources: [{ url: entry.url, title: entry.title }],
        isDeterministic: true
      };
    }
  }

  return null;
}

export function searchKnowledge(query: string, limit = 4): KnowledgeEntry[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (tokens.length === 0) {
    return [];
  }

  const scored = knowledgeEntries.map((entry) => {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const summaryLower = entry.summary.toLowerCase();
    const kwLower = entry.keywords.join(' ').toLowerCase();

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 8;
      if (kwLower.includes(token)) score += 5;
      if (summaryLower.includes(token)) score += 2;
    }

    return { entry, score };
  });

  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export async function askJawedAi(
  messages: ChatMessage[]
): Promise<AiResponse> {
  const latestMessage = messages[messages.length - 1];
  const question = latestMessage?.content || '';

  // Check offline state
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      reply: 'Jawed AI needs internet to search site knowledge. Please check your connection and reconnect.',
      sources: []
    };
  }

  // 1. Check deterministic rules
  const deterministic = checkDeterministicReply(question, messages);
  if (deterministic) {
    return deterministic;
  }

  // 2. Perform knowledge retrieval
  const matchedEntries = searchKnowledge(question, 3);
  const sources: ChatSource[] = matchedEntries.map((e) => ({
    url: e.url,
    title: e.title,
    summary: e.summary
  }));

  // 3. Try backend API if reachable (Cloudflare / Express proxy)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.reply) {
        return {
          reply: data.reply,
          sources: data.sources || sources
        };
      }
    }
  } catch {
    // Graceful fallback to client-side grounded response
  }

  // 4. Grounded response generated only from verified site knowledge
  if (sources.length > 0) {
    const top = sources[0];
    const related = sources.slice(1);
    let reply = `Based on verified Jawed.co.in documentation:\n\n${top.summary}`;
    if (related.length > 0) {
      reply += `\n\nRelated resources: ${related.map((s) => `[${s.title}](${s.url})`).join(', ')}.`;
    }
    return {
      reply,
      sources
    };
  }

  // Exact requirement: If information is unavailable, say: "I don't have verified information on that yet."
  return {
    reply:
      "I don’t have verified information on that yet. You can browse verified documentation across IT troubleshooting, device management, interactive tools, and career notes using the links below.",
    sources: [
      { url: '/notes/', title: 'IT Support & Technology Notes' },
      { url: '/tools/', title: 'Tools Directory' },
      { url: '/work/', title: 'Work Overview' }
    ]
  };
}
