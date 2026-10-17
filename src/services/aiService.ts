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

// Patterns for unverified claims/employers to prevent hallucination
const unverifiedEmployerPattern = /\b(?:work(?:ed)?|employ(?:ed)?|job|role|hired)\b.*\b(?:google|microsoft|amazon|meta|facebook|apple inc|netflix|tcs|infosys|wipro|cognizant)\b/i;
const unverifiedAwardPattern = /\b(?:won|win|award|trophy|honor|honour|medal|prize|ranking)\b/i;

export function checkDeterministicReply(
  question: string,
  _history: ChatMessage[] = []
): AiResponse | null {
  const normalized = question.trim().toLowerCase().replace(/[?!.]+$/g, '').trim();

  // 1. Closing greetings
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
  if (closing.includes(normalized)) {
    return {
      reply: 'Goodbye! Feel free to ask whenever you need help exploring the site. 👋\n\nSource: [Home](/)',
      sources: [{ url: '/', title: 'Home' }],
      isDeterministic: true
    };
  }

  // 2. Personal privacy boundaries
  if (personalPatterns.some((p) => p.test(normalized))) {
    return {
      reply: `${PERSONAL_BOUNDARY_REPLY}\n\nYou can review Jawed's public professional background on the [About Me page](/about/).\n\nSource: [About Jawed Imtiaz](/about/)`,
      sources: [{ url: '/about/', title: 'About Jawed Imtiaz' }],
      isDeterministic: true
    };
  }

  // 3. Guard against unverified employers (prevents hallucinating unverified company history)
  if (unverifiedEmployerPattern.test(normalized)) {
    return {
      reply:
        "I don’t have verified information on that yet. Jawed's verified experience is with Milestone Technologies (supporting the Uber environment) and earlier technical support, system administration, and technical support management roles at Currents Technology, ICore, Khadims, and Altos.\n\nSource: [Work Experience](/work/experience/)",
      sources: [{ url: '/work/experience/', title: 'Work Experience' }],
      isDeterministic: true
    };
  }

  // 4. Guard against unverified awards or rankings
  if (unverifiedAwardPattern.test(normalized) && normalized.includes('jawed')) {
    return {
      reply:
        "I don’t have verified information on that yet. Professional recognition on Jawed.co.in is presented by factual title and role context without year-based labels or unverified numerical performance claims.\n\nSource: [Work Experience](/work/experience/)",
      sources: [{ url: '/work/experience/', title: 'Work Experience' }],
      isDeterministic: true
    };
  }

  // 5. Suggested Question 1: "What IT support skills does Jawed have?"
  const isSkillsQuery =
    (normalized.includes('skill') || normalized.includes('technical skill') || normalized.includes('abilities')) &&
    (normalized.includes('jawed') || normalized.includes('he') || normalized.includes('support') || normalized.includes('it'));
  if (isSkillsQuery || normalized === 'what it support skills does jawed have') {
    return {
      reply:
        "Jawed’s verified technical skills span:\n\n" +
        "• **IT Support & Service Desk**: First-response troubleshooting, incident scoping, ticket documentation (ServiceNow, Jira), user and device support, remote assistance.\n" +
        "• **Apple & macOS Support**: Device provisioning, macOS configuration, Jamf Pro, and Apple Business Manager administration.\n" +
        "• **Identity & Cloud Access**: Okta, OneLogin, Google Workspace, and Microsoft 365 / Azure AD (Entra ID).\n" +
        "• **Networking**: TCP/IP, DNS, VPN diagnostics, and Cisco Meraki network hardware.\n" +
        "• **Automation & Scripting**: PowerShell and JavaScript for low-risk, reversible support automations.\n\n" +
        "Source: [Skills](/work/skills/)",
      sources: [{ url: '/work/skills/', title: 'Skills' }],
      isDeterministic: true
    };
  }

  // 6. Suggested Question 2: "Which tools can help my career?"
  const isCareerToolsQuery =
    (normalized.includes('tool') || normalized.includes('utilities')) &&
    (normalized.includes('career') || normalized.includes('resume') || normalized.includes('interview') || normalized.includes('job'));
  if (isCareerToolsQuery || normalized === 'which tools can help my career') {
    return {
      reply:
        "Jawed.co.in features three interactive browser-based tools specifically designed for career development:\n\n" +
        "1. **[Career Match & Resume Review](/tools/career-match-resume-review/)**: Compares your resume against a job description in-browser to identify skills overlap, uncover keyword gaps, and track applications privately.\n" +
        "2. **[Resume Bullet Strength Checker](/tools/resume-bullet-strength-checker/)**: Analyzes experience bullets for action verbs, measurable scope, evidence metrics, and concise wording.\n" +
        "3. **[Interview Preparation Planner](/tools/interview-preparation-planner/)**: Extracts skill requirements from a job description and creates targeted practice interview questions.\n\n" +
        "All calculations and text analysis run entirely inside your browser without sending personal resume data to external servers.\n\n" +
        "Sources: [Career Match & Resume Review](/tools/career-match-resume-review/), [Resume Bullet Strength Checker](/tools/resume-bullet-strength-checker/), [Interview Preparation Planner](/tools/interview-preparation-planner/), [Tools Directory](/tools/)",
      sources: [
        { url: '/tools/career-match-resume-review/', title: 'Career Match & Resume Review' },
        { url: '/tools/resume-bullet-strength-checker/', title: 'Resume Bullet Strength Checker' },
        { url: '/tools/interview-preparation-planner/', title: 'Interview Preparation Planner' },
        { url: '/tools/', title: 'Tools Directory' }
      ],
      isDeterministic: true
    };
  }

  // 7. Suggested Question 3: "How does Jawed approach troubleshooting?"
  const isTroubleshootingApproachQuery =
    (normalized.includes('troubleshoot') || normalized.includes('problem solv')) &&
    (normalized.includes('approach') || normalized.includes('method') || normalized.includes('framework') || normalized.includes('how does jawed'));
  if (isTroubleshootingApproachQuery || normalized === 'how does jawed approach troubleshooting') {
    return {
      reply:
        "Jawed approaches troubleshooting using a structured, evidence-based methodology:\n\n" +
        "1. **Clarify the Problem**: Define the exact symptom, error messages, and immediate user workflow impact.\n" +
        "2. **Isolate Scope**: Determine whether the issue follows a specific user account, physical device, local application, or shared service.\n" +
        "3. **Test One Variable at a Time**: Perform low-risk, least-disruptive checks without guessing or making multiple changes at once.\n" +
        "4. **Validate the Original Task**: Confirm that the user can perform their real-world task before marking the incident resolved.\n" +
        "5. **Document and Escalate Cleanly**: Record observed results in ticket notes and provide complete context if escalating to avoid repeated diagnostics.\n\n" +
        "Sources: [IT Service Desk Troubleshooting Workflow](/notes/it-service-desk-troubleshooting-workflow/), [Scoping IT Issues: User, Device or Service](/notes/scoping-it-issues-user-device-service/), [IT Troubleshooting Assistant](/tools/it-troubleshooting-assistant/)",
      sources: [
        { url: '/notes/it-service-desk-troubleshooting-workflow/', title: 'IT Service Desk Troubleshooting Workflow' },
        { url: '/notes/scoping-it-issues-user-device-service/', title: 'Scoping IT Issues: User, Device or Service' },
        { url: '/tools/it-troubleshooting-assistant/', title: 'IT Troubleshooting Assistant' }
      ],
      isDeterministic: true
    };
  }

  // 8. Suggested Question 4: "What is Jawed learning?"
  const isLearningQuery =
    (normalized.includes('learning') || normalized.includes('studying') || normalized.includes('course') || normalized.includes('certification')) &&
    (normalized.includes('jawed') || normalized.includes('he') || normalized.includes('current'));
  if (isLearningQuery || normalized === 'what is jawed learning') {
    return {
      reply:
        "According to verified website documentation, Jawed is currently learning:\n\n" +
        "• **Jamf 100 Course**: Expanding Apple device management, Automated Device Enrollment (ADE), and MDM configuration profiles.\n" +
        "• **ITIL 4 Foundation**: Strengthening IT Service Management (ITSM) principles, incident management lifecycles, and Service Desk workflows.\n\n" +
        "His formal credentials include a Bachelor of Science from the University of Calcutta, Microsoft Certified Azure Fundamentals (AZ-900), Apple Certified Support Professional, and historical MCSE.\n\n" +
        "Sources: [Certifications](/work/certifications/), [About Jawed Imtiaz](/about/)",
      sources: [
        { url: '/work/certifications/', title: 'Certifications' },
        { url: '/about/', title: 'About Jawed Imtiaz' }
      ],
      isDeterministic: true
    };
  }

  // 9. Suggested Question 5: "How can I contact Jawed?"
  const isContactQuery =
    normalized.includes('contact') ||
    normalized.includes('reach jawed') ||
    normalized.includes('email jawed') ||
    normalized.includes('linkedin') ||
    normalized === 'how can i contact jawed';
  if (isContactQuery) {
    return {
      reply:
        "You can contact Jawed Imtiaz for IT support opportunities, website feedback, technology questions, or professional networking through:\n\n" +
        "• **Contact Page**: Fill out the message form directly on the [Contact Jawed Imtiaz](/contact/) page.\n" +
        "• **LinkedIn**: Connect via [Jawed's LinkedIn Profile](https://www.linkedin.com/in/jawedimtiaz/).\n\n" +
        "Source: [Contact Jawed Imtiaz](/contact/)",
      sources: [{ url: '/contact/', title: 'Contact Jawed Imtiaz' }],
      isDeterministic: true
    };
  }

  // 10. Identity
  const identity = [
    'who is jawed',
    'who is jawed imtiaz',
    'who was jawed',
    'about jawed',
    'about jawed imtiaz',
    'who are you'
  ];
  if (identity.includes(normalized)) {
    const entry = knowledgeEntries.find((e) => e.url === '/about/');
    if (entry) {
      return {
        reply: `${entry.summary}\n\nYou can read more on the [About Me page](/about/).\n\nSource: [About Jawed Imtiaz](/about/)`,
        sources: [{ url: entry.url, title: entry.title }],
        isDeterministic: true
      };
    }
  }

  // 11. General Work query
  const isWork =
    (normalized.startsWith('where ') || normalized.startsWith('what ') || normalized.startsWith('tell me about')) &&
    ['work', 'working', 'job', 'employed', 'employer', 'employment', 'company', 'uber', 'role'].some((term) =>
      normalized.includes(term)
    );
  if (isWork) {
    const entry = knowledgeEntries.find((e) => e.url === '/work/experience/');
    if (entry) {
      return {
        reply: `${entry.summary}\n\nExplore full details on the [Work Experience page](/work/experience/).\n\nSource: [Work Experience](/work/experience/)`,
        sources: [{ url: entry.url, title: entry.title }],
        isDeterministic: true
      };
    }
  }

  return null;
}

