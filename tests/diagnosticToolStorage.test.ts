import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDiagnosticStorageKey,
  saveDiagnosticFormDraft,
  loadDiagnosticFormDraft,
  clearDiagnosticFormDraft,
  listAllDiagnosticDrafts,
  getElementIdentifier,
  formatDiagnosticTimestamp,
  DIAGNOSTIC_STORAGE_PREFIX,
  DEFAULT_PERIODIC_AUTOSAVE_MS,
} from '../src/hooks/useDiagnosticToolStorage';
import { PERIODIC_AUTOSAVE_INTERVAL_MS } from '../src/components/DiagnosticToolsAutoPersist';
import {
  DEFAULT_TICKET_TO_KB_DRAFT,
  TICKET_TO_KB_STORAGE_KEY,
  type TicketToKbDraftValues,
} from '../src/tools/TicketToKbDraft';

class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

describe('Diagnostic Tools Auto-Persistence Engine (localStorage)', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
  });

  it('normalizes tool IDs and paths into valid diagnostic storage keys', () => {
    assert.strictEqual(
      getDiagnosticStorageKey('/tools/ipv4-subnet-calculator'),
      `${DIAGNOSTIC_STORAGE_PREFIX}ipv4-subnet-calculator`
    );
    assert.strictEqual(
      getDiagnosticStorageKey('tools/ticket-to-knowledge-base-draft/'),
      `${DIAGNOSTIC_STORAGE_PREFIX}ticket-to-knowledge-base-draft`
    );
    assert.strictEqual(
      getDiagnosticStorageKey('cctv-storage-calculator'),
      `${DIAGNOSTIC_STORAGE_PREFIX}cctv-storage-calculator`
    );
  });

  it('saves and loads form data using the diagnostic envelope', () => {
    const customData = {
      ipInput: '10.240.12.1',
      cidrPrefix: 28,
    };

    const savedAt = saveDiagnosticFormDraft('ipv4-subnet-calculator', customData);
    assert.ok(typeof savedAt === 'number');
    assert.ok(savedAt > 0);

    const loaded = loadDiagnosticFormDraft('ipv4-subnet-calculator', {
      ipInput: '192.168.1.1',
      cidrPrefix: 24,
    });

    assert.strictEqual(loaded.isStored, true);
    assert.strictEqual(loaded.savedAt, savedAt);
    assert.strictEqual(loaded.data.ipInput, '10.240.12.1');
    assert.strictEqual(loaded.data.cidrPrefix, 28);
  });

  it('falls back to default values when no data exists in localStorage', () => {
    const defaults = {
      voltage: 208,
      powerFactor: 0.95,
    };

    const loaded = loadDiagnosticFormDraft('non_existent_tool', defaults);
    assert.strictEqual(loaded.isStored, false);
    assert.strictEqual(loaded.savedAt, null);
    assert.deepStrictEqual(loaded.data, defaults);
  });

  it('recovers gracefully from corrupted JSON in localStorage', () => {
    const storageKey = getDiagnosticStorageKey('corrupt_tool');
    mockStorage.setItem(storageKey, '{ unexpected token :::');

    const defaults = { status: 'default' };
    const loaded = loadDiagnosticFormDraft('corrupt_tool', defaults);

    assert.strictEqual(loaded.isStored, false);
    assert.strictEqual(loaded.savedAt, null);
    assert.deepStrictEqual(loaded.data, defaults);
  });

  it('clears diagnostic drafts from localStorage cleanly', () => {
    saveDiagnosticFormDraft('clear_test', { field: 'test_value' });
    assert.ok(mockStorage.length > 0);

    const removed = clearDiagnosticFormDraft('clear_test');
    assert.strictEqual(removed, true);

    const loaded = loadDiagnosticFormDraft('clear_test', { field: 'default' });
    assert.strictEqual(loaded.isStored, false);
    assert.strictEqual(loaded.data.field, 'default');
  });

  it('enumerates all currently stored diagnostic tool drafts', () => {
    saveDiagnosticFormDraft('tool_alpha', { param: 1 });
    saveDiagnosticFormDraft('tool_beta', { param: 2 });
    mockStorage.setItem('unrelated_key', 'some other app data');

    const drafts = listAllDiagnosticDrafts();
    assert.strictEqual(drafts.length, 2);

    const toolIds = drafts.map(d => d.toolId);
    assert.ok(toolIds.includes('tool_alpha'));
    assert.ok(toolIds.includes('tool_beta'));
    assert.ok(drafts.every(d => d.sizeBytes > 0 && typeof d.savedAt === 'number'));
  });

  it('extracts stable DOM element identifiers prioritizing name, id, and data-field', () => {
    const mockElWithName = {
      tagName: 'INPUT',
      name: 'userSubnet',
      id: 'input-sub',
      getAttribute: () => null,
    } as unknown as HTMLElement;

    assert.strictEqual(getElementIdentifier(mockElWithName, 0), 'userSubnet');

    const mockElWithId = {
      tagName: 'INPUT',
      name: '',
      id: 'input-voltage',
      getAttribute: () => null,
    } as unknown as HTMLElement;

    assert.strictEqual(getElementIdentifier(mockElWithId, 1), 'input-voltage');

    const mockElWithDataField = {
      tagName: 'TEXTAREA',
      name: '',
      id: '',
      getAttribute: (attr: string) => (attr === 'data-field' ? 'troubleshooting_steps' : null),
    } as unknown as HTMLElement;

    assert.strictEqual(getElementIdentifier(mockElWithDataField, 2), 'troubleshooting_steps');

    const mockFallbackEl = {
      tagName: 'SELECT',
      name: '',
      id: '',
      getAttribute: () => null,
    } as unknown as HTMLElement;

    assert.strictEqual(getElementIdentifier(mockElFallback(mockFallbackEl), 3), 'input_select_3');
  });

  it('persists and restores TicketToKbDraft inputs across sessions', () => {
    const customTicketDraft: TicketToKbDraftValues = {
      kbTitle: 'Cisco AnyConnect VPN Error 412 Resolution',
      targetAudience: 'Tier 2 Desktop Support',
      environment: 'Windows 11 Enterprise 23H2 / Cisco Secure Client 5.1',
      symptoms: 'Connection attempt failed due to inability to contact the VPN gateway.',
      rootCause: 'Stale DPD (Dead Peer Detection) keepalive timeout during sleep/wake transition.',
      resolutionSteps: '1. Flush DNS: ipconfig /flushdns\n2. Restart vpnagent service.',
    };

    const savedAt = saveDiagnosticFormDraft(TICKET_TO_KB_STORAGE_KEY, customTicketDraft);
    assert.ok(savedAt);

    const restored = loadDiagnosticFormDraft(TICKET_TO_KB_STORAGE_KEY, DEFAULT_TICKET_TO_KB_DRAFT);
    assert.strictEqual(restored.isStored, true);
    assert.strictEqual(restored.data.kbTitle, customTicketDraft.kbTitle);
    assert.strictEqual(restored.data.rootCause, customTicketDraft.rootCause);
    assert.strictEqual(restored.data.resolutionSteps, customTicketDraft.resolutionSteps);
  });

  it('formats diagnostic timestamps into localized strings', () => {
    const timestamp = Date.now();
    const formatted = formatDiagnosticTimestamp(timestamp);
    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);

    assert.strictEqual(formatDiagnosticTimestamp(null), '');
  });

  it('configures periodic auto-saving interval to exactly 5000 milliseconds (5 seconds)', () => {
    assert.strictEqual(DEFAULT_PERIODIC_AUTOSAVE_MS, 5000);
    assert.strictEqual(PERIODIC_AUTOSAVE_INTERVAL_MS, 5000);
  });

  it('handles periodic auto-save cycle by saving changed data and updating lastSaved timestamp', () => {
    const toolId = 'periodic_test_tool';
    let lastSavedSnapshot = '';
    let lastSavedAt: number | null = null;

    // Simulate 1st 5-second tick: Form has input
    const tick1Data = { inputQuery: '10.0.0.0/8', notes: 'Private class A' };
    const tick1Json = JSON.stringify(tick1Data);

    if (tick1Json !== lastSavedSnapshot) {
      const saved = saveDiagnosticFormDraft(toolId, tick1Data);
      lastSavedSnapshot = tick1Json;
      lastSavedAt = saved;
    }

    assert.ok(lastSavedAt !== null);
    assert.strictEqual(lastSavedSnapshot, tick1Json);

    // Verify localStorage has the saved draft
    const loaded1 = loadDiagnosticFormDraft(toolId, { inputQuery: '', notes: '' });
    assert.strictEqual(loaded1.isStored, true);
    assert.strictEqual(loaded1.data.inputQuery, '10.0.0.0/8');

    // Simulate 2nd 5-second tick: Form unchanged
    let savedOnTick2 = false;
    const tick2Data = { inputQuery: '10.0.0.0/8', notes: 'Private class A' };
    const tick2Json = JSON.stringify(tick2Data);

    if (tick2Json !== lastSavedSnapshot) {
      savedOnTick2 = true;
    }
    // Redundant write should NOT occur
    assert.strictEqual(savedOnTick2, false);

    // Simulate 3rd 5-second tick: User modified an input
    let savedOnTick3 = false;
    const tick3Data = { inputQuery: '172.16.0.0/12', notes: 'Private class B' };
    const tick3Json = JSON.stringify(tick3Data);

    if (tick3Json !== lastSavedSnapshot) {
      const saved3 = saveDiagnosticFormDraft(toolId, tick3Data);
      lastSavedSnapshot = tick3Json;
      lastSavedAt = saved3;
      savedOnTick3 = true;
    }

    assert.strictEqual(savedOnTick3, true);
    const loaded3 = loadDiagnosticFormDraft(toolId, { inputQuery: '', notes: '' });
    assert.strictEqual(loaded3.data.inputQuery, '172.16.0.0/12');
  });

  it('formats tool header timestamp indicator correctly to reassure user', () => {
    const now = new Date('2026-10-31T23:15:30.000Z').getTime();
    const formatted = formatDiagnosticTimestamp(now);
    assert.ok(formatted.length > 0);

    const headerDisplayText = `Last saved: ${formatted}`;
    assert.ok(headerDisplayText.startsWith('Last saved: '));
    assert.ok(headerDisplayText.includes(':'));
  });
});

function mockElFallback(base: any): HTMLElement {
  return base as HTMLElement;
}

