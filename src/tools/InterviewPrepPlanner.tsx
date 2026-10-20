import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SKILLS = [
  "service desk", "it support", "troubleshooting", "servicenow", "jira",
  "apple", "jamf", "macos", "windows", "microsoft 365", "active directory",
  "azure", "networking", "dns", "github", "javascript", "html", "css",
  "python", "sql", "automation", "powershell", "linux", "customer support",
  "documentation", "knowledge base", "leadership", "communication",
  "problem solving", "project management", "excel", "google sheets", "apps script"
];

export const InterviewPrepPlanner: React.FC = () => {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [hasBuilt, setHasBuilt] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [evidenceText, setEvidenceText] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const findSkills = (text: string) => {
    return SKILLS.filter(skill => new RegExp(`\\b${skill}\\b`, 'i').test(text)).slice(0, 16);
  };

  const handleBuild = () => {
    const trimmedJd = jd.trim();
    const trimmedResume = resume.trim();

    if (trimmedJd.length < 80) {
      setErrorMsg('Please paste at least 80 characters from the job description so the planner has enough context.');
      setHasBuilt(true);
      return;
    }
    setErrorMsg('');

    const detected = findSkills(trimmedJd);
    const resumeSkills = findSkills(trimmedResume);
    const gaps = detected.filter(s => !resumeSkills.includes(s));

    const practiceQuestions = [
      "Walk me through a difficult problem you solved and how you narrowed down the cause.",
      "Tell me about a time you had to prioritize several requests.",
      "Describe a situation where your first assumption was wrong. What changed your approach?",
      "Give an example of documentation you created that helped someone else.",
      "Tell me about a time you explained a technical issue to a non-technical stakeholder."
    ];

    detected.slice(0, 7).forEach(s => {
      practiceQuestions.push(`How have you used ${s} in a real situation? What was the problem, your action and the result?`);
    });

    const evidence = trimmedResume
      ? (gaps.length
          ? `Prepare truthful examples for: ${gaps.join(', ')}.`
          : 'Your resume contains the main detected signals; prepare one concrete example for each major area.')
      : 'Prepare 5–7 examples showing ownership, troubleshooting, communication, prioritization and results.';

    setDetectedSkills(detected);
    setEvidenceText(evidence);
    setQuestions(practiceQuestions.slice(0, 12));
    setHasBuilt(true);
  };

  const handleSample = () => {
    const sampleJd = "IT Support Engineer. Support Windows and macOS users. Troubleshoot Microsoft 365 sign-in and network connectivity. Manage incidents in ServiceNow, document knowledge-base solutions, automate repetitive tasks with PowerShell and communicate with stakeholders.";
    const sampleResume = "IT support professional with Windows and macOS troubleshooting, Microsoft 365 support, ServiceNow documentation and small automation experience.";
    setJd(sampleJd);
    setResume(sampleResume);
    setErrorMsg('');
  };

  const handleClear = () => {
    setJd('');
    setResume('');
    setHasBuilt(false);
    setErrorMsg('');
  };

  return (
    <main className="container narrow page">
      <p className="breadcrumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/tools/">Tools</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Interview Preparation Planner</span>
      </p>
      <p className="eyebrow">Tool · Career</p>
      <h1>Interview Preparation Planner</h1>
      <p className="lead">
        Build a targeted interview preparation plan based on the skills and requirements in a job description.
      </p>

      <section className="content-section">
        <div className="bullet-card">
          <p>
            <strong>Browser-only.</strong> Your text stays in this page and is not sent to a server.
          </p>
          <div className="form-field">
            <label htmlFor="jd">Job description (required)</label>
            <textarea
              id="jd"
              rows={6}
              placeholder="Paste the full job description here (at least 80 characters)..."
              value={jd}
              onChange={e => setJd(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginTop: '14px' }}>
            <label htmlFor="resume">Your resume text (optional)</label>
            <textarea
              id="resume"
              rows={5}
              placeholder="Paste your resume or skills summary here to detect gaps..."
              value={resume}
              onChange={e => setResume(e.target.value)}
            />
          </div>
          <div className="bullet-actions">
            <button className="button" id="plan" type="button" onClick={handleBuild}>
              Build Preparation Plan
            </button>
            <button className="button button-secondary" id="sample" type="button" onClick={handleSample}>
              Load sample
            </button>
            <button className="button button-secondary" id="clear" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="content-section" id="results" aria-live="polite">
        {!hasBuilt && (
          <div className="prep-card">
            <h2>Your preparation plan</h2>
            <p className="form-note">Paste a job description and build the plan.</p>
          </div>
        )}

        {hasBuilt && errorMsg && (
          <div className="prep-card">
            <h2>More detail needed</h2>
            <p>{errorMsg}</p>
          </div>
        )}

        {hasBuilt && !errorMsg && (
          <div className="prep-card">
            <h2>Interview preparation plan</h2>
            <h3>Preparation topics</h3>
            <div>
              {detectedSkills.length > 0 ? (
                detectedSkills.map((s, idx) => (
                  <span key={idx} className="tag">
                    {s}
                  </span>
                ))
              ) : (
                <p>
                  No supported skill keywords were detected. Use the responsibilities and requirements in the job description as your main preparation guide.
                </p>
              )}
            </div>

            <h3 style={{ marginTop: '18px' }}>Evidence to prepare</h3>
            <p>{evidenceText}</p>

            <h3>Practice questions</h3>
            <ol>
              {questions.map((q, qIdx) => (
                <li key={qIdx} style={{ marginBottom: '8px' }}>{q}</li>
              ))}
            </ol>

            <h3>Final checklist</h3>
            <ul>
              <li>Use real examples and measurable outcomes where possible.</li>
              <li>Review the technical fundamentals named in the job description.</li>
              <li>Prepare questions about the role, team and success measures.</li>
              <li>Do not claim skills or results you cannot substantiate.</li>
            </ul>
          </div>
        )}
      </section>
    </main>
  );
};
