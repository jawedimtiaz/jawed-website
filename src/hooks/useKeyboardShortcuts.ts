import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShortcutItem {
  id: string;
  combo: string; // e.g. 'mod+k', 'alt+a', 'esc', 'shift+?', 'alt+t', 'g+h'
  label: string;
  description: string;
  category: 'Search & Modals' | 'AI Assistant' | 'Navigation' | 'Global Controls' | 'Tool Specific' | (string & {});
  allowInInput?: boolean;
  action: () => void;
  toolId?: string;
  isToolSpecific?: boolean;
  overrideSystem?: boolean;
}

export interface VoiceCommandMatch {
  id: string;
  route?: string;
  label: string;
  shortcutCombo: string;
  phrases: string[];
  matchedPhrase: string;
  transcript: string;
}

export interface LastVoiceCommandRecord {
  id: string;
  label: string;
  route?: string;
  transcript: string;
  matchedPhrase: string;
  timestamp: number;
}

export type ShortcutConflictType = 'global' | 'system' | 'tool';

export interface ShortcutConflict {
  type: ShortcutConflictType;
  conflictingCombo: string;
  source: string;
  reason: string;
  severity: 'warning' | 'error';
}

export interface ShortcutConflictResult {
  hasConflict: boolean;
  conflicts: ShortcutConflict[];
  warningMessage?: string;
}

export interface ShortcutConflictToastRecord {
  id: string;
  shortcut: ShortcutItem;
  conflicts: ShortcutConflict[];
  timestamp: number;
}

export interface SystemShortcutRule {
  combo: string;
  label: string;
  category: 'Browser' | 'System' | 'Editing';
  reason: string;
}

/**
 * Standard system and browser-level reserved keyboard shortcuts.
 * Attempting to register tool shortcuts that conflict with these creates severe UX issues or gets intercepted by OS/browser.
 */
