import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AnalysisResult {
  id: string;
  date: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

interface TrackerItem {
  id: string;
  company: string;
  role: string;
  status: 'Applied' | 'Interview' | 'Rejected' | 'Offer';
  date: string;
}

const COMMON_SKILLS = [
  'it support',
  'service desk',
  'troubleshooting',
  'macos',
  'apple',
  'jamf',
  'windows',
  'active directory',
  'microsoft 365',
  'azure',
  'networking',
  'dns',
  'dhcp',
  'vpn',
  'powershell',
  'bash',
  'python',
  'javascript',
  'servicenow',
  'jira',
  'okta',
  'google workspace',
  'hardware',
  'ticketing',
  'customer service',
  'documentation',
  'incident management',
  'asset management'
];

export const CareerMatchResumeReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'results' | 'tracker' | 'saved'>('analyze');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<AnalysisResult[]>([]);
  const [trackerJobs, setTrackerJobs] = useState<TrackerItem[]>([]);

  // Tracker form
  const [tCompany, setTCompany] = useState('');
  const [tRole, setTRole] = useState('');
  const [tStatus, setTStatus] = useState<'Applied' | 'Interview' | 'Rejected' | 'Offer'>('Applied');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedSaved = localStorage.getItem('jawed_saved_analyses');
      if (storedSaved) setSavedAnalyses(JSON.parse(storedSaved));

      const storedTracker = localStorage.getItem('jawed_tracker_jobs');
      if (storedTracker) setTrackerJobs(JSON.parse(storedTracker));

      const storedTheme = localStorage.getItem('jawed_career_theme') as 'light' | 'dark' | null;
      if (storedTheme) setTheme(storedTheme);
    } catch {
      // Local storage fallback
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('jawed_career_theme', next);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setResumeText(String(event.target?.result || ''));
        setStatusMsg('Text file loaded successfully.');
      };
      reader.readAsText(file);
    } else {
      setStatusMsg(`File "${file.name}" selected. For full text analysis, you can also paste the text directly.`);
    }
  };

  const analyzeMatch = () => {
    const rText = resumeText.trim().toLowerCase();
    const jText = jdText.trim().toLowerCase();

    if (!jText) {
      setStatusMsg('Please paste a job description.');
      return;
    }

    const jdSkills = COMMON_SKILLS.filter((s) => jText.includes(s));
    const matched = jdSkills.filter((s) => rText.includes(s));
    const missing = jdSkills.filter((s) => !rText.includes(s));

    const total = jdSkills.length > 0 ? jdSkills.length : 1;
    const score = Math.min(100, Math.round((matched.length / total) * 100));

    const recs: string[] = [];
    if (missing.length > 0) {
      recs.push(`Consider adding verifiable experience with missing skills: ${missing.slice(0, 5).join(', ')}.`);
    }
    recs.push('Ensure experience bullets use strong action verbs and verified outcomes rather than passive duty descriptions.');
    if (rText.length < 300) {
      recs.push('Your resume text appears brief. Expanding on technical scope and tooling will improve match detection.');
    }

    const result: AnalysisResult = {
      id: String(Date.now()),
      date: new Date().toLocaleDateString(),
      jobTitle: jText.slice(0, 30).split('\n')[0] || 'Target Role',
      company: 'Prospective Employer',
      matchScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      recommendations: recs
    };

    setCurrentResult(result);
    setActiveTab('results');
    setStatusMsg('');
  };

  const loadSample = () => {
    setResumeText(
      'IT Field Tech with 5+ years of experience in macOS, Windows 10/11, Jamf Pro device management, and ServiceNow incident resolution. Experienced in Microsoft 365 administration, Active Directory, hardware provisioning, and local network troubleshooting (DNS, DHCP, VPN).'
    );
    setJdText(
      'Senior IT Support Specialist required. Responsibilities include managing Apple Mac devices with Jamf Pro, administering Microsoft 365 and Azure AD, supporting network connectivity (DNS, VPN), managing tickets in ServiceNow, and automating repetitive tasks with PowerShell or Python.'
    );
    setStatusMsg('Sample loaded.');
  };

  const saveCurrentAnalysis = () => {
    if (!currentResult) return;
    const updated = [currentResult, ...savedAnalyses.filter((s) => s.id !== currentResult.id)];
    setSavedAnalyses(updated);
    localStorage.setItem('jawed_saved_analyses', JSON.stringify(updated));
    setStatusMsg('Analysis saved to your browser.');
  };

  const deleteAnalysis = (id: string) => {
    const updated = savedAnalyses.filter((s) => s.id !== id);
    setSavedAnalyses(updated);
    localStorage.setItem('jawed_saved_analyses', JSON.stringify(updated));
  };

  const addTrackerJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tCompany.trim() || !tRole.trim()) return;

    const newJob: TrackerItem = {
      id: String(Date.now()),
      company: tCompany.trim(),
      role: tRole.trim(),
      status: tStatus,
      date: new Date().toLocaleDateString()
    };

    const updated = [newJob, ...trackerJobs];
    setTrackerJobs(updated);
    localStorage.setItem('jawed_tracker_jobs', JSON.stringify(updated));
    setTCompany('');
    setTRole('');
  };

  const updateJobStatus = (id: string, status: TrackerItem['status']) => {
    const updated = trackerJobs.map((j) => (j.id === id ? { ...j, status } : j));
    setTrackerJobs(updated);
    localStorage.setItem('jawed_tracker_jobs', JSON.stringify(updated));
  };

  const deleteJob = (id: string) => {
    const updated = trackerJobs.filter((j) => j.id !== id);
    setTrackerJobs(updated);
    localStorage.setItem('jawed_tracker_jobs', JSON.stringify(updated));
  };

  return (
    <div
      style={{
        background: theme === 'dark' ? '#0b0f1a' : 'var(--bg)',
        color: theme === 'dark' ? '#e8ecf5' : 'var(--text)',
        minHeight: '100vh',
        paddingBottom: '40px'
      }}
    >
      <main id="main-content" className="container page">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/tools/">Tools</Link>
          <span>/</span>
          <span aria-current="page">Career Match &amp; Resume Review</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p className="eyebrow">Tool · Career</p>
            <h1 style={{ margin: '0.1em 0' }}>Career Match &amp; Resume Review</h1>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
          >
            {theme === 'dark' ? '☀️ Light Theme' : '🌙 Dark Theme'}
          </button>
        </div>

        <p className="lead">
          Compare your resume against a job description in your browser to evaluate skill alignment, identify keyword gaps, and track applications.
        </p>

        {/* Tab Navigation */}
        <div className="actions" style={{ marginBottom: '24px' }} role="tablist">
          <button
            type="button"
            className={`button ${activeTab === 'analyze' ? '' : 'button-secondary'}`}
            onClick={() => setActiveTab('analyze')}
          >
            Analyze
          </button>
          <button
            type="button"
            className={`button ${activeTab === 'results' ? '' : 'button-secondary'}`}
            onClick={() => setActiveTab('results')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`button ${activeTab === 'tracker' ? '' : 'button-secondary'}`}
            onClick={() => setActiveTab('tracker')}
          >
            Application Tracker ({trackerJobs.length})
          </button>
          <button
            type="button"
            className={`button ${activeTab === 'saved' ? '' : 'button-secondary'}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved ({savedAnalyses.length})
          </button>
        </div>

        {activeTab === 'analyze' && (
          <section className="card" style={{ background: theme === 'dark' ? '#131a2c' : '#fff' }}>
            <div className="card-grid two">
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  1. Your Resume File or Text
                </label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  style={{ marginBottom: '8px' }}
                />
                <textarea
                  rows={10}
                  placeholder="Or paste your resume text here…"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  2. Target Job Description
                </label>
                <textarea
                  rows={12}
                  placeholder="Paste the full job description here…"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
            </div>

            <div className="actions" style={{ marginTop: '16px' }}>
              <button className="button" type="button" onClick={analyzeMatch}>
                Analyze My Match
              </button>
              <button className="button button-secondary" type="button" onClick={loadSample}>
                Load Sample
              </button>
            </div>

            {statusMsg && (
              <p className="form-note" style={{ marginTop: '10px' }}>
                {statusMsg}
              </p>
            )}
          </section>
        )}

        {activeTab === 'results' && (
          <section className="card" style={{ background: theme === 'dark' ? '#131a2c' : '#fff' }}>
            {!currentResult ? (
              <p className="form-note">Run an analysis in the Analyze tab to see results here.</p>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Match Score: {currentResult.matchScore}%</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
                      Analyzed on {currentResult.date}
                    </p>
                  </div>
                  <button className="button" type="button" onClick={saveCurrentAnalysis}>
                    Save Analysis
                  </button>
                </div>

                <div className="card-grid two" style={{ marginTop: '20px' }}>
                  <div className="card" style={{ background: theme === 'dark' ? '#1c2438' : '#f0fdf4' }}>
                    <h3 style={{ color: '#166534' }}>
                      Matching Skills ({currentResult.matchedSkills.length})
                    </h3>
                    {currentResult.matchedSkills.length === 0 ? (
                      <p className="form-note">No detected common skills matched your resume text.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {currentResult.matchedSkills.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ background: theme === 'dark' ? '#1c2438' : '#fef2f2' }}>
                    <h3 style={{ color: '#991b1b' }}>
                      Skills in Job Description to Address ({currentResult.missingSkills.length})
                    </h3>
                    {currentResult.missingSkills.length === 0 ? (
                      <p className="form-note">Great job! All detected skills from the JD appear in your resume text.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {currentResult.missingSkills.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              padding: '3px 9px',
                              borderRadius: '999px',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            + {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ marginTop: '24px' }}>Recommendations</h3>
                <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                  {currentResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {activeTab === 'tracker' && (
          <section className="card" style={{ background: theme === 'dark' ? '#131a2c' : '#fff' }}>
            <h2>Application Tracker</h2>
            <form onSubmit={addTrackerJob} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Company"
                value={tCompany}
                onChange={(e) => setTCompany(e.target.value)}
                style={{ flex: 1, minWidth: '160px' }}
                required
              />
              <input
                type="text"
                placeholder="Role"
                value={tRole}
                onChange={(e) => setTRole(e.target.value)}
                style={{ flex: 1, minWidth: '160px' }}
                required
              />
              <select
                value={tStatus}
                onChange={(e) => setTStatus(e.target.value as TrackerItem['status'])}
                style={{ width: 'auto' }}
              >
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Rejected">Rejected</option>
                <option value="Offer">Offer</option>
              </select>
              <button className="button" type="submit">
                Add Job
              </button>
            </form>

            {trackerJobs.length === 0 ? (
              <p className="form-note">No job applications tracked yet. Add your first job above.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {(['Applied', 'Interview', 'Offer', 'Rejected'] as const).map((colStatus) => {
                  const filtered = trackerJobs.filter((j) => j.status === colStatus);
                  return (
                    <div
                      key={colStatus}
                      className="card"
                      style={{
                        background: theme === 'dark' ? '#1c2438' : 'var(--surface)',
                        minHeight: '160px'
                      }}
                    >
                      <h4 style={{ margin: '0 0 10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{colStatus}</span>
                        <span>({filtered.length})</span>
                      </h4>
                      {filtered.map((job) => (
                        <div
                          key={job.id}
                          style={{
                            background: theme === 'dark' ? '#25304b' : '#fff',
                            border: '1px solid var(--line)',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '8px'
                          }}
                        >
                          <strong>{job.company}</strong>
                          <p style={{ margin: '2px 0 6px', fontSize: '0.9rem' }}>{job.role}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <select
                              value={job.status}
                              onChange={(e) =>
                                updateJobStatus(job.id, e.target.value as TrackerItem['status'])
                              }
                              style={{ padding: '2px 6px', fontSize: '0.8rem', width: 'auto' }}
                            >
                              <option value="Applied">Applied</option>
                              <option value="Interview">Interview</option>
                              <option value="Offer">Offer</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => deleteJob(job.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'saved' && (
          <section className="card" style={{ background: theme === 'dark' ? '#131a2c' : '#fff' }}>
            <h2>Saved Analyses</h2>
            {savedAnalyses.length === 0 ? (
              <p className="form-note">No saved analyses in local storage yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {savedAnalyses.map((s) => (
                  <div
                    key={s.id}
                    className="card"
                    style={{
                      background: theme === 'dark' ? '#1c2438' : 'var(--surface)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <strong>{s.jobTitle}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Score: {s.matchScore}% • {s.date}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setCurrentResult(s);
                          setActiveTab('results');
                        }}
                      >
                        View
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        style={{ color: '#b91c1c' }}
                        onClick={() => deleteAnalysis(s.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
