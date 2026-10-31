import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  searchSite,
  getQuickSearchRecommendations,
  SiteSearchResult,
  SiteCategory,
} from '../services/aiKnowledgeEngine';
import {
  useKeyboardShortcuts,
  formatComboForDisplay,
} from '../hooks/useKeyboardShortcuts';

export interface CommandPaletteProps {
  onNavigated?: () => void;
  defaultOpen?: boolean;
  onOpenShortcutsModal?: () => void;
}

export interface PaletteShortcutDisplayItem {
  id: string;
  combo: string;
  label: string;
  description: string;
  category: string;
}

export interface QuickActionItem {
  id: 'clear-local-storage' | 'print-current-tool' | 'contact-support';
  label: string;
  description: string;
  badge: string;
  icon: string;
  keywords: string[];
  action: () => void;
}

export interface FrequentUsageRecord {
  url: string;
  title: string;
  summary: string;
  category: 'tool' | 'guide';
  badge: string;
  hits: number;
  sessionHits: number;
  lastAccessed: number;
}

const FREQUENT_STORAGE_KEY = 'jawed_frequent_items_v1';
const FREQUENT_SESSION_KEY = 'jawed_session_frequent_items_v1';

export const BASELINE_FREQUENT_ITEMS: Omit<FrequentUsageRecord, 'sessionHits' | 'lastAccessed'>[] = [
  {
    url: '/tools/ipv4-subnet-calculator',
    title: 'IPv4 Subnet Calculator',
    summary: 'Calculate CIDR masks, usable host ranges, wildcard masks & broadcast addresses',
    category: 'tool',
    badge: 'Networking',
    hits: 14,
  },
  {
    url: '/tools/career-match-resume-review',
    title: 'Career Match & Resume Review',
    summary: 'Score resume keywords against IT & engineering job descriptions',
    category: 'tool',
    badge: 'Career & ATS',
    hits: 12,
  },
  {
    url: '/guides',
    title: 'IT Field Guides & SOP Library',
    summary: 'Step-by-step field procedures for structured cabling, OS triage & rack deployments',
    category: 'guide',
    badge: 'Field SOPs',
    hits: 11,
  },
  {
    url: '/tools/cable-length-poe-budget-checker',
    title: 'Cable Length & PoE Budget Checker',
    summary: 'Validate Cat5e/Cat6/Cat6A distance limits and IEEE 802.3af/at/bt PoE budgets',
    category: 'tool',
    badge: 'Hardware',
    hits: 10,
  },
  {
    url: '/tools/service-desk-note-formatter',
    title: 'Service Desk Note Formatter',
    summary: 'Structure raw troubleshooting notes into clean, standardized ticket updates',
    category: 'tool',
    badge: 'ITSM',
    hits: 9,
  },
  {
    url: '/tools/ai-prompt-builder',
    title: 'AI Technical Prompt Builder',
    summary: 'Build structured root-cause analysis and script-generation prompts',
    category: 'tool',
    badge: 'AI Workflow',
    hits: 8,
  },
];

export const FALLBACK_SHORTCUTS: PaletteShortcutDisplayItem[] = [
  {
    id: 'nav-home',
    combo: 'g+h',
    label: 'Go to Home',
    description: 'G + H -> Go to Home',
    category: 'Navigation',
  },
  {
    id: 'nav-tools',
    combo: 'g+t',
    label: 'Go to Tools',
    description: 'G + T -> Go to Tools',
    category: 'Navigation',
  },
  {
    id: 'nav-guides',
    combo: 'g+g',
    label: 'Go to Guides',
    description: 'G + G -> Go to Guides',
    category: 'Navigation',
  },
  {
    id: 'search-modal',
    combo: 'mod+k',
    label: 'Open Search',
    description: '⌘ + K -> Open Search',
    category: 'Search & Modals',
  },
  {
    id: 'toggle-theme',
    combo: 't',
    label: 'Toggle Theme (Dark / Light)',
    description: 'T -> Toggle Theme (Dark / Light)',
    category: 'Global Controls',
  },
  {
    id: 'focus-search',
    combo: '/',
    label: 'Focus Search Input',
    description: 'Press / to quickly open search modal from anywhere',
    category: 'Search & Modals',
  },
  {
    id: 'shortcuts-help',
    combo: 'shift+?',
    label: 'Keyboard Shortcuts',
    description: 'Open keyboard shortcuts cheatsheet modal (Shift + ?)',
    category: 'Search & Modals',
  },
  {
    id: 'close-modals',
    combo: 'esc',
    label: 'Close Active Modals',
    description: 'Dismiss open search modal, AI widget, or dialogs',
    category: 'Search & Modals',
  },
  {
    id: 'ai-widget',
    combo: 'alt+a',
    label: 'Toggle AI Assistant',
    description: 'Open or minimize Jawed AI troubleshooting widget',
    category: 'AI Assistant',
  },
];

export const POPULAR_SEARCH_CATEGORIES: {
  label: string;
  badge: string;
  url: string;
  query: string;
  description: string;
}[] = [
  {
    label: 'IPv4 Calculator',
    badge: 'Networking',
    url: '/tools/ipv4-subnet-calculator',
    query: 'IPv4 Subnet Calculator',
    description: 'CIDR masks, host ranges & broadcast addresses',
  },
  {
    label: 'Resume Review',
    badge: 'Career & ATS',
    url: '/tools/career-match-resume-review',
    query: 'Resume Review',
    description: 'Match resume keywords against IT job descriptions',
  },
  {
    label: 'IT Field Guides',
    badge: 'Documentation',
    url: '/guides',
    query: 'IT Field Guides',
    description: 'SOPs for cabling, Windows, macOS & network triage',
  },
  {
    label: 'Cable Length & PoE',
    badge: 'Hardware',
    url: '/tools/cable-length-poe-budget-checker',
    query: 'Cable Length & PoE',
    description: 'Verify Cat5e/6/6a runs & switch PoE power budgets',
  },
  {
    label: 'Service Desk Notes',
    badge: 'ITSM',
    url: '/tools/service-desk-note-formatter',
    query: 'Service Desk Note Formatter',
    description: 'Format troubleshooting notes into clean ticket updates',
  },
  {
    label: 'AI Prompt Builder',
    badge: 'AI Tool',
    url: '/tools/ai-prompt-builder',
    query: 'AI Prompt Builder',
    description: 'Craft high-context technical & support prompts',
  },
];

export type NavigationKeyHintType =
  | 'search'
  | 'up'
  | 'down'
  | 'jump'
  | 'category'
  | 'select'
  | 'close'
  | 'shortcuts'
  | null;

export type NavigablePaletteTarget =
  | { kind: 'shortcut'; shortcut: PaletteShortcutDisplayItem; indexInGroup: number }
  | { kind: 'result'; item: SiteSearchResult; indexInGroup: number };

