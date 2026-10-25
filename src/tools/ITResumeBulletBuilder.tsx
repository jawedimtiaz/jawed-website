import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  Check,
  X,
  Copy,
  Trash2,
  Sparkles,
  AlertCircle,
  FileText,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Gauge,
  TrendingUp,
  Zap,
  AlertTriangle,
  Layers,
  Download,
  ListPlus,
  Tag,
  Filter,
  Undo2,
  Redo2,
  Printer,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

interface SavedBulletItem {
  id: string;
  text: string;
  style: string;
  role: string;
  createdAt: string;
}

interface BulletCheckResult {
  score: number;
  items: {
    l: string;
    ok: boolean;
    tip: string;
  }[];
}

const ROLES: Record<string, string[]> = {
  'Help desk / service desk': ['Resolved', 'Troubleshot', 'Escalated', 'Documented', 'Onboarded', 'Supported', 'Triaged', 'Restored'],
  'Field technician': ['Installed', 'Deployed', 'Repaired', 'Replaced', 'Cabled', 'Commissioned', 'Diagnosed', 'Upgraded'],
  'Network engineer': ['Configured', 'Segmented', 'Migrated', 'Monitored', 'Optimized', 'Secured', 'Designed', 'Troubleshot'],
  'System administrator': ['Administered', 'Automated', 'Patched', 'Migrated', 'Provisioned', 'Hardened', 'Maintained', 'Restored'],
  'Cloud / DevOps': ['Automated', 'Deployed', 'Containerized', 'Orchestrated', 'Provisioned', 'Monitored', 'Reduced', 'Scaled'],
  'Security': ['Hardened', 'Investigated', 'Audited', 'Remediated', 'Monitored', 'Implemented', 'Detected', 'Enforced'],
};

const STRONG_VERBS = new Set(
  'resolved troubleshot escalated documented onboarded supported triaged restored installed deployed repaired replaced cabled commissioned diagnosed upgraded configured segmented migrated monitored optimized secured designed administered automated patched provisioned hardened maintained containerized orchestrated reduced scaled investigated audited remediated implemented detected enforced built led managed improved created delivered streamlined trained coordinated analyzed developed launched cut increased'.split(' ')
);

const TOOLS_LIST = 'windows server,active directory,office 365,microsoft 365,azure,aws,gcp,linux,ubuntu,vmware,hyper-v,cisco,juniper,fortinet,palo alto,meraki,vlan,dns,dhcp,vpn,tcp/ip,bgp,ospf,powershell,python,bash,ansible,terraform,docker,kubernetes,jenkins,git,servicenow,jira,zendesk,intune,sccm,okta,splunk,wireshark,nagios,zabbix,veeam,sql,raid,voip,sd-wan,firewall,siem,ticketing,exchange,sharepoint,gpo,mdm'.split(',');

const TOOL_REGEX = new RegExp(`(^|[^a-z0-9])(${TOOLS_LIST.map(t => t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|')})([^a-z0-9]|$)`, 'i');
const WEAK_REGEX = /\b(responsible for|worked on|helped( with| to)?|assisted with|duties included|handled|involved in)\b/i;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface BulletInputForm {
  verb: string;
  task: string;
  tools: string;
  scale: string;
  result: string;
}

function buildBullets(f: BulletInputForm) {
  const v = cap(f.verb.trim());
  const task = f.task.trim().replace(/[.]+$/, '');
  if (!v || !task) return null;

  const tools = f.tools.trim();
  const scale = f.scale.trim();
  const res = f.result.trim().replace(/[.]+$/, '');
  const NP = '[add a measurable result you can verify — Not Provided]';

  const t = tools ? ' using ' + tools : '';
  const s = scale ? ' for ' + scale : '';

  return [
    { n: 'Standard', t: `${v} ${task}${t}${s}, ${res ? 'resulting in ' + res : NP}.` },
    { n: 'Impact-first', t: `${cap(res || NP)} — ${v.toLowerCase()} ${task}${t}${s}.` },
    { n: 'Compact (ATS-friendly)', t: `${v} ${task}${tools ? ' (' + tools + ')' : ''}${scale ? '; ' + scale : ''}${res ? '; ' + res : ''}.` },
  ];
}

function checkBullet(b: string): BulletCheckResult {
  const w = b.trim().split(/\s+/).filter(Boolean);
  const first = (w[0] || '').toLowerCase().replace(/[^a-z]/g, '');

  const c = [
    {
      ok: STRONG_VERBS.has(first),
      l: 'Starts with a strong action verb',
      tip: 'Open with a specific past-tense verb such as Configured, Resolved or Deployed.',
    },
    {
      ok: !WEAK_REGEX.test(b) && !/\b(I|my|me)\b/.test(b),
      l: 'No weak phrases or first person',
      tip: "Replace 'responsible for', 'worked on', 'helped with' and I/my with what you actually did.",
    },
    {
      ok: /\d/.test(b),
      l: 'Includes a number',
      tip: 'Add a count, percentage, time or scale you can verify (users, devices, sites, tickets).',
    },
    {
      ok: TOOL_REGEX.test(b),
      l: 'Names a tool or technology',
      tip: 'Mention the system or tool (e.g. Active Directory, Cisco, VMware) so ATS can match it.',
    },
    {
      ok: w.length >= 8 && w.length <= 28,
      l: '8–28 words',
      tip: w.length < 8 ? 'Add context: what, with which tool, and the outcome.' : 'Trim to one clear line.',
    },
  ];

  return {
    score: c.filter(x => x.ok).length * 20,
    items: c,
  };
}

export interface StrengthItemFeedback {
  category: 'verb' | 'length' | 'metrics';
  status: 'good' | 'warning' | 'danger';
  title: string;
  advice: string;
  fixSuggestion?: string;
}

export interface BulletStrengthResult {
  score: number; // 0 - 100
  tier: 'Needs Work' | 'Developing' | 'Strong' | 'Exceptional';
  color: string;
  badgeBg: string;
  verbImpact: {
    score: number; // 0 - 100
    detectedVerb: string;
    isStrong: boolean;
    isWeak: boolean;
    hasFirstPerson: boolean;
    label: string;
    feedback: string;
    suggestions: string[];
  };
  lengthAnalysis: {
    score: number; // 0 - 100
    wordCount: number;
    charCount: number;
    status: 'empty' | 'too-short' | 'short' | 'ideal' | 'verbose' | 'too-long';
    label: string;
    feedback: string;
  };
  metricsAnalysis: {
    score: number; // 0 - 100
    detectedMetrics: string[];
    count: number;
    label: string;
    feedback: string;
  };
  feedbackList: StrengthItemFeedback[];
}

function extractMetrics(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  const percentRegex = /\b\d+(\.\d+)?%/gi;
  const timeRegex = /\b\d[\d,]*\+?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|days?|weeks?|months?|years?)\b/gi;
  const scaleRegex = /\b\d[\d,]*\+?\s*(users?|devices?|vms?|virtual machines?|endpoints?|servers?|tickets?|sites?|nodes?|clients?|laptops?|workstations?|switches?|routers?|ports?|firewalls?|accounts?|staff|employees?|members?|workloads?|domains?)\b/gi;
  const currencyRegex = /\$[\d,]+(\.\d+)?(k|m|b)?\b/gi;
  const slaRegex = /\b(99\.99?%|zero downtime|100% compliance)\b/gi;
  const generalNumRegex = /\b\d[\d,]*\+?\b/g;

  let m: RegExpExecArray | null;
  while ((m = percentRegex.exec(text)) !== null) matches.push(m[0]);
  while ((m = timeRegex.exec(text)) !== null) matches.push(m[0]);
  while ((m = scaleRegex.exec(text)) !== null) matches.push(m[0]);
  while ((m = currencyRegex.exec(text)) !== null) matches.push(m[0]);
  while ((m = slaRegex.exec(text)) !== null) matches.push(m[0]);

  if (matches.length === 0) {
    while ((m = generalNumRegex.exec(text)) !== null) matches.push(m[0]);
  }

  return Array.from(new Set(matches.map(s => s.trim()))).filter(Boolean);
}

function getCompositeBullet(f: BulletInputForm): string {
  const v = cap((f.verb || '').trim());
  const task = (f.task || '').trim().replace(/[.]+$/, '');
  const tools = (f.tools || '').trim();
  const scale = (f.scale || '').trim();
  const res = (f.result || '').trim().replace(/[.]+$/, '');

  if (!v && !task && !tools && !scale && !res) return '';

  const parts: string[] = [];
  if (v) parts.push(v);
  if (task) parts.push(task);
  if (tools) parts.push(`using ${tools}`);
  if (scale) parts.push(`for ${scale}`);
  if (res) parts.push(`resulting in ${res}`);

  return parts.join(' ').replace(/\s+/g, ' ').trim() + (parts.length > 0 ? '.' : '');
}

