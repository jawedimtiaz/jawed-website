import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Wrench, Bot, Search, Download } from 'lucide-react';
import {
  HeroSection,
  HERO_RESOURCE_CHIP_CLASS,
  getBrowserInstallFallbackMessage,
} from '../pages/HomePage';

export interface HeroInteractiveResourcesProps {
  onOpenSearch?: () => void;
  onInstallApp?: () => void;
}

export const HeroInteractiveResources: React.FC<HeroInteractiveResourcesProps> = ({
  onOpenSearch,
  onInstallApp,
}) => (
  <div
    className="hero-secondary-ribbon flex flex-wrap items-center gap-2 pt-4"
    data-testid="hero-interactive-resources"
  >
    <span className="ribbon-label text-xs font-semibold tracking-wider text-slate-400 uppercase">
      Interactive Resources:
    </span>
    <Link
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
      to="/guides"
    >
      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
      <span>Guides</span>
    </Link>
    <Link
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
      to="/tools"
    >
      <Wrench className="w-3.5 h-3.5 text-sky-400" />
      <span>Tools</span>
    </Link>
    <Link
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
      to="/ai"
    >
      <Bot className="w-3.5 h-3.5 text-sky-400" />
      <span>Ask AI</span>
    </Link>
    <button
      type="button"
      onClick={() => {
        if (onOpenSearch) {
          onOpenSearch();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-search-modal'));
        }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
      aria-label="Open Site Search (⌘K or Ctrl+K)"
      aria-keyshortcuts="Control+K Meta+K /"
      data-testid="hero-search-trigger"
    >
      <Search className="w-3.5 h-3.5 text-sky-400" />
      <span>Search</span>
      <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-900/90 text-slate-400 rounded border border-slate-700">
        ⌘K
      </kbd>
    </button>
    <button
      type="button"
      onClick={onInstallApp}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
      aria-label="Install Jawed Imtiaz App"
      data-testid="hero-install-app-btn"
    >
      <Download className="w-3.5 h-3.5 text-sky-400" />
      <span>Install App</span>
    </button>
  </div>
);

export {
  HeroSection,
  HeroSection as Hero,
  HERO_RESOURCE_CHIP_CLASS,
  getBrowserInstallFallbackMessage,
};
export default HeroSection;