const CATEGORY_ORDER: ('all' | SiteCategory)[] = ['all', 'tool', 'guide', 'blog', 'page'];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNavigated,
  defaultOpen = false,
  onOpenShortcutsModal,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SiteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeKeyHint, setActiveKeyHint] = useState<NavigationKeyHintType>(null);
  const [navigationMode, setNavigationMode] = useState<'keyboard' | 'pointer'>('keyboard');
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const shortcutsListRef = useRef<HTMLUListElement>(null);
  const tabRefs = useRef<Record<'all' | SiteCategory, HTMLButtonElement | null>>({
    all: null,
    tool: null,
    guide: null,
    blog: null,
    page: null,
  });
  const keyHintTimeoutRef = useRef<number | null>(null);
  const quickActionNoticeTimeoutRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { shortcuts, triggerShortcut, openHelpModal } = useKeyboardShortcuts();

  const flashKeyHint = useCallback((hint: NavigationKeyHintType) => {
    setActiveKeyHint(hint);
    if (keyHintTimeoutRef.current !== null) {
      window.clearTimeout(keyHintTimeoutRef.current);
    }
    if (hint !== null) {
      keyHintTimeoutRef.current = window.setTimeout(() => {
        setActiveKeyHint(null);
      }, 260);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (keyHintTimeoutRef.current !== null) {
        window.clearTimeout(keyHintTimeoutRef.current);
      }
      if (quickActionNoticeTimeoutRef.current !== null) {
        window.clearTimeout(quickActionNoticeTimeoutRef.current);
      }
    };
  }, []);

  const availableShortcuts: PaletteShortcutDisplayItem[] = useMemo(() => {
    return shortcuts.length > 0 ? shortcuts : FALLBACK_SHORTCUTS;
  }, [shortcuts]);

  // Show the 'Keyboard Shortcuts' section when the user types '?' or 'help' (or 'shortcut' / 'hotkey')
  const isShortcutQuery = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return false;
    return (
      trimmed === '?' ||
      trimmed.startsWith('?') ||
      trimmed === 'help' ||
      trimmed.includes('help') ||
      trimmed.includes('shortcut') ||
      trimmed.includes('hotkey')
    );
  }, [query]);

  const matchingShortcuts = useMemo(() => {
    if (!isShortcutQuery) return [];
    const trimmed = query.trim().toLowerCase();
    const subQuery = trimmed.startsWith('?') ? trimmed.slice(1).trim() : trimmed;
    if (
      !subQuery ||
      subQuery === 'help' ||
      subQuery === 'shortcut' ||
      subQuery === 'shortcuts' ||
      subQuery === 'hotkey' ||
      subQuery === 'hotkeys'
    ) {
      return availableShortcuts;
    }
    const filtered = availableShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(subQuery) ||
        s.description.toLowerCase().includes(subQuery) ||
        s.combo.toLowerCase().includes(subQuery) ||
        s.category.toLowerCase().includes(subQuery)
    );
    return filtered.length > 0 ? filtered : availableShortcuts;
  }, [isShortcutQuery, query, availableShortcuts]);

  // Search History (localStorage last 5 queries)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jawed_site_recent_searches_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch {}
    return [];
  });

  const addRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('jawed_site_recent_searches_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('jawed_site_recent_searches_v1');
    } catch {}
  }, []);

  // Recommendations when query is empty
  const recommendations = useMemo(() => getQuickSearchRecommendations(), []);

  // Frequently Searched tools & guides state (combines sessionStorage + localStorage + baseline top-performing tools/guides)
  const [frequentRecords, setFrequentRecords] = useState<Record<string, FrequentUsageRecord>>(() => {
    const initialMap: Record<string, FrequentUsageRecord> = {};
    for (const item of BASELINE_FREQUENT_ITEMS) {
      initialMap[item.url] = {
        ...item,
        sessionHits: 0,
        lastAccessed: 0,
      };
    }
    try {
      const savedLocal = localStorage.getItem(FREQUENT_STORAGE_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal) as Record<string, FrequentUsageRecord>;
        if (parsed && typeof parsed === 'object') {
          for (const [url, rec] of Object.entries(parsed)) {
            if (rec && rec.url && rec.title) {
              initialMap[url] = {
                ...(initialMap[url] || {}),
                ...rec,
                sessionHits: 0,
              };
            }
          }
        }
      }
    } catch {}
    try {
      const savedSession = sessionStorage.getItem(FREQUENT_SESSION_KEY);
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession) as Record<
          string,
          { sessionHits: number; lastAccessed: number }
        >;
        if (parsedSession && typeof parsedSession === 'object') {
          for (const [url, sRec] of Object.entries(parsedSession)) {
            if (initialMap[url] && sRec) {
              initialMap[url] = {
                ...initialMap[url],
                sessionHits: Number(sRec.sessionHits) || 0,
                lastAccessed: Math.max(
                  initialMap[url].lastAccessed || 0,
                  Number(sRec.lastAccessed) || 0
                ),
              };
            }
          }
        }
      }
    } catch {}
    return initialMap;
  });

  const recordFrequentItemVisit = useCallback(
    (item: {
      url: string;
      title: string;
      summary?: string;
      category?: SiteCategory;
      badge?: string;
    }) => {
      const normalizedUrl = item.url.replace(/\/+$/, '') || '/';
      const isTool = item.category === 'tool' || normalizedUrl.startsWith('/tools');
      const isGuide = item.category === 'guide' || normalizedUrl.startsWith('/guides');
      if (!isTool && !isGuide) return;

      const resolvedCategory: 'tool' | 'guide' = isTool ? 'tool' : 'guide';
      const now = Date.now();

      setFrequentRecords((prev) => {
        const existing = prev[normalizedUrl];
        const updated: FrequentUsageRecord = {
          url: normalizedUrl,
          title: item.title || existing?.title || 'Tool / Guide',
          summary:
            item.summary ||
            existing?.summary ||
            (resolvedCategory === 'tool'
              ? 'Interactive IT & networking utility'
              : 'Step-by-step IT field guide & SOP'),
          category: resolvedCategory,
          badge:
            item.badge ||
            existing?.badge ||
            (resolvedCategory === 'tool' ? 'Tool' : 'Field Guide'),
          hits: (existing?.hits || 5) + 1,
          sessionHits: (existing?.sessionHits || 0) + 1,
          lastAccessed: now,
        };

        const next = {
          ...prev,
          [normalizedUrl]: updated,
        };

        try {
          localStorage.setItem(FREQUENT_STORAGE_KEY, JSON.stringify(next));
        } catch {}

        try {
          const sessionMap: Record<string, { sessionHits: number; lastAccessed: number }> = {};
          for (const [k, v] of Object.entries(next)) {
            if (v.sessionHits > 0) {
              sessionMap[k] = {
                sessionHits: v.sessionHits,
                lastAccessed: v.lastAccessed,
              };
            }
          }
          sessionStorage.setItem(FREQUENT_SESSION_KEY, JSON.stringify(sessionMap));
        } catch {}

        return next;
      });
    },
    []
  );

  const resetFrequentHistory = useCallback(() => {
    const resetMap: Record<string, FrequentUsageRecord> = {};
    for (const item of BASELINE_FREQUENT_ITEMS) {
      resetMap[item.url] = {
        ...item,
        sessionHits: 0,
        lastAccessed: 0,
      };
    }
    setFrequentRecords(resetMap);
    try {
      localStorage.removeItem(FREQUENT_STORAGE_KEY);
      sessionStorage.removeItem(FREQUENT_SESSION_KEY);
    } catch {}
  }, []);

  // Automatically track visits to tools & guides in current session when route changes
  useEffect(() => {
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    if (!currentPath.startsWith('/tools/') && !currentPath.startsWith('/guides')) {
      return;
    }
    const matchedRec = recommendations.find(
      (r) => (r.url.replace(/\/+$/, '') || '/') === currentPath
    );
    const matchedBaseline = BASELINE_FREQUENT_ITEMS.find((b) => b.url === currentPath);
    if (matchedRec || matchedBaseline) {
      recordFrequentItemVisit({
        url: currentPath,
        title: matchedRec?.title || matchedBaseline!.title,
        summary: matchedRec?.summary || matchedBaseline!.summary,
        category: matchedRec?.category || matchedBaseline!.category,
        badge: matchedBaseline?.badge,
      });
    }
  }, [location.pathname, recommendations, recordFrequentItemVisit]);

  // Dynamically ranked top-performing tools and guides based on recent session history
  const frequentlySearchedItems = useMemo(() => {
    const list = Object.values(frequentRecords).filter((item) => {
      if (activeCategory === 'tool') return item.category === 'tool';
      if (activeCategory === 'guide') return item.category === 'guide';
      if (activeCategory === 'blog' || activeCategory === 'page') return false;
      return true;
    });

    return list
      .sort((a, b) => {
        const scoreA = a.sessionHits * 10 + a.hits + (a.lastAccessed > 0 ? 5 : 0);
        const scoreB = b.sessionHits * 10 + b.hits + (b.lastAccessed > 0 ? 5 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.lastAccessed - a.lastAccessed;
      })
      .slice(0, 4);
  }, [frequentRecords, activeCategory]);

  // Search results from aiKnowledgeEngine
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return {
        all: recommendations,
        tools: recommendations.filter((r) => r.category === 'tool'),
        guides: recommendations.filter((r) => r.category === 'guide'),
        blogs: recommendations.filter((r) => r.category === 'blog'),
        pages: recommendations.filter((r) => r.category === 'page'),
        query: '',
        isPersonal: false,
      };
    }
    return searchSite(query);
  }, [query, recommendations]);

  // Filter by category tab
  const displayedItems = useMemo(() => {
    if (activeCategory === 'tool') return searchResults.tools;
    if (activeCategory === 'guide') return searchResults.guides;
    if (activeCategory === 'blog') return searchResults.blogs;
    if (activeCategory === 'page') return searchResults.pages;
    return searchResults.all;
  }, [searchResults, activeCategory]);

  // Unified navigable target items across Keyboard Shortcuts (when active) and Search Results
  const navigableTargets: NavigablePaletteTarget[] = useMemo(() => {
    const targets: NavigablePaletteTarget[] = [];
    if (isShortcutQuery) {
      matchingShortcuts.forEach((shortcut, idx) => {
        targets.push({ kind: 'shortcut', shortcut, indexInGroup: idx });
      });
    }
    displayedItems.forEach((item, idx) => {
      targets.push({ kind: 'result', item, indexInGroup: idx });
    });
    return targets;
  }, [isShortcutQuery, matchingShortcuts, displayedItems]);

  // Reset selectedIndex on query or tab change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Keep selectedIndex within bounds if list size shrinks
  useEffect(() => {
    if (navigableTargets.length > 0 && selectedIndex >= navigableTargets.length) {
      setSelectedIndex(navigableTargets.length - 1);
    }
  }, [navigableTargets.length, selectedIndex]);

  // Open modal handler
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setNavigationMode('keyboard');
    setQuickActionNotice(null);
    flashKeyHint('search');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, [flashKeyHint]);

  // Close modal handler
  const handleClose = useCallback(() => {
    flashKeyHint('close');
    setIsOpen(false);
    setQuery('');
    setActiveCategory('all');
    setQuickActionNotice(null);
  }, [flashKeyHint]);

  // Quick Actions Handlers
  const handleClearLocalStorageAction = useCallback(() => {
    flashKeyHint('select');
    try {
      localStorage.clear();
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}
    setRecentSearches([]);
    resetFrequentHistory();
    window.dispatchEvent(new CustomEvent('local-storage-cleared'));
    setQuickActionNotice('Local storage and cached tool data cleared.');
    if (quickActionNoticeTimeoutRef.current !== null) {
      window.clearTimeout(quickActionNoticeTimeoutRef.current);
    }
    quickActionNoticeTimeoutRef.current = window.setTimeout(() => {
      setQuickActionNotice(null);
    }, 3000);
  }, [flashKeyHint, resetFrequentHistory]);

  const handlePrintCurrentToolAction = useCallback(() => {
    flashKeyHint('select');
    handleClose();
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }, [flashKeyHint, handleClose]);

  const handleContactSupportAction = useCallback(() => {
    flashKeyHint('select');
    handleClose();
    if (onNavigated) onNavigated();
    navigate('/contact');
  }, [flashKeyHint, handleClose, onNavigated, navigate]);

  const quickActions: QuickActionItem[] = useMemo(
    () => [
      {
        id: 'clear-local-storage',
        label: 'Clear Local Storage',
        description: 'Reset saved tool states, cached inputs & search history',
        badge: 'Storage',
        icon: '🧹',
        keywords: ['clear', 'local', 'storage', 'reset', 'cache', 'history', 'data'],
        action: handleClearLocalStorageAction,
      },
      {
        id: 'print-current-tool',
        label: 'Print Current Tool',
        description: 'Print active diagnostic calculator or save report as PDF',
        badge: 'Print / PDF',
        icon: '🖨️',
        keywords: ['print', 'current', 'tool', 'pdf', 'export', 'report', 'page'],
        action: handlePrintCurrentToolAction,
      },
      {
        id: 'contact-support',
        label: 'Contact Support',
        description: 'Open IT field support dispatch & direct contact page',
        badge: 'Support',
        icon: '✉️',
        keywords: ['contact', 'support', 'help', 'dispatch', 'email', 'ticket', 'jawed'],
        action: handleContactSupportAction,
      },
    ],
    [handleClearLocalStorageAction, handlePrintCurrentToolAction, handleContactSupportAction]
  );

  const matchingQuickActions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return quickActions;
    if (trimmed === 'quick' || trimmed === 'quick actions' || trimmed === 'actions') {
      return quickActions;
    }
    return quickActions.filter(
      (qa) =>
        qa.label.toLowerCase().includes(trimmed) ||
        qa.description.toLowerCase().includes(trimmed) ||
        qa.badge.toLowerCase().includes(trimmed) ||
        qa.keywords.some((kw) => kw.includes(trimmed) || trimmed.includes(kw))
    );
  }, [query, quickActions]);

  // Open the Keyboard Shortcut Cheatsheet Modal
  const handleOpenShortcutModal = useCallback(() => {
    flashKeyHint('shortcuts');
    handleClose();
    if (onOpenShortcutsModal) {
      onOpenShortcutsModal();
      return;
    }
    if (openHelpModal) {
      openHelpModal();
    }
    window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
  }, [flashKeyHint, handleClose, onOpenShortcutsModal, openHelpModal]);

  // Cycle category tabs left/right
  const cycleCategory = useCallback(
    (direction: 1 | -1, focusTabButton = false) => {
      flashKeyHint('category');
      setActiveCategory((prev) => {
        const currentIdx = CATEGORY_ORDER.indexOf(prev);
        const nextIdx = (currentIdx + direction + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
        const nextCategory = CATEGORY_ORDER[nextIdx];
        if (focusTabButton) {
          window.requestAnimationFrame(() => {
            tabRefs.current[nextCategory]?.focus();
          });
        }
        return nextCategory;
      });
    },
    [flashKeyHint]
  );

  // Global keyboard shortcuts & custom event listeners (Cmd+K, Ctrl+K, '/', Esc)
  useEffect(() => {
    const handleToggleEvent = () => {
      if (isOpen) {
        handleClose();
      } else {
        handleOpen();
      }
    };

    const handleOpenEvent = () => {
      handleOpen();
    };

    const handleCloseEvent = () => {
      if (isOpen) {
        handleClose();
      }
    };

    window.addEventListener('toggle-search-modal', handleToggleEvent);
    window.addEventListener('open-search-modal', handleOpenEvent);
    window.addEventListener('close-all-modals', handleCloseEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
        return;
      }

      // Forward slash '/' when not typing in an editable field
      if (
        e.key === '/' &&
        !isOpen &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        handleOpen();
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('toggle-search-modal', handleToggleEvent);
      window.removeEventListener('open-search-modal', handleOpenEvent);
      window.removeEventListener('close-all-modals', handleCloseEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleOpen, handleClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Normalize URL for React Router navigation
  const navigateToResult = useCallback(
    (item: SiteSearchResult) => {
      flashKeyHint('select');
      if (query.trim()) {
        addRecentSearch(query);
      }
      recordFrequentItemVisit({
        url: item.url,
        title: item.title,
        summary: item.summary,
        category: item.category,
      });
      const targetPath = item.url.replace(/\/+$/, '') || '/';
      handleClose();
      if (onNavigated) onNavigated();
      navigate(targetPath);
    },
    [
      flashKeyHint,
      navigate,
      handleClose,
      onNavigated,
      query,
      addRecentSearch,
      recordFrequentItemVisit,
    ]
  );

  const handleExecuteShortcut = useCallback(
    (shortcutId: string) => {
      flashKeyHint('select');
      handleClose();
      if (shortcuts.length > 0) {
        triggerShortcut(shortcutId);
        return;
      }
      if (shortcutId === 'nav-home') navigate('/');
      else if (shortcutId === 'nav-tools') navigate('/tools');
      else if (shortcutId === 'nav-guides') navigate('/guides');
      else if (shortcutId === 'shortcuts-help') {
        handleOpenShortcutModal();
      } else if (shortcutId === 'ai-widget') {
        window.dispatchEvent(new CustomEvent('toggle-ai-widget'));
      }
    },
    [flashKeyHint, handleClose, shortcuts.length, triggerShortcut, navigate, handleOpenShortcutModal]
  );

  const scrollTargetIntoView = useCallback(
    (targetIndex: number) => {
      const target = navigableTargets[targetIndex];
      if (!target) return;
      if (target.kind === 'shortcut') {
        const items = shortcutsListRef.current?.querySelectorAll('li');
        if (items && items[target.indexInGroup]) {
          items[target.indexInGroup].scrollIntoView({ block: 'nearest' });
        }
      } else {
        const items = listRef.current?.querySelectorAll('li');
        if (items && items[target.indexInGroup]) {
          items[target.indexInGroup].scrollIntoView({ block: 'nearest' });
        }
      }
    },
    [navigableTargets]
  );

  // Move selection by delta or jump to specific index
  const moveSelection = useCallback(
    (
      action:
        | { type: 'step'; delta: number }
        | { type: 'first' }
        | { type: 'last' },
      hintType: NavigationKeyHintType
    ) => {
      setNavigationMode('keyboard');
      flashKeyHint(hintType);
      const total = navigableTargets.length;
      if (total === 0) return;

      setSelectedIndex((prev) => {
        let next = prev;
        if (action.type === 'first') {
          next = 0;
        } else if (action.type === 'last') {
          next = total - 1;
        } else {
          // For single-step (+1 / -1) wrap around; for PageUp/PageDown clamp to bounds
          if (Math.abs(action.delta) === 1) {
            next = (prev + action.delta + total) % total;
          } else {
            next = Math.max(0, Math.min(total - 1, prev + action.delta));
          }
        }
        scrollTargetIntoView(next);
        return next;
      });
    },
    [flashKeyHint, navigableTargets.length, scrollTargetIntoView]
  );

  const activateSelectedTarget = useCallback(() => {
    flashKeyHint('select');
    if (query.trim()) {
      addRecentSearch(query);
    }
    const target = navigableTargets[selectedIndex];
    if (target) {
      if (target.kind === 'shortcut') {
        handleExecuteShortcut(target.shortcut.id);
      } else {
        navigateToResult(target.item);
      }
    } else if (matchingQuickActions.length > 0) {
      matchingQuickActions[0].action();
    } else if (isShortcutQuery) {
      handleOpenShortcutModal();
    }
  }, [
    flashKeyHint,
    query,
    addRecentSearch,
    navigableTargets,
    selectedIndex,
    matchingQuickActions,
    isShortcutQuery,
    handleExecuteShortcut,
    navigateToResult,
    handleOpenShortcutModal,
  ]);

  // Modal focus trap & modal-wide complex keyboard shortcuts
  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }

    // Alt + ArrowLeft / ArrowRight cycles category tabs from anywhere in the modal
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      cycleCategory(1);
      return;
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      cycleCategory(-1);
      return;
    }
  };

  // Complex keyboard navigation within the search combobox input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.altKey) {
        // Alt+ArrowDown jumps by 5 items (same as PageDown)
        moveSelection({ type: 'step', delta: 5 }, 'jump');
      } else {
        moveSelection({ type: 'step', delta: 1 }, 'down');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.altKey) {
        // Alt+ArrowUp jumps back by 5 items (same as PageUp)
        moveSelection({ type: 'step', delta: -5 }, 'jump');
      } else {
        moveSelection({ type: 'step', delta: -1 }, 'up');
      }
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      moveSelection({ type: 'step', delta: 5 }, 'jump');
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      moveSelection({ type: 'step', delta: -5 }, 'jump');
    } else if (e.key === 'Home' && (!query || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      moveSelection({ type: 'first' }, 'jump');
    } else if (e.key === 'End' && (!query || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      moveSelection({ type: 'last' }, 'jump');
    } else if (e.key === 'ArrowRight' && !query && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      cycleCategory(1);
    } else if (e.key === 'ArrowLeft' && !query && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      cycleCategory(-1);
    } else if (e.key === '?' && e.shiftKey && !query) {
      // Pressing Shift+? when the search box is empty opens the full Keyboard Shortcuts cheatsheet
      e.preventDefault();
      handleOpenShortcutModal();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateSelectedTarget();
    }
  };

  // Keyboard navigation when focused directly on the category tablist (WAI-ARIA Tabs pattern)
  const handleTabListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      cycleCategory(1, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cycleCategory(-1, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      flashKeyHint('category');
      setActiveCategory('all');
      tabRefs.current.all?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      flashKeyHint('category');
      setActiveCategory('page');
      tabRefs.current.page?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      inputRef.current?.focus();
      moveSelection({ type: 'step', delta: 0 }, 'down');
    }
  };

  // Highlight matching terms in text
  const highlightMatch = (text: string, term: string) => {
    if (!term || !term.trim()) return text;
    const words = term
      .trim()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length >= 2);
    if (words.length === 0) return text;

    try {
      const pattern = new RegExp(
        `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
        'gi'
      );
      const parts = text.split(pattern);
      return parts.map((part, i) =>
        words.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const getCategoryBadgeClass = (category: SiteCategory) => {
    switch (category) {
      case 'tool':
        return 'badge-tool';
      case 'guide':
        return 'badge-guide';
      case 'blog':
        return 'badge-blog';
      default:
        return 'badge-page';
    }
  };

  const getCategoryLabel = (category: SiteCategory) => {
    switch (category) {
      case 'tool':
        return '🛠️ Tool';
      case 'guide':
        return '📘 Field Guide';
      case 'blog':
        return '📰 Blog Post';
      default:
        return '📄 Page';
    }
  };

  // Compute active descendant DOM id and live status announcement for screen readers
  const activeTarget = navigableTargets[selectedIndex] || null;
  const activeDescendantId = useMemo(() => {
    if (!activeTarget) return undefined;
    if (activeTarget.kind === 'shortcut') {
      return `command-palette-shortcut-option-${activeTarget.indexInGroup}`;
    }
    return `command-palette-result-option-${activeTarget.indexInGroup}`;
  }, [activeTarget]);

  const liveAnnouncement = useMemo(() => {
    if (!isOpen) return '';
    const total = navigableTargets.length;
    if (total === 0) {
      return query.trim() ? `No search results found for ${query}` : 'No items available';
    }
    const pos = `${selectedIndex + 1} of ${total}`;
    if (activeTarget?.kind === 'shortcut') {
      return `Keyboard shortcut ${pos}: ${activeTarget.shortcut.label} (${activeTarget.shortcut.combo})`;
    }
    if (activeTarget?.kind === 'result') {
      return `Result ${pos}: ${activeTarget.item.title} (${activeTarget.item.category})`;
    }
    return `${total} items available`;
  }, [isOpen, navigableTargets.length, query, selectedIndex, activeTarget]);

  const shortcutOffset = isShortcutQuery ? matchingShortcuts.length : 0;

  return (
    <div className="site-search-wrapper command-palette-wrapper">
      {/* Header Search Trigger Button */}
      <button
        type="button"
        className="header-search-btn"
        onClick={handleOpen}
        aria-label="Global Search - Press Ctrl+K, Cmd+K, or forward slash"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-keyshortcuts="Control+K Meta+K /"
        title="Search tools, field guides & blog posts (Ctrl+K or Cmd+K)"
      >
        <svg
          className="header-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="header-search-placeholder">Search tools, guides &amp; blog...</span>
        <kbd
          className="header-search-kbd command-palette-kbd"
          role="term"
          aria-label="Command or Control K"
        >
          <abbr title="Control or Command" style={{ textDecoration: 'none' }}>
            ⌘
          </abbr>
          K
        </kbd>
      </button>

      {/* Global Command Palette Modal Overlay */}
      {isOpen && (
        <div
          className="search-modal-backdrop command-palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Global Site Search Command Palette"
          aria-describedby="command-palette-footer-shortcuts"
          onClick={handleClose}
        >
          <div
            ref={modalRef}
            className="search-modal-box command-palette-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
            onMouseMove={() => {
              if (navigationMode !== 'pointer') {
                setNavigationMode('pointer');
              }
            }}
            role="document"
          >
            {/* Screen-reader polite status announcer for keyboard navigation */}
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {liveAnnouncement}
            </div>

            {/* Search Input Bar */}
            <div className="search-input-row">
              <svg
                className="search-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                id="command-palette-search-input"
                type="search"
                className="search-modal-input"
                placeholder="Search tools, field guides, blog posts, calculators (or ? for shortcuts)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                role="combobox"
                aria-label="Search site tools, field guides, blog posts, and keyboard shortcuts"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={navigableTargets.length > 0}
                aria-controls="search-results-list"
                aria-activedescendant={activeDescendantId}
                aria-describedby="command-palette-footer-shortcuts"
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className="search-modal-close-btn"
                onClick={handleClose}
                aria-label="Close search modal (Escape)"
                aria-keyshortcuts="Escape"
              >
                <kbd
                  className={`search-esc-badge command-palette-kbd ${
                    activeKeyHint === 'close' ? 'is-active' : ''
                  }`}
                  role="term"
                  aria-label="Escape key"
                >
                  ESC
                </kbd>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div
              className="search-category-tabs"
              role="tablist"
              aria-label="Search Categories (Use Left and Right Arrow keys or Alt+Arrow keys to switch)"
              onKeyDown={handleTabListKeyDown}
            >
              <button
                ref={(el) => {
                  tabRefs.current.all = el;
                }}
                id="search-tab-all"
                type="button"
                role="tab"
                tabIndex={activeCategory === 'all' ? 0 : -1}
                aria-selected={activeCategory === 'all'}
                aria-controls="search-results-list"
                className={`search-tab ${activeCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => {
                  flashKeyHint('category');
                  setActiveCategory('all');
                  inputRef.current?.focus();
                }}
              >
                All ({searchResults.all.length})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.tool = el;
                }}
                id="search-tab-tool"
                type="button"
                role="tab"
                tabIndex={activeCategory === 'tool' ? 0 : -1}
                aria-selected={activeCategory === 'tool'}
                aria-controls="search-results-list"
                className={`search-tab ${activeCategory === 'tool' ? 'is-active' : ''}`}
                onClick={() => {
                  flashKeyHint('category');
                  setActiveCategory('tool');
                  inputRef.current?.focus();
                }}
              >
                🛠️ Tools ({searchResults.tools.length})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.guide = el;
                }}
                id="search-tab-guide"
                type="button"
                role="tab"
                tabIndex={activeCategory === 'guide' ? 0 : -1}
                aria-selected={activeCategory === 'guide'}
                aria-controls="search-results-list"
                className={`search-tab ${activeCategory === 'guide' ? 'is-active' : ''}`}
                onClick={() => {
                  flashKeyHint('category');
                  setActiveCategory('guide');
                  inputRef.current?.focus();
                }}
              >
                📘 Field Guides ({searchResults.guides.length})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.blog = el;
                }}
                id="search-tab-blog"
                type="button"
                role="tab"
                tabIndex={activeCategory === 'blog' ? 0 : -1}
                aria-selected={activeCategory === 'blog'}
                aria-controls="search-results-list"
                className={`search-tab ${activeCategory === 'blog' ? 'is-active' : ''}`}
                onClick={() => {
                  flashKeyHint('category');
                  setActiveCategory('blog');
                  inputRef.current?.focus();
                }}
              >
                📰 Blog ({searchResults.blogs.length})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current.page = el;
                }}
                id="search-tab-page"
                type="button"
                role="tab"
                tabIndex={activeCategory === 'page' ? 0 : -1}
                aria-selected={activeCategory === 'page'}
                aria-controls="search-results-list"
                className={`search-tab ${activeCategory === 'page' ? 'is-active' : ''}`}
                onClick={() => {
                  flashKeyHint('category');
                  setActiveCategory('page');
                  inputRef.current?.focus();
                }}
              >
                📄 Pages ({searchResults.pages.length})
              </button>
            </div>

            {/* Results Container */}
            <div className="search-results-viewport">
              {/* Privacy Guardrail */}
              {searchResults.isPersonal ? (
                <div className="search-guardrail-notice">
                  <div className="search-guardrail-header">
                    <span className="search-guardrail-badge">🔒 Privacy &amp; Support Guardrail</span>
                  </div>
                  <p className="search-guardrail-text">
                    I only share verified professional background, technical field guides, and interactive IT tools here.
                    For personal questions or direct consultation, please contact Jawed directly.
                  </p>
                  <div className="search-guardrail-actions">
                    <button
                      type="button"
                      className="search-guardrail-btn"
                      onClick={() => {
                        handleClose();
                        navigate(`/contact?question=${encodeURIComponent(query.trim())}`);
                      }}
                    >
                      ✉️ Ask Jawed Directly →
                    </button>
                  </div>
                </div>
              ) : displayedItems.length === 0 && !isShortcutQuery && matchingQuickActions.length === 0 ? (
                /* Empty State */
                <div className="search-empty-state">
                  <p className="search-empty-title">
                    No results found for &ldquo;<span className="text-accent">{query}</span>&rdquo;
                  </p>
                  <p className="search-empty-sub">
                    Try searching for specific technical terms, diagnostic workflows, or workplace tools (or type{' '}
                    <kbd
                      className="search-footer-kbd command-palette-kbd"
                      role="term"
                      aria-label="Question mark"
                    >
                      ?
                    </kbd>{' '}
                    /{' '}
                    <kbd
                      className="search-footer-kbd command-palette-kbd"
                      role="term"
                      aria-label="help"
                    >
                      help
                    </kbd>{' '}
                    for shortcuts):
                  </p>
                  <div className="search-suggestion-chips">
                    {[
                      'IPv4 Calculator',
                      'Resume Review',
                      'IT Field Guides',
                      'Cable Length & PoE',
                      'AI Prompt Builder',
                      'Service Desk Note',
                      'RJ45 T568B',
                      'Audio Transcriber',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="search-suggestion-chip"
                        onClick={() => {
                          setQuery(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Results List */
                <div>
                  {isShortcutQuery && (
                    <div
                      className="search-shortcuts-section"
                      role="region"
                      aria-label="Keyboard Shortcuts"
                      style={{ marginBottom: displayedItems.length > 0 ? '18px' : '4px' }}
                    >
                      <div
                        className="search-section-header"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>⌨️ Keyboard Shortcuts</span>
                        <button
                          type="button"
                          onClick={handleOpenShortcutModal}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--line)',
                            color: 'var(--accent)',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Open Full Cheatsheet →
                        </button>
                      </div>
                      <ul
                        id="search-shortcuts-listbox"
                        ref={shortcutsListRef}
                        className="search-shortcuts-list"
                        role="listbox"
                        aria-label="Matching keyboard shortcuts"
                        style={{
                          listStyle: 'none',
                          margin: '6px 0 0',
                          padding: '0 8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {matchingShortcuts.map((shortcut, sIdx) => {
                          const { keys } = formatComboForDisplay(shortcut.combo);
                          const isShortcutSelected = selectedIndex === sIdx;
                          return (
                            <li
                              id={`command-palette-shortcut-option-${sIdx}`}
                              key={shortcut.id}
                              onClick={() => handleExecuteShortcut(shortcut.id)}
                              onMouseEnter={() => setSelectedIndex(sIdx)}
                              role="option"
                              aria-selected={isShortcutSelected}
                              aria-posinset={sIdx + 1}
                              aria-setsize={navigableTargets.length}
                              tabIndex={-1}
                              className={`search-shortcut-option ${
                                isShortcutSelected ? 'is-selected' : ''
                              }`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isShortcutSelected
                                  ? '1px solid var(--accent)'
                                  : '1px solid var(--line)',
                                background: isShortcutSelected
                                  ? 'var(--surface-accent)'
                                  : 'var(--bg)',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                              }}
                              title={`Run shortcut: ${shortcut.label}`}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    color: 'var(--text-heading)',
                                  }}
                                >
                                  {shortcut.label}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.73rem',
                                    color: 'var(--muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {shortcut.description}
                                </div>
                              </div>
                              <div
                                role="group"
                                aria-label={`Key combination: ${keys.join(' plus ')}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  flexShrink: 0,
                                }}
                              >
                                {keys.map((keyLabel, idx) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && (
                                      <span
                                        aria-hidden="true"
                                        style={{
                                          fontSize: '0.7rem',
                                          color: 'var(--muted)',
                                          fontWeight: 700,
                                        }}
                                      >
                                        +
                                      </span>
                                    )}
                                    <kbd
                                      className="search-footer-kbd command-palette-kbd"
                                      role="term"
                                      aria-label={keyLabel}
                                    >
                                      {keyLabel}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {!query.trim() && recentSearches.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        className="search-section-header"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span>⏱️ Recent Searches</span>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          style={{
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                          title="Clear recent searches"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="search-suggestion-chips">
                        {recentSearches.map((rec) => (
                          <button
                            key={rec}
                            type="button"
                            className="search-suggestion-chip"
                            onClick={() => {
                              setQuery(rec);
                              inputRef.current?.focus();
                            }}
                          >
                            ⏱️ {rec}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchingQuickActions.length > 0 && (
                    <div
                      className="search-quick-actions-section"
                      role="region"
                      aria-label="Quick Actions"
                      style={{ marginBottom: '16px' }}
                    >
                      <div
                        className="search-section-header"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>⚡ Quick Actions</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--muted)',
                            fontWeight: 500,
                            textTransform: 'none',
                            letterSpacing: 'normal',
                          }}
                        >
                          Instant workflow tasks
                        </span>
                      </div>

                      {quickActionNotice && (
                        <div
                          role="status"
                          aria-live="polite"
                          style={{
                            margin: '4px 12px 8px',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--emerald, #10b981)',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--text-heading)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          ✓ {quickActionNotice}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '8px',
                          padding: '4px 12px 6px',
                        }}
                      >
                        {matchingQuickActions.map((qa) => (
                          <button
                            key={qa.id}
                            type="button"
                            className="command-palette-quick-action-btn"
                            data-quick-action={qa.id}
                            onClick={qa.action}
                            title={`${qa.label} — ${qa.description}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '4px',
                              padding: '9px 12px',
                              borderRadius: '10px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg)',
                              color: 'var(--text)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s ease, background-color 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                gap: '6px',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.84rem',
                                  color: 'var(--text-heading)',
                                }}
                              >
                                <span aria-hidden="true">{qa.icon}</span>
                                <span>{qa.label}</span>
                              </span>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  color: 'var(--accent)',
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  background: 'var(--surface-accent)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {qa.badge}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.73rem',
                                color: 'var(--muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%',
                              }}
                            >
                              {qa.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!query.trim() && frequentlySearchedItems.length > 0 && (
                    <div
                      className="search-frequently-searched-section"
                      role="region"
                      aria-label="Frequently Searched"
                      style={{ marginBottom: '16px' }}
                    >
                      <div
                        className="search-section-header"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>📈 Frequently Searched</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--muted)',
                              fontWeight: 500,
                              textTransform: 'none',
                              letterSpacing: 'normal',
                            }}
                          >
                            Top tools &amp; guides by session activity
                          </span>
                          {Object.values(frequentRecords).some((r) => r.sessionHits > 0) && (
                            <button
                              type="button"
                              onClick={resetFrequentHistory}
                              style={{
                                background: 'transparent',
                                border: 0,
                                color: 'var(--muted)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                              title="Reset session frequency ranking"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                          gap: '8px',
                          padding: '4px 12px 6px',
                        }}
                      >
                        {frequentlySearchedItems.map((freqItem) => (
                          <button
                            key={freqItem.url}
                            type="button"
                            onClick={() => {
                              recordFrequentItemVisit(freqItem);
                              handleClose();
                              if (onNavigated) onNavigated();
                              navigate(freqItem.url);
                            }}
                            title={`Jump to ${freqItem.title} — ${freqItem.summary}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '4px',
                              padding: '9px 12px',
                              borderRadius: '10px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg)',
                              color: 'var(--text)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s ease, transform 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                gap: '6px',
                              }}
                            >
                              <span
                                className={`search-category-pill ${getCategoryBadgeClass(
                                  freqItem.category
                                )}`}
                                style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                              >
                                {freqItem.category === 'tool' ? '🛠️ Tool' : '📘 Guide'}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color:
                                    freqItem.sessionHits > 0 ? 'var(--accent)' : 'var(--muted)',
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  background: 'rgba(128, 128, 128, 0.12)',
                                }}
                              >
                                {freqItem.sessionHits > 0
                                  ? `${freqItem.sessionHits}× this session`
                                  : freqItem.badge}
                              </span>
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: 'var(--text-heading)',
                                lineHeight: 1.3,
                              }}
                            >
                              {freqItem.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.73rem',
                                color: 'var(--muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%',
                              }}
                            >
                              {freqItem.summary}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!query.trim() && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="search-section-header">
                        <span>🔥 Popular Searches</span>
                      </div>
                      <div
                        className="search-suggestion-chips"
                        style={{
                          padding: '4px 12px 6px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                        role="group"
                        aria-label="Popular Searches"
                      >
                        {POPULAR_SEARCH_CATEGORIES.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className="search-suggestion-chip"
                            onClick={() => {
                              recordFrequentItemVisit({
                                url: item.url,
                                title: item.query,
                                summary: item.description,
                                category: item.url.startsWith('/guides') ? 'guide' : 'tool',
                                badge: item.badge,
                              });
                              handleClose();
                              if (onNavigated) onNavigated();
                              navigate(item.url);
                            }}
                            title={`${item.label} — ${item.description}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{item.label}</span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                opacity: 0.75,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(128, 128, 128, 0.15)',
                              }}
                            >
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!query.trim() && (
                    <div className="search-section-header">
                      <span>✨ Recommended Tools, Field Guides &amp; Blog Posts</span>
                    </div>
                  )}

                  <ul
                    id="search-results-list"
                    ref={listRef}
                    className="search-results-list"
                    role="listbox"
                    aria-label="Search results"
                  >
                    {displayedItems.map((item, index) => {
                      const globalIndex = shortcutOffset + index;
                      const isSelected = globalIndex === selectedIndex;
                      const badgeClass = getCategoryBadgeClass(item.category);
                      const badgeLabel = getCategoryLabel(item.category);

                      return (
                        <li
                          id={`command-palette-result-option-${index}`}
                          key={item.url + index}
                          role="option"
                          aria-selected={isSelected}
                          aria-posinset={globalIndex + 1}
                          aria-setsize={navigableTargets.length}
                          className={`search-result-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => navigateToResult(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="search-result-main">
                            <div className="search-result-header">
                              <span className={`search-category-pill ${badgeClass}`}>
                                {badgeLabel}
                              </span>
                              <span className="search-result-title">
                                {highlightMatch(item.title, query)}
                              </span>
                              <span className="search-result-url">{item.url}</span>
                            </div>
                            <p className="search-result-summary">
                              {highlightMatch(item.summary, query)}
                            </p>
                          </div>
                          <div className="search-result-enter-hint" aria-hidden="true">
                            <kbd className="search-footer-kbd command-palette-kbd">↵</kbd>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer with Accessible ARIA Roles and Interactive Keyboard Hints (<kbd>) */}
            <footer
              id="command-palette-footer-shortcuts"
              className="search-modal-footer command-palette-footer"
              role="contentinfo"
              aria-label="Command palette keyboard navigation and shortcut hints"
            >
              <div
                className="search-footer-hints command-palette-footer-hints"
                role="toolbar"
                aria-label="Search navigation keyboard shortcuts"
              >
                {/* Search Trigger Hint */}
                <span
                  className={`search-footer-hint command-palette-hint ${
                    activeKeyHint === 'search' ? 'is-active' : ''
                  }`}
                  role="group"
                  aria-label="Search trigger shortcut: Press Command K or forward slash to search"
                >
                  Press{' '}
                  <kbd
                    className={`search-footer-kbd command-palette-kbd ${
                      activeKeyHint === 'search' ? 'is-active' : ''
                    }`}
                    role="term"
                    aria-label="Command K or Control K"
                    aria-keyshortcuts="Meta+K Control+K"
                    data-active={activeKeyHint === 'search'}
                  >
                    ⌘K
                  </kbd>{' '}
                  or{' '}
                  <kbd
                    className={`search-footer-kbd command-palette-kbd ${
                      activeKeyHint === 'search' ? 'is-active' : ''
                    }`}
                    role="term"
                    aria-label="Forward slash"
                    aria-keyshortcuts="/"
                    data-active={activeKeyHint === 'search'}
                  >
                    /
                  </kbd>{' '}
                  to search
                </span>

                {/* Up / Down Item Navigation Hint */}
                <span
                  className={`search-footer-hint command-palette-hint ${
                    activeKeyHint === 'up' || activeKeyHint === 'down' ? 'is-active' : ''
                  }`}
                  role="group"
                  aria-label="Vertical result navigation: Up arrow and Down arrow keys to navigate"
                >
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'up' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Previous item (Up arrow)"
                    aria-keyshortcuts="ArrowUp"
                    data-active={activeKeyHint === 'up'}
                    title="Select previous item (↑)"
                    onClick={() => {
                      moveSelection({ type: 'step', delta: -1 }, 'up');
                      inputRef.current?.focus();
                    }}
                  >
                    ↑
                  </kbd>
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'down' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Next item (Down arrow)"
                    aria-keyshortcuts="ArrowDown"
                    data-active={activeKeyHint === 'down'}
                    title="Select next item (↓)"
                    onClick={() => {
                      moveSelection({ type: 'step', delta: 1 }, 'down');
                      inputRef.current?.focus();
                    }}
                  >
                    ↓
                  </kbd>{' '}
                  to navigate
                </span>

                {/* Fast Jump (Home / End / PageUp / PageDown) & Category Filter Hint */}
                <span
                  className={`search-footer-hint command-palette-hint ${
                    activeKeyHint === 'jump' || activeKeyHint === 'category' ? 'is-active' : ''
                  }`}
                  role="group"
                  aria-label="Advanced navigation: Home, End, PageUp, PageDown to jump, or Alt plus Left and Right arrows to switch categories"
                >
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'jump' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Jump to first or last item (Home or End)"
                    aria-keyshortcuts="Home End PageUp PageDown"
                    data-active={activeKeyHint === 'jump'}
                    title="Jump to first/last item (Home / End / PgUp / PgDn)"
                    onClick={() => {
                      if (selectedIndex === 0 && navigableTargets.length > 1) {
                        moveSelection({ type: 'last' }, 'jump');
                      } else {
                        moveSelection({ type: 'first' }, 'jump');
                      }
                      inputRef.current?.focus();
                    }}
                  >
                    Home/End
                  </kbd>
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'category' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Cycle category tabs (Alt plus Left or Right arrow)"
                    aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                    data-active={activeKeyHint === 'category'}
                    title="Cycle search category filter (Alt+← / Alt+→)"
                    onClick={() => {
                      cycleCategory(1);
                      inputRef.current?.focus();
                    }}
                  >
                    Alt+←/→
                  </kbd>{' '}
                  to filter
                </span>

                {/* Enter Selection Hint */}
                <span
                  className={`search-footer-hint command-palette-hint ${
                    activeKeyHint === 'select' ? 'is-active' : ''
                  }`}
                  role="group"
                  aria-label="Selection shortcut: Press Enter to open selected result"
                >
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'select' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Select highlighted item (Enter)"
                    aria-keyshortcuts="Enter"
                    data-active={activeKeyHint === 'select'}
                    title="Open selected item (Enter)"
                    onClick={() => activateSelectedTarget()}
                  >
                    ↵
                  </kbd>{' '}
                  to select
                </span>

                {/* Escape Close Hint */}
                <span
                  className={`search-footer-hint command-palette-hint ${
                    activeKeyHint === 'close' ? 'is-active' : ''
                  }`}
                  role="group"
                  aria-label="Close modal shortcut: Press Escape to close search"
                >
                  <kbd
                    className={`search-footer-kbd command-palette-kbd is-interactive ${
                      activeKeyHint === 'close' ? 'is-active' : ''
                    }`}
                    role="button"
                    tabIndex={-1}
                    aria-label="Close command palette (Escape)"
                    aria-keyshortcuts="Escape"
                    data-active={activeKeyHint === 'close'}
                    title="Close modal (ESC)"
                    onClick={handleClose}
                  >
                    ESC
                  </kbd>{' '}
                  to close
                </span>
              </div>

              <div
                className="search-footer-powered command-palette-footer-actions"
                role="group"
                aria-label="Navigation position and full shortcuts cheatsheet"
              >
                {navigableTargets.length > 0 && (
                  <span
                    className="command-palette-nav-counter"
                    role="status"
                    aria-live="off"
                    aria-label={`Item ${selectedIndex + 1} of ${navigableTargets.length} selected`}
                    title={`Highlighted item ${selectedIndex + 1} of ${navigableTargets.length}`}
                  >
                    {selectedIndex + 1}/{navigableTargets.length}
                  </span>
                )}
                <button
                  type="button"
                  className="command-palette-shortcuts-trigger"
                  onClick={handleOpenShortcutModal}
                  title="Open keyboard shortcuts cheatsheet modal (Shift + ?)"
                  aria-label="Press question mark for all keyboard shortcuts"
                  aria-haspopup="dialog"
                  aria-keyshortcuts="Shift+?"
                >
                  <span
                    className={`search-footer-hint command-palette-hint ${
                      activeKeyHint === 'shortcuts' ? 'is-active' : ''
                    }`}
                  >
                    Press{' '}
                    <kbd
                      className={`search-footer-kbd command-palette-kbd ${
                        activeKeyHint === 'shortcuts' ? 'is-active' : ''
                      }`}
                      role="term"
                      aria-label="Question mark"
                      aria-keyshortcuts="Shift+?"
                      data-active={activeKeyHint === 'shortcuts'}
                    >
                      ?
                    </kbd>{' '}
                    for all shortcuts
                  </span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandPalette;

