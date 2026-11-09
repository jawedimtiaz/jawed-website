import React, { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  KeyboardShortcutContext,
  ShortcutItem,
  VoiceCommandMatch,
  LastVoiceCommandRecord,
  ShortcutConflictToastRecord,
  checkShortcutConflict,
  matchHotkey,
} from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutModal } from './KeyboardShortcutModal';
import {
  GlobalMoneyManagerQuickModal,
  MONEY_MANAGER_NEW_TX_SHORTCUT_COMBO,
  MONEY_MANAGER_NEW_TX_SHORTCUT_ID,
  triggerMoneyManagerTransactionModal,
} from './money-manager/TransactionModal';

interface KeyboardShortcutManagerProps {
  children: ReactNode;
}

export interface VoiceCommandRule {
  id: string;
  route?: string;
  label: string;
  shortcutCombo: string;
  phrases: string[];
}

export const VOICE_COMMAND_RULES: VoiceCommandRule[] = [
  {
    id: 'nav-home',
    route: '/',
    label: 'Go to Home',
    shortcutCombo: 'g+h',
    phrases: [
      'go home',
      'open home',
      'go to home',
      'navigate home',
      'navigate to home',
      'return home',
      'home page',
      'home',
    ],
  },
  {
    id: 'nav-tools',
    route: '/tools',
    label: 'Go to Tools',
    shortcutCombo: 'g+t',
    phrases: [
      'open tools',
      'go tools',
      'go to tools',
      'navigate to tools',
      'navigate tools',
      'show tools',
      'launch tools',
      'tools page',
      'tools',
    ],
  },
  {
    id: 'nav-guides',
    route: '/guides',
    label: 'Go to Guides',
    shortcutCombo: 'g+g',
    phrases: [
      'open guides',
      'go guides',
      'go to guides',
      'navigate to guides',
      'navigate guides',
      'show guides',
      'guides page',
      'guides',
    ],
  },
  {
    id: 'nav-services',
    route: '/services',
    label: 'Go to Services',
    shortcutCombo: 'alt+s',
    phrases: [
      'open services',
      'go services',
      'go to services',
      'navigate to services',
      'navigate services',
      'show services',
      'services page',
      'services',
    ],
  },
  {
    id: 'nav-contact',
    route: '/contact',
    label: 'Go to Contact Page',
    shortcutCombo: 'alt+c',
    phrases: [
      'open contact',
      'go contact',
      'go to contact',
      'navigate to contact',
      'navigate contact',
      'contact support',
      'show contact',
      'contact page',
      'contact',
    ],
  },
  {
    id: 'search-modal',
    label: 'Open Search',
    shortcutCombo: 'mod+k',
    phrases: [
      'open search',
      'focus search',
      'open command palette',
      'command palette',
      'search',
    ],
  },
  {
    id: 'toggle-theme',
    label: 'Toggle Theme (Dark / Light)',
    shortcutCombo: 't',
    phrases: [
      'toggle theme',
      'switch theme',
      'change theme',
      'dark mode',
      'light mode',
    ],
  },
  {
    id: 'shortcuts-help',
    label: 'Keyboard Shortcuts',
    shortcutCombo: 'shift+?',
    phrases: [
      'open shortcuts',
      'show shortcuts',
      'keyboard shortcuts',
      'shortcuts help',
      'open help',
    ],
  },
  {
    id: 'ai-widget',
    label: 'Toggle AI Assistant',
    shortcutCombo: 'alt+a',
    phrases: [
      'open ai',
      'toggle ai',
      'ai assistant',
      'open assistant',
    ],
  },
  {
    id: 'ai-prompt-builder',
    route: '/tools/ai-prompt-builder',
    label: 'AI Prompt Builder',
    shortcutCombo: 'alt+p',
    phrases: [
      'open prompt builder',
      'go to prompt builder',
      'ai prompt builder',
      'prompt builder',
      'open prompts',
    ],
  },
  {
    id: 'it-troubleshooting-assistant',
    route: '/tools/it-troubleshooting-assistant',
    label: 'IT Troubleshooting Assistant',
    shortcutCombo: 'alt+t',
    phrases: [
      'open troubleshooting assistant',
      'open it troubleshooter',
      'troubleshooting assistant',
      'it troubleshooter',
      'ai troubleshooter',
      'troubleshooter',
    ],
  },
  {
    id: 'ai-audio-transcriber',
    route: '/tools/ai-audio-transcriber',
    label: 'AI Audio Transcriber',
    shortcutCombo: 'alt+r',
    phrases: [
      'open audio transcriber',
      'go to audio transcriber',
      'ai audio transcriber',
      'audio transcriber',
      'transcriber',
      'voice recorder',
    ],
  },
  {
    id: 'close-modals',
    label: 'Close Active Modals',
    shortcutCombo: 'esc',
    phrases: [
      'close modal',
      'close modals',
      'close dialog',
      'dismiss',
      'close',
    ],
  },
  {
    id: MONEY_MANAGER_NEW_TX_SHORTCUT_ID,
    label: 'New Money Manager Transaction',
    shortcutCombo: MONEY_MANAGER_NEW_TX_SHORTCUT_COMBO,
    phrases: [
      'new transaction',
      'add transaction',
      'new money manager transaction',
      'open transaction modal',
      'log expense',
      'log income',
    ],
  },
];