export const SYSTEM_RESERVED_SHORTCUTS: SystemShortcutRule[] = [
  // Browser Tab & Window Management
  { combo: 'mod+w', label: 'Close Tab / Window', category: 'Browser', reason: 'Browser reserved hotkey to close the active tab or browser window.' },
  { combo: 'mod+t', label: 'New Tab', category: 'Browser', reason: 'Browser reserved hotkey to open a new browser tab.' },
  { combo: 'mod+shift+t', label: 'Reopen Closed Tab', category: 'Browser', reason: 'Browser reserved hotkey to restore recently closed tabs.' },
  { combo: 'mod+n', label: 'New Window', category: 'Browser', reason: 'Browser reserved hotkey to open a new browser window.' },
  { combo: 'mod+shift+n', label: 'New Incognito/Private Window', category: 'Browser', reason: 'Browser reserved hotkey to open incognito browsing.' },
  { combo: 'mod+q', label: 'Quit Application', category: 'System', reason: 'Operating system shortcut to terminate or quit the browser application.' },

  // Navigation & Reloading
  { combo: 'mod+r', label: 'Reload Page', category: 'Browser', reason: 'Browser reserved hotkey to reload the active web page.' },
  { combo: 'mod+shift+r', label: 'Hard Reload', category: 'Browser', reason: 'Browser reserved hotkey to bypass cache and force reload.' },
  { combo: 'f5', label: 'Refresh Page', category: 'Browser', reason: 'Standard function key to refresh the page.' },
  { combo: 'ctrl+f5', label: 'Hard Refresh Page', category: 'Browser', reason: 'Forces full page reload and cache purge.' },
  { combo: 'mod+l', label: 'Focus Address Bar', category: 'Browser', reason: 'Browser reserved hotkey to focus the URL address bar.' },
  { combo: 'mod+d', label: 'Bookmark Page', category: 'Browser', reason: 'Browser reserved hotkey to bookmark current URL.' },
  { combo: 'alt+left', label: 'History Back', category: 'Browser', reason: 'Browser history back navigation.' },
  { combo: 'alt+right', label: 'History Forward', category: 'Browser', reason: 'Browser history forward navigation.' },

  // System & OS Controls
  { combo: 'alt+f4', label: 'Close Window', category: 'System', reason: 'Operating system hotkey to close current application window.' },
  { combo: 'alt+tab', label: 'Switch Window/App', category: 'System', reason: 'Operating system task switcher.' },
  { combo: 'ctrl+tab', label: 'Next Tab', category: 'Browser', reason: 'Browser reserved hotkey to cycle through open tabs.' },
  { combo: 'ctrl+shift+tab', label: 'Previous Tab', category: 'Browser', reason: 'Browser reserved hotkey to cycle backwards through open tabs.' },
  { combo: 'mod+alt+tab', label: 'Switch Application', category: 'System', reason: 'OS window switcher.' },
  { combo: 'mod+h', label: 'Hide Window (macOS)', category: 'System', reason: 'macOS reserved hotkey to hide the frontmost application.' },
  { combo: 'mod+m', label: 'Minimize Window', category: 'System', reason: 'OS shortcut to minimize current window to dock/taskbar.' },

  // Developer Tools & Source
  { combo: 'f12', label: 'Developer Tools', category: 'Browser', reason: 'Browser standard key to open Developer Tools inspection panel.' },
  { combo: 'mod+shift+i', label: 'Developer Tools (Inspect)', category: 'Browser', reason: 'Browser shortcut to toggle DevTools inspector.' },
  { combo: 'mod+alt+i', label: 'Developer Tools (Inspect Mac)', category: 'Browser', reason: 'Browser shortcut to open DevTools on macOS.' },
  { combo: 'mod+shift+j', label: 'Developer Console', category: 'Browser', reason: 'Browser shortcut to open DevTools JavaScript Console directly.' },
  { combo: 'mod+shift+c', label: 'Inspect Element', category: 'Browser', reason: 'Browser shortcut to activate element inspect tool.' },
  { combo: 'mod+u', label: 'View Page Source', category: 'Browser', reason: 'Browser shortcut to display raw HTML source.' },
  { combo: 'f11', label: 'Toggle Fullscreen', category: 'Browser', reason: 'Browser standard key to toggle window fullscreen.' },

  // Standard Clipboard & Text Operations
  { combo: 'mod+c', label: 'Copy to Clipboard', category: 'Editing', reason: 'Global system clipboard copy operation.' },
  { combo: 'mod+v', label: 'Paste from Clipboard', category: 'Editing', reason: 'Global system clipboard paste operation.' },
  { combo: 'mod+x', label: 'Cut to Clipboard', category: 'Editing', reason: 'Global system clipboard cut operation.' },
  { combo: 'mod+z', label: 'Undo', category: 'Editing', reason: 'Global system undo operation.' },
  { combo: 'mod+shift+z', label: 'Redo', category: 'Editing', reason: 'Global system redo operation.' },
  { combo: 'mod+y', label: 'Redo (Windows)', category: 'Editing', reason: 'Standard redo operation on Windows.' },
  { combo: 'mod+a', label: 'Select All', category: 'Editing', reason: 'Global system select-all operation.' },
  { combo: 'mod+p', label: 'Print Page', category: 'Browser', reason: 'System / browser shortcut to launch the print preview dialog.' },
  { combo: 'mod+s', label: 'Save Webpage', category: 'Browser', reason: 'Browser reserved hotkey to save the current page to disk.' },
  { combo: 'mod+o', label: 'Open File', category: 'Browser', reason: 'Browser shortcut to trigger open local file dialog.' },
  { combo: 'ctrl+alt+del', label: 'System Security / Task Manager', category: 'System', reason: 'Critical operating system security intercept.' },
];

export interface ParsedShortcutCombo {
  isChord: boolean;
  prefixKey?: string;
  secondKey?: string;
  hasCtrl: boolean;
  hasCmd: boolean;
  hasMod: boolean;
  hasAlt: boolean;
  hasShift: boolean;
  key: string;
  normalized: string;
}

