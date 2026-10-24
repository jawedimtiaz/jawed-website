import React, { useState, useEffect, useMemo } from 'react';
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

export const ITResumeBulletBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'check' | 'saved'>('build');
  const [role, setRole] = useState(Object.keys(ROLES)[0]);
  const [verb, setVerb] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('rb_verb') || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [task, setTask] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('rb_task') || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [tools, setTools] = useState('');
  const [scale, setScale] = useState('');
  const [result, setResult] = useState('');
  const [generatedOuts, setGeneratedOuts] = useState<Array<{ n: string; t: string }> | null>(null);

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

  // Keyboard accessibility: Escape key closes modals/dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSynonymsModal(false);
        setShowTemplatesModal(false);
        setExportDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleGenerate = () => {
    const outs = buildBullets({ verb, task, tools, scale, result });
    setGeneratedOuts(outs);
    if (!outs) {
      showToast('Enter at least an action verb and what you did.');
    }
  };

  const handleDemo = () => {
    setRole('Network engineer');
    setVerb('Configured');
    setTask('VLAN segmentation across three office floors');
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
    showToast('Loaded example');
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
                onChange={e => setVerb(e.target.value)}
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
              <label htmlFor="task" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                What did you do? (Task / Scope)
              </label>
              <textarea
                id="task"
                value={task}
                onChange={e => setTask(e.target.value)}
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
            <div id="outs" style={{ marginTop: '16px' }}>
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
          <div className="row" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleCopy(savedBullets.map(t => '• ' + t).join('\n'))}
              disabled={savedBullets.length === 0}
            >
              Copy all
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
                    minWidth: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px',
                  }}
                >
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
                  <button
                    type="button"
                    onClick={() => { handleDownloadPdf(); setExportDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.9rem' }}
                  >
                    📑 Export as PDF
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
    </main>
  );
};
