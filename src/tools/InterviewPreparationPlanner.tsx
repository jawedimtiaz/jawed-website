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

  // Individual Form Field States as per layout specification
  const [storyTheme, setStoryTheme] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

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
    showToast('Sample STAR story loaded!');
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

    const builderElement = document.getElementById('star-builder-card');
    if (builderElement) {
      builderElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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

        {/* Tool Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
            <Target className="w-3.5 h-3.5" />
            <span>Career & Resume</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Interview Preparation Planner
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-3xl leading-relaxed">
            Structure high-impact behavioral answers with the 4-part STAR methodology. Save, refine, and review your stories locally in your browser.
          </p>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 border border-sky-500/40 text-sky-300 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Target Role & Company Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Target Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior IT Support Specialist"
                className="w-full block rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Target Company / Industry
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Enterprise Fintech / Cloud Infrastructure"
                className="w-full block rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
              />
            </div>
          </div>
        </div>

        {/* STAR Story Vault & Builder Card */}
        <div id="star-builder-card" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                STAR Method Story Vault
                {editingId !== null && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Editing Story
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-400">Craft metric-driven behavioral answers with Situation, Task, Action, and Result.</p>
            </div>
            <div className="flex items-center gap-2">
              {editingId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={loadSampleStory}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Load Sample Story
              </button>
            </div>
          </div>

          {/* Theme Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Theme / Competency Category
            </label>
            <input
              type="text"
              value={storyTheme}
              onChange={(e) => setStoryTheme(e.target.value)}
              placeholder="e.g. High-Severity Incident, Automation, Conflict Escalation"
              className="w-full block rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
            />
          </div>

          {/* 2-Column Wide Textarea Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Situation */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                1. Situation (The Context)
              </label>
              <span className="text-xs text-slate-500 mb-2">What was the initial state, challenge, or urgency?</span>
              <textarea
                rows={5}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Describe the context: failure event, urgent customer issue, or legacy environment..."
                className="w-full block flex-1 min-h-[140px] rounded-xl border border-slate-700/80 bg-slate-950 p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition resize-y"
              />
            </div>

            {/* Task */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                2. Task (Your Responsibility)
              </label>
              <span className="text-xs text-slate-500 mb-2">What were you personally tasked to solve?</span>
              <textarea
                rows={5}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Detail your mandate, SLAs, and technical constraints..."
                className="w-full block flex-1 min-h-[140px] rounded-xl border border-slate-700/80 bg-slate-950 p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition resize-y"
              />
            </div>

            {/* Action */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                3. Action (Specific Steps You Took)
              </label>
              <span className="text-xs text-slate-500 mb-2">What tools, protocols, or commands did you use?</span>
              <textarea
                rows={5}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Focus on what YOU did: CLI diagnostic steps, hardware swaps, scripts deployed..."
                className="w-full block flex-1 min-h-[140px] rounded-xl border border-slate-700/80 bg-slate-950 p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition resize-y"
              />
            </div>

            {/* Result */}
            <div className="flex flex-col">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                4. Result (Measurable Outcome)
              </label>
              <span className="text-xs text-slate-500 mb-2">Quantifiable metrics: time saved, % reduced, SLA hit</span>
              <textarea
                rows={5}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Outcome: e.g. restored connectivity in 14 minutes with zero downtime..."
                className="w-full block flex-1 min-h-[140px] rounded-xl border border-slate-700/80 bg-slate-950 p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition resize-y"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddStory}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-indigo-400 transition"
            >
              {editingId !== null ? 'Update Story in Vault' : 'Add Story to Vault'}
            </button>
          </div>
        </div>

        {/* Saved Stories Vault Cards */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-400" />
                Saved STAR Stories
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  {starStories.length} {starStories.length === 1 ? 'Story' : 'Stories'}
                </span>
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Review, refine, or copy your prepared behavioral answers.
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <Copy className="w-4 h-4 text-sky-400" />
                Copy All Stories
              </button>
            )}
          </div>

          {starStories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">Your Story Vault is Empty</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Use the form above to draft your first STAR story, or click "Load Sample Story" to pre-fill an exemplary narrative.
              </p>
              <button
                type="button"
                onClick={loadSampleStory}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition"
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
                    className={`rounded-2xl border bg-slate-900/80 p-6 md:p-7 shadow-xl transition-all ${
                      isCurrentEditing
                        ? 'border-sky-500 ring-2 ring-sky-500/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Story Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <h3 className="text-base md:text-lg font-bold text-slate-100">
                          {story.theme}
                        </h3>
                      </div>

                      {/* Story Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyStory(story)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-sky-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditStory(story)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStory(story.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* STAR Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                        <span className="inline-block bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold px-2 py-0.5 rounded text-xs mb-2">
                          1. Situation
                        </span>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                          {story.situation || <span className="text-slate-500 italic">Not specified</span>}
                        </p>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                        <span className="inline-block bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold px-2 py-0.5 rounded text-xs mb-2">
                          2. Task
                        </span>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                          {story.task || <span className="text-slate-500 italic">Not specified</span>}
                        </p>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                        <span className="inline-block bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold px-2 py-0.5 rounded text-xs mb-2">
                          3. Action
                        </span>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                          {story.action || <span className="text-slate-500 italic">Not specified</span>}
                        </p>
                      </div>

                      <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-4">
                        <span className="inline-block bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded text-xs mb-2">
                          4. Result
                        </span>
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                Recommended High-Signal Reverse Questions
              </h2>
              <p className="text-xs md:text-sm text-slate-400">
                Ask these during the final 10 minutes to signal seniority, architectural maturity, and operational rigor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
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
  );
};
