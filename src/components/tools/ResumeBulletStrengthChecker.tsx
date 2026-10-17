import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface BulletResult {
  bullet: string;
  score: number;
  notes: string[];
}

export const ResumeBulletStrengthChecker: React.FC = () => {
  const [bulletsText, setBulletsText] = useState('');
  const [results, setResults] = useState<BulletResult[] | null>(null);
  const [averageScore, setAverageScore] = useState<string>('0');

  const weakOpenings = [
    'responsible for',
    'worked on',
    'helped with',
    'assisted with',
    'participated in',
    'involved in',
    'duties included',
    'tasked with',
    'was responsible'
  ];

  const fillerPhrases = [
    'hard-working',
    'team player',
    'excellent communication',
    'results-oriented',
    'detail-oriented',
    'go-getter'
  ];

  const actionVerbs = [
    'led',
    'built',
    'created',
    'improved',
    'reduced',
    'increased',
    'resolved',
    'delivered',
    'automated',
    'implemented',
    'managed',
    'designed',
    'launched',
    'optimized',
    'supported',
    'trained',
    'coordinated',
    'developed',
    'migrated',
    'analyzed',
    'configured',
    'maintained',
    'documented'
  ];

  const handleCheck = () => {
    const lines = bulletsText
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (!lines.length) {
      setResults([]);
      setAverageScore('0');
      return;
    }

    let total = 0;
    const evaluated: BulletResult[] = lines.map((line) => {
      const normalized = line
        .replace(/^\s*(?:[-*•▪‣◦]+\s*|\d{1,3}[.)]\s+|[a-z][.)]\s+)/i, '')
        .trim();
      const lower = normalized.toLowerCase();
      const words = normalized.split(/\s+/).filter(Boolean);

      const weakHit = weakOpenings.find((x) => lower.startsWith(x));
      const fillerHit = fillerPhrases.find((x) => lower.includes(x));

      const hasMetric =
        /\b\d+(?:\.\d+)?\+?\s*(?:percent|x|k|m|b|hours?|days?|weeks?|months?|minutes?|users?|tickets?|clients?|projects?|incidents?|cases?|devices?|calls?)\b|\b\d+(?:\.\d+)?\+?\s*%|[₹$]\s*\d/i.test(
          line
        );
      const hasOutcome =
        /\b(?:validated|confirmed|restored|resolved|reduced|increased|improved|completed|enabled|prevented|delivered|achieved|eliminated|shortened|recovered|maintained|met|exceeded)\b/i.test(
          line
        );
      const hasEvidence = hasMetric || hasOutcome;

      const startsWithVerb = actionVerbs.some((x) => lower.startsWith(x + ' '));
      const isGoodLength = words.length >= 8 && words.length <= 34;

      const score =
        (startsWithVerb ? 1 : 0) +
        (hasEvidence ? 1 : 0) +
        (isGoodLength ? 1 : 0) +
        (!weakHit && !fillerHit ? 1 : 0);

      total += score;

      const notes: string[] = [];
      if (!startsWithVerb) notes.push('Start with a clear action verb.');
      if (!hasEvidence) notes.push('Add a specific, truthful outcome or measurable evidence when available.');
      if (!isGoodLength) {
        notes.push(words.length < 8 ? 'Add enough context to show what changed.' : 'Trim unnecessary wording.');
      }
      if (weakHit) notes.push(`Replace “${weakHit}” with what you actually did.`);
      if (fillerHit) notes.push('Remove vague filler and show specific evidence.');

      return {
        bullet: line,
        score,
        notes
      };
    });

    setResults(evaluated);
    setAverageScore((total / lines.length).toFixed(1));
  };

  const handleLoadSample = () => {
    const sample =
      'Responsible for handling IT support tickets.\nResolved recurring desktop issues, documented checks and confirmed the user could complete the original task.\nWorked on device setup and software troubleshooting.\nAutomated a repetitive onboarding check with PowerShell and documented the steps for reuse.';
    setBulletsText(sample);
  };

  const handleClear = () => {
    setBulletsText('');
    setResults(null);
    setAverageScore('0');
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · Career</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Resume Bullet Strength Checker</span>
      </div>

      <h1>Resume Bullet Strength Checker</h1>
      <p className="lead">
        Check whether your resume bullets clearly show action, evidence and impact. Paste one bullet per line.
      </p>

      <section className="content-section">
        <div className="card">
          <p>
            <strong>Browser-only.</strong> Your resume text stays in this page. Nothing is uploaded or sent to an AI service.
          </p>
          <div className="form-field" style={{ marginTop: '14px' }}>
            <label htmlFor="bullets">Resume bullets (one per line)</label>
            <textarea
              id="bullets"
              rows={8}
              placeholder="Example: Diagnosed recurring desktop issues, documented checks and validated the outcome."
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="button" type="button" onClick={handleCheck}>
              Check Bullets
            </button>
            <button className="button button-secondary" type="button" onClick={handleLoadSample}>
              Load sample
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Results</h2>
        {results === null ? (
          <p className="form-note">Paste your bullets and click "Check Bullets" to run the diagnostic.</p>
        ) : results.length === 0 ? (
          <p className="form-note">Please enter at least one bullet to check.</p>
        ) : (
          <div>
            <div className="stat" style={{ marginBottom: '18px' }}>
              <strong>{averageScore} / 4</strong>
              <span>Average bullet strength across {results.length} checked bullet{results.length > 1 ? 's' : ''}</span>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {results.map((r, i) => (
                <div key={i} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '1.05rem' }}>Bullet {i + 1}</strong>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        background: r.score >= 3 ? '#e6f7ed' : '#fff4e5',
                        color: r.score >= 3 ? '#166534' : '#9a3412'
                      }}
                    >
                      {r.score} / 4
                    </span>
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--text)', marginBottom: '10px' }}>
                    "{r.bullet}"
                  </p>
                  {r.notes.length === 0 ? (
                    <p style={{ color: '#166534', fontWeight: 600, margin: 0 }}>
                      ✓ Strong bullet. Meets action verb, evidence, length, and concise criteria.
                    </p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--muted)' }}>
                      {r.notes.map((note, nIdx) => (
                        <li key={nIdx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
