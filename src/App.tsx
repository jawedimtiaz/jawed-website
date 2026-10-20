import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { JawedAiWidget } from './components/JawedAiWidget';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { WorkPage } from './pages/WorkPage';
import { NotesListPage } from './pages/NotesListPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { BlogListPage } from './pages/BlogListPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { ToolsPage } from './pages/ToolsPage';
import { TopicsPage } from './pages/TopicsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AiPage } from './pages/AiPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Tools
import { AiPromptBuilder } from './tools/AiPromptBuilder';
import { CareerMatchResumeReview } from './tools/CareerMatchResumeReview';
import { ResumeBulletStrengthChecker } from './tools/ResumeBulletStrengthChecker';
import { InterviewPreparationPlanner } from './tools/InterviewPreparationPlanner';
import { ItTroubleshootingAssistant } from './tools/ItTroubleshootingAssistant';
import { ServiceDeskNoteFormatter } from './tools/ServiceDeskNoteFormatter';
import { TicketToKbDraft } from './tools/TicketToKbDraft';
import { PersonalFinanceSnapshot } from './tools/PersonalFinanceSnapshot';
import { FinancePlanningWorkspace } from './tools/FinancePlanningWorkspace';
import { CompoundGrowthCalculator } from './tools/CompoundGrowthCalculator';
import { InflationGoalCalculator } from './tools/InflationGoalCalculator';
import { RetirementPlanningCalculator } from './tools/RetirementPlanningCalculator';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export const App: React.FC = () => {
  return (
    <div className="site-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ScrollToTop />
      <Header />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about/*" element={<AboutPage />} />
          <Route path="/work/*" element={<WorkPage />} />
          <Route path="/topics/*" element={<TopicsPage />} />

          {/* Notes */}
          <Route path="/notes" element={<NotesListPage />} />
          <Route path="/notes/:slug" element={<NoteDetailPage />} />

          {/* Blog */}
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          {/* Resources */}
          <Route path="/resources/*" element={<ResourcesPage />} />

          {/* Tools Index */}
          <Route path="/tools" element={<ToolsPage />} />

          {/* Specific Tools */}
          <Route path="/tools/ai-prompt-builder" element={<AiPromptBuilder />} />
          <Route path="/tools/career-match-resume-review" element={<CareerMatchResumeReview />} />
          <Route path="/tools/resume-bullet-strength-checker" element={<ResumeBulletStrengthChecker />} />
          <Route path="/tools/interview-preparation-planner" element={<InterviewPreparationPlanner />} />
          <Route path="/tools/it-troubleshooting-assistant" element={<ItTroubleshootingAssistant />} />
          <Route path="/tools/service-desk-note-formatter" element={<ServiceDeskNoteFormatter />} />
          <Route path="/tools/ticket-to-knowledge-base-draft" element={<TicketToKbDraft />} />
          <Route path="/tools/personal-finance-snapshot" element={<PersonalFinanceSnapshot />} />
          <Route path="/tools/finance-planning-workspace" element={<FinancePlanningWorkspace />} />
          <Route path="/tools/compound-growth-sip-calculator" element={<CompoundGrowthCalculator />} />
          <Route path="/tools/inflation-goal-planning-calculator" element={<InflationGoalCalculator />} />
          <Route path="/tools/retirement-planning-calculator" element={<RetirementPlanningCalculator />} />
          <Route path="/tools/calculator" element={<RetirementPlanningCalculator />} />

          {/* AI, Contact, Privacy, 404 */}
          <Route path="/ai/*" element={<AiPage />} />
          <Route path="/contact/*" element={<ContactPage />} />
          <Route path="/privacy/*" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <Footer />
      <JawedAiWidget />
    </div>
  );
};

export default App;