const STOP_WORDS = new Set([
  'what', 'which', 'where', 'when', 'who', 'how', 'why', 'that', 'this',
  'these', 'those', 'with', 'from', 'into', 'over', 'after', 'before',
  'about', 'have', 'has', 'had', 'having', 'does', 'did', 'done', 'doing',
  'been', 'were', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'must', 'the', 'and', 'for', 'are', 'is', 'was', 'your', 'you', 'his',
  'her', 'their', 'our', 'more', 'some', 'such', 'than', 'then', 'only',
  'just', 'like', 'also', 'any', 'all', 'both', 'each', 'few', 'other',
  'tell', 'give', 'show', 'please'
]);

export function searchKnowledge(query: string, limit = 4): KnowledgeEntry[] {
  const queryLower = query.toLowerCase().trim();
  const rawTokens = queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const tokens = rawTokens.filter((t) => !STOP_WORDS.has(t));

  if (tokens.length === 0 && rawTokens.length === 0) {
    return [];
  }

  // Tokens to search: prefer filtered tokens, fallback to rawTokens if all were stop words
  const searchTokens = tokens.length > 0 ? tokens : rawTokens;

  const scored = knowledgeEntries.map((entry) => {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const summaryLower = entry.summary.toLowerCase();
    const kwLower = entry.keywords.join(' ').toLowerCase();

    // Exact phrase match bonus
    if (queryLower.length > 5) {
      if (titleLower.includes(queryLower)) score += 20;
      if (summaryLower.includes(queryLower)) score += 12;
      if (kwLower.includes(queryLower)) score += 12;
    }

    let matchedTokenCount = 0;
    for (const token of searchTokens) {
      let tokenMatched = false;
      if (titleLower.includes(token)) {
        score += 8;
        tokenMatched = true;
      }
      if (kwLower.includes(token)) {
        score += 5;
        tokenMatched = true;
      }
      if (summaryLower.includes(token)) {
        score += 2;
        tokenMatched = true;
      }
      if (tokenMatched) matchedTokenCount++;
    }

    // Require either a phrase match or at least 1 strong title/keyword match (score >= 8)
    return { entry, score, matchedTokenCount };
  });

  return scored
    .filter((s) => s.score >= 8 && s.matchedTokenCount >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export async function askJawedAi(
  messages: ChatMessage[]
): Promise<AiResponse> {
  const latestMessage = messages[messages.length - 1];
  const question = latestMessage?.content || '';

  // Check offline state strictly
  const isExplicitlyOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isExplicitlyOffline) {
    return {
      reply: '📡 Jawed AI needs internet to search site knowledge. Please check your connection and reconnect.',
      sources: []
    };
  }

  // 1. Check deterministic rules (grounded answers for identity, skills, career tools, troubleshooting, learning, contact, privacy)
  const deterministic = checkDeterministicReply(question, messages);
  if (deterministic) {
    return deterministic;
  }

  // 2. Perform verified knowledge retrieval
  const matchedEntries = searchKnowledge(question, 4);
  const sources: ChatSource[] = matchedEntries.map((e) => ({
    url: e.url,
    title: e.title,
    summary: e.summary
  }));

  // 3. Try backend API if reachable (Cloudflare / Express proxy with server-side credentials only)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.reply) {
        // Ensure source links are present in reply text
        let serverReply = data.reply;
        const finalSources = (data.sources && data.sources.length > 0) ? data.sources : sources;
        if (finalSources.length > 0 && !serverReply.includes('Source:')) {
          const linksText = finalSources.slice(0, 3).map((s: ChatSource) => `[${s.title}](${s.url})`).join(', ');
          serverReply += `\n\nSources: ${linksText}`;
        }
        return {
          reply: serverReply,
          sources: finalSources
        };
      }
    }
  } catch {
    // Graceful fallback to client-side grounded response upon network or API failure
  }

  // 4. Grounded response generated only from verified site knowledge
  if (sources.length > 0) {
    const top = sources[0];
    const related = sources.slice(1);
    let reply = `Based on verified Jawed.co.in documentation:\n\n${top.summary}`;
    if (related.length > 0) {
      reply += `\n\nRelated resources: ${related.map((s) => `[${s.title}](${s.url})`).join(', ')}.`;
    }
    reply += `\n\nSource: [${top.title}](${top.url})`;
    return {
      reply,
      sources
    };
  }

  // 5. Exact requirement: If information is unavailable, say: "I don’t have verified information on that yet."
  return {
    reply:
      "I don’t have verified information on that yet. You can browse verified documentation across IT troubleshooting, device management, interactive tools, and career notes using the links below.\n\nSources: [IT Support & Technology Notes](/notes/), [Tools Directory](/tools/), [Work Overview](/work/), [About Jawed Imtiaz](/about/)",
    sources: [
      { url: '/notes/', title: 'IT Support & Technology Notes' },
      { url: '/tools/', title: 'Tools Directory' },
      { url: '/work/', title: 'Work Overview' },
      { url: '/about/', title: 'About Jawed Imtiaz' }
    ]
  };
}
