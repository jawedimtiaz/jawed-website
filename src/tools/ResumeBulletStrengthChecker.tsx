import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface BulletAnalysis {
  text: string;
  score: 'strong' | 'weak' | 'poor';
  actionVerb: boolean;
  metric: boolean;
  passiveVoice: boolean;
  lengthOk: boolean;
  feedback: string[];
}

const ACTION_VERBS = [
  'accelerated', 'achieved', 'automated', 'built', 'configured', 'coordinated', 'decreased',
  'delivered', 'deployed', 'designed', 'developed', 'diagnosed', 'eliminated', 'engineered',
  'enhanced', 'established', 'executed', 'expedited', 'facilitated', 'guided', 'implemented',
  'improved', 'increased', 'initiated', 'installed', 'instituted', 'integrated', 'launched',
  'led', 'managed', 'maximized', 'mentored', 'migrated', 'minimized', 'modernized', 'optimized',
  'orchestrated', 'overhauled', 'pioneered', 'reduced', 'reengineered', 'reorganized', 'resolved',
  'restructured', 'revamped', 'scaled', 'simplified', 'spearheaded', 'standardized', 'streamlined',
  'strengthened', 'transformed', 'upgraded'
];

const WEAK_OPENERS = [
  'responsible for', 'duties included', 'worked on', 'helped with', 'assisted in', 'handled',
  'involved in', 'tasked with', 'participated in', 'supported team with'
];

export const ResumeBulletStrengthChecker: React.FC = () => {
  const [bulletsInput, setBulletsInput] = useState(
    `Engineered automated PowerShell onboarding scripts, reducing user provisioning turnaround time from 48 hours to 20 minutes across 350+ workstations.\nResolved over 1,200 Tier 2 tickets maintaining a 98.4% customer satisfaction rating and zero SLA breaches.\nResponsible for helping with WiFi connectivity issues in the main office.\nAssisted in migrating mailboxes to Exchange Online.`
  );

  const analyzeBullet = (line: string): BulletAnalysis | null => {
    const trimmed = line.trim().replace(/^[-•*]\s*/, '');
    if (!trimmed) return null;

    const words = trimmed.toLowerCase().split(/\s+/);
    const firstWord = words[0];

    const hasWeakOpener = WEAK_OPENERS.some(op => trimmed.toLowerCase().startsWith(op));
    const hasActionVerb = ACTION_VERBS.includes(firstWord) && !hasWeakOpener;
    const hasMetric = /\b\d+(\.\d+)?%?|\$\d+|\d+\+|\b(hundred|thousand|million)\b/i.test(trimmed);
    const hasPassiveVoice = /\b(was|were|is|are|been)\s+\w+ed\b/i.test(trimmed);
    const wordCount = words.length;
    const lengthOk = wordCount >= 8 && wordCount <= 35;

    const feedback: string[] = [];
    let score: 'strong' | 'weak' | 'poor' = 'poor';

    if (hasWeakOpener) {
      feedback.push('Avoid passive openers like "Responsible for" or "Assisted in". Lead directly with what you achieved.');
    } else if (!hasActionVerb) {
      feedback.push(`Start with a powerful past-tense action verb (e.g. "Spearheaded", "Automated", "Engineered", "Resolved").`);
    }

    if (!hasMetric) {
      feedback.push('Missing measurable outcome: include numbers, percentages, time saved, tickets closed, or budget impacted.');
    }

    if (wordCount < 8) {
      feedback.push('Too concise: expand with context, specific tools used, and business outcome.');
    } else if (wordCount > 35) {
      feedback.push('Too wordy: split into two distinct achievements or trim unnecessary filler.');
    }

    if (hasActionVerb && hasMetric && lengthOk && !hasWeakOpener) {
      score = 'strong';
      feedback.push('Excellent bullet: strong action verb, clear quantifiable impact, concise delivery.');
    } else if ((hasActionVerb || hasMetric) && !hasWeakOpener) {
      score = 'weak';
    }

    return {
      text: trimmed,
      score,
      actionVerb: hasActionVerb,
      metric: hasMetric,
      passiveVoice: hasPassiveVoice,
      lengthOk,
      feedback,
    };
  };

  const lines = bulletsInput.split('\n').filter(l => l.trim().length > 0);
  const analyses = lines.map(analyzeBullet).filter((b): b is BulletAnalysis => b !== null);

  const strongCount = analyses.filter(a => a.score === 'strong').length;
  const weakCount = analyses.filter(a => a.score === 'weak').length;
  const poorCount = analyses.filter(a => a.score === 'poor').length;
  const total = analyses.length;
  const scorePercent = total > 0 ? Math.round((strongCount * 100 + weakCount * 50) / total) : 0;

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <Link to="/tools">Tools</Link> &gt; <span>Resume Bullet Strength Checker</span>
        </nav>

        <header className="page-header">
          <h1 className="page-title">Resume Bullet Strength Checker</h1>
          <p className="page-lead">
            Analyze your resume bullet points for action verbs, quantified business impact, and active phrasing that passes recruiter screening.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Enter Bullet Points (One per line)</h2>
            <div className="bullet-card" style={{ border: 'none', padding: 0 }}>
              <textarea
                value={bulletsInput}
                onChange={e => setBulletsInput(e.target.value)}
                rows={6}
                placeholder="Paste each resume bullet point on a separate line..."
              />
            </div>

            {total > 0 && (
              <div className="bullet-scorecard">
                <div className="bullet-score">
                  <span>Overall Strength Score</span>
                  <strong>{scorePercent}%</strong>
                </div>
                <div className="bullet-score">
                  <span>Strong Bullets</span>
                  <strong style={{ color: '#10b981' }}>{strongCount}</strong>
                </div>
                <div className="bullet-score">
                  <span>Needs Polish</span>
                  <strong style={{ color: '#f59e0b' }}>{weakCount}</strong>
                </div>
                <div className="bullet-score">
                  <span>Needs Overhaul</span>
                  <strong style={{ color: '#ef4444' }}>{poorCount}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="section-title">Line-by-Line Breakdown</h2>
            <div className="bullet-list">
              {analyses.map((a, i) => (
                <div key={i} className={`bullet-item ${a.score}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem', color: a.score === 'strong' ? '#10b981' : a.score === 'weak' ? '#d97706' : '#dc2626' }}>
                      {a.score}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {a.metric ? '✓ Metric Included' : '✗ Missing Metric'} | {a.actionVerb ? '✓ Action Verb' : '✗ Weak Opener'}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 4px', fontWeight: 500 }}>{a.text}</p>
                  <ul className="bullet-feedback" style={{ paddingLeft: '20px', margin: '4px 0 0' }}>
                    {a.feedback.map((f, fIdx) => (
                      <li key={fIdx}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
