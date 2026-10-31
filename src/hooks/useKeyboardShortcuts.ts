import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShortcutItem {
  id: string;
  combo: string; // e.g. 'mod+k', 'alt+a', 'esc', 'shift+?', 'alt+t'
  label: string;
  description: string;
  category: 'Search & Modals' | 'AI Assistant' | 'Navigation' | 'Global Controls';
  allowInInput?: boolean;
  action: () => void;
}

interface KeyboardShortcutContextType {
  shortcuts: ShortcutItem[];
  isHelpModalOpen: boolean;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  toggleHelpModal: () => void;
  triggerShortcut: (id: string) => void;
  lastTriggeredAction: { id: string; label: string; timestamp: number } | null;
}

export const KeyboardShortcutContext = createContext<KeyboardShortcutContextType>({
  shortcuts: [],
  isHelpModalOpen: false,
  openHelpModal: () => {},
  closeHelpModal: () => {},
  toggleHelpModal: () => {},
  triggerShortcut: () => {},
  lastTriggeredAction: null,
});

export const useKeyboardShortcuts = () => useContext(KeyboardShortcutContext);

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
