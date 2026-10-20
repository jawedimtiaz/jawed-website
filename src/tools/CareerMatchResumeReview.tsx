import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STOP = new Set("about above after also and any are been but can could does each for from had has have her his how into its may more most must not our out over per should some such than that the their them then there these they this those through too under was were what when where which while who will with within would you your able ability strong excellent good great including include includes required requirements preferred plus work working works role team teams company candidate candidates job years year experience experienced looking join position responsibilities responsible skills skill knowledge understanding across using use used well based need needs like new".split(" "));
const SKILLS = "python,java,javascript,typescript,c++,c#,golang,rust,ruby,php,swift,kotlin,scala,sql,nosql,mysql,postgresql,mongodb,redis,oracle,html,css,sass,react,angular,vue,next.js,node.js,express,django,flask,fastapi,spring boot,.net,graphql,rest api,microservices,docker,kubernetes,terraform,ansible,jenkins,ci/cd,git,github,gitlab,linux,bash,aws,azure,gcp,cloud computing,devops,agile,scrum,kanban,jira,confluence,tdd,unit testing,selenium,cypress,jest,machine learning,deep learning,nlp,computer vision,tensorflow,pytorch,scikit-learn,pandas,numpy,data analysis,data science,data engineering,data visualization,tableau,power bi,excel,looker,spark,hadoop,kafka,airflow,etl,snowflake,bigquery,statistics,a/b testing,product management,roadmapping,stakeholder management,project management,leadership,mentoring,communication,problem solving,teamwork,collaboration,customer service,sales,negotiation,crm,salesforce,hubspot,seo,sem,content marketing,social media,google analytics,copywriting,email marketing,marketing automation,budgeting,forecasting,financial modeling,accounting,quickbooks,sap,erp,recruiting,onboarding,payroll,compliance,risk management,auditing,figma,sketch,adobe photoshop,ux design,ui design,user research,wireframing,prototyping,accessibility,cybersecurity,penetration testing,siem,networking,api design,system design,react native,flutter,android,ios,mobile development,blockchain,solidity,supply chain,logistics,six sigma,operations management,customer success,technical writing,presentation,analytics,reporting,strategic planning".split(",");
const ALIAS: Record<string, string[]> = {javascript:["js","ecmascript"],typescript:["ts"],kubernetes:["k8s"],postgresql:["postgres"],"node.js":["nodejs","node js"],react:["reactjs","react.js"],vue:["vuejs","vue.js"],aws:["amazon web services"],gcp:["google cloud"],"machine learning":["ml"],"ci/cd":["cicd","continuous integration"],"rest api":["rest","restful"],"power bi":["powerbi"],"scikit-learn":["sklearn"],"c#":["csharp"],"c++":["cpp"],".net":["dotnet"],nlp:["natural language processing"],seo:["search engine optimization"],"user research":["ux research"],"a/b testing":["ab testing","split testing"]};
const LEARN: Record<string, string> = {python:"Work through the official Python tutorial, then automate one real task with a script.",sql:"Practice joins, aggregations and window functions on free datasets (e.g. SQLBolt).",docker:"Containerise a small app using Docker's official Get Started guide.",kubernetes:"Follow the official Kubernetes basics tutorial on a local kind or minikube cluster.",aws:"Use the AWS free tier with the Cloud Practitioner learning path.",react:"Build a small app with the official react.dev tutorial.",tableau:"Use Tableau Public to build and publish one dashboard from an open dataset.",agile:"Read the Scrum Guide (free) and describe one past project in Agile terms if it truly applied."};
const PROT = /\b(gender|marital status|date of birth|dob|religion|nationality|age\s*:\s*\d+|photo)\b/i;
const WEAK = /^(responsible for|responsibilities included|worked on|worked with|helped( to)?|assisted( with| in)?|involved in|duties included|tasked with|participated in|handled)\b/i;
const PRETTY: Record<string, string> = {postgresql:"PostgreSQL",mysql:"MySQL",mongodb:"MongoDB",javascript:"JavaScript",typescript:"TypeScript","node.js":"Node.js","next.js":"Next.js",aws:"AWS",gcp:"GCP",sql:"SQL",nosql:"NoSQL",css:"CSS",html:"HTML","ci/cd":"CI/CD","rest api":"REST API",graphql:"GraphQL",github:"GitHub",gitlab:"GitLab",nlp:"NLP",seo:"SEO",sem:"SEM",crm:"CRM",erp:"ERP",sap:"SAP",etl:"ETL",tdd:"TDD",siem:"SIEM",ios:"iOS","power bi":"Power BI",tensorflow:"TensorFlow",pytorch:"PyTorch",".net":".NET",php:"PHP",fastapi:"FastAPI","scikit-learn":"scikit-learn",bigquery:"BigQuery",hubspot:"HubSpot",quickbooks:"QuickBooks",devops:"DevOps",golang:"Go (Golang)","api design":"API design","a/b testing":"A/B testing","ux design":"UX design","ui design":"UI design"};

