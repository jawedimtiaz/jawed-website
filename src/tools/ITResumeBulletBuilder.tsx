import React, { useState, useEffect } from 'react';
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

export const ITResumeBulletBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'check' | 'saved'>('build');
  const [role, setRole] = useState(Object.keys(ROLES)[0]);
  const [verb, setVerb] = useState('');
  const [task, setTask] = useState('');
  const [tools, setTools] = useState('');
  const [scale, setScale] = useState('');
  const [result, setResult] = useState('');
  const [generatedOuts, setGeneratedOuts] = useState<Array<{ n: string; t: string }> | null>(null);

  // Check tab state
  const [bulletToCheck, setBulletToCheck] = useState('Responsible for managing user accounts in Active Directory');
  const [checkResult, setCheckResult] = useState<BulletCheckResult | null>(null);

  // Saved bullets state
  const [savedBullets, setSavedBullets] = useState<string[]>([]);
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
    showToast('Copied');
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
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '8px 18px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
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
          Saved ({savedBullets.length})
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

              <label htmlFor="verb" style={{ display: 'block', fontWeight: 600, margin: '12px 0 4px', color: 'var(--text)' }}>
                Action verb
              </label>
              <input
                id="verb"
                value={verb}
                onChange={e => setVerb(e.target.value)}
                placeholder="e.g. Configured"
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px',
                  color: 'var(--text)',
                }}
              />

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
                What did you do?
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
              }}
            >
              Fill example
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
                        className="out"
                        style={{
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '14px',
                          marginTop: '10px',
                          background: 'var(--bg)',
                        }}
                      >
                        <b style={{ color: 'var(--brand)' }}>{x.n}</b>
                        <p className="bt" style={{ margin: '6px 0 8px', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                          {x.t}
                        </p>
                        <div className="muted" style={{ fontSize: '14px', color: 'var(--muted)' }}>
                          Quality {singleCheck.score}/100
                        </div>
                        <div className="row" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button type="button" onClick={() => handleCopy(x.t)}>
                            Copy
                          </button>
                          <button type="button" onClick={() => handleSaveBullet(x.t)}>
                            Save
                          </button>
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
          <div className="row" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => handleCopy(savedBullets.map(t => '• ' + t).join('\n'))}
              disabled={savedBullets.length === 0}
            >
              Copy all
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all saved bullets?')) {
                  persistSaved([]);
                  showToast('Cleared');
                }
              }}
              disabled={savedBullets.length === 0}
            >
              Clear all
            </button>
          </div>

          <div id="savedList">
            {savedBullets.length === 0 ? (
              <p className="muted" style={{ color: 'var(--muted)' }}>
                No saved bullets yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedBullets.map((t, i) => (
                  <div
                    key={i}
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
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', flex: 1 }}>{t}</span>
                    <div className="row" style={{ display: 'flex', gap: '8px', margin: 0 }}>
                      <button type="button" onClick={() => handleCopy(t)}>
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...savedBullets];
                          updated.splice(i, 1);
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
            )}
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
    </main>
  );
};
