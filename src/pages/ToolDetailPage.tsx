import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { toolsList } from '../data/toolsData';

// Import all 12 tool components
import { ServiceDeskNoteFormatter } from '../components/tools/ServiceDeskNoteFormatter';
import { ItTroubleshootingAssistant } from '../components/tools/ItTroubleshootingAssistant';
import { TicketToKbDraft } from '../components/tools/TicketToKbDraft';
import { AiPromptBuilder } from '../components/tools/AiPromptBuilder';
import { CareerMatchResumeReview } from '../components/tools/CareerMatchResumeReview';
import { ResumeBulletStrengthChecker } from '../components/tools/ResumeBulletStrengthChecker';
import { InterviewPreparationPlanner } from '../components/tools/InterviewPreparationPlanner';
import { CompoundGrowthSipCalculator } from '../components/tools/CompoundGrowthSipCalculator';
import { InflationGoalPlanningCalculator } from '../components/tools/InflationGoalPlanningCalculator';
import { PersonalFinanceSnapshot } from '../components/tools/PersonalFinanceSnapshot';
import { RetirementPlanningCalculator } from '../components/tools/RetirementPlanningCalculator';
import { FinancePlanningWorkspace } from '../components/tools/FinancePlanningWorkspace';

export const ToolDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const cleanSlug = slug?.replace(/\/$/, '');
  const tool = toolsList.find((t) => t.slug === cleanSlug);

  if (!tool) {
    return (
      <main id="main-content" className="container page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Tool Not Found</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          The requested interactive tool could not be located.
        </p>
        <Link to="/tools/" className="button">
          ← Back to All Tools
        </Link>
      </main>
    );
  }

  // Render the appropriate tool component
  const renderToolComponent = () => {
    switch (tool.slug) {
      case 'service-desk-note-formatter':
        return <ServiceDeskNoteFormatter />;
      case 'it-troubleshooting-assistant':
        return <ItTroubleshootingAssistant />;
      case 'ticket-to-knowledge-base-draft':
        return <TicketToKbDraft />;
      case 'ai-prompt-builder':
        return <AiPromptBuilder />;
      case 'career-match-resume-review':
        return <CareerMatchResumeReview />;
      case 'resume-bullet-strength-checker':
        return <ResumeBulletStrengthChecker />;
      case 'interview-preparation-planner':
        return <InterviewPreparationPlanner />;
      case 'compound-growth-sip-calculator':
        return <CompoundGrowthSipCalculator />;
      case 'inflation-goal-planning-calculator':
        return <InflationGoalPlanningCalculator />;
      case 'personal-finance-snapshot':
        return <PersonalFinanceSnapshot />;
      case 'retirement-planning-calculator':
        return <RetirementPlanningCalculator />;
      case 'finance-planning-workspace':
        return <FinancePlanningWorkspace />;
      default:
        return <div>Tool implementation pending</div>;
    }
  };

  return (
    <>
      {renderToolComponent()}
      
      {/* Contextual Cross-Linking Bar for internal SEO & UX navigation */}
      <div className="container narrow" style={{ margin: '0 auto 3.5rem', padding: '0 1rem' }}>
        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem' }}>Related Resources &amp; Pathways</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: '0 0 1.25rem' }}>
            Continue exploring practical checklists, technical workflows, professional background, or get in touch:
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/tools/" className="button button-secondary" style={{ fontSize: '0.9rem' }}>
              ← All 12 Interactive Tools
            </Link>
            <Link to="/notes/" className="button button-secondary" style={{ fontSize: '0.9rem' }}>
              📖 Troubleshooting Notes &amp; Guides
            </Link>
            <Link to="/work/" className="button button-secondary" style={{ fontSize: '0.9rem' }}>
              💼 Work &amp; Experience Profile
            </Link>
            <Link to="/contact/" className="button" style={{ fontSize: '0.9rem' }}>
              ✉️ Contact Jawed
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};
