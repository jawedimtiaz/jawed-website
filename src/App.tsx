import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { JawedAiWidget } from './components/JawedAiWidget';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { RouteSeo } from './components/RouteSeo';
import { ScrollProgress } from './components/ScrollProgress';

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
import { TermsPage } from './pages/TermsPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { ServicesDispatchPage } from './pages/ServicesDispatchPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Tools
import { AiPromptBuilder } from './tools/AiPromptBuilder';
import { CareerMatchResumeReview } from './tools/CareerMatchResumeReview';
import { ResumeBulletStrengthChecker } from './tools/ResumeBulletStrengthChecker';
import { ITResumeBulletBuilder } from './tools/ITResumeBulletBuilder';
import { InterviewPreparationPlanner } from './tools/InterviewPreparationPlanner';
import { ItTroubleshootingAssistant } from './tools/ItTroubleshootingAssistant';
import { ServiceDeskNoteFormatter } from './tools/ServiceDeskNoteFormatter';
import { TicketToKbDraft } from './tools/TicketToKbDraft';
import { Ipv4SubnetCalculator } from './tools/Ipv4SubnetCalculator';
import { ServerRackPowerBtuCalculator } from './tools/ServerRackPowerBtuCalculator';
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
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const [adsAllowed, setAdsAllowed] = useState(true);

  useEffect(() => {
    const a = localStorage.getItem('cookie_analytics_consent');
    const d = localStorage.getItem('cookie_ad_consent');
    if (a !== null) setAnalyticsAllowed(a === 'true');
    if (d !== null) setAdsAllowed(d === 'true');
  }, []);

  const saveCookieModalSettings = () => {
    localStorage.setItem('cookie_analytics_consent', String(analyticsAllowed));
    localStorage.setItem('cookie_ad_consent', String(adsAllowed));
    setCookieModalOpen(false);
  };

  return (
    <div className="site-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ScrollToTop />
      <RouteSeo />
      <ScrollProgress />
      <Header />

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Navigation Items (Clean Taxonomy: /guides, /tools, /services) */}
          <Route path="/guides" element={<NotesListPage />} />
          <Route path="/guides/:slug" element={<NoteDetailPage />} />

          {/* Backward-Compatible Route Aliases */}
          <Route path="/field-guides" element={<NotesListPage />} />
          <Route path="/field-guides/:slug" element={<NoteDetailPage />} />
          <Route path="/notes" element={<NotesListPage />} />
          <Route path="/notes/:slug" element={<NoteDetailPage />} />

          <Route path="/diagnostic-tools" element={<ToolsPage />} />
          <Route path="/tools" element={<ToolsPage />} />

          {/* Specific Tools */}
          <Route path="/tools/ai-prompt-builder" element={<AiPromptBuilder />} />
          <Route path="/tools/career-match-resume-review" element={<CareerMatchResumeReview />} />
          <Route path="/tools/resume-bullet-strength-checker" element={<ResumeBulletStrengthChecker />} />
          <Route path="/tools/it-resume-bullet-builder" element={<ITResumeBulletBuilder />} />
          <Route path="/tools/interview-preparation-planner" element={<InterviewPreparationPlanner />} />
          <Route path="/tools/it-troubleshooting-assistant" element={<ItTroubleshootingAssistant />} />
          <Route path="/tools/service-desk-note-formatter" element={<ServiceDeskNoteFormatter />} />
          <Route path="/tools/ticket-to-knowledge-base-draft" element={<TicketToKbDraft />} />
          <Route path="/tools/ipv4-subnet-calculator" element={<Ipv4SubnetCalculator />} />
          <Route path="/tools/server-rack-power-btu-calculator" element={<ServerRackPowerBtuCalculator />} />
          <Route path="/tools/personal-finance-snapshot" element={<PersonalFinanceSnapshot />} />
          <Route path="/tools/finance-planning-workspace" element={<FinancePlanningWorkspace />} />
          <Route path="/tools/compound-growth-sip-calculator" element={<CompoundGrowthCalculator />} />
          <Route path="/tools/inflation-goal-planning-calculator" element={<InflationGoalCalculator />} />
          <Route path="/tools/retirement-planning-calculator" element={<RetirementPlanningCalculator />} />
          <Route path="/tools/calculator" element={<RetirementPlanningCalculator />} />

          {/* Services & Dispatch */}
          <Route path="/services" element={<ServicesDispatchPage />} />
          <Route path="/services-dispatch" element={<ServicesDispatchPage />} />

          {/* Main Pages */}
          <Route path="/about/*" element={<AboutPage />} />
          <Route path="/work/*" element={<WorkPage />} />
          <Route path="/topics/*" element={<TopicsPage />} />
          <Route path="/resources/*" element={<ResourcesPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          {/* Legal & Contact Pages */}
          <Route path="/contact/*" element={<ContactPage />} />
          <Route path="/privacy/*" element={<PrivacyPage />} />
          <Route path="/terms/*" element={<TermsPage />} />
          <Route path="/cookies/*" element={<CookiePolicyPage />} />

          {/* AI */}
          <Route path="/ai/*" element={<AiPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      <Footer onOpenCookieModal={() => setCookieModalOpen(true)} />
      <JawedAiWidget />
      <PWAInstallBanner />

      {/* Cookie Preference Modal */}
      {cookieModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cookie Preferences">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, color: 'var(--text-heading)', fontSize: '1.25rem' }}>
              ⚙ Cookie &amp; Privacy Preferences
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Manage your consent preferences for analytics and Google AdSense advertising cookies.
            </p>

            <div style={{ display: 'grid', gap: '14px', margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-heading)' }}>Essential Cookies</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Theme, security &amp; local routing</span>
                </div>
                <span className="badge" style={{ color: 'var(--emerald)' }}>Always Active</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-heading)' }}>Analytics (GA4)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Anonymized usage statistics</span>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsAllowed}
                  onChange={e => setAnalyticsAllowed(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-heading)' }}>Google AdSense Ads</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Personalized advertising</span>
                </div>
                <input
                  type="checkbox"
                  checked={adsAllowed}
                  onChange={e => setAdsAllowed(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Link
                to="/cookies"
                className="button button-secondary"
                onClick={() => setCookieModalOpen(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Read Cookie Policy
              </Link>
              <button
                className="button button-primary"
                type="button"
                onClick={saveCookieModalSettings}
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
