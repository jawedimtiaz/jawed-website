import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseShortcutCombo,
  areShortcutCombosConflicting,
  checkShortcutConflict,
  SYSTEM_RESERVED_SHORTCUTS,
  type ShortcutItem,
} from '../src/hooks/useKeyboardShortcuts';

describe('KeyboardShortcutManager - Conflict Detection Runtime', () => {
  const globalShortcuts: ShortcutItem[] = [
    {
      id: 'nav-home',
      combo: 'g+h',
      label: 'Go to Home',
      description: 'G + H -> Go to Home',
      category: 'Navigation',
      action: () => {},
    },
    {
      id: 'nav-tools',
      combo: 'g+t',
      label: 'Go to Tools',
      description: 'G + T -> Go to Tools',
      category: 'Navigation',
      action: () => {},
    },
    {
      id: 'search-modal',
      combo: 'mod+k',
      label: 'Open Search',
      description: '⌘ + K -> Open Search',
      category: 'Search & Modals',
      action: () => {},
    },
    {
      id: 'toggle-theme',
      combo: 't',
      label: 'Toggle Theme',
      description: 'T -> Toggle Theme',
      category: 'Global Controls',
      action: () => {},
    },
    {
      id: 'close-modals',
      combo: 'esc',
      label: 'Close Active Modals',
      description: 'Dismiss open modals',
      category: 'Search & Modals',
      action: () => {},
    },
    {
      id: 'shortcuts-help',
      combo: 'shift+?',
      label: 'Keyboard Shortcuts',
      description: 'Open cheat sheet',
      category: 'Search & Modals',
      action: () => {},
    },
    {
      id: 'nav-services',
      combo: 'alt+s',
      label: 'Go to Services',
      description: 'Navigate to Services',
      category: 'Navigation',
      action: () => {},
    },
  ];

  it('correctly parses chord combinations and modifier combinations', () => {
    const chord = parseShortcutCombo('g+h');
    assert.equal(chord.isChord, true);
    assert.equal(chord.prefixKey, 'g');
    assert.equal(chord.secondKey, 'h');

    const modK = parseShortcutCombo('Ctrl + K');
    assert.equal(modK.isChord, false);
    assert.equal(modK.hasCtrl, true);
    assert.equal(modK.key, 'k');

    const escapeKey = parseShortcutCombo('Escape');
    assert.equal(escapeKey.key, 'esc');
  });

  it('detects conflicts with existing global shortcuts', () => {
    // 1. Conflict with mod+k via ctrl+k
    const conflictModK = checkShortcutConflict(
      {
        id: 'tool-search',
        combo: 'ctrl+k',
        label: 'Tool Search',
        description: 'Tool local search',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(conflictModK.hasConflict, true);
    assert.ok(conflictModK.conflicts.some((c) => c.type === 'global' && c.source.includes('Open Search')));

    // 2. Conflict with single key 't'
    const conflictT = checkShortcutConflict(
      {
        id: 'tool-trim',
        combo: 't',
        label: 'Trim Tool',
        description: 'Activate trimming',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(conflictT.hasConflict, true);
    assert.ok(conflictT.conflicts.some((c) => c.source.includes('Toggle Theme')));

    // 3. Conflict with chord 'g+h'
    const conflictChord = checkShortcutConflict(
      {
        id: 'tool-go-header',
        combo: 'g+h',
        label: 'Go to Header',
        description: 'Scroll to top',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(conflictChord.hasConflict, true);
    assert.ok(conflictChord.conflicts.some((c) => c.source.includes('Go to Home')));

    // 4. Conflict with chord prefix 'g'
    const conflictPrefix = checkShortcutConflict(
      {
        id: 'tool-grid',
        combo: 'g',
        label: 'Toggle Grid',
        description: 'Display alignment grid',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(conflictPrefix.hasConflict, true);
  });

  it('detects conflicts with system-reserved shortcuts', () => {
    // 1. Browser Close Tab/Window (mod+w / ctrl+w / cmd+w)
    const resModW = checkShortcutConflict(
      {
        id: 'tool-wave',
        combo: 'mod+w',
        label: 'Show Waveform',
        description: 'Audio waveform display',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(resModW.hasConflict, true);
    assert.ok(resModW.conflicts.some((c) => c.type === 'system' && c.conflictingCombo === 'mod+w'));

    // 2. Browser New Tab (mod+t / ctrl+t)
    const resCtrlT = checkShortcutConflict(
      {
        id: 'tool-timeline',
        combo: 'ctrl+t',
        label: 'Open Timeline',
        description: 'Video timeline editor',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(resCtrlT.hasConflict, true);
    assert.ok(resCtrlT.conflicts.some((c) => c.type === 'system' && c.conflictingCombo === 'mod+t'));

    // 3. Function Key F5 / F12
    const resF5 = checkShortcutConflict(
      {
        id: 'tool-frame-5',
        combo: 'f5',
        label: 'Jump to Frame 5',
        description: 'Scrub to frame 5',
        category: 'Tool Specific',
        action: () => {},
      },
      globalShortcuts
    );
    assert.equal(resF5.hasConflict, true);
    assert.ok(resF5.conflicts.some((c) => c.type === 'system' && c.conflictingCombo === 'f5'));
  });

  it('allows safe, non-conflicting tool shortcuts to pass without warnings', () => {
    const safeShortcut: ShortcutItem = {
      id: 'tool-export-anim',
      combo: 'alt+e',
      label: 'Export Animation',
      description: 'Export video file',
      category: 'Tool Specific',
      action: () => {},
    };

    const res = checkShortcutConflict(safeShortcut, globalShortcuts);
    assert.equal(res.hasConflict, false);
    assert.equal(res.conflicts.length, 0);
    assert.equal(res.warningMessage, undefined);
  });

  it('allows updating an already registered shortcut with the same id without self-conflict', () => {
    const selfShortcut: ShortcutItem = {
      id: 'nav-home',
      combo: 'g+h',
      label: 'Go to Home (Updated)',
      description: 'Updated description',
      category: 'Navigation',
      action: () => {},
    };

    const res = checkShortcutConflict(selfShortcut, globalShortcuts);
    assert.equal(res.hasConflict, false);
  });
});
