import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

export const InterviewPreparationPlanner: React.FC = () => {
  const [roleTitle, setRoleTitle] = useState('Senior IT Support Specialist');
  const [targetCompany, setTargetCompany] = useState('Fintech Enterprise');
  const [starStories, setStarStories] = useState([
    {
      id: 1,
      theme: 'High Severity Incident / Crisis Management',
      situation: 'Main office core switch failed during month-end payroll execution.',
      task: 'Restore connectivity for 120 employees and safeguard transaction cutoff deadlines.',
      action: 'Isolated primary core loop, rerouted traffic through backup redundant trunk, and coordinated with network vendor for hot-swap chassis replacement.',
      result: 'Restored vital payroll subnet within 14 minutes; zero transaction delays; implemented daily automated VRRP failover health checks.'
    }
  ]);

  const [newTheme, setNewTheme] = useState('');
  const [newSituation, setNewSituation] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newResult, setNewResult] = useState('');

  const addStory = () => {
    if (!newSituation.trim() && !newTheme.trim()) return;
    setStarStories([
      ...starStories,
      {
        id: Date.now(),
        theme: newTheme || 'General Technical Achievement',
        situation: newSituation,
        task: newTask,
        action: newAction,
        result: newResult,
      }
    ]);
    setNewTheme('');
    setNewSituation('');
    setNewTask('');
    setNewAction('');
    setNewResult('');
  };

  const removeStory = (id: number) => {
    setStarStories(starStories.filter(s => s.id !== id));
  };

  return (
    <div className="page interview-prep-page">
      <div className="container">
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
            text="Organize behavioral STAR stories, technical competencies, and high-impact reverse-interview questions."
          />
        </div>

        <header className="page-header">
          <h1 className="page-title">Interview Preparation Planner</h1>
          <p className="page-lead">
            Organize behavioral STAR stories, technical competencies, and high-impact reverse-interview questions.
          </p>
        </header>

        <div className="workspace">
          <div className="panel">
            <h2 className="section-title">Target Opportunity</h2>
            <div className="field-grid">
              <div className="field-group">
                <label htmlFor="roleTitle">Target Role</label>
                <input
                  id="roleTitle"
                  type="text"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="targetCompany">Company / Industry</label>
                <input
                  id="targetCompany"
                  type="text"
                  value={targetCompany}
                  onChange={e => setTargetCompany(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">STAR Method Story Vault</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
              Structure your accomplishments using Situation, Task, Action, and Result. Interviewers remember measurable outcomes.
            </p>

            <div className="bullet-list" style={{ marginBottom: '24px' }}>
              {starStories.map(story => (
                <div key={story.id} className="bullet-item" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)' }}>{story.theme}</h3>
                    <button
                      type="button"
                      onClick={() => removeStory(story.id)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    <p><strong>Situation:</strong> {story.situation}</p>
                    <p><strong>Task:</strong> {story.task}</p>
                    <p><strong>Action:</strong> {story.action}</p>
                    <p><strong>Result:</strong> {story.result}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Add Another STAR Story</h3>
              <div className="field-group" style={{ marginBottom: '10px' }}>
                <label>Theme / Category (e.g. Dealing with Conflict, Escalation, Automation)</label>
                <input
                  type="text"
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value)}
                  placeholder="e.g. Automating Device Onboarding"
                />
              </div>
              <div className="field-grid">
                <div className="field-group">
                  <label>Situation (The Context)</label>
                  <textarea
                    rows={2}
                    value={newSituation}
                    onChange={e => setNewSituation(e.target.value)}
                    placeholder="What was the challenge or background?"
                  />
                </div>
                <div className="field-group">
                  <label>Task (Your Responsibility)</label>
                  <textarea
                    rows={2}
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="What were you tasked to solve?"
                  />
                </div>
              </div>
              <div className="field-grid" style={{ marginTop: '10px' }}>
                <div className="field-group">
                  <label>Action (Specific Steps You Took)</label>
                  <textarea
                    rows={2}
                    value={newAction}
                    onChange={e => setNewAction(e.target.value)}
                    placeholder="What tools did you use and actions did you drive?"
                  />
                </div>
                <div className="field-group">
                  <label>Result (Measurable Outcome)</label>
                  <textarea
                    rows={2}
                    value={newResult}
                    onChange={e => setNewResult(e.target.value)}
                    placeholder="Quantified outcome (time saved, SLA % improved, costs cut)"
                  />
                </div>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={addStory}
                style={{ marginTop: '14px' }}
              >
                Add Story to Vault
              </button>
            </div>
          </div>

          <div className="panel">
            <h2 className="section-title">Recommended High-Signal Reverse Questions</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '12px' }}>
              Ask these during the final minutes to showcase proactive architectural and operational maturity:
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: 1.7 }}>
              <li>"What does the escalation path look like when Tier 1 encounters an ambiguous cloud identity or network degradation issue?"</li>
              <li>"How does your team measure customer satisfaction and SLA adherence without incentivizing quick, superficial ticket closes?"</li>
              <li>"What are the top 2 internal tooling or automation initiatives the IT operations team plans to tackle over the next 12 months?"</li>
              <li>"How is the organization currently managing endpoint hygiene and compliance across hybrid / remote fleets?"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
