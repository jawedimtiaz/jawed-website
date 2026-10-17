import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

// Layout components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { JawedAiWidget } from './components/layout/JawedAiWidget';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { WorkPage } from './pages/WorkPage';
import { NotesPage } from './pages/NotesPage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { BlogPage } from './pages/BlogPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import { TopicsPage } from './pages/TopicsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ToolsPage } from './pages/ToolsPage';
import { ToolDetailPage } from './pages/ToolDetailPage';
import { AiPage } from './pages/AiPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { DocumentHead } from './components/common/DocumentHead';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

// Scroll to top helper on route navigation
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <DocumentHead />
      <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <div style={{ flex: 1 }}>
          <Routes>
            {/* Home */}
            <Route path="/" element={<HomePage />} />

            {/* About */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/" element={<AboutPage />} />

            {/* Work & Subroutes */}
            <Route path="/work" element={<WorkPage initialTab="overview" />} />
            <Route path="/work/" element={<WorkPage initialTab="overview" />} />
            <Route path="/work/experience" element={<WorkPage initialTab="experience" />} />
            <Route path="/work/experience/" element={<WorkPage initialTab="experience" />} />
            <Route path="/work/skills" element={<WorkPage initialTab="skills" />} />
            <Route path="/work/skills/" element={<WorkPage initialTab="skills" />} />
            <Route path="/work/certifications" element={<WorkPage initialTab="certifications" />} />
            <Route path="/work/certifications/" element={<WorkPage initialTab="certifications" />} />
            <Route path="/work/projects" element={<WorkPage initialTab="projects" />} />
            <Route path="/work/projects/" element={<WorkPage initialTab="projects" />} />

            {/* Notes */}
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/" element={<NotesPage />} />
            <Route path="/notes/:slug" element={<NoteDetailPage />} />
            <Route path="/notes/:slug/" element={<NoteDetailPage />} />

            {/* Blog */}
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path="/blog/:slug/" element={<BlogDetailPage />} />

            {/* Topics */}
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topics/" element={<TopicsPage />} />

            {/* Resources */}
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/resources/" element={<ResourcesPage />} />

            {/* Tools */}
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tools/" element={<ToolsPage />} />
            <Route path="/tools/:slug" element={<ToolDetailPage />} />
            <Route path="/tools/:slug/" element={<ToolDetailPage />} />

            {/* AI */}
            <Route path="/ai" element={<AiPage />} />
            <Route path="/ai/" element={<AiPage />} />

            {/* Contact */}
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/contact/" element={<ContactPage />} />

            {/* Privacy */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/privacy/" element={<PrivacyPage />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>

        <Footer />
        <JawedAiWidget />
        <PwaInstallPrompt />
      </div>
    </BrowserRouter>
  );
};

export default App;