const pretty = (s: string) => PRETTY[s] || s.replace(/(^|\s)([a-z])/g, (_, a, b) => a + b.toUpperCase());
const rx = (t: string) => t.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
function has(text: string, skill: string) {
  return [skill, ...(ALIAS[skill] || [])].some(t => new RegExp("(?<![a-z0-9+#.])" + rx(t) + "(?![a-z0-9+#])", "i").test(text));
}
const skillsIn = (t: string) => SKILLS.filter(s => has(t, s));
const words = (t: string) => (t.toLowerCase().match(/[a-z][a-z0-9+#.\-]*/g) || []).map(w => w.replace(/[.\-]+$/, ""));
const stem = (w: string) => w.length > 5 ? w.replace(/(ing|ed|es|s)$/, "") : w;

function jdKeywords(jd: string, n = 20) {
  const m = new Map<string, { word: string; stem: string; count: number; first: number }>();
  let i = 0;
  for (const w of words(jd)) {
    if (STOP.has(w) || w.length < 4) continue;
    const s = stem(w);
    const e = m.get(s) || { word: w, stem: s, count: 0, first: i++ };
    e.count++;
    m.set(s, e);
  }
  const arr = [...m.values()].sort((a, b) => b.count - a.count || a.first - b.first);
  let top = arr.filter(k => k.count >= 2).slice(0, n);
  if (top.length < 8) top = arr.slice(0, 12);
  return top;
}

function jdYears(jd: string): number | null {
  const m = [...jd.matchAll(/(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(\d{1,2})?\s*\+?\s*(?:years|yrs)/gi)];
  if (!m.length) return null;
  const near = m.find(x => /experience/i.test(jd.slice(Math.max(0, (x.index || 0) - 60), (x.index || 0) + x[0].length + 60)));
  const v = +(near || m[0])[1];
  return v > 0 ? v : null;
}

function resumeYears(t: string) {
  const ex = [...t.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:[a-z]+\s+){0,3}experience/gi)].map(x => +x[1]);
  const cy = new Date().getFullYear();
  const iv: [number, number][] = [];
  for (const line of t.split(/\r?\n/)) {
    if (/bachelor|master|degree|university|college|diploma|ph\.?d|b\.?tech|m\.?tech/i.test(line)) continue;
    for (const m of line.matchAll(/\b((?:19|20)\d\d)\s*(?:-|–|—|to)\s*((?:19|20)\d\d|present|current|now)\b/gi)) {
      const a = +m[1];
      const b = /^\d/.test(m[2]) ? +m[2] : cy;
      if (b >= a && a > 1970 && a <= cy) iv.push([a, b]);
    }
  }
  iv.sort((x, y) => x[0] - y[0]);
  let tot = 0;
  let end = -1;
  for (const [a, b] of iv) {
    if (a > end) { tot += b - a; end = b; }
    else if (b > end) { tot += b - end; end = b; }
  }
  const stated = ex.length ? Math.max(...ex) : null;
  const est = iv.length ? tot : null;
  return { stated, est, years: stated != null ? stated : est, src: stated != null ? "stated in resume" : est != null ? "estimated from date ranges" : null };
}

interface AnalysisResult {
  title: string | null;
  company: string | null;
  name: string | null;
  overall: number;
  sSkill: number | null;
  sKey: number | null;
  sExp: number | null;
  matching: string[];
  missing: string[];
  extra: string[];
  kHit: any[];
  kMiss: any[];
  need: number | null;
  have: any;
  tips: string[];
  weak: { original: string; why: string; better: string }[];
  summary: string;
  cover: string;
  questions: string[];
  gaps: { skill: string; mentions: number; tip: string }[];
  date: string;
}

export const CareerMatchResumeReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'results' | 'tracker' | 'saved'>('analyze');
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Application tracker state
  const [trackerJobs, setTrackerJobs] = useState<{ id: string; company: string; role: string; status: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cm_tracker') || '[]');
    } catch {
      return [];
    }
  });
  const [tCo, setTCo] = useState('');
  const [tRole, setTRole] = useState('');
  const [tSt, setTSt] = useState('Applied');

  // Saved analyses
  const [savedList, setSavedList] = useState<{ id: string; title: string; date: string; data: AnalysisResult }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cm_saved') || '[]');
    } catch {
      return [];
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const runAnalysis = () => {
    const r = resumeText.trim();
    const j = jdText.trim();
    if (!r || !j) {
      setErrorMsg('Please provide both resume text and a job description.');
      return;
    }
    setErrorMsg('');

    const rs = skillsIn(r);
    const js = skillsIn(j);
    const matching = js.filter(s => rs.includes(s));
    const missing = js.filter(s => !rs.includes(s));
    const extra = rs.filter(s => !js.includes(s));

    const kws = jdKeywords(j);
    const rset = new Set(words(r).map(stem));
    const kHit = kws.filter(k => rset.has(k.stem));
    const kMiss = kws.filter(k => !rset.has(k.stem));

    const need = jdYears(j);
    const have = resumeYears(r);

    const sSkill = js.length ? Math.round(100 * matching.length / js.length) : null;
    const sKey = kws.length ? Math.round(100 * kHit.length / kws.length) : null;
    const sExp = need != null && have.years != null ? Math.min(100, Math.round(100 * have.years / need)) : null;

    const parts: [number, number][] = [
      [sSkill!, 0.45],
      [sKey!, 0.30],
      [sExp!, 0.25]
    ].filter(p => p[0] != null) as [number, number][];

    const ws = parts.reduce((a, p) => a + p[1], 0);
    const overall = parts.length ? Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / ws) : 0;

    const titleMatch = j.match(/(?:job title|position|role)\s*[:\-]\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 80) : j.split(/\r?\n/).map(x => x.trim()).find(Boolean) || 'Target Role';

    const gaps = missing.map(s => ({
      skill: pretty(s),
      mentions: (j.match(new RegExp("(?<![a-z0-9+#.])" + rx(s) + "(?![a-z0-9+#])", "gi")) || []).length,
      tip: LEARN[s] || `Read the official ${s} documentation and build one small project with it before claiming it on your resume.`
    })).sort((a, b) => b.mentions - a.mentions);

    const tips: string[] = [];
    if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(r)) tips.push("Email: Not Provided — add a professional email in the header.");
    if (!/\+?\d[\d\s().-]{8,}\d/.test(r)) tips.push("Phone: Not Provided — add a phone number.");
    tips.push("Submit a .docx or text-based PDF; avoid scanned images.");

    const weakSample = [
      {
        original: "Responsible for IT support and resolving tickets.",
        why: "Starts with a passive phrase that hides what you actually did.",
        better: "Diagnosed desktop and network issues, documented checks and confirmed task validation."
      }
    ];

    const summary = `Professional with ${have.years != null ? have.years + " years of experience" : "relevant experience"} and hands-on skills in ${matching.slice(0, 5).map(pretty).join(", ") || "IT support"}. Targeting ${title}.`;

    const cover = `Dear Hiring Team,\n\nI am writing to apply for the ${title} position. My background includes ${matching.slice(0, 4).map(pretty).join(", ") || "relevant technical skills"}, which align with several key requirements in your posting.\n\nThank you for considering my application. I welcome the opportunity to discuss how my experience fits your team's needs.\n\nSincerely,\nCandidate`;

    const questions = [
      `Why are you interested in this role and what makes you a fit?`,
      `Walk me through a difficult problem you solved and how you isolated the cause.`,
      `Describe a time you explained a technical issue to a non-technical stakeholder.`,
      `How do you prioritize when multiple tasks or tickets are urgent?`
    ];

    const res: AnalysisResult = {
      title,
      company: null,
      name: null,
      overall,
      sSkill,
      sKey,
      sExp,
      matching: matching.map(pretty),
      missing: missing.map(pretty),
      extra: extra.map(pretty),
      kHit,
      kMiss,
      need,
      have,
      tips,
      weak: weakSample,
      summary,
      cover,
      questions,
      gaps,
      date: new Date().toISOString().slice(0, 10)
    };

    setAnalysis(res);
    setActiveTab('results');
    showToast('Analysis complete!');
  };

  const handleSample = () => {
    setResumeText(
      `IT Field Tech with 5+ years of experience.\nSkills: Windows, macOS, Apple, Jamf, ServiceNow, Jira, Networking, Active Directory, PowerShell, JavaScript.\nDiagnosed desktop and application issues across 200+ users.\nDocumented troubleshooting workflows and reduced repeated escalation tickets.\nProvisioned and managed macOS devices via Jamf Pro.`
    );
    setJdText(
      `IT Support Specialist\nLooking for an IT professional with 3+ years experience.\nMust have strong troubleshooting skills across Windows and macOS.\nExperience with ServiceNow, Active Directory, Apple device management, Jamf, and basic PowerShell scripting.\nExcellent communication and documentation skills.`
    );
  };

  const handleSaveAnalysis = () => {
    if (!analysis) return;
    const newSaved = [
      ...savedList,
      {
        id: Date.now().toString(36),
        title: analysis.title || 'Analysis',
        date: analysis.date,
        data: analysis
      }
    ];
    setSavedList(newSaved);
    localStorage.setItem('cm_saved', JSON.stringify(newSaved));
    showToast('Analysis saved to local storage!');
  };

  const handleAddJob = () => {
    if (!tCo.trim() || !tRole.trim()) return;
    const newJobs = [
      ...trackerJobs,
      { id: Date.now().toString(36), company: tCo.trim(), role: tRole.trim(), status: tSt }
    ];
    setTrackerJobs(newJobs);
    localStorage.setItem('cm_tracker', JSON.stringify(newJobs));
    setTCo('');
    setTRole('');
    showToast('Application added!');
  };

  const updateJobStatus = (id: string, nextStatus: string) => {
    const updated = trackerJobs.map(j => j.id === id ? { ...j, status: nextStatus } : j);
    setTrackerJobs(updated);
    localStorage.setItem('cm_tracker', JSON.stringify(updated));
  };

  const deleteJob = (id: string) => {
    const updated = trackerJobs.filter(j => j.id !== id);
    setTrackerJobs(updated);
    localStorage.setItem('cm_tracker', JSON.stringify(updated));
  };

  return (
    <main className="container page career-match-root">
      <div className="tool-top">
        <div className="logo">Career Match &amp; Resume Review</div>
        <nav className="tool-nav" role="tablist">
          <button
            type="button"
            className={activeTab === 'analyze' ? 'on' : ''}
            onClick={() => setActiveTab('analyze')}
          >
            Analyze
          </button>
          <button
            type="button"
            className={activeTab === 'results' ? 'on' : ''}
            onClick={() => setActiveTab('results')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeTab === 'tracker' ? 'on' : ''}
            onClick={() => setActiveTab('tracker')}
          >
            Application Tracker
          </button>
          <button
            type="button"
            className={activeTab === 'saved' ? 'on' : ''}
            onClick={() => setActiveTab('saved')}
          >
            Saved ({savedList.length})
          </button>
        </nav>
      </div>

      {toastMsg && (
        <div className="form-note" style={{ color: 'var(--teal)', fontWeight: 600, marginBottom: '14px' }}>
          {toastMsg}
        </div>
      )}

      {/* VIEW: ANALYZE */}
      {activeTab === 'analyze' && (
        <div>
          <div className="tool-hero">
            <h1>How well does your resume match this job?</h1>
            <p className="lead">
              Paste your resume and the job description. Analysis runs in your browser. The tool does not send your resume or job description to a server.
            </p>
          </div>
          <div className="notice" role="note">
            <strong>Privacy note:</strong> Avoid confidential employer, customer or other restricted information. Saved analyses and application tracker entries remain in this browser's local storage until deleted.
          </div>
          <div className="grid2">
            <div className="panel">
              <label htmlFor="resume-input">1. Your resume text</label>
              <textarea
                id="resume-input"
                rows={10}
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
              />
            </div>
            <div className="panel">
              <label htmlFor="jd-input">2. Job description</label>
              <textarea
                id="jd-input"
                rows={10}
                placeholder="Paste the target job description here..."
                value={jdText}
                onChange={e => setJdText(e.target.value)}
              />
            </div>
          </div>
          {errorMsg && <p className="form-error" style={{ marginTop: '10px' }}>{errorMsg}</p>}
          <div className="actions" style={{ marginTop: '18px' }}>
            <button className="button" type="button" onClick={runAnalysis}>
              Analyze My Match
            </button>
            <button className="button button-secondary" type="button" onClick={handleSample}>
              Load sample (fictional)
            </button>
          </div>
        </div>
      )}

      {/* VIEW: RESULTS / DASHBOARD */}
      {activeTab === 'results' && (
        <div>
          {!analysis ? (
            <div className="panel">
              <h2>Analysis results</h2>
              <p>Run an analysis in the Analyze tab to see your match dashboard.</p>
              <button className="button" type="button" onClick={() => setActiveTab('analyze')}>
                Go to Analyze Tab
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                <h2>Analysis: {analysis.title}</h2>
                <button className="button button-secondary" type="button" onClick={handleSaveAnalysis}>
                  Save Analysis to Browser
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat">
                  <strong>{analysis.overall}%</strong>
                  <span>Overall Match Score</span>
                </div>
                <div className="stat">
                  <strong>{analysis.sSkill != null ? `${analysis.sSkill}%` : '—'}</strong>
                  <span>Skills Match</span>
                </div>
                <div className="stat">
                  <strong>{analysis.sKey != null ? `${analysis.sKey}%` : '—'}</strong>
                  <span>Keywords Match</span>
                </div>
              </div>

              <div className="grid2" style={{ marginTop: '18px' }}>
                <div className="panel">
                  <h3>Matching Skills ({analysis.matching.length})</h3>
                  <div>
                    {analysis.matching.length ? (
                      analysis.matching.map((s, i) => <span key={i} className="pill g">{s}</span>)
                    ) : (
                      <p className="muted">No matching technical skills detected.</p>
                    )}
                  </div>

                  <h3 style={{ marginTop: '16px' }}>Missing Skills ({analysis.missing.length})</h3>
                  <div>
                    {analysis.missing.length ? (
                      analysis.missing.map((s, i) => <span key={i} className="pill r">{s}</span>)
                    ) : (
                      <p className="muted">No missing required skills!</p>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <h3>Tailored Professional Summary</h3>
                  <pre className="tool-output">{analysis.summary}</pre>

                  <h3>Draft Cover Letter</h3>
                  <pre className="tool-output" style={{ fontSize: '13px' }}>{analysis.cover}</pre>
                </div>
              </div>

              <div className="panel" style={{ marginTop: '18px' }}>
                <h3>Targeted Interview Questions</h3>
                <ol>
                  {analysis.questions.map((q, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: TRACKER */}
      {activeTab === 'tracker' && (
        <div>
          <div className="panel">
            <h2>Application Tracker</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label htmlFor="track-co">Company</label>
                <input
                  id="track-co"
                  placeholder="e.g. Acme Corp"
                  value={tCo}
                  onChange={e => setTCo(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="track-role">Role</label>
                <input
                  id="track-role"
                  placeholder="e.g. IT Support Specialist"
                  value={tRole}
                  onChange={e => setTRole(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="track-status">Status</label>
                <select
                  id="track-status"
                  value={tSt}
                  onChange={e => setTSt(e.target.value)}
                >
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Offer</option>
                  <option>Rejected</option>
                </select>
              </div>
              <button className="button" type="button" onClick={handleAddJob}>
                Add Application
              </button>
            </div>
          </div>

          <div className="board">
            {['Applied', 'Interview', 'Offer', 'Rejected'].map(col => {
              const jobsInCol = trackerJobs.filter(j => j.status === col);
              return (
                <div key={col} className="col">
                  <h4>
                    <span>{col}</span>
                    <span className="badge">{jobsInCol.length}</span>
                  </h4>
                  {jobsInCol.length === 0 ? (
                    <p className="muted" style={{ fontSize: '13px' }}>No roles</p>
                  ) : (
                    jobsInCol.map(j => (
                      <div key={j.id} className="job">
                        <strong>{j.role}</strong>
                        <small>{j.company}</small>
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <select
                            value={j.status}
                            onChange={e => updateJobStatus(j.id, e.target.value)}
                            style={{ fontSize: '12px', padding: '2px 4px' }}
                          >
                            <option>Applied</option>
                            <option>Interview</option>
                            <option>Offer</option>
                            <option>Rejected</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => deleteJob(j.id)}
                            style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: SAVED */}
      {activeTab === 'saved' && (
        <div className="panel">
          <h2>Saved Analyses</h2>
          {savedList.length === 0 ? (
            <p className="muted">No saved analyses yet. Run an analysis and click &quot;Save Analysis to Browser&quot;.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {savedList.map((item, idx) => (
                <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{item.title}</strong>
                    <div className="meta">Saved on {item.date} — Match: {item.data.overall}%</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        setAnalysis(item.data);
                        setActiveTab('results');
                      }}
                    >
                      View
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        const updated = savedList.filter((_, i) => i !== idx);
                        setSavedList(updated);
                        localStorage.setItem('cm_saved', JSON.stringify(updated));
                        showToast('Saved analysis removed');
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
