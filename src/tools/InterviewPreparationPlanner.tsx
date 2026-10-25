import React, { useState, useEffect } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  Copy,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  BookOpen,
  Building2,
  Briefcase,
  Award,
  CheckCircle2,
  HelpCircle,
  X,
  Target,
  Search,
  Plus
} from 'lucide-react';

interface StarStory {
  id: number;
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

const SAMPLE_STORIES: StarStory[] = [
  {
    id: 1,
    theme: 'High Severity Incident / Crisis Management',
    situation: 'Main office core switch failed during month-end payroll execution, threatening payroll processing for 120 employees and critical transaction cutoffs.',
    task: 'Take immediate operational command, isolate root packet collision, reroute critical traffic trunks, and safeguard transaction deadlines.',
    action: 'Isolated primary core loop, rerouted traffic through backup redundant trunk, and coordinated with network vendor for hot-swap chassis replacement within SLA.',
    result: 'Restored vital payroll subnet within 14 minutes; zero transaction delays; implemented daily automated VRRP failover health checks.'
  },
  {
    id: 2,
    theme: 'Automation & Zero-Touch Fleet Provisioning',
    situation: 'Manual imaging and configuration of new hire engineer laptops took 4.5 hours per machine, creating a 3-week onboarding backlog across 45 remote engineers.',
    task: 'Design an automated, zero-touch provisioning pipeline that deploys secure, pre-configured laptops directly from manufacturer to employee.',
    action: 'Integrated Apple Business Manager with Jamf Pro and Okta SSO. Wrote modular bash/zsh post-enrollment scripts to automatically install developer toolchains, CrowdStrike Falcon, and network profiles.',
    result: 'Reduced provisioning time from 4.5 hours to 18 minutes per device with 99.4% zero-touch success rate, cutting IT onboarding backlog to zero.'
  }
];

export const InterviewPreparationPlanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'vault' | 'questions' | 'guide'>('builder');

  const [roleTitle, setRoleTitle] = useState(() => {
    return localStorage.getItem('ipp_role') || 'Senior IT Support Specialist';
  });
  const [targetCompany, setTargetCompany] = useState(() => {
    return localStorage.getItem('ipp_company') || 'Fintech Enterprise / Cloud Infrastructure';
  });