export function normalizeVoiceTranscript(transcript: string): string {
  return String(transcript || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractVoiceTranscript(eventOrData: unknown): string {
  if (!eventOrData) return '';
  if (typeof eventOrData === 'string') {
    return eventOrData;
  }

  const evt = eventOrData as Record<string, any>;

  if (typeof evt.transcript === 'string') {
    return evt.transcript;
  }
  if (typeof evt.command === 'string') {
    return evt.command;
  }
  if (typeof evt.phrase === 'string') {
    return evt.phrase;
  }
  if (evt.detail) {
    if (typeof evt.detail === 'string') {
      return evt.detail;
    }
    if (typeof evt.detail.transcript === 'string') {
      return evt.detail.transcript;
    }
    if (typeof evt.detail.command === 'string') {
      return evt.detail.command;
    }
    if (typeof evt.detail.phrase === 'string') {
      return evt.detail.phrase;
    }
  }

  const results = evt.results;
  if (results && typeof results.length === 'number' && results.length > 0) {
    const startIdx = typeof evt.resultIndex === 'number' ? evt.resultIndex : results.length - 1;
    const collected: string[] = [];
    for (let i = startIdx; i < results.length; i++) {
      const resultItem = results[i];
      if (!resultItem) continue;
      if (typeof resultItem.transcript === 'string') {
        collected.push(resultItem.transcript);
        continue;
      }
      const firstAlt = resultItem[0] ?? (typeof resultItem.item === 'function' ? resultItem.item(0) : null);
      if (firstAlt && typeof firstAlt.transcript === 'string') {
        collected.push(firstAlt.transcript);
      }
    }
    if (collected.length > 0) {
      return collected.join(' ').trim();
    }
  }

  return '';
}

export function matchVoiceCommand(transcript: string): VoiceCommandMatch | null {
  const normalized = normalizeVoiceTranscript(transcript);
  if (!normalized) return null;

  // 1. Exact phrase match first (prefer multi-word phrases over single-word fallbacks)
  for (const rule of VOICE_COMMAND_RULES) {
    for (const phrase of rule.phrases) {
      const normPhrase = normalizeVoiceTranscript(phrase);
      if (normalized === normPhrase) {
        return {
          ...rule,
          matchedPhrase: phrase,
          transcript: transcript.trim(),
        };
      }
    }
  }

  // 2. Word-boundary substring match for multi-word phrases (longest phrase first)
  const candidates: Array<{ rule: VoiceCommandRule; phrase: string; normPhrase: string }> = [];
  for (const rule of VOICE_COMMAND_RULES) {
    for (const phrase of rule.phrases) {
      const normPhrase = normalizeVoiceTranscript(phrase);
      if (normPhrase.includes(' ')) {
        candidates.push({ rule, phrase, normPhrase });
      }
    }
  }
  candidates.sort((a, b) => b.normPhrase.length - a.normPhrase.length);

  for (const { rule, phrase, normPhrase } of candidates) {
    const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryRegex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i');
    if (boundaryRegex.test(normalized)) {
      return {
        ...rule,
        matchedPhrase: phrase,
        transcript: transcript.trim(),
      };
    }
  }

  return null;
}

function getSpeechRecognitionConstructor(): any {
  if (typeof window === 'undefined') return null;
  const win = window as Record<string, any>;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

const FOCUSABLE_MODAL_SELECTOR =
  'button:not([disabled]):not([data-focus-guard]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-focus-guard])';

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({ children }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<{
    id: string;
    label: string;
    timestamp: number;
  } | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState<boolean>(() =>
    Boolean(getSpeechRecognitionConstructor())
  );
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<LastVoiceCommandRecord | null>(null);

  // Dynamic tool-specific shortcuts registered by active tool pages/components
  const [toolShortcuts, setToolShortcuts] = useState<ShortcutItem[]>([]);
  // Warning notification record displayed when a tool shortcut conflicts with global/system shortcuts
  const [conflictWarning, setConflictWarning] = useState<ShortcutConflictToastRecord | null>(null);

  // Auto-dismiss conflict warning toast after 6 seconds
  useEffect(() => {
    if (!conflictWarning) return;
    const timer = setTimeout(() => {
      setConflictWarning(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [conflictWarning]);

  const dismissConflictWarning = useCallback(() => {
    setConflictWarning(null);
  }, []);

  const activePrefixRef = useRef<string | null>(null);
  const prefixTimeoutRef = useRef<number | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const appWrapperRef = useRef<HTMLDivElement | null>(null);
  const modalWrapperRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const clearPrefix = useCallback(() => {
    if (prefixTimeoutRef.current !== null) {
      window.clearTimeout(prefixTimeoutRef.current);
      prefixTimeoutRef.current = null;
    }
    activePrefixRef.current = null;
    setActivePrefix(null);
  }, []);

  const activatePrefix = useCallback((prefix: string) => {
    if (prefixTimeoutRef.current !== null) {
      window.clearTimeout(prefixTimeoutRef.current);
    }
    activePrefixRef.current = prefix;
    setActivePrefix(prefix);
    setLastTriggeredAction(null);
    prefixTimeoutRef.current = window.setTimeout(() => {
      activePrefixRef.current = null;
      setActivePrefix(null);
      prefixTimeoutRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (prefixTimeoutRef.current !== null) {
        window.clearTimeout(prefixTimeoutRef.current);
      }
    };
  }, []);

  const captureActiveElementBeforeOpen = useCallback((explicitTrigger?: HTMLElement | null) => {
    if (explicitTrigger && explicitTrigger !== document.body) {
      previousFocusRef.current = explicitTrigger;
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !modalWrapperRef.current?.contains(active)
    ) {
      previousFocusRef.current = active;
    }
  }, []);

  const restorePreviousFocus = useCallback(() => {
    const target = previousFocusRef.current;
    if (target && typeof target.focus === 'function') {
      if (document.body.contains(target)) {
        target.focus();
      }
      window.requestAnimationFrame(() => {
        if (document.body.contains(target)) {
          target.focus();
        } else {
          const fallbackTrigger = document.querySelector<HTMLElement>(
            '[data-shortcuts-trigger="true"]'
          );
          fallbackTrigger?.focus();
        }
      });
    }
  }, []);

  const openHelpModal = useCallback(() => {
    captureActiveElementBeforeOpen();
    setIsHelpModalOpen(true);
  }, [captureActiveElementBeforeOpen]);

  const closeHelpModal = useCallback(() => {
    setIsHelpModalOpen(false);
    restorePreviousFocus();
  }, [restorePreviousFocus]);

  const toggleHelpModal = useCallback(() => {
    setIsHelpModalOpen((prev) => {
      if (!prev) {
        captureActiveElementBeforeOpen();
        return true;
      }
      restorePreviousFocus();
      return false;
    });
  }, [captureActiveElementBeforeOpen, restorePreviousFocus]);

  // Enforce WCAG modal focus trapping and background aria-hidden while the cheatsheet modal is open
  useEffect(() => {
    const appContentEl = appWrapperRef.current;
    if (!isHelpModalOpen) {
      if (appContentEl) {
        appContentEl.removeAttribute('aria-hidden');
      }
      return;
    }

    if (appContentEl) {
      appContentEl.setAttribute('aria-hidden', 'true');
    }

    const handleModalFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalWrapperRef.current) return;

      const focusableElements = Array.from(
        modalWrapperRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_MODAL_SELECTOR)
      ).filter((el) => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeElement === firstElement || !modalWrapperRef.current.contains(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement || !modalWrapperRef.current.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleModalFocusTrap, true);
    return () => {
      window.removeEventListener('keydown', handleModalFocusTrap, true);
      if (appContentEl) {
        appContentEl.removeAttribute('aria-hidden');
      }
    };
  }, [isHelpModalOpen]);

  const triggerToastNotification = useCallback((id: string, label: string) => {
    setLastTriggeredAction({ id, label, timestamp: Date.now() });
  }, []);

  // Auto-hide toast notification after 2 seconds
  useEffect(() => {
    if (!lastTriggeredAction) return;
    const timer = setTimeout(() => {
      setLastTriggeredAction(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [lastTriggeredAction]);

  // Actions
  const handleToggleSearchModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-search-modal'));
    triggerToastNotification('search', 'Global Search Command Palette (Ctrl+K)');
  }, [triggerToastNotification]);

  const handleFocusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-search-modal'));
    triggerToastNotification('search-focus', 'Focus Search Bar (/)');
  }, [triggerToastNotification]);

  const handleToggleAiWidget = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-ai-widget'));
    triggerToastNotification('ai-widget', 'Jawed AI Assistant Widget (Alt+A)');
  }, [triggerToastNotification]);

  const handleToggleTheme = useCallback(() => {
    let currentMode: 'system' | 'light' | 'dark' = 'system';
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        currentMode = saved as 'system' | 'light' | 'dark';
      }
    } catch {}

    const cycle: Record<'system' | 'light' | 'dark', 'system' | 'light' | 'dark'> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    const nextMode = cycle[currentMode] || 'light';

    const getSystem = () =>
      window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const resolved = nextMode === 'system' ? getSystem() : nextMode;

    const doc = document.documentElement;
    doc.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      doc.classList.add('dark');
      doc.classList.remove('light');
    } else {
      doc.classList.add('light');
      doc.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', nextMode);
    } catch {}

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextMode } }));
    const label =
      nextMode === 'system'
        ? `SYSTEM (${resolved.toUpperCase()})`
        : nextMode.toUpperCase();
    triggerToastNotification('theme', `Theme: ${label} (T)`);
  }, [triggerToastNotification]);

  const handleCloseAll = useCallback(() => {
    if (isHelpModalOpen) {
      closeHelpModal();
      triggerToastNotification('esc', 'Closed Shortcuts Dialog (Esc)');
      return;
    }
    window.dispatchEvent(new CustomEvent('close-all-modals'));
  }, [isHelpModalOpen, closeHelpModal, triggerToastNotification]);

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    navigate('/');
    triggerToastNotification('nav-home', 'Go to Home (G + H)');
  }, [navigate, triggerToastNotification]);

  const handleGoGuides = useCallback(() => {
    navigate('/guides');
    triggerToastNotification('nav-guides', 'Go to Guides (G + G)');
  }, [navigate, triggerToastNotification]);

  const handleGoTools = useCallback(() => {
    navigate('/tools');
    triggerToastNotification('nav-tools', 'Go to Tools (G + T)');
  }, [navigate, triggerToastNotification]);

  const handleGoServices = useCallback(() => {
    navigate('/services');
    triggerToastNotification('nav-services', 'Go to Services (Alt+S)');
  }, [navigate, triggerToastNotification]);

  const handleGoContact = useCallback(() => {
    navigate('/contact');
    triggerToastNotification('nav-contact', 'Go to Contact Page (Alt+C)');
  }, [navigate, triggerToastNotification]);

  const handleGoNotes = useCallback(() => {
    navigate('/notes');
    triggerToastNotification('nav-notes', 'Go to Notes & Docs (G + N)');
  }, [navigate, triggerToastNotification]);

  const handleGoBlog = useCallback(() => {
    navigate('/blog');
    triggerToastNotification('nav-blog', 'Go to Blog (G + B)');
  }, [navigate, triggerToastNotification]);

  const handleGoWork = useCallback(() => {
    navigate('/work');
    triggerToastNotification('nav-work', 'Go to Work & Case Studies (G + W)');
  }, [navigate, triggerToastNotification]);

  const handleGoAbout = useCallback(() => {
    navigate('/about');
    triggerToastNotification('nav-about', 'Go to About (G + A)');
  }, [navigate, triggerToastNotification]);

  const handleGoTopics = useCallback(() => {
    navigate('/topics');
    triggerToastNotification('nav-topics', 'Go to Topics Index (G + O)');
  }, [navigate, triggerToastNotification]);

  const handleGoResources = useCallback(() => {
    navigate('/resources');
    triggerToastNotification('nav-resources', 'Go to Resources Library (G + R)');
  }, [navigate, triggerToastNotification]);

  const handleOpenMoneyManagerTransactionModal = useCallback(() => {
    triggerMoneyManagerTransactionModal({ source: 'alt+n' });
    triggerToastNotification(
      MONEY_MANAGER_NEW_TX_SHORTCUT_ID,
      'Money Manager: New Transaction (Alt+N)'
    );
  }, [triggerToastNotification]);

  const handleGoAiPromptBuilder = useCallback(() => {
    navigate('/tools/ai-prompt-builder');
    triggerToastNotification('ai-prompt-builder', 'AI Prompt Builder (Alt+P)');
  }, [navigate, triggerToastNotification]);

  const handleGoAiTroubleshooter = useCallback(() => {
    navigate('/tools/it-troubleshooting-assistant');
    triggerToastNotification('it-troubleshooter', 'IT Troubleshooting Assistant (Alt+T)');
  }, [navigate, triggerToastNotification]);

  const handleGoAiTranscriber = useCallback(() => {
    navigate('/tools/ai-audio-transcriber');
    triggerToastNotification('ai-audio-transcriber', 'AI Audio Transcriber (Alt+R)');
  }, [navigate, triggerToastNotification]);

  // List of active global default shortcuts
  const defaultShortcuts: ShortcutItem[] = useMemo(
    () => [
      {
        id: 'nav-home',
        combo: 'g+h',
        label: 'Go to Home',
        description: 'G + H -> Go to Home',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoHome,
      },
      {
        id: 'nav-tools',
        combo: 'g+t',
        label: 'Go to Tools',
        description: 'G + T -> Go to Tools',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoTools,
      },
      {
        id: 'nav-guides',
        combo: 'g+g',
        label: 'Go to Guides',
        description: 'G + G -> Go to Guides',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoGuides,
      },
      {
        id: 'nav-notes',
        combo: 'g+n',
        label: 'Go to Notes & Documentation',
        description: 'G + N -> Field triage notes & documentation',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoNotes,
      },
      {
        id: 'nav-blog',
        combo: 'g+b',
        label: 'Go to Blog',
        description: 'G + B -> Technical engineering articles',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoBlog,
      },
      {
        id: 'nav-work',
        combo: 'g+w',
        label: 'Go to Work & Case Studies',
        description: 'G + W -> Enterprise deployments & case studies',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoWork,
      },
      {
        id: 'nav-about',
        combo: 'g+a',
        label: 'Go to About Jawed',
        description: 'G + A -> Professional bio & verified credentials',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoAbout,
      },
      {
        id: 'nav-topics',
        combo: 'g+o',
        label: 'Go to Topics Index',
        description: 'G + O -> IT infrastructure & networking topics',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoTopics,
      },
      {
        id: 'nav-resources',
        combo: 'g+r',
        label: 'Go to Resources Library',
        description: 'G + R -> Downloadable cheatsheets & templates',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoResources,
      },
      {
        id: 'search-modal',
        combo: 'mod+k',
        label: 'Open Search',
        description: '⌘ + K -> Open Search & Command Palette',
        category: 'Search & Modals',
        allowInInput: true,
        action: handleToggleSearchModal,
      },
      {
        id: 'toggle-theme',
        combo: 't',
        label: 'Toggle Theme (Dark / Light)',
        description: 'T -> Toggle Theme (Dark / Light)',
        category: 'Global Controls',
        allowInInput: false,
        action: handleToggleTheme,
      },
      {
        id: 'focus-search',
        combo: '/',
        label: 'Focus Search Input',
        description: 'Press / to quickly open search modal from anywhere',
        category: 'Search & Modals',
        allowInInput: false,
        action: handleFocusSearch,
      },
      {
        id: 'shortcuts-help',
        combo: 'shift+?',
        label: 'Keyboard Shortcuts',
        description: 'Open keyboard shortcuts cheatsheet modal (Shift + ? or ?)',
        category: 'Search & Modals',
        allowInInput: false,
        action: toggleHelpModal,
      },
      {
        id: 'close-modals',
        combo: 'esc',
        label: 'Close Active Modals',
        description: 'Dismiss open search modal, AI widget, or dialogs',
        category: 'Search & Modals',
        allowInInput: true,
        action: handleCloseAll,
      },
      {
        id: 'ai-widget',
        combo: 'alt+a',
        label: 'Toggle Jawed AI Assistant',
        description: 'Open or minimize Jawed AI troubleshooting widget (Alt+A)',
        category: 'AI Tools & Assistant',
        allowInInput: true,
        action: handleToggleAiWidget,
      },
      {
        id: 'ai-prompt-builder',
        combo: 'alt+p',
        label: 'AI Prompt Builder',
        description: 'Alt + P -> Open AI system prompt & context builder tool',
        category: 'AI Tools & Assistant',
        allowInInput: false,
        action: handleGoAiPromptBuilder,
      },
      {
        id: 'it-troubleshooting-assistant',
        combo: 'alt+t',
        label: 'IT Troubleshooting Assistant',
        description: 'Alt + T -> Open AI-guided IT incident triage & step-by-step diagnostic assistant',
        category: 'AI Tools & Assistant',
        allowInInput: false,
        action: handleGoAiTroubleshooter,
      },
      {
        id: 'ai-audio-transcriber',
        combo: 'alt+r',
        label: 'AI Audio Transcriber',
        description: 'Alt + R -> Open AI audio transcription & voice recording tool',
        category: 'AI Tools & Assistant',
        allowInInput: false,
        action: handleGoAiTranscriber,
      },
      {
        id: 'nav-services',
        combo: 'alt+s',
        label: 'Go to Services',
        description: 'Navigate to IT field services dispatch',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoServices,
      },
      {
        id: 'nav-contact',
        combo: 'alt+c',
        label: 'Go to Contact Page',
        description: 'Navigate to direct contact & support page',
        category: 'Navigation',
        allowInInput: false,
        action: handleGoContact,
      },
      {
        id: MONEY_MANAGER_NEW_TX_SHORTCUT_ID,
        combo: MONEY_MANAGER_NEW_TX_SHORTCUT_COMBO,
        label: 'New Money Manager Transaction',
        description: 'Alt + N -> Directly open Money Manager transaction modal from anywhere in the tool suite',
        category: 'Global Controls',
        allowInInput: true,
        action: handleOpenMoneyManagerTransactionModal,
      },
    ],
    [
      handleGoHome,
      handleGoTools,
      handleGoGuides,
      handleGoNotes,
      handleGoBlog,
      handleGoWork,
      handleGoAbout,
      handleGoTopics,
      handleGoResources,
      handleToggleSearchModal,
      handleToggleTheme,
      handleFocusSearch,
      toggleHelpModal,
      handleCloseAll,
      handleToggleAiWidget,
      handleGoAiPromptBuilder,
      handleGoAiTroubleshooter,
      handleGoAiTranscriber,
      handleGoServices,
      handleGoContact,
      handleOpenMoneyManagerTransactionModal,
    ]
  );

  const unregisterShortcut = useCallback((id: string) => {
    setToolShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const registerShortcut = useCallback(
    (shortcut: ShortcutItem): (() => void) => {
      setToolShortcuts((prev) => {
        // Evaluate conflict against global shortcuts and already registered tool shortcuts (excluding current id)
        const otherShortcuts = [
          ...defaultShortcuts,
          ...prev.filter((s) => s.id !== shortcut.id),
        ];

        const conflictResult = checkShortcutConflict(shortcut, otherShortcuts);

        if (conflictResult.hasConflict) {
          const breakdown = conflictResult.conflicts
            .map((c) => `  - [${c.type.toUpperCase()}] ${c.source}: ${c.reason}`)
            .join('\n');

          // 1. Console warning as requested
          console.warn(
            `[KeyboardShortcutManager] Shortcut conflict detected for "${shortcut.label}" (${shortcut.combo}):\n${breakdown}`
          );

          // 2. Display visual warning toast if not explicitly marked as intentional overrideSystem
          if (!shortcut.overrideSystem && shortcut.combo !== 'mod+s' && shortcut.combo !== 'mod+enter' && shortcut.combo !== 'ctrl+s' && shortcut.combo !== 'ctrl+enter') {
            const conflictToast: ShortcutConflictToastRecord = {
              id: `conflict-${shortcut.id}-${Date.now()}`,
              shortcut,
              conflicts: conflictResult.conflicts,
              timestamp: Date.now(),
            };
            setConflictWarning(conflictToast);
          }

          // 3. Dispatch window event for test automation & integration
          window.dispatchEvent(
            new CustomEvent('shortcut-conflict-detected', {
              detail: {
                shortcut,
                conflicts: conflictResult.conflicts,
                warningMessage: conflictResult.warningMessage,
              },
            })
          );
        }

        const enriched: ShortcutItem = {
          ...shortcut,
          isToolSpecific: shortcut.isToolSpecific ?? true,
          category: shortcut.category || 'Tool Specific',
        };

        const existingIdx = prev.findIndex((s) => s.id === shortcut.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = enriched;
          return next;
        }
        return [...prev, enriched];
      });

      return () => {
        unregisterShortcut(shortcut.id);
      };
    },
    [defaultShortcuts, unregisterShortcut]
  );

  const checkConflict = useCallback(
    (shortcut: ShortcutItem) => {
      const allActive = [...defaultShortcuts, ...toolShortcuts.filter((s) => s.id !== shortcut.id)];
      return checkShortcutConflict(shortcut, allActive);
    },
    [defaultShortcuts, toolShortcuts]
  );

  // Combined active shortcuts list (default globals + registered tool shortcuts)
  const allShortcuts: ShortcutItem[] = useMemo(() => {
    return [...defaultShortcuts, ...toolShortcuts];
  }, [defaultShortcuts, toolShortcuts]);

  const triggerShortcut = useCallback(
    (id: string) => {
      const match = allShortcuts.find((s) => s.id === id);
      if (match) {
        match.action();
      }
    },
    [allShortcuts]
  );

  // Execute a spoken voice command phrase and mirror existing keyboard shortcut navigation/action logic
  const executeVoiceCommand = useCallback(
    (transcript: string): boolean => {
      const matched = matchVoiceCommand(transcript);
      if (!matched) {
        return false;
      }

      clearPrefix();

      const shortcutItem = allShortcuts.find((s) => s.id === matched.id);
      if (shortcutItem) {
        shortcutItem.action();
      } else if (matched.route) {
        navigate(matched.route);
        triggerToastNotification(matched.id, `${matched.label} (Voice: "${matched.matchedPhrase}")`);
      }

      const record: LastVoiceCommandRecord = {
        id: matched.id,
        label: matched.label,
        route: matched.route,
        transcript: matched.transcript,
        matchedPhrase: matched.matchedPhrase,
        timestamp: Date.now(),
      };
      setLastVoiceCommand(record);

      window.dispatchEvent(
        new CustomEvent('voice-command-executed', {
          detail: record,
        })
      );

      return true;
    },
    [clearPrefix, allShortcuts, navigate, triggerToastNotification]
  );

  // Auto-hide lastVoiceCommand badge after 2.5 seconds
  useEffect(() => {
    if (!lastVoiceCommand) return;
    const timer = setTimeout(() => {
      setLastVoiceCommand(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [lastVoiceCommand]);

  const createOrGetRecognitionInstance = useCallback(() => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setIsVoiceSupported(false);
      return null;
    }

    setIsVoiceSupported(true);
    let instance: any = null;
    try {
      instance = new SpeechRecognitionCtor();
    } catch {
      try {
        instance = SpeechRecognitionCtor();
      } catch {
        return null;
      }
    }

    if (!instance) return null;

    try {
      instance.continuous = true;
      instance.interimResults = false;
      instance.lang = 'en-US';
    } catch {
      // Ignore read-only properties in mock implementations
    }

    recognitionRef.current = instance;
    return instance;
  }, []);

  const startVoiceRecognition = useCallback(() => {
    const recognition = createOrGetRecognitionInstance();
    if (!recognition) return;
    try {
      setIsVoiceListening(true);
      if (typeof recognition.start === 'function') {
        recognition.start();
      }
    } catch {
      // Recognition may already be started
      setIsVoiceListening(true);
    }
  }, [createOrGetRecognitionInstance]);

  const stopVoiceRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    setIsVoiceListening(false);
    if (!recognition) return;
    try {
      if (typeof recognition.stop === 'function') {
        recognition.stop();
      } else if (typeof recognition.abort === 'function') {
        recognition.abort();
      }
    } catch {
      // Ignore stop errors if already stopped
    }
  }, []);

  const toggleVoiceRecognition = useCallback(() => {
    if (isVoiceListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }, [isVoiceListening, startVoiceRecognition, stopVoiceRecognition]);

  // Bind Web Speech API recognition and custom voice command events
  useEffect(() => {
    const handledEvents = new WeakSet<object>();

    const handleSpeechResult = (event: any) => {
      if (event && typeof event === 'object') {
        if (handledEvents.has(event)) return;
        handledEvents.add(event);
      }
      const transcript = extractVoiceTranscript(event);
      if (transcript) {
        executeVoiceCommand(transcript);
      }
    };

    const handleCustomVoiceEvent = (evt: Event) => {
      const transcript = extractVoiceTranscript(evt);
      if (transcript) {
        executeVoiceCommand(transcript);
      }
    };

    const handleStartVoiceEvent = () => startVoiceRecognition();
    const handleStopVoiceEvent = () => stopVoiceRecognition();
    const handleToggleVoiceEvent = () => toggleVoiceRecognition();

    window.addEventListener('voice-command', handleCustomVoiceEvent);
    window.addEventListener('speech-command', handleCustomVoiceEvent);
    window.addEventListener('start-voice-commands', handleStartVoiceEvent);
    window.addEventListener('stop-voice-commands', handleStopVoiceEvent);
    window.addEventListener('toggle-voice-commands', handleToggleVoiceEvent);

    const recognition = createOrGetRecognitionInstance();
    if (recognition) {
      const handleStart = () => setIsVoiceListening(true);
      const handleEnd = () => setIsVoiceListening(false);
      const handleError = () => setIsVoiceListening(false);

      recognition.onresult = handleSpeechResult;
      recognition.onstart = handleStart;
      recognition.onend = handleEnd;
      recognition.onerror = handleError;

      if (typeof recognition.addEventListener === 'function') {
        try {
          recognition.addEventListener('result', handleSpeechResult);
          recognition.addEventListener('start', handleStart);
          recognition.addEventListener('end', handleEnd);
          recognition.addEventListener('error', handleError);
        } catch {
          // Ignore if mock addEventListener throws
        }
      }

      try {
        if (typeof recognition.start === 'function') {
          recognition.start();
          setIsVoiceListening(true);
        }
      } catch {
        // Ignore auto-start errors in environments requiring user gesture
      }

      return () => {
        window.removeEventListener('voice-command', handleCustomVoiceEvent);
        window.removeEventListener('speech-command', handleCustomVoiceEvent);
        window.removeEventListener('start-voice-commands', handleStartVoiceEvent);
        window.removeEventListener('stop-voice-commands', handleStopVoiceEvent);
        window.removeEventListener('toggle-voice-commands', handleToggleVoiceEvent);

        if (typeof recognition.removeEventListener === 'function') {
          try {
            recognition.removeEventListener('result', handleSpeechResult);
            recognition.removeEventListener('start', handleStart);
            recognition.removeEventListener('end', handleEnd);
            recognition.removeEventListener('error', handleError);
          } catch {}
        }
        try {
          if (recognition.onresult === handleSpeechResult) {
            recognition.onresult = null;
          }
          if (typeof recognition.stop === 'function') {
            recognition.stop();
          } else if (typeof recognition.abort === 'function') {
            recognition.abort();
          }
        } catch {}
      };
    }

    return () => {
      window.removeEventListener('voice-command', handleCustomVoiceEvent);
      window.removeEventListener('speech-command', handleCustomVoiceEvent);
      window.removeEventListener('start-voice-commands', handleStartVoiceEvent);
      window.removeEventListener('stop-voice-commands', handleStopVoiceEvent);
      window.removeEventListener('toggle-voice-commands', handleToggleVoiceEvent);
    };
  }, [
    createOrGetRecognitionInstance,
    executeVoiceCommand,
    startVoiceRecognition,
    stopVoiceRecognition,
    toggleVoiceRecognition,
  ]);

  // Listen for custom open/toggle events from Footer or Command Palette
  useEffect(() => {
    const handleOpenShortcutsEvent = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ triggerElement?: HTMLElement | null }>;
      captureActiveElementBeforeOpen(customEvt.detail?.triggerElement || null);
      setIsHelpModalOpen(true);
    };
    const handleToggleShortcutsEvent = () => {
      toggleHelpModal();
    };

    window.addEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
    window.addEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    return () => {
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
      window.removeEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    };
  }, [captureActiveElementBeforeOpen, toggleHelpModal]);

  // Helper to determine if the user is actively typing or editing in a form control or rich-text field
  const isUserTypingInEditableField = useCallback((e: KeyboardEvent): boolean => {
    if (e.isComposing || e.keyCode === 229) {
      return true;
    }

    const isElementEditable = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;

      const tagName = el.tagName.toUpperCase();

      if (tagName === 'TEXTAREA') {
        const textarea = el as HTMLTextAreaElement;
        return !textarea.disabled && !textarea.readOnly;
      }

      if (tagName === 'SELECT') {
        const select = el as HTMLSelectElement;
        return !select.disabled;
      }

      if (tagName === 'INPUT') {
        const input = el as HTMLInputElement;
        if (input.disabled || input.readOnly) return false;
        const nonTypingInputTypes = new Set([
          'button',
          'submit',
          'reset',
          'checkbox',
          'radio',
          'range',
          'color',
          'file',
          'image',
          'hidden',
        ]);
        return !nonTypingInputTypes.has((input.type || 'text').toLowerCase());
      }

      if (el.isContentEditable) {
        return true;
      }

      const contentEditableAttr = el.getAttribute('contenteditable');
      if (
        contentEditableAttr === '' ||
        contentEditableAttr === 'true' ||
        contentEditableAttr === 'plaintext-only'
      ) {
        return true;
      }

      const role = el.getAttribute('role')?.toLowerCase();
      if (
        role === 'textbox' ||
        role === 'searchbox' ||
        role === 'combobox' ||
        role === 'spinbutton'
      ) {
        return el.getAttribute('aria-disabled') !== 'true' && el.getAttribute('aria-readonly') !== 'true';
      }

      const editableAncestor = el.closest(
        'textarea:not([disabled]):not([readonly]), input:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"], [role="searchbox"], [role="combobox"]'
      );
      if (editableAncestor && editableAncestor !== el) {
        return isElementEditable(editableAncestor);
      }

      return false;
    };

    if (isElementEditable(e.target) || isElementEditable(document.activeElement)) {
      return true;
    }

    if (typeof e.composedPath === 'function') {
      for (const node of e.composedPath()) {
        if (isElementEditable(node)) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Global Keydown Listener (supports Shift + ?, G prefix for G+H / G+T / G+G chords, T, Cmd/Ctrl+K, Esc, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditable = isUserTypingInEditableField(e);
      const lowerKey = e.key.toLowerCase();

      // Global Shift + ? trigger (also supports '?' or Shift + '/' across keyboard layouts)
      const isShiftQuestionTrigger =
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === '?' || (e.shiftKey && (e.key === '/' || e.code === 'Slash')));

      // Ignore Shift + ? when the user is actively typing in an input, textarea, or editable field
      if (isShiftQuestionTrigger) {
        if (isEditable) {
          return;
        }
        e.preventDefault();
        clearPrefix();
        toggleHelpModal();
        return;
      }

      // If the shortcuts cheatsheet modal is open, Escape closes it and restores focus
      if (isHelpModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          clearPrefix();
          closeHelpModal();
          triggerToastNotification('esc', 'Closed Shortcuts Dialog (Esc)');
        }
        return;
      }

      // Handle active 'G' (Go) prefix chord navigation (G+H -> Home, G+T -> Tools, G+G -> Guides)
      if (activePrefixRef.current === 'g') {
        if (isEditable) {
          clearPrefix();
          return;
        }

        // Ignore bare modifier keys while waiting for the second chord key
        if (['shift', 'control', 'alt', 'meta'].includes(lowerKey)) {
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          clearPrefix();
          return;
        }

        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          if (lowerKey === 'h') {
            e.preventDefault();
            clearPrefix();
            handleGoHome();
            return;
          }
          if (lowerKey === 't') {
            e.preventDefault();
            clearPrefix();
            handleGoTools();
            return;
          }
          if (lowerKey === 'g') {
            e.preventDefault();
            clearPrefix();
            handleGoGuides();
            return;
          }

          const chordShortcut = allShortcuts.find((s) => s.combo === `g+${lowerKey}`);
          if (chordShortcut) {
            e.preventDefault();
            clearPrefix();
            chordShortcut.action();
            return;
          }
        }

        // Unrecognized second key cancels the active prefix
        clearPrefix();
      }

      // Activate 'G' (Go) prefix when 'G' is pressed outside of editable inputs
      if (!isEditable && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && lowerKey === 'g') {
        e.preventDefault();
        activatePrefix('g');
        return;
      }

      for (const s of allShortcuts) {
        if (s.combo.startsWith('g+') || s.id === 'shortcuts-help') continue;
        if (matchHotkey(e, s.combo)) {
          if (isEditable && !s.allowInInput) {
            continue;
          }
          e.preventDefault();
          s.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    allShortcuts,
    isHelpModalOpen,
    isUserTypingInEditableField,
    clearPrefix,
    activatePrefix,
    toggleHelpModal,
    closeHelpModal,
    triggerToastNotification,
    handleGoHome,
    handleGoTools,
    handleGoGuides,
    handleGoNotes,
    handleGoBlog,
    handleGoWork,
    handleGoAbout,
    handleGoTopics,
    handleGoResources,
  ]);

  return (
    <KeyboardShortcutContext.Provider
      value={{
        shortcuts: allShortcuts,
        isHelpModalOpen,
        openHelpModal,
        closeHelpModal,
        toggleHelpModal,
        triggerShortcut,
        lastTriggeredAction,
        activePrefix,
        registerShortcut,
        unregisterShortcut,
        checkConflict,
        conflictWarning,
        dismissConflictWarning,
        isVoiceSupported,
        isVoiceListening,
        startVoiceRecognition,
        stopVoiceRecognition,
        toggleVoiceRecognition,
        executeVoiceCommand,
        lastVoiceCommand,
      }}
    >
      <div ref={appWrapperRef} className="keyboard-shortcut-app-scope">
        {children}
      </div>

      {/* Interactive Keyboard Shortcut Cheat Sheet Modal with Focus Trap & Focus Restoration */}
      <div ref={modalWrapperRef}>
        <KeyboardShortcutModal
          isOpen={isHelpModalOpen}
          onClose={closeHelpModal}
          shortcuts={allShortcuts}
          onTriggerShortcut={triggerShortcut}
          triggerElementRef={previousFocusRef}
          voiceCommands={VOICE_COMMAND_RULES}
          isVoiceSupported={isVoiceSupported}
          isVoiceListening={isVoiceListening}
          onToggleVoice={toggleVoiceRecognition}
        />
      </div>

      {/* Subtle 'Shortcut Active' Indicator (Corner Toast / Footer Host) when Prefix Key (e.g. 'G') is Initiated */}
      {activePrefix && (() => {
        const upperPrefix = activePrefix.toUpperCase();
        const indicatorNode = (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Shortcut active: prefix ${upperPrefix} initiated, listening for secondary key`}
            data-testid="shortcut-prefix-toast"
            data-prefix-key={activePrefix}
            style={{
              position: 'fixed',
              bottom: '74px',
              left: '24px',
              zIndex: 10001,
              background: 'var(--card)',
              border: '1px solid var(--accent)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-heading)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              animation: 'slideUpFade 0.16s ease-out',
              pointerEvents: 'none',
            }}
          >
            {/* Subtle 'Shortcut Active' Badge */}
            <span
              data-testid="shortcut-active-indicator"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: 'var(--accent)',
                fontSize: '0.73rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--emerald, #10b981)',
                  boxShadow: '0 0 8px var(--emerald, #10b981)',
                  display: 'inline-block',
                }}
              />
              <span>Shortcut Active</span>
            </span>

            {/* Initiated Prefix Key & Listening Confirmation */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--accent)',
              }}
            >
              <kbd
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  borderRadius: '5px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                }}
              >
                {upperPrefix}
              </kbd>
              <span>Go to…</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--muted, var(--text-muted))',
                }}
              >
                (Listening for secondary key)
              </span>
            </span>

            {/* Secondary Key Chord Options */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted, var(--text))',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <kbd
                  style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.72rem',
                    color: 'var(--text-heading)',
                  }}
                >
                  H
                </kbd>
                Home
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <kbd
                  style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.72rem',
                    color: 'var(--text-heading)',
                  }}
                >
                  T
                </kbd>
                Tools
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <kbd
                  style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.72rem',
                    color: 'var(--text-heading)',
                  }}
                >
                  G
                </kbd>
                Guides
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                <kbd
                  style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                  }}
                >
                  Esc
                </kbd>
                Cancel
              </span>
            </span>
          </div>
        );

        const footerHost =
          typeof document !== 'undefined'
            ? document.querySelector<HTMLElement>('[data-footer-shortcut-host="true"]')
            : null;

        return footerHost ? createPortal(indicatorNode, footerHost) : indicatorNode;
      })()}

      {/* Floating Hotkey / Voice Command Execution Toast Popup */}
      {lastTriggeredAction && !activePrefix && (
        <div
          role="status"
          aria-live="polite"
          data-testid="shortcut-action-toast"
          style={{
            position: 'fixed',
            bottom: '74px',
            left: '24px',
            zIndex: 10000,
            background: 'var(--card)',
            border: '1px solid var(--accent)',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--text-heading)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideUpFade 0.2s ease-out',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '1rem' }} aria-hidden="true">
            {lastVoiceCommand ? '🎙️' : '⌨️'}
          </span>
          <span>{lastTriggeredAction.label}</span>
          {lastVoiceCommand && (
            <span
              data-testid="voice-command-toast"
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--accent)',
                marginLeft: '4px',
              }}
            >
              Voice: &ldquo;{lastVoiceCommand.transcript}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* Floating Shortcut Conflict Notification Toast */}
      {conflictWarning && (
        <aside
          role="alert"
          aria-live="polite"
          data-testid="shortcut-conflict-toast"
          aria-label="Keyboard Shortcut Conflict Warning"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            maxWidth: '460px',
            zIndex: 10003,
            background: 'var(--card, #1e293b)',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 158, 11, 0.25)',
            animation: 'slideDownFade 0.22s ease-out',
            color: 'var(--text, #f8fafc)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.15rem' }} aria-hidden="true">
                ⚠️
              </span>
              <strong
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#f59e0b',
                  letterSpacing: '0.01em',
                }}
              >
                Shortcut Conflict Detected
              </strong>
            </div>
            <button
              type="button"
              onClick={dismissConflictWarning}
              aria-label="Dismiss shortcut conflict warning"
              data-testid="dismiss-conflict-toast"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted, #94a3b8)',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '1rem',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginTop: '8px',
              fontSize: '0.82rem',
              lineHeight: 1.45,
              color: 'var(--text-heading, #f1f5f9)',
            }}
          >
            <span>
              Tool shortcut <strong>&ldquo;{conflictWarning.shortcut.label}&rdquo;</strong> (
            </span>
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#fbbf24',
              }}
            >
              {conflictWarning.shortcut.combo.toUpperCase()}
            </kbd>
            <span>) conflicts with:</span>
          </div>

          <ul
            style={{
              margin: '8px 0 0',
              paddingLeft: '18px',
              fontSize: '0.76rem',
              color: 'var(--muted, #94a3b8)',
              lineHeight: 1.4,
            }}
          >
            {conflictWarning.conflicts.map((c, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    marginRight: '6px',
                    textTransform: 'uppercase',
                    background:
                      c.type === 'system'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color: c.type === 'system' ? '#f87171' : 'var(--accent, #38bdf8)',
                    border:
                      c.type === 'system'
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {c.type}
                </span>
                <strong style={{ color: 'var(--text-heading, #f1f5f9)' }}>{c.source}</strong>: {c.reason}
              </li>
            ))}
          </ul>
        </aside>
      )}
      {/* Persistent Floating 'Keyboard Shortcuts' Help Button */}
      <button
        type="button"
        className="floating-shortcuts-help-btn"
        data-testid="floating-shortcuts-help-btn"
        onClick={toggleHelpModal}
        aria-haspopup="dialog"
        aria-expanded={isHelpModalOpen}
        aria-keyshortcuts="?"
        aria-label="Keyboard Shortcuts and Accessibility Help (Press '?')"
        title="Keyboard Shortcuts & Accessibility Help (Press '?')"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9998,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '9999px',
          background: 'var(--card, #1e293b)',
          border: '1px solid var(--border, rgba(56, 189, 248, 0.35))',
          color: 'var(--text-heading, #f8fafc)',
          fontSize: '0.8rem',
          fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.28)',
          cursor: 'pointer',
          transition: 'all 0.18s ease-in-out',
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }} aria-hidden="true">
          ⌨️
        </span>
        <span>Shortcuts</span>
        <kbd
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1px 6px',
            borderRadius: '4px',
            background: 'var(--bg, #0f172a)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.18))',
            color: 'var(--accent, #38bdf8)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          ?
        </kbd>
      </button>

      <GlobalMoneyManagerQuickModal currentPathname={location.pathname} />
    </KeyboardShortcutContext.Provider>
  );
};

