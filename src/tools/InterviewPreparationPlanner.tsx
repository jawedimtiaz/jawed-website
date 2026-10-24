import React, { useState, useEffect } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  Copy,
  Check,
  Edit3,
  Trash2,
  Plus,
  Sparkles,
  BookOpen,
  Tag,
  Building2,
  Briefcase,
  Award,
  CheckCircle2,
  HelpCircle,
  X,
  Target
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
  const [roleTitle, setRoleTitle] = useState(() => {
    return localStorage.getItem('ipp_role') || 'Senior IT Support Specialist';
  });
  const [targetCompany, setTargetCompany] = useState(() => {
    return localStorage.getItem('ipp_company') || 'Fintech Enterprise';
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

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [theme, setTheme] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [formError, setFormError] = useState('');

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

  const handleSaveStory = () => {
    if (!theme.trim() && !situation.trim() && !task.trim() && !action.trim() && !result.trim()) {
      setFormError('Please fill in at least a category theme or one STAR dimension.');
      return;
    }
    setFormError('');

    if (editingId !== null) {
      // Update existing
      setStarStories(prev =>
        prev.map(story =>
          story.id === editingId
            ? {
                ...story,
                theme: theme.trim() || 'General Technical Achievement',
                situation: situation.trim(),
                task: task.trim(),
                action: action.trim(),
                result: result.trim(),
              }
            : story
        )
      );
      showToast('Story updated in vault!');
      cancelEdit();
    } else {
      // Create new
      const newStory: StarStory = {
        id: Date.now(),
        theme: theme.trim() || 'General Technical Achievement',
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
      };
      setStarStories(prev => [newStory, ...prev]);
      showToast('New story added to vault!');
      resetForm();
    }
  };

  const resetForm = () => {
    setTheme('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setEditingId(null);
    setFormError('');
  };

  const handleEditStory = (story: StarStory) => {
    setEditingId(story.id);
    setTheme(story.theme);
    setSituation(story.situation);
    setTask(story.task);
    setAction(story.action);
    setResult(story.result);
    setFormError('');

    // Smooth scroll to the form
    const formElement = document.getElementById('star-editor-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleDeleteStory = (id: number) => {
    setStarStories(prev => prev.filter(s => s.id !== id));
    if (editingId === id) {
      cancelEdit();
    }
    showToast('Story removed from vault.');
  };

  const handleLoadSample = () => {
    setTheme('Cross-Functional Data Migration & Zero Downtime');
    setSituation('During cloud consolidation, our customer billing database had to be migrated across AWS regions with a strict zero-downtime SLA during business hours.');
    setTask('Lead IT systems validation, engineer failover rollback scripts, and conduct pre-flight sync simulations without impacting active API requests.');
    setAction('Utilized AWS DMS with Change Data Capture (CDC). Orchestrated double-write verification in staging, wrote custom Python validation checksums, and executed the cutover during a 15-minute maintenance window.');
    setResult('100% data integrity verified; 0 seconds of unplanned downtime; saved $14,000 monthly in legacy infrastructure overhead.');
    setFormError('');
    showToast('Sample STAR story loaded into form!');
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

  return (
    <div className="page pb-20">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
            text="Organize behavioral STAR stories, technical competencies, and high-impact reverse-interview questions."
          />
        </div>

        {/* Hero Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
            <Target className="w-3.5 h-3.5" />
            <span>Behavioral Mastery & STAR Framework</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight">
            Interview Preparation Planner
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Structure your accomplishments using the Situation, Task, Action, and Result (STAR) framework.
            Draft clear, quantifiable stories that demonstrate leadership, problem-solving, and operational composure.
          </p>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-sky-500/40 text-sky-300 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Target Opportunity Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-100">Target Opportunity</h2>
                <p className="text-xs md:text-sm text-slate-400">Contextualize your preparation for specific interview rounds.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="roleTitle" className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sky-400" />
                  Target Role Title
                </label>
                <input
                  id="roleTitle"
                  type="text"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior IT Support Specialist, Cloud Systems Engineer"
                  className="w-full block bg-slate-950/60 border border-slate-700/70 rounded-xl px-4 py-3 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>

              <div>
                <label htmlFor="targetCompany" className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Target Company / Industry
                </label>
                <input
                  id="targetCompany"
                  type="text"
                  value={targetCompany}
                  onChange={e => setTargetCompany(e.target.value)}
                  placeholder="e.g. Fintech Enterprise, High-Growth SaaS, Healthcare"
                  className="w-full block bg-slate-950/60 border border-slate-700/70 rounded-xl px-4 py-3 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* ADD / EDIT STAR STORY FORM (Spacious 2-column layout matching CareerMatchResumeReview) */}
          <div
            id="star-editor-form"
            className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-2xl relative"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
                    {editingId !== null ? 'Edit STAR Story' : 'Add / Expand STAR Story'}
                    {editingId !== null && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Editing Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400">
                    Craft high-impact behavioral answers with the 4-part STAR methodology.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  Load Sample Story
                </button>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {formError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {formError}
              </div>
            )}

            {/* 1. Theme / Category Input (Full Width) */}
            <div className="mb-6">
              <label htmlFor="story-theme" className="block text-sm md:text-base font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-400" />
                Theme / Category
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Categorize the primary competence: e.g., High-Severity Incident, Automation, Conflict Escalation, Architecture Refactor.
              </p>
              <input
                id="story-theme"
                type="text"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="e.g., Critical Incident Response, Identity Governance, Cross-Team Conflict Resolution"
                className="w-full block bg-slate-950/60 border border-slate-700/70 rounded-xl p-3.5 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
              />
            </div>

            {/* 2. 2-Column Responsive Grid for STAR Textareas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Situation */}
              <div className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="star-situation" className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center justify-center">
                      S
                    </span>
                    1. Situation (The Context)
                  </label>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  What was the initial state, workplace infrastructure challenge, urgency, or background?
                </p>
                <textarea
                  id="star-situation"
                  rows={4}
                  value={situation}
                  onChange={e => setSituation(e.target.value)}
                  placeholder="Describe the specific event, client, or workplace infrastructure challenge..."
                  className="w-full block min-h-[130px] resize-y bg-slate-950/60 border border-slate-700/70 rounded-xl p-3.5 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>

              {/* Card 2: Task */}
              <div className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="star-task" className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center justify-center">
                      T
                    </span>
                    2. Task (Your Responsibility)
                  </label>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  What was expected of you personally, and what were the key operational constraints?
                </p>
                <textarea
                  id="star-task"
                  rows={4}
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="Explain what you were personally tasked with fixing, leading, or delivering..."
                  className="w-full block min-h-[130px] resize-y bg-slate-950/60 border border-slate-700/70 rounded-xl p-3.5 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>

              {/* Card 3: Action */}
              <div className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="star-action" className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center">
                      A
                    </span>
                    3. Action (Specific Steps You Took)
                  </label>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Focus on what YOU did—technical CLI tools, hardware swaps, protocols, and leadership.
                </p>
                <textarea
                  id="star-action"
                  rows={4}
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="Detail the technical tools, diagnostic CLI commands, hardware swaps, or team coordination..."
                  className="w-full block min-h-[130px] resize-y bg-slate-950/60 border border-slate-700/70 rounded-xl p-3.5 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>

              {/* Card 4: Result */}
              <div className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700/80 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="star-result" className="text-sm md:text-base font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center">
                      R
                    </span>
                    4. Result (Measurable Outcome)
                  </label>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Quantify the resolution: SLA recovery time, downtime avoided, % improvement, or zero-incident metrics.
                </p>
                <textarea
                  id="star-result"
                  rows={4}
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  placeholder="Quantify the resolution: SLA recovery time, downtime avoided, % improvement..."
                  className="w-full block min-h-[130px] resize-y bg-slate-950/60 border border-slate-700/70 rounded-xl p-3.5 text-sm md:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 transition-all"
                />
              </div>
            </div>

            {/* 3. Action Bar */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg hover:shadow-sky-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {editingId !== null ? 'Update Story in Vault' : 'Add Story to Vault'}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500">
                Stories are securely stored in your browser local storage.
              </span>
            </div>
          </div>

          {/* 4. SAVED STORIES VAULT CARDS */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-sky-400" />
                  STAR Method Story Vault
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                    {starStories.length} {starStories.length === 1 ? 'Story' : 'Stories'}
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Ready-to-deliver stories for behavioral, system troubleshooting, and technical leadership rounds.
                </p>
              </div>

              {starStories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const allText = starStories.map((s, idx) => `STORY #${idx + 1}: ${s.theme}
[Situation]: ${s.situation}
[Task]: ${s.task}
[Action]: ${s.action}
[Result]: ${s.result}
----------------------------------------`).join('\n\n');
                    navigator.clipboard.writeText(allText);
                    showToast('All STAR stories copied to clipboard!');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  <Copy className="w-4 h-4 text-sky-400" />
                  Copy All Stories
                </button>
              )}
            </div>

            {starStories.length === 0 ? (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">Your Story Vault is Empty</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  Use the editor above to draft your first STAR story, or load our battle-tested sample stories to get started.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Load Sample Story
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {starStories.map((story, index) => {
                  const isCopied = copiedId === story.id;
                  const isCurrentEditing = editingId === story.id;

                  return (
                    <div
                      key={story.id}
                      className={`bg-slate-900 border rounded-2xl p-6 md:p-7 shadow-xl transition-all ${
                        isCurrentEditing
                          ? 'border-sky-500 ring-2 ring-sky-500/20'
                          : 'border-slate-800 hover:border-slate-700/80'
                      }`}
                    >
                      {/* Story Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <div>
                            <h3 className="text-base md:text-lg font-bold text-slate-100 flex items-center gap-2">
                              {story.theme}
                            </h3>
                          </div>
                        </div>

                        {/* Story Card Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyStory(story)}
                            title="Copy formatted story"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-sky-400" />
                                <span>Copy Story</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditStory(story)}
                            title="Edit this story"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStory(story.id)}
                            title="Delete story"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* STAR Story Breakdown Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* S: Situation */}
                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold px-2 py-0.5 rounded text-xs">
                              S &bull; Situation
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                            {story.situation || <span className="text-slate-500 italic">Not specified</span>}
                          </p>
                        </div>

                        {/* T: Task */}
                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold px-2 py-0.5 rounded text-xs">
                              T &bull; Task
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                            {story.task || <span className="text-slate-500 italic">Not specified</span>}
                          </p>
                        </div>

                        {/* A: Action */}
                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold px-2 py-0.5 rounded text-xs">
                              A &bull; Action
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                            {story.action || <span className="text-slate-500 italic">Not specified</span>}
                          </p>
                        </div>

                        {/* R: Result */}
                        <div className="bg-slate-950/50 border border-emerald-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded text-xs">
                              R &bull; Result
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-emerald-300/90 leading-relaxed font-medium">
                            {story.result || <span className="text-slate-500 italic font-normal">Not specified</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reverse Interview Questions Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-100">
                  Recommended High-Signal Reverse Questions
                </h2>
                <p className="text-xs md:text-sm text-slate-400">
                  Ask these during the final 10 minutes to signal seniority, architectural maturity, and operational rigor.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed mb-3">
                    &ldquo;{item.question}&rdquo;
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 italic">
                      Signal: {item.signal}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.question);
                        showToast('Question copied to clipboard!');
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