  const [starStories, setStarStories] = useState<StarStory[]>(() => {
    try {
      const saved = localStorage.getItem('ipp_stories');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return SAMPLE_STORIES;
  });

  // Individual Form Field States
  const [storyTheme, setStoryTheme] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Vault Search State
  const [searchVault, setSearchVault] = useState('');

  // UI Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ipp_role', roleTitle);
  }, [roleTitle]);

  useEffect(() => {
    localStorage.setItem('ipp_company', targetCompany);
  }, [targetCompany]);

  useEffect(() => {
    localStorage.setItem('ipp_stories', JSON.stringify(starStories));
  }, [starStories]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadSampleStory = () => {
    setStoryTheme('Cross-Functional Data Migration & Zero Downtime');
    setSituation('During cloud consolidation, our customer billing database had to be migrated across AWS regions with a strict zero-downtime SLA during business hours.');
    setTask('Lead IT systems validation, engineer failover rollback scripts, and conduct pre-flight sync simulations without impacting active API requests.');
    setAction('Utilized AWS DMS with Change Data Capture (CDC). Orchestrated double-write verification in staging, wrote custom Python validation checksums, and executed the cutover during a 15-minute maintenance window.');
    setResult('100% data integrity verified; 0 seconds of unplanned downtime; saved $14,000 monthly in legacy infrastructure overhead.');
    showToast('Sample STAR story loaded into editor!');
  };

  const handleAddStory = () => {
    if (!storyTheme.trim() && !situation.trim() && !task.trim() && !action.trim() && !result.trim()) {
      showToast('Please enter at least a theme or one STAR dimension.');
      return;
    }

    if (editingId !== null) {
      setStarStories(prev =>
        prev.map(story =>
          story.id === editingId
            ? {
                ...story,
                theme: storyTheme.trim() || 'General Technical Achievement',
                situation: situation.trim(),
                task: task.trim(),
                action: action.trim(),
                result: result.trim(),
              }
            : story
        )
      );
      showToast('Story updated in vault!');
      setEditingId(null);
    } else {
      const created: StarStory = {
        id: Date.now(),
        theme: storyTheme.trim() || 'General Technical Achievement',
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
      };
      setStarStories(prev => [created, ...prev]);
      showToast('Story added to vault!');
    }

    setStoryTheme('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
  };

  const handleEditStory = (story: StarStory) => {
    setEditingId(story.id);
    setStoryTheme(story.theme);
    setSituation(story.situation);
    setTask(story.task);
    setAction(story.action);
    setResult(story.result);
    setActiveTab('builder');

    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setStoryTheme('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
  };

  const handleDeleteStory = (id: number) => {
    setStarStories(prev => prev.filter(s => s.id !== id));
    if (editingId === id) {
      handleCancelEdit();
    }
    showToast('Story removed from vault.');
  };

  const handleCopyStory = (story: StarStory) => {
    const formatted = `=== STAR STORY: ${story.theme.toUpperCase()} ===
[SITUATION]:
${story.situation || 'N/A'}

[TASK]:
${story.task || 'N/A'}

[ACTION]:
${story.action || 'N/A'}

[RESULT]:
${story.result || 'N/A'}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(story.id);
    showToast('Story copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const filteredVault = starStories.filter(story => {
    const q = searchVault.trim().toLowerCase();
    if (!q) return true;
    return (
      story.theme.toLowerCase().includes(q) ||
      story.situation.toLowerCase().includes(q) ||
      story.task.toLowerCase().includes(q) ||
      story.action.toLowerCase().includes(q) ||
      story.result.toLowerCase().includes(q)
    );
  });

  return (
    <main className="container page interview-planner-root">
      {/* Top Navigation & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'Interview Preparation Planner' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="Interview Preparation Planner"
          text="Structure high-impact behavioral answers with the 4-part STAR methodology."
        />
      </div>

      {/* Header Tool Top Navigation Bar (matching CareerMatchResumeReview) */}
      <div className="tool-top">
        <div className="logo flex items-center gap-2">
          <Target className="w-5 h-5 text-sky-400" />
          <span>Interview Preparation Planner</span>
        </div>
        <nav className="tool-nav" role="tablist">
          <button
            type="button"
            className={activeTab === 'builder' ? 'on' : ''}
            onClick={() => setActiveTab('builder')}
          >
            {editingId !== null ? '✏️ Editing Story' : '📝 STAR Builder'}
          </button>
          <button
            type="button"
            className={activeTab === 'vault' ? 'on' : ''}
            onClick={() => setActiveTab('vault')}
          >
            🏆 Saved Vault ({starStories.length})
          </button>
          <button
            type="button"
            className={activeTab === 'questions' ? 'on' : ''}
            onClick={() => setActiveTab('questions')}
          >
            ❓ Reverse Questions
          </button>
          <button
            type="button"
            className={activeTab === 'guide' ? 'on' : ''}
            onClick={() => setActiveTab('guide')}
          >
            📖 STAR Guide
          </button>
        </nav>
      </div>

      {toastMessage && (
        <div className="notice" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--text-heading)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: STAR STORY BUILDER */}
      {activeTab === 'builder' && (
        <div>
          <div className="tool-hero">
            <h1>Structure High-Impact Behavioral Answers</h1>
            <p className="lead">
              Use the 4-part STAR methodology (Situation, Task, Action, Result) to craft metric-driven responses for technical, system administration, and engineering interviews.
            </p>
          </div>

          <div className="notice" role="note">
            <strong>Privacy &amp; Local Storage Note:</strong> Target roles and STAR stories are saved exclusively in your browser&apos;s local storage. Zero information is transmitted to external servers.
          </div>

          {/* Target Context Panel */}
          <div className="panel" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-heading)' }}>
              🎯 Target Context &amp; Application Goal
            </h3>
            <div className="grid2" style={{ marginTop: 0 }}>
              <div>
                <label htmlFor="target-role-title">Target Role Title</label>
                <input
                  id="target-role-title"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior IT Support Specialist / Systems Administrator"
                />
              </div>
              <div>
                <label htmlFor="target-company">Target Company / Industry</label>
                <input
                  id="target-company"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Fintech Enterprise / Cloud Infrastructure"
                />
              </div>
            </div>
          </div>

          {/* STAR Builder Form Panel */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles className="w-5 h-5 text-sky-400" />
                {editingId !== null ? 'Edit STAR Story' : 'Craft New STAR Story'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {editingId !== null && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCancelEdit}
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={loadSampleStory}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Load Sample Story
                </button>
              </div>
            </div>

            {/* Theme Field */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="story-theme">Theme / Competency Category</label>
              <input
                id="story-theme"
                type="text"
                value={storyTheme}
                onChange={(e) => setStoryTheme(e.target.value)}
                placeholder="e.g. High-Severity Outage, Automation, Conflict Escalation, Data Migration"
              />
            </div>

            {/* 2-Column Spacious Textarea Grid */}
            <div className="grid2">
              {/* Situation */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-situation" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  1. Situation (The Context)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What was the initial state, challenge, failure event, or business urgency?
                </p>
                <textarea
                  id="star-situation"
                  rows={6}
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Describe the context: failure event, urgent customer issue, or legacy environment..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Task */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-task" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  2. Task (Your Responsibility)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What were you personally tasked to solve, configure, or lead?
                </p>
                <textarea
                  id="star-task"
                  rows={6}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Detail your mandate, SLAs, and technical constraints..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Action */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-action" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  3. Action (Specific Steps You Took)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  What tools, protocols, CLI commands, or scripts did you use?
                </p>
                <textarea
                  id="star-action"
                  rows={6}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Focus on what YOU did: CLI diagnostic steps, hardware swaps, scripts deployed..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              {/* Result */}
              <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label htmlFor="star-result" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  4. Result (Measurable Outcome)
                </label>
                <p className="meta" style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                  Quantifiable metrics: time saved, % outage reduced, SLA met, cost cut
                </p>
                <textarea
                  id="star-result"
                  rows={6}
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="Outcome: e.g. restored connectivity in 14 minutes with zero downtime..."
                  style={{ minHeight: '160px' }}
                />
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="button"
                onClick={handleAddStory}
                style={{ padding: '12px 24px', fontSize: '1rem' }}
              >
                {editingId !== null ? 'Update Story in Vault' : 'Add Story to Vault'}
              </button>
              {starStories.length > 0 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setActiveTab('vault')}
                >
                  View Saved Vault ({starStories.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SAVED VAULT */}
      {activeTab === 'vault' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: '16px 0 20px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award className="w-7 h-7 text-sky-400" />
                STAR Story Vault
                <span className="pill" style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>
                  {starStories.length} Saved
                </span>
              </h1>
              <p className="meta" style={{ marginTop: '4px' }}>
                Review, refine, search, or copy your prepared behavioral answers for target role: <b>{roleTitle}</b> ({targetCompany}).
              </p>
            </div>

            {starStories.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const allText = starStories.map((s, idx) => `=== STORY #${idx + 1}: ${s.theme.toUpperCase()} ===
[SITUATION]: ${s.situation}
[TASK]: ${s.task}
[ACTION]: ${s.action}
[RESULT]: ${s.result}
----------------------------------------`).join('\n\n');
                    navigator.clipboard.writeText(allText);
                    showToast('All STAR stories copied to clipboard!');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy className="w-4 h-4 text-sky-400" />
                  Copy All Stories
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    handleCancelEdit();
                    setActiveTab('builder');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus className="w-4 h-4" />
                  Add New Story
                </button>
              </div>
            )}
          </div>

          {/* Search Filter */}
          {starStories.length > 0 && (
            <div className="panel" style={{ marginBottom: '20px', padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchVault}
                  onChange={e => setSearchVault(e.target.value)}
                  placeholder="Search saved stories by keyword, theme, or technology (e.g., VLAN, Jamf, AWS, Incident)..."
                  style={{ flex: 1, margin: 0 }}
                />
                {searchVault && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setSearchVault('')}
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {starStories.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Your Story Vault is Empty
              </h3>
              <p className="meta" style={{ maxWidth: '480px', margin: '8px auto 20px' }}>
                Use the STAR Builder tab to draft your first behavioral answer, or load a sample scenario to get started.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => setActiveTab('builder')}
                >
                  Open STAR Builder
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    loadSampleStory();
                    setActiveTab('builder');
                  }}
                >
                  Load Sample Story
                </button>
              </div>
            </div>
          ) : filteredVault.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <p className="meta">No saved stories match &quot;{searchVault}&quot;.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSearchVault('')}
                style={{ marginTop: '10px' }}
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredVault.map((story, index) => {
                const isCopied = copiedId === story.id;
                const isCurrentEditing = editingId === story.id;

                return (
                  <div
                    key={story.id}
                    className="panel"
                    style={{
                      border: isCurrentEditing ? '2px solid var(--accent)' : '1px solid var(--border)',
                      position: 'relative',
                    }}
                  >
                    {/* Story Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="pill" style={{ fontWeight: 800, margin: 0, background: 'var(--surface-accent)', color: 'var(--accent)' }}>
                          #{index + 1}
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                          {story.theme}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleCopyStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleEditStory(story)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleDeleteStory(story.id)}
                          style={{ padding: '6px 10px', fontSize: '0.85rem', color: 'var(--rose)' }}
                          title="Delete Story"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* STAR 4-Dimension Grid */}
                    <div className="grid2">
                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700 }}>
                          1. Situation
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.situation || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 700 }}>
                          2. Task
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.task || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px' }}>
                        <span className="pill" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 700 }}>
                          3. Action
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
                          {story.action || <em className="muted">Not specified</em>}
                        </p>
                      </div>

                      <div className="card" style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <span className="pill g" style={{ fontWeight: 700 }}>
                          4. Result
                        </span>
                        <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)', fontWeight: 600 }}>
                          {story.result || <em className="muted" style={{ fontWeight: 400 }}>Not specified</em>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: REVERSE QUESTIONS */}
      {activeTab === 'questions' && (
        <div>
          <div className="tool-hero">
            <h1>High-Signal Reverse Interview Questions</h1>
            <p className="lead">
              Ask these during the final 10 minutes of your interview to signal operational maturity, technical depth, and forward-thinking leadership.
            </p>
          </div>

          <div className="grid2">
            {[
              {
                question: "What does the escalation path look like when Tier 1 encounters an ambiguous cloud identity or network degradation issue?",
                signal: "Proves familiarity with triage tiering and SLA preservation."
              },
              {
                question: "How does your team measure customer satisfaction and SLA adherence without incentivizing superficial ticket closes?",
                signal: "Demonstrates balanced focus on quality of resolution over raw metrics."
              },
              {
                question: "What are the top 2 internal tooling or automation initiatives the IT operations team plans to tackle over the next 12 months?",
                signal: "Shows forward-thinking mindset and interest in contributing to automation."
              },
              {
                question: "How is the organization currently managing endpoint hygiene and compliance across hybrid / remote fleets?",
                signal: "Demonstrates zero-trust security and modern MDM awareness."
              },
              {
                question: "When a major outage occurs, what does your post-mortem process look like, and how are lessons learned shared across engineering?",
                signal: "Demonstrates blameless culture, operational rigor, and continuous improvement."
              },
              {
                question: "What is the biggest friction point your team currently faces with existing service desk or infrastructure tools?",
                signal: "Shows empathy for the team's daily workflow and desire to solve real pain points."
              }
            ].map((item, i) => (
              <div key={i} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', lineHeight: '1.5', marginBottom: '14px' }}>
                  &ldquo;{item.question}&rdquo;
                </p>
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="meta" style={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
                    Signal: {item.signal}
                  </span>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(item.question);
                      showToast('Question copied to clipboard!');
                    }}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: METHODOLOGY GUIDE */}
      {activeTab === 'guide' && (
        <div>
          <div className="tool-hero">
            <h1>The STAR Method Framework Guide</h1>
            <p className="lead">
              The STAR method structures behavioral answers so hiring managers can verify your decision-making, technical execution, and business impact.
            </p>
          </div>

          <div className="panel" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>
              The 4 Components of a Winning Answer
            </h2>

            <div className="grid2" style={{ marginTop: '16px' }}>
              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#38bdf8', fontSize: '1.05rem', margin: '0 0 6px' }}>1. Situation (15% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Set the scene concisely. Describe the specific crisis, legacy limitation, or business goal. Avoid lengthy preamble; establish the problem in 2 sentences.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#818cf8', fontSize: '1.05rem', margin: '0 0 6px' }}>2. Task (15% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Clarify your specific responsibility or mandate. What were you expected to deliver under what constraints or SLAs?
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: '#c084fc', fontSize: '1.05rem', margin: '0 0 6px' }}>3. Action (50% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  The core of your answer. Focus on what YOU personally did. Mention specific tools (Active Directory, Jamf, Cisco, Terraform, Python), commands, protocols, and cross-team coordination.
                </p>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3 style={{ color: 'var(--emerald)', fontSize: '1.05rem', margin: '0 0 6px' }}>4. Result (20% of time)</h3>
                <p className="meta" style={{ margin: 0, lineHeight: '1.5' }}>
                  Conclude with verified, quantitative business metrics: downtime avoided, % ticket reduction, minutes saved, or 100% SLA compliance.
                </p>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '12px' }}>
              Before &amp; After Example
            </h2>

            <div className="card" style={{ padding: '16px', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <span className="pill r" style={{ fontWeight: 700 }}>❌ Weak / Vague Response</span>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text)' }}>
                &ldquo;I worked on fixing laptop deployment issues because users were waiting too long. I helped set up Jamf and made things much faster.&rdquo;
              </p>
            </div>

            <div className="card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span className="pill g" style={{ fontWeight: 700 }}>✅ Strong STAR Response</span>
              <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text)' }}>
                &ldquo;Manual imaging took 4.5 hours per engineer laptop, causing a 3-week onboarding backlog across 45 new hires. As lead IT engineer, I designed a zero-touch provisioning pipeline linking Apple Business Manager, Jamf Pro, and Okta SSO with post-enrollment zsh scripts. This cut provisioning from 4.5 hours to 18 minutes with a 99.4% success rate and zero backlog.&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