export function parseShortcutCombo(combo: string): ParsedShortcutCombo {
  const rawParts = String(combo || '')
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean);

  const isChord =
    rawParts.length === 2 &&
    !rawParts.some((p) =>
      ['ctrl', 'control', 'cmd', 'meta', 'command', 'mod', 'alt', 'option', 'shift'].includes(p)
    );

  if (isChord) {
    const prefix = rawParts[0];
    const second = rawParts[1];
    return {
      isChord: true,
      prefixKey: prefix,
      secondKey: second,
      hasCtrl: false,
      hasCmd: false,
      hasMod: false,
      hasAlt: false,
      hasShift: false,
      key: `${prefix}+${second}`,
      normalized: `${prefix}+${second}`,
    };
  }

  const hasCtrl = rawParts.includes('ctrl') || rawParts.includes('control');
  const hasCmd =
    rawParts.includes('cmd') || rawParts.includes('meta') || rawParts.includes('command');
  const hasMod = rawParts.includes('mod');
  const hasAlt = rawParts.includes('alt') || rawParts.includes('option');
  const hasShift = rawParts.includes('shift');

  const keyPart =
    rawParts.find(
      (p) => !['ctrl', 'control', 'cmd', 'meta', 'command', 'mod', 'alt', 'option', 'shift'].includes(p)
    ) || '';

  let normalizedKey = keyPart;
  if (keyPart === 'escape') normalizedKey = 'esc';
  else if (keyPart === 'spacebar' || keyPart === ' ') normalizedKey = 'space';
  else if (keyPart === 'return') normalizedKey = 'enter';

  const modTokens: string[] = [];
  if (hasMod) modTokens.push('mod');
  if (hasCtrl) modTokens.push('ctrl');
  if (hasCmd) modTokens.push('cmd');
  if (hasAlt) modTokens.push('alt');
  if (hasShift) modTokens.push('shift');

  const normalized = modTokens.length > 0 ? `${modTokens.join('+')}+${normalizedKey}` : normalizedKey;

  return {
    isChord: false,
    hasCtrl,
    hasCmd,
    hasMod,
    hasAlt,
    hasShift,
    key: normalizedKey,
    normalized,
  };
}

export function areShortcutCombosConflicting(comboA: string, comboB: string): boolean {
  if (!comboA || !comboB) return false;
  const a = parseShortcutCombo(comboA);
  const b = parseShortcutCombo(comboB);

  // 1. Both are chords (e.g. g+h vs g+h)
  if (a.isChord && b.isChord) {
    return a.prefixKey === b.prefixKey && a.secondKey === b.secondKey;
  }

  // 2. One chord, one single key (chord prefix collision, e.g. 'g' vs 'g+h')
  if (a.isChord && !b.isChord) {
    if (!b.hasCtrl && !b.hasCmd && !b.hasMod && !b.hasAlt && !b.hasShift) {
      return a.prefixKey === b.key;
    }
    return false;
  }
  if (!a.isChord && b.isChord) {
    if (!a.hasCtrl && !a.hasCmd && !a.hasMod && !a.hasAlt && !a.hasShift) {
      return a.key === b.prefixKey;
    }
    return false;
  }

  // 3. Question mark special case ('?' and 'shift+?' or 'shift+/')
  const isQuestionA = a.key === '?' || (a.hasShift && (a.key === '/' || a.key === '?'));
  const isQuestionB = b.key === '?' || (b.hasShift && (b.key === '/' || b.key === '?'));
  if (isQuestionA && isQuestionB) {
    const altMatch = a.hasAlt === b.hasAlt;
    const primMatch = (a.hasMod || a.hasCtrl || a.hasCmd) === (b.hasMod || b.hasCtrl || b.hasCmd);
    if (altMatch && primMatch) return true;
  }

  // Key match
  if (a.key !== b.key) {
    return false;
  }

  // Alt modifier must match exactly
  if (a.hasAlt !== b.hasAlt) {
    return false;
  }

  // Shift modifier must match exactly (unless handled via question mark)
  if (a.hasShift !== b.hasShift) {
    return false;
  }

  // Primary modifier (mod, ctrl, cmd) matching
  const aHasPrimary = a.hasMod || a.hasCtrl || a.hasCmd;
  const bHasPrimary = b.hasMod || b.hasCtrl || b.hasCmd;

  if (!aHasPrimary && !bHasPrimary) {
    return true; // e.g. both 't' or both 'esc'
  }
  if (!aHasPrimary || !bHasPrimary) {
    return false; // e.g. 't' vs 'mod+t'
  }

  // In cross-platform web apps, 'mod' resolves to Ctrl on Win/Linux and Cmd on Mac.
  // Therefore 'mod' overlaps with 'mod', 'ctrl', and 'cmd'.
  if (a.hasMod || b.hasMod) {
    return true;
  }

  if (a.hasCtrl && b.hasCtrl) return true;
  if (a.hasCmd && b.hasCmd) return true;

  return false;
}

