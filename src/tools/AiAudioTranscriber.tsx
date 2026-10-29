import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Upload,
  FileAudio,
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  Volume2,
  FileText,
  ListChecks,
  AlignLeft,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Globe,
  Cpu,
  Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  TranscriberErrorCategory,
  WavValidationResult,
  AudioElementDiagnostics,
  WHISPER_MODELS,
  DEFAULT_WHISPER_MODEL_ID,
  FALLBACK_WHISPER_MODEL_ID,
  SUPPORTED_TRANSCRIPTION_LANGUAGES,
  buildWhisperTranscriptionOptions,
  computePcmStats,
  encodeWav,
  parseAndValidateWav,
  resampleMonoAudio,
  extractAudioElementDiagnostics,
  SafeObjectUrlManager,
} from '../hooks/useAudioRecorder';

const cachedWhisperPipelines = new Map<string, any>();

interface TranscriptionResult {
  transcript: string;
  summary: string;
  actionItems: string[];
  detectedLanguage?: string;
  modelUsed?: string;
}

interface DebugEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: string;
}

const formatDurationDisplay = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const totalSecs = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const summarizeTranscript = (text: string): { summary: string; actionItems: string[] } => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return {
      summary: 'No clear speech was detected in the audio.',
      actionItems: [],
    };
  }

  // Support Latin, Devanagari (।), Arabic/Urdu (۔), and CJK (。) sentence boundaries
  const sentences = cleaned
    .split(/(?<=[.!?।۔。])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summary =
    sentences.slice(0, 3).join(' ') ||
    cleaned.slice(0, 280) + (cleaned.length > 280 ? '...' : '');

  const actionPattern =
    /\b(need to|should|must|todo|to-do|action|follow up|schedule|send|review|fix|update|call|email|verify|check|create|prepare|complete|submit)\b/i;
  const actionItems = sentences.filter((sentence) => actionPattern.test(sentence)).slice(0, 6);

  return {
    summary,
    actionItems:
      actionItems.length > 0
        ? actionItems
        : sentences.length > 1
        ? sentences.slice(0, 3)
        : [`Review transcript: "${cleaned.slice(0, 120)}${cleaned.length > 120 ? '...' : ''}"`],
  };
};

const loadWhisperPipeline = async (
  modelId: string,
  addLog: (level: 'info' | 'warn' | 'error', message: string, details?: any) => void,
  onStatus: (status: string, progressPct?: number | null) => void
) => {
  if (cachedWhisperPipelines.has(modelId)) {
    return cachedWhisperPipelines.get(modelId);
  }

  const modelMeta = WHISPER_MODELS.find((m) => m.id === modelId);
  onStatus(
    `Downloading local AI speech model (${modelMeta?.approxDownloadSize || '~75 MB'} on first use)...`,
    0
  );
  addLog(
    'info',
    `Loading local Whisper model (${modelId}) in browser via Transformers.js...`
  );

  // Dynamic runtime import keeps the main Vite bundle small and avoids paid server APIs.
  const transformersUrl = 'https://esm.sh/@huggingface/transformers@3.3.3';
  const { pipeline, env } = await import(/* @vite-ignore */ transformersUrl);
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  let lastLoggedBucket = -1;
  const instance = await pipeline('automatic-speech-recognition', modelId, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (progress: any) => {
      if (typeof progress?.progress === 'number') {
        const pct = Math.max(0, Math.min(100, Math.round(progress.progress)));
        const fileLabel = progress.file ? ` (${progress.file})` : '';
        onStatus(`Downloading local AI speech model... ${pct}%${fileLabel}`, pct);
        const bucket = Math.floor(pct / 25);
        if (bucket > lastLoggedBucket) {
          lastLoggedBucket = bucket;
          addLog('info', `Model download progress: ${pct}%`, {
            file: progress.file,
            status: progress.status,
          });
        }
      } else if (progress?.status === 'ready') {
        onStatus('Local AI speech model ready.', 100);
      }
    },
  });

  cachedWhisperPipelines.set(modelId, instance);
  addLog('info', `Local Whisper model (${modelId}) loaded and cached in browser.`);
  return instance;
};

const decodeAudioBlobToMono16k = async (
  blob: Blob,
  addLog: (level: 'info' | 'warn' | 'error', message: string, details?: any) => void
): Promise<{ samples: Float32Array; durationSeconds: number; sampleRate: number }> => {
  const targetRate = 16000;
  const arrayBuffer = await blob.arrayBuffer();

  const wavCheck = parseAndValidateWav(arrayBuffer);
  if (wavCheck.valid && wavCheck.bitsPerSample === 16 && wavCheck.numChannels === 1) {
    addLog('info', 'Verified mono 16-bit PCM WAV header & non-zero payload prior to transcription.', {
      sampleRate: wavCheck.sampleRate,
      numChannels: wavCheck.numChannels,
      bitsPerSample: wavCheck.bitsPerSample,
      sampleCount: wavCheck.sampleCount,
      nonZeroSampleCount: wavCheck.nonZeroSampleCount,
      nonZeroRatio: Number(wavCheck.nonZeroRatio.toFixed(4)),
      hasNonZeroAudio: wavCheck.hasNonZeroAudio,
      durationSeconds: Number(wavCheck.durationSeconds.toFixed(3)),
      peakAmplitude: Number(wavCheck.peakAmplitude.toFixed(4)),
      rmsAmplitude: Number(wavCheck.rmsAmplitude.toFixed(4)),
    });
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();

  try {
    const decodeCtxInitDiag = {
      contextSampleRate: audioContext.sampleRate,
      contextState: audioContext.state,
      destinationChannelCount: audioContext.destination.channelCount,
      destinationMaxChannelCount: audioContext.destination.maxChannelCount,
      blobByteSize: blob.size,
      blobMimeType: blob.type,
    };
    console.log(
      '[AiAudioTranscriber] AudioContext lifecycle (16kHz decoder) — created AudioContext:',
      decodeCtxInitDiag
    );
    addLog('info', 'Created decoding AudioContext for 16kHz transcription pipeline:', decodeCtxInitDiag);

    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channels = decoded.numberOfChannels;
    const length = decoded.length;
    const mono = new Float32Array(length);

    let monoNonZeroCount = 0;
    let monoPeak = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const channelData = decoded.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        mono[i] += channelData[i] / channels;
      }
    }

    for (let i = 0; i < length; i += 1) {
      const abs = Math.abs(mono[i]);
      if (abs > 0) monoNonZeroCount += 1;
      if (abs > monoPeak) monoPeak = abs;
    }

    const resampled = resampleMonoAudio(mono, decoded.sampleRate, targetRate);
    let resampledNonZeroCount = 0;
    for (let i = 0; i < resampled.length; i += 1) {
      if (Math.abs(resampled[i]) > 0) resampledNonZeroCount += 1;
    }

    const decodeSummaryDiag = {
      audioContextSampleRate: audioContext.sampleRate,
      decodedBufferSampleRate: decoded.sampleRate,
      targetSampleRate: targetRate,
      decodedChannels: channels,
      targetChannels: 1,
      decodedFrameLength: length,
      decodedPcmFloat32Bytes: mono.byteLength,
      decodedDurationSeconds: Number(decoded.duration.toFixed(3)),
      monoNonZeroSamples: monoNonZeroCount,
      monoPeakAmplitude: Number(monoPeak.toFixed(5)),
      resampledSampleCount: resampled.length,
      resampledPcmFloat32Bytes: resampled.byteLength,
      resampledNonZeroSamples: resampledNonZeroCount,
      hasValidNonZeroAudio: resampledNonZeroCount > 0,
    };
    console.log(
      '[AiAudioTranscriber] AudioContext lifecycle (16kHz decoder) — decoded & resampled PCM buffer:',
      decodeSummaryDiag
    );
    addLog('info', 'Decoded & resampled audio buffer for local Whisper transcription:', decodeSummaryDiag);
    return {
      samples: resampled,
      durationSeconds: decoded.duration,
      sampleRate: decoded.sampleRate,
    };
  } finally {
    const preCloseState = audioContext.state;
    await audioContext.close().catch(() => {});
    console.log('[AiAudioTranscriber] AudioContext lifecycle (16kHz decoder) — closed AudioContext:', {
      previousState: preCloseState,
      finalState: audioContext.state,
    });
  }
};