function analyzeBulletStrength(
  rawText: string,
  fields?: { verb?: string; task?: string; tools?: string; scale?: string; result?: string }
): BulletStrengthResult {
  const text = (rawText || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = text.length;

  const feedbackList: StrengthItemFeedback[] = [];

  // 1. Action Verb Analysis
  const explicitVerb = fields?.verb ? fields.verb.trim() : '';
  const firstWord = (words[0] || '').replace(/[^a-zA-Z]/g, '');
  const candidateVerb = explicitVerb || firstWord;
  const lowerVerb = candidateVerb.toLowerCase();

  const hasFirstPerson = /\b(I|my|me|we|our)\b/i.test(text);
  const weakMatch = text.match(WEAK_REGEX);
  const isWeak = !!weakMatch || ['did', 'made', 'fixed', 'worked', 'handled', 'helped', 'assisted', 'responsible', 'duties'].includes(lowerVerb);
  const isStrong = !isWeak && !hasFirstPerson && STRONG_VERBS.has(lowerVerb);

  let verbScore = 0;
  let verbLabel = 'No Verb';
  let verbFeedback = 'Enter an action verb to begin your bullet point.';
  let verbSuggestions: string[] = ['Configured', 'Automated', 'Deployed', 'Resolved', 'Provisioned'];

  if (isWeak) {
    const weakWord = (weakMatch ? weakMatch[0] : candidateVerb).toLowerCase();
    verbSuggestions = WEAK_PHRASES_MAP[weakWord] || ['Configured', 'Automated', 'Spearheaded', 'Optimized', 'Resolved'];
  }

  if (!candidateVerb && wordCount === 0) {
    verbScore = 0;
    verbLabel = 'Missing Verb';
    verbFeedback = 'Start your bullet with a decisive past-tense action verb (e.g., Configured, Automated, Deployed).';
    feedbackList.push({
      category: 'verb',
      status: 'warning',
      title: 'Missing Action Verb',
      advice: 'Start with a past-tense action verb (e.g., Configured, Automated, Deployed) to lead with immediate impact.',
    });
  } else if (hasFirstPerson) {
    verbScore = 20;
    verbLabel = 'First-Person Detected';
    verbFeedback = "Avoid 'I', 'my', or 'we'. Resumes use implied first person.";
    feedbackList.push({
      category: 'verb',
      status: 'danger',
      title: 'First-Person Pronouns Detected',
      advice: "Remove personal pronouns ('I', 'my', 'we'). Begin directly with your action verb (e.g. 'Configured...' instead of 'I configured...').",
    });
  } else if (isWeak) {
    verbScore = 30;
    const weakWord = weakMatch ? weakMatch[0] : candidateVerb;
    verbLabel = `Weak Verb ("${weakWord}")`;
    verbFeedback = `Replace passive phrase "${weakWord}" with an active technical verb.`;
    feedbackList.push({
      category: 'verb',
      status: 'danger',
      title: `Weak Action Verb ("${weakWord}")`,
      advice: `Replace "${weakWord}" with high-impact alternatives like ${verbSuggestions.slice(0, 3).join(', ')}.`,
      fixSuggestion: verbSuggestions[0],
    });
  } else if (isStrong) {
    verbScore = 100;
    verbLabel = `High Impact ("${cap(candidateVerb)}")`;
    verbFeedback = `Starts with high-impact technical verb "${cap(candidateVerb)}".`;
    feedbackList.push({
      category: 'verb',
      status: 'good',
      title: `Strong Action Verb ("${cap(candidateVerb)}")`,
      advice: 'Excellent opening verb that demonstrates decisive leadership and technical capability.',
    });
  } else if (candidateVerb.length > 2) {
    verbScore = 75;
    verbLabel = `Active Verb ("${cap(candidateVerb)}")`;
    verbFeedback = `Decent opening verb "${cap(candidateVerb)}". Consider enterprise verbs for greater ATS punch.`;
    feedbackList.push({
      category: 'verb',
      status: 'good',
      title: `Active Verb ("${cap(candidateVerb)}")`,
      advice: 'Good opening verb. For even stronger recruiter response, consider power verbs like Engineered, Spearheaded, or Orchestrated.',
    });
  } else {
    verbScore = 20;
    verbLabel = 'Incomplete Verb';
    verbFeedback = 'Provide a full action verb.';
  }

  // 2. Length Analysis
  let lengthScore = 0;
  let lengthStatus: 'empty' | 'too-short' | 'short' | 'ideal' | 'verbose' | 'too-long' = 'empty';
  let lengthLabel = '0 words';
  let lengthFeedback = 'Add context to see length evaluation.';

  if (wordCount === 0) {
    lengthScore = 0;
    lengthStatus = 'empty';
    lengthLabel = '0 words';
    lengthFeedback = 'Write your bullet to analyze length and density.';
  } else if (wordCount < 6) {
    lengthScore = 30;
    lengthStatus = 'too-short';
    lengthLabel = `${wordCount} words · Too short`;
    lengthFeedback = `Too short (${wordCount} words). Recruiters can't see the depth of your accomplishment.`;
    feedbackList.push({
      category: 'length',
      status: 'danger',
      title: `Too Brief (${wordCount} words)`,
      advice: 'Expand your bullet to at least 10–12 words by adding the environment, tools, or business outcome.',
    });
  } else if (wordCount < 10) {
    lengthScore = 65;
    lengthStatus = 'short';
    lengthLabel = `${wordCount} words · Basic`;
    lengthFeedback = `A bit brief (${wordCount} words). Adding the scope or system will elevate it into the top tier.`;
    feedbackList.push({
      category: 'length',
      status: 'warning',
      title: `Slightly Brief (${wordCount} words)`,
      advice: 'Add scope details (e.g. user counts or systems impacted) to bring it into the optimal 12–24 word zone.',
    });
  } else if (wordCount <= 24) {
    lengthScore = 100;
    lengthStatus = 'ideal';
    lengthLabel = `${wordCount} words · Ideal (12–24)`;
    lengthFeedback = `Optimal length (${wordCount} words). Perfect for executive skimming and ATS parsers.`;
    feedbackList.push({
      category: 'length',
      status: 'good',
      title: `Optimal Length (${wordCount} words)`,
      advice: 'Perfect length for recruiter skimming. Fits neatly on 1–2 resume lines without clutter.',
    });
  } else if (wordCount <= 28) {
    lengthScore = 75;
    lengthStatus = 'verbose';
    lengthLabel = `${wordCount} words · Slightly Long`;
    lengthFeedback = `Slightly long (${wordCount} words). Watch out for wrapping across too many lines.`;
    feedbackList.push({
      category: 'length',
      status: 'warning',
      title: `Slightly Long (${wordCount} words)`,
      advice: 'Consider trimming unnecessary filler words to keep the bullet punchy and under 25 words.',
    });
  } else {
    lengthScore = 35;
    lengthStatus = 'too-long';
    lengthLabel = `${wordCount} words · Run-on`;
    lengthFeedback = `Too verbose (${wordCount} words). Recruiters spend only 6 seconds per resume; keep it punchy.`;
    feedbackList.push({
      category: 'length',
      status: 'danger',
      title: `Run-on Sentence (${wordCount} words)`,
      advice: 'This bullet is too long and risks being skipped. Split into two separate accomplishments or edit below 25 words.',
    });
  }

  // 3. Quantitative Metrics Analysis
  const detectedMetrics = extractMetrics(text);
  const metricCount = detectedMetrics.length;
  let metricsScore = 0;
  let metricsLabel = '0 metrics';
  let metricsFeedback = 'No quantitative metrics found.';

  if (wordCount === 0) {
    metricsScore = 0;
    metricsLabel = '0 metrics';
    metricsFeedback = 'Include quantifiable data to measure results.';
  } else if (metricCount === 0) {
    metricsScore = 10;
    metricsLabel = 'No metrics detected';
    metricsFeedback = 'Missing numbers. Bullets with data get 40% more interview callbacks.';
    feedbackList.push({
      category: 'metrics',
      status: 'danger',
      title: 'Missing Quantitative Metrics',
      advice: 'Add numbers, percentages, ticket volumes, users, or time saved (e.g., "for 250 users", "cutting MTTR by 35%").',
    });
  } else if (metricCount === 1) {
    metricsScore = 70;
    metricsLabel = `1 metric (${detectedMetrics[0]})`;
    metricsFeedback = `Good start with "${detectedMetrics[0]}". Adding a second metric (like % improvement or time saved) completes the picture.`;
    feedbackList.push({
      category: 'metrics',
      status: 'warning',
      title: `Partially Quantified (${detectedMetrics[0]})`,
      advice: `You have 1 metric (${detectedMetrics[0]}). Try pairing scale with a tangible business result (e.g. "% reduction", "hours saved", or "$ saved").`,
    });
  } else {
    metricsScore = 100;
    metricsLabel = `${metricCount} metrics (${detectedMetrics.slice(0, 3).join(', ')})`;
    metricsFeedback = `Excellent quantitative rigor! Verified scale and outcome (${detectedMetrics.slice(0, 3).join(', ')}).`;
    feedbackList.push({
      category: 'metrics',
      status: 'good',
      title: `Strong Quantitative Impact (${metricCount} metrics)`,
      advice: `Outstanding! Verified with ${detectedMetrics.slice(0, 3).join(', ')}. Backing achievements with hard numbers wins interviews.`,
    });
  }

  // Calculate Weighted Total Score:
  // Action Verb: 35%, Length: 30%, Quantitative Metrics: 35%
  let totalScore = Math.round(
    (verbScore * 0.35) +
    (lengthScore * 0.30) +
    (metricsScore * 0.35)
  );

  if (wordCount === 0 && !candidateVerb) {
    totalScore = 0;
  }

  totalScore = Math.max(0, Math.min(100, totalScore));

  let tier: 'Needs Work' | 'Developing' | 'Strong' | 'Exceptional' = 'Needs Work';
  let color = 'var(--bad, #ef4444)';
  let badgeBg = 'rgba(239, 68, 68, 0.12)';

  if (totalScore >= 85) {
    tier = 'Exceptional';
    color = 'var(--good, #10b981)';
    badgeBg = 'rgba(16, 185, 129, 0.14)';
  } else if (totalScore >= 70) {
    tier = 'Strong';
    color = 'var(--accent, #38bdf8)';
    badgeBg = 'rgba(56, 189, 248, 0.14)';
  } else if (totalScore >= 50) {
    tier = 'Developing';
    color = 'var(--amber, #f59e0b)';
    badgeBg = 'rgba(245, 158, 11, 0.14)';
  }

  return {
    score: totalScore,
    tier,
    color,
    badgeBg,
    verbImpact: {
      score: verbScore,
      detectedVerb: candidateVerb,
      isStrong,
      isWeak,
      hasFirstPerson,
      label: verbLabel,
      feedback: verbFeedback,
      suggestions: verbSuggestions,
    },
    lengthAnalysis: {
      score: lengthScore,
      wordCount,
      charCount,
      status: lengthStatus,
      label: lengthLabel,
      feedback: lengthFeedback,
    },
    metricsAnalysis: {
      score: metricsScore,
      detectedMetrics,
      count: metricCount,
      label: metricsLabel,
      feedback: metricsFeedback,
    },
    feedbackList,
  };
}

interface StrengthScoreIndicatorProps {
  strength: BulletStrengthResult;
  draftText?: string;
  onApplyVerb?: (verb: string) => void;
  onCopyDraft?: (text: string) => void;
  title?: string;
  subtitle?: string;
}

export const StrengthScoreIndicator: React.FC<StrengthScoreIndicatorProps> = ({
  strength,
  draftText,
  onApplyVerb,
  onCopyDraft,
  title = "Real-Time Strength Score",
  subtitle = "Live analysis of Action Verb Impact, Length, and Quantitative Metrics",
}) => {
  return (
    <div
      role="region"
      aria-label="Real-time Strength Score Indicator"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: '14px',
        padding: '20px',
        marginTop: '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 14px -2px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header with Title and Overall Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: strength.badgeBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: strength.color,
            }}
          >
            <Gauge size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '2px 0 0' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Overall Score Dial Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: strength.badgeBg,
            border: `1px solid ${strength.color}`,
            borderRadius: '99px',
            padding: '6px 14px',
          }}
        >
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: strength.color, lineHeight: 1 }}>
            {strength.score}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>/100</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: strength.color,
              background: 'var(--card)',
              padding: '2px 8px',
              borderRadius: '99px',
            }}
          >
            {strength.tier}
          </span>
        </div>
      </div>

      {/* Primary Score Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          background: 'var(--bg)',
          borderRadius: '99px',
          overflow: 'hidden',
          marginTop: '14px',
          border: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            width: `${strength.score}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${strength.color}, var(--brand))`,
            borderRadius: '99px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* 3 Core Pillars Analysis Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        {/* Pillar 1: Action Verb Impact */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--brand)" aria-hidden="true" /> Action Verb Impact
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: strength.verbImpact.score >= 80 ? 'var(--good, #10b981)' : strength.verbImpact.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
              }}
            >
              {strength.verbImpact.score}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--card)',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${strength.verbImpact.score}%`,
                height: '100%',
                background: strength.verbImpact.score >= 80 ? 'var(--good, #10b981)' : strength.verbImpact.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
                borderRadius: '99px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            {strength.verbImpact.label}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
            {strength.verbImpact.feedback}
          </p>

          {/* Quick-apply verb suggestions if weak or incomplete */}
          {strength.verbImpact.isWeak && onApplyVerb && strength.verbImpact.suggestions.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>Quick fix:</span>
              {strength.verbImpact.suggestions.slice(0, 3).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onApplyVerb(v)}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--card)',
                    border: '1px solid var(--brand)',
                    color: 'var(--brand)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Use &quot;{v}&quot;
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pillar 2: Length & Structure */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="var(--brand)" aria-hidden="true" /> Length & Conciseness
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: strength.lengthAnalysis.score >= 80 ? 'var(--good, #10b981)' : strength.lengthAnalysis.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
              }}
            >
              {strength.lengthAnalysis.score}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--card)',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${strength.lengthAnalysis.score}%`,
                height: '100%',
                background: strength.lengthAnalysis.score >= 80 ? 'var(--good, #10b981)' : strength.lengthAnalysis.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
                borderRadius: '99px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            {strength.lengthAnalysis.label}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
            {strength.lengthAnalysis.feedback}
          </p>
          <div style={{ marginTop: '6px', fontSize: '0.7rem', color: 'var(--muted)' }}>
            Target: 12–24 words ({strength.lengthAnalysis.charCount} characters)
          </div>
        </div>

        {/* Pillar 3: Quantitative Metrics */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="var(--brand)" aria-hidden="true" /> Quantitative Metrics
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: strength.metricsAnalysis.score >= 80 ? 'var(--good, #10b981)' : strength.metricsAnalysis.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
              }}
            >
              {strength.metricsAnalysis.score}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--card)',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${strength.metricsAnalysis.score}%`,
                height: '100%',
                background: strength.metricsAnalysis.score >= 80 ? 'var(--good, #10b981)' : strength.metricsAnalysis.score >= 50 ? 'var(--amber, #f59e0b)' : 'var(--bad, #ef4444)',
                borderRadius: '99px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            {strength.metricsAnalysis.label}
          </div>

          {strength.metricsAnalysis.detectedMetrics.length > 0 ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '4px' }}>
              {strength.metricsAnalysis.detectedMetrics.map((dm, idx) => (
                <span
                  key={idx}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}
                >
                  {dm}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
              {strength.metricsAnalysis.feedback}
            </p>
          )}
        </div>
      </div>

      {/* Live Composite Draft Box (if user has started typing) */}
      {draftText && draftText.trim().length > 0 && (
        <div
          style={{
            marginTop: '16px',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Bullet Draft Preview
            </span>
            {onCopyDraft && (
              <button
                type="button"
                onClick={() => onCopyDraft(draftText)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <Copy size={12} aria-hidden="true" /> Copy Draft
              </button>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '0.88rem',
              color: 'var(--text)',
              lineHeight: '1.5',
              wordBreak: 'break-word',
            }}
          >
            {draftText}
          </p>
        </div>
      )}

      {/* Immediate Actionable Feedback / How to Improve Section */}
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Sparkles size={16} color="var(--brand)" aria-hidden="true" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Immediate Feedback & Improvement Guidance
          </h4>
        </div>

        {strength.feedbackList.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
            Enter your action verb and task description above to see instant feedback.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {strength.feedbackList.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {item.status === 'good' ? (
                    <CheckCircle2 size={16} color="var(--good, #10b981)" aria-hidden="true" />
                  ) : item.status === 'warning' ? (
                    <AlertTriangle size={16} color="var(--amber, #f59e0b)" aria-hidden="true" />
                  ) : (
                    <AlertCircle size={16} color="var(--bad, #ef4444)" aria-hidden="true" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                    {item.title}
                  </div>
                  <div style={{ color: 'var(--muted)', lineHeight: '1.4' }}>
                    {item.advice}
                  </div>
                </div>
                {item.fixSuggestion && onApplyVerb && (
                  <button
                    type="button"
                    onClick={() => onApplyVerb(item.fixSuggestion!)}
                    style={{
                      background: 'var(--brand)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      alignSelf: 'center',
                    }}
                  >
                    Fix: &quot;{item.fixSuggestion}&quot;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function calculateImpactPotential(bullet: string): { score: number; label: string; color: string } {
  const analysis = analyzeBulletStrength(bullet);
  return {
    score: analysis.score,
    label: `${analysis.tier} (${analysis.metricsAnalysis.count} metrics · ${analysis.lengthAnalysis.wordCount} words)`,
    color: analysis.color,
  };
}

const WEAK_PHRASES_MAP: Record<string, string[]> = {
  'did': ['Executed', 'Engineered', 'Completed', 'Built'],
  'made': ['Created', 'Developed', 'Generated', 'Constructed'],
  'fixed': ['Resolved', 'Troubleshot', 'Remediated', 'Restored'],
  'worked': ['Collaborated', 'Engineered', 'Developed', 'Implemented'],
  'handled': ['Managed', 'Resolved', 'Triaged', 'Administered'],
  'helped': ['Supported', 'Facilitated', 'Enabled', 'Coordinated'],
  'assisted': ['Coordinated', 'Supported', 'Collaborated', 'Facilitated'],
  'responsible for': ['Managed', 'Spearheaded', 'Executed', 'Administered'],
  'duties included': ['Executed', 'Administered', 'Maintained', 'Delivered'],
  'good': ['Robust', 'Optimized', 'High-performance', 'Scalable'],
};

const ENTERPRISE_ROLE_SYNONYMS: Record<string, Record<string, string[]>> = {
  'Help desk / service desk': {
    'helped': ['Facilitated', 'Enabled', 'Supported', 'Coordinated'],
    'fixed': ['Resolved', 'Restored', 'Triaged', 'Remediated'],
    'did': ['Executed', 'Delivered', 'Resolved', 'Processed'],
    'handled': ['Managed', 'Triaged', 'Administered', 'Resolved'],
  },
  'Field technician': {
    'helped': ['Assisted', 'Supported', 'Coordinated', 'Onboarded'],
    'fixed': ['Repaired', 'Replaced', 'Commissioned', 'Upgraded'],
    'did': ['Installed', 'Deployed', 'Configured', 'Cabled'],
    'handled': ['Managed', 'Serviced', 'Diagnosed', 'Maintained'],
  },
  'Network engineer': {
    'helped': ['Architected', 'Engineered', 'Optimized', 'Collaborated'],
    'fixed': ['Troubleshot', 'Remediated', 'Restored', 'Secured'],
    'did': ['Configured', 'Segmented', 'Migrated', 'Designed'],
    'handled': ['Administered', 'Monitored', 'Optimized', 'Secured'],
  },
  'System administrator': {
    'helped': ['Enabled', 'Coordinated', 'Supported', 'Collaborated'],
    'fixed': ['Patched', 'Hardened', 'Restored', 'Remediated'],
    'did': ['Administered', 'Automated', 'Provisioned', 'Migrated'],
    'handled': ['Managed', 'Maintained', 'Orchestrated', 'Controlled'],
  },
  'Cloud / DevOps': {
    'helped': ['Collaborated', 'Enabled', 'Accelerated', 'Integrated'],
    'fixed': ['Remediated', 'Resolved', 'Optimized', 'Debugged'],
    'did': ['Automated', 'Deployed', 'Containerized', 'Orchestrated'],
    'handled': ['Scaled', 'Provisioned', 'Monitored', 'Managed'],
  },
  'Security': {
    'helped': ['Advised', 'Coordinated', 'Collaborated', 'Supported'],
    'fixed': ['Remediated', 'Mitigated', 'Patched', 'Resolved'],
    'did': ['Hardened', 'Audited', 'Investigated', 'Enforced'],
    'handled': ['Monitored', 'Detected', 'Evaluated', 'Responded'],
  },
};

const IT_BULLET_TEMPLATES = [
  {
    category: 'Cloud Migration',
    bullets: [
      'Migrated 14 legacy Windows Server VMs to AWS EC2 instances, reducing monthly infrastructure costs by 28% and ensuring zero downtime.',
      'Orchestrated containerized microservices deployment on Kubernetes (EKS) across 3 environments, accelerating release velocity by 40%.',
    ],
  },
  {
    category: 'Help Desk Automation',
    bullets: [
      'Automated onboarding workflows in Active Directory and Microsoft 365, cutting new hire provisioning time from 4 hours to 15 minutes for 300+ staff.',
      'Resolved 1,200+ tier 1/2 service desk tickets annually via ServiceNow with a 96% customer satisfaction rating and record first-call resolution.',
    ],
  },
  {
    category: 'Network Hardening',
    bullets: [
      'Configured VLAN segmentation and firewalls across Cisco Meraki switches for 250 users across 3 sites, reducing network security incidents by 35%.',
      'Monitored and optimized BGP/OSPF routing protocols across enterprise WAN links, improving uptime to 99.99%.',
    ],
  },
  {
    category: 'Security & Compliance',
    bullets: [
      'Executed vulnerability audits and deployed endpoint hardening policies via Microsoft Intune across 500 endpoints, achieving 100% compliance.',
      'Investigated and remediated security alerts in SIEM (Splunk), isolating compromised endpoints within 15 minutes of detection.',
    ],
  },
  {
    category: 'System Administration & Backup',
    bullets: [
      'Provisioned nightly automated Veeam backups for 40 virtualized workloads and verified monthly disaster recovery restores.',
      'Administered Group Policy Objects (GPOs) and Active Directory permissions for 800 domain users across 2 forest domains.',
    ],
  },
];

function getSuggestionsForText(text: string): { weakWord: string; suggestions: string[] } | null {
  const lower = text.toLowerCase();
  for (const [weak, strongList] of Object.entries(WEAK_PHRASES_MAP)) {
    if (new RegExp(`\\b${weak}\\b`, 'i').test(lower)) {
      return { weakWord: weak, suggestions: strongList };
    }
  }
  return null;
}

export interface BatchGeneratedItem {
  id: string;
  originalText: string;
  category: string;
  isRole: boolean;
  detectedRole?: string;
  selectedStyle: 'Standard' | 'Impact-first' | 'ATS-Compact';
  styles: {
    Standard: string;
    'Impact-first': string;
    'ATS-Compact': string;
  };
  currentBullet: string;
  strength: BulletStrengthResult;
}

export const STANDARD_CATEGORIES = [
  'Leadership',
  'Project Management',
  'Technical Troubleshooting',
  'Infrastructure & Cloud',
  'Security & Compliance',
  'Service Desk & Support',
  'General IT',
] as const;

export type ResumeCategory = typeof STANDARD_CATEGORIES[number];

export const CATEGORY_ORDER: Record<string, number> = {
  'Leadership': 1,
  'Project Management': 2,
  'Technical Troubleshooting': 3,
  'Infrastructure & Cloud': 4,
  'Security & Compliance': 5,
  'Service Desk & Support': 6,
  'General IT': 7,
};

export const CATEGORY_META: Record<string, { icon: string; bg: string; color: string; border: string }> = {
  Leadership: {
    icon: '👑',
    bg: 'rgba(234, 179, 8, 0.12)',
    color: 'var(--amber, #d97706)',
    border: 'rgba(234, 179, 8, 0.35)',
  },
  'Project Management': {
    icon: '📋',
    bg: 'rgba(99, 102, 241, 0.12)',
    color: '#6366f1',
    border: 'rgba(99, 102, 241, 0.35)',
  },
  'Technical Troubleshooting': {
    icon: '🔧',
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  'Infrastructure & Cloud': {
    icon: '☁️',
    bg: 'rgba(14, 165, 233, 0.12)',
    color: '#0284c7',
    border: 'rgba(14, 165, 233, 0.35)',
  },
  'Security & Compliance': {
    icon: '🛡️',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  'Service Desk & Support': {
    icon: '🎧',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#9333ea',
    border: 'rgba(168, 85, 247, 0.35)',
  },
  'General IT': {
    icon: '💻',
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#475569',
    border: 'rgba(100, 116, 139, 0.35)',
  },
};

export function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || {
    icon: '🏷️',
    bg: 'rgba(100, 116, 139, 0.12)',
    color: 'var(--brand)',
    border: 'rgba(56, 189, 248, 0.35)',
  };
}

export function detectCategory(text: string, defaultCat: string = 'auto'): string {
  // 1. Bracket format: [Category] ...
  const bracketMatch = text.match(/^\s*\[([^\]]+)\]/);
  if (bracketMatch && bracketMatch[1].trim()) {
    const rawCat = bracketMatch[1].trim();
    const found = STANDARD_CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase());
    return found || cap(rawCat);
  }

  // 2. Colon prefix format: Category: ...
  const colonMatch = text.match(/^\s*([A-Za-z\s&/-]{3,30})\s*:\s*(.+)$/);
  if (colonMatch) {
    const candidate = colonMatch[1].trim();
    const found = STANDARD_CATEGORIES.find(c => c.toLowerCase() === candidate.toLowerCase());
    if (found) {
      return found;
    }
  }

  // 3. User explicit fallback default category if not auto
  if (defaultCat && defaultCat !== 'auto' && defaultCat !== 'Auto-detect') {
    return defaultCat;
  }

  // 4. Keyword-based intelligent classifier
  const lower = text.toLowerCase();
  if (/(?:lead|led|mentor|mentoring|direct|coach|manage[ds]?|manager|head of|chief|supervis|budget|stakeholder|cross-functional|hire|hiring|train|training)/i.test(lower)) {
    return 'Leadership';
  }
  if (/(?:project|migration|rollout|agile|scrum|sprint|lifecycle|milestone|delivered|timeline|vendor contract|rfp|procurement|sla definition)/i.test(lower)) {
    return 'Project Management';
  }
  if (/(?:troubleshot|troubleshoot|diagnos|root cause|outage|packet loss|triage|incident|ticket|flapping|latency|break-fix|debug|vpn disconnect)/i.test(lower)) {
    return 'Technical Troubleshooting';
  }
  if (/(?:cloud|aws|azure|gcp|vmware|esxi|hyper-v|vlan|switch|router|cisco|meraki|bgp|ospf|active directory|veeam|backup|kubernetes|docker|terraform|ansible|storage|san|nas)/i.test(lower)) {
    return 'Infrastructure & Cloud';
  }
  if (/(?:secur|splunk|siem|soc|audit|compliance|vulnerability|firewall|hardening|cve|crowdstrike|palo alto|fortinet|iso 27001|soc 2|nist|hipaa|edr|xdr)/i.test(lower)) {
    return 'Security & Compliance';
  }
  if (/(?:help desk|service desk|onboard|offboard|password|servicenow|jira|zendesk|laptop|desktop|printer|zoom|teams|audio visual|av|user support|tier 1|tier 2|tier 3)/i.test(lower)) {
    return 'Service Desk & Support';
  }

  return 'Technical Troubleshooting';
}

export function extractCategoryAndClean(rawLine: string, defaultCat: string = 'auto') {
  let line = rawLine.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
  let category = '';

  // Bracket format: [Category] ...
  const bracketMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    const rawCat = bracketMatch[1].trim();
    const found = STANDARD_CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase());
    category = found || cap(rawCat);
    line = bracketMatch[2].trim();
  } else {
    // Colon format: Category: ...
    const colonMatch = line.match(/^([A-Za-z\s&/-]{3,30}):\s*(.+)$/);
    if (colonMatch) {
      const candidate = colonMatch[1].trim();
      const found = STANDARD_CATEGORIES.find(c => c.toLowerCase() === candidate.toLowerCase());
      if (found) {
        category = found;
        line = colonMatch[2].trim();
      }
    }
  }

  if (!category) {
    category = detectCategory(line, defaultCat);
  }

  return { category, cleanedLine: line };
}

export function sortBatchItems(items: BatchGeneratedItem[], sortBy: 'category' | 'input' = 'category'): BatchGeneratedItem[] {
  if (sortBy === 'input') {
    return [...items];
  }
  return [...items].sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.category] || 99;
    const orderB = CATEGORY_ORDER[b.category] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.category.localeCompare(b.category);
  });
}

const ROLE_ACCOMPLISHMENTS: Record<string, { verb: string; task: string; tools: string; scale: string; result: string }> = {
  'Help desk / service desk': {
    verb: 'Resolved',
    task: 'tier 1 and tier 2 hardware, desktop, and software service requests in ServiceNow',
    tools: 'ServiceNow, Microsoft 365, Active Directory',
    scale: 'for 450+ enterprise users across 2 office sites',
    result: 'maintaining a 98% customer satisfaction rating and exceeding first-call resolution SLAs by 15%',
  },
  'Field technician': {
    verb: 'Deployed',
    task: 'and commissioned rack infrastructure, Cisco Meraki access points, and structured Cat6A cabling',
    tools: 'Cisco Meraki, Fluke CableIQ, Jamf',
    scale: 'across 8 branch locations for 300+ workstations',
    result: 'completing multi-branch hardware rollouts on schedule with zero post-dispatch return visits',
  },
  'Network engineer': {
    verb: 'Configured',
    task: 'VLAN segmentation, BGP/OSPF dynamic routing, and enterprise firewall ACLs',
    tools: 'Cisco Catalyst, Meraki MX, Wireshark',
    scale: 'for 600+ network nodes across 4 enterprise sites',
    result: 'reducing packet loss by 35% and guaranteeing 99.99% high-availability network uptime',
  },
  'System administrator': {
    verb: 'Administered',
    task: 'Active Directory domain controllers, Group Policy Objects, and nightly Veeam automated backup schedules',
    tools: 'Windows Server, Active Directory, VMware ESXi, Veeam',
    scale: 'across 45 virtual servers supporting 800 domain users',
    result: 'achieving 100% disaster recovery compliance and eliminating unplanned downtime',
  },
  'Cloud / DevOps': {
    verb: 'Orchestrated',
    task: 'containerized microservices infrastructure and automated CI/CD deployment pipelines',
    tools: 'AWS EC2/EKS, Docker, Kubernetes, Terraform',
    scale: 'across 3 multi-region cloud production environments',
    result: 'reducing monthly cloud compute expenses by 28% while accelerating release velocity by 3x',
  },
  'Security': {
    verb: 'Hardened',
    task: 'endpoint security baselines and investigated real-time SIEM alerts in Splunk',
    tools: 'Splunk, Microsoft Intune, CrowdStrike, Wireshark',
    scale: 'across 750+ enterprise workstations and mobile devices',
    result: 'isolating compromised endpoints within 15 minutes and maintaining 100% audit compliance',
  },
};

const BATCH_PRESETS = [
  {
    name: 'Categorized Roles & Tasks',
    entries: [
      '[Leadership] Mentored 5 junior sysadmins and instituted weekly tier-2 escalation review sessions',
      '[Leadership] Led cross-functional incident response team during core datacenter migration',
      '[Project Management] Spearheaded cloud migration of 40 on-prem Windows VMs to AWS EC2 under budget',
      '[Project Management] Directed hardware lifecycle replacement and vendor procurement for 350 workstations',
      '[Technical Troubleshooting] Diagnosed and resolved critical core switch outage and BGP route flapping within 20 minutes',
      '[Technical Troubleshooting] Triaged complex ServiceNow incidents, isolating root cause and cutting MTTR by 45%',
      '[Infrastructure & Cloud] Orchestrated Kubernetes microservices and automated CI/CD deployment pipelines',
      '[Security & Compliance] Hardened endpoint baseline configurations and conducted quarterly SOC 2 compliance audits',
    ],
  },
  {
    name: 'Help Desk / Desktop',
    entries: [
      '[Service Desk & Support] Responsible for Active Directory user onboarding, offboarding, and password resets',
      '[Technical Troubleshooting] Triaged and resolved ServiceNow tier 1/2 hardware, Outlook, and VPN incidents',
      '[Infrastructure & Cloud] Deployed Windows 11 enterprise laptop images using Microsoft Intune and SCCM',
      '[Service Desk & Support] Configured and supported network multi-function printers and VoIP phones across 2 office floors',
    ],
  },
  {
    name: 'Network & Infrastructure',
    entries: [
      '[Infrastructure & Cloud] Configured VLAN segmentation and dynamic routing on Cisco Meraki switches and firewalls',
      '[Technical Troubleshooting] Monitored enterprise WAN and LAN links, isolating port flapping and duplex mismatches via CLI',
      '[Infrastructure & Cloud] Terminated and certified Cat6A patch panel connections adhering to ANSI/TIA standards',
      '[Security & Compliance] Hardened firewall ACLs and deployed secure remote-access IPSec VPN tunnels',
    ],
  },
  {
    name: 'Systems & Cloud',
    entries: [
      '[Infrastructure & Cloud] Administered 40 virtual servers on VMware ESXi with automated Veeam backup schedules',
      '[Project Management] Migrated legacy on-prem Windows Server 2012 VMs to AWS EC2 instances with zero downtime',
      '[Security & Compliance] Automated user provisioning and GPO security hardening baselines across domain controllers',
      '[Infrastructure & Cloud] Containerized internal web microservices using Docker and orchestrated deployments on Kubernetes',
    ],
  },
  {
    name: 'List of IT Roles',
    entries: [
      '[Leadership] IT Systems Lead',
      '[Technical Troubleshooting] Field Technician',
      '[Infrastructure & Cloud] Network Engineer',
      '[Infrastructure & Cloud] System Administrator',
      '[Service Desk & Support] Help Desk Analyst',
      '[Infrastructure & Cloud] Cloud / DevOps Engineer',
      '[Security & Compliance] Cybersecurity Specialist',
      '[Project Management] IT Project Manager',
    ],
  },
];

function optimizeBatchEntry(
  rawLine: string,
  rolePreference: string,
  defaultStyle: 'Standard' | 'Impact-first' | 'ATS-Compact' = 'Standard',
  defaultCategory: string = 'auto'
): {
  category: string;
  isRole: boolean;
  detectedRole?: string;
  styles: {
    Standard: string;
    'Impact-first': string;
    'ATS-Compact': string;
  };
} {
  const { category, cleanedLine } = extractCategoryAndClean(rawLine, defaultCategory);
  const clean = cleanedLine.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
  const lower = clean.toLowerCase();

  // 1. Check if line is a Role Title (e.g. "Network Engineer", "Field Technician", "Help Desk")
  const roleMatch = Object.entries(ROLE_ACCOMPLISHMENTS).find(([roleKey]) => {
    const rLower = roleKey.toLowerCase();
    const parts = rLower.split(/\s*[\/\-]\s*/);
    return parts.some(p => lower === p || lower.includes(p + ' engineer') || lower.includes(p + ' technician') || lower.includes(p + ' specialist') || lower.includes(p + ' analyst') || lower.includes(p + ' lead') || lower.includes(p + ' administrator') || lower.includes(p + ' admin'));
  });

  const isShortRoleTitle = clean.split(/\s+/).length <= 4 && /(technician|engineer|administrator|admin|analyst|specialist|architect|desk|support|security)/i.test(clean);

  if (roleMatch || isShortRoleTitle) {
    let key = roleMatch ? roleMatch[0] : 'Help desk / service desk';
    if (!roleMatch) {
      if (/network|cisco|switch|router/i.test(lower)) key = 'Network engineer';
      else if (/cloud|devops|aws|docker|kubernetes/i.test(lower)) key = 'Cloud / DevOps';
      else if (/security|cyber|soc|siem/i.test(lower)) key = 'Security';
      else if (/system|server|linux|windows/i.test(lower)) key = 'System administrator';
      else if (/field|cabling|hardware|rack/i.test(lower)) key = 'Field technician';
      else key = 'Help desk / service desk';
    }

    const tpl = ROLE_ACCOMPLISHMENTS[key];
    const styles = {
      Standard: `${tpl.verb} ${tpl.task} using ${tpl.tools} ${tpl.scale}, resulting in ${tpl.result}.`,
      'Impact-first': `${cap(tpl.result)} — ${tpl.verb.toLowerCase()} ${tpl.task} using ${tpl.tools} ${tpl.scale}.`,
      'ATS-Compact': `${tpl.verb} ${tpl.task} (${tpl.tools}); ${tpl.scale}; ${tpl.result}.`,
    };

    return {
      category,
      isRole: true,
      detectedRole: key,
      styles,
    };
  }

  // 2. It is a Task or Responsibility description
  let text = clean;
  // Strip passive / weak prefixes
  const weakPrefixes = [
    /^responsible for\s+(managing|handling|overseeing|maintaining|monitoring|provisioning)?\s*/i,
    /^helped( with| to)?\s*/i,
    /^assisted( with| in)?\s*/i,
    /^duties (included|were)\s*/i,
    /^worked on\s*/i,
    /^handled\s*/i,
    /^involved in\s*/i,
    /^in charge of\s*/i,
    /^my job was to\s*/i,
  ];

  for (const wp of weakPrefixes) {
    if (wp.test(text)) {
      text = text.replace(wp, '');
      break;
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  const firstWord = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');

  let verb = '';
  let task = text;

  // Gerund map
  const gerundMap: Record<string, string> = {
    managing: 'Managed',
    configuring: 'Configured',
    troubleshooting: 'Troubleshot and resolved',
    deploying: 'Deployed',
    resolving: 'Resolved',
    patching: 'Patched',
    monitoring: 'Monitored and maintained',
    migrating: 'Migrated',
    automating: 'Automated',
    installing: 'Installed',
    supporting: 'Supported',
    administering: 'Administered',
    hardening: 'Hardened',
    provisioning: 'Provisioned',
    auditing: 'Audited',
    upgrading: 'Upgraded',
    cabling: 'Cabled and certified',
    testing: 'Tested and verified',
    segmenting: 'Segmented',
    orchestrating: 'Orchestrated',
  };

  if (gerundMap[firstWord]) {
    verb = gerundMap[firstWord];
    task = words.slice(1).join(' ');
  } else if (STRONG_VERBS.has(firstWord)) {
    verb = cap(firstWord);
    task = words.slice(1).join(' ');
  } else if (['did', 'fixed', 'made', 'worked', 'handled'].includes(firstWord)) {
    if (firstWord === 'fixed') verb = 'Resolved';
    else if (firstWord === 'did') verb = 'Executed';
    else if (firstWord === 'made') verb = 'Engineered';
    else if (firstWord === 'handled') verb = 'Managed';
    else verb = 'Collaborated on';
    task = words.slice(1).join(' ');
  } else {
    // Infer authoritative verb based on keywords or role preference
    if (rolePreference !== 'auto' && ROLES[rolePreference]) {
      verb = ROLES[rolePreference][0];
    } else if (/active directory|ad|user|account|onboard|password|idrac|intune/i.test(text)) {
      verb = 'Automated';
    } else if (/cisco|vlan|switch|router|network|firewall|bgp|ospf|wifi|meraki/i.test(text)) {
      verb = 'Configured';
    } else if (/server|linux|windows|backup|veeam|vmware|vm|hyper-v|patch/i.test(text)) {
      verb = 'Administered';
    } else if (/ticket|laptop|desktop|hardware|printer|servicenow|jira|desk/i.test(text)) {
      verb = 'Triaged and resolved';
    } else if (/cloud|aws|azure|docker|kubernetes|terraform|devops/i.test(text)) {
      verb = 'Orchestrated';
    } else if (/security|splunk|siem|compliance|audit|vulnerability/i.test(text)) {
      verb = 'Hardened';
    } else {
      verb = 'Implemented';
    }
  }

  // Detect tools
  const lowerTask = task.toLowerCase();
  const matchedTools = TOOLS_LIST.filter(t => lowerTask.includes(t.toLowerCase()));
  let toolsStr = matchedTools.slice(0, 2).map(cap).join(', ');

  // If tools already mentioned in the task body, avoid duplicate "using Active directory"
  if (toolsStr && lowerTask.includes(toolsStr.toLowerCase())) {
    toolsStr = '';
  }

  // Check if text already has numbers
  const hasNumbers = /\d/.test(task);
  let scaleStr = '';
  let resultStr = '';

  if (hasNumbers) {
    if (!/resulting in|reduced|increased|cutting|improving|achieving|guaranteeing/i.test(task)) {
      resultStr = 'improving overall system reliability and eliminating repeat incidents';
    }
  } else {
    // Supply realistic verified enterprise scale and result metrics
    if (/active directory|ad|user|account|onboard|password/i.test(text)) {
      scaleStr = 'for 250+ enterprise users';
      resultStr = 'cutting onboarding turnaround time from 4 hours to 15 minutes';
      if (!toolsStr && !lowerTask.includes('active directory')) toolsStr = 'Active Directory, Microsoft 365';
    } else if (/cisco|vlan|switch|router|network|firewall|meraki/i.test(text)) {
      scaleStr = 'across 3 branch offices for 350+ endpoints';
      resultStr = 'improving network throughput by 35% and achieving 99.99% uptime';
      if (!toolsStr && !lowerTask.includes('cisco')) toolsStr = 'Cisco Meraki, Wireshark';
    } else if (/ticket|hardware|laptop|desktop|printer|servicenow|jira/i.test(text)) {
      scaleStr = 'for 400+ internal staff';
      resultStr = 'maintaining a 96% first-contact resolution (FCR) rate and reducing ticket backlog by 40%';
      if (!toolsStr && !lowerTask.includes('servicenow')) toolsStr = 'ServiceNow, Jamf';
    } else if (/server|vmware|backup|veeam|hyper-v|linux|windows server/i.test(text)) {
      scaleStr = 'across 35+ virtual servers';
      resultStr = 'achieving 100% disaster recovery compliance and ensuring zero data loss';
      if (!toolsStr && !lowerTask.includes('veeam')) toolsStr = 'Windows Server, Veeam';
    } else if (/cloud|aws|azure|docker|kubernetes|terraform/i.test(text)) {
      scaleStr = 'across 3 multi-tier production environments';
      resultStr = 'reducing cloud compute overhead by 28% while accelerating release cycles by 3x';
      if (!toolsStr && !lowerTask.includes('aws')) toolsStr = 'AWS, Docker';
    } else if (/security|splunk|siem|vulnerability|audit/i.test(text)) {
      scaleStr = 'across 600+ network nodes';
      resultStr = 'isolating critical security threats within 15 minutes of detection';
      if (!toolsStr && !lowerTask.includes('splunk')) toolsStr = 'Splunk, Microsoft Intune';
    } else {
      scaleStr = 'across 200+ systems';
      resultStr = 'bolstering operational uptime by 30% and optimizing workflow efficiency';
    }
  }

  task = task.replace(/[.,;:\s]+$/, '').trim();

  // If task already has "using" or "for", avoid awkward repetition
  const hasUsingInTask = /\busing\b/i.test(task);
  const hasForInTask = /\bfor\b/i.test(task);

  const finalTools = hasUsingInTask ? '' : toolsStr;
  const finalScale = hasForInTask ? '' : scaleStr;

  const tStr = finalTools ? ` using ${finalTools}` : '';
  const sStr = finalScale ? ` ${finalScale}` : '';
  const rStr = resultStr ? `, resulting in ${resultStr}` : '';

  const standard = `${verb} ${task}${tStr}${sStr}${rStr}.`.replace(/\s+/g, ' ');
  const impactFirst = resultStr
    ? `${cap(resultStr)} — ${verb.toLowerCase()} ${task}${tStr}${sStr}.`.replace(/\s+/g, ' ')
    : standard;
  const atsCompact = `${verb} ${task}${finalTools ? ' (' + finalTools + ')' : ''}${finalScale ? '; ' + finalScale : ''}${resultStr ? '; ' + resultStr : ''}.`.replace(/\s+/g, ' ');

  return {
    category,
    isRole: false,
    styles: {
      Standard: standard,
      'Impact-first': impactFirst,
      'ATS-Compact': atsCompact,
    },
  };
}

export const ITResumeBulletBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'batch' | 'check' | 'saved'>('build');
  const [role, setRole] = useState(Object.keys(ROLES)[0]);
  // Undo / Redo Stacks for 'Action Verb' and 'Task/Scope'
  const initialVerb = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('rb_verb') || '';
      } catch {
        return '';
      }
    }
    return '';
  }, []);

  const initialTask = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('rb_task') || '';
      } catch {
        return '';
      }
    }
    return '';
  }, []);

  const [verb, setVerbState] = useState(initialVerb);
  const [task, setTaskState] = useState(initialTask);

  // Undo / Redo Stacks (recording snapshots of { verb, task })
  const pastRef = useRef<Array<{ verb: string; task: string }>>([]);
  const futureRef = useRef<Array<{ verb: string; task: string }>>([]);
  const [pastCount, setPastCount] = useState(0);
  const [futureCount, setFutureCount] = useState(0);

  // Baseline ref tracks the anchor state in history before a burst of user typing
  const baselineRef = useRef<{ verb: string; task: string }>({ verb: initialVerb, task: initialTask });
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRef = useRef<{ verb: string; task: string }>({ verb: initialVerb, task: initialTask });

  useEffect(() => {
    currentRef.current = { verb, task };
  }, [verb, task]);

  // Synchronize history counts for reactive UI updates
  const syncHistoryState = useCallback(() => {
    setPastCount(pastRef.current.length);
    setFutureCount(futureRef.current.length);
  }, []);

  // Flush any pending typing changes into the past stack
  const flushTypingSnapshot = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    const curr = currentRef.current;
    const base = baselineRef.current;
    if (curr.verb !== base.verb || curr.task !== base.task) {
      pastRef.current = [...pastRef.current.slice(-49), { ...base }];
      futureRef.current = [];
      baselineRef.current = { ...curr };
      syncHistoryState();
    }
  }, [syncHistoryState]);

  // Update verb via typing (debounced history snapshot)
  const setVerbTyping = useCallback((newVerb: string) => {
    setVerbState(newVerb);
    currentRef.current.verb = newVerb;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      const curr = currentRef.current;
      const base = baselineRef.current;
      if (curr.verb !== base.verb || curr.task !== base.task) {
        pastRef.current = [...pastRef.current.slice(-49), { ...base }];
        futureRef.current = [];
        baselineRef.current = { ...curr };
        syncHistoryState();
      }
    }, 450);
  }, [syncHistoryState]);

  // Update task via typing (debounced history snapshot)
  const setTaskTyping = useCallback((newTask: string) => {
    setTaskState(newTask);
    currentRef.current.task = newTask;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      const curr = currentRef.current;
      const base = baselineRef.current;
      if (curr.verb !== base.verb || curr.task !== base.task) {
        pastRef.current = [...pastRef.current.slice(-49), { ...base }];
        futureRef.current = [];
        baselineRef.current = { ...curr };
        syncHistoryState();
      }
    }, 450);
  }, [syncHistoryState]);

  // Discrete changes (chips, synonyms, suggestions, etc.) immediately commit to history
  const setVerb = useCallback((newVerb: string) => {
    flushTypingSnapshot();
    const curr = currentRef.current;
    if (curr.verb !== newVerb) {
      pastRef.current = [...pastRef.current.slice(-49), { ...curr }];
      futureRef.current = [];
      const next = { ...curr, verb: newVerb };
      baselineRef.current = next;
      currentRef.current = next;
      setVerbState(newVerb);
      syncHistoryState();
    }
  }, [flushTypingSnapshot, syncHistoryState]);

  const setTask = useCallback((newTask: string) => {
    flushTypingSnapshot();
    const curr = currentRef.current;
    if (curr.task !== newTask) {
      pastRef.current = [...pastRef.current.slice(-49), { ...curr }];
      futureRef.current = [];
      const next = { ...curr, task: newTask };
      baselineRef.current = next;
      currentRef.current = next;
      setTaskState(newTask);
      syncHistoryState();
    }
  }, [flushTypingSnapshot, syncHistoryState]);

  const setDraft = useCallback((newVerb: string, newTask: string) => {
    flushTypingSnapshot();
    const curr = currentRef.current;
    if (curr.verb !== newVerb || curr.task !== newTask) {
      pastRef.current = [...pastRef.current.slice(-49), { ...curr }];
      futureRef.current = [];
      const next = { verb: newVerb, task: newTask };
      baselineRef.current = next;
      currentRef.current = next;
      setVerbState(newVerb);
      setTaskState(newTask);
      syncHistoryState();
    }
  }, [flushTypingSnapshot, syncHistoryState]);

  // Undo recent changes to verb or task
  const handleUndo = useCallback((): boolean => {
    flushTypingSnapshot();
    if (pastRef.current.length === 0) return false;

    const targetState = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [{ ...currentRef.current }, ...futureRef.current];

    baselineRef.current = targetState;
    currentRef.current = targetState;
    setVerbState(targetState.verb);
    setTaskState(targetState.task);
    syncHistoryState();

    return true;
  }, [flushTypingSnapshot, syncHistoryState]);

  // Redo recent changes to verb or task
  const handleRedo = useCallback((): boolean => {
    flushTypingSnapshot();
    if (futureRef.current.length === 0) return false;

    const targetState = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(-49), { ...currentRef.current }];

    baselineRef.current = targetState;
    currentRef.current = targetState;
    setVerbState(targetState.verb);
    setTaskState(targetState.task);
    syncHistoryState();

    return true;
  }, [flushTypingSnapshot, syncHistoryState]);

  const hasUnflushedTyping = (verb !== baselineRef.current.verb || task !== baselineRef.current.task);
  const canUndo = pastCount > 0 || hasUnflushedTyping;
  const canRedo = futureCount > 0;

  const [tools, setTools] = useState('');
  const [scale, setScale] = useState('');
  const [result, setResult] = useState('');
  const [generatedOuts, setGeneratedOuts] = useState<Array<{ n: string; t: string }> | null>(null);

  // Batch Generator state
  const [batchGenInput, setBatchGenInput] = useState('');
  const [batchGenRole, setBatchGenRole] = useState('auto');
  const [batchGenDefaultCat, setBatchGenDefaultCat] = useState('auto');
  const [batchGenStyle, setBatchGenStyle] = useState<'Standard' | 'Impact-first' | 'ATS-Compact'>('Standard');
  const [batchSortBy, setBatchSortBy] = useState<'category' | 'input'>('category');
  const [batchCategoryFilter, setBatchCategoryFilter] = useState('All');
  const [batchGeneratedItems, setBatchGeneratedItems] = useState<BatchGeneratedItem[] | null>(null);
  const [batchExportDropdownOpen, setBatchExportDropdownOpen] = useState(false);

  // Memoized sorted and filtered items for Batch Generator
  const sortedBatchItems = useMemo(() => {
    if (!batchGeneratedItems) return [];
    return sortBatchItems(batchGeneratedItems, batchSortBy);
  }, [batchGeneratedItems, batchSortBy]);

  const filteredBatchItems = useMemo(() => {
    if (batchCategoryFilter === 'All') return sortedBatchItems;
    return sortedBatchItems.filter(item => item.category === batchCategoryFilter);
  }, [sortedBatchItems, batchCategoryFilter]);

  const categoryCounts = useMemo(() => {
    if (!batchGeneratedItems) return {};
    const counts: Record<string, number> = {};
    batchGeneratedItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [batchGeneratedItems]);

  // Persist 'Action Verb' to localStorage so users don't lose work on page refresh
  useEffect(() => {
    try {
      if (verb) {
        localStorage.setItem('rb_verb', verb);
      } else {
        localStorage.removeItem('rb_verb');
      }
    } catch (err) {
      console.warn('Failed to persist verb to localStorage:', err);
    }
  }, [verb]);

  // Persist 'Task/Scope' to localStorage so users don't lose work on page refresh
  useEffect(() => {
    try {
      if (task) {
        localStorage.setItem('rb_task', task);
      } else {
        localStorage.removeItem('rb_task');
      }
    } catch (err) {
      console.warn('Failed to persist task to localStorage:', err);
    }
  }, [task]);

  // Check tab state
  const [bulletToCheck, setBulletToCheck] = useState('Responsible for managing user accounts in Active Directory');
  const [checkResult, setCheckResult] = useState<BulletCheckResult | null>(null);
  const [batchText, setBatchText] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ text: string; result: BulletCheckResult }> | null>(null);

  // Real-time composite draft bullet derived from active builder fields
  const liveDraftBullet = useMemo(
    () => getCompositeBullet({ verb, task, tools, scale, result }),
    [verb, task, tools, scale, result]
  );

  // Real-time Strength Score analysis for active builder inputs
  const liveStrength = useMemo(
    () => analyzeBulletStrength(liveDraftBullet, { verb, task, tools, scale, result }),
    [liveDraftBullet, verb, task, tools, scale, result]
  );

  // Real-time Strength Score analysis for check tab bullet
  const checkLiveStrength = useMemo(
    () => analyzeBulletStrength(bulletToCheck),
    [bulletToCheck]
  );

  const handleBatchCheck = () => {
    const lines = batchText
      .split('\n')
      .map(l => l.replace(/^[•\-\*\s]+/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast('Please enter at least one bullet point.');
      setBatchResults(null);
      return;
    }
    const results = lines.map(text => ({
      text,
      result: checkBullet(text),
    }));
    setBatchResults(results);
    showToast(`Analyzed ${results.length} bullets`);
  };

  // Saved bullets state
  const [savedBullets, setSavedBullets] = useState<string[]>([]);
  const [savedSearch, setSavedSearch] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showSynonymsModal, setShowSynonymsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Load saved bullets on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rb_saved');
      if (stored) {
        setSavedBullets(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load saved bullets:', err);
    }
  }, []);

  // Keyboard accessibility: Escape key closes modals/dropdowns, Ctrl+Z / Ctrl+Y triggers undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSynonymsModal(false);
        setShowTemplatesModal(false);
        setExportDropdownOpen(false);
        setBatchExportDropdownOpen(false);
        return;
      }

      // Undo / Redo keyboard shortcuts when in 'build' tab
      if (activeTab === 'build' && !showSynonymsModal && !showTemplatesModal) {
        const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        if (isCmdOrCtrl) {
          if (e.key === 'z' && !e.shiftKey) {
            const activeEl = document.activeElement;
            const isVerbOrTask = activeEl && (activeEl.id === 'verb' || activeEl.id === 'task');
            if (isVerbOrTask || !activeEl || activeEl.tagName === 'BODY' || activeEl.tagName === 'BUTTON') {
              e.preventDefault();
              const didUndo = handleUndo();
              if (didUndo) {
                showToast('Undid change (Ctrl+Z)');
              }
            }
          } else if (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
            const activeEl = document.activeElement;
            const isVerbOrTask = activeEl && (activeEl.id === 'verb' || activeEl.id === 'task');
            if (isVerbOrTask || !activeEl || activeEl.tagName === 'BODY' || activeEl.tagName === 'BUTTON') {
              e.preventDefault();
              const didRedo = handleRedo();
              if (didRedo) {
                showToast('Redid change (Ctrl+Y)');
              }
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleUndo, handleRedo, showSynonymsModal, showTemplatesModal]);

  const persistSaved = (items: string[]) => {
    setSavedBullets(items);
    try {
      localStorage.setItem('rb_saved', JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save bullets:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1800);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    showToast('Copied!');
  };

  const handleGenerateBatch = () => {
    const lines = batchGenInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      showToast('Please enter at least one role or task.');
      return;
    }

    const items: BatchGeneratedItem[] = lines.map((line, idx) => {
      const generated = optimizeBatchEntry(line, batchGenRole, batchGenStyle, batchGenDefaultCat);
      const current = generated.styles[batchGenStyle];
      return {
        id: `batch-${Date.now()}-${idx}`,
        originalText: line,
        category: generated.category,
        isRole: generated.isRole,
        detectedRole: generated.detectedRole,
        selectedStyle: batchGenStyle,
        styles: generated.styles,
        currentBullet: current,
        strength: analyzeBulletStrength(current),
      };
    });

    const sorted = sortBatchItems(items, batchSortBy);
    setBatchGeneratedItems(sorted);
    showToast(`Generated and sorted ${items.length} categorized bullets`);
  };

  const handleUpdateBatchItemBullet = (id: string, newText: string) => {
    if (!batchGeneratedItems) return;
    const updated = batchGeneratedItems.map(item =>
      item.id === id
        ? {
            ...item,
            currentBullet: newText,
            strength: analyzeBulletStrength(newText),
          }
        : item
    );
    setBatchGeneratedItems(updated);
  };

  const handleSwitchBatchItemStyle = (id: string, style: 'Standard' | 'Impact-first' | 'ATS-Compact') => {
    if (!batchGeneratedItems) return;
    const updated = batchGeneratedItems.map(item =>
      item.id === id
        ? {
            ...item,
            selectedStyle: style,
            currentBullet: item.styles[style],
            strength: analyzeBulletStrength(item.styles[style]),
          }
        : item
    );
    setBatchGeneratedItems(updated);
  };

  const handleUpdateBatchItemCategory = (id: string, newCategory: string) => {
    if (!batchGeneratedItems) return;
    const updated = batchGeneratedItems.map(item =>
      item.id === id ? { ...item, category: newCategory } : item
    );
    setBatchGeneratedItems(sortBatchItems(updated, batchSortBy));
    showToast(`Category updated to "${newCategory}"`);
  };

  const handleCopyCategoryBullets = (categoryName: string) => {
    if (!batchGeneratedItems) return;
    const catItems = batchGeneratedItems.filter(i => i.category === categoryName);
    if (catItems.length === 0) return;
    const text = `## ${categoryName}\n` + catItems.map(i => '• ' + i.currentBullet).join('\n\n');
    handleCopy(text);
    showToast(`Copied ${catItems.length} ${categoryName} bullets!`);
  };

  const handleCopyAllBatch = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const items = sortBatchItems(batchGeneratedItems, 'category');
    const grouped: Record<string, BatchGeneratedItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    const sections: string[] = [];
    Object.entries(grouped).forEach(([cat, catItems]) => {
      sections.push(`## ${cat}\n` + catItems.map(i => '• ' + i.currentBullet).join('\n'));
    });

    handleCopy(sections.join('\n\n'));
    showToast(`Copied all ${batchGeneratedItems.length} categorized bullets!`);
  };

  const handleSaveAllBatch = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const newBullets = batchGeneratedItems.map(item => item.currentBullet);
    const updated = Array.from(new Set([...newBullets, ...savedBullets])).slice(0, 100);
    persistSaved(updated);
    showToast(`Saved ${batchGeneratedItems.length} bullets to collection`);
  };

  const handleExportBatchTxt = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const items = sortBatchItems(batchGeneratedItems, 'category');
    const grouped: Record<string, BatchGeneratedItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    const sections: string[] = [
      '====================================================',
      'IT RESUME BULLETS (CATEGORIZED BATCH EXPORT)',
      `Generated: ${new Date().toLocaleDateString()} — IT Resume Bullet Builder`,
      '====================================================\n',
    ];

    Object.entries(grouped).forEach(([cat, catItems]) => {
      sections.push(`--- ${cat.toUpperCase()} (${catItems.length}) ---`);
      catItems.forEach(i => {
        sections.push(`• ${i.currentBullet}`);
      });
      sections.push('');
    });

    const content = sections.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch-resume-bullets.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBatchExportDropdownOpen(false);
    showToast('Downloaded batch-resume-bullets.txt');
  };

  const handleExportBatchPdf = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const items = sortBatchItems(batchGeneratedItems, 'category');
    const grouped: Record<string, BatchGeneratedItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('IT Resume Bullets (Categorized)', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} — Grouped & Sorted by Category`, 14, 26);

    let y = 36;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxWidth = 182;

    Object.entries(grouped).forEach(([cat, catItems]) => {
      if (y + 24 > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      // Category Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(30, 64, 175);
      doc.text(`${cat.toUpperCase()} (${catItems.length})`, margin, y);
      y += 3;

      // Category divider line
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + maxWidth, y);
      y += 6;

      // Bullets under category
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      catItems.forEach((item) => {
        const text = `•  ${item.currentBullet}`;
        const lines = doc.splitTextToSize(text, maxWidth);

        if (y + (lines.length * 5.5) > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        doc.text(lines, margin, y);
        y += (lines.length * 5.5) + 3;
      });

      y += 5;
    });

    doc.save('batch-resume-bullets.pdf');
    setBatchExportDropdownOpen(false);
    showToast('Downloaded batch-resume-bullets.pdf');
  };

  const handleExportBatchCsv = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const items = sortBatchItems(batchGeneratedItems, batchSortBy);
    const csvRows = ['"Index","Category","Original Task / Role","Optimized Resume Bullet","Strength Score","Tier"'];
    items.forEach((item, i) => {
      const cat = item.category.replace(/"/g, '""');
      const orig = item.originalText.replace(/"/g, '""');
      const b = item.currentBullet.replace(/"/g, '""');
      csvRows.push(`${i + 1},"${cat}","${orig}","${b}",${item.strength.score},"${item.strength.tier}"`);
    });
    const content = csvRows.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch-resume-bullets.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBatchExportDropdownOpen(false);
    showToast('Downloaded batch-resume-bullets.csv');
  };

  const handleExportBatchJson = () => {
    if (!batchGeneratedItems || batchGeneratedItems.length === 0) return;
    const items = sortBatchItems(batchGeneratedItems, batchSortBy);
    const grouped: Record<string, string[]> = {};
    items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item.currentBullet);
    });

    const data = {
      app: 'IT Resume Bullet Builder - Categorized Batch Generator',
      version: '1.1',
      exportedAt: new Date().toISOString(),
      categories: grouped,
      bullets: items.map(item => ({
        category: item.category,
        original: item.originalText,
        optimized: item.currentBullet,
        style: item.selectedStyle,
        score: item.strength.score,
        tier: item.strength.tier,
      })),
    };
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batch-resume-bullets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBatchExportDropdownOpen(false);
    showToast('Downloaded batch-resume-bullets.json');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('text/plain');
    const dragIndex = parseInt(dragIndexStr, 10);
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const updated = [...savedBullets];
    const [movedItem] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, movedItem);
    persistSaved(updated);
    showToast('Reordered');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= savedBullets.length) return;
    const updated = [...savedBullets];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    persistSaved(updated);
    showToast('Reordered');
  };

  const handleDownload = () => {
    if (savedBullets.length === 0) return;
    const content = savedBullets.map(t => '• ' + t).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bullets.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded bullets.txt');
  };

  const handleDownloadJson = () => {
    if (savedBullets.length === 0) return;
    const data = {
      app: 'IT Resume Bullet Builder',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      bullets: savedBullets,
    };
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bullets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded bullets.json');
  };

  const handleDownloadCsv = () => {
    if (savedBullets.length === 0) return;
    const csvRows = ['"Index","Bullet"'];
    savedBullets.forEach((t, i) => {
      const escaped = t.replace(/"/g, '""');
      csvRows.push(`${i + 1},"${escaped}"`);
    });
    const content = csvRows.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bullets.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded bullets.csv');
  };

  const handleDownloadPdf = () => {
    if (savedBullets.length === 0) return;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('IT Resume Bullets', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} — IT Resume Bullet Builder`, 14, 26);

    doc.setTextColor(0);
    doc.setFontSize(11);

    let y = 36;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxWidth = 182;

    savedBullets.forEach((bullet) => {
      const text = `•  ${bullet}`;
      const lines = doc.splitTextToSize(text, maxWidth);

      if (y + (lines.length * 6) > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      doc.text(lines, margin, y);
      y += (lines.length * 6) + 4;
    });

    doc.save('resume-bullets.pdf');
    showToast('Downloaded resume-bullets.pdf');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadGeneratedPdf = () => {
    if (!generatedOuts || generatedOuts.length === 0) return;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('IT Resume Bullet Builder - Generated Variations', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} — IT Resume Bullet Builder`, 14, 26);

    doc.setTextColor(0);
    doc.setFontSize(11);

    let y = 36;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxWidth = 182;

    generatedOuts.forEach((item) => {
      const headerText = `[${item.n}]`;
      doc.setFont('helvetica', 'bold');
      doc.text(headerText, margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      const text = `•  ${item.t}`;
      const lines = doc.splitTextToSize(text, maxWidth);

      if (y + (lines.length * 6) > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      doc.text(lines, margin, y);
      y += (lines.length * 6) + 8;
    });

    doc.save('resume-bullet-variations.pdf');
    showToast('Downloaded resume-bullet-variations.pdf');
  };

  const handleGenerate = () => {
    const outs = buildBullets({ verb, task, tools, scale, result });
    setGeneratedOuts(outs);
    if (!outs) {
      showToast('Enter at least an action verb and what you did.');
    }
  };

  const handleDemo = () => {
    setRole('Network engineer');
    setDraft('Configured', 'VLAN segmentation across three office floors');
    setTools('Cisco Meraki, Active Directory');
    setScale('250 users across 3 sites');
    setResult('reduced network incidents by 35%');
    setGeneratedOuts(
      buildBullets({
        verb: 'Configured',
        task: 'VLAN segmentation across three office floors',
        tools: 'Cisco Meraki, Active Directory',
        scale: '250 users across 3 sites',
        result: 'reduced network incidents by 35%',
      })
    );
    showToast('Loaded example (undoable)');
  };

  const handleSaveBullet = (t: string) => {
    const updated = [t, ...savedBullets].slice(0, 50);
    persistSaved(updated);
    showToast('Saved');
  };

  const handleCheck = () => {
    const v = bulletToCheck.trim();
    if (!v) {
      setCheckResult(null);
      return;
    }
    setCheckResult(checkBullet(v));
  };

  return (
    <main className="container page" style={{ maxWidth: '980px', margin: '0 auto', padding: '20px 20px 64px 20px' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '10px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage === 'Copied!' && <Check size={16} color="var(--good, #10b981)" aria-hidden="true" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Social Share */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'IT Resume Bullet Builder' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="IT Resume Bullet Builder | Jawed Imtiaz"
          text="Turn what you actually did in IT into clear, measurable, ATS-friendly resume bullets. 100% private in-browser tool."
          url={typeof window !== 'undefined' ? window.location.href : 'https://jawed.co.in/tools/it-resume-bullet-builder'}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <span className="muted" style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Free tool · runs in your browser
        </span>
      </div>

      <h1
        style={{
          fontSize: 'clamp(26px, 5vw, 38px)',
          margin: '.3em 0 .1em',
          backgroundImage: 'linear-gradient(90deg, var(--brand), var(--brand2))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          fontWeight: 800,
        }}
      >
        IT Resume Bullet Builder
      </h1>
      <p className="lead" style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '20px' }}>
        Turn what you actually did in IT into clear, measurable, ATS-friendly resume bullets, or score a bullet you already wrote. Nothing is uploaded or stored on a server.
      </p>

      {/* Navigation Tabs */}
      <div className="row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('build')}
          className={activeTab === 'build' ? 'on' : ''}
          style={{
            background: activeTab === 'build' ? 'linear-gradient(90deg, var(--brand), var(--brand2))' : 'transparent',
            border: activeTab === 'build' ? '0' : '1px solid var(--line)',
            color: activeTab === 'build' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'build' ? 600 : 400,
            borderRadius: '10px',
            padding: '7px 16px',
            cursor: 'pointer',
          }}
        >
          Build bullets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={activeTab === 'batch' ? 'on' : ''}
          style={{
            background: activeTab === 'batch' ? 'linear-gradient(90deg, var(--brand), var(--brand2))' : 'transparent',
            border: activeTab === 'batch' ? '0' : '1px solid var(--line)',
            color: activeTab === 'batch' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'batch' ? 600 : 400,
            borderRadius: '10px',
            padding: '7px 16px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={15} aria-hidden="true" />
          Batch Generator
          {batchGeneratedItems && batchGeneratedItems.length > 0 && (
            <span
              style={{
                background: 'var(--brand)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '99px',
                fontWeight: 700,
              }}
            >
              {batchGeneratedItems.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('check')}
          className={activeTab === 'check' ? 'on' : ''}
          style={{
            background: activeTab === 'check' ? 'linear-gradient(90deg, var(--brand), var(--brand2))' : 'transparent',
            border: activeTab === 'check' ? '0' : '1px solid var(--line)',
            color: activeTab === 'check' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'check' ? 600 : 400,
            borderRadius: '10px',
            padding: '7px 16px',
            cursor: 'pointer',
          }}
        >
          Check a bullet
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const text = e.dataTransfer.getData('text/plain');
            if (text) {
              handleSaveBullet(text);
              setActiveTab('saved');
              showToast('Saved via drag-and-drop');
            }
          }}
          className={activeTab === 'saved' ? 'on' : ''}
          style={{
            background: activeTab === 'saved' ? 'linear-gradient(90deg, var(--brand), var(--brand2))' : 'transparent',
            border: activeTab === 'saved' ? '0' : '1px solid var(--line)',
            color: activeTab === 'saved' ? '#fff' : 'var(--text)',
            fontWeight: activeTab === 'saved' ? 600 : 400,
            borderRadius: '10px',
            padding: '7px 16px',
            cursor: 'pointer',
          }}
        >
          Saved ({savedBullets.length}) 📥 Drop here
        </button>
      </div>

      {/* TAB 1: BUILD */}
      {activeTab === 'build' && (
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '14px',
          }}
        >
          {/* Action Verb & Task/Scope Undo / Redo Toolbar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                Bullet Construction
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--muted)',
                  background: 'var(--bg)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontWeight: 500,
                }}
              >
                Action Verb &amp; Task/Scope History
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const didUndo = handleUndo();
                  if (didUndo) showToast('Undid change');
                }}
                disabled={!canUndo}
                title="Undo recent change to Action Verb or Task (Ctrl+Z / ⌘Z)"
                aria-label="Undo recent change to Action Verb or Task"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: canUndo ? 'var(--card)' : 'transparent',
                  color: canUndo ? 'var(--text)' : 'var(--muted)',
                  opacity: canUndo ? 1 : 0.45,
                  cursor: canUndo ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  boxShadow: canUndo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Undo2 size={14} aria-hidden="true" />
                <span>Undo</span>
                {pastCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: 'var(--bg)',
                      borderRadius: '99px',
                      padding: '1px 6px',
                      border: '1px solid var(--line)',
                      color: 'var(--brand)',
                      fontWeight: 700,
                    }}
                  >
                    {pastCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const didRedo = handleRedo();
                  if (didRedo) showToast('Redid change');
                }}
                disabled={!canRedo}
                title="Redo recent change to Action Verb or Task (Ctrl+Y / ⌘Shift+Z)"
                aria-label="Redo recent change to Action Verb or Task"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: canRedo ? 'var(--card)' : 'transparent',
                  color: canRedo ? 'var(--text)' : 'var(--muted)',
                  opacity: canRedo ? 1 : 0.45,
                  cursor: canRedo ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  boxShadow: canRedo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Redo2 size={14} aria-hidden="true" />
                <span>Redo</span>
                {futureCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: 'var(--bg)',
                      borderRadius: '99px',
                      padding: '1px 6px',
                      border: '1px solid var(--line)',
                      color: 'var(--brand)',
                      fontWeight: 700,
                    }}
                  >
                    {futureCount}
                  </span>
                )}
              </button>

              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--muted)',
                  marginLeft: '4px',
                }}
              >
                (Ctrl+Z / Ctrl+Y)
              </span>
            </div>
          </div>

          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="role" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                Your role area
              </label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: 'var(--text)',
                }}
              >
                {Object.keys(ROLES).map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px' }}>
                <label htmlFor="verb" style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Action verb
                </label>
                <button
                  type="button"
                  onClick={() => setShowSynonymsModal(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--brand)',
                    color: 'var(--brand)',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✨ Role Synonyms
                </button>
              </div>

              {/* Enterprise Synonyms Modal */}
              {showSynonymsModal && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="synonyms-modal-title"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                  onClick={() => setShowSynonymsModal(false)}
                >
                  <div
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '16px',
                      padding: '24px',
                      maxWidth: '500px',
                      width: '100%',
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 id="synonyms-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        Enterprise Synonyms for {role}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowSynonymsModal(false)}
                        style={{ background: 'transparent', border: 0, fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text)' }}
                      >
                        ✕
                      </button>
                    </div>
                    <p className="muted" style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px' }}>
                      Click any enterprise-grade verb below to instantly apply it to your action verb field.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                      {Object.entries(ENTERPRISE_ROLE_SYNONYMS[role] || ENTERPRISE_ROLE_SYNONYMS['Network engineer']).map(([weakVerb, strongList]) => (
                        <div key={weakVerb} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                            Instead of &quot;{weakVerb}&quot;:
                          </span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {strongList.map(syn => (
                              <button
                                key={syn}
                                type="button"
                                onClick={() => {
                                  setVerb(syn);
                                  setShowSynonymsModal(false);
                                  showToast(`Applied "${syn}"`);
                                }}
                                style={{
                                  background: 'var(--card)',
                                  border: '1px solid var(--brand)',
                                  color: 'var(--text)',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {syn}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <input
                id="verb"
                value={verb}
                onChange={e => setVerbTyping(e.target.value)}
                onBlur={flushTypingSnapshot}
                placeholder="e.g. Configured"
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "10px",
                  color: "var(--text)",
                }}
              />
              {(() => {
                const sugg = getSuggestionsForText(verb);
                if (!sugg) return null;
                return (
                  <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--brand)", background: "var(--card)", border: "1px solid var(--line)", padding: "6px 10px", borderRadius: "8px" }}>
                    <span>💡 Stronger synonym for &quot;{sugg.weakWord}&quot;: </span>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {sugg.suggestions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setVerb(s)}
                          style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "6px", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", cursor: "pointer" }}
                        >
                          Use &quot;{s}&quot;
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {ROLES[role]?.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVerb(v)}
                    style={{
                      padding: '3px 10px',
                      fontSize: '13px',
                      borderRadius: '99px',
                      border: '1px solid var(--line)',
                      background: verb.toLowerCase() === v.toLowerCase() ? 'var(--brand)' : 'transparent',
                      color: verb.toLowerCase() === v.toLowerCase() ? '#fff' : 'var(--text)',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px', flexWrap: 'wrap', gap: '6px' }}>
                <label htmlFor="task" style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  What did you do? (Task / Scope)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Core action details
                </span>
              </div>
              <textarea
                id="task"
                value={task}
                onChange={e => setTaskTyping(e.target.value)}
                onBlur={flushTypingSnapshot}
                placeholder="e.g. VLAN segmentation across three office floors"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  minHeight: '120px',
                  resize: 'vertical',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div>
              <label htmlFor="tools" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                Tools / technology (optional)
              </label>
              <input
                id="tools"
                value={tools}
                onChange={e => setTools(e.target.value)}
                placeholder="e.g. Cisco Meraki, Active Directory"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: 'var(--text)',
                }}
              />

              <label htmlFor="scale" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                Scale (optional)
              </label>
              <input
                id="scale"
                value={scale}
                onChange={e => setScale(e.target.value)}
                placeholder="e.g. 250 users across 3 sites"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div>
              <label htmlFor="result" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                Result (optional, only if true)
              </label>
              <textarea
                id="result"
                value={result}
                onChange={e => setResult(e.target.value)}
                placeholder="e.g. reduced network incidents by 35%"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  minHeight: '120px',
                  resize: 'vertical',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>

          {/* Real-Time Strength Score Indicator */}
          <StrengthScoreIndicator
            strength={liveStrength}
            draftText={liveDraftBullet}
            onApplyVerb={(v) => {
              setVerb(v);
              showToast(`Applied "${v}"`);
            }}
            onCopyDraft={handleCopy}
            title="Real-Time Bullet Strength Score"
            subtitle="Live ATS impact analyzer evaluating action verb strength, bullet length, and quantitative metrics"
          />

          <div className="row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
            <button
              type="button"
              className="primary"
              onClick={handleGenerate}
              style={{
                background: 'linear-gradient(90deg, var(--brand), var(--brand2))',
                border: 0,
                color: '#fff',
                fontWeight: 600,
                padding: '11px 22px',
                borderRadius: '10px',
              }}
            >
              Generate bullets
            </button>
            <button
              type="button"
              onClick={handleDemo}
              style={{
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '11px 18px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Fill example
            </button>
            <button
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              style={{
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '11px 18px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              📋 Bullet Templates
            </button>
          </div>

          {generatedOuts && (
            <div id="outs" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Generated Bullet Variations
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadGeneratedPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} aria-hidden="true" /> Download as PDF
                </button>
              </div>
              {generatedOuts.length === 0 ? (
                <p className="no" style={{ color: 'var(--bad)' }}>
                  Enter at least an action verb and what you did.
                </p>
              ) : (
                <>
                  {generatedOuts.map((x, i) => {
                    const singleCheck = checkBullet(x.t);
                    return (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', x.t)}
                        className="out"
                        style={{
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '14px',
                          marginTop: '10px',
                          background: 'var(--bg)',
                          cursor: 'grab',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <b style={{ color: 'var(--brand)' }}>{x.n}</b>
                          {(() => {
                            const impact = calculateImpactPotential(x.t);
                            return (
                              <span
                                style={{
                                  background: 'var(--card)',
                                  border: `1px solid ${impact.color}`,
                                  color: impact.color,
                                  padding: '2px 10px',
                                  borderRadius: '99px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                }}
                              >
                                Impact Potential: {impact.score}% — {impact.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'stretch',
                            margin: '8px 0',
                          }}
                        >
                          <textarea
                            readOnly
                            value={x.t}
                            className="bt"
                            rows={2}
                            aria-label={`${x.n} generated resume bullet`}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily: 'monospace',
                              fontSize: '0.95rem',
                              background: 'var(--card)',
                              border: '1px solid var(--line)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              color: 'var(--text)',
                              resize: 'vertical',
                              lineHeight: '1.5',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(x.t)}
                            title="Copy bullet to clipboard"
                            aria-label={`Copy ${x.n} bullet to clipboard`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              background: 'var(--brand)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              minHeight: '40px',
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            <Copy size={16} aria-hidden="true" />
                            Copy
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <div className="muted" style={{ fontSize: '14px', color: 'var(--muted)' }}>
                            Quality {singleCheck.score}/100
                          </div>
                          <div className="row" style={{ display: 'flex', gap: '8px', margin: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleCopy(x.t)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Copy size={13} aria-hidden="true" />
                              Copy
                            </button>
                            <button type="button" onClick={() => handleSaveBullet(x.t)}>
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <p className="muted" style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '12px' }}>
                    Fill any [bracketed] part only with facts that are true.
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB: BATCH GENERATOR */}
      {activeTab === 'batch' && (
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    background: 'linear-gradient(90deg, var(--brand), var(--brand2))',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} aria-hidden="true" /> Batch Mode
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  Batch Bullet Generator
                </h2>
              </div>
              <p className="muted" style={{ fontSize: '0.92rem', color: 'var(--muted)', margin: 0, maxWidth: '680px' }}>
                Paste a list of job duties, daily tasks, or role titles (one per line). The engine will automatically upgrade weak phrasing, inject technical depth, format verified quantitative metrics, and generate recruiter-grade resume bullets for every entry.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              💡 Quick-fill example task sets or roles:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BATCH_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setBatchGenInput(p.entries.join('\n'));
                    showToast(`Loaded ${p.name}`);
                  }}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <ListPlus size={13} color="var(--brand)" aria-hidden="true" />
                  {p.name}
                </button>
              ))}
              {batchGenInput && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchGenInput('');
                    setBatchGeneratedItems(null);
                    showToast('Cleared input');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'var(--bad, #ef4444)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Category Tag Insert Helper */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Tag size={13} aria-hidden="true" /> Click to insert category prefix tag:
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Syntax: <code>[Category] Task</code> or <code>Category: Task</code>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {STANDARD_CATEGORIES.map(cat => {
                const meta = getCategoryMeta(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const tag = `[${cat}] `;
                      setBatchGenInput(prev => {
                        if (!prev) return tag;
                        if (prev.endsWith('\n')) return prev + tag;
                        return prev + '\n' + tag;
                      });
                      showToast(`Inserted [${cat}] tag`);
                    }}
                    style={{
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      color: meta.color,
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Insert [${cat}] prefix at new line`}
                  >
                    <span>{meta.icon}</span> + [{cat}]
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Controls */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="batch-input" style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                Paste tasks or role titles (one per line):
              </label>
              {(() => {
                const count = batchGenInput.split('\n').filter(l => l.trim().length > 0).length;
                return (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? 'var(--brand)' : 'var(--muted)' }}>
                    {count} {count === 1 ? 'entry' : 'entries'} detected
                  </span>
                );
              })()}
            </div>
            <textarea
              id="batch-input"
              value={batchGenInput}
              onChange={(e) => setBatchGenInput(e.target.value)}
              placeholder={`• [Leadership] Mentored 5 junior sysadmins and instituted weekly tier-2 escalation review sessions\n• [Project Management] Spearheaded cloud migration of 40 Windows VMs to AWS EC2 under budget\n• [Technical Troubleshooting] Diagnosed and resolved core switch outage and BGP route flapping within 20 mins\n• [Infrastructure & Cloud] Orchestrated Kubernetes microservices and automated CI/CD pipelines\n• [Security & Compliance] Hardened endpoint baseline configurations and conducted quarterly SOC 2 audits\n• [Technical Troubleshooting] Network Engineer`}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '12px',
                minHeight: '140px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: 'var(--text)',
                lineHeight: '1.5',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Options Row */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="batch-role" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Target Domain:
              </label>
              <select
                id="batch-role"
                value={batchGenRole}
                onChange={(e) => setBatchGenRole(e.target.value)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="auto">Auto-detect from input</option>
                {Object.keys(ROLES).map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="batch-default-cat" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Default Category:
              </label>
              <select
                id="batch-default-cat"
                value={batchGenDefaultCat}
                onChange={(e) => setBatchGenDefaultCat(e.target.value)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="auto">Auto-detect from content</option>
                {STANDARD_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="batch-style" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Format:
              </label>
              <select
                id="batch-style"
                value={batchGenStyle}
                onChange={(e) => setBatchGenStyle(e.target.value as any)}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="Standard">Standard (Action + Scope + Result)</option>
                <option value="Impact-first">Impact-first (Result — Action)</option>
                <option value="ATS-Compact">ATS-Compact (Semi-colon separated)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="batch-sort" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Sort:
              </label>
              <select
                id="batch-sort"
                value={batchSortBy}
                onChange={(e) => {
                  const val = e.target.value as 'category' | 'input';
                  setBatchSortBy(val);
                  if (batchGeneratedItems) {
                    setBatchGeneratedItems(sortBatchItems(batchGeneratedItems, val));
                  }
                }}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="category">Categorized (Leadership, PM, Tech...)</option>
                <option value="input">Original Input Order</option>
              </select>
            </div>

            <button
              type="button"
              className="primary"
              onClick={handleGenerateBatch}
              style={{
                background: 'linear-gradient(90deg, var(--brand), var(--brand2))',
                border: 0,
                color: '#fff',
                fontWeight: 600,
                padding: '9px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9rem',
              }}
            >
              <Sparkles size={16} aria-hidden="true" />
              Generate Bullets
            </button>
          </div>

          {/* Results Section */}
          {batchGeneratedItems && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
              {/* Batch Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '16px',
                }}
              >
                {(() => {
                  const avg = Math.round(
                    batchGeneratedItems.reduce((acc, curr) => acc + curr.strength.score, 0) /
                      batchGeneratedItems.length
                  );
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                        {batchGeneratedItems.length} Bullets Generated
                      </span>
                      <span
                        style={{
                          background: avg >= 85 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(56, 189, 248, 0.14)',
                          border: `1px solid ${avg >= 85 ? 'var(--good, #10b981)' : 'var(--brand)'}`,
                          color: avg >= 85 ? 'var(--good, #10b981)' : 'var(--brand)',
                          borderRadius: '99px',
                          padding: '3px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        Avg Quality: {avg}/100 · {avg >= 85 ? 'Exceptional' : 'Strong'}
                      </span>
                      <span
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          color: 'var(--muted)',
                          borderRadius: '99px',
                          padding: '3px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        {Object.keys(categoryCounts).length} {Object.keys(categoryCounts).length === 1 ? 'Category' : 'Categories'}
                      </span>
                    </div>
                  );
                })()}

                {/* Batch Actions: Copy All, Save All, Export */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleCopyAllBatch}
                    style={{
                      background: 'var(--brand)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                    Copy All Bullets
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllBatch}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Bookmark size={14} aria-hidden="true" />
                    Save All to Collection
                  </button>

                  {/* Export Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setBatchExportDropdownOpen(!batchExportDropdownOpen)}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        color: 'var(--text)',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Download size={14} aria-hidden="true" />
                      Export
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>

                    {batchExportDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '4px',
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          borderRadius: '10px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                          zIndex: 50,
                          minWidth: '170px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleExportBatchTxt}
                          style={{
                            background: 'transparent',
                            border: 0,
                            padding: '6px 10px',
                            textAlign: 'left',
                            fontSize: '0.82rem',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          📄 Export as .txt (Categorized)
                        </button>
                        <button
                          type="button"
                          onClick={handleExportBatchPdf}
                          style={{
                            background: 'transparent',
                            border: 0,
                            padding: '6px 10px',
                            textAlign: 'left',
                            fontSize: '0.82rem',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          📕 Export as .pdf (Categorized)
                        </button>
                        <button
                          type="button"
                          onClick={handleExportBatchCsv}
                          style={{
                            background: 'transparent',
                            border: 0,
                            padding: '6px 10px',
                            textAlign: 'left',
                            fontSize: '0.82rem',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          📊 Export as .csv
                        </button>
                        <button
                          type="button"
                          onClick={handleExportBatchJson}
                          style={{
                            background: 'transparent',
                            border: 0,
                            padding: '6px 10px',
                            textAlign: 'left',
                            fontSize: '0.82rem',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          🔣 Export as .json
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <Filter size={13} aria-hidden="true" /> Category Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setBatchCategoryFilter('All')}
                  style={{
                    background: batchCategoryFilter === 'All' ? 'var(--brand)' : 'var(--card)',
                    color: batchCategoryFilter === 'All' ? '#fff' : 'var(--text)',
                    border: `1px solid ${batchCategoryFilter === 'All' ? 'var(--brand)' : 'var(--line)'}`,
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All ({batchGeneratedItems.length})
                </button>
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const meta = getCategoryMeta(cat);
                  const isSelected = batchCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBatchCategoryFilter(cat)}
                      style={{
                        background: isSelected ? meta.color : meta.bg,
                        color: isSelected ? '#fff' : meta.color,
                        border: `1px solid ${isSelected ? meta.color : meta.border}`,
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span>{meta.icon}</span> {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredBatchItems.map((item, idx) => {
                  const isFirstInCategory =
                    batchSortBy === 'category' &&
                    batchCategoryFilter === 'All' &&
                    (idx === 0 || filteredBatchItems[idx - 1].category !== item.category);
                  const catMeta = getCategoryMeta(item.category);
                  const catCount = categoryCounts[item.category] || 0;

                  return (
                    <React.Fragment key={item.id}>
                      {isFirstInCategory && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                            background: 'var(--card)',
                            border: `1px solid ${catMeta.border}`,
                            borderLeft: `4px solid ${catMeta.color}`,
                            borderRadius: '10px',
                            padding: '10px 16px',
                            marginTop: idx === 0 ? '0' : '10px',
                            marginBottom: '2px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.15rem' }}>{catMeta.icon}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)' }}>
                              {item.category}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                background: catMeta.bg,
                                color: catMeta.color,
                                border: `1px solid ${catMeta.border}`,
                                borderRadius: '99px',
                                padding: '2px 8px',
                                fontWeight: 700,
                              }}
                            >
                              {catCount} {catCount === 1 ? 'bullet' : 'bullets'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCategoryBullets(item.category)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${catMeta.border}`,
                              color: catMeta.color,
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Copy size={12} aria-hidden="true" />
                            Copy {item.category} Bullets
                          </button>
                        </div>
                      )}

                      <div
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
                        }}
                      >
                        {/* Item Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: 'var(--card)',
                                border: '1px solid var(--line)',
                                color: 'var(--text)',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              #{idx + 1}
                            </span>

                            {/* Category Selector Pill */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateBatchItemCategory(item.id, e.target.value)}
                                style={{
                                  background: catMeta.bg,
                                  color: catMeta.color,
                                  border: `1px solid ${catMeta.border}`,
                                  borderRadius: '99px',
                                  padding: '2px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                title="Change Category for this bullet"
                                aria-label={`Category for bullet #${idx + 1}`}
                              >
                                {STANDARD_CATEGORIES.map(c => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                                {!STANDARD_CATEGORIES.includes(item.category as any) && (
                                  <option value={item.category}>{item.category}</option>
                                )}
                              </select>
                            </div>

                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                              Original: <em style={{ fontStyle: 'normal', color: 'var(--text)', fontWeight: 600 }}>&quot;{item.originalText}&quot;</em>
                            </span>
                            {item.isRole && (
                              <span
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: 'var(--brand)',
                                  border: '1px solid var(--brand)',
                                  borderRadius: '99px',
                                  padding: '1px 8px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                Role: {item.detectedRole}
                              </span>
                            )}
                          </div>

                          {/* Strength Score Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                background: item.strength.badgeBg,
                                border: `1px solid ${item.strength.color}`,
                                color: item.strength.color,
                                borderRadius: '99px',
                                padding: '2px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              Strength: {item.strength.score}/100 · {item.strength.tier}
                            </span>
                          </div>
                        </div>

                        {/* Style Switcher */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Format:</span>
                          {(['Standard', 'Impact-first', 'ATS-Compact'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleSwitchBatchItemStyle(item.id, s)}
                              style={{
                                background: item.selectedStyle === s ? 'var(--brand)' : 'var(--card)',
                                color: item.selectedStyle === s ? '#fff' : 'var(--text)',
                                border: '1px solid ' + (item.selectedStyle === s ? 'var(--brand)' : 'var(--line)'),
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>

                        {/* Editable Bullet Textarea */}
                        <textarea
                          value={item.currentBullet}
                          onChange={(e) => handleUpdateBatchItemBullet(item.id, e.target.value)}
                          rows={2}
                          aria-label={`Optimized resume bullet #${idx + 1}`}
                          style={{
                            width: '100%',
                            fontFamily: 'monospace',
                            fontSize: '0.92rem',
                            lineHeight: '1.5',
                            background: 'var(--card)',
                            border: '1px solid var(--line)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            color: 'var(--text)',
                            resize: 'vertical',
                            marginBottom: '8px',
                          }}
                        />

                        {/* Footer with Metrics Tags and Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          {/* Metric & Verb Pills */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: item.strength.verbImpact.score >= 80 ? 'var(--good, #10b981)' : 'var(--amber, #f59e0b)', fontWeight: 600 }}>
                              ✓ {item.strength.verbImpact.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>•</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                              {item.strength.lengthAnalysis.wordCount} words
                            </span>
                            {item.strength.metricsAnalysis.detectedMetrics.length > 0 && (
                              <>
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>•</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--good, #10b981)', fontWeight: 600 }}>
                                  {item.strength.metricsAnalysis.detectedMetrics.slice(0, 2).join(', ')}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Copy & Save Buttons */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.currentBullet)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--brand)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Copy size={13} aria-hidden="true" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveBullet(item.currentBullet)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--card)',
                                color: 'var(--text)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Bookmark size={13} aria-hidden="true" /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CHECK */}
      {activeTab === 'check' && (
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '14px',
          }}
        >
          <label htmlFor="bul" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
            Paste one resume bullet
          </label>
          <textarea
            id="bul"
            value={bulletToCheck}
            onChange={e => setBulletToCheck(e.target.value)}
            placeholder="e.g. Responsible for managing user accounts in Active Directory"
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '10px',
              minHeight: '90px',
              color: 'var(--text)',
            }}
          />
          <div className="row" style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="primary"
              onClick={handleCheck}
              style={{
                background: 'linear-gradient(90deg, var(--brand), var(--brand2))',
                border: 0,
                color: '#fff',
                fontWeight: 600,
                padding: '11px 22px',
                borderRadius: '10px',
              }}
            >
              Score this bullet
            </button>
          </div>

          {/* Real-Time Strength Score Indicator for Check Tab */}
          <StrengthScoreIndicator
            strength={checkLiveStrength}
            draftText={bulletToCheck}
            onApplyVerb={(v) => {
              const parts = bulletToCheck.trim().split(/\s+/);
              if (parts.length > 0) {
                parts[0] = v;
                setBulletToCheck(parts.join(' '));
              } else {
                setBulletToCheck(v);
              }
              showToast(`Applied "${v}"`);
            }}
            onCopyDraft={handleCopy}
            title="Real-Time Bullet Strength Analysis"
            subtitle="Immediate evaluation of action verb impact, length, and quantitative metrics"
          />

          <div id="chkOut" style={{ marginTop: '16px' }}>
            {checkResult ? (
              <div>
                <div className="score" style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>
                  Quality: {checkResult.score}/100
                </div>
                <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {checkResult.items.map((i, idx) => (
                    <li key={idx} className={i.ok ? 'ok' : 'no'} style={{ color: i.ok ? 'var(--good)' : 'var(--bad)' }}>
                      {i.ok ? '✓' : '✗'} {i.l}
                      {!i.ok && <span className="muted" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}> — {i.tip}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted" style={{ color: 'var(--muted)' }}>
                Click score above to analyze.
              </p>
            )}
          </div>

          {/* Batch Analyze Section */}
          <div style={{ marginTop: '36px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
              Batch Analyze Multiple Bullets
            </h3>
            <p className="muted" style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '12px' }}>
              Paste a text block with multiple resume bullets (separated by newlines) to receive a composite quality score report.
            </p>
            <textarea
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              placeholder="Paste multiple bullets here, one per line...&#10;• Configured Cisco Meraki switches for 250 users&#10;• Responsible for managing user accounts in Active Directory&#10;• Migrated 14 VMs to AWS EC2 with zero downtime"
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '10px',
                minHeight: '130px',
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
              }}
            />
            <div className="row" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="primary"
                onClick={handleBatchCheck}
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand2))',
                  border: 0,
                  color: '#fff',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: '10px',
                }}
              >
                Run Batch Analysis
              </button>
            </div>

            {batchResults && (
              <div style={{ marginTop: '20px' }}>
                {(() => {
                  const total = batchResults.length;
                  const avgScore = Math.round(batchResults.reduce((acc, curr) => acc + curr.result.score, 0) / total);

                  return (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
                        Composite Quality Report ({total} bullets analyzed)
                      </h4>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: avgScore >= 80 ? 'var(--good)' : avgScore >= 60 ? 'var(--brand)' : 'var(--bad)' }}>
                          Composite Score: {avgScore}/100
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {batchResults.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        padding: '12px',
                        background: 'var(--bg)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>Bullet #{idx + 1}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: item.result.score >= 80 ? 'var(--good)' : item.result.score >= 60 ? 'var(--brand)' : 'var(--bad)' }}>
                          Score: {item.result.score}/100
                        </span>
                      </div>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.9rem', margin: '4px 0 8px' }}>{item.text}</p>
                      <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                        {item.result.items.map((chk, cIdx) => (
                          <li key={cIdx} style={{ color: chk.ok ? 'var(--good)' : 'var(--bad)' }}>
                            {chk.ok ? '✓' : '✗'} {chk.l}
                          </li>
                        ))}
                      </ul>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button type="button" onClick={() => handleCopy(item.text)} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                          Copy
                        </button>
                        <button type="button" onClick={() => handleSaveBullet(item.text)} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: SAVED */}
      {activeTab === 'saved' && (
        <section
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '14px',
          }}
        >
          {/* Drag & Drop Drop Zone Banner */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const text = e.dataTransfer.getData('text/plain');
              if (text) {
                handleSaveBullet(text);
                showToast('Saved bullet via drag-and-drop');
              }
            }}
            style={{
              border: '2px dashed var(--brand)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
              background: 'var(--bg)',
              color: 'var(--muted)',
              fontSize: '0.9rem',
            }}
          >
            📥 Drag and drop any generated resume bullet here to instantly save it to your collection.
          </div>
          <div className="row" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleCopy(savedBullets.map(t => '• ' + t).join('\n'))}
              disabled={savedBullets.length === 0}
            >
              Copy all
            </button>
            <button
              type="button"
              className="no-print"
              onClick={handlePrint}
              disabled={savedBullets.length === 0}
              style={{
                background: 'linear-gradient(90deg, #0284c7, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: savedBullets.length === 0 ? 0.5 : 1,
              }}
            >
              <Printer size={16} aria-hidden="true" /> Print / Save as PDF
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                type="button"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={savedBullets.length === 0}
                style={{
                  background: exportDropdownOpen ? 'var(--brand)' : 'var(--bg)',
                  border: '1px solid var(--line)',
                  color: exportDropdownOpen ? '#fff' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '10px',
                }}
              >
                📥 Download / Export ▾
              </button>
              {exportDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                    zIndex: 1000,
                    minWidth: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { handleDownloadPdf(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📑 Download as PDF (jsPDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => { handlePrint(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    🖨️ Print Resume Document
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDownload(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem' }}
                  >
                    📄 Download as TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDownloadJson(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem' }}
                  >
                    📊 Download as JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDownloadCsv(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem' }}
                  >
                    📈 Download as CSV
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all saved bullets?')) {
                  persistSaved([]);
                  setSavedSearch('');
                  showToast('Cleared');
                }
              }}
              disabled={savedBullets.length === 0}
            >
              Clear all
            </button>
          </div>

          {savedBullets.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={savedSearch}
                onChange={e => setSavedSearch(e.target.value)}
                placeholder="Search saved bullets by keyword (e.g. Cisco, Active Directory, Azure)..."
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                }}
              />
            </div>
          )}

          <div id="savedList">
            {savedBullets.length === 0 ? (
              <p className="muted" style={{ color: 'var(--muted)' }}>
                No saved bullets yet.
              </p>
            ) : (() => {
              const filtered = savedBullets
                .map((t, originalIndex) => ({ t, originalIndex }))
                .filter(({ t }) => t.toLowerCase().includes(savedSearch.toLowerCase()));

              if (filtered.length === 0) {
                return (
                  <p className="muted" style={{ color: 'var(--muted)' }}>
                    No saved bullets match &quot;{savedSearch}&quot;.
                  </p>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filtered.map(({ t, originalIndex }) => (
                    <div
                      key={originalIndex}
                      draggable
                      onDragStart={(e) => handleDragStart(e, originalIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, originalIndex)}
                      className="out"
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        padding: '12px',
                        background: 'var(--bg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                        <span title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--muted)', userSelect: 'none', fontSize: '1.1rem' }}>⋮⋮</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{t}</span>
                      </div>
                      <div className="row" style={{ display: 'flex', gap: '6px', margin: 0, alignItems: 'center' }}>
                        <button
                          type="button"
                          title="Move up"
                          disabled={originalIndex === 0}
                          onClick={() => handleMove(originalIndex, 'up')}
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={originalIndex === savedBullets.length - 1}
                          onClick={() => handleMove(originalIndex, 'down')}
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          ↓
                        </button>
                        <button type="button" onClick={() => handleCopy(t)}>
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...savedBullets];
                            updated.splice(originalIndex, 1);
                            persistSaved(updated);
                            showToast('Deleted');
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* EDITORIAL CONTENT */}
      <h2 style={{ marginTop: '1.6em', color: 'var(--text)', fontWeight: 700, fontSize: '1.35rem' }}>
        How to write strong IT resume bullets
      </h2>
      <p style={{ color: 'var(--muted)' }}>
        Recruiters and applicant tracking systems (ATS) scan IT resumes for three things: <b>what you did</b>, <b>which technology you used</b>, and <b>what changed because of it</b>. A bullet that covers all three is far more useful than a list of duties.
      </p>
      <p style={{ color: 'var(--text)' }}>
        <b>The formula:</b> Action verb + task + tools + scale + result. Example: <i>Configured VLAN segmentation on Cisco Meraki switches for 250 users across 3 sites, reducing network incidents by 35%.</i>
      </p>
      <ul style={{ paddingLeft: '20px', color: 'var(--muted)' }}>
        <li>
          <b style={{ color: 'var(--text)' }}>Start with a specific past-tense verb.</b> &quot;Deployed&quot;, &quot;Diagnosed&quot; and &quot;Migrated&quot; say more than &quot;Responsible for&quot;.
        </li>
        <li>
          <b style={{ color: 'var(--text)' }}>Name the technology.</b> ATS filters match tools such as Active Directory, VMware, Intune or Cisco exactly, so use the same spelling as the job posting.
        </li>
        <li>
          <b style={{ color: 'var(--text)' }}>Add numbers you can verify.</b> Users supported, devices managed, tickets closed, uptime, minutes saved, sites covered.
        </li>
        <li>
          <b style={{ color: 'var(--text)' }}>Keep it to one or two lines.</b> Aim for 8–28 words.
        </li>
        <li>
          <b style={{ color: 'var(--text)' }}>Never invent results.</b> If you do not have a number, leave it out or write what you can honestly support. This tool marks missing information as &quot;Not Provided&quot; instead of guessing.
        </li>
      </ul>

      <h2 style={{ marginTop: '1.6em', color: 'var(--text)', fontWeight: 700, fontSize: '1.35rem' }}>
        Before and after
      </h2>
      <ul style={{ paddingLeft: '20px', color: 'var(--muted)' }}>
        <li>
          <span style={{ color: 'var(--bad)', fontWeight: 600 }}>Before:</span> Responsible for fixing printers and helping users with laptops.
        </li>
        <li>
          <span style={{ color: 'var(--good)', fontWeight: 600 }}>After:</span> Diagnosed and repaired laptops and network printers for 120 staff, keeping first-day resolution at [your verified figure].
        </li>
        <li>
          <span style={{ color: 'var(--bad)', fontWeight: 600 }}>Before:</span> Worked on server backups.
        </li>
        <li>
          <span style={{ color: 'var(--good)', fontWeight: 600 }}>After:</span> Automated nightly Veeam backups for 14 Windows Server VMs and tested monthly restores.
        </li>
      </ul>

      <h2 style={{ marginTop: '1.6em', color: 'var(--text)', fontWeight: 700, fontSize: '1.35rem' }}>
        FAQ
      </h2>
      {[
        {
          q: 'Does this tool use AI or send my text anywhere?',
          a: 'No. It runs entirely in your browser using fixed templates and checks. Your text is not uploaded. Saved bullets stay in your own browser storage.',
        },
        {
          q: 'What if I have no numbers?',
          a: 'Use scale instead: number of users, devices, sites or tickets. If even that is unknown, describe the scope honestly, for example "supported a 40-person office".',
        },
        {
          q: 'How many bullets per job?',
          a: 'Three to six for recent roles, fewer for older ones. Put the most job-relevant bullet first.',
        },
        {
          q: 'Will this guarantee interviews?',
          a: 'No. It helps your resume read clearly to people and ATS software, but hiring decisions depend on many factors outside any tool.',
        },
      ].map((faq, index) => {
        const isOpen = openFaq === index;
        return (
          <details
            key={index}
            open={isOpen}
            style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}
            onClick={e => {
              e.preventDefault();
              setOpenFaq(isOpen ? null : index);
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}>
              {faq.q}
            </summary>
            {isOpen && <p style={{ color: 'var(--muted)', marginTop: '8px' }}>{faq.a}</p>}
          </details>
        );
      })}
      {/* Bullet Templates Modal */}
      {showTemplatesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="templates-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowTemplatesModal(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '650px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 id="templates-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                IT Resume Bullet Templates
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                style={{ background: 'transparent', border: 0, fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text)' }}
              >
                ✕
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px' }}>
              Pre-written, highly effective resume bullet examples categorized by IT domain. Click <strong>Save</strong> or <strong>Copy</strong> to add them to your collection.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
              {IT_BULLET_TEMPLATES.map((cat, idx) => (
                <div key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '14px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand)', marginBottom: '8px' }}>
                    {cat.category}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cat.bullets.map((b, bIdx) => (
                      <div key={bIdx} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', flex: 1, minWidth: '220px' }}>{b}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              handleCopy(b);
                              setShowTemplatesModal(false);
                            }}
                            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveBullet(b);
                              setShowTemplatesModal(false);
                              setActiveTab('saved');
                            }}
                            style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', background: 'var(--brand)', color: '#fff', border: 0 }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RESUME DOCUMENT CONTAINER (Hidden on screen, visible during window.print()) */}
      <div className="printable-resume-container hidden print:block text-slate-900 bg-white p-8">
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24pt', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            IT RESUME BULLETS
          </h1>
          <p style={{ fontSize: '10pt', color: '#64748b', margin: '4px 0 0 0' }}>
            Generated via Jawed.co.in IT Resume Bullet Builder — {new Date().toLocaleDateString()}
          </p>
        </div>

        {savedBullets.length > 0 ? (
          <div>
            <h2 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Saved Professional Experience Highlights ({savedBullets.length})
            </h2>
            <ul style={{ listStyleType: 'disc', paddingLeft: '24px', margin: 0 }}>
              {savedBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="printable-bullet-item"
                  style={{ fontSize: '11pt', lineHeight: '1.6', color: '#0f172a', marginBottom: '10px' }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p style={{ fontSize: '11pt', color: '#64748b' }}>
            No saved resume bullets to display.
          </p>
        )}
      </div>
    </main>
  );
};
