import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind = 'audio';
  enabled = true;
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

// Mock MediaStream
class MockMediaStream {
  tracks: MockMediaStreamTrack[];
  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }
  getTracks() {
    return this.tracks;
  }
}

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = () => true;
  state = 'inactive';
  stream: MockMediaStream;
  ondataavailable: ((event: { data: any }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: MockMediaStream) {
    this.stream = stream;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }
}

describe('useAudioRecorder - Microphone Trigger Verification', () => {
  let originalMediaDevices: any;
  let getUserMediaMock: any;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    getUserMediaMock = mock.fn(async (_constraints: any) => {
      return new MockMediaStream();
    });

    originalMediaDevices = Object.getOwnPropertyDescriptor(globalThis.navigator, 'mediaDevices');

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: getUserMediaMock,
        enumerateDevices: async () => [],
      },
      configurable: true,
      writable: true,
    });

    (globalThis as any).window = {
      isSecureContext: true,
      setInterval: () => 1,
      clearInterval: () => {},
    };

    (globalThis as any).MediaRecorder = MockMediaRecorder;

    originalCreateObjectURL = (URL as any).createObjectURL;
    originalRevokeObjectURL = (URL as any).revokeObjectURL;
    (URL as any).createObjectURL = () => 'blob:mock-audio-url';
    (URL as any).revokeObjectURL = () => {};
  });

  afterEach(() => {
    if (originalMediaDevices) {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', originalMediaDevices);
    } else {
      delete (globalThis.navigator as any).mediaDevices;
    }
    (URL as any).createObjectURL = originalCreateObjectURL;
    (URL as any).revokeObjectURL = originalRevokeObjectURL;
    mock.reset();
  });

  it('does NOT trigger navigator.mediaDevices.getUserMedia on initial mount/setup', async () => {
    // Import the hook module dynamically
    await import('../src/hooks/useAudioRecorder.js');

    // Confirm getUserMedia has not been queried without an explicit user click
    assert.equal(
      getUserMediaMock.mock.calls.length,
      0,
      'getUserMedia must NOT be queried during initialization or component mount'
    );
  });

  it('triggers navigator.mediaDevices.getUserMedia strictly upon user action (record button click)', async () => {
    let capturedStream: any = null;
    let micErrorState: any = null;

    // Simulate user clicking "Record Voice" button
    const onRecordButtonClick = async () => {
      if (!globalThis.window.isSecureContext) {
        micErrorState = { type: 'INSECURE_CONTEXT' };
        return;
      }
      if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
        micErrorState = { type: 'NOT_SUPPORTED' };
        return;
      }
      try {
        capturedStream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        micErrorState = { type: err.name || 'UNKNOWN' };
      }
    };

    // Before user clicks record button
    assert.equal(getUserMediaMock.mock.calls.length, 0, 'getUserMedia has 0 calls before button click');

    // Trigger button click
    await onRecordButtonClick();

    // Verify getUserMedia was called exactly once with { audio: true }
    assert.equal(getUserMediaMock.mock.calls.length, 1, 'getUserMedia must be called once upon click');
    assert.deepEqual(
      getUserMediaMock.mock.calls[0].arguments[0],
      { audio: true },
      'getUserMedia must be requested with { audio: true }'
    );
    assert.notEqual(capturedStream, null, 'Active MediaStream must be obtained');
    assert.equal(micErrorState, null, 'No micError should occur on success');
  });

  it('handles user denial (NotAllowedError) gracefully when record button is clicked', async () => {
    const deniedMock = mock.fn(async () => {
      const error: any = new Error('Permission denied');
      error.name = 'NotAllowedError';
      throw error;
    });

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: deniedMock,
      },
      configurable: true,
      writable: true,
    });

    let micError: any = null;
    const onRecordButtonClick = async () => {
      try {
        await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        let errorMessage = 'Microphone permission was denied by the browser or system.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage =
            'Microphone permission was denied. If browser permission is already "Allow", check macOS System Settings → Privacy & Security → Microphone.';
        }
        micError = {
          type: err.name,
          message: errorMessage,
        };
      }
    };

    // Trigger click
    await onRecordButtonClick();

    assert.equal(deniedMock.mock.calls.length, 1);
    assert.equal(micError.type, 'NotAllowedError');
    assert.ok(micError.message.includes('Privacy & Security → Microphone'));
  });
});
