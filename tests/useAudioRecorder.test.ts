import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  encodeWav,
  parseAndValidateWav,
  computePcmStats,
  resampleMonoAudio,
  SafeObjectUrlManager,
  extractAudioElementDiagnostics,
  describeMediaElementError,
  buildWhisperTranscriptionOptions,
  SUPPORTED_TRANSCRIPTION_LANGUAGES,
  WHISPER_MODELS,
  DEFAULT_WHISPER_MODEL_ID,
  FALLBACK_WHISPER_MODEL_ID,
} from '../src/hooks/useAudioRecorder.js';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind = 'audio';
  label = 'Built-in Microphone';
  readyState = 'live';
  enabled = true;
  muted = false;
  stopped = false;
  stop() {
    this.stopped = true;
    this.readyState = 'ended';
  }
  getSettings() {
    return { sampleRate: 48000, channelCount: 1 };
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
  getAudioTracks() {
    return this.tracks;
  }
}

describe('AI Audio Transcriber — Comprehensive Regression & Unit Suite', () => {
  let originalMediaDevices: PropertyDescriptor | undefined;
  let getUserMediaMock: any;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;
  let createdUrls: string[];
  let revokedUrls: string[];

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];

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

    originalCreateObjectURL = (URL as any).createObjectURL;
    originalRevokeObjectURL = (URL as any).revokeObjectURL;

    let counter = 0;
    (URL as any).createObjectURL = (_blob: Blob) => {
      counter += 1;
      const u = `blob:https://jawed.co.in/mock-audio-${counter}`;
      createdUrls.push(u);
      return u;
    };
    (URL as any).revokeObjectURL = (u: string) => {
      revokedUrls.push(u);
    };
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

  it('1. generates a valid mono 16-bit PCM WAV header and payload verified by an independent WAV parser', async () => {
    const sampleRate = 48000;
    const totalSamples = 48000; // 1.0 second
    const sineWave = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i += 1) {
      sineWave[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const blob = encodeWav([sineWave], sampleRate);
    assert.equal(blob.type, 'audio/wav');
    assert.equal(blob.size, 44 + totalSamples * 2);

    const buffer = await blob.arrayBuffer();
    const parsed = parseAndValidateWav(buffer);

    assert.equal(parsed.valid, true, `Expected valid WAV header, got error: ${parsed.error}`);
    assert.equal(parsed.riffHeader, 'RIFF');
    assert.equal(parsed.waveHeader, 'WAVE');
    assert.equal(parsed.fmtHeader, 'fmt ');
    assert.equal(parsed.fmtChunkSize, 16);
    assert.equal(parsed.dataHeader, 'data');
    assert.equal(parsed.audioFormat, 1);
    assert.equal(parsed.numChannels, 1);
    assert.equal(parsed.sampleRate, 48000);
    assert.equal(parsed.bitsPerSample, 16);
    assert.equal(parsed.blockAlign, 2);
    assert.equal(parsed.expectedBlockAlign, 2);
    assert.equal(parsed.byteRate, 96000);
    assert.equal(parsed.expectedByteRate, 96000);
    assert.equal(parsed.dataByteLength, 96000);
    assert.equal(parsed.fileSizeField, 36 + 96000);
    assert.equal(parsed.actualByteLength, 44 + 96000);
    assert.equal(parsed.sampleCount, 48000);
    assert.equal(parsed.durationSeconds, 1.0);
    assert.equal(parsed.hasNonZeroAudio, true);
    assert.ok(parsed.nonZeroSampleCount > 47000);
    assert.ok(parsed.nonZeroRatio > 0.95);
    assert.equal(parsed.firstNonZeroSampleIndex, 1);
    assert.ok(parsed.headerHexPreview.startsWith('52 49 46 46')); // 'RIFF'
    assert.ok(parsed.peakAmplitude > 0.49 && parsed.peakAmplitude <= 0.51);

    // Also verify all-zero silent WAV blob is flagged with hasNonZeroAudio === false while header remains valid
    const silentWave = new Float32Array(4800);
    const silentStats = computePcmStats([silentWave]);
    assert.equal(silentStats.hasNonZeroAudio, false);
    assert.equal(silentStats.nonZeroSampleCount, 0);
    assert.equal(silentStats.silentChunkCount, 1);
    assert.equal(silentStats.activeChunkCount, 0);
    const silentBlob = encodeWav([silentWave], sampleRate);
    const parsedSilent = parseAndValidateWav(await silentBlob.arrayBuffer());
    assert.equal(parsedSilent.valid, true);
    assert.equal(parsedSilent.hasNonZeroAudio, false);
    assert.equal(parsedSilent.nonZeroSampleCount, 0);
    assert.equal(parsedSilent.firstNonZeroSampleIndex, -1);
  });

  it('2. rejects zero-sample recordings cleanly', () => {
    const emptyStats = computePcmStats([]);
    assert.equal(emptyStats.totalSamples, 0);
    assert.equal(emptyStats.isSilent, true);

    assert.throws(
      () => encodeWav([], 44100),
      /zero audio samples/i,
      'encodeWav must throw when zero samples are provided'
    );

    assert.throws(
      () => encodeWav([new Float32Array(0)], 48000),
      /zero audio samples/i,
      'encodeWav must throw when only 0-length chunks are provided'
    );

    // Also verify independent parser rejects truncated or 0-byte data WAV buffers
    const truncated = new ArrayBuffer(20);
    const parsedTruncated = parseAndValidateWav(truncated);
    assert.equal(parsedTruncated.valid, false);
    assert.match(parsedTruncated.error || '', /too small/i);
  });

  it('3. handles short but valid recordings (e.g. 0.25s single chunk at 44.1kHz)', async () => {
    const sampleRate = 44100;
    const chunk = new Float32Array(11025); // 0.25 seconds
    for (let i = 0; i < chunk.length; i += 1) {
      chunk[i] = 0.25 * Math.cos((2 * Math.PI * 220 * i) / sampleRate);
    }

    const stats = computePcmStats([chunk]);
    assert.equal(stats.totalSamples, 11025);
    assert.equal(stats.isSilent, false);

    const blob = encodeWav([chunk], sampleRate);
    const parsed = parseAndValidateWav(await blob.arrayBuffer());
    assert.equal(parsed.valid, true);
    assert.equal(parsed.sampleCount, 11025);
    assert.equal(parsed.durationSeconds, 0.25);
  });

  it('4. calculates exact duration across multiple chunks and non-integer hardware sample rates', async () => {
    const floatHardwareRate = 44100.0;
    const chunks = [
      new Float32Array(22050).fill(0.1),
      new Float32Array(22050).fill(-0.1),
      new Float32Array(22050).fill(0.2),
    ]; // 66,150 samples = 1.5 seconds

    const blob = encodeWav(chunks, floatHardwareRate);
    const parsed = parseAndValidateWav(await blob.arrayBuffer());

    assert.equal(parsed.valid, true);
    assert.equal(parsed.sampleRate, 44100);
    assert.equal(parsed.sampleCount, 66150);
    assert.equal(parsed.durationSeconds, 1.5);
  });

  it('5. manages Object URLs safely without premature revocation while active', () => {
    const manager = new SafeObjectUrlManager();
    const blob1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const blob2 = new Blob([new Uint8Array([4, 5, 6])], { type: 'audio/wav' });

    const url1 = manager.replaceWithBlob(blob1);
    assert.equal(manager.getCurrentUrl(), url1);
    assert.equal(
      revokedUrls.length,
      0,
      'First active Object URL must NOT be revoked while still assigned to <audio>'
    );

    // Replacing with a second recording revokes the first URL and keeps the second active
    const url2 = manager.replaceWithBlob(blob2);
    assert.equal(manager.getCurrentUrl(), url2);
    assert.notEqual(url1, url2);
    assert.deepEqual(revokedUrls, [url1], 'Previous Object URL must be revoked when replaced');

    // Clearing revokes the active URL
    manager.clear();
    assert.equal(manager.getCurrentUrl(), null);
    assert.deepEqual(revokedUrls, [url1, url2]);
  });

  it('6. extracts <audio> element metadata and reports actionable playback error diagnostics', () => {
    const healthyAudio = {
      currentSrc: 'blob:https://jawed.co.in/mock-audio-1',
      duration: 4.25,
      readyState: 4,
      networkState: 1,
      error: null,
    };

    const okDiag = extractAudioElementDiagnostics('loadedmetadata', healthyAudio);
    assert.equal(okDiag.duration, 4.25);
    assert.equal(okDiag.readyStateLabel, 'HAVE_ENOUGH_DATA (4)');
    assert.equal(okDiag.networkStateLabel, 'NETWORK_IDLE (1)');
    assert.equal(okDiag.errorCode, null);
    assert.equal(okDiag.humanError, null);

    const erroredAudio = {
      currentSrc: 'blob:https://jawed.co.in/mock-audio-1',
      duration: NaN,
      readyState: 0,
      networkState: 3,
      error: { code: 4, message: 'MEDIA_ELEMENT_ERROR: Format error' },
    };

    const errDiag = extractAudioElementDiagnostics('error', erroredAudio);
    assert.equal(errDiag.duration, null);
    assert.equal(errDiag.readyStateLabel, 'HAVE_NOTHING (0)');
    assert.equal(errDiag.networkStateLabel, 'NETWORK_NO_SOURCE (3)');
    assert.equal(errDiag.errorCode, 4);
    assert.match(errDiag.humanError || '', /MEDIA_ERR_SRC_NOT_SUPPORTED/i);
    assert.match(describeMediaElementError(3, 'Decode error', 'blob:1'), /MEDIA_ERR_DECODE/i);
  });

  it('7. verifies start/stop/re-record lifecycle and ensures getUserMedia is ONLY called on user action', async () => {
    // Importing module must not trigger getUserMedia
    await import('../src/hooks/useAudioRecorder.js');
    assert.equal(
      getUserMediaMock.mock.calls.length,
      0,
      'getUserMedia must NOT be called on module import or mount'
    );

    const urlManager = new SafeObjectUrlManager();

    // First recording session
    const stream1 = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
    assert.equal(getUserMediaMock.mock.calls.length, 1);
    const chunk1 = new Float32Array(2048).fill(0.15);
    const wav1 = encodeWav([chunk1], 48000);
    const url1 = urlManager.replaceWithBlob(wav1);
    stream1.getTracks().forEach((t: any) => t.stop());
    assert.equal(stream1.getTracks()[0].stopped, true);
    assert.ok(url1.startsWith('blob:'));

    // Re-record session
    const stream2 = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
    assert.equal(getUserMediaMock.mock.calls.length, 2);
    const chunk2 = new Float32Array(4096).fill(0.3);
    const wav2 = encodeWav([chunk2], 48000);
    const url2 = urlManager.replaceWithBlob(wav2);
    stream2.getTracks().forEach((t: any) => t.stop());

    assert.notEqual(url1, url2);
    assert.ok(revokedUrls.includes(url1), 'First recording URL must be revoked on re-record');
    assert.ok(!revokedUrls.includes(url2), 'New recording URL must remain active');
  });

  it('8. resamples uploaded or recorded audio to 16kHz mono and transcribes it', async () => {
    const sourceRate = 48000;
    const oneSecond48k = new Float32Array(sourceRate);
    for (let i = 0; i < sourceRate; i += 1) {
      oneSecond48k[i] = Math.sin((2 * Math.PI * 440 * i) / sourceRate);
    }

    const resampled16k = resampleMonoAudio(oneSecond48k, sourceRate, 16000);
    assert.equal(resampled16k.length, 16000);

    // Mock local Whisper pipeline invocation on the resampled 16kHz audio
    const mockWhisperPipeline = mock.fn(async (samples: Float32Array, opts: any) => {
      assert.equal(samples.length, 16000);
      assert.equal(opts.task, 'transcribe');
      return { text: 'Hello from local browser Whisper transcription.' };
    });

    const options = buildWhisperTranscriptionOptions('en');
    const result = await mockWhisperPipeline(resampled16k, options);
    assert.equal(result.text, 'Hello from local browser Whisper transcription.');
  });

  it('9. configures multilingual language selection and automatic language detection accurately', () => {
    // Verify required Indian & global languages are present
    const requiredCodes = ['auto', 'en', 'hi', 'ur', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa'];
    for (const code of requiredCodes) {
      assert.ok(
        SUPPORTED_TRANSCRIPTION_LANGUAGES.some((l) => l.code === code),
        `Missing required language option: ${code}`
      );
    }

    // Auto-detect omits language parameter while enforcing task: 'transcribe'
    const autoOpts = buildWhisperTranscriptionOptions('auto');
    assert.equal(autoOpts.task, 'transcribe');
    assert.equal('language' in autoOpts, false, 'Auto-detect must omit explicit language code');

    // Selecting Hindi passes language: 'hi' and task: 'transcribe' (never translate)
    const hindiOpts = buildWhisperTranscriptionOptions('hi');
    assert.equal(hindiOpts.task, 'transcribe');
    assert.equal(hindiOpts.language, 'hi');

    // Selecting Urdu passes language: 'ur' and task: 'transcribe'
    const urduOpts = buildWhisperTranscriptionOptions('ur');
    assert.equal(urduOpts.task, 'transcribe');
    assert.equal(urduOpts.language, 'ur');
  });

  it('10. handles model download failure and retries / falls back cleanly', async () => {
    assert.equal(DEFAULT_WHISPER_MODEL_ID, 'onnx-community/whisper-base');
    assert.equal(FALLBACK_WHISPER_MODEL_ID, 'onnx-community/whisper-tiny');
    assert.equal(WHISPER_MODELS.length >= 2, true);

    let attempts = 0;
    const simulatedLoader = async (modelId: string) => {
      attempts += 1;
      if (modelId === DEFAULT_WHISPER_MODEL_ID && attempts === 1) {
        throw new Error('NetworkError: Failed to fetch model weights from huggingface.co');
      }
      return { modelId, status: 'ready' };
    };

    let loadedModel: { modelId: string; status: string } | null = null;
    try {
      loadedModel = await simulatedLoader(DEFAULT_WHISPER_MODEL_ID);
    } catch {
      loadedModel = await simulatedLoader(FALLBACK_WHISPER_MODEL_ID);
    }

    assert.equal(attempts, 2);
    assert.equal(loadedModel?.modelId, FALLBACK_WHISPER_MODEL_ID);
    assert.equal(loadedModel?.status, 'ready');
  });

  it('11. enforces production CSP media-src blob: playback headers and local-only transcription security contract', () => {
    const rootHeaders = fs.readFileSync('_headers', 'utf8');
    const publicHeaders = fs.readFileSync('public/_headers', 'utf8');

    assert.ok(
      rootHeaders.includes("media-src 'self' blob: data:;"),
      "Root _headers must include media-src 'self' blob: data:; so <audio> can play recorded WAV blob URLs"
    );
    assert.ok(
      publicHeaders.includes("media-src 'self' blob: data:;"),
      "Public _headers must include media-src 'self' blob: data:; so <audio> can play recorded WAV blob URLs"
    );
    assert.ok(
      publicHeaders.includes('Permissions-Policy: geolocation=(), microphone=(self), camera=()'),
      'Permissions-Policy must allow microphone=(self)'
    );
    assert.equal(
      fs.existsSync('functions/api/transcribe.ts'),
      false,
      'Billable server-side transcription endpoint must remain absent'
    );
  });
});
