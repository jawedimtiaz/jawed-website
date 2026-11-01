import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnimationSharePayload,
  shareAnimationViaWebShare,
  getExportFormatPreset,
  type BuildAnimationSharePayloadParams,
} from '../src/pages/tools/AnimateImageToVideo';

describe('AnimateImageToVideo - Web Share API & Mobile Sharing Logic', () => {
  it('builds a complete share payload for MP4 video format', () => {
    const params: BuildAnimationSharePayloadParams = {
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.5,
      frameRate: 30,
      selectedEffect: 'ken-burns',
      captionText: 'City Lights at Night',
      baseUrl: 'https://jawed.co.in/tools/animate-image-to-video',
    };

    const payload = buildAnimationSharePayload(params);

    assert.strictEqual(payload.title, 'Animated Photo Video');
    assert.ok(payload.text.includes('"City Lights at Night" — '));
    assert.ok(payload.text.includes('16:9'));
    assert.ok(payload.text.includes('MP4'));
    assert.ok(payload.text.includes('4.5s @ 30 FPS'));
    assert.strictEqual(payload.url, 'https://jawed.co.in/tools/animate-image-to-video');
    assert.strictEqual(payload.format, 'mp4');
    assert.strictEqual(payload.mimeType, 'video/mp4');
    assert.ok(payload.fileName.endsWith('.mp4'));
    assert.ok(payload.videoFile instanceof File);
    assert.strictEqual(payload.videoFile.type, 'video/mp4');
    assert.ok(payload.videoFile.size > 0);
  });

  it('builds a complete share payload for Apple ProRes (MOV) format', () => {
    const params: BuildAnimationSharePayloadParams = {
      exportFormat: 'mov',
      aspectRatio: '9:16',
      clippedDurationSeconds: 3.0,
      frameRate: 60,
      selectedEffect: 'cinematic-pan',
      baseUrl: 'https://jawed.co.in/tools/animate-image-to-video',
    };

    const payload = buildAnimationSharePayload(params);

    assert.strictEqual(payload.format, 'mov');
    assert.strictEqual(payload.mimeType, 'video/quicktime');
    assert.ok(payload.fileName.endsWith('.mov'));
    assert.ok(payload.videoFile instanceof File);
    assert.strictEqual(payload.videoFile.type, 'video/quicktime');
    assert.ok(payload.videoFile.size > 0);
  });

  it('includes trimmed bounds in the generated share filename when clip is trimmed', () => {
    const params: BuildAnimationSharePayloadParams = {
      exportFormat: 'webm',
      aspectRatio: '1:1',
      clippedDurationSeconds: 2.5,
      trimStartSeconds: 1.0,
      trimEndSeconds: 3.5,
      isClipTrimmed: true,
      frameRate: 24,
      selectedEffect: 'pulse-glow',
    };

    const payload = buildAnimationSharePayload(params);

    assert.ok(payload.fileName.includes('-trim-1.0s-3.5s'));
    assert.ok(payload.fileName.endsWith('.webm'));
  });

  it('triggers navigator.share with native file asset when canShare returns true', async () => {
    const payload = buildAnimationSharePayload({
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.0,
      frameRate: 30,
      selectedEffect: 'ken-burns',
    });

    let sharedData: any = null;
    const mockNav = {
      share: async (data: any) => {
        sharedData = data;
      },
      canShare: (data: any) => {
        return Boolean(data?.files);
      },
    };

    // Temporarily mount mock navigator
    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      const result = await shareAnimationViaWebShare(payload);
      assert.strictEqual(result.status, 'shared-asset');
      assert.strictEqual(result.method, 'native-asset');
      assert.ok(result.message.includes('via mobile OS sharing dialog'));
      assert.ok(sharedData);
      assert.strictEqual(sharedData.files.length, 1);
      assert.strictEqual(sharedData.files[0], payload.videoFile);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('triggers navigator.share with direct link when file sharing is not supported by canShare', async () => {
    const payload = buildAnimationSharePayload({
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.0,
      frameRate: 30,
      selectedEffect: 'ken-burns',
    });

    let sharedData: any = null;
    const mockNav = {
      share: async (data: any) => {
        sharedData = data;
      },
      canShare: () => false, // Browser does not support file sharing
    };

    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      const result = await shareAnimationViaWebShare(payload);
      assert.strictEqual(result.status, 'shared-link');
      assert.strictEqual(result.method, 'native-link');
      assert.ok(result.message.includes('via mobile OS sharing dialog'));
      assert.ok(sharedData);
      assert.strictEqual(sharedData.files, undefined);
      assert.strictEqual(sharedData.url, payload.url);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('handles AbortError gracefully when the user cancels the mobile OS sharing dialog', async () => {
    const payload = buildAnimationSharePayload({
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.0,
      frameRate: 30,
      selectedEffect: 'ken-burns',
    });

    const abortError = new Error('User dismissed share dialog');
    abortError.name = 'AbortError';

    const mockNav = {
      share: async () => {
        throw abortError;
      },
      canShare: () => true,
    };

    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      const result = await shareAnimationViaWebShare(payload);
      assert.strictEqual(result.status, 'aborted');
      assert.strictEqual(result.message, 'Share dialog closed.');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('retries with URL and text if native file sharing throws a TypeError on mobile browser', async () => {
    const payload = buildAnimationSharePayload({
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.0,
      frameRate: 30,
      selectedEffect: 'ken-burns',
    });

    let callCount = 0;
    let finalSharedData: any = null;

    const mockNav = {
      share: async (data: any) => {
        callCount++;
        if (data.files) {
          const typeErr = new Error('File sharing not supported by OS dialog');
          typeErr.name = 'TypeError';
          throw typeErr;
        }
        finalSharedData = data;
      },
      canShare: () => true,
    };

    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      const result = await shareAnimationViaWebShare(payload);
      assert.strictEqual(callCount, 2);
      assert.strictEqual(result.status, 'shared-link');
      assert.ok(finalSharedData);
      assert.strictEqual(finalSharedData.files, undefined);
      assert.strictEqual(finalSharedData.url, payload.url);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('falls back to copying link to clipboard when navigator.share is unavailable', async () => {
    const payload = buildAnimationSharePayload({
      exportFormat: 'mp4',
      aspectRatio: '16:9',
      clippedDurationSeconds: 4.0,
      frameRate: 30,
      selectedEffect: 'ken-burns',
    });

    let writtenText = '';
    const mockNav = {
      clipboard: {
        writeText: async (text: string) => {
          writtenText = text;
        },
      },
      share: undefined,
    };

    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNav,
        configurable: true,
        writable: true,
      });

      const result = await shareAnimationViaWebShare(payload);
      assert.strictEqual(result.status, 'copied');
      assert.strictEqual(result.method, 'clipboard');
      assert.strictEqual(writtenText, payload.url);
      assert.ok(result.message.includes('Link Copied!'));
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });
});