export const AiAudioTranscriber: React.FC = () => {
  // Recording & Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/wav');
  const [wavValidation, setWavValidation] = useState<WavValidationResult | null>(null);
  const [audioElementDiag, setAudioElementDiag] = useState<AudioElementDiagnostics | null>(null);
  const [audioContextDiag, setAudioContextDiag] = useState<{
    rawSampleRate: number;
    normalizedSampleRate: number;
    state: string;
    baseLatency?: number;
    outputLatency?: number;
    trackSampleRate?: number;
    trackChannelCount?: number;
    sourceChannelCount: number;
    processorChannelCount: number;
    destinationChannelCount: number;
    destinationMaxChannelCount: number;
  } | null>(null);
  const [inputLevelPeak, setInputLevelPeak] = useState<number>(0);
  const [isWebAudioPlaying, setIsWebAudioPlaying] = useState(false);

  // Multilingual & Model State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_WHISPER_MODEL_ID);
  const [modelLoadProgress, setModelLoadProgress] = useState<number | null>(null);

  // Transcription & Analysis State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Transcribing & Analyzing...');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<TranscriberErrorCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'transcript' | 'summary' | 'actions'>('all');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Diagnostics & Debug State
  const [debugLogs, setDebugLogs] = useState<DebugEntry[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [envInfo, setEnvInfo] = useState<{
    isSecureContext: boolean;
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
    isIframe: boolean;
    permissionState: string;
    userAgent: string;
  }>({
    isSecureContext: true,
    hasMediaDevices: true,
    hasGetUserMedia: true,
    isIframe: false,
    permissionState: 'unknown',
    userAgent: '',
  });

  // Refs for Web Audio Recording & Safe Object URL Management
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const recordingStartTimestampRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const urlManagerRef = useRef<SafeObjectUrlManager>(new SafeObjectUrlManager());
  const webAudioPlaybackContextRef = useRef<AudioContext | null>(null);

  const addLog = useCallback(
    (level: 'info' | 'warn' | 'error', message: string, details?: any) => {
      const entry: DebugEntry = {
        timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
        level,
        message,
        details: details
          ? typeof details === 'string'
            ? details
            : JSON.stringify(details, null, 2)
          : undefined,
      };
      setDebugLogs((prev) => [...prev, entry]);
      if (level === 'error') {
        console.error(`[AudioTranscriber] ${message}`, details || '');
      } else if (level === 'warn') {
        console.warn(`[AudioTranscriber] ${message}`, details || '');
      } else {
        console.log(`[AudioTranscriber] ${message}`, details || '');
      }
    },
    []
  );

  const reportError = useCallback(
    (category: TranscriberErrorCategory, message: string, details?: any) => {
      setErrorCategory(category);
      setErrorMsg(message);
      addLog('error', `[${category.toUpperCase()}] ${message}`, details);
    },
    [addLog]
  );

  const clearError = useCallback(() => {
    setErrorMsg(null);
    setErrorCategory(null);
  }, []);

  /**
   * Explicitly resets the <audio> element's source and revokes any active Object URL
   * using URL.revokeObjectURL() so that multiple Object URLs are never leaked or left active.
   */
  const resetAudioSource = useCallback(
    (reason: string) => {
      const audioEl = audioPlayerRef.current;
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {
          // Ignore DOM media reset errors in non-browser/test environments
        }
      }

      const previousUrl =
        activeObjectUrlRef.current || urlManagerRef.current.getCurrentUrl();
      if (previousUrl) {
        try {
          URL.revokeObjectURL(previousUrl);
        } catch {
          // Ignore revoke errors if already revoked
        }
        activeObjectUrlRef.current = null;
        urlManagerRef.current.clear();
        const resetDiag = {
          reason,
          revokedObjectUrl: previousUrl,
          audioElementReset: Boolean(audioEl),
        };
        console.log(
          '[AiAudioTranscriber] Explicitly reset <audio> source and revoked previous Object URL:',
          resetDiag
        );
        addLog('info', `Explicitly reset <audio> source and revoked previous Object URL (${reason}):`, {
          revokedObjectUrl: previousUrl,
          audioElementReset: Boolean(audioEl),
        });
      } else {
        urlManagerRef.current.clear();
      }

      setAudioUrl(null);
      setAudioBlob(null);
    },
    [addLog]
  );

  /**
   * Resets any previous Object URL and <audio> source, creates a single new Object URL
   * for the verified Blob, and binds it to the <audio> element.
   */
  const assignAudioSourceFromBlob = useCallback(
    (blob: Blob, fileName: string, mimeType: string, sourceLabel: string): string => {
      resetAudioSource(`replacing audio source with ${sourceLabel}`);

      const nextUrl = urlManagerRef.current.replaceWithBlob(blob);
      activeObjectUrlRef.current = nextUrl;

      setAudioBlob(blob);
      setAudioFileName(fileName);
      setAudioMimeType(mimeType);
      setAudioUrl(nextUrl);

      const audioEl = audioPlayerRef.current;
      if (audioEl) {
        try {
          audioEl.src = nextUrl;
          audioEl.load();
        } catch {
          // Ignore media load errors in headless environments
        }
      }

      const assignDiag = {
        sourceLabel,
        fileName,
        mimeType,
        blobSizeBytes: blob.size,
        hasPayloadBeyondWavHeader: blob.size > 44,
        objectUrl: nextUrl,
        boundToAudioElement: Boolean(audioEl),
      };
      console.log(
        '[AiAudioTranscriber] Assigning verified audio Blob Object URL to <audio> element for playback:',
        assignDiag
      );
      addLog('info', `Assigned single active Object URL for ${sourceLabel}:`, {
        fileName,
        mimeType,
        blobSizeBytes: blob.size,
        objectUrl: nextUrl,
      });

      return nextUrl;
    },
    [addLog, resetAudioSource]
  );

  const stopWebAudioFallbackPlayback = useCallback(async () => {
    if (webAudioPlaybackContextRef.current) {
      const ctx = webAudioPlaybackContextRef.current;
      const preCloseState = ctx.state;
      try {
        await ctx.close();
        console.log('[AiAudioTranscriber] AudioContext lifecycle (Web Audio playback) — closed AudioContext:', {
          previousState: preCloseState,
          finalState: ctx.state,
          sampleRate: ctx.sampleRate,
        });
      } catch {
        // Ignore already closed AudioContext
      }
      webAudioPlaybackContextRef.current = null;
    }
    setIsWebAudioPlaying(false);
  }, []);

  const stopRecordingGraph = useCallback(async () => {
    const hasActiveGraph = Boolean(
      processorRef.current ||
        sourceNodeRef.current ||
        silentGainRef.current ||
        audioContextRef.current ||
        activeStreamRef.current
    );

    if (hasActiveGraph) {
      console.log('[AiAudioTranscriber] AudioContext lifecycle — tearing down recording graph:', {
        audioContextStateBeforeTeardown: audioContextRef.current?.state ?? 'none',
        audioContextSampleRate: audioContextRef.current?.sampleRate ?? null,
        hasProcessorNode: Boolean(processorRef.current),
        hasSourceNode: Boolean(sourceNodeRef.current),
        hasSilentGainNode: Boolean(silentGainRef.current),
        activeStreamTrackCount: activeStreamRef.current?.getTracks().length ?? 0,
      });
    }

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore already disconnected processor
      }
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore already disconnected source
      }
      sourceNodeRef.current = null;
    }

    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {
        // Ignore already disconnected gain node
      }
      silentGainRef.current = null;
    }

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      const preCloseState = ctx.state;
      const closeSampleRate = ctx.sampleRate;
      try {
        ctx.onstatechange = null;
        await ctx.close();
        console.log('[AiAudioTranscriber] AudioContext lifecycle — AudioContext closed:', {
          previousState: preCloseState,
          finalState: ctx.state,
          sampleRate: closeSampleRate,
        });
      } catch {
        // Ignore already closed AudioContext
      }
      audioContextRef.current = null;
    }

    if (activeStreamRef.current) {
      const tracks = activeStreamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      console.log('[AiAudioTranscriber] AudioContext lifecycle — stopped MediaStream tracks:', {
        stoppedTrackCount: tracks.length,
        trackStates: tracks.map((t) => ({
          label: t.label || 'Default Microphone',
          readyState: t.readyState,
          enabled: t.enabled,
        })),
      });
      activeStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const checkEnvironment = async () => {
      const isSecure = window.isSecureContext;
      const hasMD = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
      const hasGUM = hasMD && typeof navigator.mediaDevices.getUserMedia === 'function';
      const isFramed = window.self !== window.top;
      let permState = 'unsupported';

      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          permState = status.state;
          status.onchange = () => {
            setEnvInfo((prev) => ({ ...prev, permissionState: status.state }));
            addLog('info', `Microphone permission state changed to: ${status.state}`);
          };
        } catch (err: any) {
          permState = `query-error (${err?.message || 'unknown'})`;
        }
      }

      const info = {
        isSecureContext: isSecure,
        hasMediaDevices: hasMD,
        hasGetUserMedia: hasGUM,
        isIframe: isFramed,
        permissionState: permState,
        userAgent: navigator.userAgent,
      };
      setEnvInfo(info);
      addLog('info', 'Environment diagnostic initialized (no mic requested on mount)', info);
    };

    void checkEnvironment();

    return () => {
      const audioEl = audioPlayerRef.current;
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {
          // Ignore unmount media cleanup errors
        }
      }
      if (activeObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(activeObjectUrlRef.current);
        } catch {
          // Ignore revoke errors
        }
        activeObjectUrlRef.current = null;
      }
      urlManagerRef.current.clear();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      void stopRecordingGraph();
      void stopWebAudioFallbackPlayback();
    };
  }, [addLog, stopRecordingGraph, stopWebAudioFallbackPlayback]);

  useEffect(() => {
    if (audioUrl && audioPlayerRef.current) {
      const audioEl = audioPlayerRef.current;
      try {
        const attrSrc = audioEl.getAttribute('src');
        const needsExplicitLoad =
          attrSrc !== audioUrl || audioEl.networkState === HTMLMediaElement.NETWORK_EMPTY;
        if (attrSrc !== audioUrl) {
          audioEl.src = audioUrl;
        }
        if (needsExplicitLoad) {
          audioEl.load();
        }
        console.log(
          '[AiAudioTranscriber] <audio> DOM element synchronized with Object URL (AudioContext, sampleRate, channelCount & PCM amplitude summary):',
          {
            objectUrl: audioUrl,
            needsExplicitLoad,
            readyState: audioEl.readyState,
            networkState: audioEl.networkState,
            rawDuration: Number.isNaN(audioEl.duration) ? 'NaN' : String(audioEl.duration),
            audioContextState: audioContextDiag?.state ?? 'closed/idle',
            audioContextSampleRate: audioContextDiag?.rawSampleRate ?? sampleRateRef.current,
            normalizedSampleRate: audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
            trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
            sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
            processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
            wavSampleRate: wavValidation?.sampleRate ?? null,
            wavNumChannels: wavValidation?.numChannels ?? null,
            wavDurationSeconds: wavValidation?.durationSeconds ?? null,
            pcmPeakAmplitude: wavValidation?.peakAmplitude ?? null,
            pcmRmsAmplitude: wavValidation?.rmsAmplitude ?? null,
            pcmNonZeroSampleCount: wavValidation?.nonZeroSampleCount ?? null,
            pcmHasNonZeroAudio: wavValidation?.hasNonZeroAudio ?? null,
          }
        );
      } catch {
        // Ignore load errors in non-DOM test environments
      }
    }
  }, [audioUrl, audioContextDiag, wavValidation]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        if (recordingStartTimestampRef.current > 0) {
          const elapsed = Math.floor((Date.now() - recordingStartTimestampRef.current) / 1000);
          setRecordingTime(elapsed);
        } else {
          setRecordingTime((prev) => prev + 1);
        }
      }, 250);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  /**
   * Verifies whether a single PCM Float32Array buffer or an array of PCM chunks
   * contains non-zero amplitude samples above the noise floor to diagnose silence.
   */
  const verifyPcmBufferNonZeroAmplitude = (
    bufferOrChunks: Float32Array | Float32Array[],
    amplitudeThreshold = 1e-5
  ) => {
    const chunks = Array.isArray(bufferOrChunks) ? bufferOrChunks : [bufferOrChunks];
    let totalSamples = 0;
    let nonZeroSampleCount = 0;
    let audibleSampleCount = 0;
    let minSample = 0;
    let maxSample = 0;
    let peakAmplitude = 0;
    let sumSquares = 0;

    for (const chunk of chunks) {
      totalSamples += chunk.length;
      for (let i = 0; i < chunk.length; i += 1) {
        const val = chunk[i];
        if (!Number.isFinite(val)) continue;
        const abs = Math.abs(val);
        if (abs > 0) nonZeroSampleCount += 1;
        if (abs > amplitudeThreshold) audibleSampleCount += 1;
        if (abs > peakAmplitude) peakAmplitude = abs;
        if (val < minSample) minSample = val;
        if (val > maxSample) maxSample = val;
        sumSquares += val * val;
      }
    }

    const rmsAmplitude = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) : 0;
    const rmsDbFs = rmsAmplitude > 0 ? 20 * Math.log10(rmsAmplitude) : -Infinity;
    const nonZeroRatio = totalSamples > 0 ? nonZeroSampleCount / totalSamples : 0;
    const hasNonZeroSamples = nonZeroSampleCount > 0;
    const hasNonZeroAmplitude = audibleSampleCount > 0 && peakAmplitude > amplitudeThreshold;

    return {
      totalSamples,
      nonZeroSampleCount,
      audibleSampleCount,
      nonZeroRatio,
      minSample,
      maxSample,
      peakAmplitude,
      rmsAmplitude,
      rmsDbFs,
      hasNonZeroSamples,
      hasNonZeroAmplitude,
      isSilent: !hasNonZeroAmplitude,
    };
  };

  const initPcmRecorder = async (stream: MediaStream) => {
    await stopRecordingGraph();

    activeStreamRef.current = stream;
    pcmChunksRef.current = [];
    recordingStartTimestampRef.current = Date.now();
    setInputLevelPeak(0);

    const audioTracks = stream.getAudioTracks();
    const primaryTrack = audioTracks[0];
    const trackSettings = primaryTrack?.getSettings ? primaryTrack.getSettings() : {};

    const streamTrackDiag = {
      trackCount: audioTracks.length,
      label: primaryTrack?.label || 'Default Microphone',
      readyState: primaryTrack?.readyState || 'unknown',
      enabled: primaryTrack?.enabled ?? true,
      muted: primaryTrack?.muted ?? false,
      trackSampleRate: trackSettings.sampleRate ?? 'browser-default',
      trackChannelCount: trackSettings.channelCount ?? 'browser-default',
      trackSampleSize: trackSettings.sampleSize ?? 'browser-default',
      echoCancellation: trackSettings.echoCancellation,
      noiseSuppression: trackSettings.noiseSuppression,
      autoGainControl: trackSettings.autoGainControl,
    };

    console.log(
      '[AiAudioTranscriber] AudioContext lifecycle — MediaStream acquired (monitoring track sampleRate & channelCount):',
      streamTrackDiag
    );
    addLog(
      'info',
      'Microphone stream acquired. Inspecting audio tracks & channel settings...',
      streamTrackDiag
    );

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextCtor();
    audioContextRef.current = context;

    const initialContextState = context.state;
    console.log('[AiAudioTranscriber] AudioContext lifecycle — AudioContext instantiated:', {
      initialState: initialContextState,
      sampleRate: context.sampleRate,
      destinationChannelCount: context.destination.channelCount,
      destinationMaxChannelCount: context.destination.maxChannelCount,
    });

    context.onstatechange = () => {
      console.log('[AiAudioTranscriber] AudioContext lifecycle — onstatechange transition:', {
        currentState: context.state,
        sampleRate: context.sampleRate,
        currentTimeSeconds: Number((context.currentTime || 0).toFixed(3)),
      });
    };

    if (context.state === 'suspended') {
      console.log('[AiAudioTranscriber] AudioContext lifecycle — calling context.resume() from suspended state...');
      await context.resume();
      console.log('[AiAudioTranscriber] AudioContext lifecycle — context.resume() resolved:', {
        stateAfterResume: context.state,
        sampleRate: context.sampleRate,
      });
    }

    const rawSampleRate = Number(context.sampleRate || 44100);
    const normalizedSampleRate = Math.round(rawSampleRate);
    sampleRateRef.current = normalizedSampleRate;

    const source = context.createMediaStreamSource(stream);
    const detectedInputChannels = Math.max(
      1,
      Math.min(2, Number(trackSettings.channelCount) || source.channelCount || 1)
    );
    let processor: ScriptProcessorNode;
    try {
      processor = context.createScriptProcessor(2048, detectedInputChannels, 1);
    } catch {
      processor = context.createScriptProcessor(2048, 1, 1);
    }
    const silentGain = context.createGain();
    silentGain.gain.value = 0;

    sourceNodeRef.current = source;
    processorRef.current = processor;
    silentGainRef.current = silentGain;

    console.log(
      '[AiAudioTranscriber] AudioContext lifecycle — Web Audio nodes created (monitoring sample rates & channel counts):',
      {
        audioContextState: context.state,
        contextSampleRate: context.sampleRate,
        normalizedSampleRate,
        trackSampleRate: trackSettings.sampleRate ?? 'browser-default',
        trackChannelCount: trackSettings.channelCount ?? 'browser-default',
        detectedInputChannels,
        sourceChannelCount: source.channelCount,
        sourceChannelCountMode: source.channelCountMode,
        processorBufferSize: processor.bufferSize,
        processorChannelCount: processor.channelCount,
        processorNumberOfInputs: processor.numberOfInputs,
        processorNumberOfOutputs: processor.numberOfOutputs,
        silentGainValue: silentGain.gain.value,
        destinationChannelCount: context.destination.channelCount,
        destinationMaxChannelCount: context.destination.maxChannelCount,
      }
    );

    let loggedFirstBuffer = false;
    let processedChunkCounter = 0;
    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputBuffer = event.inputBuffer;
      const numChannels = Math.max(1, inputBuffer.numberOfChannels);
      const frameLength = inputBuffer.length;
      const copy = new Float32Array(frameLength);

      const channelAmplitudes: Array<{
        channel: number;
        nonZeroSamples: number;
        peakAmplitude: number;
      }> = [];

      let activeChannelCount = 0;
      for (let ch = 0; ch < numChannels; ch += 1) {
        const chData = inputBuffer.getChannelData(ch);
        let chNonZero = 0;
        let chPeak = 0;
        for (let i = 0; i < frameLength; i += 1) {
          const s = chData[i];
          if (!Number.isFinite(s)) continue;
          const abs = Math.abs(s);
          if (abs > 0) chNonZero += 1;
          if (abs > chPeak) chPeak = abs;
        }
        channelAmplitudes.push({
          channel: ch,
          nonZeroSamples: chNonZero,
          peakAmplitude: Number(chPeak.toFixed(6)),
        });
        if (chNonZero > 0) {
          activeChannelCount += 1;
        }
      }

      if (numChannels === 1) {
        copy.set(inputBuffer.getChannelData(0));
      } else {
        const divisor = Math.max(1, activeChannelCount);
        for (let ch = 0; ch < numChannels; ch += 1) {
          const chData = inputBuffer.getChannelData(ch);
          for (let i = 0; i < frameLength; i += 1) {
            const s = chData[i];
            if (Number.isFinite(s)) {
              copy[i] += s / divisor;
            }
          }
        }
      }

      pcmChunksRef.current.push(copy);
      processedChunkCounter += 1;

      const chunkCheck = verifyPcmBufferNonZeroAmplitude(copy);
      setInputLevelPeak(chunkCheck.peakAmplitude);

      if (!loggedFirstBuffer) {
        loggedFirstBuffer = true;
        const firstBufferDiag = {
          audioContextState: context.state,
          contextSampleRate: context.sampleRate,
          inputBufferSampleRate: inputBuffer.sampleRate,
          inputBufferNumberOfChannels: inputBuffer.numberOfChannels,
          outputBufferNumberOfChannels: event.outputBuffer.numberOfChannels,
          sourceChannelCount: source.channelCount,
          processorChannelCount: processor.channelCount,
          destinationChannelCount: context.destination.channelCount,
          channelAmplitudes,
          inputBufferFrameLength: inputBuffer.length,
          inputBufferByteSizeFloat32: copy.byteLength,
          inputBufferDurationMs: Number((inputBuffer.duration * 1000).toFixed(2)),
          firstChunkNonZeroSamples: chunkCheck.nonZeroSampleCount,
          firstChunkAudibleSamples: chunkCheck.audibleSampleCount,
          firstChunkTotalSamples: chunkCheck.totalSamples,
          firstChunkHasNonZeroAudio: chunkCheck.hasNonZeroSamples,
          firstChunkHasNonZeroAmplitude: chunkCheck.hasNonZeroAmplitude,
          firstChunkIsSilent: chunkCheck.isSilent,
          firstChunkMinSample: Number(chunkCheck.minSample.toFixed(6)),
          firstChunkMaxSample: Number(chunkCheck.maxSample.toFixed(6)),
          firstChunkPeakAmplitude: Number(chunkCheck.peakAmplitude.toFixed(6)),
          firstChunkRmsAmplitude: Number(chunkCheck.rmsAmplitude.toFixed(6)),
          firstChunkRmsDbFs: Number.isFinite(chunkCheck.rmsDbFs)
            ? `${chunkCheck.rmsDbFs.toFixed(2)} dBFS`
            : '-Inf dBFS',
        };
        console.log(
          '[AiAudioTranscriber] First PCM buffer captured — AudioContext state, sampleRate, channels & non-zero amplitude check:',
          firstBufferDiag
        );
        if (chunkCheck.isSilent) {
          console.warn(
            '[AiAudioTranscriber] Silence detected in initial PCM buffer (all samples are zero or below amplitude threshold 1e-5):',
            firstBufferDiag
          );
        }
        addLog(
          'info',
          'First AudioProcessingEvent buffer captured from AudioContext graph:',
          firstBufferDiag
        );
      } else if (processedChunkCounter % 25 === 0) {
        const cumulativeSamples = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
        const progressDiag = {
          chunkIndex: processedChunkCounter,
          audioContextState: context.state,
          contextSampleRate: context.sampleRate,
          inputBufferSampleRate: inputBuffer.sampleRate,
          inputBufferChannels: inputBuffer.numberOfChannels,
          sourceChannelCount: source.channelCount,
          processorChannelCount: processor.channelCount,
          destinationChannelCount: context.destination.channelCount,
          channelAmplitudes,
          chunkNonZeroSamples: chunkCheck.nonZeroSampleCount,
          chunkAudibleSamples: chunkCheck.audibleSampleCount,
          chunkHasNonZeroAmplitude: chunkCheck.hasNonZeroAmplitude,
          chunkIsSilent: chunkCheck.isSilent,
          chunkMinSample: Number(chunkCheck.minSample.toFixed(6)),
          chunkMaxSample: Number(chunkCheck.maxSample.toFixed(6)),
          chunkPeakAmplitude: Number(chunkCheck.peakAmplitude.toFixed(5)),
          chunkRmsAmplitude: Number(chunkCheck.rmsAmplitude.toFixed(5)),
          chunkRmsDbFs: Number.isFinite(chunkCheck.rmsDbFs)
            ? `${chunkCheck.rmsDbFs.toFixed(2)} dBFS`
            : '-Inf dBFS',
          chunkFrameLength: chunkCheck.totalSamples,
          chunkByteSizeFloat32: copy.byteLength,
          cumulativeSamples,
          cumulativeFloat32Bytes: cumulativeSamples * 4,
          cumulativePcm16Bytes: cumulativeSamples * 2,
        };
        console.log(
          `[AiAudioTranscriber] Live PCM capture progress (chunk #${processedChunkCounter}) — state, sampleRate, channels & buffer amplitude:`,
          progressDiag
        );
        addLog(
          'info',
          `Live PCM capture progress (chunk #${processedChunkCounter}):`,
          progressDiag
        );
      }
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);

    if (context.state === 'suspended') {
      await context.resume();
    }

    const ctxDiag = {
      rawSampleRate,
      normalizedSampleRate,
      state: context.state,
      baseLatency: (context as any).baseLatency,
      outputLatency: (context as any).outputLatency,
      trackSampleRate: trackSettings.sampleRate,
      trackChannelCount: trackSettings.channelCount,
      sourceChannelCount: source.channelCount,
      processorChannelCount: processor.channelCount,
      destinationChannelCount: context.destination.channelCount,
      destinationMaxChannelCount: context.destination.maxChannelCount,
    };
    setAudioContextDiag(ctxDiag);

    setAudioMimeType('audio/wav');
    setIsRecording(true);
    setRecordingTime(0);

    console.log('[AiAudioTranscriber] Capture started — AudioContext state, sampleRate & channelCount:', {
      state: context.state,
      initialState: initialContextState,
      sampleRate: context.sampleRate,
      normalizedSampleRate,
      channelCount: source.channelCount,
      sourceChannelCount: source.channelCount,
      processorChannelCount: processor.channelCount,
      destinationChannelCount: context.destination.channelCount,
      destinationMaxChannelCount: context.destination.maxChannelCount,
      trackChannelCount: trackSettings.channelCount ?? 'browser-default',
      trackSampleRate: trackSettings.sampleRate ?? 'browser-default',
    });

    addLog('info', 'AudioContext & Web Audio graph initialized for mono 16-bit PCM WAV capture:', {
      initialContextState,
      activeContextState: context.state,
      rawSampleRate,
      normalizedWavSampleRate: normalizedSampleRate,
      sampleRateMatchesTrack:
        trackSettings.sampleRate !== undefined
          ? trackSettings.sampleRate === normalizedSampleRate
          : 'track-rate-unspecified',
      baseLatencySeconds: (context as any).baseLatency ?? 'n/a',
      outputLatencySeconds: (context as any).outputLatency ?? 'n/a',
      trackSampleRate: trackSettings.sampleRate ?? 'default',
      trackChannelCount: trackSettings.channelCount ?? 'default',
      sourceNodeChannelCount: source.channelCount,
      sourceNodeChannelCountMode: source.channelCountMode,
      sourceNodeChannelInterpretation: source.channelInterpretation,
      processorBufferSize: processor.bufferSize,
      processorChannelCount: processor.channelCount,
      processorNumberOfInputs: processor.numberOfInputs,
      processorNumberOfOutputs: processor.numberOfOutputs,
      destinationChannelCount: context.destination.channelCount,
      destinationMaxChannelCount: context.destination.maxChannelCount,
    });
  };

  const handleStartRecording = async () => {
    clearError();
    setResult(null);
    setWavValidation(null);
    setAudioElementDiag(null);
    setIsRequestingMic(true);
    await stopWebAudioFallbackPlayback();
    resetAudioSource('starting new microphone recording');

    addLog('info', 'User clicked Record Voice. Checking security context & MediaDevices API...');

    if (!window.isSecureContext) {
      const msg =
        'Microphone recording requires a secure HTTPS connection (or localhost). Current page is not running in a secure context.';
      reportError('mic', msg);
      setIsRequestingMic(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg =
        'Your browser does not expose navigator.mediaDevices.getUserMedia. Check if an extension or privacy setting is blocking WebRTC/MediaDevices.';
      reportError('mic', msg);
      setIsRequestingMic(false);
      return;
    }

    const anyDoc = document as any;
    const policy = anyDoc.permissionsPolicy || anyDoc.featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      try {
        const allowedByPolicy = policy.allowsFeature('microphone');
        addLog('info', `Permissions-Policy allowsFeature('microphone'): ${allowedByPolicy}`);
        if (!allowedByPolicy) {
          const msg =
            'Microphone access is blocked by the document Permissions-Policy header or parent <iframe> allow attribute.';
          reportError('mic', msg);
          setIsRequestingMic(false);
          return;
        }
      } catch (e: any) {
        addLog('warn', 'Could not inspect Permissions-Policy API', e?.message);
      }
    }

    try {
      addLog('info', 'Calling navigator.mediaDevices.getUserMedia({ audio: true })...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      await initPcmRecorder(stream);
    } catch (error: any) {
      const errName = error?.name || 'UnknownError';
      const errMsg = error?.message || String(error);

      addLog('error', `getUserMedia failed: ${errName}: ${errMsg}`, {
        name: errName,
        message: errMsg,
        constraint: error?.constraint,
      });

      let friendlyMessage = `Microphone access failed (${errName}: ${errMsg}).`;

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        friendlyMessage =
          'No microphone hardware was detected. Please connect a microphone or headset and try again.';
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        friendlyMessage =
          'Microphone permission was denied by the browser or operating system. If the browser address bar already says "Allowed", check macOS System Settings → Privacy & Security → Microphone (or Windows Privacy → Microphone) and ensure your browser is enabled.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        friendlyMessage =
          'Your microphone hardware is currently locked or in exclusive use by another application (such as Zoom, Teams, or another browser tab).';
      } else if (errName === 'SecurityError') {
        friendlyMessage =
          'Microphone access was blocked by a browser security policy or Permissions-Policy header.';
      }

      reportError('mic', friendlyMessage, { name: errName, message: errMsg });
      setShowDebug(true);
    } finally {
      setIsRequestingMic(false);
    }
  };

  /**
   * Verifies that a constructed WAV Blob has complete, valid 44-byte RIFF/WAVE headers
   * for mono (1-channel) 16-bit Linear PCM before an Object URL is created.
   */
  const verifyMono16BitPcmWavBlob = async (
    blob: Blob,
    expectedSamples: number,
    expectedSampleRate: number
  ): Promise<{ buffer: ArrayBuffer; validation: WavValidationResult }> => {
    if (!blob || blob.size < 44) {
      throw new Error(
        `WAV Blob is incomplete (${blob?.size ?? 0} bytes; minimum 44-byte RIFF/WAVE header required).`
      );
    }

    if (blob.type !== 'audio/wav') {
      throw new Error(`Unexpected WAV Blob MIME type "${blob.type}" (expected "audio/wav").`);
    }

    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const validation = parseAndValidateWav(buffer);

    const expectedDataBytes = expectedSamples * 2;
    const expectedTotalBytes = 44 + expectedDataBytes;
    const expectedByteRate = expectedSampleRate * 2;
    const expectedBlockAlign = 2;

    const headerChecks = {
      hasRiffSignature: validation.riffHeader === 'RIFF',
      hasWaveSignature: validation.waveHeader === 'WAVE',
      hasFmtSignature: validation.fmtHeader === 'fmt ',
      isPcmFmtChunkSize16: validation.fmtChunkSize === 16,
      isLinearPcmAudioFormat1: validation.audioFormat === 1,
      isMonoSingleChannel: validation.numChannels === 1,
      isSampleRateMatched: validation.sampleRate === expectedSampleRate,
      isBitsPerSample16: validation.bitsPerSample === 16,
      isBlockAlign2Bytes:
        validation.blockAlign === expectedBlockAlign && view.getUint16(32, true) === 2,
      isByteRateMatched:
        validation.byteRate === expectedByteRate &&
        view.getUint32(28, true) === expectedByteRate,
      hasDataSignature: validation.dataHeader === 'data',
      isDataSizeMatched:
        validation.dataByteLength === expectedDataBytes &&
        view.getUint32(40, true) === expectedDataBytes,
      isRiffChunkSizeMatched:
        validation.fileSizeField === 36 + expectedDataBytes &&
        view.getUint32(4, true) === 36 + expectedDataBytes,
      isTotalBlobByteSizeMatched:
        blob.size === expectedTotalBytes && buffer.byteLength === expectedTotalBytes,
    };

    const allHeaderChecksPassed = Object.values(headerChecks).every(Boolean);

    const wavBlobInspection = {
      allHeaderChecksPassed,
      valid: validation.valid,
      ...headerChecks,
      blobSizeBytes: blob.size,
      expectedTotalBytes,
      blobMimeType: blob.type,
      sampleRate: validation.sampleRate,
      numChannels: validation.numChannels,
      bitsPerSample: validation.bitsPerSample,
      blockAlign: validation.blockAlign,
      byteRate: validation.byteRate,
      dataByteLength: validation.dataByteLength,
      sampleCount: validation.sampleCount,
      nonZeroSampleCount: validation.nonZeroSampleCount,
      nonZeroPercentage: `${(validation.nonZeroRatio * 100).toFixed(2)}%`,
      hasNonZeroAudio: validation.hasNonZeroAudio,
      firstNonZeroSampleIndex: validation.firstNonZeroSampleIndex,
      peakAmplitude: Number(validation.peakAmplitude.toFixed(5)),
      rmsAmplitude: Number(validation.rmsAmplitude.toFixed(5)),
      durationSeconds: Number(validation.durationSeconds.toFixed(4)),
      headerHexPreview: validation.headerHexPreview,
    };

    console.log(
      '[AiAudioTranscriber] Inspecting WAV Blob creation — 44-byte RIFF/WAVE header & non-zero PCM data verification before playback:',
      wavBlobInspection
    );

    addLog(
      allHeaderChecksPassed && validation.valid ? 'info' : 'error',
      'Pre-ObjectURL Mono 16-bit PCM WAV Byte Header Verification:',
      wavBlobInspection
    );

    if (!validation.valid || !allHeaderChecksPassed) {
      throw new Error(
        validation.error ||
          'WAV Blob failed mono 16-bit PCM byte header verification prior to Object URL creation.'
      );
    }

    return { buffer, validation };
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    addLog('info', 'Stopping PCM/WAV recording...');
    setIsRecording(false);
    setInputLevelPeak(0);

    const elapsedMs =
      recordingStartTimestampRef.current > 0
        ? Date.now() - recordingStartTimestampRef.current
        : recordingTime * 1000;
    const elapsedSeconds = Math.max(0.1, Math.round(elapsedMs / 100) / 10);

    const preStopContext = audioContextRef.current;
    const preStopSource = sourceNodeRef.current;
    const preStopProcessor = processorRef.current;
    const preStopAudioContextSnapshot = {
      audioContextStateBeforeStop: preStopContext?.state ?? audioContextDiag?.state ?? 'none',
      audioContextSampleRate: preStopContext?.sampleRate ?? sampleRateRef.current,
      normalizedSampleRate: audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
      trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
      trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
      sourceChannelCount: preStopSource?.channelCount ?? audioContextDiag?.sourceChannelCount ?? 1,
      processorChannelCount:
        preStopProcessor?.channelCount ?? audioContextDiag?.processorChannelCount ?? 1,
      destinationChannelCount:
        preStopContext?.destination?.channelCount ??
        audioContextDiag?.destinationChannelCount ??
        null,
      destinationMaxChannelCount:
        preStopContext?.destination?.maxChannelCount ??
        audioContextDiag?.destinationMaxChannelCount ??
        null,
    };

    await stopRecordingGraph();

    const chunks = pcmChunksRef.current;
    const stats = computePcmStats(chunks);
    const amplitudeCheck = verifyPcmBufferNonZeroAmplitude(chunks);
    const rawFloat32BufferBytes = stats.totalSamples * 4;
    const targetPcm16BufferBytes = stats.totalSamples * 2;

    const pcmBufferVerification = {
      ...preStopAudioContextSnapshot,
      audioContextStateAfterStop: audioContextRef.current?.state ?? 'closed',
      chunkCount: stats.chunkCount,
      activeChunkCount: stats.activeChunkCount,
      silentChunkCount: stats.silentChunkCount,
      totalSamples: stats.totalSamples,
      rawFloat32BufferBytes,
      targetPcm16BufferBytes,
      nonZeroSampleCount: stats.nonZeroSampleCount,
      audibleSampleCountAbove1e5: amplitudeCheck.audibleSampleCount,
      nonZeroPercentage: `${(stats.nonZeroRatio * 100).toFixed(2)}%`,
      hasNonZeroAudio: stats.hasNonZeroAudio,
      hasNonZeroAmplitudeSamples: amplitudeCheck.hasNonZeroAmplitude,
      minSample: Number(amplitudeCheck.minSample.toFixed(6)),
      maxSample: Number(amplitudeCheck.maxSample.toFixed(6)),
      peakAmplitude: Number(stats.peakAmplitude.toFixed(5)),
      rmsAmplitude: Number(stats.rmsAmplitude.toFixed(5)),
      rmsDbFs: Number.isFinite(stats.rmsDbFs) ? `${stats.rmsDbFs.toFixed(2)} dBFS` : '-Inf dBFS',
      isSilent: stats.isSilent || amplitudeCheck.isSilent,
      elapsedSeconds,
      sampleRate: sampleRateRef.current,
    };

    console.log(
      '[AiAudioTranscriber] Captured PCM buffer size, AudioContext state, sampleRate, channelCount & non-zero amplitude check:',
      pcmBufferVerification
    );

    if (amplitudeCheck.isSilent) {
      console.warn(
        '[AiAudioTranscriber] Silence diagnosed: PCM buffer contains zero or near-zero amplitude samples across the recording.',
        pcmBufferVerification
      );
    }

    addLog('info', 'Captured PCM audio buffer non-zero verification:', pcmBufferVerification);

    if (stats.totalSamples === 0) {
      reportError(
        'recording',
        'No audio samples were captured before stopping. Please record for at least 1 second and verify that your microphone is not muted.',
        stats
      );
      setShowDebug(true);
      return;
    }

    try {
      const targetWavSampleRate = Math.max(8000, Math.min(96000, Math.round(sampleRateRef.current || 44100)));
      const wavNumChannels = 1;
      const wavBitsPerSample = 16;
      const wavBytesPerSample = wavBitsPerSample / 8;
      const wavBlockAlign = wavNumChannels * wavBytesPerSample;
      const wavByteRate = targetWavSampleRate * wavBlockAlign;
      const wavDataByteLength = stats.totalSamples * wavBytesPerSample;
      const wavTotalByteLength = 44 + wavDataByteLength;
      const wavRiffChunkSize = 36 + wavDataByteLength;
      const wavCalculatedDurationSec = wavByteRate > 0 ? wavDataByteLength / wavByteRate : 0;

      const preWavBlobDiagnostic = {
        audioContextSampleRate: sampleRateRef.current,
        targetWavSampleRate,
        numChannels: wavNumChannels,
        bitsPerSample: wavBitsPerSample,
        bytesPerSample: wavBytesPerSample,
        blockAlign: wavBlockAlign,
        byteRate: wavByteRate,
        chunkCount: stats.chunkCount,
        totalPcmSamples: stats.totalSamples,
        rawFloat32ByteLength: rawFloat32BufferBytes,
        pcm16DataByteLength: wavDataByteLength,
        wavHeaderByteLength: 44,
        riffChunkSizeField: wavRiffChunkSize,
        totalWavByteLength: wavTotalByteLength,
        calculatedDurationSeconds: Number(wavCalculatedDurationSec.toFixed(4)),
        hasNonZeroAudio: stats.hasNonZeroAudio,
        hasNonZeroAmplitudeSamples: amplitudeCheck.hasNonZeroAmplitude,
        nonZeroSampleCount: stats.nonZeroSampleCount,
        audibleSampleCount: amplitudeCheck.audibleSampleCount,
        peakAmplitude: Number(stats.peakAmplitude.toFixed(6)),
        rmsAmplitude: Number(stats.rmsAmplitude.toFixed(6)),
        isSilent: stats.isSilent || amplitudeCheck.isSilent,
      };

      console.log(
        '[AiAudioTranscriber] Pre-WAV Blob creation — calculated PCM buffer size, sampleRate, channelCount & amplitude verification:',
        preWavBlobDiagnostic
      );

      addLog('info', 'WAV Header Generation Step 1 — Calculated PCM & RIFF/WAVE layout parameters:', {
        audioContextSampleRate: sampleRateRef.current,
        targetWavSampleRate,
        numChannels: wavNumChannels,
        bitsPerSample: wavBitsPerSample,
        bytesPerSample: wavBytesPerSample,
        blockAlign: wavBlockAlign,
        byteRate: wavByteRate,
        totalPcmSamples: stats.totalSamples,
        dataByteLength: wavDataByteLength,
        riffChunkSizeField: wavRiffChunkSize,
        totalWavByteLength: wavTotalByteLength,
        calculatedDurationSeconds: Number(wavCalculatedDurationSec.toFixed(4)),
      });

      addLog('info', 'WAV Header Generation Step 2 — Writing 44-byte RIFF/WAVE header fields (little-endian):', {
        'offset[0..3] ChunkID': '"RIFF" (0x52494646)',
        'offset[4..7] ChunkSize (36 + Subchunk2Size)': wavRiffChunkSize,
        'offset[8..11] Format': '"WAVE" (0x57415645)',
        'offset[12..15] Subchunk1ID': '"fmt " (0x666d7420)',
        'offset[16..19] Subchunk1Size (PCM)': 16,
        'offset[20..21] AudioFormat (Linear PCM)': 1,
        'offset[22..23] NumChannels (Mono)': wavNumChannels,
        'offset[24..27] SampleRate (Hz)': targetWavSampleRate,
        'offset[28..31] ByteRate (SampleRate * NumChannels * BitsPerSample/8)': wavByteRate,
        'offset[32..33] BlockAlign (NumChannels * BitsPerSample/8)': wavBlockAlign,
        'offset[34..35] BitsPerSample': wavBitsPerSample,
        'offset[36..39] Subchunk2ID': '"data" (0x64617461)',
        'offset[40..43] Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)': wavDataByteLength,
        'offset[44..end] PCM Payload Range': `44..${wavTotalByteLength - 1} (${wavDataByteLength} bytes)`,
      });

      const blob = encodeWav(chunks, targetWavSampleRate);
      const { buffer, validation } = await verifyMono16BitPcmWavBlob(
        blob,
        stats.totalSamples,
        targetWavSampleRate
      );
      setWavValidation(validation);

      // Inspect raw Int16 samples inside the encoded WAV buffer to verify non-zero audio data
      const pcmView = new DataView(buffer);
      let clampedSampleCount = 0;
      for (const chunk of chunks) {
        for (let i = 0; i < chunk.length; i += 1) {
          if (chunk[i] > 1.0 || chunk[i] < -1.0) {
            clampedSampleCount += 1;
          }
        }
      }
      let minInt16Sample = 0;
      let maxInt16Sample = 0;
      let lastNonZeroSampleIndex = -1;
      for (let i = 0; i < validation.sampleCount; i += 1) {
        const byteOffset = 44 + i * 2;
        if (byteOffset + 1 >= buffer.byteLength) break;
        const s16 = pcmView.getInt16(byteOffset, true);
        if (s16 !== 0) {
          lastNonZeroSampleIndex = i;
        }
        if (s16 < minInt16Sample) minInt16Sample = s16;
        if (s16 > maxInt16Sample) maxInt16Sample = s16;
      }

      const finalizedWavBlobDiagnostic = {
        blobSizeBytes: blob.size,
        expectedTotalBytes: wavTotalByteLength,
        byteSizeExactMatch: blob.size === wavTotalByteLength,
        blobMimeType: blob.type,
        sampleRate: validation.sampleRate,
        numChannels: validation.numChannels,
        bitsPerSample: validation.bitsPerSample,
        dataByteLength: validation.dataByteLength,
        durationSeconds: Number(validation.durationSeconds.toFixed(4)),
        clampedFloatSamplesCount: clampedSampleCount,
        minInt16Value: minInt16Sample,
        maxInt16Value: maxInt16Sample,
        firstNonZeroSampleIndex: validation.firstNonZeroSampleIndex,
        lastNonZeroSampleIndex,
        nonZeroSampleCount: validation.nonZeroSampleCount,
        totalSampleCount: validation.sampleCount,
        nonZeroPercentage: `${(validation.nonZeroRatio * 100).toFixed(2)}%`,
        hasValidNonZeroAudioData: validation.valid && validation.hasNonZeroAudio && blob.size > 44,
      };

      console.log(
        '[AiAudioTranscriber] WAV Blob finalized & verified (16-bit mono PCM):',
        finalizedWavBlobDiagnostic
      );

      addLog('info', 'WAV Header Generation Step 3 — Encoded 16-bit signed PCM payload & verified Blob:', finalizedWavBlobDiagnostic);

      addLog('info', 'WAV Header Integrity Check (44-byte RIFF/WAVE inspection):', {
        valid: validation.valid,
        error: validation.error ?? null,
        riffHeader: validation.riffHeader,
        fileSizeField: validation.fileSizeField,
        actualByteLength: validation.actualByteLength,
        expectedFileSizeField: 36 + validation.dataByteLength,
        waveHeader: validation.waveHeader,
        fmtHeader: validation.fmtHeader,
        fmtChunkSize: validation.fmtChunkSize,
        audioFormat: `${validation.audioFormat} (1 = Linear PCM)`,
        numChannels: validation.numChannels,
        sampleRate: validation.sampleRate,
        byteRate: validation.byteRate,
        expectedByteRate: validation.expectedByteRate,
        blockAlign: validation.blockAlign,
        expectedBlockAlign: validation.expectedBlockAlign,
        bitsPerSample: validation.bitsPerSample,
        dataHeader: validation.dataHeader,
        dataByteLength: validation.dataByteLength,
        sampleCount: validation.sampleCount,
        durationSeconds: Number(validation.durationSeconds.toFixed(3)),
        headerHexPreview: validation.headerHexPreview,
      });

      addLog('info', 'Encoded WAV Blob Non-Zero Audio Payload Verification:', {
        blobSizeBytes: blob.size,
        blobMimeType: blob.type,
        int16SampleCount: validation.sampleCount,
        int16NonZeroSampleCount: validation.nonZeroSampleCount,
        int16NonZeroPercentage: `${(validation.nonZeroRatio * 100).toFixed(2)}%`,
        hasNonZeroAudio: validation.hasNonZeroAudio,
        firstNonZeroSampleIndex: validation.firstNonZeroSampleIndex,
        lastNonZeroSampleIndex,
        minInt16Sample,
        maxInt16Sample,
        peakAmplitude: Number(validation.peakAmplitude.toFixed(5)),
        rmsAmplitude: Number(validation.rmsAmplitude.toFixed(5)),
      });

      if (!validation.hasNonZeroAudio || stats.isSilent) {
        addLog(
          'warn',
          'Captured WAV blob contains all-zero or near-zero audio samples (silence). Check if your microphone hardware mute switch or OS input volume is muted.',
          {
            hasNonZeroAudio: validation.hasNonZeroAudio,
            nonZeroSampleCount: validation.nonZeroSampleCount,
            peakAmplitude: validation.peakAmplitude,
          }
        );
      }

      // Probe decodeAudioData on a copy of the WAV buffer to confirm browser decoder compatibility
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const probeCtx = new AudioContextCtor();
        try {
          const decodedProbe = await probeCtx.decodeAudioData(buffer.slice(0));
          const probeDiag = {
            probeAudioContextState: probeCtx.state,
            probeAudioContextSampleRate: probeCtx.sampleRate,
            probeDestinationChannelCount: probeCtx.destination.channelCount,
            decodedSampleRate: decodedProbe.sampleRate,
            decodedNumberOfChannels: decodedProbe.numberOfChannels,
            decodedFrameLength: decodedProbe.length,
            decodedPcmFloat32Bytes: decodedProbe.length * 4,
            wavPcm16DataByteLength: validation.dataByteLength,
            decodedDurationSeconds: Number(decodedProbe.duration.toFixed(3)),
            wavHeaderDurationSeconds: Number(validation.durationSeconds.toFixed(3)),
            wallClockElapsedSeconds: elapsedSeconds,
            durationDeltaSeconds: Number(
              Math.abs(decodedProbe.duration - validation.durationSeconds).toFixed(4)
            ),
          };
          console.log(
            '[AiAudioTranscriber] AudioContext decodeAudioData() duration & sampleRate verification probe on WAV Blob:',
            probeDiag
          );
          addLog('info', 'Web Audio decodeAudioData() verification probe succeeded on WAV Blob:', probeDiag);
        } finally {
          await probeCtx.close().catch(() => {});
        }
      } catch (decodeProbeErr: any) {
        console.error(
          '[AiAudioTranscriber] AudioContext decodeAudioData() verification probe failed on WAV Blob:',
          decodeProbeErr
        );
        addLog('error', 'Web Audio decodeAudioData() verification probe failed on WAV Blob:', {
          message: decodeProbeErr?.message || String(decodeProbeErr),
        });
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const fileName = `voice-recording-${timestamp}.wav`;
      const nextUrl = assignAudioSourceFromBlob(
        blob,
        fileName,
        'audio/wav',
        'recorded mono 16-bit PCM WAV'
      );
      setRecordingTime(Math.max(1, Math.round(validation.durationSeconds)));

      const completionDiag = {
        sizeBytes: blob.size,
        pcm16DataByteLength: validation.dataByteLength,
        mimeType: blob.type,
        sampleRate: validation.sampleRate,
        channels: validation.numChannels,
        bitsPerSample: validation.bitsPerSample,
        durationSeconds: Number(validation.durationSeconds.toFixed(2)),
        hasNonZeroAudio: validation.hasNonZeroAudio,
        nonZeroSampleCount: validation.nonZeroSampleCount,
        peakAmplitude: Number(validation.peakAmplitude.toFixed(4)),
        objectUrl: nextUrl,
      };
      console.log(
        '[AiAudioTranscriber] Recording complete — assigned verified WAV Blob Object URL to <audio>:',
        completionDiag
      );
      addLog('info', 'Recording complete. Validated WAV Blob and assigned Object URL to <audio>.', completionDiag);
    } catch (err: any) {
      reportError(
        'recording',
        `Failed to encode WAV audio: ${err?.message || String(err)}`,
        err
      );
      setShowDebug(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    clearError();
    setResult(null);
    setWavValidation(null);
    setAudioElementDiag(null);
    await stopWebAudioFallbackPlayback();
    resetAudioSource('processing newly uploaded audio file');

    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/aac',
      'audio/flac',
    ];
    const isAudioExt = /\.(mp3|wav|webm|ogg|m4a|mp4|aac|flac)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !file.type.startsWith('audio/') && !isAudioExt) {
      reportError(
        'upload',
        `Unsupported file format (${file.type || file.name}). Please upload a valid audio file (WAV, MP3, M4A, WebM, OGG, AAC, or FLAC).`
      );
      return;
    }

    if (file.size === 0) {
      reportError('upload', 'The selected audio file is empty (0 bytes).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      reportError('upload', 'Audio file exceeds the 20 MB maximum size limit.');
      return;
    }

    await stopRecordingGraph();
    pcmChunksRef.current = [];
    setRecordingTime(0);

    if (file.type.includes('wav') || /\.wav$/i.test(file.name)) {
      try {
        const buf = await file.arrayBuffer();
        const wavCheck = parseAndValidateWav(buf);
        setWavValidation(wavCheck);
        const uploadedWavDiag = {
          fileName: file.name,
          fileSizeBytes: file.size,
          valid: wavCheck.valid,
          sampleRate: wavCheck.sampleRate,
          numChannels: wavCheck.numChannels,
          bitsPerSample: wavCheck.bitsPerSample,
          byteRate: wavCheck.byteRate,
          blockAlign: wavCheck.blockAlign,
          dataByteLength: wavCheck.dataByteLength,
          sampleCount: wavCheck.sampleCount,
          durationSeconds: Number(wavCheck.durationSeconds.toFixed(3)),
          hasNonZeroAudio: wavCheck.hasNonZeroAudio,
          nonZeroSampleCount: wavCheck.nonZeroSampleCount,
          nonZeroPercentage: `${(wavCheck.nonZeroRatio * 100).toFixed(2)}%`,
          peakAmplitude: Number(wavCheck.peakAmplitude.toFixed(5)),
          rmsAmplitude: Number(wavCheck.rmsAmplitude.toFixed(5)),
          headerHexPreview: wavCheck.headerHexPreview,
        };
        console.log(
          '[AiAudioTranscriber] Uploaded WAV file header, sampleRate, channelCount & PCM buffer amplitude inspection:',
          uploadedWavDiag
        );
        addLog('info', 'Uploaded WAV file header & non-zero payload inspection:', uploadedWavDiag);
      } catch {
        // Non-standard WAV chunks will still decode via decodeAudioData
      }
    }

    const nextUrl = assignAudioSourceFromBlob(
      file,
      file.name,
      file.type || 'audio/mp3',
      `uploaded file (${file.name})`
    );

    addLog('info', `Loaded uploaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`, {
      name: file.name,
      type: file.type,
      size: file.size,
      objectUrl: nextUrl,
    });
  };

  const clearAudio = () => {
    void stopRecordingGraph();
    void stopWebAudioFallbackPlayback();
    pcmChunksRef.current = [];
    resetAudioSource('user clicked Clear Audio');
    setAudioFileName('');
    setWavValidation(null);
    setAudioElementDiag(null);
    setAudioContextDiag(null);
    setResult(null);
    clearError();
    setRecordingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addLog('info', 'Cleared audio buffer and revoked previous Object URL.');
  };

  const handleAudioElementEvent = (
    eventName: string,
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    const el = e.currentTarget;
    const diag = extractAudioElementDiagnostics(eventName, el);
    setAudioElementDiag(diag);

    const bufferedRanges: string[] = [];
    try {
      for (let i = 0; i < el.buffered.length; i += 1) {
        bufferedRanges.push(
          `${el.buffered.start(i).toFixed(2)}s-${el.buffered.end(i).toFixed(2)}s`
        );
      }
    } catch {
      // Ignore buffered range inspection errors
    }

    const seekableRanges: string[] = [];
    try {
      for (let i = 0; i < el.seekable.length; i += 1) {
        seekableRanges.push(
          `${el.seekable.start(i).toFixed(2)}s-${el.seekable.end(i).toFixed(2)}s`
        );
      }
    } catch {
      // Ignore seekable range inspection errors
    }

    const audioContextAndPcmSummary = {
      audioContextState: audioContextDiag?.state ?? 'closed/idle',
      audioContextRawSampleRate: audioContextDiag?.rawSampleRate ?? sampleRateRef.current,
      audioContextNormalizedSampleRate:
        audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
      trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
      trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
      sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
      processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
      destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
      wavHeaderValid: wavValidation?.valid ?? null,
      wavSampleRate: wavValidation?.sampleRate ?? null,
      wavNumChannels: wavValidation?.numChannels ?? null,
      wavBitsPerSample: wavValidation?.bitsPerSample ?? null,
      wavByteRate: wavValidation?.byteRate ?? null,
      wavDataByteLength: wavValidation?.dataByteLength ?? null,
      wavDurationSeconds: wavValidation
        ? Number(wavValidation.durationSeconds.toFixed(3))
        : null,
      pcmHasNonZeroAudio: wavValidation?.hasNonZeroAudio ?? null,
      pcmNonZeroSampleCount: wavValidation?.nonZeroSampleCount ?? null,
      pcmNonZeroPercentage: wavValidation
        ? `${(wavValidation.nonZeroRatio * 100).toFixed(2)}%`
        : null,
      pcmPeakAmplitude: wavValidation ? Number(wavValidation.peakAmplitude.toFixed(5)) : null,
      pcmRmsAmplitude: wavValidation ? Number(wavValidation.rmsAmplitude.toFixed(5)) : null,
    };

    if (eventName === 'error') {
      const errText =
        diag.humanError ||
        'Audio player encountered an error loading the audio stream. Use "Play via Web Audio" below or inspect the Debug Log.';
      const errorPayload = {
        ...diag,
        bufferedRanges,
        seekableRanges,
        ...audioContextAndPcmSummary,
      };
      console.error(
        `[AiAudioTranscriber] <audio> element playback error on '${eventName}' (with AudioContext & PCM amplitude diagnostics):`,
        errorPayload
      );
      reportError('playback', errText, errorPayload);
      setShowDebug(true);
      return;
    }

    if (
      (eventName === 'loadedmetadata' || eventName === 'durationchange') &&
      el.duration === Infinity
    ) {
      console.warn(
        `[AiAudioTranscriber] <audio> reported Infinity duration on '${eventName}'; seeking to end of stream to force finite duration calculation.`,
        audioContextAndPcmSummary
      );
      try {
        el.currentTime = 1e101;
        const resetToZero = () => {
          el.removeEventListener('timeupdate', resetToZero);
          try {
            el.currentTime = 0;
          } catch {
            // Ignore seek reset errors
          }
        };
        el.addEventListener('timeupdate', resetToZero);
      } catch {
        // Ignore seek errors
      }
    }

    const isZeroOrInvalidDuration =
      (eventName === 'loadedmetadata' ||
        eventName === 'durationchange' ||
        eventName === 'canplay') &&
      (diag.duration === null || diag.duration <= 0);

    if (isZeroOrInvalidDuration) {
      const zeroDurationDiag = {
        eventName,
        audioElementRawDuration: diag.rawDuration,
        audioElementParsedDuration: diag.duration,
        readyState: diag.readyStateLabel,
        networkState: diag.networkStateLabel,
        bufferedRanges,
        seekableRanges,
        currentSrc: diag.src,
        ...audioContextAndPcmSummary,
      };
      console.warn(
        `[AiAudioTranscriber] <audio> 0:00 duration diagnostic — reported '${diag.rawDuration}' on '${eventName}' (AudioContext state, sampleRate, channelCount & PCM amplitude):`,
        zeroDurationDiag
      );
      addLog(
        'warn',
        `<audio> reported '${diag.rawDuration}' duration on '${eventName}' (diagnosing '0:00 / 0:00' player state):`,
        zeroDurationDiag
      );
    } else if (
      eventName === 'loadstart' ||
      eventName === 'loadedmetadata' ||
      eventName === 'loadeddata' ||
      eventName === 'durationchange' ||
      eventName === 'canplay' ||
      eventName === 'canplaythrough' ||
      eventName === 'play' ||
      eventName === 'playing' ||
      eventName === 'ended'
    ) {
      const audioEventDiag = {
        currentSrc: diag.src,
        duration: diag.duration,
        rawDuration: diag.rawDuration,
        readyState: diag.readyStateLabel,
        networkState: diag.networkStateLabel,
        bufferedRanges,
        seekableRanges,
        canPlayWav: diag.canPlayWav,
        paused: diag.paused,
        muted: diag.muted,
        volume: diag.volume,
        ...audioContextAndPcmSummary,
      };
      console.log(
        `[AiAudioTranscriber] <audio> element event '${eventName}' (duration, AudioContext sampleRate/channels & PCM amplitude check):`,
        audioEventDiag
      );
      addLog('info', `<audio> element lifecycle event: ${eventName}`, audioEventDiag);
    }
  };

  const handlePlayViaWebAudio = async () => {
    if (!audioBlob) return;

    if (isWebAudioPlaying) {
      await stopWebAudioFallbackPlayback();
      addLog('info', 'Stopped direct Web Audio playback.');
      return;
    }

    try {
      clearError();
      await stopWebAudioFallbackPlayback();

      const arrayBuffer = await audioBlob.arrayBuffer();
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextCtor();
      webAudioPlaybackContextRef.current = ctx;

      console.log('[AiAudioTranscriber] AudioContext lifecycle (Web Audio playback) — created AudioContext:', {
        initialState: ctx.state,
        sampleRate: ctx.sampleRate,
        destinationChannelCount: ctx.destination.channelCount,
        destinationMaxChannelCount: ctx.destination.maxChannelCount,
        blobSizeBytes: audioBlob.size,
      });

      if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[AiAudioTranscriber] AudioContext lifecycle (Web Audio playback) — resumed AudioContext:', {
          stateAfterResume: ctx.state,
          sampleRate: ctx.sampleRate,
        });
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      let playbackNonZeroSamples = 0;
      let playbackPeak = 0;
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
        const chData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < chData.length; i += 1) {
          const abs = Math.abs(chData[i]);
          if (abs > 0) playbackNonZeroSamples += 1;
          if (abs > playbackPeak) playbackPeak = abs;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      setIsWebAudioPlaying(true);
      const playbackDiag = {
        playbackAudioContextSampleRate: ctx.sampleRate,
        playbackAudioContextState: ctx.state,
        destinationChannelCount: ctx.destination.channelCount,
        destinationMaxChannelCount: ctx.destination.maxChannelCount,
        decodedBufferSampleRate: audioBuffer.sampleRate,
        decodedBufferChannels: audioBuffer.numberOfChannels,
        decodedBufferFrameLength: audioBuffer.length,
        decodedPcmFloat32Bytes: audioBuffer.length * audioBuffer.numberOfChannels * 4,
        durationSeconds: Number(audioBuffer.duration.toFixed(3)),
        nonZeroSamples: playbackNonZeroSamples,
        hasNonZeroAudio: playbackNonZeroSamples > 0,
        peakAmplitude: Number(playbackPeak.toFixed(5)),
      };
      console.log(
        '[AiAudioTranscriber] AudioContext lifecycle (Web Audio playback) — starting AudioBufferSourceNode:',
        playbackDiag
      );
      addLog('info', 'Playing audio directly via Web Audio API AudioBufferSourceNode:', playbackDiag);

      source.onended = () => {
        setIsWebAudioPlaying(false);
        void ctx.close().catch(() => {});
        if (webAudioPlaybackContextRef.current === ctx) {
          webAudioPlaybackContextRef.current = null;
        }
      };

      source.start(0);
    } catch (err: any) {
      setIsWebAudioPlaying(false);
      reportError(
        'playback',
        `Direct Web Audio playback failed: ${err?.message || String(err)}`,
        err
      );
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setModelLoadProgress(null);
    setProcessingStatus('Preparing audio for local transcription...');
    clearError();

    try {
      addLog(
        'info',
        `Starting local browser transcription (${Math.round(audioBlob.size / 1024)} KB, ${audioMimeType})...`,
        {
          selectedLanguage,
          selectedModelId,
        }
      );

      const decoded = await decodeAudioBlobToMono16k(audioBlob, addLog);
      if (decoded.samples.length === 0) {
        throw new Error('The recorded or uploaded audio contains 0 decodable audio samples.');
      }

      let activeModelId = selectedModelId;
      let transcriber: any;

      try {
        transcriber = await loadWhisperPipeline(
          activeModelId,
          addLog,
          (statusText, pct) => {
            setProcessingStatus(statusText);
            if (pct !== undefined) setModelLoadProgress(pct);
          }
        );
      } catch (primaryModelErr: any) {
        if (activeModelId !== FALLBACK_WHISPER_MODEL_ID) {
          addLog(
            'warn',
            `Primary model (${activeModelId}) failed to load (${primaryModelErr?.message}). Falling back to ${FALLBACK_WHISPER_MODEL_ID}...`
          );
          activeModelId = FALLBACK_WHISPER_MODEL_ID;
          setSelectedModelId(FALLBACK_WHISPER_MODEL_ID);
          transcriber = await loadWhisperPipeline(
            activeModelId,
            addLog,
            (statusText, pct) => {
              setProcessingStatus(statusText);
              if (pct !== undefined) setModelLoadProgress(pct);
            }
          );
        } else {
          throw primaryModelErr;
        }
      }

      const langMeta = SUPPORTED_TRANSCRIPTION_LANGUAGES.find(
        (l) => l.code === selectedLanguage
      );
      const inferenceOptions = buildWhisperTranscriptionOptions(selectedLanguage);

      setModelLoadProgress(null);
      setProcessingStatus(
        selectedLanguage === 'auto'
          ? 'Transcribing speech in browser (Auto-detecting language)...'
          : `Transcribing ${langMeta?.label || selectedLanguage} speech in browser...`
      );

      addLog('info', 'Running local Whisper transcription with options:', {
        model: activeModelId,
        ...inferenceOptions,
      });

      const output = await transcriber(decoded.samples, inferenceOptions);

      const transcript = String(output?.text || '').trim();
      const { summary, actionItems } = summarizeTranscript(transcript);

      setResult({
        transcript: transcript || 'No clear speech was detected in the audio.',
        summary,
        actionItems,
        detectedLanguage:
          selectedLanguage === 'auto'
            ? 'Auto-detected (Multilingual Whisper)'
            : `${langMeta?.label || selectedLanguage} (${langMeta?.nativeName || selectedLanguage})`,
        modelUsed: activeModelId,
      });

      addLog('info', 'Local transcription and summary completed successfully.', {
        model: activeModelId,
        languageMode: selectedLanguage,
        transcriptLength: transcript.length,
      });
    } catch (err: any) {
      const rawMessage = err?.message || String(err);
      const isModelFetchFailure =
        /fetch|network|import|huggingface|esm\.sh|wasm|onnx|csp/i.test(rawMessage);

      if (isModelFetchFailure) {
        reportError(
          'model',
          `Failed to download or initialize the local Whisper speech model (${rawMessage}). Check your internet connection or disable strict content blockers for huggingface.co / esm.sh, then click Retry.`,
          err
        );
      } else {
        reportError(
          'transcription',
          rawMessage || 'An unexpected error occurred while transcribing your audio.',
          err
        );
      }
      setShowDebug(true);
    } finally {
      setIsProcessing(false);
      setModelLoadProgress(null);
    }
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const content = [
      '=== AI AUDIO TRANSCRIPTION & SUMMARY ===',
      `Source: ${audioFileName || 'Audio Recording'}`,
      `Language Mode: ${result.detectedLanguage || 'Auto-detect'}`,
      `Model: ${result.modelUsed || selectedModelId}`,
      `Date: ${new Date().toLocaleString()}`,
      '',
      '--- EXECUTIVE SUMMARY ---',
      result.summary,
      '',
      '--- ACTION ITEMS & KEY TAKEAWAYS ---',
      ...(result.actionItems.length > 0
        ? result.actionItems.map((item, i) => `${i + 1}. ${item}`)
        : ['None identified.']),
      '',
      '--- FULL TRANSCRIPT ---',
      result.transcript,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const selectedLanguageMeta =
    SUPPORTED_TRANSCRIPTION_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_TRANSCRIPTION_LANGUAGES[0];

  const verifiedDurationSeconds =
    wavValidation?.durationSeconds ??
    audioElementDiag?.duration ??
    (recordingTime > 0 ? recordingTime : null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link
              to="/tools"
              className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ← Back to All Tools
            </Link>
            <button
              type="button"
              onClick={() => setShowDebug((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              {showDebug ? 'Hide Diagnostics' : 'Audio & Mic Diagnostics'}
              {showDebug ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                AI Audio Transcriber & Summarizer
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-1">
                Record live voice notes or upload audio files for 100% local, private multilingual
                transcription, executive summaries, and action items.
              </p>
            </div>
          </div>
        </div>

        {/* Multilingual & Model Settings Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spoken Language Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="transcription-language"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                <Globe className="w-4 h-4 text-indigo-400" />
                Spoken Language (Original Script Output)
              </label>
              <select
                id="transcription-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <optgroup label="Automatic Detection">
                  {SUPPORTED_TRANSCRIPTION_LANGUAGES.filter((l) => l.group === 'auto').map(
                    (lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Indian & South Asian Languages">
                  {SUPPORTED_TRANSCRIPTION_LANGUAGES.filter((l) => l.group === 'indian').map(
                    (lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.nativeName})
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="International Languages">
                  {SUPPORTED_TRANSCRIPTION_LANGUAGES.filter((l) => l.group === 'global').map(
                    (lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.nativeName})
                      </option>
                    )
                  )}
                </optgroup>
              </select>
            </div>

            {/* Whisper Model Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="whisper-model-select"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                <Cpu className="w-4 h-4 text-indigo-400" />
                Local Whisper AI Model
              </label>
              <select
                id="whisper-model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {WHISPER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} [{m.approxDownloadSize}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <span>
              <strong className="text-slate-300">Language Note:</strong>{' '}
              {selectedLanguageMeta.accuracyNote}
            </span>
            <span className="text-emerald-400/90 font-medium">
              100% Local Browser Inference • Zero Server Uploads
            </span>
          </div>
        </div>

        {/* Collapsible Environment & Audio Lifecycle Diagnostics Panel */}
        {showDebug && (
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-5 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-semibold text-indigo-400 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Browser Audio, WAV Header & Playback Diagnostics
              </span>
              <button
                type="button"
                onClick={() => setDebugLogs([])}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Clear Log
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Secure Context (HTTPS)</div>
                <div
                  className={
                    envInfo.isSecureContext
                      ? 'text-emerald-400 font-bold'
                      : 'text-red-400 font-bold'
                  }
                >
                  {String(envInfo.isSecureContext)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">getUserMedia API</div>
                <div
                  className={
                    envInfo.hasGetUserMedia
                      ? 'text-emerald-400 font-bold'
                      : 'text-red-400 font-bold'
                  }
                >
                  {envInfo.hasGetUserMedia ? 'Available' : 'Missing'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Permission State</div>
                <div className="text-amber-300 font-bold">{envInfo.permissionState}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">AudioContext Rate &amp; Ch</div>
                <div className="text-indigo-300 font-bold">
                  {audioContextDiag
                    ? `${audioContextDiag.normalizedSampleRate}Hz • src:${audioContextDiag.sourceChannelCount}ch → proc:${audioContextDiag.processorChannelCount}ch`
                    : 'Idle'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">WAV Header Integrity</div>
                <div
                  className={
                    wavValidation
                      ? wavValidation.valid
                        ? 'text-emerald-400 font-bold'
                        : 'text-red-400 font-bold'
                      : 'text-slate-400'
                  }
                >
                  {wavValidation
                    ? wavValidation.valid
                      ? `VALID (${wavValidation.sampleRate}Hz, ${wavValidation.numChannels}ch, ${wavValidation.bitsPerSample}b)`
                      : `INVALID (${wavValidation.error})`
                    : 'No WAV loaded'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Blob Non-Zero Audio</div>
                <div
                  className={
                    wavValidation
                      ? wavValidation.hasNonZeroAudio
                        ? 'text-emerald-400 font-bold'
                        : 'text-amber-400 font-bold'
                      : 'text-slate-400'
                  }
                >
                  {wavValidation
                    ? wavValidation.hasNonZeroAudio
                      ? `NON-ZERO (${(wavValidation.nonZeroRatio * 100).toFixed(1)}%, peak ${wavValidation.peakAmplitude.toFixed(3)})`
                      : 'ALL ZERO (SILENT)'
                    : 'N/A'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">&lt;audio&gt; ReadyState</div>
                <div className="text-slate-300 font-bold">
                  {audioElementDiag ? audioElementDiag.readyStateLabel : 'Not initialized'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-500">&lt;audio&gt; Duration</div>
                <div className="text-slate-300 font-bold">
                  {audioElementDiag
                    ? `${formatDurationDisplay(audioElementDiag.duration)} (raw: ${audioElementDiag.rawDuration})`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1.5">
              {debugLogs.length === 0 ? (
                <div className="text-slate-500">No events logged yet.</div>
              ) : (
                debugLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    <span
                      className={
                        log.level === 'error'
                          ? 'text-red-400 font-semibold'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-indigo-300'
                      }
                    >
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    <span className="text-slate-200">{log.message}</span>
                    {log.details && (
                      <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-400 overflow-x-auto text-[11px]">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Audio Capture & Upload Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Record Voice Box */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-4">
              <div
                className={`p-4 rounded-full transition-colors ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}
              >
                <Mic className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-white text-lg">
                  {isRecording
                    ? 'Recording in Progress...'
                    : isRequestingMic
                    ? 'Requesting Microphone...'
                    : 'Record Voice Note'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRecording
                    ? `Elapsed: ${formatDurationDisplay(recordingTime)} • Peak level: ${Math.min(
                        100,
                        Math.round(inputLevelPeak * 140)
                      )}%`
                    : 'Use your microphone to record mono 16-bit PCM WAV directly in the browser'}
                </p>
              </div>

              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessing || isRequestingMic}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {isRequestingMic ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for Mic...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Record Voice
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void stopRecording()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording ({formatDurationDisplay(recordingTime)})
                </button>
              )}
            </div>

            {/* Upload Audio File Box */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-4">
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-white text-lg">Upload Audio File</h2>
                <p className="text-xs text-slate-400">
                  Supports WAV, MP3, M4A, WebM, OGG, AAC & FLAC (Max 20 MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                onChange={(e) => void handleFileUpload(e)}
                className="hidden"
                id="audio-upload-input"
              />
              <label
                htmlFor="audio-upload-input"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition-all cursor-pointer border border-slate-700 ${
                  isRecording || isProcessing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <FileAudio className="w-4 h-4 text-emerald-400" />
                Choose Audio File
              </label>
            </div>
          </div>

          {/* Active Audio Preview & Action Bar */}
          {audioUrl && (
            <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{audioFileName}</p>
                      {verifiedDurationSeconds !== null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          Duration: {formatDurationDisplay(verifiedDurationSeconds)}
                        </span>
                      )}
                      {wavValidation?.valid && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {wavValidation.sampleRate} Hz • {wavValidation.numChannels}ch 16-bit PCM WAV •{' '}
                          {Math.max(1, Math.round(wavValidation.actualByteLength / 1024))} KB •{' '}
                          {wavValidation.hasNonZeroAudio ? 'Non-Zero Signal' : 'Silent Signal'}
                        </span>
                      )}
                    </div>

                    <audio
                      key={audioUrl}
                      ref={audioPlayerRef}
                      src={audioUrl}
                      controls
                      preload="auto"
                      onLoadStart={(e) => handleAudioElementEvent('loadstart', e)}
                      onLoadedMetadata={(e) => handleAudioElementEvent('loadedmetadata', e)}
                      onLoadedData={(e) => handleAudioElementEvent('loadeddata', e)}
                      onDurationChange={(e) => handleAudioElementEvent('durationchange', e)}
                      onCanPlay={(e) => handleAudioElementEvent('canplay', e)}
                      onCanPlayThrough={(e) => handleAudioElementEvent('canplaythrough', e)}
                      onPlay={(e) => handleAudioElementEvent('play', e)}
                      onPlaying={(e) => handleAudioElementEvent('playing', e)}
                      onEnded={(e) => handleAudioElementEvent('ended', e)}
                      onError={(e) => handleAudioElementEvent('error', e)}
                      className="h-9 mt-2.5 w-full max-w-md"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => void handlePlayViaWebAudio()}
                    disabled={isProcessing}
                    title="Plays decoded audio directly from memory via Web Audio API"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    {isWebAudioPlaying ? 'Stop Direct Playback' : 'Play via Web Audio'}
                  </button>

                  <button
                    type="button"
                    onClick={clearAudio}
                    disabled={isProcessing}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer"
                    title="Remove Audio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleTranscribe()}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {processingStatus}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Transcribe & Summarize
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Model Download Progress Bar */}
              {isProcessing && modelLoadProgress !== null && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{processingStatus}</span>
                    <span className="font-mono text-indigo-400">{modelLoadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-200"
                      style={{ width: `${modelLoadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contextual Error Display (Categorized by Failure Stage) */}
          {errorMsg && (
            <div className="p-5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-sm space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-semibold text-red-300">
                    {errorCategory === 'mic'
                      ? 'Microphone Access Issue Detected'
                      : errorCategory === 'playback'
                      ? 'Audio Player Playback Issue Detected'
                      : errorCategory === 'recording'
                      ? 'Audio Recording Capture Issue'
                      : errorCategory === 'model'
                      ? 'Local AI Model Download Issue'
                      : errorCategory === 'upload'
                      ? 'Audio File Upload Issue'
                      : 'Audio Transcription Issue'}
                  </p>
                  <p className="text-red-200/90 leading-relaxed">{errorMsg}</p>
                </div>
                {errorCategory === 'model' && audioBlob && (
                  <button
                    type="button"
                    onClick={() => void handleTranscribe()}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-semibold text-red-200 shrink-0 cursor-pointer"
                  >
                    Retry Model Load
                  </button>
                )}
              </div>

              {errorCategory === 'mic' && (
                <div className="pl-8 space-y-2 text-xs text-slate-300 border-t border-red-900/60 pt-3">
                  <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Why does this happen when site permission is already "Allow"?
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>
                      <strong>a) Browser Address Bar Lock:</strong> Verify microphone is set to
                      "Allow" in the lock/tune icon next to the URL, then reload the page.
                    </li>
                    <li>
                      <strong>b) macOS / Windows System Permission:</strong> On macOS, open{' '}
                      <code>System Settings → Privacy &amp; Security → Microphone</code> and ensure{' '}
                      <strong>Google Chrome / Microsoft Edge / Safari</strong> is switched{' '}
                      <strong>ON</strong>.
                    </li>
                    <li>
                      <strong>c) Exclusive Hardware Lock:</strong> Close other apps or tabs holding
                      exclusive microphone access.
                    </li>
                  </ul>
                </div>
              )}

              {errorCategory === 'playback' && (
                <div className="pl-8 space-y-1.5 text-xs text-slate-300 border-t border-red-900/60 pt-3">
                  <p className="font-semibold text-amber-300">Playback Recovery Options:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Click <strong>"Play via Web Audio"</strong> above to play the decoded PCM/WAV
                      audio buffer directly through the browser's Web Audio API.
                    </li>
                    <li>
                      You can still click <strong>"Transcribe &amp; Summarize"</strong> — local
                      Whisper reads the WAV buffer directly in memory even if native{' '}
                      <code>&lt;audio&gt;</code> playback is blocked.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'summary'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'actions'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Action Items ({result.actionItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transcript')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'transcript'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    Transcript
                  </button>
                </div>

                {result.detectedLanguage && (
                  <p className="text-xs text-slate-400 pt-1">
                    Language Mode: <span className="text-indigo-300">{result.detectedLanguage}</span>{' '}
                    • Model: <span className="text-slate-300">{result.modelUsed}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                Export .TXT
              </button>
            </div>

            {/* Executive Summary */}
            {(activeTab === 'all' || activeTab === 'summary') && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-indigo-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Executive Summary
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.summary, 'summary')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSection === 'summary' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {result.summary}
                </p>
              </div>
            )}

            {/* Action Items */}
            {(activeTab === 'all' || activeTab === 'actions') && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-emerald-400 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Action Items & Key Takeaways
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.actionItems.join('\n• '), 'actions')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSection === 'actions' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {result.actionItems.length > 0 ? (
                  <ul className="space-y-2">
                    {result.actionItems.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5 text-slate-200 text-sm sm:text-base"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm">
                    No specific action items were detected in this recording.
                  </p>
                )}
              </div>
            )}

            {/* Full Transcript */}
            {(activeTab === 'all' || activeTab === 'transcript') && (
              <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-indigo-400" />
                    Verbatim Transcript
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.transcript, 'transcript')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSection === 'transcript' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto pr-2 text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {result.transcript}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAudioTranscriber;
