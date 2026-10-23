import React, { useState, useEffect } from 'react';
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

function calculateImpactPotential(bullet: string): { score: number; label: string; color: string } {
  let score = 40;
  const words = bullet.trim().split(/\s+/);
  const first = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  if (STRONG_VERBS.has(first)) score += 30;
  if (/\d/.test(bullet)) score += 20;
  if (TOOL_REGEX.test(bullet)) score += 10;
  score = Math.min(score, 100);

  let label = 'High Impact';
  let color = 'var(--good)';
  if (score < 60) {
    label = 'Low Impact';
    color = 'var(--bad)';
  } else if (score < 80) {
    label = 'Moderate Impact';
    color = 'var(--brand)';
  }
  return { score, label, color };
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
  const [verb, setVerb] = useState('');
  const [task, setTask] = useState('');
  const [tools, setTools] = useState('');
  const [scale, setScale] = useState('');
  const [result, setResult] = useState('');
  const [generatedOuts, setGeneratedOuts] = useState<Array<{ n: string; t: string }> | null>(null);

  // Check tab state
  const [bulletToCheck, setBulletToCheck] = useState('Responsible for managing user accounts in Active Directory');
  const [checkResult, setCheckResult] = useState<BulletCheckResult | null>(null);
  const [batchText, setBatchText] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ text: string; result: BulletCheckResult }> | null>(null);

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
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
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
    </main>
  );
};
