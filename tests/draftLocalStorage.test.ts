import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  readDraftFromStorage,
  writeDraftToStorage,
  removeDraftFromStorage,
  formatDraftTimestamp,
} from '../src/hooks/useLocalStorageDraft';
import {
  IT_TROUBLESHOOTING_STORAGE_KEY,
  DEFAULT_TROUBLESHOOTING_DRAFT,
  type TroubleshootingDraft,
} from '../src/tools/ItTroubleshootingAssistant';
import {
  SERVICE_DESK_STORAGE_KEY,
  DEFAULT_SERVICE_DESK_DRAFT,
  type ServiceDeskDraft,
} from '../src/tools/ServiceDeskNoteFormatter';

// In-memory mock localStorage
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
}

describe('Draft Persistence & Connection Drop Protection (localStorage)', () => {
  let mockStorage: MockLocalStorage;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
  });

  it('reads default values when no draft exists in localStorage', () => {
    const result = readDraftFromStorage(IT_TROUBLESHOOTING_STORAGE_KEY, DEFAULT_TROUBLESHOOTING_DRAFT);
    assert.strictEqual(result.isStored, false);
    assert.strictEqual(result.savedAt, null);
    assert.deepStrictEqual(result.data, DEFAULT_TROUBLESHOOTING_DRAFT);
  });

  it('saves and restores IT Troubleshooting Assistant drafts to localStorage', () => {
    const customDraft: TroubleshootingDraft = {
      category: 'apple',
      scope: 'organization',
      urgency: 'high',
      symptom: 'Kerberos SSO extension failed across all Jamf managed MacBooks after Sonoma 14.5 update.',
    };

    const savedAt = writeDraftToStorage(IT_TROUBLESHOOTING_STORAGE_KEY, customDraft);
    assert.ok(typeof savedAt === 'number');
    assert.ok(savedAt > 0);

    const storedRaw = mockStorage.getItem(IT_TROUBLESHOOTING_STORAGE_KEY);
    assert.ok(storedRaw !== null);
    assert.ok(storedRaw.includes('Kerberos SSO'));

    const restored = readDraftFromStorage(IT_TROUBLESHOOTING_STORAGE_KEY, DEFAULT_TROUBLESHOOTING_DRAFT);
    assert.strictEqual(restored.isStored, true);
    assert.strictEqual(restored.savedAt, savedAt);
    assert.strictEqual(restored.data.category, 'apple');
    assert.strictEqual(restored.data.scope, 'organization');
    assert.strictEqual(restored.data.urgency, 'high');
    assert.strictEqual(restored.data.symptom, customDraft.symptom);
  });

  it('saves and restores Service Desk Note Formatter drafts to localStorage', () => {
    const customServiceDeskDraft: ServiceDeskDraft = {
      ticketId: 'INC-99104',
      caller: 'Alex Rivera (DevOps)',
      status: 'In Progress',
      issueSummary: 'VPN split-tunnel routing failing for AWS staging cluster subnets.',
      troubleshootingDone: 'Analyzed wireguard client routes; tested direct ICMP gateway reachability.',
      rootCause: 'Overlapping 172.20.0.0/16 route pushed via DHCP option 121.',
      resolutionOrNextStep: 'Working with network team to update route-metric precedence.',
    };

    const savedAt = writeDraftToStorage(SERVICE_DESK_STORAGE_KEY, customServiceDeskDraft);
    assert.ok(typeof savedAt === 'number');

    const restored = readDraftFromStorage(SERVICE_DESK_STORAGE_KEY, DEFAULT_SERVICE_DESK_DRAFT);
    assert.strictEqual(restored.isStored, true);
    assert.strictEqual(restored.savedAt, savedAt);
    assert.strictEqual(restored.data.ticketId, 'INC-99104');
    assert.strictEqual(restored.data.caller, 'Alex Rivera (DevOps)');
    assert.strictEqual(restored.data.status, 'In Progress');
    assert.strictEqual(restored.data.issueSummary, customServiceDeskDraft.issueSummary);
    assert.strictEqual(restored.data.troubleshootingDone, customServiceDeskDraft.troubleshootingDone);
    assert.strictEqual(restored.data.rootCause, customServiceDeskDraft.rootCause);
    assert.strictEqual(restored.data.resolutionOrNextStep, customServiceDeskDraft.resolutionOrNextStep);
  });

  it('removes drafts cleanly when clearDraft is invoked', () => {
    writeDraftToStorage(SERVICE_DESK_STORAGE_KEY, {
      ...DEFAULT_SERVICE_DESK_DRAFT,
      ticketId: 'INC-TEMP-123',
    });

    assert.ok(mockStorage.getItem(SERVICE_DESK_STORAGE_KEY) !== null);

    const cleared = removeDraftFromStorage(SERVICE_DESK_STORAGE_KEY);
    assert.strictEqual(cleared, true);
    assert.strictEqual(mockStorage.getItem(SERVICE_DESK_STORAGE_KEY), null);

    const afterClear = readDraftFromStorage(SERVICE_DESK_STORAGE_KEY, DEFAULT_SERVICE_DESK_DRAFT);
    assert.strictEqual(afterClear.isStored, false);
    assert.deepStrictEqual(afterClear.data, DEFAULT_SERVICE_DESK_DRAFT);
  });

  it('gracefully handles corrupted JSON in localStorage by falling back to defaults', () => {
    mockStorage.setItem(IT_TROUBLESHOOTING_STORAGE_KEY, '{ invalid_json ::: corrupted');

    const restored = readDraftFromStorage(IT_TROUBLESHOOTING_STORAGE_KEY, DEFAULT_TROUBLESHOOTING_DRAFT);
    assert.strictEqual(restored.isStored, false);
    assert.strictEqual(restored.savedAt, null);
    assert.deepStrictEqual(restored.data, DEFAULT_TROUBLESHOOTING_DRAFT);
  });

  it('formats draft timestamps into readable strings', () => {
    const now = Date.now();
    const formatted = formatDraftTimestamp(now);
    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);

    assert.strictEqual(formatDraftTimestamp(null), '');
    assert.strictEqual(formatDraftTimestamp(0), '');
  });

  it('merges partial saved drafts with default values so newly added fields do not break', () => {
    // Simulate draft from older version missing a field
    mockStorage.setItem(
      SERVICE_DESK_STORAGE_KEY,
      JSON.stringify({
        data: {
          ticketId: 'INC-55555',
          caller: 'Mark Spencer',
        },
        savedAt: Date.now(),
      })
    );

    const restored = readDraftFromStorage(SERVICE_DESK_STORAGE_KEY, DEFAULT_SERVICE_DESK_DRAFT);
    assert.strictEqual(restored.isStored, true);
    assert.strictEqual(restored.data.ticketId, 'INC-55555');
    assert.strictEqual(restored.data.caller, 'Mark Spencer');
    // Default values populated for missing fields
    assert.strictEqual(restored.data.status, DEFAULT_SERVICE_DESK_DRAFT.status);
    assert.strictEqual(restored.data.rootCause, DEFAULT_SERVICE_DESK_DRAFT.rootCause);
  });
});
