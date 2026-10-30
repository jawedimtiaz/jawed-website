/**
 * IT & Software Technical Terms Dictionary and Real-Time Auto-Correction Engine
 * 
 * Features:
 * 1. Automatic sentence boundary detection & capitalization
 * 2. Case-insensitive dictionary replacement for IT, Cloud, DevOps, AI, and Software Engineering terms
 * 3. Real-time transcript scanning & auto-correction with statistics tracking
 */

export interface ITCorrectionRule {
  pattern: RegExp;
  replacement: string;
  category: 'cloud' | 'programming' | 'devops' | 'ai' | 'networking' | 'database' | 'general';
  canonical: string;
}

export interface AutoCorrectionResult {
  correctedText: string;
  uncorrectedText: string;
  correctionCount: number;
  appliedCorrections: Array<{
    original: string;
    replacement: string;
    category: string;
    count: number;
  }>;
}

/**
 * Technical IT Dictionary with Regex rules for common speech recognition / Whisper mispronunciations
 */
export const IT_DICTIONARY_RULES: ITCorrectionRule[] = [
  // Programming Languages & Frameworks
  { pattern: /\b(java\s*script|javascript|java-script)\b/gi, replacement: 'JavaScript', category: 'programming', canonical: 'JavaScript' },
  { pattern: /\b(type\s*script|typescript|type-script)\b/gi, replacement: 'TypeScript', category: 'programming', canonical: 'TypeScript' },
  { pattern: /\b(python|py-thon)\b/gi, replacement: 'Python', category: 'programming', canonical: 'Python' },
  { pattern: /\b(react\s*js|reactjs)\b/gi, replacement: 'React', category: 'programming', canonical: 'React' },
  { pattern: /\b(node\s*js|nodejs)\b/gi, replacement: 'Node.js', category: 'programming', canonical: 'Node.js' },
  { pattern: /\b(next\s*js|nextjs)\b/gi, replacement: 'Next.js', category: 'programming', canonical: 'Next.js' },
  { pattern: /\b(vue\s*js|vuejs)\b/gi, replacement: 'Vue.js', category: 'programming', canonical: 'Vue.js' },
  { pattern: /\b(express\s*js|expressjs)\b/gi, replacement: 'Express.js', category: 'programming', canonical: 'Express.js' },
  { pattern: /\b(angular\s*js|angularjs)\b/gi, replacement: 'Angular', category: 'programming', canonical: 'Angular' },
  { pattern: /\b(tail\s*wind|tailwind|tailwind-css)\b/gi, replacement: 'Tailwind CSS', category: 'programming', canonical: 'Tailwind CSS' },
  { pattern: /\b(c\s*sharp|c#)\b/gi, replacement: 'C#', category: 'programming', canonical: 'C#' },
  { pattern: /\b(c\s*plus\s*plus|c\+\+)\b/gi, replacement: 'C++', category: 'programming', canonical: 'C++' },
  { pattern: /\b(golang|go\s*lang)\b/gi, replacement: 'Go', category: 'programming', canonical: 'Go' },
  { pattern: /\b(rust\s*lang)\b/gi, replacement: 'Rust', category: 'programming', canonical: 'Rust' },

  // Cloud & DevOps
  { pattern: /\b(coober\s*netes|kuber\s*netes|k8s|k-8-s)\b/gi, replacement: 'Kubernetes (K8s)', category: 'devops', canonical: 'Kubernetes' },
  { pattern: /\b(docker|dock-er)\b/gi, replacement: 'Docker', category: 'devops', canonical: 'Docker' },
  { pattern: /\b(a\s*w\s*s|amazon\s*web\s*services)\b/gi, replacement: 'AWS', category: 'cloud', canonical: 'AWS' },
  { pattern: /\b(g\s*c\s*p|google\s*cloud|google\s*cloud\s*platform)\b/gi, replacement: 'GCP', category: 'cloud', canonical: 'GCP' },
  { pattern: /\b(azure|microsoft\s*azure)\b/gi, replacement: 'Azure', category: 'cloud', canonical: 'Azure' },
  { pattern: /\b(dev\s*ops|devops)\b/gi, replacement: 'DevOps', category: 'devops', canonical: 'DevOps' },
  { pattern: /\b(ci\s*\/\s*cd|ci\s*cd|continuous\s*integration)\b/gi, replacement: 'CI/CD', category: 'devops', canonical: 'CI/CD' },
  { pattern: /\b(terra\s*form|terraform)\b/gi, replacement: 'Terraform', category: 'devops', canonical: 'Terraform' },
  { pattern: /\b(ansible|an-sible)\b/gi, replacement: 'Ansible', category: 'devops', canonical: 'Ansible' },
  { pattern: /\b(git\s*hub|github)\b/gi, replacement: 'GitHub', category: 'devops', canonical: 'GitHub' },
  { pattern: /\b(git\s*lab|gitlab)\b/gi, replacement: 'GitLab', category: 'devops', canonical: 'GitLab' },
  { pattern: /\b(bit\s*bucket|bitbucket)\b/gi, replacement: 'Bitbucket', category: 'devops', canonical: 'Bitbucket' },

  // Databases & Storage
  { pattern: /\b(postgre\s*sql|postgres|postgres\s*sql)\b/gi, replacement: 'PostgreSQL', category: 'database', canonical: 'PostgreSQL' },
  { pattern: /\b(mongo\s*db|mongodb)\b/gi, replacement: 'MongoDB', category: 'database', canonical: 'MongoDB' },
  { pattern: /\b(my\s*sql|mysql)\b/gi, replacement: 'MySQL', category: 'database', canonical: 'MySQL' },
  { pattern: /\b(sq\s*lite|sqlite)\b/gi, replacement: 'SQLite', category: 'database', canonical: 'SQLite' },
  { pattern: /\b(redis|re-dis)\b/gi, replacement: 'Redis', category: 'database', canonical: 'Redis' },
  { pattern: /\b(dynamo\s*db|dynamodb)\b/gi, replacement: 'DynamoDB', category: 'database', canonical: 'DynamoDB' },
  { pattern: /\b(fire\s*store|firestore|fire\s*base|firebase)\b/gi, replacement: 'Firestore', category: 'database', canonical: 'Firestore' },

  // APIs, Web & Protocols
  { pattern: /\b(rest\s*api|restful\s*api|rest-api)\b/gi, replacement: 'REST API', category: 'networking', canonical: 'REST API' },
  { pattern: /\b(graph\s*ql|graphql)\b/gi, replacement: 'GraphQL', category: 'networking', canonical: 'GraphQL' },
  { pattern: /\b(web\s*socket|websocket|websockets)\b/gi, replacement: 'WebSocket', category: 'networking', canonical: 'WebSocket' },
  { pattern: /\b(json|j-son)\b/gi, replacement: 'JSON', category: 'general', canonical: 'JSON' },
  { pattern: /\b(yaml|y-a-m-l)\b/gi, replacement: 'YAML', category: 'general', canonical: 'YAML' },
  { pattern: /\b(xml)\b/gi, replacement: 'XML', category: 'general', canonical: 'XML' },
  { pattern: /\b(html5|html\s*5)\b/gi, replacement: 'HTML5', category: 'general', canonical: 'HTML5' },
  { pattern: /\b(css3|css\s*3)\b/gi, replacement: 'CSS3', category: 'general', canonical: 'CSS3' },
  { pattern: /\b(http\s*s|https)\b/gi, replacement: 'HTTPS', category: 'networking', canonical: 'HTTPS' },
  { pattern: /\b(http)\b/gi, replacement: 'HTTP', category: 'networking', canonical: 'HTTP' },
  { pattern: /\b(ip\s*address|ip-address)\b/gi, replacement: 'IP address', category: 'networking', canonical: 'IP address' },
  { pattern: /\b(ipv4|ip\s*v4)\b/gi, replacement: 'IPv4', category: 'networking', canonical: 'IPv4' },
  { pattern: /\b(ipv6|ip\s*v6)\b/gi, replacement: 'IPv6', category: 'networking', canonical: 'IPv6' },
  { pattern: /\b(dns|domain\s*name\s*system)\b/gi, replacement: 'DNS', category: 'networking', canonical: 'DNS' },
  { pattern: /\b(ssh|secure\s*shell)\b/gi, replacement: 'SSH', category: 'networking', canonical: 'SSH' },
  { pattern: /\b(ssl|tls)\b/gi, replacement: 'SSL/TLS', category: 'networking', canonical: 'SSL/TLS' },
  { pattern: /\b(o\s*auth|oauth|oauth2)\b/gi, replacement: 'OAuth 2.0', category: 'networking', canonical: 'OAuth 2.0' },
  { pattern: /\b(jwt|json\s*web\s*token)\b/gi, replacement: 'JWT', category: 'networking', canonical: 'JWT' },

  // Hardware & AI/ML
  { pattern: /\b(cpu|c\s*p\s*u)\b/gi, replacement: 'CPU', category: 'general', canonical: 'CPU' },
  { pattern: /\b(gpu|g\s*p\s*u)\b/gi, replacement: 'GPU', category: 'general', canonical: 'GPU' },
  { pattern: /\b(ram|r\s*a\s*m)\b/gi, replacement: 'RAM', category: 'general', canonical: 'RAM' },
  { pattern: /\b(llm|l\s*l\s*m|llms)\b/gi, replacement: 'LLM', category: 'ai', canonical: 'LLM' },
  { pattern: /\b(gpt-4|gpt4|gpt\s*4)\b/gi, replacement: 'GPT-4', category: 'ai', canonical: 'GPT-4' },
  { pattern: /\b(whisper\s*ai|whisper)\b/gi, replacement: 'Whisper AI', category: 'ai', canonical: 'Whisper AI' },
  { pattern: /\b(web\s*assembly|wasm)\b/gi, replacement: 'WebAssembly (WASM)', category: 'general', canonical: 'WebAssembly' },
  { pattern: /\b(ai\s*audio\s*transcriber)\b/gi, replacement: 'AI Audio Transcriber', category: 'ai', canonical: 'AI Audio Transcriber' },
];

/**
 * Capitalizes sentences after punctuation boundaries (. ! ? \n) or start of text
 */
export function capitalizeSentences(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Capitalize sentence start and post-punctuation letters
  let result = text.replace(/(^\s*|[.!?।\n]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Always capitalize isolated lowercase 'i' pronouns ('i am', 'i think', 'i'll')
  result = result.replace(/\b(i)('m|'ll|'ve|'d|\s+)\b/g, (_, p1, p2) => 'I' + p2);

  return result;
}

/**
 * Scans a transcript string or buffer, applies sentence capitalization and dictionary term replacements
 */
export function autoCorrectITTranscript(
  rawText: string,
  enableCapitalization = true,
  enableDictionary = true
): AutoCorrectionResult {
  if (!rawText || !rawText.trim()) {
    return {
      correctedText: '',
      uncorrectedText: '',
      correctionCount: 0,
      appliedCorrections: [],
    };
  }

  let currentText = rawText;
  let totalCorrections = 0;
  const appliedMap = new Map<string, { original: string; replacement: string; category: string; count: number }>();

  if (enableDictionary) {
    for (const rule of IT_DICTIONARY_RULES) {
      const matches = currentText.match(rule.pattern);
      if (matches && matches.length > 0) {
        const replaceCount = matches.length;
        currentText = currentText.replace(rule.pattern, rule.replacement);
        totalCorrections += replaceCount;

        const existing = appliedMap.get(rule.canonical) || {
          original: matches[0],
          replacement: rule.replacement,
          category: rule.category,
          count: 0,
        };
        existing.count += replaceCount;
        appliedMap.set(rule.canonical, existing);
      }
    }
  }

  if (enableCapitalization) {
    const beforeCap = currentText;
    currentText = capitalizeSentences(currentText);
    if (beforeCap !== currentText) {
      totalCorrections += 1;
    }
  }

  return {
    correctedText: currentText,
    uncorrectedText: rawText,
    correctionCount: totalCorrections,
    appliedCorrections: Array.from(appliedMap.values()),
  };
}
