import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const InterviewPreparationPlanner: React.FC = () => {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [planResult, setPlanResult] = useState<{
    detected: string[];
    gap: string[];
    questions: string[];
    evidence: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const skillsList = [
    'service desk',
    'it support',
    'troubleshooting',
    'servicenow',
    'jira',
    'apple',
    'jamf',
    'macos',
    'windows',
    'microsoft 365',
    'active directory',
    'azure',
    'networking',
    'dns',
    'github',
    'javascript',
    'html',
    'css',
    'python',
    'sql',
    'automation',
    'powershell',
    'linux',
    'customer support',
    'documentation',
    'knowledge base',
    'leadership',
    'communication',
    'problem solving',
    'project management',
    'excel',
    'google sheets'
  ];

  const findSkills = (text: string) => {
    return skillsList
      .filter((s) => new RegExp('\\b' + s.replace('+', '\\+') + '\\b', 'i').test(text))
      .slice(0, 16);
  };

  const handleBuildPlan = () => {
    const trimmedJd = jd.trim();
    const trimmedResume = resume.trim();

    if (trimmedJd.length < 80) {
      setErrorMsg('Please paste at least 80 characters from the job description so the planner has enough context.');
      setPlanResult(null);
      return;
    }

    setErrorMsg('');
    const detected = findSkills(trimmedJd);
    const resumeSkills = findSkills(trimmedResume);
    const gap = detected.filter((x) => !resumeSkills.includes(x));

    const coreQuestions = [
      'Walk me through a difficult technical problem you solved and how you narrowed down the root cause.',
      'Tell me about a time you had to prioritize several urgent service desk requests simultaneously.',
      'Describe a situation where your initial diagnostic assumption was wrong. What changed your approach?',
      'Give an example of documentation or a knowledge-base article you created that helped others.',
      'Tell me about a time you explained a complex technical issue to an upset or non-technical stakeholder.'
    ];

    const customizedQuestions = [...coreQuestions];
    detected.slice(0, 7).forEach((skill) => {
      customizedQuestions.push(
        `How have you used ${skill} in a real situation? What was the problem, your action, and the result?`
      );
    });

    let evidenceText = '';
    if (trimmedResume) {
      evidenceText = gap.length
        ? `Prepare concrete examples for missing requirements: ${gap.join(', ')}.`
        : 'Your resume covers the main detected skills; prepare one verifiable outcome for each key area.';
    } else {
      evidenceText = 'Prepare 5–7 STAR examples showing problem isolation, ownership, prioritization, communication, and verified outcomes.';
    }

    setPlanResult({
      detected,
      gap,
      questions: customizedQuestions,
      evidence: evidenceText
    });
  };

  const handleLoadSample = () => {
    setJd(
      'IT Support Engineer. Support Windows and macOS users. Troubleshoot Microsoft 365 sign-in and network connectivity. Manage incidents in ServiceNow, document knowledge-base solutions, automate repetitive tasks with PowerShell and communicate with stakeholders.'
    );
    setResume(
      'IT support professional with Windows and macOS troubleshooting, Microsoft 365 support, ServiceNow documentation and small automation experience.'
    );
  };

  const handleClear = () => {
    setJd('');
    setResume('');
    setPlanResult(null);
    setErrorMsg('');
  };

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Tool · Career</p>
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tools/">Tools</Link>
        <span>/</span>
        <span aria-current="page">Interview Preparation Planner</span>
      </div>

      <h1>Interview Preparation Planner</h1>
      <p className="lead">
        Paste a job description to extract target skills, identify resume coverage gaps, and generate customized interview practice questions.
      </p>

      <section className="content-section">
        <div className="card">
          <div className="form-field">
            <label htmlFor="jd">1. Job Description (at least 80 characters)</label>
            <textarea
              id="jd"
              rows={6}
              placeholder="Paste the full job description or responsibilities here…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              required
            />
          </div>

          <div className="form-field" style={{ marginTop: '14px' }}>
            <label htmlFor="resume">2. Your Resume text (optional for gap analysis)</label>
            <textarea
              id="resume"
              rows={5}
              placeholder="Paste your resume experience bullets or skills summary here…"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>

          <div className="actions">
            <button className="button" type="button" onClick={handleBuildPlan}>
              Build Preparation Plan
            </button>
            <button className="button button-secondary" type="button" onClick={handleLoadSample}>
              Load sample (fictional)
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>

          {errorMsg && (
            <p className="form-note" style={{ color: '#b91c1c', marginTop: '10px' }}>
              {errorMsg}
            </p>
          )}
        </div>
      </section>

      <section className="content-section" aria-live="polite">
        <h2>Your Preparation Plan</h2>
        {!planResult ? (
          <p className="form-note">Paste a job description and click "Build Preparation Plan" to generate your plan.</p>
        ) : (
          <div className="card" style={{ background: 'var(--surface)' }}>
            <h3>Detected Target Skills</h3>
            {planResult.detected.length === 0 ? (
              <p className="form-note">
                No standard skill keywords detected in the job description. Review the core responsibilities manually.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {planResult.detected.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.88rem',
                      fontWeight: 600
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <h3>Evidence to Prepare</h3>
            <p>{planResult.evidence}</p>

            <h3 style={{ marginTop: '16px' }}>Practice Interview Questions (STAR Method)</h3>
            <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
              {planResult.questions.map((q, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  {q}
                </li>
              ))}
            </ol>

            <h3 style={{ marginTop: '16px' }}>Preparation Checklist</h3>
            <ul style={{ paddingLeft: '20px', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li>Structure answers using Situation, Task, Action, and verifiable Result (STAR).</li>
              <li>Review fundamentals for each technology named in the job posting.</li>
              <li>Prepare 2–3 thoughtful questions for the interviewers about team processes and environment scale.</li>
              <li>Never claim direct production experience with tools you haven't used.</li>
            </ul>
          </div>
        )}
      </section>
    </main>
  );
};