export function checkShortcutConflict(
  newShortcut: ShortcutItem,
  existingShortcuts: ShortcutItem[]
): ShortcutConflictResult {
  const conflicts: ShortcutConflict[] = [];

  // Check 1: System-level / Browser-level reserved shortcuts
  for (const sys of SYSTEM_RESERVED_SHORTCUTS) {
    if (areShortcutCombosConflicting(newShortcut.combo, sys.combo)) {
      conflicts.push({
        type: 'system',
        conflictingCombo: sys.combo,
        source: `System Reserved ("${sys.label}")`,
        reason: sys.reason,
        severity: 'error',
      });
    }
  }

  // Check 2: Global or existing tool-specific shortcuts
  for (const existing of existingShortcuts) {
    if (existing.id === newShortcut.id) {
      continue;
    }
    if (areShortcutCombosConflicting(newShortcut.combo, existing.combo)) {
      conflicts.push({
        type: existing.isToolSpecific ? 'tool' : 'global',
        conflictingCombo: existing.combo,
        source: `${existing.isToolSpecific ? 'Tool' : 'Global'} Shortcut ("${existing.label}")`,
        reason: `Already assigned to ${existing.label} (${existing.combo})${
          existing.description ? ` - ${existing.description}` : ''
        }`,
        severity: 'warning',
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    warningMessage:
      conflicts.length > 0
        ? `Shortcut conflict detected for "${newShortcut.label}" (${newShortcut.combo}): Conflicts with ${conflicts
            .map((c) => c.source)
            .join(', ')}.`
        : undefined,
  };
}

export interface KeyboardShortcutContextType {
  shortcuts: ShortcutItem[];
  isHelpModalOpen: boolean;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  toggleHelpModal: () => void;
  triggerShortcut: (id: string) => void;
  activePrefix: string | null;
  lastTriggeredAction: { id: string; label: string; timestamp: number } | null;

  // Dynamic tool-specific registration & conflict check
  registerShortcut: (shortcut: ShortcutItem) => () => void;
  unregisterShortcut: (id: string) => void;
  checkConflict: (shortcut: ShortcutItem) => ShortcutConflictResult;
  conflictWarning: ShortcutConflictToastRecord | null;
  dismissConflictWarning: () => void;

  // Voice commands
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  startVoiceRecognition?: () => void;
  stopVoiceRecognition?: () => void;
  toggleVoiceRecognition?: () => void;
  executeVoiceCommand?: (transcript: string) => boolean;
  lastVoiceCommand?: LastVoiceCommandRecord | null;
}

export const KeyboardShortcutContext = createContext<KeyboardShortcutContextType>({
  shortcuts: [],
  isHelpModalOpen: false,
  openHelpModal: () => {},
  closeHelpModal: () => {},
  toggleHelpModal: () => {},
  triggerShortcut: () => {},
  activePrefix: null,
  lastTriggeredAction: null,
  registerShortcut: () => () => {},
  unregisterShortcut: () => {},
  checkConflict: () => ({ hasConflict: false, conflicts: [] }),
  conflictWarning: null,
  dismissConflictWarning: () => {},
  isVoiceSupported: false,
  isVoiceListening: false,
  startVoiceRecognition: () => {},
  stopVoiceRecognition: () => {},
  toggleVoiceRecognition: () => {},
  executeVoiceCommand: () => false,
  lastVoiceCommand: null,
});

export const useKeyboardShortcuts = () => useContext(KeyboardShortcutContext);

/**
 * Convenient React hook for tool components to register one or more tool-specific shortcuts
 * with automatic conflict detection, warning logging/toast, and cleanup on unmount.
 */
export function useRegisterShortcut(
  shortcut: ShortcutItem | ShortcutItem[] | null,
  deps: React.DependencyList = []
): void {
  const { registerShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    if (!shortcut) return;
    const items = Array.isArray(shortcut) ? shortcut : [shortcut];
    const cleanups = items.map((item) => registerShortcut(item));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function matchHotkey(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+').map((s) => s.trim());
  const needsCtrl = parts.includes('ctrl') || parts.includes('control');
  const needsCmd = parts.includes('cmd') || parts.includes('meta');
  const needsMod = parts.includes('mod'); // Ctrl on Win/Linux, Cmd on Mac
  const needsAlt = parts.includes('alt') || parts.includes('option');
  const needsShift = parts.includes('shift');

  const isMac = typeof navigator !== 'undefined' && /mac|ipod|iphone|ipad/i.test(navigator.userAgent);

  if (needsMod && !(isMac ? e.metaKey : e.ctrlKey)) return false;
  if (needsCtrl && !e.ctrlKey) return false;
  if (needsCmd && !e.metaKey) return false;
  if (needsAlt && !e.altKey) return false;
  if (needsShift && !e.shiftKey) return false;

  const keyPart = parts.find(
    (p) => !['ctrl', 'control', 'cmd', 'meta', 'mod', 'alt', 'option', 'shift'].includes(p)
  );

  if (!keyPart) return true;

  const actualKey = e.key.toLowerCase();

  if (keyPart === 'esc' || keyPart === 'escape') {
    return actualKey === 'escape';
  }
  if (keyPart === '/') {
    return actualKey === '/';
  }
  if (keyPart === '?') {
    return actualKey === '?' || (e.shiftKey && actualKey === '/');
  }
  if (keyPart === 'space') {
    return actualKey === ' ' || actualKey === 'spacebar';
  }

  return actualKey === keyPart;
}

export const formatComboForDisplay = (combo: string): { keys: string[]; isMac: boolean } => {
  const isMac = typeof navigator !== 'undefined' && /mac|ipod|iphone|ipad/i.test(navigator.userAgent);
  const parts = combo.toLowerCase().split('+').map((s) => s.trim());

  const keys: string[] = [];

  parts.forEach((p) => {
    if (p === 'mod') {
      keys.push('⌘');
    } else if (p === 'ctrl' || p === 'control') {
      keys.push(isMac ? '⌃' : 'Ctrl');
    } else if (p === 'cmd' || p === 'meta' || p === '⌘') {
      keys.push('⌘');
    } else if (p === 'alt' || p === 'option') {
      keys.push(isMac ? '⌥' : 'Alt');
    } else if (p === 'shift') {
      keys.push('Shift');
    } else if (p === 'esc' || p === 'escape') {
      keys.push('ESC');
    } else if (p === '?') {
      keys.push('?');
    } else if (p === '/') {
      keys.push('/');
    } else {
      keys.push(p.toUpperCase());
    }
  });

  return { keys, isMac };
};
