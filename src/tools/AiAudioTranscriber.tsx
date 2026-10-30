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
  ShieldCheck,
  Globe,
  Cpu,
  Play,
  Pause,
  Timer,
  ArrowDown,
  ChevronsDown,
  CheckCircle2,
  RotateCcw,
  Info,
  Lock,
  Sliders,
  Settings,
  Activity,
  MicOff,
  Users,
  User,
  Wand2,
  Search,
  X,
  Palette,
  VolumeX,
  Scissors,
  Tag,
  Tags,
  Calendar,
  Folder,
  Edit3,
  FileImage,
  Image,
  Share2,
  Printer,
  Layers,
  Plus,
  PlayCircle,
  StopCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { getStoredAiProviderConfig, AiProviderSettingsModal } from '../components/AiProviderSettingsModal';
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
import {
  DiarizationMode,
  SpeakerTurn,
  processSpeakerDiarization,
  formatSpeakerTimestamp,
} from '../utils/speakerDiarization';
import {
  autoCorrectITTranscript,
  AutoCorrectionResult,
  getStoredCustomDictionary,
  CustomDictionaryTerm,
} from '../utils/itAutoCorrector';

export interface BatchTranscriptResult {
  summary: string;
  actionItems: string[];
  keyTakeaways: string[];
  itLogEntry: string;
  modelUsed: string;
  durationMs?: number;
}

export interface BatchTranscriptItem {
  id: string;
  fileName: string;
  fileSize: number;
  transcriptText: string;
  wordCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: BatchTranscriptResult;
  isExpanded?: boolean;
}

export function cleanTranscriptText(text: string): string {
  if (!text) return '';
  if (text.includes('-->') || text.startsWith('WEBVTT')) {
    const lines = text.split(/\r?\n/);
    const cleaned: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === 'WEBVTT' || /^\d+$/.test(trimmed)) continue;
      if (trimmed.includes('-->')) continue;
      cleaned.push(trimmed);
    }
    return cleaned.join(' ');
  }
  return text;
}

export function parseUploadedTranscriptFile(fileName: string, content: string): string {
  if (fileName.toLowerCase().endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'string') return parsed;
      if (parsed.transcript && typeof parsed.transcript === 'string') return parsed.transcript;
      if (parsed.text && typeof parsed.text === 'string') return parsed.text;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item : item?.text || item?.transcript || ''))
          .filter(Boolean)
          .join(' ');
      }
      if (parsed.segments && Array.isArray(parsed.segments)) {
        return parsed.segments.map((s: any) => s?.text || '').filter(Boolean).join(' ');
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }
  return cleanTranscriptText(content);
}

export type RecordingPresetId = 'high-fidelity' | 'voice-optimized';

export interface RecordingPresetConfig {
  id: RecordingPresetId;
  label: string;
  sampleRate: number;
  description: string;
}

export const RECORDING_PRESETS: RecordingPresetConfig[] = [
  {
    id: 'high-fidelity',
    label: 'High Fidelity (44.1kHz)',
    sampleRate: 44100,
    description: 'Studio-grade audio bandwidth (44,100 Hz), ideal for nuanced speech, music, and archival quality.',
  },
  {
    id: 'voice-optimized',
    label: 'Voice Optimized (16kHz)',
    sampleRate: 16000,
    description: 'Speech-focused bandwidth (16,000 Hz) matching Whisper AI input natively with smaller memory footprint.',
  },
];

export type WaveformThemeId =
  | 'emerald-indigo'
  | 'cyan-blue'
  | 'sunset-amber'
  | 'purple-pink'
  | 'fire-ruby'
  | 'custom';

export type VisualizerStyleId = 'bar-graph' | 'waveform' | 'circular-wave';

export interface VisualizerStyleConfig {
  id: VisualizerStyleId;
  label: string;
  description: string;
}

export const VISUALIZER_STYLES: VisualizerStyleConfig[] = [
  {
    id: 'bar-graph',
    label: 'Bar Graph',
    description: 'Vertical frequency spectrum frequency bars with peak decay caps.',
  },
  {
    id: 'waveform',
    label: 'Waveform',
    description: 'Continuous smooth oscilloscope waveform curve with gradient glow.',
  },
  {
    id: 'circular-wave',
    label: 'Circular Wave',
    description: 'Radial pulsating frequency ring radiating outward from center.',
  },
];

export interface WaveformThemeConfig {
  id: WaveformThemeId;
  label: string;
  startColor: string;
  endColor: string;
  description: string;
}

export const WAVEFORM_THEMES: WaveformThemeConfig[] = [
  {
    id: 'emerald-indigo',
    label: 'Cyber Emerald & Indigo',
    startColor: '#34d399',
    endColor: '#818cf8',
    description: 'Vibrant emerald stroke with soft indigo visualizer glow.',
  },
  {
    id: 'cyan-blue',
    label: 'Neon Cyan & Blue',
    startColor: '#22d3ee',
    endColor: '#60a5fa',
    description: 'Electric cyan waveform line with neon blue peak aura.',
  },
  {
    id: 'sunset-amber',
    label: 'Sunset Amber & Gold',
    startColor: '#fb923c',
    endColor: '#facc15',
    description: 'Warm, high-contrast orange-amber audio intensity theme.',
  },
  {
    id: 'purple-pink',
    label: 'Vaporwave Violet',
    startColor: '#e879f9',
    endColor: '#c084fc',
    description: 'Synthwave magenta stroke with vibrant violet gradient fill.',
  },
  {
    id: 'fire-ruby',
    label: 'Crimson Ruby & Fire',
    startColor: '#fb7185',
    endColor: '#f87171',
    description: 'Bold crimson ruby waveform with high-gain fire gradient.',
  },
  {
    id: 'custom',
    label: 'Custom Dual-Color Picker',
    startColor: '#10b981',
    endColor: '#6366f1',
    description: 'Select custom Start & Glow HEX colors for a personalized display.',
  },
];

export const AUTO_SAVE_STORAGE_KEY = 'ai_audio_transcriber_auto_save_v1';

export const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num) || clean.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const cachedWhisperPipelines = new Map<string, any>();

const PLAYBACK_SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

interface TranscriptionResult {
  transcript: string;
  rawUncorrectedTranscript?: string;
  autoCorrectionCount?: number;
  appliedAutoCorrections?: Array<{
    original: string;
    replacement: string;
    category: string;
    count: number;
  }>;
  formattedSpeakerTranscript?: string;
  speakerTurns?: SpeakerTurn[];
  speakerCount?: number;
  detectedStreams?: number;
  diarizationMethod?: 'multi-channel' | 'voice-activity' | 'single-speaker';
  speakerStats?: Array<{
    speaker: string;
    speakerIndex: number;
    turnCount: number;
    totalDurationSeconds: number;
    wordCount: number;
    percentage: number;
  }>;
  summary: string;
  actionItems: string[];
  keyTakeaways?: string[];
  itLogEntry?: string;
  isLlmGenerated?: boolean;
  detectedLanguage?: string;
  modelUsed?: string;
}

interface DebugEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: string;
}

export interface RecordingSessionMetadata {
  durationSeconds: number;
  formattedDuration: string;
  bitRateKbps: number;
  dataRateKbPerSec: number;
  fileSizeBytes: number;
  formattedFileSize: string;
  chunkCount: number;
  totalSamples: number;
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
  formatName: string;
}

export const formatFileSizeBytes = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const buildTimestampedTranscriptText = (
  text: string,
  durationSec: number | null | undefined,
  speakerTurns?: SpeakerTurn[]
): string => {
  if (speakerTurns && speakerTurns.length > 0) {
    return speakerTurns
      .map((turn) => `[${formatSpeakerTimestamp(turn.startTime)}] ${turn.speaker}: ${turn.text}`)
      .join('\n\n');
  }

  if (!text || !text.trim()) return '';

  const cleanText = text.trim();
  const rawLines = cleanText
    .split(/\n+/)
    .flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed) return [];
      const parts = trimmed.split(/(?<=[.!?।۔。])\s+/).map((s) => s.trim()).filter(Boolean);
      return parts.length > 0 ? parts : [trimmed];
    });

  if (rawLines.length === 0) return cleanText;

  const totalChars = cleanText.length || 1;
  const dur = typeof durationSec === 'number' && durationSec > 0 ? durationSec : 0;

  let accumChars = 0;
  return rawLines
    .map((line) => {
      const fraction = accumChars / totalChars;
      const lineTimeSec = dur * fraction;
      accumChars += line.length;
      const timeStr = formatSpeakerTimestamp(lineTimeSec);
      return `[${timeStr}] ${line}`;
    })
    .join('\n');
};

const formatDurationDisplay = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const totalSecs = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatRecordingTimerOverlay = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '00:00.0';
  }
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped - Math.floor(clamped)) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
};

const formatTimerDisplay = (
  ms: number | null | undefined
): { formatted: string; minutes: string; seconds: string; tenths: string } => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
    return { formatted: '00:00.0', minutes: '00', seconds: '00', tenths: '0' };
  }
  const clampedMs = Math.max(0, ms);
  const totalSeconds = Math.floor(clampedMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const tenths = Math.floor((clampedMs % 1000) / 100);
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  return {
    formatted: `${mm}:${ss}.${tenths}`,
    minutes: mm,
    seconds: ss,
    tenths: String(tenths),
  };
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

export const countKeywordMatches = (text: string, query: string): number => {
  if (!query || !query.trim() || !text) return 0;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

export const highlightMatchingText = (text: string, query: string): React.ReactNode => {
  if (!query || !query.trim() || !text) return text;

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length <= 1) return text;

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            style={{
              background: 'rgba(250, 204, 21, 0.45)',
              color: 'var(--text-heading)',
              borderRadius: '3px',
              padding: '1px 3px',
              margin: '0 1px',
              fontWeight: 700,
              boxShadow: '0 0 0 1px rgba(234, 179, 8, 0.6)',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
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
): Promise<{
  samples: Float32Array;
  durationSeconds: number;
  sampleRate: number;
  channels: Float32Array[];
  originalChannelCount: number;
}> => {
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
    const individualChannels: Float32Array[] = [];

    let monoNonZeroCount = 0;
    let monoPeak = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const channelData = decoded.getChannelData(channel);
      individualChannels.push(resampleMonoAudio(channelData, decoded.sampleRate, targetRate));
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
      detectedStreamsCount: channels,
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
      channels: individualChannels,
      originalChannelCount: channels,
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
  const [isPaused, setIsPaused] = useState(false);
  const [mediaRecorderState, setMediaRecorderState] = useState<
    'inactive' | 'recording' | 'paused'
  >('inactive');
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState<number>(0);
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
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [recordingPreset, setRecordingPreset] = useState<RecordingPresetId>('high-fidelity');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [meterPeakDb, setMeterPeakDb] = useState<number>(-60);
  const [meterSignalStatus, setMeterSignalStatus] = useState<
    'idle' | 'low' | 'optimal' | 'loud' | 'clipping'
  >('idle');
  const [sessionMetadata, setSessionMetadata] = useState<RecordingSessionMetadata>({
    durationSeconds: 0,
    formattedDuration: '00:00.0',
    bitRateKbps: 705.6,
    dataRateKbPerSec: 88.2,
    fileSizeBytes: 44,
    formattedFileSize: '44 B',
    chunkCount: 0,
    totalSamples: 0,
    sampleRate: 44100,
    bitsPerSample: 16,
    channels: 1,
    formatName: '16-bit Linear PCM WAV',
  });

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
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Speaker Diarization, Auto-Correction & View State
  const [diarizationMode, setDiarizationMode] = useState<DiarizationMode>('auto');
  const [transcriptViewMode, setTranscriptViewMode] = useState<'speaker' | 'plain'>('speaker');
  const [enableAutoCorrection, setEnableAutoCorrection] = useState<boolean>(true);
  const [enableCapitalization, setEnableCapitalization] = useState<boolean>(true);
  const [enableITDictionary, setEnableITDictionary] = useState<boolean>(true);
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLineTimestamps, setShowLineTimestamps] = useState<boolean>(true);
  const [paragraphSpacing, setParagraphSpacing] = useState<'compact' | 'normal' | 'relaxed'>('normal');
  const [collapsedTurns, setCollapsedTurns] = useState<Record<string, boolean>>({});

  const toggleTurnCollapsed = (turnKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCollapsedTurns((prev) => ({ ...prev, [turnKey]: !prev[turnKey] }));
  };

  const expandAllTurns = () => {
    setCollapsedTurns({});
  };

  const collapseAllTurns = () => {
    const next: Record<string, boolean> = {};
    if (result?.speakerTurns) {
      result.speakerTurns.forEach((t, i) => {
        next[t.id || String(i)] = true;
      });
    }
    setCollapsedTurns(next);
  };

  // Auto-Pause on Silence State & Refs
  const [autoPauseOnSilence, setAutoPauseOnSilence] = useState<boolean>(true);
  const [isAutoPaused, setIsAutoPaused] = useState<boolean>(false);
  const [silenceDurationSeconds, setSilenceDurationSeconds] = useState<number>(0);

  // Canvas Visualizer Custom Gradient Theme State & Settings
  const [waveformTheme, setWaveformTheme] = useState<WaveformThemeId>('emerald-indigo');
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyleId>('bar-graph');
  const [customStartColor, setCustomStartColor] = useState<string>('#10b981');
  const [customEndColor, setCustomEndColor] = useState<string>('#6366f1');
  const [showVisualizerSettings, setShowVisualizerSettings] = useState<boolean>(false);

  // Web Audio API Noise Gate (GainNode) State & Refs
  const [enableNoiseGate, setEnableNoiseGate] = useState<boolean>(true);
  const [noiseGateThresholdDb, setNoiseGateThresholdDb] = useState<number>(-40);
  const [isNoiseGateOpen, setIsNoiseGateOpen] = useState<boolean>(true);

  // Input Volume Sensitivity (GainNode) State & Refs
  const [inputVolumeSensitivity, setInputVolumeSensitivity] = useState<number>(1.0);

  // Edit Audio (Trimming) State
  const [showAudioEditor, setShowAudioEditor] = useState<boolean>(false);
  const [trimStartSeconds, setTrimStartSeconds] = useState<number>(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState<number>(0);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);
  const [isPreviewingTrim, setIsPreviewingTrim] = useState<boolean>(false);

  // Session Metadata & Tagging State
  const [metaProject, setMetaProject] = useState<string>('');
  const [metaCategory, setMetaCategory] = useState<string>('General');
  const [metaDate, setMetaDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customTags, setCustomTags] = useState<string[]>(['Voice-Note', 'Whisper-AI']);
  const [tagInput, setTagInput] = useState<string>('');
  const [showMetadataEditor, setShowMetadataEditor] = useState<boolean>(true);
  const [isExportingSvg, setIsExportingSvg] = useState<boolean>(false);
  const [isSummarizingLlm, setIsSummarizingLlm] = useState<boolean>(false);
  const [llmSummaryError, setLlmSummaryError] = useState<string | null>(null);
  const [staticWaveformBars, setStaticWaveformBars] = useState<number[]>([]);

  // Ollama Connection Health & Status Polling State
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [ollamaModelName, setOllamaModelName] = useState<string>('llama3');
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>('http://localhost:11434');
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [isRetryingOllama, setIsRetryingOllama] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'ollama'>(() => getStoredAiProviderConfig().provider);

  // AI Provider & Custom Technical Dictionary Modal State
  const [showAiSettingsModal, setShowAiSettingsModal] = useState<boolean>(false);
  const [aiSettingsModalTab, setAiSettingsModalTab] = useState<'provider' | 'dictionary' | 'import-export'>('provider');
  const [customDictionaryTerms, setCustomDictionaryTerms] = useState<CustomDictionaryTerm[]>(() => getStoredCustomDictionary());

  useEffect(() => {
    const handleDictChange = (e: CustomEvent<CustomDictionaryTerm[]>) => {
      if (e.detail) {
        setCustomDictionaryTerms(e.detail);
      }
    };
    window.addEventListener('custom-dictionary-changed', handleDictChange as EventListener);
    return () => {
      window.removeEventListener('custom-dictionary-changed', handleDictChange as EventListener);
    };
  }, []);

  // Batch Ollama Summarization Queue State
  const [batchQueue, setBatchQueue] = useState<BatchTranscriptItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(-1);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchFilter, setBatchFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [batchCopiedId, setBatchCopiedId] = useState<string | null>(null);
  const batchStopRequestedRef = useRef<boolean>(false);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const checkOllamaStatus = useCallback(async () => {
    setIsRetryingOllama(true);
    try {
      const aiConfig = getStoredAiProviderConfig();
      setAiProvider(aiConfig.provider);
      const endpoint = (aiConfig.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
      setOllamaEndpoint(endpoint);
      setOllamaModelName(aiConfig.ollamaModel || 'llama3');
      const res = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus('connected');
        setOllamaError(null);
        setLlmSummaryError(null);
        if (Array.isArray(data.models) && data.models.length > 0 && data.models[0]?.name) {
          setOllamaModelName(data.models[0].name);
        }
      } else {
        setOllamaStatus('disconnected');
        setOllamaError(`Ollama local server at ${endpoint} returned HTTP status ${res.status}. Please check your Ollama service.`);
      }
    } catch {
      const aiConfig = getStoredAiProviderConfig();
      const endpoint = (aiConfig.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
      setOllamaStatus('disconnected');
      setOllamaError(`Cannot connect to local Ollama API at ${endpoint}. Make sure Ollama is running ('ollama serve') and CORS is enabled via OLLAMA_ORIGINS="*".`);
    } finally {
      setIsRetryingOllama(false);
    }
  }, []);

  useEffect(() => {
    checkOllamaStatus();
    const interval = setInterval(checkOllamaStatus, 15000);
    const handleProviderChange = () => {
      checkOllamaStatus();
    };
    window.addEventListener('ai-provider-changed', handleProviderChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ai-provider-changed', handleProviderChange);
    };
  }, [checkOllamaStatus]);

  useEffect(() => {
    if (!audioBlob) {
      setStaticWaveformBars([]);
      return;
    }

    let isMounted = true;
    const generateEnvelope = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextCtor();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const channelData = decoded.getChannelData(0);
        const numBars = 100;
        const blockSize = Math.floor(channelData.length / numBars);
        const bars: number[] = [];

        for (let i = 0; i < numBars; i += 1) {
          let sum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);
          for (let j = start; j < end; j += 1) {
            sum += Math.abs(channelData[j]);
          }
          const avg = (end - start) > 0 ? sum / (end - start) : 0;
          bars.push(Math.min(1, avg * 3.5));
        }

        await ctx.close().catch(() => {});
        if (isMounted) {
          setStaticWaveformBars(bars);
        }
      } catch {
        if (isMounted) {
          setStaticWaveformBars(new Array(80).fill(0.3));
        }
      }
    };

    generateEnvelope();

    return () => {
      isMounted = false;
    };
  }, [audioBlob]);

  // Auto-Save to localStorage State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [showAutoSaveToast, setShowAutoSaveToast] = useState<boolean>(false);
  const [restorableDraft, setRestorableDraft] = useState<{
    timestamp: number;
    formattedTime: string;
    transcript: string;
    summary: string;
    actionItems: string[];
    keyTakeaways?: string[];
    itLogEntry?: string;
    isLlmGenerated?: boolean;
    audioFileName?: string;
    metaProject?: string;
    metaCategory?: string;
    metaDate?: string;
    customTags?: string[];
  } | null>(null);

  const handleAddTag = (tagToAdd?: string) => {
    const text = (tagToAdd !== undefined ? tagToAdd : tagInput).trim();
    if (!text) return;
    const cleanTag = text.replace(/^[#\s]+/, '').trim();
    if (cleanTag && !customTags.includes(cleanTag)) {
      setCustomTags((prev) => [...prev, cleanTag]);
    }
    if (tagToAdd === undefined) {
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const waveformThemeRef = useRef<WaveformThemeId>('emerald-indigo');
  const customStartColorRef = useRef<string>('#10b981');
  const customEndColorRef = useRef<string>('#6366f1');
  const visualizerStyleRef = useRef<VisualizerStyleId>('bar-graph');

  const enableNoiseGateRef = useRef<boolean>(true);
  const noiseGateThresholdDbRef = useRef<number>(-40);
  const noiseGateGainNodeRef = useRef<GainNode | null>(null);

  const inputVolumeSensitivityRef = useRef<number>(1.0);
  const inputVolumeGainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    inputVolumeSensitivityRef.current = inputVolumeSensitivity;
    if (inputVolumeGainNodeRef.current && audioContextRef.current) {
      try {
        inputVolumeGainNodeRef.current.gain.setValueAtTime(
          inputVolumeSensitivity,
          audioContextRef.current.currentTime
        );
      } catch {
        // Ignore automation errors
      }
    }
  }, [inputVolumeSensitivity]);

  useEffect(() => {
    waveformThemeRef.current = waveformTheme;
    customStartColorRef.current = customStartColor;
    customEndColorRef.current = customEndColor;
    visualizerStyleRef.current = visualizerStyle;
  }, [waveformTheme, customStartColor, customEndColor, visualizerStyle]);

  useEffect(() => {
    enableNoiseGateRef.current = enableNoiseGate;
    noiseGateThresholdDbRef.current = noiseGateThresholdDb;
  }, [enableNoiseGate, noiseGateThresholdDb]);

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

  // Refs for Web Audio Recording, MediaRecorder State & Safe Object URL Management
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderChunksRef = useRef<Blob[]>([]);
  const isPausedRef = useRef<boolean>(false);
  const autoPauseOnSilenceRef = useRef<boolean>(true);
  const isAutoPausedRef = useRef<boolean>(false);
  const silenceStartTimestampRef = useRef<number>(0);
  const accumulatedRecordingMsRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const latestWaveformChunkRef = useRef<Float32Array | null>(null);
  const rollingPeakHistoryRef = useRef<number[]>([]);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformRafRef = useRef<number | null>(null);
  const peakMeterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMonitoringRef = useRef<boolean>(false);
  const peakHoldHistoryRef = useRef<number[]>([]);
  const masterPeakHoldRef = useRef<{ value: number; timestamp: number }>({ value: 0, timestamp: 0 });
  const totalCapturedSamplesRef = useRef<number>(0);
  const lastMetaUpdateRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(44100);
  const recordingStartTimestampRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const activeDownloadUrlRef = useRef<string | null>(null);
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());
  const urlManagerRef = useRef<SafeObjectUrlManager>(new SafeObjectUrlManager());
  const webAudioPlaybackContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    autoPauseOnSilenceRef.current = autoPauseOnSilence;
  }, [autoPauseOnSilence]);

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
   * Strictly revokes all existing blob: Object URLs using URL.revokeObjectURL()
   * before creating or assigning a new Object URL or resetting the <audio> element source.
   */
  const revokeOldObjectUrlsBeforeCreatingNew = useCallback(
    (reason: string): string[] => {
      const audioEl = audioPlayerRef.current;
      const urlsToRevoke = new Set<string>();

      createdObjectUrlsRef.current.forEach((trackedUrl) => {
        if (trackedUrl && trackedUrl.startsWith('blob:')) {
          urlsToRevoke.add(trackedUrl);
        }
      });

      if (audioUrl && audioUrl.startsWith('blob:')) {
        urlsToRevoke.add(audioUrl);
      }
      if (activeObjectUrlRef.current && activeObjectUrlRef.current.startsWith('blob:')) {
        urlsToRevoke.add(activeObjectUrlRef.current);
      }
      const managedUrl = urlManagerRef.current.getCurrentUrl();
      if (managedUrl && managedUrl.startsWith('blob:')) {
        urlsToRevoke.add(managedUrl);
      }
      if (audioEl) {
        const domAttrSrc = audioEl.getAttribute('src');
        if (domAttrSrc && domAttrSrc.startsWith('blob:')) {
          urlsToRevoke.add(domAttrSrc);
        }
        if (audioEl.src && audioEl.src.startsWith('blob:')) {
          urlsToRevoke.add(audioEl.src);
        }
        if (audioEl.currentSrc && audioEl.currentSrc.startsWith('blob:')) {
          urlsToRevoke.add(audioEl.currentSrc);
        }
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {
          // Ignore media reset errors in non-DOM test environments
        }
      }

      const revokedList: string[] = [];
      urlsToRevoke.forEach((oldUrl) => {
        try {
          URL.revokeObjectURL(oldUrl);
          revokedList.push(oldUrl);
        } catch {
          // Ignore revoke errors if already revoked
        }
      });

      createdObjectUrlsRef.current.clear();
      activeObjectUrlRef.current = null;
      urlManagerRef.current.clear();

      if (revokedList.length > 0) {
        console.log(
          '[AiAudioTranscriber] Strictly revoked old Object URL(s) via URL.revokeObjectURL() before assigning new source:',
          {
            reason,
            revokedObjectUrls: revokedList,
          }
        );
      }

      return revokedList;
    },
    [audioUrl]
  );

  /**
   * Verifies that a WAV Blob has a valid 44-byte RIFF/WAVE header and non-zero PCM data
   * before updating the <audio> source or triggering <audio> element playback.
   */
  const verifyWavBlobHeaderAndNonZeroPcm = useCallback(
    (
      blob: Blob | null,
      wavCheck: WavValidationResult | null | undefined
    ): {
      hasValidWavHeader: boolean;
      hasNonZeroPcmData: boolean;
      isReadyForPlayback: boolean;
      failureReason: string | null;
    } => {
      const hasValidWavHeader = Boolean(
        wavCheck &&
          wavCheck.valid &&
          wavCheck.riffHeader === 'RIFF' &&
          wavCheck.waveHeader === 'WAVE' &&
          wavCheck.fmtHeader === 'fmt ' &&
          wavCheck.dataHeader === 'data' &&
          (!blob || blob.size > 44) &&
          wavCheck.dataByteLength > 0
      );

      const hasNonZeroPcmData = Boolean(
        wavCheck &&
          wavCheck.hasNonZeroAudio &&
          wavCheck.nonZeroSampleCount > 0 &&
          wavCheck.peakAmplitude > 0 &&
          (!blob || blob.size > 44)
      );

      const isReadyForPlayback = hasValidWavHeader && hasNonZeroPcmData;
      const failureReason = !hasValidWavHeader
        ? `WAV Blob has an invalid or incomplete 44-byte RIFF/WAVE header (${wavCheck?.error || 'corrupted header'}).`
        : !hasNonZeroPcmData
        ? 'WAV Blob contains only zero-amplitude PCM samples (silence).'
        : null;

      return {
        hasValidWavHeader,
        hasNonZeroPcmData,
        isReadyForPlayback,
        failureReason,
      };
    },
    []
  );

  /**
   * Inspects a WAV Blob (using a pre-computed WavValidationResult or parsing its ArrayBuffer directly)
   * to guarantee the WAV Blob contains non-zero PCM data before the <audio> element's source is updated.
   */
  const verifyWavBlobContainsNonZeroPcmData = useCallback(
    async (
      blob: Blob,
      precomputedWavCheck?: WavValidationResult | null
    ): Promise<{
      wavCheck: WavValidationResult;
      hasValidWavHeader: boolean;
      hasNonZeroPcmData: boolean;
      isReadyForPlayback: boolean;
      failureReason: string | null;
    }> => {
      let resolvedWavCheck = precomputedWavCheck ?? null;
      if (!resolvedWavCheck) {
        const arrayBuffer = await blob.arrayBuffer();
        resolvedWavCheck = parseAndValidateWav(arrayBuffer);
      }

      const verification = verifyWavBlobHeaderAndNonZeroPcm(blob, resolvedWavCheck);
      return {
        wavCheck: resolvedWavCheck,
        ...verification,
      };
    },
    [verifyWavBlobHeaderAndNonZeroPcm]
  );

  /**
   * Explicitly resets the <audio> element's source and revokes any active Object URLs
   * using URL.revokeObjectURL() so that stale Object URLs are never leaked or left active
   * before setting a new source.
   */
  const resetAudioSource = useCallback(
    (reason: string) => {
      const audioEl = audioPlayerRef.current;
      const revokedList = revokeOldObjectUrlsBeforeCreatingNew(reason);

      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {
          // Ignore DOM media reset errors in non-browser/test environments
        }
      }

      if (revokedList.length > 0) {
        const resetDiag = {
          reason,
          revokedObjectUrls: revokedList,
          audioElementReset: Boolean(audioEl),
        };
        addLog(
          'info',
          `Explicitly reset <audio> source and revoked old Object URL(s) (${reason}):`,
          resetDiag
        );
      }

      setAudioUrl(null);
      setAudioBlob(null);
      setPlaybackCurrentTime(0);
      setPlaybackDuration(0);
    },
    [addLog, revokeOldObjectUrlsBeforeCreatingNew]
  );

  /**
   * Strictly revokes any old Object URLs using URL.revokeObjectURL() before assigning new ones,
   * and ensures the <audio> element's source is updated only after verifying the WAV Blob
   * contains a valid 44-byte RIFF/WAVE header and non-zero PCM data.
   */
  const assignAudioSourceFromBlob = useCallback(
    async (
      blob: Blob,
      fileName: string,
      mimeType: string,
      sourceLabel: string,
      wavCheck?: WavValidationResult | null
    ): Promise<string | null> => {
      // Step 1: Strictly revoke all old Object URLs using URL.revokeObjectURL() and clear <audio> source first
      resetAudioSource(`replacing audio source with ${sourceLabel}`);

      // Step 2: Verify that any WAV Blob has a valid header and non-zero PCM data BEFORE creating a new Object URL or updating <audio> source
      const isWavSource =
        mimeType.includes('wav') ||
        blob.type.includes('wav') ||
        /\.wav$/i.test(fileName) ||
        Boolean(wavCheck);

      let resolvedWavCheck: WavValidationResult | null = wavCheck ?? null;
      let hasValidWavHeader = true;
      let hasNonZeroPcmData = true;

      if (isWavSource) {
        const verification = await verifyWavBlobContainsNonZeroPcmData(blob, wavCheck);
        resolvedWavCheck = verification.wavCheck;
        hasValidWavHeader = verification.hasValidWavHeader;
        hasNonZeroPcmData = verification.hasNonZeroPcmData;
        setWavValidation(resolvedWavCheck);

        const preUpdateVerification = {
          sourceLabel,
          fileName,
          blobSizeBytes: blob.size,
          hasValidWavHeader,
          hasNonZeroPcmData,
          canUpdateAudioElementSource: verification.isReadyForPlayback,
          audioContextState:
            audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
          actualSampleRate:
            audioContextRef.current?.sampleRate ??
            audioContextDiag?.rawSampleRate ??
            sampleRateRef.current,
          normalizedSampleRate:
            audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
          trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
          channelCount:
            sourceNodeRef.current?.channelCount ??
            audioContextDiag?.sourceChannelCount ??
            resolvedWavCheck?.numChannels ??
            1,
          trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
          sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
          processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
          destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
          riffHeader: resolvedWavCheck?.riffHeader ?? null,
          waveHeader: resolvedWavCheck?.waveHeader ?? null,
          fmtHeader: resolvedWavCheck?.fmtHeader ?? null,
          dataHeader: resolvedWavCheck?.dataHeader ?? null,
          sampleRate: resolvedWavCheck?.sampleRate ?? null,
          numChannels: resolvedWavCheck?.numChannels ?? null,
          bitsPerSample: resolvedWavCheck?.bitsPerSample ?? null,
          dataByteLength: resolvedWavCheck?.dataByteLength ?? 0,
          sampleCount: resolvedWavCheck?.sampleCount ?? 0,
          nonZeroSampleCount: resolvedWavCheck?.nonZeroSampleCount ?? 0,
          peakAmplitude: resolvedWavCheck ? Number(resolvedWavCheck.peakAmplitude.toFixed(5)) : 0,
          rmsAmplitude: resolvedWavCheck ? Number(resolvedWavCheck.rmsAmplitude.toFixed(5)) : 0,
          durationSeconds: resolvedWavCheck
            ? Number(resolvedWavCheck.durationSeconds.toFixed(4))
            : 0,
        };

        console.log(
          '[AiAudioTranscriber] Pre-source-update WAV Blob verification — AudioContext state, actual sampleRate, channelCount, valid header & non-zero PCM check:',
          preUpdateVerification
        );
        addLog(
          hasValidWavHeader && hasNonZeroPcmData ? 'info' : 'warn',
          `WAV header & non-zero PCM check before updating <audio> source (${sourceLabel}):`,
          preUpdateVerification
        );

        if (!verification.isReadyForPlayback || !hasNonZeroPcmData) {
          console.error(
            '[AiAudioTranscriber] Aborting Object URL creation and <audio> source update: WAV Blob failed valid header or non-zero PCM data check.',
            preUpdateVerification
          );
          return null;
        }
      }

      // Step 3: Strictly revoke any remaining Object URLs via URL.revokeObjectURL() right before creating the new Object URL
      revokeOldObjectUrlsBeforeCreatingNew(`before creating new Object URL for ${sourceLabel}`);

      // Step 4: Create the new Object URL and track it so it will be strictly revoked on future updates or unmount
      const nextUrl = URL.createObjectURL(blob);
      createdObjectUrlsRef.current.add(nextUrl);
      activeObjectUrlRef.current = nextUrl;

      setAudioBlob(blob);
      setAudioFileName(fileName);
      setAudioMimeType(mimeType);
      setAudioUrl(nextUrl);
      setPlaybackCurrentTime(0);
      setPlaybackDuration(
        resolvedWavCheck?.durationSeconds && Number.isFinite(resolvedWavCheck.durationSeconds)
          ? resolvedWavCheck.durationSeconds
          : 0
      );

      const audioEl = audioPlayerRef.current;
      if (audioEl) {
        try {
          const previousDomSrc = audioEl.getAttribute('src');
          if (previousDomSrc && previousDomSrc.startsWith('blob:') && previousDomSrc !== nextUrl) {
            URL.revokeObjectURL(previousDomSrc);
          }
          audioEl.src = nextUrl;
          audioEl.load();
          audioEl.defaultPlaybackRate = playbackRate;
          audioEl.playbackRate = playbackRate;
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
        audioContextState:
          audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
        actualSampleRate:
          audioContextRef.current?.sampleRate ??
          audioContextDiag?.rawSampleRate ??
          sampleRateRef.current,
        channelCount:
          sourceNodeRef.current?.channelCount ??
          audioContextDiag?.sourceChannelCount ??
          resolvedWavCheck?.numChannels ??
          1,
        wavSampleRate: resolvedWavCheck?.sampleRate ?? null,
        wavNumChannels: resolvedWavCheck?.numChannels ?? null,
        wavDurationSeconds: resolvedWavCheck
          ? Number(resolvedWavCheck.durationSeconds.toFixed(4))
          : null,
        wavHeaderValid: isWavSource ? hasValidWavHeader : null,
        wavHasNonZeroPcmData: isWavSource ? hasNonZeroPcmData : null,
        wavNonZeroSampleCount: resolvedWavCheck ? resolvedWavCheck.nonZeroSampleCount : null,
        objectUrl: nextUrl,
        boundToAudioElement: Boolean(audioEl),
      };
      console.log(
        '[AiAudioTranscriber] Created new Object URL and updated <audio> element source (with AudioContext state, actual sampleRate & channelCount):',
        assignDiag
      );
      addLog('info', `Assigned verified Object URL to <audio> source for ${sourceLabel}:`, assignDiag);

      return nextUrl;
    },
    [
      addLog,
      audioContextDiag,
      playbackRate,
      resetAudioSource,
      revokeOldObjectUrlsBeforeCreatingNew,
      verifyWavBlobContainsNonZeroPcmData,
    ]
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
    if (waveformRafRef.current !== null) {
      cancelAnimationFrame(waveformRafRef.current);
      waveformRafRef.current = null;
    }

    if (mediaRecorderRef.current) {
      const mr = mediaRecorderRef.current;
      try {
        mr.ondataavailable = null;
        mr.onpause = null;
        mr.onresume = null;
        mr.onstop = null;
        if (mr.state !== 'inactive') {
          mr.stop();
        }
      } catch {
        // Ignore already stopped MediaRecorder
      }
      mediaRecorderRef.current = null;
    }
    isPausedRef.current = false;
    setIsPaused(false);
    setMediaRecorderState('inactive');
    isMonitoringRef.current = false;
    setIsMonitoring(false);

    const hasActiveGraph = Boolean(
      processorRef.current ||
        analyserRef.current ||
        sourceNodeRef.current ||
        silentGainRef.current ||
        audioContextRef.current ||
        activeStreamRef.current
    );

    if (hasActiveGraph) {
      console.log('[AiAudioTranscriber] AudioContext lifecycle — tearing down recording graph:', {
        audioContextStateBeforeTeardown: audioContextRef.current?.state ?? 'none',
        audioContextSampleRate: audioContextRef.current?.sampleRate ?? null,
        hasAnalyserNode: Boolean(analyserRef.current),
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

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // Ignore already disconnected analyser
      }
      analyserRef.current = null;
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

    if (noiseGateGainNodeRef.current) {
      try {
        noiseGateGainNodeRef.current.disconnect();
      } catch {
        // Ignore already disconnected noise gate gain node
      }
      noiseGateGainNodeRef.current = null;
    }

    if (inputVolumeGainNodeRef.current) {
      try {
        inputVolumeGainNodeRef.current.disconnect();
      } catch {
        // Ignore already disconnected input volume gain node
      }
      inputVolumeGainNodeRef.current = null;
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
      createdObjectUrlsRef.current.forEach((trackedUrl) => {
        try {
          URL.revokeObjectURL(trackedUrl);
        } catch {
          // Ignore revoke errors
        }
      });
      createdObjectUrlsRef.current.clear();
      if (activeObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(activeObjectUrlRef.current);
        } catch {
          // Ignore revoke errors
        }
        activeObjectUrlRef.current = null;
      }
      if (activeDownloadUrlRef.current) {
        try {
          URL.revokeObjectURL(activeDownloadUrlRef.current);
        } catch {
          // Ignore revoke errors
        }
        activeDownloadUrlRef.current = null;
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
        // Strictly revoke any previous blob: Object URLs bound to the <audio> element before assigning a new source
        const staleUrlsToRevoke = new Set<string>();
        const attrSrc = audioEl.getAttribute('src');
        if (attrSrc && attrSrc.startsWith('blob:') && attrSrc !== audioUrl) {
          staleUrlsToRevoke.add(attrSrc);
        }
        if (audioEl.src && audioEl.src.startsWith('blob:') && audioEl.src !== audioUrl) {
          staleUrlsToRevoke.add(audioEl.src);
        }
        if (
          audioEl.currentSrc &&
          audioEl.currentSrc.startsWith('blob:') &&
          audioEl.currentSrc !== audioUrl
        ) {
          staleUrlsToRevoke.add(audioEl.currentSrc);
        }
        staleUrlsToRevoke.forEach((staleUrl) => {
          try {
            URL.revokeObjectURL(staleUrl);
            createdObjectUrlsRef.current.delete(staleUrl);
            console.log(
              '[AiAudioTranscriber] Strictly revoked stale <audio> src Object URL via URL.revokeObjectURL() before setting new source:',
              { revokedUrl: staleUrl, nextUrl: audioUrl }
            );
          } catch {
            // Ignore if already revoked
          }
        });

        // Verify PCM buffer amplitude directly from captured Float32 chunks as well as WAV validation
        const livePcmAmplitude = verifyPcmBufferNonZeroAmplitude(pcmChunksRef.current);

        const isWavSource =
          audioMimeType.includes('wav') ||
          (audioBlob?.type?.includes('wav') ?? false) ||
          /\.wav$/i.test(audioFileName) ||
          Boolean(wavValidation);

        // Ensure the <audio> element's source is updated ONLY after verifying the WAV Blob contains non-zero PCM data
        if (isWavSource) {
          const { hasValidWavHeader, hasNonZeroPcmData, isReadyForPlayback } =
            verifyWavBlobHeaderAndNonZeroPcm(audioBlob, wavValidation);

          if (!isReadyForPlayback || !hasNonZeroPcmData) {
            audioEl.pause();
            audioEl.removeAttribute('src');
            audioEl.load();
            console.warn(
              '[AiAudioTranscriber] Skipping <audio> element source update: WAV Blob failed valid header or non-zero PCM data check:',
              {
                hasValidWavHeader,
                hasNonZeroPcmData,
                audioContextState:
                  audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
                sampleRates: {
                  audioContextRawSampleRate:
                    audioContextDiag?.rawSampleRate ?? sampleRateRef.current,
                  audioContextNormalizedSampleRate:
                    audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
                  trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
                  wavHeaderSampleRate: wavValidation?.sampleRate ?? null,
                },
                channelCounts: {
                  trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
                  sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
                  processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
                  destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
                  wavHeaderNumChannels: wavValidation?.numChannels ?? null,
                },
                pcmBufferAmplitude: livePcmAmplitude,
                wavValidation,
              }
            );
            return;
          }
        }

        const needsSrcAssignment = attrSrc !== audioUrl;
        const needsExplicitLoad =
          needsSrcAssignment || audioEl.networkState === HTMLMediaElement.NETWORK_EMPTY;
        if (needsSrcAssignment) {
          audioEl.src = audioUrl;
        }
        if (needsExplicitLoad) {
          audioEl.load();
        }
        audioEl.defaultPlaybackRate = playbackRate;
        audioEl.playbackRate = playbackRate;
        console.log(
          '[AiAudioTranscriber] <audio> DOM element synchronized with Object URL — AudioContext state, sampleRates, channelCounts & verified PCM buffer amplitude:',
          {
            objectUrl: audioUrl,
            needsSrcAssignment,
            needsExplicitLoad,
            readyState: audioEl.readyState,
            networkState: audioEl.networkState,
            rawDuration: Number.isNaN(audioEl.duration) ? 'NaN' : String(audioEl.duration),
            audioContextState:
              audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
            sampleRates: {
              audioContextRawSampleRate: audioContextDiag?.rawSampleRate ?? sampleRateRef.current,
              audioContextNormalizedSampleRate:
                audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
              trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
              wavHeaderSampleRate: wavValidation?.sampleRate ?? null,
            },
            channelCounts: {
              trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
              sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
              processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
              destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
              wavHeaderNumChannels: wavValidation?.numChannels ?? null,
            },
            pcmBufferAmplitude: {
              totalSamples: livePcmAmplitude.totalSamples,
              nonZeroSampleCount: livePcmAmplitude.nonZeroSampleCount,
              audibleSampleCount: livePcmAmplitude.audibleSampleCount,
              hasNonZeroSamples: livePcmAmplitude.hasNonZeroSamples,
              hasNonZeroAmplitude: livePcmAmplitude.hasNonZeroAmplitude,
              isSilent: livePcmAmplitude.isSilent,
              minSample: Number(livePcmAmplitude.minSample.toFixed(6)),
              maxSample: Number(livePcmAmplitude.maxSample.toFixed(6)),
              peakAmplitude: Number(livePcmAmplitude.peakAmplitude.toFixed(6)),
              rmsAmplitude: Number(livePcmAmplitude.rmsAmplitude.toFixed(6)),
              rmsDbFs: Number.isFinite(livePcmAmplitude.rmsDbFs)
                ? `${livePcmAmplitude.rmsDbFs.toFixed(2)} dBFS`
                : '-Inf dBFS',
            },
            wavHeaderValid: wavValidation?.valid ?? null,
            wavDurationSeconds: wavValidation?.durationSeconds ?? null,
            wavPeakAmplitude: wavValidation?.peakAmplitude ?? null,
            wavRmsAmplitude: wavValidation?.rmsAmplitude ?? null,
            wavNonZeroSampleCount: wavValidation?.nonZeroSampleCount ?? null,
            wavHasNonZeroAudio: wavValidation?.hasNonZeroAudio ?? null,
          }
        );
      } catch {
        // Ignore load errors in non-DOM test environments
      }
    }
  }, [
    audioBlob,
    audioContextDiag,
    audioFileName,
    audioMimeType,
    audioUrl,
    playbackRate,
    verifyWavBlobHeaderAndNonZeroPcm,
    wavValidation,
  ]);

  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (audioEl) {
      try {
        audioEl.defaultPlaybackRate = playbackRate;
        audioEl.playbackRate = playbackRate;
      } catch {
        // Ignore playbackRate assignment errors in headless environments
      }
    }
  }, [playbackRate, audioUrl]);

  useEffect(() => {
    if (isRecording) {
      let lastLoggedSecond = -1;
      let fallbackTicks = 0;
      timerRef.current = window.setInterval(() => {
        if (isPausedRef.current) {
          return;
        }
        fallbackTicks += 1;
        const activeSegmentMs =
          recordingStartTimestampRef.current > 0
            ? Math.max(0, Date.now() - recordingStartTimestampRef.current)
            : fallbackTicks * 100;
        const elapsedMs = accumulatedRecordingMsRef.current + activeSegmentMs;
        const elapsed = Math.floor(elapsedMs / 1000);
        setRecordingElapsedMs(elapsedMs);
        setRecordingTime(elapsed);

        if (elapsed > 0 && elapsed !== lastLoggedSecond) {
          lastLoggedSecond = elapsed;
          const ctx = audioContextRef.current;
          const srcNode = sourceNodeRef.current;
          const procNode = processorRef.current;
          const primaryTrack = activeStreamRef.current?.getAudioTracks?.()[0];
          const trackSettings = primaryTrack?.getSettings ? primaryTrack.getSettings() : {};
          const liveChunks = pcmChunksRef.current;
          const liveAmplitude = verifyPcmBufferNonZeroAmplitude(liveChunks);
          const activeSampleRate = ctx?.sampleRate ?? sampleRateRef.current ?? 44100;
          const estimatedDurationSec =
            activeSampleRate > 0 ? liveAmplitude.totalSamples / activeSampleRate : 0;

          const recordingHeartbeatDiag = {
            elapsedRecordingSeconds: elapsed,
            mediaRecorderState: mediaRecorderRef.current?.state ?? 'recording',
            audioContextState: ctx?.state ?? 'none',
            sampleRates: {
              audioContextSampleRate: ctx?.sampleRate ?? null,
              normalizedSampleRate: sampleRateRef.current,
              trackSampleRate: trackSettings.sampleRate ?? null,
            },
            channelCounts: {
              trackChannelCount: trackSettings.channelCount ?? null,
              sourceChannelCount: srcNode?.channelCount ?? null,
              processorChannelCount: procNode?.channelCount ?? null,
              destinationChannelCount: ctx?.destination?.channelCount ?? null,
              destinationMaxChannelCount: ctx?.destination?.maxChannelCount ?? null,
            },
            bufferAmplitude: {
              capturedChunkCount: liveChunks.length,
              mediaRecorderChunkCount: mediaRecorderChunksRef.current.length,
              totalSamples: liveAmplitude.totalSamples,
              nonZeroSampleCount: liveAmplitude.nonZeroSampleCount,
              audibleSampleCount: liveAmplitude.audibleSampleCount,
              nonZeroRatio: Number(liveAmplitude.nonZeroRatio.toFixed(4)),
              minSample: Number(liveAmplitude.minSample.toFixed(6)),
              maxSample: Number(liveAmplitude.maxSample.toFixed(6)),
              peakAmplitude: Number(liveAmplitude.peakAmplitude.toFixed(6)),
              rmsAmplitude: Number(liveAmplitude.rmsAmplitude.toFixed(6)),
              rmsDbFs: Number.isFinite(liveAmplitude.rmsDbFs)
                ? `${liveAmplitude.rmsDbFs.toFixed(2)} dBFS`
                : '-Inf dBFS',
              hasNonZeroSamples: liveAmplitude.hasNonZeroSamples,
              hasNonZeroAmplitude: liveAmplitude.hasNonZeroAmplitude,
              isSilent: liveAmplitude.isSilent,
            },
            estimatedWavDurationSeconds: Number(estimatedDurationSec.toFixed(4)),
            formattedEstimatedDuration: formatDurationDisplay(estimatedDurationSec),
          };

          console.log(
            `[AiAudioTranscriber] Recording heartbeat (${elapsed}s) — audioContext state, sampleRates, channelCounts & bufferAmplitude:`,
            recordingHeartbeatDiag
          );

          if (ctx?.state !== 'running' || liveChunks.length === 0 || liveAmplitude.isSilent) {
            console.warn(
              `[AiAudioTranscriber] Recording diagnostic warning at ${elapsed}s (potential cause of 0:00 duration or silent playback):`,
              {
                isAudioContextSuspendedOrClosed: ctx?.state !== 'running',
                isNoPcmChunksCaptured: liveChunks.length === 0,
                isPcmBufferSilent: liveAmplitude.isSilent,
                ...recordingHeartbeatDiag,
              }
            );
          }
        }
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  /**
   * Real-time Canvas Audio Waveform Visualizer:
   * Draws both the rolling amplitude history bars and the live time-domain oscilloscope
   * waveform while recording to provide clear visual feedback that audio is being captured.
   */
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const drawFrame = (activeRecording: boolean) => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Calculate dynamic theme gradient colors
      const currentThemeId = waveformThemeRef.current || waveformTheme;
      const customStart = customStartColorRef.current || customStartColor;
      const customEnd = customEndColorRef.current || customEndColor;

      let topFillColor = 'rgba(52, 211, 153, 0.32)';
      let midFillColor = 'rgba(99, 102, 241, 0.08)';
      let bottomFillColor = 'rgba(52, 211, 153, 0.32)';
      let strokeActive = '#34d399';
      let strokeInactive = '#818cf8';
      let barActiveColor = 'rgba(16, 185, 129, 0.28)';

      if (currentThemeId === 'cyan-blue') {
        topFillColor = 'rgba(34, 211, 238, 0.35)';
        midFillColor = 'rgba(59, 130, 246, 0.08)';
        bottomFillColor = 'rgba(34, 211, 238, 0.35)';
        strokeActive = '#22d3ee';
        strokeInactive = '#60a5fa';
        barActiveColor = 'rgba(6, 182, 212, 0.30)';
      } else if (currentThemeId === 'sunset-amber') {
        topFillColor = 'rgba(251, 146, 60, 0.35)';
        midFillColor = 'rgba(234, 179, 8, 0.08)';
        bottomFillColor = 'rgba(251, 146, 60, 0.35)';
        strokeActive = '#fb923c';
        strokeInactive = '#facc15';
        barActiveColor = 'rgba(245, 158, 11, 0.30)';
      } else if (currentThemeId === 'purple-pink') {
        topFillColor = 'rgba(232, 121, 249, 0.35)';
        midFillColor = 'rgba(168, 85, 247, 0.08)';
        bottomFillColor = 'rgba(232, 121, 249, 0.35)';
        strokeActive = '#e879f9';
        strokeInactive = '#c084fc';
        barActiveColor = 'rgba(192, 132, 252, 0.30)';
      } else if (currentThemeId === 'fire-ruby') {
        topFillColor = 'rgba(251, 113, 133, 0.35)';
        midFillColor = 'rgba(239, 68, 68, 0.08)';
        bottomFillColor = 'rgba(251, 113, 133, 0.35)';
        strokeActive = '#fb7185';
        strokeInactive = '#f87171';
        barActiveColor = 'rgba(244, 63, 94, 0.30)';
      } else if (currentThemeId === 'custom') {
        topFillColor = hexToRgba(customStart, 0.36);
        midFillColor = hexToRgba(customEnd, 0.10);
        bottomFillColor = hexToRgba(customStart, 0.36);
        strokeActive = customStart;
        strokeInactive = customEnd;
        barActiveColor = hexToRgba(customStart, 0.30);
      }

      // Studio dark background
      ctx2d.fillStyle = '#020617';
      ctx2d.fillRect(0, 0, width, height);

      // Subtle reference grid lines (±50% amplitude and 0.0 center axis)
      ctx2d.lineWidth = 1;
      ctx2d.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx2d.beginPath();
      ctx2d.moveTo(0, height * 0.25);
      ctx2d.lineTo(width, height * 0.25);
      ctx2d.moveTo(0, height * 0.75);
      ctx2d.lineTo(width, height * 0.75);
      ctx2d.stroke();

      ctx2d.strokeStyle = activeRecording
        ? hexToRgba(strokeInactive, 0.4)
        : 'rgba(71, 85, 105, 0.45)';
      ctx2d.beginPath();
      ctx2d.moveTo(0, centerY);
      ctx2d.lineTo(width, centerY);
      ctx2d.stroke();

      // Gather time-domain waveform samples from AnalyserNode or latest captured PCM chunk
      let timeSamples: Float32Array | null = null;
      const analyser = analyserRef.current;

      if (activeRecording && analyser) {
        const bufferLength = analyser.fftSize || 2048;
        const floatBuf = new Float32Array(bufferLength);
        if (typeof analyser.getFloatTimeDomainData === 'function') {
          analyser.getFloatTimeDomainData(floatBuf);
        } else {
          const byteBuf = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(byteBuf);
          for (let i = 0; i < bufferLength; i += 1) {
            floatBuf[i] = (byteBuf[i] - 128) / 128;
          }
        }

        let hasNonZeroFromAnalyser = false;
        for (let i = 0; i < floatBuf.length; i += 1) {
          if (Math.abs(floatBuf[i]) > 1e-5) {
            hasNonZeroFromAnalyser = true;
            break;
          }
        }

        if (hasNonZeroFromAnalyser) {
          timeSamples = floatBuf;
        }
      }

      if (!timeSamples && latestWaveformChunkRef.current && latestWaveformChunkRef.current.length > 0) {
        timeSamples = latestWaveformChunkRef.current;
      }

      const peakHistory = rollingPeakHistoryRef.current;
      const currentStyle = visualizerStyleRef.current || visualizerStyle;

      if (currentStyle === 'bar-graph') {
        // Draw Equalizer Frequency Bar Graph Style
        const numBars = 52;
        const barSpacing = width / numBars;
        const barWidth = Math.max(2.5, barSpacing * 0.7);
        const startIdx = Math.max(0, peakHistory.length - numBars);

        for (let i = 0; i < numBars; i += 1) {
          const rawPeak = peakHistory[startIdx + i] || (timeSamples ? Math.abs(timeSamples[Math.floor((i / numBars) * timeSamples.length)] || 0) : 0);
          const scaledPeak = Math.min(1, Math.pow(rawPeak, 0.6) * 1.45);
          const barH = Math.max(4, scaledPeak * (height * 0.72));
          const x = i * barSpacing + (barSpacing - barWidth) / 2;
          const y = centerY - barH / 2;

          const barGrad = ctx2d.createLinearGradient(x, y, x, y + barH);
          barGrad.addColorStop(0, strokeActive);
          barGrad.addColorStop(1, strokeInactive);

          ctx2d.fillStyle = barGrad;
          ctx2d.beginPath();
          if (typeof ctx2d.roundRect === 'function') {
            ctx2d.roundRect(x, y, barWidth, barH, 4);
          } else {
            ctx2d.rect(x, y, barWidth, barH);
          }
          ctx2d.fill();
        }
      } else if (currentStyle === 'circular-wave') {
        // Draw Circular Pulsating Wave Style
        const radius = Math.min(width, height) * 0.25;
        const centerX = width / 2;
        const centerYCoord = height / 2;
        const numPoints = 120;

        let avgVal = 0;
        if (timeSamples && timeSamples.length > 0) {
          for (let i = 0; i < timeSamples.length; i += 1) {
            avgVal += Math.abs(timeSamples[i]);
          }
          avgVal /= timeSamples.length;
        }

        const pulseRadius = radius + Math.min(45, avgVal * 110);

        ctx2d.beginPath();
        for (let i = 0; i <= numPoints; i += 1) {
          const angle = (i / numPoints) * Math.PI * 2;
          const sampleIdx = timeSamples ? Math.floor((i / numPoints) * timeSamples.length) : 0;
          const sampleVal = timeSamples ? (timeSamples[sampleIdx] || 0) : 0;
          const r = pulseRadius + sampleVal * 32;
          const x = centerX + Math.cos(angle) * r;
          const y = centerYCoord + Math.sin(angle) * r;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.closePath();

        const circGrad = ctx2d.createRadialGradient(centerX, centerYCoord, radius * 0.4, centerX, centerYCoord, pulseRadius * 1.25);
        circGrad.addColorStop(0, topFillColor);
        circGrad.addColorStop(0.65, midFillColor);
        circGrad.addColorStop(1, 'transparent');
        ctx2d.fillStyle = circGrad;
        ctx2d.fill();

        ctx2d.strokeStyle = strokeActive;
        ctx2d.lineWidth = 2.2;
        ctx2d.stroke();
      } else {
        // Default 'waveform' oscilloscope style: rolling peak history bars in background + oscilloscope trace on top
        if (peakHistory.length > 0) {
          const maxBars = 64;
          const barSpacing = width / maxBars;
          const barWidth = Math.max(2, barSpacing * 0.58);
          const startIdx = Math.max(0, peakHistory.length - maxBars);

          for (let i = startIdx; i < peakHistory.length; i += 1) {
            const slot = i - startIdx;
            const x = slot * barSpacing + (barSpacing - barWidth) / 2;
            const rawPeak = peakHistory[i] || 0;
            const scaledPeak = Math.min(1, Math.pow(rawPeak, 0.65) * 1.35);
            const barHalfHeight = Math.max(1.5, scaledPeak * (height * 0.44));

            ctx2d.fillStyle = activeRecording
              ? rawPeak > 1e-4
                ? barActiveColor
                : hexToRgba(strokeInactive, 0.16)
              : hexToRgba(strokeInactive, 0.22);
            ctx2d.fillRect(x, centerY - barHalfHeight, barWidth, barHalfHeight * 2);
          }
        }

        if (timeSamples && timeSamples.length > 0) {
          let framePeak = 0;
          for (let i = 0; i < timeSamples.length; i += 1) {
            const abs = Math.abs(timeSamples[i]);
            if (abs > framePeak) framePeak = abs;
          }

          const hasActiveSignal = framePeak > 1e-4;
          const visualGain = framePeak > 0 && framePeak < 0.25 ? Math.min(3.2, 0.35 / framePeak) : 1.15;

          const gradient = ctx2d.createLinearGradient(0, 0, 0, height);
          if (activeRecording && hasActiveSignal) {
            gradient.addColorStop(0, topFillColor);
            gradient.addColorStop(0.5, midFillColor);
            gradient.addColorStop(1, bottomFillColor);
          } else {
            gradient.addColorStop(0, hexToRgba(strokeInactive, 0.18));
            gradient.addColorStop(0.5, hexToRgba(strokeInactive, 0.04));
            gradient.addColorStop(1, hexToRgba(strokeInactive, 0.18));
          }

          const step = Math.max(1, Math.floor(timeSamples.length / width));
          ctx2d.beginPath();
          ctx2d.moveTo(0, centerY);
          for (let x = 0; x < width; x += 1) {
            const sampleIdx = Math.min(timeSamples.length - 1, x * step);
            const sample = Math.max(-1, Math.min(1, (timeSamples[sampleIdx] || 0) * visualGain));
            const y = centerY - sample * (height * 0.42);
            ctx2d.lineTo(x, y);
          }
          ctx2d.lineTo(width, centerY);
          ctx2d.closePath();
          ctx2d.fillStyle = gradient;
          ctx2d.fill();

          ctx2d.beginPath();
          ctx2d.lineWidth = activeRecording && hasActiveSignal ? 2.2 : 1.6;
          ctx2d.strokeStyle = activeRecording
            ? hasActiveSignal
              ? strokeActive
              : strokeInactive
            : strokeInactive;

          for (let x = 0; x < width; x += 1) {
            const sampleIdx = Math.min(timeSamples.length - 1, x * step);
            const sample = Math.max(-1, Math.min(1, (timeSamples[sampleIdx] || 0) * visualGain));
            const y = centerY - sample * (height * 0.42);
            if (x === 0) {
              ctx2d.moveTo(x, y);
            } else {
              ctx2d.lineTo(x, y);
            }
          }
          ctx2d.stroke();
        }
      }

      // 3. Draw real-time recording duration timer overlay directly on the visualizer canvas
      let liveElapsedSeconds = recordingTime;
      const pausedNow = isPausedRef.current || isPaused;
      if (activeRecording) {
        const activeSegmentMs =
          !pausedNow && recordingStartTimestampRef.current > 0
            ? Math.max(0, Date.now() - recordingStartTimestampRef.current)
            : 0;
        const totalMs = accumulatedRecordingMsRef.current + activeSegmentMs;
        if (totalMs > 0) {
          liveElapsedSeconds = totalMs / 1000;
        } else if (pcmChunksRef.current.length > 0 && sampleRateRef.current > 0) {
          let totalCapturedSamples = 0;
          for (let i = 0; i < pcmChunksRef.current.length; i += 1) {
            totalCapturedSamples += pcmChunksRef.current[i].length;
          }
          liveElapsedSeconds = totalCapturedSamples / sampleRateRef.current;
        }
      } else if (wavValidation?.durationSeconds && wavValidation.durationSeconds > 0) {
        liveElapsedSeconds = wavValidation.durationSeconds;
      }

      const timerLabel = activeRecording
        ? pausedNow
          ? `PAUSED ${formatRecordingTimerOverlay(liveElapsedSeconds)}`
          : `REC ${formatRecordingTimerOverlay(liveElapsedSeconds)}`
        : liveElapsedSeconds > 0
        ? `DUR ${formatRecordingTimerOverlay(liveElapsedSeconds)}`
        : '00:00.0';

      ctx2d.save();
      ctx2d.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      const textMetrics = ctx2d.measureText(timerLabel);
      const dotSpace = activeRecording ? 12 : 0;
      const padX = 8;
      const badgeWidth = Math.ceil(textMetrics.width + dotSpace + padX * 2);
      const badgeHeight = 22;
      const badgeX = width - badgeWidth - 8;
      const badgeY = 8;

      ctx2d.fillStyle = activeRecording
        ? 'rgba(15, 23, 42, 0.86)'
        : 'rgba(15, 23, 42, 0.78)';
      ctx2d.strokeStyle = activeRecording
        ? pausedNow
          ? 'rgba(251, 191, 36, 0.55)'
          : 'rgba(248, 113, 113, 0.55)'
        : 'rgba(71, 85, 105, 0.55)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      if (typeof ctx2d.roundRect === 'function') {
        ctx2d.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
      } else {
        ctx2d.rect(badgeX, badgeY, badgeWidth, badgeHeight);
      }
      ctx2d.fill();
      ctx2d.stroke();

      if (activeRecording) {
        const pulseAlpha = pausedNow ? 0.9 : 0.55 + 0.45 * Math.sin(Date.now() / 180);
        ctx2d.fillStyle = pausedNow
          ? `rgba(251, 191, 36, ${pulseAlpha.toFixed(2)})`
          : `rgba(248, 113, 113, ${pulseAlpha.toFixed(2)})`;
        ctx2d.beginPath();
        ctx2d.arc(badgeX + padX + 3.5, badgeY + badgeHeight / 2, 3.5, 0, Math.PI * 2);
        ctx2d.fill();
      }

      ctx2d.fillStyle = activeRecording ? (pausedNow ? '#fde68a' : '#fecaca') : '#cbd5e1';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(timerLabel, badgeX + padX + dotSpace, badgeY + badgeHeight / 2 + 0.5);
      ctx2d.restore();
    };

    if (isRecording && !isPaused) {
      const renderLoop = () => {
        drawFrame(true);
        waveformRafRef.current = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    } else {
      if (waveformRafRef.current !== null) {
        cancelAnimationFrame(waveformRafRef.current);
        waveformRafRef.current = null;
      }
      drawFrame(isRecording);
    }

    return () => {
      if (waveformRafRef.current !== null) {
        cancelAnimationFrame(waveformRafRef.current);
        waveformRafRef.current = null;
      }
    };
  }, [isRecording, isPaused, audioUrl, recordingTime, wavValidation]);

  const startMonitoring = useCallback(async () => {
    if (isRecording || isMonitoring) return;
    clearError();
    addLog('info', 'Starting microphone level monitoring (test signal before recording)...');

    if (!window.isSecureContext) {
      reportError('mic', 'Microphone monitoring requires a secure HTTPS connection or localhost.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reportError('mic', 'Your browser does not expose navigator.mediaDevices.getUserMedia.');
      return;
    }

    try {
      const targetPreset =
        RECORDING_PRESETS.find((p) => p.id === recordingPreset) || RECORDING_PRESETS[0];
      const targetSampleRate = targetPreset.sampleRate;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: { ideal: targetSampleRate },
            channelCount: { ideal: 1 },
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      await stopRecordingGraph();

      activeStreamRef.current = stream;
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      let context: AudioContext;
      try {
        context = new AudioContextCtor({ sampleRate: targetSampleRate });
      } catch {
        context = new AudioContextCtor();
      }
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume();
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;

      const silentGain = context.createGain();
      silentGain.gain.value = 0; // Prevent acoustic feedback through speakers

      source.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      sourceNodeRef.current = source;
      analyserRef.current = analyser;
      silentGainRef.current = silentGain;
      sampleRateRef.current = Math.round(Number(context.sampleRate || targetSampleRate));

      isMonitoringRef.current = true;
      setIsMonitoring(true);
      addLog('info', 'Microphone level monitoring is active. AnalyserNode frequency data streaming.');
    } catch (err: any) {
      reportError('mic', `Microphone monitoring failed: ${err?.message || err}`);
    }
  }, [clearError, isMonitoring, isRecording, recordingPreset, reportError, stopRecordingGraph, addLog]);

  const stopMonitoring = useCallback(async () => {
    isMonitoringRef.current = false;
    setIsMonitoring(false);
    await stopRecordingGraph();
    addLog('info', 'Microphone level monitoring stopped.');
  }, [stopRecordingGraph, addLog]);

  const toggleMonitoring = useCallback(async () => {
    if (isMonitoring) {
      await stopMonitoring();
    } else {
      await startMonitoring();
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  /**
   * Real-time Peak Audio Level Meter (Bar Graph)
   * Samples the AnalyserNode's frequency data (getByteFrequencyData) to provide
   * immediate visual feedback on input signal strength before (via monitoring)
   * and during recording.
   */
  useEffect(() => {
    const canvas = peakMeterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numBands = 28;
    if (peakHoldHistoryRef.current.length !== numBands) {
      peakHoldHistoryRef.current = new Array(numBands).fill(0);
    }

    let rafId: number;
    let lastStateUpdateTime = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const analyser = analyserRef.current;
      const isActive = (isRecording && !isPaused) || isMonitoring;

      // Studio dark background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      let currentPeakRatio = 0;
      const bandValues: number[] = new Array(numBands).fill(0);

      if (isActive && analyser) {
        const binCount = analyser.frequencyBinCount;
        const freqData = new Uint8Array(binCount);
        analyser.getByteFrequencyData(freqData);

        for (let b = 0; b < numBands; b += 1) {
          // Logarithmic bin mapping concentrates resolution in vocal fundamentals (100Hz - 4kHz)
          const startBin = Math.floor(Math.pow(b / numBands, 2.0) * (binCount * 0.8));
          const endBin = Math.max(
            startBin + 1,
            Math.floor(Math.pow((b + 1) / numBands, 2.0) * (binCount * 0.8))
          );
          let sum = 0;
          let count = 0;
          for (let i = startBin; i < endBin && i < binCount; i += 1) {
            sum += freqData[i];
            count += 1;
          }
          const avg = count > 0 ? sum / count : 0;
          const ratio = avg / 255;
          bandValues[b] = ratio;
          if (ratio > currentPeakRatio) {
            currentPeakRatio = ratio;
          }
        }
      }

      // Master peak hold with decay
      const now = Date.now();
      if (currentPeakRatio >= masterPeakHoldRef.current.value) {
        masterPeakHoldRef.current = { value: currentPeakRatio, timestamp: now };
      } else if (now - masterPeakHoldRef.current.timestamp > 750) {
        masterPeakHoldRef.current.value = Math.max(
          0,
          masterPeakHoldRef.current.value - 0.03
        );
      }

      const masterPeak = masterPeakHoldRef.current.value;
      const peakDb =
        masterPeak > 1e-4 ? Math.max(-60, 20 * Math.log10(masterPeak)) : -60;

      // Throttle React state updates so we don't cause React re-render thrashing at 60fps
      if (now - lastStateUpdateTime > 120) {
        lastStateUpdateTime = now;
        setMeterPeakDb(Math.round(peakDb * 10) / 10);
        if (!isActive) {
          setMeterSignalStatus('idle');
        } else if (masterPeak < 0.06) {
          setMeterSignalStatus('low');
        } else if (masterPeak <= 0.78) {
          setMeterSignalStatus('optimal');
        } else if (masterPeak <= 0.92) {
          setMeterSignalStatus('loud');
        } else {
          setMeterSignalStatus('clipping');
        }
      }

      // Meter Layout dimensions
      const padX = 10;
      const meterWidth = width - padX * 2;
      const topBarY = 7;
      const topBarHeight = 10;
      const barsY = 22;
      const barsHeight = height - barsY - 8;

      // 1. Draw Master Peak Horizontal Level Bar
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(padX, topBarY, meterWidth, topBarHeight, 3);
      } else {
        ctx.rect(padX, topBarY, meterWidth, topBarHeight);
      }
      ctx.fill();

      // Master active fill
      const activeBarWidth = Math.max(0, Math.min(meterWidth, meterWidth * currentPeakRatio));
      if (activeBarWidth > 0) {
        const gradient = ctx.createLinearGradient(padX, 0, padX + meterWidth, 0);
        gradient.addColorStop(0, '#10b981'); // Safe / Green
        gradient.addColorStop(0.68, '#34d399');
        gradient.addColorStop(0.8, '#f59e0b'); // Warning / Amber
        gradient.addColorStop(0.92, '#ef4444'); // Clipping / Red
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(padX, topBarY, activeBarWidth, topBarHeight, 3);
        } else {
          ctx.rect(padX, topBarY, activeBarWidth, topBarHeight);
        }
        ctx.fill();
      }

      // Master Peak Hold Indicator
      if (masterPeak > 0.02) {
        const holdX = padX + Math.min(meterWidth - 2, meterWidth * masterPeak);
        ctx.fillStyle = masterPeak > 0.9 ? '#ef4444' : masterPeak > 0.75 ? '#f59e0b' : '#38bdf8';
        ctx.fillRect(Math.max(padX, holdX - 1), topBarY - 1, 2.5, topBarHeight + 2);
      }

      // dBFS Scale tick markers along top bar
      const dbTicks = [
        { label: '-48', ratio: 0.15 },
        { label: '-24', ratio: 0.42 },
        { label: '-12', ratio: 0.68 },
        { label: '-6', ratio: 0.84 },
        { label: '0dB', ratio: 0.98 },
      ];
      ctx.font = '500 8px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.textBaseline = 'top';
      for (const tick of dbTicks) {
        const tx = padX + meterWidth * tick.ratio;
        ctx.fillRect(tx, topBarY + topBarHeight, 1, 2);
      }

      // 2. Draw Segmented Frequency Band Bars (Bar Graph)
      const gap = 2.5;
      const totalGaps = (numBands - 1) * gap;
      const barWidth = Math.max(2, (meterWidth - totalGaps) / numBands);

      for (let b = 0; b < numBands; b += 1) {
        const bx = padX + b * (barWidth + gap);
        const val = bandValues[b] || 0;

        // Peak hold decay per band
        const prevHold = peakHoldHistoryRef.current[b] || 0;
        const currentHold = Math.max(val, prevHold - 0.025);
        peakHoldHistoryRef.current[b] = currentHold;

        // Background slot
        ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
        ctx.fillRect(bx, barsY, barWidth, barsHeight);

        // Active frequency bar height
        const barH = Math.max(0, Math.min(barsHeight, val * barsHeight));
        if (barH > 0) {
          const by = barsY + barsHeight - barH;
          const ratio = barH / barsHeight;
          ctx.fillStyle = ratio > 0.88 ? '#ef4444' : ratio > 0.68 ? '#f59e0b' : '#10b981';
          ctx.fillRect(bx, by, barWidth, barH);
        }

        // Peak hold tick mark
        const holdH = Math.min(barsHeight, currentHold * barsHeight);
        if (holdH > 1.5) {
          const holdY = barsY + barsHeight - holdH;
          ctx.fillStyle = currentHold > 0.88 ? '#fca5a5' : currentHold > 0.68 ? '#fde68a' : '#a7f3d0';
          ctx.fillRect(bx, Math.max(barsY, holdY - 1), barWidth, 1.5);
        }
      }

      // 3. Status text watermark on meter when idle
      if (!isActive) {
        ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Input Meter Idle • Click "Test Mic Level" to check signal', width / 2, barsY + barsHeight / 2);
        ctx.textAlign = 'start';
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isRecording, isPaused, isMonitoring]);

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

  const initPcmRecorder = async (stream: MediaStream, targetSampleRate = 44100) => {
    await stopRecordingGraph();

    try {
      navigator.vibrate?.([40, 30, 40]);
    } catch {
      // Ignore vibration errors if unsupported
    }

    activeStreamRef.current = stream;
    pcmChunksRef.current = [];
    mediaRecorderChunksRef.current = [];
    accumulatedRecordingMsRef.current = 0;
    recordingStartTimestampRef.current = Date.now();
    isPausedRef.current = false;
    isAutoPausedRef.current = false;
    silenceStartTimestampRef.current = 0;
    setIsPaused(false);
    setIsAutoPaused(false);
    setSilenceDurationSeconds(0);
    setInputLevelPeak(0);
    totalCapturedSamplesRef.current = 0;
    lastMetaUpdateRef.current = 0;

    const initialRate = targetSampleRate || 44100;
    const initialBitRate = (initialRate * 1 * 16) / 1000;
    setSessionMetadata({
      durationSeconds: 0,
      formattedDuration: '00:00.0',
      bitRateKbps: initialBitRate,
      dataRateKbPerSec: initialBitRate / 8,
      fileSizeBytes: 44,
      formattedFileSize: '44 B',
      chunkCount: 0,
      totalSamples: 0,
      sampleRate: initialRate,
      bitsPerSample: 16,
      channels: 1,
      formatName: '16-bit Linear PCM WAV',
    });

    // Initialize MediaRecorder to manage 'recording' / 'paused' state and append chunks to a continuous buffer
    if (typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined') {
      try {
        const recorder = new window.MediaRecorder(stream);
        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) {
            mediaRecorderChunksRef.current.push(ev.data);
          }
        };
        recorder.onpause = () => {
          setMediaRecorderState('paused');
        };
        recorder.onresume = () => {
          setMediaRecorderState('recording');
        };
        recorder.onstop = () => {
          setMediaRecorderState('inactive');
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setMediaRecorderState(recorder.state);
      } catch {
        setMediaRecorderState('recording');
      }
    } else {
      setMediaRecorderState('recording');
    }

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
      targetPresetSampleRate: targetSampleRate,
    };

    console.log(
      '[AiAudioTranscriber] AudioContext lifecycle — MediaStream acquired (monitoring track sampleRate & channelCount):',
      streamTrackDiag
    );
    addLog(
      'info',
      `Microphone stream acquired for preset target ${targetSampleRate} Hz. Inspecting audio tracks & channel settings...`,
      streamTrackDiag
    );

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    let context: AudioContext;
    try {
      context = new AudioContextCtor({ sampleRate: targetSampleRate });
    } catch {
      context = new AudioContextCtor();
    }
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

    const audioContext = context;
    const rawSampleRate = Number(audioContext.sampleRate || 44100);
    const normalizedSampleRate = Math.round(rawSampleRate);
    sampleRateRef.current = normalizedSampleRate;

    const source = audioContext.createMediaStreamSource(stream);
    const channelCount = Math.max(
      1,
      Math.min(2, Number(trackSettings.channelCount) || source.channelCount || 1)
    );
    const detectedInputChannels = channelCount;

    console.log(
      '[AiAudioTranscriber] Stream initialized — audioContext.state, audioContext.sampleRate & channelCount:',
      {
        'audioContext.state': audioContext.state,
        'audioContext.sampleRate': audioContext.sampleRate,
        channelCount,
        audioContextState: audioContext.state,
        audioContextSampleRate: audioContext.sampleRate,
        normalizedSampleRate,
        sourceChannelCount: source.channelCount,
        trackChannelCount: trackSettings.channelCount ?? null,
        destinationChannelCount: audioContext.destination.channelCount,
      }
    );

    let processor: ScriptProcessorNode;
    try {
      processor = audioContext.createScriptProcessor(2048, detectedInputChannels, 1);
    } catch {
      processor = audioContext.createScriptProcessor(2048, 1, 1);
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const silentGain = context.createGain();
    silentGain.gain.value = 0;

    latestWaveformChunkRef.current = null;
    rollingPeakHistoryRef.current = [];

    sourceNodeRef.current = source;
    analyserRef.current = analyser;
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

      // Sample input buffer peak amplitude for real-time silence & sound detection
      let framePeakAmplitude = 0;
      for (let ch = 0; ch < numChannels; ch += 1) {
        const chData = inputBuffer.getChannelData(ch);
        for (let i = 0; i < frameLength; i += 1) {
          const s = chData[i];
          if (!Number.isFinite(s)) continue;
          const abs = Math.abs(s);
          if (abs > framePeakAmplitude) framePeakAmplitude = abs;
        }
      }

      const SILENCE_THRESHOLD = 0.015;
      const SOUND_RESUME_THRESHOLD = 0.028;
      const SILENCE_PAUSE_MS = 5000;

      // IF PAUSED or AUTO-PAUSED:
      if (isPausedRef.current || mediaRecorderRef.current?.state === 'paused') {
        if (isAutoPausedRef.current && autoPauseOnSilenceRef.current) {
          if (framePeakAmplitude >= SOUND_RESUME_THRESHOLD) {
            // Sound/Speech detected! Auto-resume recording
            isPausedRef.current = false;
            isAutoPausedRef.current = false;
            setIsPaused(false);
            setIsAutoPaused(false);
            silenceStartTimestampRef.current = 0;
            setSilenceDurationSeconds(0);
            recordingStartTimestampRef.current = Date.now();

            const mr = mediaRecorderRef.current;
            if (mr && mr.state === 'paused') {
              try {
                mr.resume();
              } catch {
                // Ignore MediaRecorder resume error if unsupported
              }
            }
            setMediaRecorderState('recording');

            addLog(
              'info',
              `Auto-resumed recording: Speech/sound detected (peak level ${framePeakAmplitude.toFixed(4)}).`
            );
          }
        }
        return;
      }

      // IF ACTIVELY RECORDING:
      if (framePeakAmplitude < SILENCE_THRESHOLD) {
        if (silenceStartTimestampRef.current === 0) {
          silenceStartTimestampRef.current = Date.now();
        }
        const silenceMs = Date.now() - silenceStartTimestampRef.current;
        setSilenceDurationSeconds(Math.min(5.0, silenceMs / 1000));

        if (silenceMs >= SILENCE_PAUSE_MS && autoPauseOnSilenceRef.current && !isPausedRef.current) {
          // Continuous silence >= 5s detected! Auto-pause recording
          if (recordingStartTimestampRef.current > 0) {
            accumulatedRecordingMsRef.current += Math.max(
              0,
              Date.now() - recordingStartTimestampRef.current
            );
            recordingStartTimestampRef.current = 0;
          }

          isPausedRef.current = true;
          isAutoPausedRef.current = true;
          setIsPaused(true);
          setIsAutoPaused(true);
          setInputLevelPeak(0);

          const mr = mediaRecorderRef.current;
          if (mr && mr.state === 'recording') {
            try {
              mr.pause();
            } catch {
              // Ignore MediaRecorder pause error if unsupported
            }
          }
          setMediaRecorderState('paused');

          addLog(
            'info',
            `Auto-paused recording: 5 seconds of continuous silence detected (< ${SILENCE_THRESHOLD} peak). Listening for sound to resume...`
          );
          return;
        }
      } else {
        silenceStartTimestampRef.current = 0;
        setSilenceDurationSeconds(0);
      }

      // Web Audio API Noise Gate dynamic attenuation
      const framePeakDb = framePeakAmplitude > 0 ? 20 * Math.log10(framePeakAmplitude) : -100;
      const gateThresholdDb = noiseGateThresholdDbRef.current;
      const isGateEnabled = enableNoiseGateRef.current;

      let gateMultiplier = 1.0;
      if (isGateEnabled) {
        if (framePeakDb >= gateThresholdDb) {
          // Gate OPEN: Signal above threshold (speech)
          gateMultiplier = 1.0;
          setIsNoiseGateOpen(true);
          if (noiseGateGainNodeRef.current && context) {
            try {
              noiseGateGainNodeRef.current.gain.setTargetAtTime(1.0, context.currentTime, 0.01);
            } catch {
              // Ignore node automation errors
            }
          }
        } else {
          // Gate CLOSED: Suppress ambient room noise
          gateMultiplier = 0.02; // ~34 dB noise reduction
          setIsNoiseGateOpen(false);
          if (noiseGateGainNodeRef.current && context) {
            try {
              noiseGateGainNodeRef.current.gain.setTargetAtTime(0.02, context.currentTime, 0.08);
            } catch {
              // Ignore node automation errors
            }
          }
        }
      } else {
        setIsNoiseGateOpen(true);
        if (noiseGateGainNodeRef.current && context) {
          try {
            noiseGateGainNodeRef.current.gain.setValueAtTime(1.0, context.currentTime);
          } catch {
            // Ignore node automation errors
          }
        }
      }

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

      // Suppress ambient noise in recorded PCM memory buffer when gate is closed
      if (isGateEnabled && gateMultiplier < 1.0) {
        for (let i = 0; i < copy.length; i += 1) {
          copy[i] *= gateMultiplier;
        }
      }

      pcmChunksRef.current.push(copy);
      latestWaveformChunkRef.current = copy;
      processedChunkCounter += 1;
      totalCapturedSamplesRef.current += copy.length;

      // Update real-time session metadata dynamically as audio chunks are processed
      const now = Date.now();
      if (now - lastMetaUpdateRef.current > 120 || processedChunkCounter === 1) {
        lastMetaUpdateRef.current = now;
        const currentSamples = totalCapturedSamplesRef.current;
        const sRate = normalizedSampleRate || 44100;
        const durSec = sRate > 0 ? currentSamples / sRate : 0;
        const wavDataBytes = currentSamples * 2;
        const totalWavBytes = 44 + wavDataBytes;
        const bitRate = (sRate * 1 * 16) / 1000;
        const dataRate = bitRate / 8;

        setSessionMetadata({
          durationSeconds: durSec,
          formattedDuration: formatRecordingTimerOverlay(durSec),
          bitRateKbps: bitRate,
          dataRateKbPerSec: dataRate,
          fileSizeBytes: totalWavBytes,
          formattedFileSize: formatFileSizeBytes(totalWavBytes),
          chunkCount: pcmChunksRef.current.length,
          totalSamples: currentSamples,
          sampleRate: sRate,
          bitsPerSample: 16,
          channels: 1,
          formatName: '16-bit Linear PCM WAV',
        });
      }

      const chunkCheck = verifyPcmBufferNonZeroAmplitude(copy);
      rollingPeakHistoryRef.current.push(chunkCheck.peakAmplitude);
      if (rollingPeakHistoryRef.current.length > 96) {
        rollingPeakHistoryRef.current.shift();
      }
      setInputLevelPeak(chunkCheck.peakAmplitude);

      if (!loggedFirstBuffer) {
        loggedFirstBuffer = true;
        const firstBufferDiag = {
          audioContextState: audioContext.state,
          sampleRates: {
            audioContextSampleRate: audioContext.sampleRate,
            inputBufferSampleRate: inputBuffer.sampleRate,
            outputBufferSampleRate: event.outputBuffer.sampleRate,
            trackSampleRate: trackSettings.sampleRate ?? 'browser-default',
            normalizedSampleRate,
          },
          channelCounts: {
            inputBufferNumberOfChannels: inputBuffer.numberOfChannels,
            outputBufferNumberOfChannels: event.outputBuffer.numberOfChannels,
            activeInputChannelsWithSignal: activeChannelCount,
            sourceChannelCount: source.channelCount,
            processorChannelCount: processor.channelCount,
            destinationChannelCount: audioContext.destination.channelCount,
            trackChannelCount: trackSettings.channelCount ?? 'browser-default',
          },
          bufferAmplitude: {
            nonZeroSampleCount: chunkCheck.nonZeroSampleCount,
            audibleSampleCount: chunkCheck.audibleSampleCount,
            totalSamples: chunkCheck.totalSamples,
            hasNonZeroSamples: chunkCheck.hasNonZeroSamples,
            hasNonZeroAmplitude: chunkCheck.hasNonZeroAmplitude,
            isSilent: chunkCheck.isSilent,
            minSample: Number(chunkCheck.minSample.toFixed(6)),
            maxSample: Number(chunkCheck.maxSample.toFixed(6)),
            peakAmplitude: Number(chunkCheck.peakAmplitude.toFixed(6)),
            rmsAmplitude: Number(chunkCheck.rmsAmplitude.toFixed(6)),
            rmsDbFs: Number.isFinite(chunkCheck.rmsDbFs)
              ? `${chunkCheck.rmsDbFs.toFixed(2)} dBFS`
              : '-Inf dBFS',
            channelAmplitudes,
          },
          contextSampleRate: audioContext.sampleRate,
          inputBufferSampleRate: inputBuffer.sampleRate,
          inputBufferNumberOfChannels: inputBuffer.numberOfChannels,
          outputBufferNumberOfChannels: event.outputBuffer.numberOfChannels,
          sourceChannelCount: source.channelCount,
          processorChannelCount: processor.channelCount,
          destinationChannelCount: audioContext.destination.channelCount,
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
          '[AiAudioTranscriber] First PCM buffer captured — audioContext state, sampleRates, channelCounts & bufferAmplitude check:',
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
      } else if (processedChunkCounter % 10 === 0) {
        const cumulativeCheck = verifyPcmBufferNonZeroAmplitude(pcmChunksRef.current);
        const cumulativeSamples = cumulativeCheck.totalSamples;
        const estimatedDurationSeconds =
          audioContext.sampleRate > 0 ? cumulativeSamples / audioContext.sampleRate : 0;
        const progressDiag = {
          chunkIndex: processedChunkCounter,
          audioContextState: audioContext.state,
          sampleRates: {
            audioContextSampleRate: audioContext.sampleRate,
            inputBufferSampleRate: inputBuffer.sampleRate,
            outputBufferSampleRate: event.outputBuffer.sampleRate,
            trackSampleRate: trackSettings.sampleRate ?? 'browser-default',
            normalizedSampleRate,
          },
          channelCounts: {
            inputBufferChannels: inputBuffer.numberOfChannels,
            outputBufferChannels: event.outputBuffer.numberOfChannels,
            activeInputChannelsWithSignal: activeChannelCount,
            sourceChannelCount: source.channelCount,
            processorChannelCount: processor.channelCount,
            destinationChannelCount: audioContext.destination.channelCount,
            trackChannelCount: trackSettings.channelCount ?? 'browser-default',
          },
          bufferAmplitude: {
            chunkNonZeroSamples: chunkCheck.nonZeroSampleCount,
            chunkAudibleSamples: chunkCheck.audibleSampleCount,
            chunkPeakAmplitude: Number(chunkCheck.peakAmplitude.toFixed(5)),
            chunkRmsAmplitude: Number(chunkCheck.rmsAmplitude.toFixed(5)),
            cumulativeSamples,
            cumulativeNonZeroSamples: cumulativeCheck.nonZeroSampleCount,
            cumulativeAudibleSamples: cumulativeCheck.audibleSampleCount,
            cumulativePeakAmplitude: Number(cumulativeCheck.peakAmplitude.toFixed(5)),
            cumulativeRmsAmplitude: Number(cumulativeCheck.rmsAmplitude.toFixed(5)),
            cumulativeHasNonZeroAmplitude: cumulativeCheck.hasNonZeroAmplitude,
            cumulativeIsSilent: cumulativeCheck.isSilent,
          },
          contextSampleRate: audioContext.sampleRate,
          inputBufferSampleRate: inputBuffer.sampleRate,
          inputBufferChannels: inputBuffer.numberOfChannels,
          sourceChannelCount: source.channelCount,
          processorChannelCount: processor.channelCount,
          destinationChannelCount: audioContext.destination.channelCount,
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
          estimatedDurationSeconds: Number(estimatedDurationSeconds.toFixed(4)),
          formattedEstimatedDuration: formatDurationDisplay(estimatedDurationSeconds),
        };
        console.log(
          `[AiAudioTranscriber] Live PCM capture progress (chunk #${processedChunkCounter}) — audioContext state, sampleRates, channelCounts & bufferAmplitude:`,
          progressDiag
        );
        addLog(
          'info',
          `Live PCM capture progress (chunk #${processedChunkCounter}):`,
          progressDiag
        );
      }
    };

    const inputVolumeGain = context.createGain();
    inputVolumeGain.gain.setValueAtTime(inputVolumeSensitivityRef.current, context.currentTime);
    inputVolumeGainNodeRef.current = inputVolumeGain;

    const noiseGateGainNode = context.createGain();
    noiseGateGainNode.gain.setValueAtTime(1.0, context.currentTime);
    noiseGateGainNodeRef.current = noiseGateGainNode;

    source.connect(inputVolumeGain);
    inputVolumeGain.connect(noiseGateGainNode);
    noiseGateGainNode.connect(analyser);
    noiseGateGainNode.connect(processor);
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
    setRecordingElapsedMs(0);

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
    setRecordingTime(0);
    setRecordingElapsedMs(0);
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

    const targetPreset =
      RECORDING_PRESETS.find((p) => p.id === recordingPreset) || RECORDING_PRESETS[0];
    const targetSampleRate = targetPreset.sampleRate;

    try {
      addLog(
        'info',
        `Calling navigator.mediaDevices.getUserMedia for preset "${targetPreset.label}" (${targetSampleRate} Hz)...`
      );
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: { ideal: targetSampleRate },
            channelCount: { ideal: 1 },
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      await initPcmRecorder(stream, targetSampleRate);

      const activeCtx = audioContextRef.current;
      const activeChannelCount =
        sourceNodeRef.current?.channelCount ??
        stream.getAudioTracks()[0]?.getSettings?.().channelCount ??
        1;
      console.log(
        '[AiAudioTranscriber] Microphone stream & AudioContext initialized:',
        {
          'audioContext.state': activeCtx?.state ?? 'unknown',
          'audioContext.sampleRate': activeCtx?.sampleRate ?? sampleRateRef.current,
          channelCount: activeChannelCount,
        }
      );
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

    const hasNonZeroPcmPayload =
      validation.hasNonZeroAudio &&
      validation.nonZeroSampleCount > 0 &&
      validation.peakAmplitude > 0;

    const allHeaderChecksPassed = Object.values(headerChecks).every(Boolean);

    const wavBlobInspection = {
      audioContextState:
        audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
      actualSampleRate:
        audioContextRef.current?.sampleRate ??
        audioContextDiag?.rawSampleRate ??
        expectedSampleRate,
      channelCount:
        sourceNodeRef.current?.channelCount ??
        audioContextDiag?.sourceChannelCount ??
        validation.numChannels,
      trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
      sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
      processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
      destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
      allHeaderChecksPassed,
      hasNonZeroPcmPayload,
      readyForAudioElementPlayback: allHeaderChecksPassed && validation.valid && hasNonZeroPcmPayload,
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
      '[AiAudioTranscriber] Inspecting WAV Blob creation — AudioContext state, actual sampleRate, channelCount, 44-byte RIFF/WAVE header & non-zero PCM verification:',
      wavBlobInspection
    );

    addLog(
      allHeaderChecksPassed && validation.valid ? 'info' : 'error',
      'Pre-ObjectURL Mono 16-bit PCM WAV Byte Header & Non-Zero Payload Verification:',
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

  /**
   * Generates a 16-bit mono PCM WAV Blob while logging AudioContext state,
   * actual sample rate, channel count, and verifying non-zero amplitude samples
   * both before and during WAV Blob generation to diagnose 0:00 duration issues.
   */
  const generateWavBlobWithDiagnostics = (
    chunks: Float32Array[],
    targetWavSampleRate: number,
    contextSnapshot: {
      liveAudioContextState: string;
      actualSampleRate: number;
      normalizedSampleRate: number;
      trackSampleRate: number | null;
      channelCount: number;
      trackChannelCount: number | null;
      sourceChannelCount: number;
      processorChannelCount: number;
      destinationChannelCount: number | null;
      destinationMaxChannelCount: number | null;
      elapsedSeconds: number;
    }
  ): {
    blob: Blob;
    clampedSampleCount: number;
    duringWavEncodingNonZeroFloatSamples: number;
    duringWavEncodingNonZeroInt16Samples: number;
    duringWavEncodingQuantizedToZeroCount: number;
    duringWavPeakFloat: number;
    duringWavPeakInt16: number;
  } => {
    const preEncodeAmplitude = verifyPcmBufferNonZeroAmplitude(chunks);
    const wavNumChannels = 1;
    const wavBitsPerSample = 16;
    const wavBytesPerSample = wavBitsPerSample / 8;
    const wavBlockAlign = wavNumChannels * wavBytesPerSample;
    const wavByteRate = targetWavSampleRate * wavBlockAlign;
    const wavDataByteLength = preEncodeAmplitude.totalSamples * wavBytesPerSample;
    const wavTotalByteLength = 44 + wavDataByteLength;
    const wavHeaderDurationSec = wavByteRate > 0 ? wavDataByteLength / wavByteRate : 0;
    const actualRateDurationSec =
      contextSnapshot.actualSampleRate > 0
        ? preEncodeAmplitude.totalSamples / contextSnapshot.actualSampleRate
        : 0;

    console.log(
      '[AiAudioTranscriber] Before WAV Blob generation — live AudioContext state, actual sampleRate, channelCount & PCM buffer non-zero amplitude check:',
      {
        audioContextState: audioContextRef.current?.state ?? contextSnapshot.liveAudioContextState,
        actualSampleRate: audioContextRef.current?.sampleRate ?? contextSnapshot.actualSampleRate,
        targetWavSampleRate,
        sampleRateDiscrepancyHz:
          Math.abs(
            (audioContextRef.current?.sampleRate ?? contextSnapshot.actualSampleRate) -
              targetWavSampleRate
          ),
        channelCount: sourceNodeRef.current?.channelCount ?? contextSnapshot.channelCount,
        trackChannelCount: contextSnapshot.trackChannelCount,
        sourceChannelCount:
          sourceNodeRef.current?.channelCount ?? contextSnapshot.sourceChannelCount,
        processorChannelCount:
          processorRef.current?.channelCount ?? contextSnapshot.processorChannelCount,
        destinationChannelCount:
          audioContextRef.current?.destination?.channelCount ??
          contextSnapshot.destinationChannelCount,
        chunkCount: chunks.length,
        totalPcmSamples: preEncodeAmplitude.totalSamples,
        nonZeroSampleCount: preEncodeAmplitude.nonZeroSampleCount,
        audibleSampleCount: preEncodeAmplitude.audibleSampleCount,
        nonZeroRatio: Number(preEncodeAmplitude.nonZeroRatio.toFixed(4)),
        hasNonZeroSamples: preEncodeAmplitude.hasNonZeroSamples,
        hasNonZeroAmplitude: preEncodeAmplitude.hasNonZeroAmplitude,
        isSilent: preEncodeAmplitude.isSilent,
        minSample: Number(preEncodeAmplitude.minSample.toFixed(6)),
        maxSample: Number(preEncodeAmplitude.maxSample.toFixed(6)),
        peakAmplitude: Number(preEncodeAmplitude.peakAmplitude.toFixed(6)),
        rmsAmplitude: Number(preEncodeAmplitude.rmsAmplitude.toFixed(6)),
        rmsDbFs: Number.isFinite(preEncodeAmplitude.rmsDbFs)
          ? `${preEncodeAmplitude.rmsDbFs.toFixed(2)} dBFS`
          : '-Inf dBFS',
        expectedWavDurationSec: Number(wavHeaderDurationSec.toFixed(4)),
        expectedActualRateDurationSec: Number(actualRateDurationSec.toFixed(4)),
        wallClockElapsedSeconds: contextSnapshot.elapsedSeconds,
      }
    );

    let duringWavEncodingNonZeroFloatSamples = 0;
    let duringWavEncodingNonZeroInt16Samples = 0;
    let duringWavEncodingQuantizedToZeroCount = 0;
    let clampedSampleCount = 0;
    let duringWavPeakFloat = 0;
    let duringWavPeakInt16 = 0;
    let activeChunkDuringEncodeCount = 0;
    let firstNonZeroDataPointIndex = -1;
    let firstNonZeroDataPointValue = 0;
    let globalSampleCursor = 0;

    for (let cIdx = 0; cIdx < chunks.length; cIdx += 1) {
      const chunk = chunks[cIdx];
      let chunkNonZeroInt16 = 0;
      for (let i = 0; i < chunk.length; i += 1) {
        const raw = Number.isFinite(chunk[i]) ? chunk[i] : 0;
        if (raw > 1.0 || raw < -1.0) {
          clampedSampleCount += 1;
        }
        const absFloat = Math.abs(raw);
        if (absFloat > 0) {
          duringWavEncodingNonZeroFloatSamples += 1;
          if (firstNonZeroDataPointIndex === -1) {
            firstNonZeroDataPointIndex = globalSampleCursor;
            firstNonZeroDataPointValue = Number(raw.toFixed(6));
          }
        }
        if (absFloat > duringWavPeakFloat) {
          duringWavPeakFloat = absFloat;
        }
        const clamped = Math.max(-1, Math.min(1, raw));
        const int16Val = Math.trunc(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
        const absInt16 = Math.abs(int16Val);
        if (int16Val !== 0) {
          duringWavEncodingNonZeroInt16Samples += 1;
          chunkNonZeroInt16 += 1;
        } else if (absFloat > 0) {
          duringWavEncodingQuantizedToZeroCount += 1;
        }
        if (absInt16 > duringWavPeakInt16) {
          duringWavPeakInt16 = absInt16;
        }
        globalSampleCursor += 1;
      }
      if (chunkNonZeroInt16 > 0) {
        activeChunkDuringEncodeCount += 1;
      }
    }

    const hasNonZeroPcmDataPoints =
      duringWavEncodingNonZeroFloatSamples > 0 && duringWavEncodingNonZeroInt16Samples > 0;

    console.log(
      '[AiAudioTranscriber] Processed PCM buffer non-zero data points verification before generating WAV Blob (0:00 duration diagnostic):',
      {
        'audioContext.state':
          audioContextRef.current?.state ?? contextSnapshot.liveAudioContextState,
        'audioContext.sampleRate':
          audioContextRef.current?.sampleRate ?? contextSnapshot.actualSampleRate,
        channelCount: sourceNodeRef.current?.channelCount ?? contextSnapshot.channelCount,
        hasNonZeroDataPoints: hasNonZeroPcmDataPoints,
        totalDataPoints: preEncodeAmplitude.totalSamples,
        nonZeroFloat32DataPoints: duringWavEncodingNonZeroFloatSamples,
        nonZeroInt16DataPoints: duringWavEncodingNonZeroInt16Samples,
        audibleDataPointsAboveThreshold: preEncodeAmplitude.audibleSampleCount,
        firstNonZeroDataPointIndex,
        firstNonZeroDataPointValue,
        peakFloat32Amplitude: Number(duringWavPeakFloat.toFixed(6)),
        peakInt16Amplitude: duringWavPeakInt16,
        rmsAmplitude: Number(preEncodeAmplitude.rmsAmplitude.toFixed(6)),
        expectedDurationSeconds: Number(wavHeaderDurationSec.toFixed(4)),
      }
    );

    const blob = encodeWav(chunks, targetWavSampleRate);

    console.log(
      '[AiAudioTranscriber] During WAV Blob generation — Float32-to-Int16 PCM encoding, AudioContext state, actual sampleRate, channelCount & 0:00 duration check:',
      {
        audioContextStateDuringGeneration:
          audioContextRef.current?.state ?? contextSnapshot.liveAudioContextState,
        actualSampleRate: audioContextRef.current?.sampleRate ?? contextSnapshot.actualSampleRate,
        encodedWavSampleRate: targetWavSampleRate,
        inputChannelCount: sourceNodeRef.current?.channelCount ?? contextSnapshot.channelCount,
        encodedWavChannelCount: wavNumChannels,
        wavHeaderByteRate: wavByteRate,
        wavHeaderBlockAlign: wavBlockAlign,
        wavHeaderDataByteLength: wavDataByteLength,
        generatedBlobSizeBytes: blob.size,
        expectedTotalWavBytes: wavTotalByteLength,
        generatedBlobMimeType: blob.type,
        chunkCount: chunks.length,
        activeChunksWithNonZeroInt16: activeChunkDuringEncodeCount,
        totalSamplesEncoded: preEncodeAmplitude.totalSamples,
        float32NonZeroSampleCount: duringWavEncodingNonZeroFloatSamples,
        int16NonZeroSampleCount: duringWavEncodingNonZeroInt16Samples,
        quantizedToZeroSubLsbSampleCount: duringWavEncodingQuantizedToZeroCount,
        clampedSampleCount,
        peakFloat32Amplitude: Number(duringWavPeakFloat.toFixed(6)),
        peakInt16Amplitude: duringWavPeakInt16,
        hasNonZeroAmplitudeSamplesInWav: duringWavEncodingNonZeroInt16Samples > 0,
        calculatedWavDurationSeconds: Number(wavHeaderDurationSec.toFixed(4)),
        formattedPlayerDuration: formatDurationDisplay(wavHeaderDurationSec),
        zeroDurationRootCauseCheck:
          blob.size <= 44
            ? 'EMPTY_PCM_DATA: WAV Blob has 0 PCM data bytes beyond 44-byte header'
            : duringWavEncodingNonZeroInt16Samples === 0
            ? 'ALL_ZERO_PCM_SILENCE: All Int16 samples in WAV Blob are 0'
            : wavHeaderDurationSec < 0.5
            ? 'SUB_HALF_SECOND_RECORDING: Recording < 0.5s rounds to 0:00 in whole-second player display'
            : 'VALID_NON_ZERO_WAV: WAV Blob has non-zero Int16 PCM samples and positive duration',
      }
    );

    return {
      blob,
      clampedSampleCount,
      duringWavEncodingNonZeroFloatSamples,
      duringWavEncodingNonZeroInt16Samples,
      duringWavEncodingQuantizedToZeroCount,
      duringWavPeakFloat,
      duringWavPeakInt16,
    };
  };

  /**
   * Toggles between 'recording' and 'paused' states during an active recording session,
   * managing the MediaRecorder state and AudioContext suspension so that subsequent audio
   * chunks are appended to the continuous buffer instead of restarting from scratch.
   */
  const handlePauseResumeRecording = async () => {
    if (!isRecording) return;

    isAutoPausedRef.current = false;
    setIsAutoPaused(false);
    silenceStartTimestampRef.current = 0;
    setSilenceDurationSeconds(0);

    const mr = mediaRecorderRef.current;
    const ctx = audioContextRef.current;

    if (!isPausedRef.current) {
      // Transition from 'recording' -> 'paused'
      if (recordingStartTimestampRef.current > 0) {
        accumulatedRecordingMsRef.current += Math.max(
          0,
          Date.now() - recordingStartTimestampRef.current
        );
        recordingStartTimestampRef.current = 0;
      }

      isPausedRef.current = true;
      setIsPaused(true);
      setInputLevelPeak(0);
      setRecordingElapsedMs(accumulatedRecordingMsRef.current);
      setRecordingTime(Math.floor(accumulatedRecordingMsRef.current / 1000));

      if (mr && mr.state === 'recording') {
        try {
          mr.pause();
        } catch {
          // Ignore MediaRecorder pause errors if unsupported
        }
      }
      setMediaRecorderState(mr?.state === 'paused' ? 'paused' : 'paused');

      if (!autoPauseOnSilenceRef.current && ctx && ctx.state === 'running') {
        try {
          await ctx.suspend();
        } catch {
          // Ignore AudioContext suspend errors
        }
      }

      const pauseDiag = {
        mediaRecorderState: mr?.state ?? 'paused',
        audioContextState: ctx?.state ?? 'suspended',
        accumulatedRecordingSeconds: Number((accumulatedRecordingMsRef.current / 1000).toFixed(2)),
        continuousPcmChunkCount: pcmChunksRef.current.length,
        continuousMediaRecorderChunkCount: mediaRecorderChunksRef.current.length,
      };
      console.log('[AiAudioTranscriber] Recording paused — preserving continuous audio buffer:', pauseDiag);
      addLog('info', 'Recording paused. Continuous audio buffer preserved.', pauseDiag);
    } else {
      // Transition from 'paused' -> 'recording' (appending subsequent chunks to continuous buffer)
      if (mr && mr.state === 'paused') {
        try {
          mr.resume();
        } catch {
          // Ignore MediaRecorder resume errors if unsupported
        }
      }
      setMediaRecorderState(mr?.state === 'recording' ? 'recording' : 'recording');

      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Ignore AudioContext resume errors
        }
      }

      recordingStartTimestampRef.current = Date.now();
      isPausedRef.current = false;
      setIsPaused(false);

      const resumeDiag = {
        mediaRecorderState: mr?.state ?? 'recording',
        audioContextState: ctx?.state ?? 'running',
        accumulatedRecordingSeconds: Number((accumulatedRecordingMsRef.current / 1000).toFixed(2)),
        existingPcmChunkCount: pcmChunksRef.current.length,
        existingMediaRecorderChunkCount: mediaRecorderChunksRef.current.length,
      };
      console.log(
        '[AiAudioTranscriber] Recording resumed — appending subsequent chunks to continuous buffer:',
        resumeDiag
      );
      addLog(
        'info',
        'Recording resumed. Appending subsequent audio chunks to continuous buffer.',
        resumeDiag
      );
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    addLog('info', 'Stopping PCM/WAV recording...');
    setIsRecording(false);
    isPausedRef.current = false;
    setIsPaused(false);
    setMediaRecorderState('inactive');
    setInputLevelPeak(0);

    // Freeze ScriptProcessorNode callback immediately so chunk buffer is stable during WAV generation
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
    }

    const activeSegmentMs =
      recordingStartTimestampRef.current > 0
        ? Math.max(0, Date.now() - recordingStartTimestampRef.current)
        : 0;
    const totalAccumulatedMs = accumulatedRecordingMsRef.current + activeSegmentMs;
    const elapsedMs = totalAccumulatedMs > 0 ? totalAccumulatedMs : recordingTime * 1000;
    accumulatedRecordingMsRef.current = 0;
    recordingStartTimestampRef.current = 0;
    const elapsedSeconds = Math.max(0.1, Math.round(elapsedMs / 100) / 10);

    const preStopContext = audioContextRef.current;
    const preStopSource = sourceNodeRef.current;
    const preStopProcessor = processorRef.current;
    const actualContextSampleRate =
      preStopContext?.sampleRate ?? audioContextDiag?.rawSampleRate ?? sampleRateRef.current;
    const actualChannelCount =
      preStopSource?.channelCount ??
      audioContextDiag?.sourceChannelCount ??
      audioContextDiag?.trackChannelCount ??
      1;

    const preStopAudioContextSnapshot = {
      audioContextStateBeforeStop: preStopContext?.state ?? audioContextDiag?.state ?? 'none',
      actualSampleRate: actualContextSampleRate,
      audioContextSampleRate: actualContextSampleRate,
      normalizedSampleRate: audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
      trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
      channelCount: actualChannelCount,
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

    const preStopChunks = pcmChunksRef.current;
    const preStopAmplitudeCheck = verifyPcmBufferNonZeroAmplitude(preStopChunks);
    console.log(
      '[AiAudioTranscriber] Pre-stop AudioContext state, actual sampleRate, channelCount & PCM buffer non-zero amplitude check (before teardown & WAV Blob generation):',
      {
        ...preStopAudioContextSnapshot,
        capturedChunkCount: preStopChunks.length,
        totalPcmSamples: preStopAmplitudeCheck.totalSamples,
        nonZeroSampleCount: preStopAmplitudeCheck.nonZeroSampleCount,
        audibleSampleCount: preStopAmplitudeCheck.audibleSampleCount,
        hasNonZeroSamples: preStopAmplitudeCheck.hasNonZeroSamples,
        hasNonZeroAmplitude: preStopAmplitudeCheck.hasNonZeroAmplitude,
        peakAmplitude: Number(preStopAmplitudeCheck.peakAmplitude.toFixed(6)),
        rmsAmplitude: Number(preStopAmplitudeCheck.rmsAmplitude.toFixed(6)),
        expectedDurationFromActualSampleRateSec:
          actualContextSampleRate > 0
            ? Number((preStopAmplitudeCheck.totalSamples / actualContextSampleRate).toFixed(4))
            : 0,
      }
    );

    const chunks = pcmChunksRef.current;
    const stats = computePcmStats(chunks);
    const amplitudeCheck = verifyPcmBufferNonZeroAmplitude(chunks);
    const rawFloat32BufferBytes = stats.totalSamples * 4;
    const targetPcm16BufferBytes = stats.totalSamples * 2;

    const pcmBufferVerification = {
      ...preStopAudioContextSnapshot,
      audioContextStateCurrent: audioContextRef.current?.state ?? 'closed',
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
      await stopRecordingGraph();
      reportError(
        'recording',
        'No audio samples were captured before stopping. Please record for at least 1 second and verify that your microphone is not muted.',
        stats
      );
      setShowDebug(true);
      return;
    }

    try {
      const targetPreset =
        RECORDING_PRESETS.find((p) => p.id === recordingPreset) || RECORDING_PRESETS[0];
      const targetWavSampleRate = targetPreset.sampleRate;

      // Resample chunks if the actual AudioContext sample rate doesn't match the target preset
      let activePcmChunks = chunks;
      let activeTotalSamples = stats.totalSamples;
      if (sampleRateRef.current > 0 && Math.abs(sampleRateRef.current - targetWavSampleRate) > 50) {
        const mergedBuffer = new Float32Array(stats.totalSamples);
        let sampleOffset = 0;
        for (const chunk of chunks) {
          mergedBuffer.set(chunk, sampleOffset);
          sampleOffset += chunk.length;
        }
        const resampledChunk = resampleMonoAudio(mergedBuffer, sampleRateRef.current, targetWavSampleRate);
        activePcmChunks = [resampledChunk];
        activeTotalSamples = resampledChunk.length;
        addLog(
          'info',
          `Resampled PCM buffer from ${sampleRateRef.current} Hz to preset target ${targetWavSampleRate} Hz (${targetPreset.label}).`
        );
      }

      const wavNumChannels = 1;
      const wavBitsPerSample = 16;
      const wavBytesPerSample = wavBitsPerSample / 8;
      const wavBlockAlign = wavNumChannels * wavBytesPerSample;
      const wavByteRate = targetWavSampleRate * wavBlockAlign;
      const wavDataByteLength = activeTotalSamples * wavBytesPerSample;
      const wavTotalByteLength = 44 + wavDataByteLength;
      const wavRiffChunkSize = 36 + wavDataByteLength;
      const wavCalculatedDurationSec = wavByteRate > 0 ? wavDataByteLength / wavByteRate : 0;

      const preWavBlobDiagnostic = {
        audioContextStateAtCapture: preStopAudioContextSnapshot.audioContextStateBeforeStop,
        audioContextStateDuringGeneration: audioContextRef.current?.state ?? 'closed',
        actualSampleRate: actualContextSampleRate,
        audioContextSampleRate: sampleRateRef.current,
        targetWavSampleRate,
        recordingPreset: targetPreset.label,
        inputChannelCount: actualChannelCount,
        trackChannelCount: preStopAudioContextSnapshot.trackChannelCount,
        sourceChannelCount: preStopAudioContextSnapshot.sourceChannelCount,
        processorChannelCount: preStopAudioContextSnapshot.processorChannelCount,
        numChannels: wavNumChannels,
        bitsPerSample: wavBitsPerSample,
        bytesPerSample: wavBytesPerSample,
        blockAlign: wavBlockAlign,
        byteRate: wavByteRate,
        chunkCount: activePcmChunks.length,
        totalPcmSamples: activeTotalSamples,
        rawFloat32ByteLength: activeTotalSamples * 4,
        pcm16DataByteLength: wavDataByteLength,
        wavHeaderByteLength: 44,
        riffChunkSizeField: wavRiffChunkSize,
        totalWavByteLength: wavTotalByteLength,
        calculatedDurationSeconds: Number(wavCalculatedDurationSec.toFixed(4)),
        wallClockElapsedSeconds: elapsedSeconds,
        zeroDurationDiagnosis:
          wavCalculatedDurationSec <= 0
            ? 'CRITICAL: Calculated WAV duration is 0s (0 samples or invalid byteRate)'
            : wavCalculatedDurationSec < 0.5
            ? 'WARNING: WAV duration is under 0.5s; HTMLAudioElement may display 0:00 when rounding to whole seconds'
            : 'OK: Calculated WAV duration is positive and finite',
        hasNonZeroAudio: stats.hasNonZeroAudio,
        hasNonZeroAmplitudeSamples: amplitudeCheck.hasNonZeroAmplitude,
        nonZeroSampleCount: stats.nonZeroSampleCount,
        audibleSampleCount: amplitudeCheck.audibleSampleCount,
        peakAmplitude: Number(stats.peakAmplitude.toFixed(6)),
        rmsAmplitude: Number(stats.rmsAmplitude.toFixed(6)),
        isSilent: stats.isSilent || amplitudeCheck.isSilent,
      };

      console.log(
        '[AiAudioTranscriber] Pre-WAV Blob creation — AudioContext state, actual sampleRate, channelCount & non-zero PCM amplitude verification:',
        preWavBlobDiagnostic
      );

      addLog('info', 'WAV Header Generation Step 1 — Calculated PCM & RIFF/WAVE layout parameters:', {
        audioContextSampleRate: sampleRateRef.current,
        targetWavSampleRate,
        recordingPreset: targetPreset.label,
        numChannels: wavNumChannels,
        bitsPerSample: wavBitsPerSample,
        bytesPerSample: wavBytesPerSample,
        blockAlign: wavBlockAlign,
        byteRate: wavByteRate,
        totalPcmSamples: activeTotalSamples,
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

      const { blob, clampedSampleCount } = generateWavBlobWithDiagnostics(
        activePcmChunks,
        targetWavSampleRate,
        {
          liveAudioContextState: preStopAudioContextSnapshot.audioContextStateBeforeStop,
          actualSampleRate: actualContextSampleRate,
          normalizedSampleRate: preStopAudioContextSnapshot.normalizedSampleRate,
          trackSampleRate: preStopAudioContextSnapshot.trackSampleRate,
          channelCount: actualChannelCount,
          trackChannelCount: preStopAudioContextSnapshot.trackChannelCount,
          sourceChannelCount: preStopAudioContextSnapshot.sourceChannelCount,
          processorChannelCount: preStopAudioContextSnapshot.processorChannelCount,
          destinationChannelCount: preStopAudioContextSnapshot.destinationChannelCount,
          destinationMaxChannelCount: preStopAudioContextSnapshot.destinationMaxChannelCount,
          elapsedSeconds,
        }
      );

      // Tear down the recording AudioContext and MediaStream tracks after WAV Blob generation
      await stopRecordingGraph();

      const { buffer, validation } = await verifyMono16BitPcmWavBlob(
        blob,
        activeTotalSamples,
        targetWavSampleRate
      );
      setWavValidation(validation);

      // Inspect raw Int16 samples inside the encoded WAV buffer to verify non-zero audio data
      const pcmView = new DataView(buffer);
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
        audioContextStateAtCapture: preStopAudioContextSnapshot.audioContextStateBeforeStop,
        audioContextStateAfterTeardown: audioContextRef.current?.state ?? 'closed',
        actualSampleRate: actualContextSampleRate,
        inputChannelCount: actualChannelCount,
        blobSizeBytes: blob.size,
        expectedTotalBytes: wavTotalByteLength,
        byteSizeExactMatch: blob.size === wavTotalByteLength,
        blobMimeType: blob.type,
        sampleRate: validation.sampleRate,
        numChannels: validation.numChannels,
        bitsPerSample: validation.bitsPerSample,
        byteRate: validation.byteRate,
        blockAlign: validation.blockAlign,
        dataByteLength: validation.dataByteLength,
        durationSeconds: Number(validation.durationSeconds.toFixed(4)),
        formattedPlayerDuration: formatDurationDisplay(validation.durationSeconds),
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
        '[AiAudioTranscriber] WAV Blob finalized & verified (16-bit mono PCM — AudioContext state, sampleRate, channelCount, duration & non-zero PCM check):',
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

      if (!validation.hasNonZeroAudio || validation.nonZeroSampleCount === 0 || stats.isSilent) {
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
      const nextUrl = await assignAudioSourceFromBlob(
        blob,
        fileName,
        'audio/wav',
        'recorded mono 16-bit PCM WAV',
        validation
      );

      if (!nextUrl) {
        const failureReason = !validation.valid
          ? 'Recorded WAV Blob failed RIFF/WAVE header verification and was not bound to the audio player.'
          : 'Recorded WAV Blob contains only zero-amplitude PCM samples (silence) and was not bound to the audio player.';
        reportError('recording', failureReason, validation);
        setShowDebug(true);
        return;
      }

      setRecordingTime(Math.max(1, Math.round(validation.durationSeconds)));
      setRecordingElapsedMs(Math.round(validation.durationSeconds * 1000));

      setSessionMetadata({
        durationSeconds: validation.durationSeconds,
        formattedDuration: formatRecordingTimerOverlay(validation.durationSeconds),
        bitRateKbps: (validation.sampleRate * validation.numChannels * validation.bitsPerSample) / 1000,
        dataRateKbPerSec: validation.byteRate / 1024,
        fileSizeBytes: blob.size,
        formattedFileSize: formatFileSizeBytes(blob.size),
        chunkCount: activePcmChunks.length,
        totalSamples: validation.sampleCount,
        sampleRate: validation.sampleRate,
        bitsPerSample: validation.bitsPerSample,
        channels: validation.numChannels,
        formatName: '16-bit Mono PCM WAV',
      });

      const completionDiag = {
        audioContextStateAtCapture: preStopAudioContextSnapshot.audioContextStateBeforeStop,
        audioContextStateCurrent: audioContextRef.current?.state ?? 'closed',
        actualSampleRate: actualContextSampleRate,
        channelCount: actualChannelCount,
        trackChannelCount: preStopAudioContextSnapshot.trackChannelCount,
        sourceChannelCount: preStopAudioContextSnapshot.sourceChannelCount,
        processorChannelCount: preStopAudioContextSnapshot.processorChannelCount,
        sizeBytes: blob.size,
        pcm16DataByteLength: validation.dataByteLength,
        mimeType: blob.type,
        sampleRate: validation.sampleRate,
        channels: validation.numChannels,
        bitsPerSample: validation.bitsPerSample,
        durationSeconds: Number(validation.durationSeconds.toFixed(2)),
        formattedPlayerDuration: formatDurationDisplay(validation.durationSeconds),
        hasNonZeroAudio: validation.hasNonZeroAudio,
        nonZeroSampleCount: validation.nonZeroSampleCount,
        peakAmplitude: Number(validation.peakAmplitude.toFixed(4)),
        objectUrl: nextUrl,
      };
      console.log(
        '[AiAudioTranscriber] Recording complete — AudioContext state, actual sampleRate, channelCount & verified WAV Blob Object URL assigned to <audio>:',
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
    } finally {
      await stopRecordingGraph();
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
    latestWaveformChunkRef.current = null;
    rollingPeakHistoryRef.current = [];
    setRecordingTime(0);
    setRecordingElapsedMs(0);

    let uploadedWavValidation: WavValidationResult | null = null;
    if (file.type.includes('wav') || /\.wav$/i.test(file.name)) {
      try {
        const buf = await file.arrayBuffer();
        const wavCheck = parseAndValidateWav(buf);
        uploadedWavValidation = wavCheck;
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
        // Non-standard WAV chunks will still be checked in assignAudioSourceFromBlob
      }
    }

    const nextUrl = await assignAudioSourceFromBlob(
      file,
      file.name,
      file.type || 'audio/mp3',
      `uploaded file (${file.name})`,
      uploadedWavValidation
    );

    if (!nextUrl) {
      const uploadFailureMessage =
        uploadedWavValidation && !uploadedWavValidation.valid
          ? `Uploaded WAV file (${file.name}) has an invalid or corrupted RIFF/WAVE header and was not bound to the audio player.`
          : `Uploaded WAV file (${file.name}) contains only zero-amplitude PCM samples (silence) and was not bound to the audio player.`;
      reportError('upload', uploadFailureMessage, uploadedWavValidation);
      setShowDebug(true);
      return;
    }

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
    latestWaveformChunkRef.current = null;
    rollingPeakHistoryRef.current = [];
    setInputLevelPeak(0);
    resetAudioSource('user clicked Clear Audio');
    setAudioFileName('');
    setWavValidation(null);
    setAudioElementDiag(null);
    setAudioContextDiag(null);
    setResult(null);
    clearError();
    setRecordingTime(0);
    setRecordingElapsedMs(0);
    setLiveTranscript('');
    setPlaybackCurrentTime(0);
    setPlaybackDuration(0);
    setTranscriptViewMode('speaker');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try {
      localStorage.removeItem(AUTO_SAVE_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
    setLastAutoSaveTime(null);
    addLog('info', 'Cleared audio buffer, revoked previous Object URL, and reset auto-save draft.');
  };

  const handleShare = async () => {
    if (!result) return;
    const textToShare =
      transcriptViewMode === 'speaker' && result.formattedSpeakerTranscript
        ? result.formattedSpeakerTranscript
        : showLineTimestamps
        ? buildTimestampedTranscriptText(
            result.transcript,
            sessionMetadata.durationSeconds || verifiedDurationSeconds,
            result.speakerTurns
          )
        : result.transcript;

    const shareData: ShareData = {
      title: metaProject ? `Transcript: ${metaProject}` : 'AI Audio Transcription',
      text: textToShare,
    };

    if (audioBlob && navigator.canShare) {
      try {
        const file = new File([audioBlob], audioFileName || 'recording.wav', { type: audioMimeType || 'audio/wav' });
        const fileShareData = { ...shareData, files: [file] };
        if (navigator.canShare(fileShareData)) {
          await navigator.share(fileShareData);
          addLog('info', 'Successfully shared transcription and audio file via Web Share API.');
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        addLog('info', 'Successfully shared transcription via Web Share API.');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          addLog('warn', 'Web Share API failed or was cancelled.', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        alert('Web Share API is not supported on this browser. Transcription text has been copied to your clipboard!');
      } catch {
        alert('Web Share API is not supported on this browser.');
      }
    }
  };

  const seekToTime = useCallback((timeSec: number) => {
    if (!Number.isFinite(timeSec) || timeSec < 0) return;
    setPlaybackCurrentTime(timeSec);
    const audioEl = audioPlayerRef.current;
    if (audioEl) {
      try {
        audioEl.currentTime = timeSec;
        void audioEl.play().catch(() => {});
      } catch {
        // Ignore seek errors
      }
    }
  }, []);

  const handleAudioScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = Number(e.target.value);
    if (!Number.isFinite(rawValue)) return;

    const maxDur =
      playbackDuration > 0
        ? playbackDuration
        : wavValidation?.durationSeconds && wavValidation.durationSeconds > 0
        ? wavValidation.durationSeconds
        : audioElementDiag?.duration && audioElementDiag.duration > 0
        ? audioElementDiag.duration
        : recordingTime > 0
        ? recordingTime
        : 0;

    const nextTime = maxDur > 0 ? Math.max(0, Math.min(maxDur, rawValue)) : Math.max(0, rawValue);
    setPlaybackCurrentTime(nextTime);

    const audioEl = audioPlayerRef.current;
    if (audioEl) {
      try {
        audioEl.currentTime = nextTime;
      } catch {
        // Ignore seek errors if media is not yet seekable
      }
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRate = Number(e.target.value);
    if (!Number.isFinite(nextRate) || nextRate <= 0) return;

    setPlaybackRate(nextRate);

    const audioEl = audioPlayerRef.current;
    if (audioEl) {
      try {
        audioEl.defaultPlaybackRate = nextRate;
        audioEl.playbackRate = nextRate;
      } catch {
        // Ignore playbackRate errors in non-DOM environments
      }
    }
    addLog('info', `Updated audio playback speed to ${nextRate}x`, { playbackRate: nextRate });
  };

  const handleToggleAudioEditor = () => {
    const dur =
      verifiedDurationSeconds && verifiedDurationSeconds > 0
        ? verifiedDurationSeconds
        : sessionMetadata.durationSeconds > 0
        ? sessionMetadata.durationSeconds
        : playbackDuration > 0
        ? playbackDuration
        : 10;
    setTrimStartSeconds(0);
    setTrimEndSeconds(dur);
    setShowAudioEditor((prev) => !prev);
  };

  const handlePreviewTrim = () => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;

    if (isPreviewingTrim) {
      audioEl.pause();
      setIsPreviewingTrim(false);
      return;
    }

    audioEl.currentTime = trimStartSeconds;
    setIsPreviewingTrim(true);
    void audioEl.play().catch(() => setIsPreviewingTrim(false));
  };

  useEffect(() => {
    if (!isPreviewingTrim) return;
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      if (audioEl.currentTime >= trimEndSeconds) {
        audioEl.pause();
        audioEl.currentTime = trimStartSeconds;
        setIsPreviewingTrim(false);
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPreviewingTrim, trimStartSeconds, trimEndSeconds]);

  const handleApplyTrim = async () => {
    if (!audioBlob && pcmChunksRef.current.length === 0) return;
    setIsTrimming(true);
    clearError();

    try {
      const totalDur =
        verifiedDurationSeconds && verifiedDurationSeconds > 0
          ? verifiedDurationSeconds
          : sessionMetadata.durationSeconds > 0
          ? sessionMetadata.durationSeconds
          : playbackDuration > 0
          ? playbackDuration
          : 1;

      const startSec = Math.max(0, Math.min(trimStartSeconds, totalDur - 0.1));
      const endSec = Math.max(startSec + 0.1, Math.min(trimEndSeconds, totalDur));
      const targetSampleRate = sessionMetadata.sampleRate || sampleRateRef.current || 44100;

      let trimmedPcm: Float32Array;

      if (pcmChunksRef.current.length > 0) {
        let totalSamples = 0;
        for (const chunk of pcmChunksRef.current) {
          totalSamples += chunk.length;
        }
        const fullPcm = new Float32Array(totalSamples);
        let offset = 0;
        for (const chunk of pcmChunksRef.current) {
          fullPcm.set(chunk, offset);
          offset += chunk.length;
        }

        const startSample = Math.floor((startSec / totalDur) * totalSamples);
        const endSample = Math.ceil((endSec / totalDur) * totalSamples);
        trimmedPcm = fullPcm.slice(
          Math.max(0, startSample),
          Math.min(totalSamples, endSample)
        );
      } else {
        const arrayBuffer = await audioBlob!.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        try {
          const audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
          const rate = audioBuf.sampleRate;
          const startSample = Math.floor(startSec * rate);
          const endSample = Math.ceil(endSec * rate);
          const channel0 = audioBuf.getChannelData(0);
          trimmedPcm = channel0.slice(
            Math.max(0, startSample),
            Math.min(channel0.length, endSample)
          );
        } finally {
          await ctx.close().catch(() => {});
        }
      }

      if (!trimmedPcm || trimmedPcm.length === 0) {
        reportError('recording', 'Trimmed segment contains no audio samples.');
        setIsTrimming(false);
        return;
      }

      const trimmedWavBlob = encodeWav([trimmedPcm], targetSampleRate);
      pcmChunksRef.current = [trimmedPcm];

      const trimmedDuration = trimmedPcm.length / targetSampleRate;
      const baseName = audioFileName ? audioFileName.replace(/\.wav$/i, '') : 'recording';
      const trimmedFileName = `${baseName}-trimmed.wav`;

      const nextUrl = await assignAudioSourceFromBlob(
        trimmedWavBlob,
        trimmedFileName,
        'audio/wav',
        'trimmed audio segment'
      );

      if (!nextUrl) {
        reportError('recording', 'Failed to assign Object URL for trimmed audio.');
        setIsTrimming(false);
        return;
      }

      setRecordingTime(Math.max(1, Math.round(trimmedDuration)));
      setRecordingElapsedMs(Math.round(trimmedDuration * 1000));
      setPlaybackCurrentTime(0);
      setPlaybackDuration(trimmedDuration);

      setSessionMetadata({
        durationSeconds: trimmedDuration,
        formattedDuration: formatRecordingTimerOverlay(trimmedDuration),
        bitRateKbps: (targetSampleRate * 1 * 16) / 1000,
        dataRateKbPerSec: (targetSampleRate * 1 * 2) / 1024,
        fileSizeBytes: trimmedWavBlob.size,
        formattedFileSize: formatFileSizeBytes(trimmedWavBlob.size),
        chunkCount: 1,
        totalSamples: trimmedPcm.length,
        sampleRate: targetSampleRate,
        bitsPerSample: 16,
        channels: 1,
        formatName: '16-bit Mono PCM WAV (Trimmed)',
      });

      addLog(
        'info',
        `Successfully trimmed audio from ${startSec.toFixed(1)}s to ${endSec.toFixed(1)}s (new duration: ${trimmedDuration.toFixed(2)}s).`
      );
      setShowAudioEditor(false);
    } catch (err: any) {
      reportError('recording', `Failed to trim audio: ${err?.message || String(err)}`);
    } finally {
      setIsTrimming(false);
    }
  };

  const handleAudioElementEvent = (
    eventName: string,
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    const el = e.currentTarget;
    const diag = extractAudioElementDiagnostics(eventName, el);
    setAudioElementDiag(diag);

    if (Number.isFinite(el.currentTime) && el.currentTime >= 0) {
      setPlaybackCurrentTime(eventName === 'ended' ? 0 : el.currentTime);
    }
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setPlaybackDuration(el.duration);
    } else if (wavValidation?.durationSeconds && wavValidation.durationSeconds > 0) {
      setPlaybackDuration(wavValidation.durationSeconds);
    }

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

    const livePcmAmplitude = verifyPcmBufferNonZeroAmplitude(pcmChunksRef.current);

    const audioContextAndPcmSummary = {
      audioContextState:
        audioContextRef.current?.state ?? audioContextDiag?.state ?? 'closed/idle',
      playbackAudioContextState: webAudioPlaybackContextRef.current?.state ?? 'idle',
      sampleRates: {
        audioContextRawSampleRate: audioContextDiag?.rawSampleRate ?? sampleRateRef.current,
        audioContextNormalizedSampleRate:
          audioContextDiag?.normalizedSampleRate ?? sampleRateRef.current,
        trackSampleRate: audioContextDiag?.trackSampleRate ?? null,
        wavSampleRate: wavValidation?.sampleRate ?? null,
      },
      channelCounts: {
        trackChannelCount: audioContextDiag?.trackChannelCount ?? null,
        sourceChannelCount: audioContextDiag?.sourceChannelCount ?? null,
        processorChannelCount: audioContextDiag?.processorChannelCount ?? null,
        destinationChannelCount: audioContextDiag?.destinationChannelCount ?? null,
        wavNumChannels: wavValidation?.numChannels ?? null,
      },
      pcmBufferAmplitude: {
        chunkCount: pcmChunksRef.current.length,
        totalSamples: livePcmAmplitude.totalSamples,
        nonZeroSampleCount: livePcmAmplitude.nonZeroSampleCount,
        audibleSampleCount: livePcmAmplitude.audibleSampleCount,
        nonZeroRatio: Number(livePcmAmplitude.nonZeroRatio.toFixed(4)),
        hasNonZeroSamples: livePcmAmplitude.hasNonZeroSamples,
        hasNonZeroAmplitude: livePcmAmplitude.hasNonZeroAmplitude,
        isSilent: livePcmAmplitude.isSilent,
        minSample: Number(livePcmAmplitude.minSample.toFixed(6)),
        maxSample: Number(livePcmAmplitude.maxSample.toFixed(6)),
        peakAmplitude: Number(livePcmAmplitude.peakAmplitude.toFixed(6)),
        rmsAmplitude: Number(livePcmAmplitude.rmsAmplitude.toFixed(6)),
        rmsDbFs: Number.isFinite(livePcmAmplitude.rmsDbFs)
          ? `${livePcmAmplitude.rmsDbFs.toFixed(2)} dBFS`
          : '-Inf dBFS',
      },
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
      pcmHasNonZeroAudio: wavValidation?.hasNonZeroAudio ?? livePcmAmplitude.hasNonZeroSamples,
      pcmNonZeroSampleCount:
        wavValidation?.nonZeroSampleCount ?? livePcmAmplitude.nonZeroSampleCount,
      pcmNonZeroPercentage: wavValidation
        ? `${(wavValidation.nonZeroRatio * 100).toFixed(2)}%`
        : `${(livePcmAmplitude.nonZeroRatio * 100).toFixed(2)}%`,
      pcmPeakAmplitude: wavValidation
        ? Number(wavValidation.peakAmplitude.toFixed(5))
        : Number(livePcmAmplitude.peakAmplitude.toFixed(5)),
      pcmRmsAmplitude: wavValidation
        ? Number(wavValidation.rmsAmplitude.toFixed(5))
        : Number(livePcmAmplitude.rmsAmplitude.toFixed(5)),
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
        `[AiAudioTranscriber] <audio> element playback failure on '${eventName}' — AudioContext state, sampleRates, channelCounts & PCM buffer amplitude:`,
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

    if (eventName === 'play') {
      const isWavSource =
        audioMimeType.includes('wav') ||
        (audioBlob?.type?.includes('wav') ?? false) ||
        /\.wav$/i.test(audioFileName) ||
        Boolean(wavValidation);

      if (isWavSource) {
        const verification = verifyWavBlobHeaderAndNonZeroPcm(audioBlob, wavValidation);

        console.log(
          '[AiAudioTranscriber] Verifying WAV header, AudioContext state, sampleRates, channelCounts & non-zero PCM buffer amplitude before <audio> playback:',
          {
            hasValidHeader: verification.hasValidWavHeader,
            hasNonZeroPcm: verification.hasNonZeroPcmData,
            isReadyForPlayback: verification.isReadyForPlayback,
            currentTime: el.currentTime,
            elementDuration: diag.duration,
            rawElementDuration: diag.rawDuration,
            ...audioContextAndPcmSummary,
          }
        );

        if (!verification.hasValidWavHeader) {
          el.pause();
          reportError(
            'playback',
            verification.failureReason ||
              `Cannot play WAV audio: invalid RIFF/WAVE header (${wavValidation?.error || 'corrupted header'}).`,
            wavValidation
          );
          return;
        }

        if (!verification.hasNonZeroPcmData) {
          el.pause();
          console.warn(
            '[AiAudioTranscriber] Blocking <audio> playback: WAV Blob contains 0 non-zero PCM samples (all-zero silence).',
            audioContextAndPcmSummary
          );
          reportError(
            'playback',
            'Cannot trigger WAV audio playback: the WAV Blob contains only zero-amplitude PCM samples (silence). Check your microphone mute switch or input volume.',
            audioContextAndPcmSummary
          );
          return;
        }
      }
    }

    const isZeroOrInvalidDuration =
      (eventName === 'loadedmetadata' ||
        eventName === 'durationchange' ||
        eventName === 'canplay' ||
        eventName === 'play' ||
        eventName === 'playing') &&
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
        zeroDurationDiagnosis:
          !diag.src
            ? 'NO_AUDIO_SRC: <audio> element has no active src attribute'
            : wavValidation && !wavValidation.valid
            ? `INVALID_WAV_HEADER: ${wavValidation.error}`
            : wavValidation && wavValidation.dataByteLength === 0
            ? 'EMPTY_WAV_PAYLOAD: WAV data chunk has 0 bytes'
            : livePcmAmplitude.isSilent
            ? 'SILENT_PCM_BUFFER: Captured PCM buffer contains zero or sub-threshold amplitude samples'
            : 'BROWSER_MEDIA_METADATA_PENDING_OR_STALLED: WAV header duration is positive, inspect readyState/networkState',
        ...audioContextAndPcmSummary,
      };
      console.warn(
        `[AiAudioTranscriber] <audio> 0:00 duration & playback diagnostic — reported '${diag.rawDuration}' on '${eventName}' (AudioContext state, sampleRates, channelCounts & PCM buffer amplitude):`,
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
      eventName === 'pause' ||
      eventName === 'stalled' ||
      eventName === 'suspend' ||
      eventName === 'waiting' ||
      eventName === 'emptied' ||
      eventName === 'ended'
    ) {
      const audioEventDiag = {
        currentSrc: diag.src,
        currentTime: Number((el.currentTime || 0).toFixed(3)),
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
        `[AiAudioTranscriber] <audio> element event '${eventName}' (duration, AudioContext state, sampleRates, channelCounts & PCM buffer amplitude check):`,
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
      source.playbackRate.value = playbackRate;
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

      setLiveTranscript('');
      setIsUserScrolledUp(false);
      setIsAutoScrollEnabled(true);

      let streamedText = '';
      const chunkCallback = (chunk: any) => {
        const text = chunk?.text || (typeof chunk === 'string' ? chunk : '');
        if (text) {
          streamedText = (streamedText + ' ' + text).trim();
          const liveCorrected = enableAutoCorrection
            ? autoCorrectITTranscript(streamedText, enableCapitalization, enableITDictionary).correctedText
            : streamedText;
          setLiveTranscript(liveCorrected);
        }
      };

      const output = await transcriber(decoded.samples, {
        ...inferenceOptions,
        return_timestamps: true,
        chunk_callback: chunkCallback,
      });

      const rawTranscript = String(output?.text || '').trim();
      const autoCorrected = autoCorrectITTranscript(
        rawTranscript,
        enableCapitalization,
        enableITDictionary
      );
      const finalTranscript = enableAutoCorrection ? autoCorrected.correctedText : rawTranscript;

      // If chunk_callback did not emit incremental lines, progressively stream sentences so real-time generation and auto-scroll are smooth
      if (!streamedText && finalTranscript) {
        const sentences = finalTranscript.split(/(?<=[.!?।۔。\n])\s+/);
        if (sentences.length > 1) {
          let progressive = '';
          for (const s of sentences) {
            progressive = (progressive + ' ' + s).trim();
            setLiveTranscript(progressive);
            await new Promise((r) => setTimeout(r, 60));
          }
        } else {
          setLiveTranscript(finalTranscript);
        }
      } else if (finalTranscript) {
        setLiveTranscript(finalTranscript);
      }

      // Differentiate speakers via multi-channel streams or voice activity analysis
      setProcessingStatus('Differentiating speakers via voice activity & stream analysis...');
      const diarization = processSpeakerDiarization({
        channelsData:
          decoded.channels && decoded.channels.length > 0
            ? decoded.channels
            : [decoded.samples],
        sampleRate: 16000,
        durationSeconds: decoded.durationSeconds,
        transcriptText: finalTranscript,
        whisperChunks: Array.isArray(output?.chunks) ? output.chunks : undefined,
        mode: diarizationMode,
      });

      // Ensure speaker turn texts are also auto-corrected
      if (enableAutoCorrection && diarization.turns.length > 0) {
        diarization.turns = diarization.turns.map((turn) => {
          const turnCorrected = autoCorrectITTranscript(
            turn.text,
            enableCapitalization,
            enableITDictionary
          );
          return {
            ...turn,
            text: turnCorrected.correctedText,
          };
        });
      }

      const { summary, actionItems } = summarizeTranscript(finalTranscript);

      setResult({
        transcript: finalTranscript || 'No clear speech was detected in the audio.',
        rawUncorrectedTranscript: rawTranscript,
        autoCorrectionCount: autoCorrected.correctionCount,
        appliedAutoCorrections: autoCorrected.appliedCorrections,
        formattedSpeakerTranscript: diarization.formattedTranscript,
        speakerTurns: diarization.turns,
        speakerCount: diarization.speakerCount,
        detectedStreams: diarization.detectedStreams,
        diarizationMethod: diarization.method,
        speakerStats: diarization.speakerStats,
        summary,
        actionItems,
        detectedLanguage:
          selectedLanguage === 'auto'
            ? 'Auto-detected (Multilingual Whisper)'
            : `${langMeta?.label || selectedLanguage} (${langMeta?.nativeName || selectedLanguage})`,
        modelUsed: activeModelId,
      });

      addLog('info', 'Local transcription and speaker differentiation completed successfully.', {
        model: activeModelId,
        languageMode: selectedLanguage,
        transcriptLength: finalTranscript.length,
        speakersIdentified: diarization.speakerCount,
        diarizationMethod: diarization.method,
        detectedStreams: diarization.detectedStreams,
        speakerTurnsCount: diarization.turns.length,
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

  const scrollToBottom = useCallback(() => {
    setIsAutoScrollEnabled(true);
    setIsUserScrolledUp(false);
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTo({
        top: transcriptScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceToBottom < 35;
    setIsUserScrolledUp(!isAtBottom);
    if (isAtBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    const el = transcriptScrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [liveTranscript, result?.transcript, isAutoScrollEnabled]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSaveTranscript = () => {
    if (!result || !result.transcript) return;

    if (activeDownloadUrlRef.current) {
      try {
        URL.revokeObjectURL(activeDownloadUrlRef.current);
      } catch {
        // Ignore if already revoked
      }
      activeDownloadUrlRef.current = null;
    }

    const exportBody = showLineTimestamps
      ? buildTimestampedTranscriptText(
          result.transcript,
          sessionMetadata.durationSeconds || verifiedDurationSeconds,
          result.speakerTurns
        )
      : result.transcript;

    const metadataHeader = [
      '========================================================================',
      '=== AI AUDIO TRANSCRIPTION — SESSION METADATA & VERBATIM TRANSCRIPT ===',
      '========================================================================',
      `Source Audio File : ${audioFileName || 'Audio Recording'}`,
      ...(metaProject.trim() ? [`Project Name      : ${metaProject.trim()}`] : []),
      ...(metaCategory.trim() ? [`Session Category  : ${metaCategory.trim()}`] : []),
      `Session Date      : ${metaDate || new Date().toISOString().slice(0, 10)}`,
      ...(customTags.length > 0
        ? [`Session Tags      : ${customTags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(', ')}`]
        : []),
      `Language Mode     : ${result.detectedLanguage || selectedLanguage}`,
      `Whisper AI Model  : ${result.modelUsed || selectedModelId}`,
      `Audio Duration    : ${sessionMetadata.formattedDuration}`,
      `Exported Timestamp: ${new Date().toLocaleString()}`,
      '========================================================================',
      '',
      '--- VERBATIM TRANSCRIPT ---',
      exportBody,
    ].join('\n');

    const baseName = audioFileName
      ? audioFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')
      : `audio-${new Date().toISOString().slice(0, 10)}`;
    const downloadFileName = `${baseName}-transcript.txt`;

    const blob = new Blob([metadataHeader], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    activeDownloadUrlRef.current = url;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addLog('info', `Saved transcript as .txt file with metadata (${downloadFileName}, ${blob.size} bytes).`);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore if already revoked
      }
      if (activeDownloadUrlRef.current === url) {
        activeDownloadUrlRef.current = null;
      }
    }, 1000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;

    const metadataHeader = [
      '========================================================================',
      '=== AI AUDIO TRANSCRIPTION & EXECUTIVE SUMMARY REPORT ===',
      '========================================================================',
      `Source Audio File : ${audioFileName || 'Audio Recording'}`,
      ...(metaProject.trim() ? [`Project Name      : ${metaProject.trim()}`] : []),
      ...(metaCategory.trim() ? [`Session Category  : ${metaCategory.trim()}`] : []),
      `Session Date      : ${metaDate || new Date().toISOString().slice(0, 10)}`,
      ...(customTags.length > 0
        ? [`Session Tags      : ${customTags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(', ')}`]
        : []),
      `Language Mode     : ${result.detectedLanguage || selectedLanguage}`,
      `Whisper AI Model  : ${result.modelUsed || selectedModelId}`,
      `Audio Duration    : ${sessionMetadata.formattedDuration}`,
      `Exported Timestamp: ${new Date().toLocaleString()}`,
      '========================================================================',
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

    if (activeDownloadUrlRef.current) {
      try {
        URL.revokeObjectURL(activeDownloadUrlRef.current);
      } catch {
        // Ignore if already revoked
      }
      activeDownloadUrlRef.current = null;
    }

    const blob = new Blob([metadataHeader], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    activeDownloadUrlRef.current = url;
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore if already revoked
      }
      if (activeDownloadUrlRef.current === url) {
        activeDownloadUrlRef.current = null;
      }
    }, 1000);
  };

  const handleWebShare = async () => {
    if (!result) return;
    if (typeof navigator === 'undefined' || !navigator.share) {
      alert('Web Share API is not supported in this browser environment.');
      return;
    }

    try {
      const shareTitle = metaProject.trim() ? `${metaProject.trim()} - AI Transcript` : 'AI Audio Transcription';
      const shareText = [
        metaProject.trim() ? `Project: ${metaProject.trim()}` : '',
        metaCategory.trim() ? `Category: ${metaCategory.trim()}` : '',
        `Duration: ${sessionMetadata.formattedDuration}`,
        '',
        '--- EXECUTIVE SUMMARY ---',
        result.summary,
        '',
        '--- TRANSCRIPT ---',
        showLineTimestamps
          ? buildTimestampedTranscriptText(
              result.transcript,
              sessionMetadata.durationSeconds || verifiedDurationSeconds,
              result.speakerTurns
            )
          : result.transcript,
      ]
        .filter(Boolean)
        .join('\n');

      const shareData: ShareData = {
        title: shareTitle,
        text: shareText,
        url: window.location.href,
      };

      if (audioBlob && navigator.canShare) {
        const file = new File([audioBlob], audioFileName || 'recording.wav', { type: audioBlob.type || 'audio/wav' });
        const fileShareData = { ...shareData, files: [file] };
        if (navigator.canShare(fileShareData)) {
          await navigator.share(fileShareData);
          addLog('info', 'Successfully shared transcript and audio file via Web Share API.');
          return;
        }
      }

      await navigator.share(shareData);
      addLog('info', 'Successfully shared transcript text via Web Share API.');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        addLog('warn', 'Web Share API invocation failed:', err?.message || err);
      }
    }
  };

  const handleExportWaveformSvg = async () => {
    setIsExportingSvg(true);
    addLog('info', 'Initiating high-resolution vector SVG audio waveform export...');

    try {
      let samples: Float32Array | null = null;

      // 1. Gather PCM samples from pcmChunksRef if available
      if (pcmChunksRef.current && pcmChunksRef.current.length > 0) {
        let totalSamples = 0;
        for (let i = 0; i < pcmChunksRef.current.length; i++) {
          totalSamples += pcmChunksRef.current[i].length;
        }
        if (totalSamples > 0) {
          samples = new Float32Array(totalSamples);
          let offset = 0;
          for (let i = 0; i < pcmChunksRef.current.length; i++) {
            samples.set(pcmChunksRef.current[i], offset);
            offset += pcmChunksRef.current[i].length;
          }
        }
      }

      // 2. Fallback: decode audioBlob if PCM chunks are empty
      if ((!samples || samples.length === 0) && audioBlob) {
        try {
          const decoded = await decodeAudioBlobToMono16k(audioBlob, addLog);
          if (decoded && decoded.samples && decoded.samples.length > 0) {
            samples = decoded.samples;
          }
        } catch (err: any) {
          addLog('warn', 'Failed to decode audioBlob for SVG export:', err?.message || err);
        }
      }

      // 3. Peak bin calculation for clean SVG bars
      const BIN_COUNT = 120;
      const peaks: number[] = new Array(BIN_COUNT).fill(0.05);

      if (samples && samples.length > 0) {
        const samplesPerBin = Math.max(1, Math.floor(samples.length / BIN_COUNT));
        let maxPeakAcrossBins = 0;

        for (let i = 0; i < BIN_COUNT; i++) {
          const start = Math.floor(i * samplesPerBin);
          const end = Math.min(samples.length, Math.floor((i + 1) * samplesPerBin));
          let binPeak = 0;
          for (let j = start; j < end; j++) {
            const abs = Math.abs(samples[j]);
            if (abs > binPeak) binPeak = abs;
          }
          peaks[i] = binPeak;
          if (binPeak > maxPeakAcrossBins) maxPeakAcrossBins = binPeak;
        }

        // Normalize peak amplitudes to range 0.08 .. 0.95
        if (maxPeakAcrossBins > 0) {
          for (let i = 0; i < BIN_COUNT; i++) {
            peaks[i] = Math.max(0.08, Math.min(0.95, peaks[i] / maxPeakAcrossBins));
          }
        }
      } else {
        // Synthetic representative waveform curve if no audio loaded
        for (let i = 0; i < BIN_COUNT; i++) {
          const t = i / BIN_COUNT;
          peaks[i] = Math.max(0.1, 0.4 + 0.45 * Math.sin(t * Math.PI * 4) * Math.cos(t * Math.PI * 2.5));
        }
      }

      // Theme Gradient Colors
      const activeTheme = WAVEFORM_THEMES.find((t) => t.id === waveformTheme) || WAVEFORM_THEMES[0];
      const colorStart = waveformTheme === 'custom' ? customStartColor : activeTheme.startColor;
      const colorEnd = waveformTheme === 'custom' ? customEndColor : activeTheme.endColor;

      // Metadata Strings for SVG Header Banner
      const projectLabel = metaProject.trim() || 'General Recording';
      const categoryLabel = metaCategory.trim() || 'Voice Note';
      const dateLabel = metaDate || new Date().toISOString().slice(0, 10);
      const durationLabel =
        sessionMetadata.formattedDuration && sessionMetadata.formattedDuration !== '00:00.0'
          ? sessionMetadata.formattedDuration
          : formatDurationDisplay(verifiedDurationSeconds);
      const tagString = customTags.length > 0 ? customTags.map((t) => `#${t}`).join(' ') : '#Voice-Note #Whisper-AI';

      // SVG Canvas Dimensions
      const width = 1200;
      const height = 520;
      const centerY = 310;
      const maxAmplitudeY = 150;

      const barPadding = 2;
      const totalWidth = width - 80;
      const barWidth = Math.max(2, (totalWidth / BIN_COUNT) - barPadding);

      let topPathPoints: string[] = [];
      let bottomPathPoints: string[] = [];
      let svgBars: string[] = [];

      for (let i = 0; i < BIN_COUNT; i++) {
        const x = 40 + i * (barWidth + barPadding) + barWidth / 2;
        const amp = peaks[i];
        const barH = Math.max(6, amp * maxAmplitudeY);
        const topY = centerY - barH;
        const bottomY = centerY + barH;

        topPathPoints.push(`${x.toFixed(1)},${topY.toFixed(1)}`);
        bottomPathPoints.unshift(`${x.toFixed(1)},${bottomY.toFixed(1)}`);

        const opacity = Math.min(1, 0.45 + amp * 0.55);
        svgBars.push(
          `<rect x="${(x - barWidth / 2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${(barH * 2).toFixed(1)}" rx="${(barWidth / 2).toFixed(1)}" fill="url(#waveformGrad)" opacity="${opacity.toFixed(2)}" />`
        );
      }

      const contourAreaD = `M 40,${centerY} L ${topPathPoints.join(' L ')} L ${40 + totalWidth},${centerY} L ${bottomPathPoints.join(' L ')} Z`;

      const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="50%" stop-color="#0b132b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- Waveform Theme Gradient -->
    <linearGradient id="waveformGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colorStart}" />
      <stop offset="100%" stop-color="${colorEnd}" />
    </linearGradient>

    <!-- Waveform Glow Gradient -->
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colorStart}" stop-opacity="0.35" />
      <stop offset="50%" stop-color="${colorEnd}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${colorStart}" stop-opacity="0.02" />
    </linearGradient>

    <!-- Card Overlay Border Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colorStart}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${colorEnd}" stop-opacity="0.3" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="neonGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Container Outer Card -->
  <rect x="0" y="0" width="${width}" height="${height}" rx="20" fill="url(#bgGrad)" />
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="18" fill="none" stroke="url(#borderGrad)" stroke-width="2" opacity="0.8" />

  <!-- Header Branding Banner -->
  <g transform="translate(40, 42)">
    <rect x="0" y="0" width="280" height="26" rx="6" fill="${colorStart}" fill-opacity="0.15" stroke="${colorStart}" stroke-opacity="0.4" stroke-width="1" />
    <text x="12" y="17" fill="${colorStart}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" letter-spacing="1.2">
      JAWED AI AUDIO • WAVEFORM PATTERN
    </text>

    <text x="0" y="54" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800">
      ${audioFileName ? audioFileName.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Audio Session Recording'}
    </text>

    <g transform="translate(0, 68)">
      <text x="0" y="16" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">
        Project: <tspan fill="#e2e8f0" font-weight="700">${projectLabel.replace(/</g, '&lt;')}</tspan>  •  Category: <tspan fill="#e2e8f0" font-weight="700">${categoryLabel.replace(/</g, '&lt;')}</tspan>  •  Date: <tspan fill="#e2e8f0" font-weight="700">${dateLabel}</tspan>  •  Duration: <tspan fill="${colorStart}" font-weight="800">${durationLabel}</tspan>
      </text>
    </g>
  </g>

  <!-- Session Tags Chip List in Header Top-Right -->
  <g transform="translate(${width - 40}, 42)" text-anchor="end">
    <text x="0" y="18" fill="#94a3b8" font-family="monospace" font-size="12" font-weight="700">
      ${tagString.replace(/</g, '&lt;')}
    </text>
    <text x="0" y="38" fill="#64748b" font-family="monospace" font-size="11">
      ${sessionMetadata.sampleRate || 44100} Hz  •  16-bit Mono PCM
    </text>
  </g>

  <!-- Horizontal Grid Lines & Center Zero Axis -->
  <line x1="40" y1="${centerY - maxAmplitudeY}" x2="${width - 40}" y2="${centerY - maxAmplitudeY}" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4" />
  <line x1="40" y1="${centerY - maxAmplitudeY / 2}" x2="${width - 40}" y2="${centerY - maxAmplitudeY / 2}" stroke="#1e293b" stroke-width="1" stroke-dasharray="2,2" />
  <line x1="40" y1="${centerY}" x2="${width - 40}" y2="${centerY}" stroke="${colorStart}" stroke-opacity="0.5" stroke-width="1.5" />
  <line x1="40" y1="${centerY + maxAmplitudeY / 2}" x2="${width - 40}" y2="${centerY + maxAmplitudeY / 2}" stroke="#1e293b" stroke-width="1" stroke-dasharray="2,2" />
  <line x1="40" y1="${centerY + maxAmplitudeY}" x2="${width - 40}" y2="${centerY + maxAmplitudeY}" stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4" />

  <!-- Smooth Glow Area Under Contour Envelope -->
  <path d="${contourAreaD}" fill="url(#glowGrad)" opacity="0.85" />

  <!-- Vector Waveform Bars -->
  <g filter="url(#neonGlow)">
    ${svgBars.join('\n    ')}
  </g>

  <!-- Timeline Markers & Time Labels -->
  <g transform="translate(0, ${centerY + maxAmplitudeY + 22})" fill="#64748b" font-family="monospace" font-size="11">
    <text x="40" text-anchor="start">0:00</text>
    <text x="${(40 + totalWidth * 0.25).toFixed(1)}" text-anchor="middle">25%</text>
    <text x="${(40 + totalWidth * 0.5).toFixed(1)}" text-anchor="middle">50%</text>
    <text x="${(40 + totalWidth * 0.75).toFixed(1)}" text-anchor="middle">75%</text>
    <text x="${width - 40}" text-anchor="end">${durationLabel}</text>
  </g>

  <!-- Footer Branding & Export Date -->
  <g transform="translate(40, ${height - 22})">
    <text x="0" y="0" fill="#475569" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">
      Generated by Jawed AI Audio Transcriber  •  100% In-Browser Privacy  •  Whisper Neural Speech Engine
    </text>
    <text x="${totalWidth}" y="0" text-anchor="end" fill="#475569" font-family="monospace" font-size="11">
      Exported: ${new Date().toISOString().slice(0, 10)}
    </text>
  </g>
</svg>`;

      // Download SVG File
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const baseName = audioFileName
        ? audioFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-')
        : `audio-waveform-${new Date().toISOString().slice(0, 10)}`;
      const downloadFileName = `${baseName}-waveform.svg`;

      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addLog('info', `Successfully exported waveform SVG file (${downloadFileName}, ${blob.size} bytes).`);

      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore if already revoked
        }
      }, 1000);
    } catch (err: any) {
      reportError('playback', 'Failed to generate waveform SVG image file.', err?.message || err);
    } finally {
      setIsExportingSvg(false);
    }
  };

  const summarizeWithOllama = async (
    transcriptText: string,
    config: { ollamaEndpoint: string; ollamaModel: string },
    contextData: any
  ) => {
    const endpoint = (config.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
    const model = config.ollamaModel || 'llama3';

    const project = contextData?.project ? `Project: ${contextData.project}` : '';
    const category = contextData?.category ? `Category: ${contextData.category}` : '';
    const tags = Array.isArray(contextData?.tags) && contextData.tags.length > 0 ? `Tags: ${contextData.tags.join(', ')}` : '';
    const metadataContext = [project, category, tags].filter(Boolean).join(' | ');

    const promptText = `Analyze the following transcript from an IT voice recording, meeting, or field note.
${metadataContext ? `Session Metadata Context: [${metadataContext}]\n` : ''}

Transcript:
"""
${transcriptText.trim()}
"""

Provide an executive summary, concrete action items, key technical takeaways, and a clean IT support log entry formatted for ticketing systems (ServiceNow/Jira/ITIL notes).
Return your response as a valid JSON object with keys:
- "summary": string (2-4 sentence executive summary)
- "actionItems": array of strings (concrete action items)
- "keyTakeaways": array of strings (key technical findings)
- "itLogEntry": string (formatted IT support log entry)
Output ONLY valid JSON.`;

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: promptText,
          stream: false,
          format: 'json',
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama local server responded with status ${res.status}. Ensure Ollama is running at ${endpoint} with CORS enabled (OLLAMA_ORIGINS="*").`);
      }

      const data = await res.json();
      const rawResponse = data.response || '{}';
      const cleanedJson = rawResponse.replace(/```json\s*([\s\S]*?)\s*```/g, '$1').replace(/```\s*([\s\S]*?)\s*```/g, '$1').trim();
      const parsed = JSON.parse(cleanedJson);

      setOllamaStatus('connected');
      setOllamaError(null);
      setLlmSummaryError(null);

      return {
        summary: parsed.summary || 'Summary unavailable.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        itLogEntry: parsed.itLogEntry || '',
        modelUsed: `Local Ollama (${model})`,
      };
    } catch (err: any) {
      setOllamaStatus('disconnected');
      const friendlyMsg = err?.message || `Failed to connect to local Ollama API at ${endpoint}. Ensure Ollama is active with CORS enabled (OLLAMA_ORIGINS="*").`;
      setOllamaError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchTranscriptItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const rawText = await file.text();
        const cleaned = parseUploadedTranscriptFile(file.name, rawText);
        if (!cleaned || !cleaned.trim()) continue;

        const words = cleaned.trim().split(/\s+/).length;
        newItems.push({
          id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          fileName: file.name,
          fileSize: file.size,
          transcriptText: cleaned,
          wordCount: words,
          status: 'pending',
          isExpanded: false,
        });
      } catch (err: any) {
        addLog('error', `Failed to read batch transcript file ${file.name}: ${err?.message || err}`);
      }
    }

    if (newItems.length > 0) {
      setBatchQueue((prev) => [...prev, ...newItems]);
      setShowBatchModal(true);
      addLog('info', `Added ${newItems.length} transcript file(s) to Ollama batch queue.`);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleAddCurrentTranscriptToBatch = () => {
    if (!result || !result.transcript || !result.transcript.trim()) return;
    const baseName = audioFileName ? audioFileName.replace(/\.[^/.]+$/, '') : 'Live-Recording';
    const fileName = `${baseName}-${metaProject ? metaProject.replace(/[^a-zA-Z0-9_-]+/g, '-') : 'transcript'}.txt`;
    const text = result.transcript;
    const words = text.trim().split(/\s+/).length;

    const newItem: BatchTranscriptItem = {
      id: `batch-curr-${Date.now()}`,
      fileName,
      fileSize: new Blob([text]).size,
      transcriptText: text,
      wordCount: words,
      status: 'pending',
      isExpanded: false,
    };

    setBatchQueue((prev) => [...prev, newItem]);
    setShowBatchModal(true);
    addLog('info', `Added active transcript "${fileName}" to Ollama batch queue.`);
  };

  const handleStartBatchProcessing = async () => {
    if (isBatchProcessing) return;

    const eligibleItems = batchQueue
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === 'pending' || item.status === 'failed');

    if (eligibleItems.length === 0) {
      alert('All items in the batch queue have already been summarized.');
      return;
    }

    setIsBatchProcessing(true);
    batchStopRequestedRef.current = false;

    const aiConfig = getStoredAiProviderConfig();
    addLog(
      'info',
      `Starting sequential batch summarization for ${eligibleItems.length} transcript(s) via Ollama (${aiConfig.ollamaEndpoint}, model: ${aiConfig.ollamaModel})...`
    );

    for (let step = 0; step < eligibleItems.length; step++) {
      if (batchStopRequestedRef.current) {
        addLog('warn', 'Batch summarization paused by user.');
        break;
      }

      const { idx } = eligibleItems[step];
      const targetItem = batchQueue[idx];
      if (!targetItem) continue;

      setCurrentBatchIndex(idx);
      setBatchQueue((prev) =>
        prev.map((item, i) =>
          i === idx ? { ...item, status: 'processing', error: undefined } : item
        )
      );

      const itemStartTime = Date.now();
      try {
        const summaryData = await summarizeWithOllama(targetItem.transcriptText, aiConfig, {
          project: metaProject,
          category: metaCategory,
          tags: customTags,
        });

        const durationMs = Date.now() - itemStartTime;

        setBatchQueue((prev) =>
          prev.map((item, i) =>
            i === idx
              ? {
                  ...item,
                  status: 'completed',
                  result: {
                    summary: summaryData.summary,
                    actionItems: summaryData.actionItems,
                    keyTakeaways: summaryData.keyTakeaways,
                    itLogEntry: summaryData.itLogEntry,
                    modelUsed: summaryData.modelUsed,
                    durationMs,
                  },
                  isExpanded: true,
                }
              : item
          )
        );

        addLog(
          'info',
          `Completed batch item ${step + 1}/${eligibleItems.length} (${targetItem.fileName}) in ${(durationMs / 1000).toFixed(1)}s via Ollama.`
        );
      } catch (err: any) {
        const errMessage = err?.message || 'Failed to summarize via local Ollama';
        setBatchQueue((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, status: 'failed', error: errMessage } : item
          )
        );
        addLog('error', `Batch item ${step + 1}/${eligibleItems.length} (${targetItem.fileName}) failed: ${errMessage}`);
      }
    }

    setIsBatchProcessing(false);
    setCurrentBatchIndex(-1);
    addLog('info', 'Batch Ollama summarization process completed.');
  };

  const handleStopBatchProcessing = () => {
    batchStopRequestedRef.current = true;
    addLog('info', 'Stop requested for batch summarization queue. Halting after current item finishes.');
  };

  const handleClearBatchQueue = () => {
    if (isBatchProcessing) {
      alert('Please pause or stop the current batch run before clearing the queue.');
      return;
    }
    setBatchQueue([]);
  };

  const handleClearCompletedBatch = () => {
    setBatchQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRetryBatchItem = (id: string) => {
    setBatchQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'pending', error: undefined } : item
      )
    );
  };

  const handleToggleBatchItemExpand = (id: string) => {
    setBatchQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const handleExportAllBatchSummariesJson = () => {
    const completed = batchQueue.filter((item) => item.status === 'completed' && item.result);
    if (completed.length === 0) {
      alert('No completed summaries available to export.');
      return;
    }

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      provider: 'ollama',
      totalItems: completed.length,
      summaries: completed.map((item) => ({
        fileName: item.fileName,
        wordCount: item.wordCount,
        durationMs: item.result?.durationMs,
        modelUsed: item.result?.modelUsed,
        summary: item.result?.summary,
        actionItems: item.result?.actionItems,
        keyTakeaways: item.result?.keyTakeaways,
        itLogEntry: item.result?.itLogEntry,
      })),
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ollama-batch-summaries-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addLog('info', `Exported ${completed.length} batch summaries to JSON bundle.`);
  };

  const handleExportAllBatchSummariesMarkdown = () => {
    const completed = batchQueue.filter((item) => item.status === 'completed' && item.result);
    if (completed.length === 0) {
      alert('No completed summaries available to export.');
      return;
    }

    let md = `# Batch Audio Transcripts & Summaries Report\n\n`;
    md += `*Generated by Jawed AI Audio Transcriber via Local Ollama*\n`;
    md += `*Date: ${new Date().toLocaleString()} | Completed Summaries: ${completed.length}*\n\n`;
    md += `## Table of Contents\n\n`;
    completed.forEach((item, idx) => {
      md += `${idx + 1}. [${item.fileName}](#summary-${idx + 1})\n`;
    });
    md += `\n---\n\n`;

    completed.forEach((item, idx) => {
      const res = item.result!;
      md += `### <a id="summary-${idx + 1}"></a>${idx + 1}. ${item.fileName}\n\n`;
      md += `- **Word Count:** ${item.wordCount} words\n`;
      md += `- **Model Used:** ${res.modelUsed}\n`;
      if (res.durationMs) md += `- **Processing Time:** ${(res.durationMs / 1000).toFixed(1)}s\n`;
      md += `\n#### Executive Summary\n${res.summary}\n\n`;

      if (res.actionItems && res.actionItems.length > 0) {
        md += `#### Action Items\n`;
        res.actionItems.forEach((act) => {
          md += `- [ ] ${act}\n`;
        });
        md += `\n`;
      }

      if (res.keyTakeaways && res.keyTakeaways.length > 0) {
        md += `#### Key Takeaways\n`;
        res.keyTakeaways.forEach((k) => {
          md += `- ${k}\n`;
        });
        md += `\n`;
      }

      if (res.itLogEntry) {
        md += `#### IT Support Log Entry\n\`\`\`text\n${res.itLogEntry}\n\`\`\`\n\n`;
      }

      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ollama-batch-summaries-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addLog('info', `Exported ${completed.length} batch summaries to Markdown report.`);
  };

  const handleDownloadSingleBatchSummary = (item: BatchTranscriptItem) => {
    if (!item.result) return;
    const res = item.result;
    let txt = `========================================================\n`;
    txt += `SUMMARY REPORT: ${item.fileName}\n`;
    txt += `Generated via Local Ollama (${res.modelUsed})\n`;
    txt += `Date: ${new Date().toLocaleString()}\n`;
    txt += `========================================================\n\n`;
    txt += `[EXECUTIVE SUMMARY]\n${res.summary}\n\n`;
    if (res.actionItems.length > 0) {
      txt += `[ACTION ITEMS]\n`;
      res.actionItems.forEach((act, i) => {
        txt += `${i + 1}. ${act}\n`;
      });
      txt += `\n`;
    }
    if (res.keyTakeaways.length > 0) {
      txt += `[KEY TAKEAWAYS]\n`;
      res.keyTakeaways.forEach((k, i) => {
        txt += `• ${k}\n`;
      });
      txt += `\n`;
    }
    if (res.itLogEntry) {
      txt += `[IT SUPPORT LOG ENTRY]\n${res.itLogEntry}\n\n`;
    }

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopyBatchText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setBatchCopiedId(id);
      setTimeout(() => setBatchCopiedId(null), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleSummarizeWithLlm = async () => {
    if (!result || !result.transcript || !result.transcript.trim()) return;

    setIsSummarizingLlm(true);
    setLlmSummaryError(null);

    const aiConfig = getStoredAiProviderConfig();
    const useOllama = aiConfig.provider === 'ollama';

    addLog(
      'info',
      useOllama
        ? `Generating summary via local Ollama (${aiConfig.ollamaEndpoint}, model: ${aiConfig.ollamaModel})...`
        : 'Generating Gemini Cloud AI summary, action items & IT support log entry...'
    );

    try {
      if (useOllama) {
        const ollamaResult = await summarizeWithOllama(result.transcript, aiConfig, {
          project: metaProject,
          category: metaCategory,
          date: metaDate,
          tags: customTags,
        });

        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            summary: ollamaResult.summary,
            actionItems: ollamaResult.actionItems.length > 0 ? ollamaResult.actionItems : prev.actionItems,
            keyTakeaways: ollamaResult.keyTakeaways || [],
            itLogEntry: ollamaResult.itLogEntry || '',
            isLlmGenerated: true,
            modelUsed: `${prev.modelUsed || selectedModelId} + ${ollamaResult.modelUsed} (Free Local AI)`,
          };
        });

        addLog('info', 'Successfully generated transcript summary & IT support notes via local Ollama (100% free & private).');
        return;
      }

      // Default Gemini Cloud API fallback via server
      const res = await fetch('/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: result.transcript,
          context: {
            project: metaProject,
            category: metaCategory,
            date: metaDate,
            tags: customTags,
          },
          providerConfig: aiConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to summarize transcript via AI.');
      }

      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          summary: data.summary,
          actionItems: data.actionItems && data.actionItems.length > 0 ? data.actionItems : prev.actionItems,
          keyTakeaways: data.keyTakeaways || [],
          itLogEntry: data.itLogEntry || '',
          isLlmGenerated: true,
          modelUsed: `${prev.modelUsed || selectedModelId} + ${data.modelUsed || 'AI Summary'}`,
        };
      });

      addLog('info', 'Successfully generated AI transcript summary & IT support log notes.');
    } catch (err: any) {
      const msg = err?.message || 'Error generating AI summary.';
      setLlmSummaryError(msg);
      if (useOllama) {
        setOllamaStatus('disconnected');
        setOllamaError(msg);
      }
      addLog('error', 'AI Summarizer Error:', msg);
    } finally {
      setIsSummarizingLlm(false);
    }
  };

  // Automatically restore previous recording state and metadata tags from localStorage on mount / page reload
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.transcript && parsed.transcript.trim()) {
          setRestorableDraft(parsed);
          // Automatically restore state on page reload
          setResult({
            transcript: parsed.transcript,
            summary: parsed.summary || 'Restored session draft.',
            actionItems: parsed.actionItems || [],
            keyTakeaways: parsed.keyTakeaways || [],
            itLogEntry: parsed.itLogEntry || '',
            isLlmGenerated: parsed.isLlmGenerated || false,
            modelUsed: 'Auto-Restored Session Draft',
          });

          if (parsed.audioFileName) setAudioFileName(parsed.audioFileName);
          if (parsed.metaProject) setMetaProject(parsed.metaProject);
          if (parsed.metaCategory) setMetaCategory(parsed.metaCategory);
          if (parsed.metaDate) setMetaDate(parsed.metaDate);
          if (Array.isArray(parsed.customTags)) setCustomTags(parsed.customTags);

          addLog('info', `Successfully auto-restored previous recording state and metadata tags from localStorage (${parsed.formattedTime || 'previous session'}).`, {
            transcriptLength: parsed.transcript.length,
            audioFileName: parsed.audioFileName,
            metaProject: parsed.metaProject,
            customTags: parsed.customTags,
          });
        }
      }
    } catch (err: any) {
      addLog('warn', 'Failed to auto-restore recording state from localStorage:', err?.message || err);
    }
  }, [addLog]);

  // Periodic 30-second Auto-Save Effect
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTranscript = result?.transcript || liveTranscript;
      if (!currentTranscript || !currentTranscript.trim()) return;

      try {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const autoSaveData = {
          timestamp: now.getTime(),
          formattedTime,
          transcript: currentTranscript,
          summary: result?.summary || '',
          actionItems: result?.actionItems || [],
          keyTakeaways: result?.keyTakeaways || [],
          itLogEntry: result?.itLogEntry || '',
          isLlmGenerated: result?.isLlmGenerated || false,
          audioFileName: audioFileName || 'Voice Recording',
          metaProject,
          metaCategory,
          metaDate,
          customTags,
        };

        localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(autoSaveData));
        setLastAutoSaveTime(formattedTime);
        setShowAutoSaveToast(true);
        setTimeout(() => setShowAutoSaveToast(false), 3500);
      } catch {
        // Ignore localStorage quota errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [result, liveTranscript, audioFileName, metaProject, metaCategory, metaDate, customTags, addLog]);

  const handleRestoreDraft = () => {
    if (!restorableDraft) return;

    setResult({
      transcript: restorableDraft.transcript,
      summary: restorableDraft.summary || 'Restored transcript draft.',
      actionItems: restorableDraft.actionItems || [],
      keyTakeaways: restorableDraft.keyTakeaways || [],
      itLogEntry: restorableDraft.itLogEntry || '',
      isLlmGenerated: restorableDraft.isLlmGenerated || false,
      modelUsed: 'Restored Draft',
    });

    if (restorableDraft.audioFileName) setAudioFileName(restorableDraft.audioFileName);
    if (restorableDraft.metaProject) setMetaProject(restorableDraft.metaProject);
    if (restorableDraft.metaCategory) setMetaCategory(restorableDraft.metaCategory);
    if (restorableDraft.metaDate) setMetaDate(restorableDraft.metaDate);
    if (Array.isArray(restorableDraft.customTags)) setCustomTags(restorableDraft.customTags);

    setRestorableDraft(null);
    addLog('info', 'Successfully restored auto-saved transcript draft.');
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(AUTO_SAVE_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
    setRestorableDraft(null);
    addLog('info', 'Discarded auto-saved transcript draft.');
  };

  const selectedLanguageMeta =
    SUPPORTED_TRANSCRIPTION_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_TRANSCRIPTION_LANGUAGES[0];

  const verifiedDurationSeconds =
    wavValidation?.durationSeconds ??
    audioElementDiag?.duration ??
    (recordingTime > 0 ? recordingTime : null);

  const activeRecordingTimerMs = isRecording
    ? recordingElapsedMs
    : recordingTime > 0
    ? recordingTime * 1000
    : wavValidation?.durationSeconds && wavValidation.durationSeconds > 0
    ? Math.round(wavValidation.durationSeconds * 1000)
    : 0;

  const recordingTimerDisplay = formatTimerDisplay(activeRecordingTimerMs);

  const scrubberMaxDuration =
    playbackDuration > 0
      ? playbackDuration
      : verifiedDurationSeconds !== null && verifiedDurationSeconds > 0
      ? verifiedDurationSeconds
      : 0;

  const isCurrentSourceWav =
    audioMimeType.includes('wav') ||
    (audioBlob?.type?.includes('wav') ?? false) ||
    /\.wav$/i.test(audioFileName) ||
    Boolean(wavValidation);

  const verifiedAudioElementSrc =
    audioUrl &&
    (!isCurrentSourceWav ||
      verifyWavBlobHeaderAndNonZeroPcm(audioBlob, wavValidation).isReadyForPlayback)
      ? audioUrl
      : undefined;

  return (
    <div className="page ai-audio-transcriber-page">
      <main className="container" style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '80px' }}>
        {/* Top Breadcrumb & Social Share Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'AI Audio Transcriber & Summarizer' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="AI Audio Transcriber & Summarizer | Jawed Imtiaz"
            text="Transcribe voice recordings and audio files 100% locally in your browser with private Whisper AI. Zero data uploaded to servers."
            url={
              typeof window !== 'undefined'
                ? `${window.location.origin}/tools/ai-audio-transcriber`
                : 'https://jawed.co.in/tools/ai-audio-transcriber'
            }
          />
        </div>

        {/* Auto-Saved Draft Recovery Banner */}
        {restorableDraft && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.12))',
              border: '1px solid var(--accent)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RotateCcw size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.94rem', color: 'var(--text-heading)', display: 'block' }}>
                  Auto-Saved Transcript Draft Found ({restorableDraft.formattedTime || 'Previous session'})
                </strong>
                <span style={{ fontSize: '0.80rem', color: 'var(--muted)' }}>
                  Found transcript from "{restorableDraft.audioFileName || 'Session'}": "{restorableDraft.transcript.slice(0, 90)}..."
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRestoreDraft}
                style={{
                  background: 'var(--accent)',
                  color: '#ffffff',
                  border: 0,
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <RotateCcw size={13} />
                Restore Draft
              </button>

              <button
                type="button"
                onClick={handleDiscardDraft}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={13} />
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Page Header matching ITCoverLetterBuilder & Site Standard */}
        <header style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                Free Tool • 100% In Browser
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={14} color="var(--emerald)" aria-hidden="true" /> Zero Server Uploads • 100% Private
              </span>

              {/* Ollama Connection Health Status Badge */}
              <div
                onClick={() => void checkOllamaStatus()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: ollamaStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : ollamaStatus === 'checking' || isRetryingOllama ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${ollamaStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : ollamaStatus === 'checking' || isRetryingOllama ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: ollamaStatus === 'connected' ? 'var(--emerald)' : ollamaStatus === 'checking' || isRetryingOllama ? 'var(--amber)' : '#ef4444',
                  cursor: 'pointer',
                }}
                title={`Ollama Local API (${ollamaModelName}): ${ollamaStatus}. Click to test connection.`}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: ollamaStatus === 'connected' ? 'var(--emerald)' : ollamaStatus === 'checking' || isRetryingOllama ? 'var(--amber)' : '#ef4444',
                    boxShadow: ollamaStatus === 'connected' ? '0 0 6px var(--emerald)' : 'none',
                  }}
                />
                <span>Ollama: {ollamaStatus === 'connected' ? `Connected (${ollamaModelName})` : ollamaStatus === 'checking' || isRetryingOllama ? 'Checking...' : 'Disconnected'}</span>
                {ollamaStatus === 'disconnected' && (
                  <RotateCcw size={11} style={{ marginLeft: '2px', opacity: 0.8 }} />
                )}
              </div>

              {/* Local Ollama Batch Summarizer Trigger Button */}
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: batchQueue.length > 0 ? 'rgba(56, 189, 248, 0.15)' : 'var(--card)',
                  border: batchQueue.length > 0 ? '1px solid var(--accent)' : '1px solid var(--line)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: batchQueue.length > 0 ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Open Local Ollama Batch Summarizer to queue multiple transcript files for sequential processing"
              >
                <Layers size={13} color="var(--accent)" />
                <span>Batch Mode</span>
                {batchQueue.length > 0 && (
                  <span
                    style={{
                      background: 'var(--accent)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      lineHeight: 1.2,
                    }}
                  >
                    {batchQueue.length}
                  </span>
                )}
                {isBatchProcessing && (
                  <Loader2 size={11} className="animate-spin" color="var(--accent)" />
                )}
              </button>

              {/* Ollama & Dictionary Config Import / Export Button */}
              <button
                type="button"
                onClick={() => {
                  setAiSettingsModalTab('import-export');
                  setShowAiSettingsModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Save & Share Ollama connection settings and custom technical dictionary as JSON"
              >
                <Download size={13} color="var(--accent)" />
                <span>Config / Export</span>
              </button>

              {result && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#f43f5e',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Download or Print transcript & summary report as high-quality PDF via browser print dialog"
                >
                  <Printer size={13} />
                  <span>Download as PDF</span>
                </button>
              )}

              {lastAutoSaveTime && (
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--emerald)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <CheckCircle2 size={12} color="var(--emerald)" />
                  Auto-saved ({lastAutoSaveTime})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDebug((prev) => !prev)}
              style={{
                background: showDebug ? 'var(--surface-accent)' : 'var(--surface)',
                border: showDebug ? '1px solid var(--accent)' : '1px solid var(--line)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: showDebug ? 'var(--accent)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="Toggle AudioContext, WAV header and microphone diagnostics"
            >
              <Terminal size={14} color="var(--accent)" aria-hidden="true" />
              {showDebug ? 'Hide Audio Diagnostics' : 'Audio & Mic Diagnostics'}
              {showDebug ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              color: 'var(--text-heading)',
            }}
          >
            AI Audio Transcriber &amp; Summarizer
          </h1>
          <p
            className="lead"
            style={{
              fontSize: '1.05rem',
              color: 'var(--muted)',
              maxWidth: '840px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Record live voice notes or upload audio files for 100% local, private multilingual
            transcription, executive summaries, and action items powered by in-browser Whisper AI.
          </p>
        </header>

        {/* Diagnostics Drawer (when enabled) */}
        {showDebug && (
          <section
            className="panel"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="var(--accent)" />
                Browser Audio, WAV Header &amp; Playback Diagnostics
              </span>
              <button
                type="button"
                onClick={() => setDebugLogs([])}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                Clear Log
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Secure Context (HTTPS)</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: envInfo.isSecureContext ? 'var(--emerald)' : 'var(--rose)' }}>
                  {String(envInfo.isSecureContext)}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>getUserMedia API</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: envInfo.hasGetUserMedia ? 'var(--emerald)' : 'var(--rose)' }}>
                  {envInfo.hasGetUserMedia ? 'Available' : 'Missing'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Permission State</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--amber)' }}>{envInfo.permissionState}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>AudioContext Sample Rate</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {audioContextDiag ? `${audioContextDiag.normalizedSampleRate} Hz` : 'Idle'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>WAV Header Integrity</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: wavValidation?.valid ? 'var(--emerald)' : 'var(--muted)' }}>
                  {wavValidation ? (wavValidation.valid ? 'VALID HEADER' : 'INVALID') : 'No WAV'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Signal Activity</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: wavValidation?.hasNonZeroAudio ? 'var(--emerald)' : 'var(--muted)' }}>
                  {wavValidation?.hasNonZeroAudio ? 'Non-Zero Signal' : 'Silent / Standby'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Recording Preset</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {recordingPreset === 'high-fidelity' ? 'High Fidelity (44.1kHz)' : 'Voice Optimized (16kHz)'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Input Peak Level</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: meterPeakDb > -12 ? 'var(--amber)' : meterPeakDb > -40 ? 'var(--emerald)' : 'var(--muted)' }}>
                  {meterPeakDb <= -60 ? '-Inf dBFS (Idle)' : `${meterPeakDb} dBFS (${meterSignalStatus.toUpperCase()})`}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
              }}
            >
              {debugLogs.length === 0 ? (
                <div style={{ color: 'var(--muted)' }}>No events logged yet.</div>
              ) : (
                debugLogs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: '6px', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--muted)' }}>[{log.timestamp}]</span>{' '}
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          log.level === 'error'
                            ? 'var(--rose)'
                            : log.level === 'warn'
                            ? 'var(--amber)'
                            : 'var(--accent)',
                      }}
                    >
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    <span style={{ color: 'var(--text)' }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Panel 1: Transcription Model & Spoken Language Settings */}
        <section
          className="panel no-print"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '14px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                1. Transcription Engine &amp; Language Settings
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Select spoken language dialect and choose the in-browser Whisper AI model tier.
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
              marginBottom: '16px',
            }}
          >
            {/* Spoken Language Dropdown */}
            <div>
              <label
                htmlFor="transcription-language"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '6px',
                  color: 'var(--text)',
                }}
              >
                <Globe size={15} color="var(--accent)" aria-hidden="true" />
                Spoken Language (Native Script Output)
              </label>
              <select
                id="transcription-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: '0.92rem',
                }}
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
            <div>
              <label
                htmlFor="whisper-model-select"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '6px',
                  color: 'var(--text)',
                }}
              >
                <Cpu size={15} color="var(--accent)" aria-hidden="true" />
                Local Whisper AI Model
              </label>
              <select
                id="whisper-model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: '0.92rem',
                }}
              >
                {WHISPER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} [{m.approxDownloadSize}]
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Diarization Selector */}
            <div>
              <label
                htmlFor="diarization-mode-select"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '6px',
                  color: 'var(--text)',
                }}
              >
                <Users size={15} color="var(--accent)" aria-hidden="true" />
                Speaker Diarization Mode
              </label>
              <select
                id="diarization-mode-select"
                value={diarizationMode}
                onChange={(e) => setDiarizationMode(e.target.value as DiarizationMode)}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: '0.92rem',
                }}
              >
                <option value="auto">Auto-Detect (Multi-Stream & VAD Acoustic Analysis)</option>
                <option value="2-speakers">2-Speaker Dialogue (Interview / Conversation)</option>
                <option value="multi-channel">Multi-Stream Stereo (Left / Right Channel Detection)</option>
                <option value="disabled">Single Speaker / Diarization Disabled</option>
              </select>
            </div>

            {/* IT Terms Real-Time Auto-Correction Selector */}
            <div>
              <label
                htmlFor="auto-correction-select"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '6px',
                  color: 'var(--text)',
                }}
              >
                <Wand2 size={15} color="var(--emerald)" aria-hidden="true" />
                IT Term &amp; Sentence Auto-Correction
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={enableAutoCorrection}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setEnableAutoCorrection(enabled);
                      setEnableCapitalization(enabled);
                      setEnableITDictionary(enabled);
                    }}
                    style={{ accentColor: 'var(--emerald)', cursor: 'pointer' }}
                  />
                  <span>Enable Auto-Correction</span>
                </label>

                {enableAutoCorrection && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableCapitalization}
                        onChange={(e) => setEnableCapitalization(e.target.checked)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span>Capitalize</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableITDictionary}
                        onChange={(e) => setEnableITDictionary(e.target.checked)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span>IT Dictionary</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAiSettingsModalTab('dictionary');
                        setShowAiSettingsModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                      title="Manage custom technical dictionary terms and vocabulary"
                    >
                      Manage ({customDictionaryTerms.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiSettingsModalTab('import-export');
                        setShowAiSettingsModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                      title="Import or Export Ollama settings and technical dictionary as JSON"
                    >
                      <Download size={11} /> Config JSON
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Web Audio API Noise Gate (GainNode) Control */}
            <div>
              <label
                htmlFor="noise-gate-toggle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '6px',
                  color: 'var(--text)',
                }}
              >
                <Sliders size={15} color="var(--amber)" aria-hidden="true" />
                Web Audio Noise Gate (GainNode)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '2px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                  <input
                    id="noise-gate-toggle"
                    type="checkbox"
                    checked={enableNoiseGate}
                    onChange={(e) => setEnableNoiseGate(e.target.checked)}
                    style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                  />
                  <span>Enable Web Audio Noise Gate</span>
                </label>

                {enableNoiseGate && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <span>Gate Threshold:</span>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--amber)' }}>{noiseGateThresholdDb} dBFS</strong>
                    </div>
                    <input
                      type="range"
                      min={-60}
                      max={-15}
                      step={1}
                      value={noiseGateThresholdDb}
                      onChange={(e) => setNoiseGateThresholdDb(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--amber)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--muted)' }}>
                      <span>-60 dBFS (Quiet Room)</span>
                      <span>-15 dBFS (Loud Ambient)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
              fontSize: '0.82rem',
              color: 'var(--muted)',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text)' }}>Language Note:</strong> {selectedLanguageMeta.accuracyNote}
            </div>
            <div style={{ color: 'var(--emerald)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> 100% Client-Side WebAssembly • Zero Audio Stored or Streamed
            </div>
          </div>
        </section>

        {/* Panel 2: Audio Capture (Record or Upload) */}
        <section
          className="panel no-print"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '14px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                2. Audio Input: Record Microphone or Upload File
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                Capture audio with real-time waveform visualization, pause/resume buffering, and accessible timer tracking.
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            {/* Box A: Microphone Recording */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isRecording
                    ? isPaused
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.18)'
                    : 'var(--surface-accent)',
                  color: isRecording
                    ? isPaused
                      ? 'var(--amber)'
                      : 'var(--rose)'
                    : 'var(--accent)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Mic size={26} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  {isRecording
                    ? isPaused
                      ? 'Recording Paused'
                      : 'Recording in Progress...'
                    : isRequestingMic
                    ? 'Requesting Microphone...'
                    : 'Record Live Voice Note'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', maxWidth: '320px' }}>
                  {isRecording
                    ? isPaused
                      ? `Paused at ${formatDurationDisplay(recordingTime)} • Buffer preserved (${pcmChunksRef.current.length} chunks)`
                      : `Elapsed: ${formatDurationDisplay(recordingTime)} • Peak: ${Math.min(100, Math.round(inputLevelPeak * 140))}%`
                    : 'Captures clean 16-bit mono PCM audio directly into memory'}
                </p>
              </div>

              {/* Recording Presets Dropdown */}
              <div style={{ width: '100%', textAlign: 'left' }}>
                <label
                  htmlFor="recording-presets-select"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={14} color="var(--accent)" aria-hidden="true" />
                    Recording Presets
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'var(--surface-accent)',
                      color: 'var(--accent)',
                      fontWeight: 700,
                    }}
                  >
                    {recordingPreset === 'high-fidelity' ? '44.1 kHz' : '16.0 kHz'}
                  </span>
                </label>
                <select
                  id="recording-presets-select"
                  name="recordingPresets"
                  aria-label="Recording Presets"
                  value={recordingPreset}
                  onChange={(e) => {
                    const nextPreset = e.target.value as RecordingPresetId;
                    setRecordingPreset(nextPreset);
                    const targetRate = nextPreset === 'voice-optimized' ? 16000 : 44100;
                    const targetBitRate = (targetRate * 1 * 16) / 1000;
                    if (!isRecording && !audioBlob) {
                      setSessionMetadata((prev) => ({
                        ...prev,
                        sampleRate: targetRate,
                        bitRateKbps: targetBitRate,
                        dataRateKbPerSec: targetBitRate / 8,
                      }));
                    }
                    addLog(
                      'info',
                      `Switched recording preset to: ${
                        nextPreset === 'high-fidelity'
                          ? 'High Fidelity (44.1kHz)'
                          : 'Voice Optimized (16kHz)'
                      }`
                    );
                  }}
                  disabled={isRecording || isProcessing}
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: isRecording || isProcessing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="high-fidelity">High Fidelity (44.1kHz)</option>
                  <option value="voice-optimized">Voice Optimized (16kHz)</option>
                </select>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted)',
                    marginTop: '5px',
                    display: 'block',
                    lineHeight: 1.4,
                  }}
                >
                  {recordingPreset === 'high-fidelity'
                    ? 'High Fidelity: 44.1kHz studio bandwidth for full-spectrum speech & audio.'
                    : 'Voice Optimized: 16kHz bandwidth matching Whisper AI input natively.'}
                </span>
              </div>

              {/* Auto-Pause on 5s Silence Toggle Control */}
              <div style={{ width: '100%', textAlign: 'left' }}>
                <label
                  htmlFor="auto-pause-checkbox"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    id="auto-pause-checkbox"
                    type="checkbox"
                    checked={autoPauseOnSilence}
                    onChange={(e) => setAutoPauseOnSilence(e.target.checked)}
                    disabled={isRecording}
                    style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Timer size={14} color="var(--amber)" aria-hidden="true" />
                    Auto-Pause on 5s Silence (Auto-Resume on Speech)
                  </span>
                </label>
              </div>

              {/* Web Audio API Noise Gate (GainNode) Control Card */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: enableNoiseGate
                    ? isRecording
                      ? isNoiseGateOpen
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid var(--line)'
                    : '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <label
                    htmlFor="boxa-noise-gate-checkbox"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      id="boxa-noise-gate-checkbox"
                      type="checkbox"
                      checked={enableNoiseGate}
                      onChange={(e) => setEnableNoiseGate(e.target.checked)}
                      style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Sliders size={14} color="var(--amber)" aria-hidden="true" />
                      Web Audio Noise Gate (GainNode)
                    </span>
                  </label>

                  {enableNoiseGate && isRecording && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isNoiseGateOpen
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(245, 158, 11, 0.18)',
                        color: isNoiseGateOpen ? 'var(--emerald)' : 'var(--amber)',
                        border: isNoiseGateOpen
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : '1px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      {isNoiseGateOpen ? (
                        <>
                          <Volume2 size={12} />
                          Gate OPEN (Speech)
                        </>
                      ) : (
                        <>
                          <VolumeX size={12} />
                          Gate CLOSED (Muted Noise)
                        </>
                      )}
                    </span>
                  )}
                </div>

                {enableNoiseGate && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      <span>Noise Gate Threshold:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--amber)' }}>
                        {noiseGateThresholdDb} dBFS
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-60}
                      max={-15}
                      step={1}
                      value={noiseGateThresholdDb}
                      onChange={(e) => setNoiseGateThresholdDb(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--amber)', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>

              {/* Input Volume Sensitivity (GainNode) Control Card */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    <Sliders size={14} color="var(--accent)" aria-hidden="true" />
                    Input Volume Sensitivity (Gain)
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      color: 'var(--accent)',
                      background: 'var(--surface-accent)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {inputVolumeSensitivity.toFixed(1)}x ({Math.round(inputVolumeSensitivity * 100)}%)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="range"
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    value={inputVolumeSensitivity}
                    onChange={(e) => setInputVolumeSensitivity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--muted)' }}>
                    <span>0.1x (Quiet)</span>
                    <span>1.0x (Normal)</span>
                    <span>3.0x (Boosted)</span>
                  </div>
                </div>
              </div>

              {/* Live Auto-Pause & Silence Detection Status Banners */}
              {isRecording && isPaused && isAutoPaused && (
                <div
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--amber)',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
                    <span>Auto-Paused: 5s Silence Detected (Listening for sound...)</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: 'var(--card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                    Speak to Resume
                  </span>
                </div>
              )}

              {isRecording && !isPaused && autoPauseOnSilence && silenceDurationSeconds > 0.5 && (
                <div
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: 'var(--amber)',
                  }}
                >
                  <span>Silence detected...</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {silenceDurationSeconds.toFixed(1)}s / 5.0s
                  </span>
                </div>
              )}

              {/* Real-Time Peak Audio Level Meter (Bar Graph) */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: isMonitoring
                    ? '1px solid rgba(56, 189, 248, 0.5)'
                    : isRecording
                    ? isPaused
                      ? '1px solid rgba(245, 158, 11, 0.5)'
                      : '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="var(--accent)" aria-hidden="true" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Peak Audio Level Meter
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                        background:
                          meterSignalStatus === 'clipping'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : meterSignalStatus === 'loud'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : meterSignalStatus === 'optimal'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(148, 163, 184, 0.15)',
                        color:
                          meterSignalStatus === 'clipping'
                            ? 'var(--rose)'
                            : meterSignalStatus === 'loud'
                            ? 'var(--amber)'
                            : meterSignalStatus === 'optimal'
                            ? 'var(--emerald)'
                            : 'var(--muted)',
                      }}
                    >
                      {isRecording
                        ? isPaused
                          ? 'Paused'
                          : meterSignalStatus === 'clipping'
                          ? 'Clipping'
                          : meterSignalStatus === 'loud'
                          ? 'Hot Signal'
                          : meterSignalStatus === 'optimal'
                          ? 'Optimal Signal'
                          : 'Recording'
                        : isMonitoring
                        ? meterSignalStatus === 'optimal'
                          ? 'Live Mic (Good)'
                          : meterSignalStatus === 'low'
                          ? 'Live Mic (Low)'
                          : 'Monitoring Live'
                        : 'Standby'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color:
                          meterPeakDb > -3
                            ? 'var(--rose)'
                            : meterPeakDb > -12
                            ? 'var(--amber)'
                            : meterPeakDb > -40
                            ? 'var(--emerald)'
                            : 'var(--muted)',
                      }}
                    >
                      {meterPeakDb <= -60 ? '-Inf dBFS' : `${meterPeakDb} dBFS`}
                    </span>

                    {!isRecording && (
                      <button
                        type="button"
                        onClick={() => void toggleMonitoring()}
                        disabled={isProcessing}
                        style={{
                          background: isMonitoring ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg)',
                          border: isMonitoring ? '1px solid var(--accent)' : '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: isMonitoring ? 'var(--accent)' : 'var(--text)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                        title={isMonitoring ? 'Stop testing microphone' : 'Test microphone signal strength before recording'}
                      >
                        {isMonitoring ? <MicOff size={11} /> : <Activity size={11} />}
                        {isMonitoring ? 'Stop Test' : 'Test Mic Level'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Level Meter Canvas (Bar Graph + Master Peak Bar) */}
                <canvas
                  ref={peakMeterCanvasRef}
                  width={520}
                  height={80}
                  aria-label="Real-time peak audio level meter and frequency bar graph"
                  style={{
                    width: '100%',
                    height: '70px',
                    display: 'block',
                    borderRadius: '6px',
                    background: '#020617',
                    border: '1px solid var(--line)',
                  }}
                />
              </div>

              {/* Accessible Real-Time Recording Timer */}
              <div
                role="timer"
                aria-live="polite"
                aria-atomic="true"
                aria-label={
                  isRecording
                    ? isPaused
                      ? `Recording paused at ${recordingTimerDisplay.minutes} minutes and ${recordingTimerDisplay.seconds} seconds`
                      : `Live recording in progress: ${recordingTimerDisplay.minutes} minutes and ${recordingTimerDisplay.seconds} seconds`
                    : recordingTime > 0 && audioBlob
                    ? `Recording captured duration: ${recordingTimerDisplay.minutes} minutes and ${recordingTimerDisplay.seconds} seconds`
                    : 'Recording timer ready'
                }
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: isRecording
                    ? isPaused
                      ? '1px solid rgba(245, 158, 11, 0.5)'
                      : '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isRecording
                        ? isPaused
                          ? 'var(--amber)'
                          : 'var(--rose)'
                        : recordingTime > 0 && audioBlob
                        ? 'var(--emerald)'
                        : 'var(--muted)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: isRecording
                        ? isPaused
                          ? 'var(--amber)'
                          : 'var(--rose)'
                        : recordingTime > 0 && audioBlob
                        ? 'var(--emerald)'
                        : 'var(--muted)',
                    }}
                  >
                    <Timer size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                    {isRecording
                      ? isPaused
                        ? 'Recording Paused'
                        : 'Recording in Real Time'
                      : recordingTime > 0 && audioBlob
                      ? 'Recorded Audio Duration'
                      : 'Timer Ready'}
                  </span>
                </div>

                <div style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {recordingTimerDisplay.minutes}:{recordingTimerDisplay.seconds}
                  <span style={{ fontSize: '1.2rem', color: 'var(--muted)', fontWeight: 600 }}>.{recordingTimerDisplay.tenths}</span>
                </div>
              </div>

              {/* Real-Time Recording Session Metadata Panel */}
              <div
                aria-label="Real-time recording session technical metadata"
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  border: isRecording
                    ? isPaused
                      ? '1px solid rgba(245, 158, 11, 0.5)'
                      : '1px solid rgba(56, 189, 248, 0.5)'
                    : '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="var(--accent)" aria-hidden="true" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Recording Session Metadata
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                        background: isRecording
                          ? isPaused
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)'
                          : audioBlob
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: isRecording
                          ? isPaused
                            ? 'var(--amber)'
                            : 'var(--emerald)'
                          : audioBlob
                          ? 'var(--accent)'
                          : 'var(--muted)',
                      }}
                    >
                      {isRecording
                        ? isPaused
                          ? 'Stream Paused'
                          : 'Live Streaming'
                        : audioBlob
                        ? 'Captured Session'
                        : 'Standby'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        color: 'var(--muted)',
                        fontWeight: 600,
                      }}
                    >
                      {sessionMetadata.sampleRate >= 1000
                        ? `${(sessionMetadata.sampleRate / 1000).toFixed(1)} kHz`
                        : `${sessionMetadata.sampleRate} Hz`} • 16-bit PCM
                    </span>
                  </div>
                </div>

                {/* 4-Tile Responsive Metric Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {/* 1. Audio Duration */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--muted)',
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Timer size={11} aria-hidden="true" />
                      <span>Duration</span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-heading)',
                        lineHeight: 1.2,
                      }}
                    >
                      {sessionMetadata.formattedDuration}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {sessionMetadata.totalSamples.toLocaleString()} smp
                    </div>
                  </div>

                  {/* 2. Current Bit Rate */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--muted)',
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Volume2 size={11} aria-hidden="true" />
                      <span>Bit Rate</span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-heading)',
                        lineHeight: 1.2,
                      }}
                    >
                      {sessionMetadata.bitRateKbps.toFixed(1)}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>
                        kbps
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {sessionMetadata.dataRateKbPerSec.toFixed(1)} KB/s
                    </div>
                  </div>

                  {/* 3. File Size */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--muted)',
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <FileAudio size={11} aria-hidden="true" />
                      <span>File Size</span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-heading)',
                        lineHeight: 1.2,
                      }}
                    >
                      {sessionMetadata.formattedFileSize}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {sessionMetadata.fileSizeBytes.toLocaleString()} B
                    </div>
                  </div>

                  {/* 4. Stream & Chunks */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--muted)',
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sliders size={11} aria-hidden="true" />
                      <span>Chunks</span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-heading)',
                        lineHeight: 1.2,
                      }}
                    >
                      {sessionMetadata.chunkCount.toLocaleString()}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>
                        pkts
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      2048 smp/pkt
                    </div>
                  </div>
                </div>

                {/* Compact Format & Status Bar */}
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                    fontSize: '0.70rem',
                    color: 'var(--muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={11} aria-hidden="true" />
                    <span>
                      Format: <strong style={{ color: 'var(--text)' }}>{sessionMetadata.formatName}</strong>
                    </span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>
                    {isRecording
                      ? isPaused
                        ? 'Buffer held in memory (paused)'
                        : 'Processing Web Audio PCM buffers live'
                      : audioBlob
                      ? 'WAV Blob generated & verified'
                      : 'Ready to capture audio stream'}
                  </div>
                </div>
              </div>

              {/* Real-time Oscilloscope Waveform Canvas Section */}
              <div style={{ width: '100%' }}>
                {/* Visualizer Header & Color Settings Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} color="var(--accent)" aria-hidden="true" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Oscilloscope Waveform Visualizer
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: 'var(--surface-accent)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                      }}
                    >
                      {WAVEFORM_THEMES.find((t) => t.id === waveformTheme)?.label || 'Custom'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => void handleExportWaveformSvg()}
                      disabled={isExportingSvg}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '3px 9px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        cursor: isExportingSvg ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Export high-resolution vector SVG waveform image file"
                    >
                      {isExportingSvg ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileImage size={12} />
                      )}
                      <span>Export Waveform (SVG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVisualizerSettings(!showVisualizerSettings)}
                      style={{
                        background: showVisualizerSettings ? 'var(--surface-accent)' : 'var(--card)',
                        border: showVisualizerSettings ? '1px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '3px 9px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: showVisualizerSettings ? 'var(--accent)' : 'var(--text)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Customize waveform visualizer gradient colors"
                    >
                      <Palette size={12} />
                      <span>Waveform Colors</span>
                    </button>
                  </div>
                </div>

                {/* Expandable Visualizer Color Settings Panel */}
                {showVisualizerSettings && (
                  <div
                    style={{
                      width: '100%',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      marginBottom: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Palette size={14} color="var(--accent)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          Waveform Visualizer Style &amp; Colors
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVisualizerSettings(false)}
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Close color settings"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Visualizer Style Selector */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                        Visualizer Style Mode:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                        {VISUALIZER_STYLES.map((st) => {
                          const isStyleSelected = visualizerStyle === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setVisualizerStyle(st.id)}
                              style={{
                                background: isStyleSelected ? 'var(--surface-accent)' : 'var(--bg)',
                                border: isStyleSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                              }}
                            >
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isStyleSelected ? 'var(--accent)' : 'var(--text)' }}>
                                {st.label}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--muted)', lineHeight: 1.2 }}>
                                {st.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
                      <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                        Gradient Theme:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                        {WAVEFORM_THEMES.map((theme) => {
                          const isSelected = waveformTheme === theme.id;
                          const previewStart = theme.id === 'custom' ? customStartColor : theme.startColor;
                          const previewEnd = theme.id === 'custom' ? customEndColor : theme.endColor;

                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => setWaveformTheme(theme.id)}
                              style={{
                                background: isSelected ? 'var(--surface-accent)' : 'var(--bg)',
                                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                                  {theme.label.split(' ')[0]} {theme.label.split(' ')[1] || ''}
                                </span>
                                <div
                                  style={{
                                    width: '20px',
                                    height: '10px',
                                    borderRadius: '3px',
                                    background: `linear-gradient(90deg, ${previewStart}, ${previewEnd})`,
                                    border: '1px solid rgba(255,255,255,0.25)',
                                    boxShadow: `0 0 4px ${previewStart}`,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.2 }}>
                                {theme.id === 'custom' ? 'Custom Pickers' : theme.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Dual-Color HEX Pickers */}
                    {waveformTheme === 'custom' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label
                            htmlFor="custom-start-color"
                            style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}
                          >
                            Waveform Color:
                          </label>
                          <input
                            id="custom-start-color"
                            type="color"
                            value={customStartColor}
                            onChange={(e) => setCustomStartColor(e.target.value)}
                            style={{
                              width: '32px',
                              height: '28px',
                              padding: '0',
                              border: '1px solid var(--line)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: 'none',
                            }}
                          />
                          <input
                            type="text"
                            value={customStartColor}
                            onChange={(e) => setCustomStartColor(e.target.value)}
                            style={{
                              width: '75px',
                              fontSize: '0.76rem',
                              fontFamily: 'monospace',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg)',
                              color: 'var(--text)',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label
                            htmlFor="custom-end-color"
                            style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}
                          >
                            Glow / Aura Color:
                          </label>
                          <input
                            id="custom-end-color"
                            type="color"
                            value={customEndColor}
                            onChange={(e) => setCustomEndColor(e.target.value)}
                            style={{
                              width: '32px',
                              height: '28px',
                              padding: '0',
                              border: '1px solid var(--line)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: 'none',
                            }}
                          />
                          <input
                            type="text"
                            value={customEndColor}
                            onChange={(e) => setCustomEndColor(e.target.value)}
                            style={{
                              width: '75px',
                              fontSize: '0.76rem',
                              fontFamily: 'monospace',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--line)',
                              background: 'var(--bg)',
                              color: 'var(--text)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visualizer Canvas Box */}
                <div
                  style={{
                    width: '100%',
                    background: '#020617',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <canvas
                    ref={waveformCanvasRef}
                    width={520}
                    height={90}
                    aria-label="Real-time audio recording waveform visualizer"
                    style={{ width: '100%', height: '80px', display: 'block', borderRadius: '6px' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '14px',
                      pointerEvents: 'none',
                      background: 'rgba(2, 6, 23, 0.82)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      color: isRecording ? (isPaused ? '#fde68a' : '#fecaca') : '#cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isRecording ? (isPaused ? '#fbbf24' : '#ef4444') : '#38bdf8',
                      }}
                    />
                    <span>
                      {isRecording
                        ? isPaused
                          ? `Paused: ${formatDurationDisplay(recordingTime)}`
                          : `Duration: ${formatDurationDisplay(recordingTime)}`
                        : verifiedDurationSeconds !== null && verifiedDurationSeconds > 0
                        ? `Captured: ${formatDurationDisplay(verifiedDurationSeconds)}`
                        : 'Duration: 0:00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mic Action Buttons */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessing || isRequestingMic}
                  className="button button-primary"
                  style={{
                    width: '100%',
                    padding: '11px 20px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isRequestingMic ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Requesting Mic Permission...
                    </>
                  ) : (
                    <>
                      <Mic size={16} />
                      Record Voice Note
                    </>
                  )}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => void handlePauseResumeRecording()}
                    style={{
                      flex: 1,
                      background: isPaused ? 'var(--emerald)' : 'var(--amber)',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: isPaused ? '0 0 12px rgba(16, 185, 129, 0.4)' : '0 0 12px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    {isPaused ? (
                      <>
                        <Play size={15} fill="currentColor" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause size={15} fill="currentColor" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void stopRecording()}
                    style={{
                      flex: 1,
                      background: 'var(--rose)',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 0 18px rgba(239, 68, 68, 0.7)',
                      animation: 'pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  >
                    <Square size={15} fill="currentColor" />
                    Stop ({formatDurationDisplay(recordingTime)})
                  </button>
                </div>
              )}
            </div>

            {/* Box B: File Upload */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--emerald)',
                }}
              >
                <Upload size={26} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Upload Audio File
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', maxWidth: '280px' }}>
                  Supports WAV, MP3, M4A, WebM, OGG, AAC &amp; FLAC files (Up to 20 MB).
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                onChange={(e) => void handleFileUpload(e)}
                style={{ display: 'none' }}
                id="audio-upload-input"
              />
              <label
                htmlFor="audio-upload-input"
                className="button button-secondary"
                style={{
                  padding: '11px 22px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  cursor: isRecording || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isRecording || isProcessing ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileAudio size={16} color="var(--emerald)" />
                Choose Audio File
              </label>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                Decoded locally via Web Audio API. Never leaves your device.
              </span>
            </div>
          </div>

          {/* Active Audio Preview, Scrubber & Action Bar */}
          {verifiedAudioElementSrc && (
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                padding: '20px',
                marginTop: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <FileAudio size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {audioFileName || 'Audio Source'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                      {verifiedDurationSeconds !== null && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600 }}>
                          Duration: {formatDurationDisplay(verifiedDurationSeconds)}
                        </span>
                      )}
                      {wavValidation?.valid && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--emerald)' }}>
                          · {wavValidation.sampleRate} Hz ({wavValidation.sampleRate === 16000 ? 'Voice Optimized' : wavValidation.sampleRate === 44100 ? 'High Fidelity' : 'Custom'}) · {wavValidation.numChannels}ch PCM WAV
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleToggleAudioEditor}
                    disabled={isProcessing}
                    style={{
                      background: showAudioEditor ? 'var(--surface-accent)' : 'transparent',
                      border: showAudioEditor ? '1px solid var(--accent)' : '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: showAudioEditor ? 'var(--accent)' : 'var(--text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Set start and end timestamps to trim audio segment"
                  >
                    <Scissors size={13} color="var(--accent)" />
                    {showAudioEditor ? 'Close Audio Editor' : 'Edit / Trim Audio'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePlayViaWebAudio()}
                    disabled={isProcessing}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Play decoded audio directly from buffer"
                  >
                    <Play size={13} color="var(--emerald)" />
                    {isWebAudioPlaying ? 'Stop Playback' : 'Play via Web Audio'}
                  </button>

                  <button
                    type="button"
                    onClick={clearAudio}
                    disabled={isProcessing}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      color: 'var(--rose)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Remove Audio"
                  >
                    <Trash2 size={13} />
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleTranscribe()}
                    disabled={isProcessing}
                    style={{
                      background: 'linear-gradient(90deg, var(--accent), var(--indigo))',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '8px',
                      padding: '8px 18px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        {processingStatus}
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Transcribe &amp; Summarize
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Edit & Trim Audio Panel */}
              {showAudioEditor && verifiedAudioElementSrc && (
                <div
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--accent)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Scissors size={18} color="var(--accent)" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          Edit &amp; Trim Audio Segment
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          Set start and end timestamps to slice your audio before transcribing or downloading.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAudioEditor(false)}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Start / End Slider Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    {/* Start Time Input */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <label
                        htmlFor="trim-start-time"
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}
                      >
                        <span>Start Time:</span>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                          {formatRecordingTimerOverlay(trimStartSeconds)} ({trimStartSeconds.toFixed(1)}s)
                        </strong>
                      </label>
                      <input
                        id="trim-start-time"
                        type="range"
                        min={0}
                        max={Math.max(0, trimEndSeconds - 0.1)}
                        step={0.1}
                        value={trimStartSeconds}
                        onChange={(e) => setTrimStartSeconds(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={Math.max(0, trimEndSeconds - 0.1)}
                          step={0.1}
                          value={trimStartSeconds}
                          onChange={(e) => setTrimStartSeconds(Math.max(0, Math.min(Number(e.target.value), trimEndSeconds - 0.1)))}
                          style={{ width: '80px', padding: '3px 6px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontFamily: 'monospace' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>sec</span>
                      </div>
                    </div>

                    {/* End Time Input */}
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                      <label
                        htmlFor="trim-end-time"
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}
                      >
                        <span>End Time:</span>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                          {formatRecordingTimerOverlay(trimEndSeconds)} ({trimEndSeconds.toFixed(1)}s)
                        </strong>
                      </label>
                      <input
                        id="trim-end-time"
                        type="range"
                        min={Math.min(trimStartSeconds + 0.1, (verifiedDurationSeconds || 1))}
                        max={verifiedDurationSeconds || 10}
                        step={0.1}
                        value={trimEndSeconds}
                        onChange={(e) => setTrimEndSeconds(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min={trimStartSeconds + 0.1}
                          max={verifiedDurationSeconds || 10}
                          step={0.1}
                          value={trimEndSeconds}
                          onChange={(e) => setTrimEndSeconds(Math.max(trimStartSeconds + 0.1, Math.min(Number(e.target.value), verifiedDurationSeconds || 10)))}
                          style={{ width: '80px', padding: '3px 6px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)', fontFamily: 'monospace' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>sec</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline Selection Bar */}
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Selected Window Duration:</span>
                      <strong style={{ color: 'var(--emerald)', fontFamily: 'monospace' }}>
                        {formatDurationDisplay(Math.max(0, trimEndSeconds - trimStartSeconds))} ({(Math.max(0, trimEndSeconds - trimStartSeconds)).toFixed(1)}s)
                      </strong>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'var(--line)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                      {verifiedDurationSeconds && verifiedDurationSeconds > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(trimStartSeconds / verifiedDurationSeconds) * 100}%`,
                            width: `${((trimEndSeconds - trimStartSeconds) / verifiedDurationSeconds) * 100}%`,
                            top: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, var(--emerald), var(--accent))',
                            borderRadius: '3px',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 600 }}>Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(Math.min(5, dur));
                      }}
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      First 5s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(Math.min(10, dur));
                      }}
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      First 10s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(dur * 0.25);
                        setTrimEndSeconds(dur * 0.75);
                      }}
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      Middle 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(dur);
                      }}
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      Reset Full Range
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={handlePreviewTrim}
                      style={{
                        background: isPreviewingTrim ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg)',
                        border: isPreviewingTrim ? '1px solid var(--amber)' : '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: isPreviewingTrim ? 'var(--amber)' : 'var(--text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isPreviewingTrim ? <Pause size={14} /> : <Play size={14} color="var(--amber)" />}
                      {isPreviewingTrim ? 'Pause Preview' : 'Preview Trimmed Segment'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleApplyTrim()}
                      disabled={isTrimming}
                      style={{
                        background: 'linear-gradient(90deg, var(--emerald), #059669)',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: '8px',
                        padding: '8px 18px',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: isTrimming ? 'not-allowed' : 'pointer',
                        opacity: isTrimming ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {isTrimming ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Trimming Audio...
                        </>
                      ) : (
                        <>
                          <Scissors size={15} />
                          Apply Trim &amp; Save Audio
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Static Audio Waveform Envelope (Full Navigation) */}
              {staticWaveformBars.length > 0 && (
                <div
                  style={{
                    background: '#020617',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, clickX / rect.width));
                    const targetTime = pct * (scrubberMaxDuration || 1);
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.currentTime = targetTime;
                      setPlaybackCurrentTime(targetTime);
                    }
                  }}
                  title="Click anywhere on waveform to seek audio position"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} color="var(--accent)" />
                      Full Audio Amplitude Envelope (Click to Navigate)
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>
                      {formatDurationDisplay(playbackCurrentTime)} / {formatDurationDisplay(scrubberMaxDuration)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', height: '44px', gap: '2px', position: 'relative' }}>
                    {staticWaveformBars.map((val, idx) => {
                      const barProgress = idx / staticWaveformBars.length;
                      const currentProgress = scrubberMaxDuration > 0 ? playbackCurrentTime / scrubberMaxDuration : 0;
                      const isPlayed = barProgress <= currentProgress;
                      const barH = Math.max(3, val * 38);

                      return (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            height: `${barH}px`,
                            borderRadius: '2px',
                            background: isPlayed
                              ? 'linear-gradient(180deg, var(--accent), var(--indigo))'
                              : 'rgba(100, 116, 139, 0.35)',
                            transition: 'background 0.1s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Native audio element */}
              <audio
                ref={audioPlayerRef}
                src={verifiedAudioElementSrc}
                controls
                preload="auto"
                onLoadStart={(e) => handleAudioElementEvent('loadstart', e)}
                onLoadedMetadata={(e) => handleAudioElementEvent('loadedmetadata', e)}
                onLoadedData={(e) => handleAudioElementEvent('loadeddata', e)}
                onDurationChange={(e) => handleAudioElementEvent('durationchange', e)}
                onCanPlay={(e) => handleAudioElementEvent('canplay', e)}
                onCanPlayThrough={(e) => handleAudioElementEvent('canplaythrough', e)}
                onTimeUpdate={(e) => handleAudioElementEvent('timeupdate', e)}
                onSeeking={(e) => handleAudioElementEvent('seeking', e)}
                onSeeked={(e) => handleAudioElementEvent('seeked', e)}
                onPlay={(e) => handleAudioElementEvent('play', e)}
                onPlaying={(e) => handleAudioElementEvent('playing', e)}
                onPause={(e) => handleAudioElementEvent('pause', e)}
                onStalled={(e) => handleAudioElementEvent('stalled', e)}
                onSuspend={(e) => handleAudioElementEvent('suspend', e)}
                onWaiting={(e) => handleAudioElementEvent('waiting', e)}
                onEmptied={(e) => handleAudioElementEvent('emptied', e)}
                onEnded={(e) => handleAudioElementEvent('ended', e)}
                onError={(e) => handleAudioElementEvent('error', e)}
                style={{ width: '100%', height: '36px', marginBottom: '10px' }}
              />

              {/* HTML5 Range Scrubber & Speed Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                }}
              >
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDurationDisplay(playbackCurrentTime)}
                </span>
                <input
                  type="range"
                  aria-label="Seek audio playback position"
                  min={0}
                  max={scrubberMaxDuration > 0 ? scrubberMaxDuration : 1}
                  step={0.05}
                  value={scrubberMaxDuration > 0 ? Math.min(playbackCurrentTime, scrubberMaxDuration) : 0}
                  disabled={scrubberMaxDuration <= 0}
                  onChange={handleAudioScrub}
                  style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDurationDisplay(scrubberMaxDuration)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--line)', paddingLeft: '10px' }}>
                  <label htmlFor="playback-rate-select" style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                    Speed
                  </label>
                  <select
                    id="playback-rate-select"
                    value={playbackRate}
                    onChange={handlePlaybackRateChange}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                    }}
                  >
                    {PLAYBACK_SPEED_OPTIONS.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}x
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model Download Progress Bar */}
              {isProcessing && modelLoadProgress !== null && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text)' }}>{processingStatus}</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{modelLoadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'var(--line)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${modelLoadProgress}%`,
                        background: 'linear-gradient(90deg, var(--accent), var(--indigo))',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contextual Error Notice */}
          {errorMsg && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid var(--rose)',
                color: 'var(--rose)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1, fontSize: '0.88rem' }}>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>
                    {errorCategory === 'mic'
                      ? 'Microphone Access Alert'
                      : errorCategory === 'playback'
                      ? 'Audio Playback Notice'
                      : errorCategory === 'model'
                      ? 'AI Model Loading Alert'
                      : 'Audio Processing Alert'}
                  </strong>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Panel 3: Live Real-Time Transcription Stream (During Processing) */}
        {isProcessing && (
          <section
            className="panel"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--accent)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 4px 20px -2px rgba(56, 189, 248, 0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Transcribing Speech in Real-Time
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAutoScrollEnabled((prev) => {
                    const next = !prev;
                    if (next && transcriptScrollRef.current) {
                      transcriptScrollRef.current.scrollTo({
                        top: transcriptScrollRef.current.scrollHeight,
                        behavior: 'smooth',
                      });
                    }
                    return next;
                  });
                }}
                style={{
                  background: isAutoScrollEnabled ? 'var(--surface-accent)' : 'var(--bg)',
                  border: isAutoScrollEnabled ? '1px solid var(--accent)' : '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: isAutoScrollEnabled ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ChevronsDown size={14} />
                {isAutoScrollEnabled ? 'Auto-Scroll ON' : 'Auto-Scroll OFF'}
              </button>
            </div>

            {/* Live Real-time Keyword Search Bar */}
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Filter or search keywords live as transcription streams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 30px 6px 30px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: searchQuery.trim() ? '1px solid var(--accent)' : '1px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 0,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Clear search query"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: countKeywordMatches(liveTranscript, searchQuery) > 0 ? 'rgba(250, 204, 21, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                    color: countKeywordMatches(liveTranscript, searchQuery) > 0 ? 'var(--amber)' : 'var(--muted)',
                  }}
                >
                  {countKeywordMatches(liveTranscript, searchQuery)} matches
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div
                ref={transcriptScrollRef}
                onScroll={handleTranscriptScroll}
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {liveTranscript ? (
                  <>
                    {highlightMatchingText(liveTranscript, searchQuery)}
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '14px',
                        marginLeft: '4px',
                        background: 'var(--accent)',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                  </>
                ) : (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                    Analyzing audio frames and transcribing speech in real-time...
                  </div>
                )}
                <div ref={transcriptBottomRef} style={{ height: 0 }} />
              </div>

              {isUserScrolledUp && liveTranscript && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '16px',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ArrowDown size={13} />
                  Jump to latest lines
                </button>
              )}
            </div>

            {/* Live Real-Time Word & Character Count Indicator */}
            {(() => {
              const clean = (liveTranscript || '').trim();
              const chars = clean.length;
              const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
              const sentences = clean ? clean.split(/(?<=[.!?।۔。])\s+/).filter(Boolean).length : 0;

              return (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlignLeft size={12} color="var(--accent)" />
                      <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                        {words.toLocaleString()}
                      </strong>{' '}
                      {words === 1 ? 'word' : 'words'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} color="var(--emerald)" />
                      <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                        {chars.toLocaleString()}
                      </strong>{' '}
                      characters
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ListChecks size={12} color="var(--amber)" />
                      <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                        {sentences.toLocaleString()}
                      </strong>{' '}
                      {sentences === 1 ? 'sentence' : 'sentences'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600 }}>
                    Transcribing Live...
                  </span>
                </div>
              );
            })()}
          </section>
        )}

        {/* Panel 4: Results & Insights Workspace (when ready) */}
        {result && (
          <section
            aria-label="Transcription Results"
            className="panel results-panel transcription-results-section"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 6px 24px -4px rgba(0,0,0,0.06)',
            }}
          >
            {/* Print-Only Professional Document Header (A4 / Letter Clean Documentation) */}
            <div className="print-only" style={{ marginBottom: '18pt', borderBottom: '2px solid #0f172a', paddingBottom: '12pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700, marginBottom: '3pt' }}>
                    Voice Recording &amp; AI Intelligence Report
                  </div>
                  <h1 style={{ fontSize: '18pt', fontWeight: 800, margin: '0 0 4pt', color: '#0f172a' }}>
                    {metaProject.trim() || 'Audio Transcription Session'}
                  </h1>
                  <p style={{ margin: 0, fontSize: '9pt', color: '#475569' }}>
                    Category: <strong>{metaCategory}</strong> • Spoken Language: <strong>{selectedLanguage.toUpperCase()}</strong> • Summarizer: <strong>{aiProvider === 'ollama' ? `Local Ollama (${ollamaModelName})` : 'Gemini AI'}</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#64748b', flexShrink: 0 }}>
                  <div><strong>Session Date:</strong> {metaDate || new Date().toISOString().split('T')[0]}</div>
                  <div><strong>Audio Duration:</strong> {sessionMetadata.formattedDuration || formatDurationDisplay(verifiedDurationSeconds || 0)}</div>
                  <div><strong>Word Count:</strong> {(result.transcript ? result.transcript.split(/\s+/).filter(Boolean).length : 0).toLocaleString()} words ({(result.transcript || '').length.toLocaleString()} chars)</div>
                  {customTags.length > 0 && (
                    <div style={{ marginTop: '2pt' }}><strong>Tags:</strong> #{customTags.join(' #')}</div>
                  )}
                </div>
              </div>
            </div>

            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '16px',
                marginBottom: '20px',
              }}
            >
              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  style={{
                    background: activeTab === 'all' ? 'var(--surface-accent)' : 'var(--bg)',
                    border: activeTab === 'all' ? '1px solid var(--accent)' : '1px solid var(--line)',
                    color: activeTab === 'all' ? 'var(--accent)' : 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: activeTab === 'all' ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  All Insights
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  style={{
                    background: activeTab === 'summary' ? 'var(--surface-accent)' : 'var(--bg)',
                    border: activeTab === 'summary' ? '1px solid var(--accent)' : '1px solid var(--line)',
                    color: activeTab === 'summary' ? 'var(--accent)' : 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: activeTab === 'summary' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <FileText size={14} />
                  Executive Summary
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  style={{
                    background: activeTab === 'actions' ? 'var(--surface-accent)' : 'var(--bg)',
                    border: activeTab === 'actions' ? '1px solid var(--accent)' : '1px solid var(--line)',
                    color: activeTab === 'actions' ? 'var(--accent)' : 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: activeTab === 'actions' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <ListChecks size={14} />
                  Action Items ({result.actionItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transcript')}
                  style={{
                    background: activeTab === 'transcript' ? 'var(--surface-accent)' : 'var(--bg)',
                    border: activeTab === 'transcript' ? '1px solid var(--accent)' : '1px solid var(--line)',
                    color: activeTab === 'transcript' ? 'var(--accent)' : 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: activeTab === 'transcript' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <AlignLeft size={14} />
                  Verbatim Transcript
                </button>
              </div>

              {/* Export Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void handleSummarizeWithLlm()}
                  disabled={isSummarizingLlm}
                  style={{
                    background: 'linear-gradient(90deg, var(--accent), var(--indigo))',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: '8px',
                    padding: '7px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSummarizingLlm ? 'not-allowed' : 'pointer',
                    opacity: isSummarizingLlm ? 0.75 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)',
                  }}
                  title={
                    aiProvider === 'ollama'
                      ? 'Extract executive summary, action items & IT support log notes using local Ollama (100% free & private)'
                      : 'Extract concise executive summary, action items & IT support log notes using Gemini 3.8 Flash'
                  }
                >
                  {isSummarizingLlm ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {aiProvider === 'ollama' ? 'Summarizing with Ollama...' : 'Summarizing with Gemini...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      {aiProvider === 'ollama' ? 'Summarize Transcript (Local Ollama)' : 'Summarize Transcript (Gemini AI)'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTranscript}
                  style={{
                    background: 'var(--surface-accent)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={14} />
                  Save Transcript (.txt)
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(239, 68, 68, 0.18))',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#f43f5e',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(244, 63, 94, 0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Download or Print clean, formatted PDF report via browser print dialog"
                >
                  <Printer size={14} />
                  Download as PDF
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={14} color="var(--accent)" />
                  Export Full Summary
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAudioEditor(true);
                    if (verifiedDurationSeconds && verifiedDurationSeconds > 0) {
                      setTrimStartSeconds(0);
                      setTrimEndSeconds(verifiedDurationSeconds);
                    }
                  }}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Trim start and end timestamps to generate a new cropped audio clip"
                >
                  <Scissors size={14} />
                  Trim Audio Clip
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      transcriptViewMode === 'speaker' && result.formattedSpeakerTranscript
                        ? result.formattedSpeakerTranscript
                        : showLineTimestamps
                        ? buildTimestampedTranscriptText(
                            result.transcript,
                            sessionMetadata.durationSeconds || verifiedDurationSeconds,
                            result.speakerTurns
                          )
                        : result.transcript,
                      'results-transcript'
                    )
                  }
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Copy full generated transcript text to clipboard"
                >
                  {copiedSection === 'results-transcript' ? (
                    <>
                      <Check size={14} color="var(--emerald)" />
                      <span style={{ color: 'var(--emerald)' }}>Copied Transcript!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} color="var(--accent)" />
                      Copy Transcript
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void handleWebShare()}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Share transcript text or audio file via Web Share API"
                >
                  <Share2 size={14} color="var(--accent)" />
                  Share Transcript
                </button>

                <button
                  type="button"
                  onClick={() => void handleExportWaveformSvg()}
                  disabled={isExportingSvg}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isExportingSvg ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Export high-resolution vector SVG waveform pattern image"
                >
                  {isExportingSvg ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileImage size={14} color="var(--emerald)" />
                  )}
                  Export Waveform (SVG)
                </button>
              </div>
            </div>

            {/* Results Panel: Dedicated Trim Audio & Download Cropped Clip Card */}
            {showAudioEditor && (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scissors size={18} color="var(--accent)" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                        Results Panel: Trim Audio &amp; Export Cropped Clip
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Select precise start and end timestamps to slice the recorded session and generate a downloadable cropped audio URL.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAudioEditor(false)}
                    style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Start Time Input */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px' }}>
                    <label htmlFor="results-trim-start" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                      <span>Start Timestamp:</span>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {formatRecordingTimerOverlay(trimStartSeconds)} ({trimStartSeconds.toFixed(1)}s)
                      </strong>
                    </label>
                    <input
                      id="results-trim-start"
                      type="range"
                      min={0}
                      max={Math.max(0, trimEndSeconds - 0.1)}
                      step={0.1}
                      value={trimStartSeconds}
                      onChange={(e) => setTrimStartSeconds(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, trimEndSeconds - 0.1)}
                        step={0.1}
                        value={trimStartSeconds}
                        onChange={(e) => setTrimStartSeconds(Math.max(0, Math.min(Number(e.target.value), trimEndSeconds - 0.1)))}
                        style={{ width: '84px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'monospace' }}
                      />
                      <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>sec</span>
                    </div>
                  </div>

                  {/* End Time Input */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px' }}>
                    <label htmlFor="results-trim-end" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                      <span>End Timestamp:</span>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {formatRecordingTimerOverlay(trimEndSeconds)} ({trimEndSeconds.toFixed(1)}s)
                      </strong>
                    </label>
                    <input
                      id="results-trim-end"
                      type="range"
                      min={Math.min(trimStartSeconds + 0.1, (verifiedDurationSeconds || 1))}
                      max={verifiedDurationSeconds || 10}
                      step={0.1}
                      value={trimEndSeconds}
                      onChange={(e) => setTrimEndSeconds(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min={trimStartSeconds + 0.1}
                        max={verifiedDurationSeconds || 10}
                        step={0.1}
                        value={trimEndSeconds}
                        onChange={(e) => setTrimEndSeconds(Math.max(trimStartSeconds + 0.1, Math.min(Number(e.target.value), verifiedDurationSeconds || 10)))}
                        style={{ width: '84px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'monospace' }}
                      />
                      <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>sec</span>
                    </div>
                  </div>
                </div>

                {/* Visual Timeline Selection Bar */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px' }}>
                    <span>Cropped Window Duration:</span>
                    <strong style={{ color: 'var(--emerald)', fontFamily: 'monospace' }}>
                      {formatDurationDisplay(Math.max(0, trimEndSeconds - trimStartSeconds))} ({(Math.max(0, trimEndSeconds - trimStartSeconds)).toFixed(1)}s)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--line)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    {verifiedDurationSeconds && verifiedDurationSeconds > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(trimStartSeconds / verifiedDurationSeconds) * 100}%`,
                          width: `${((trimEndSeconds - trimStartSeconds) / verifiedDurationSeconds) * 100}%`,
                          top: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, var(--emerald), var(--accent))',
                          borderRadius: '3px',
                          boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Quick Presets & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 600 }}>Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(Math.min(5, dur));
                      }}
                      style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      First 5s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(Math.min(15, dur));
                      }}
                      style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      First 15s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dur = verifiedDurationSeconds || 10;
                        setTrimStartSeconds(0);
                        setTrimEndSeconds(dur);
                      }}
                      style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                    >
                      Reset Full
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handlePreviewTrim}
                      style={{
                        background: isPreviewingTrim ? 'rgba(245, 158, 11, 0.15)' : 'var(--card)',
                        border: isPreviewingTrim ? '1px solid var(--amber)' : '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: isPreviewingTrim ? 'var(--amber)' : 'var(--text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isPreviewingTrim ? <Pause size={13} /> : <Play size={13} color="var(--amber)" />}
                      {isPreviewingTrim ? 'Pause Preview' : 'Preview Segment'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleApplyTrim()}
                      disabled={isTrimming}
                      style={{
                        background: 'linear-gradient(90deg, var(--emerald), #059669)',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: isTrimming ? 'not-allowed' : 'pointer',
                        opacity: isTrimming ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {isTrimming ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Trimming &amp; Generating URL...
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          Generate &amp; Download Cropped Audio
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Session Metadata & Tags Editor Card */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--accent)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(56, 189, 248, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tags size={18} color="var(--accent)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Session Metadata &amp; Tags
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Attach project labels, categories, and custom tags to embed in exported transcript files.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMetadataEditor((prev) => !prev)}
                  style={{
                    background: showMetadataEditor ? 'var(--surface-accent)' : 'var(--card)',
                    border: showMetadataEditor ? '1px solid var(--accent)' : '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: showMetadataEditor ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={13} />
                  {showMetadataEditor ? 'Minimize Metadata Editor' : 'Edit Metadata & Tags'}
                </button>
              </div>

              {/* Active Metadata Badges Summary */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: showMetadataEditor ? '14px' : '0' }}>
                {metaProject.trim() && (
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Folder size={12} /> Project: {metaProject.trim()}
                  </span>
                )}
                {metaCategory.trim() && (
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={12} /> Category: {metaCategory.trim()}
                  </span>
                )}
                {metaDate && (
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Date: {metaDate}
                  </span>
                )}
                {customTags.map((t) => (
                  <span key={t} style={{ fontSize: '0.76rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    #{t}
                  </span>
                ))}
              </div>

              {/* Metadata Editor Form Fields */}
              {showMetadataEditor && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {/* Project Input */}
                    <div>
                      <label htmlFor="meta-project-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        Project Name
                      </label>
                      <input
                        id="meta-project-input"
                        type="text"
                        placeholder="e.g. Q4 Infrastructure Audit"
                        value={metaProject}
                        onChange={(e) => setMetaProject(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                      />
                    </div>

                    {/* Category Select */}
                    <div>
                      <label htmlFor="meta-category-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        Category
                      </label>
                      <select
                        id="meta-category-select"
                        value={metaCategory}
                        onChange={(e) => setMetaCategory(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                      >
                        <option value="General">General Voice Note</option>
                        <option value="Meeting">Meeting / Standup</option>
                        <option value="Field Note">IT Field Note</option>
                        <option value="Interview">Interview / Discussion</option>
                        <option value="Support Ticket">Support Ticket Notes</option>
                        <option value="Troubleshooting">Troubleshooting Session</option>
                        <option value="Podcast / Media">Podcast / Media Audio</option>
                      </select>
                    </div>

                    {/* Date Input */}
                    <div>
                      <label htmlFor="meta-date-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        Session Date
                      </label>
                      <input
                        id="meta-date-input"
                        type="date"
                        value={metaDate}
                        onChange={(e) => setMetaDate(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                      />
                    </div>
                  </div>

                  {/* Tags Manager */}
                  <div>
                    <label htmlFor="meta-tag-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                      Custom Tags
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '220px' }}>
                        <input
                          id="meta-tag-input"
                          type="text"
                          placeholder="Type tag name and press Enter (e.g. Follow-Up)..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.84rem', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--text)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTag()}
                          style={{ background: 'var(--accent)', color: '#ffffff', border: 0, borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Add Tag
                        </button>
                      </div>

                      {/* Quick Tag Presets */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600 }}>Presets:</span>
                        {['High Priority', 'Follow-Up', 'Internal', 'Client Review', 'Audit'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAddTag(preset)}
                            style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tag Chips */}
                    {customTags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {customTags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: 'var(--card)',
                              border: '1px solid var(--accent)',
                              color: 'var(--accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title={`Remove ${tag} tag`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ollama Connection & API Error Notice within Results Panel with Retry Button */}
            {ollamaError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '260px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#ef4444', display: 'block', marginBottom: '3px' }}>
                      Ollama API Connection Failed
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.5 }}>
                      {ollamaError}
                    </p>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      Tip: If running Ollama on localhost, ensure CORS is enabled with{' '}
                      <code style={{ background: 'var(--card)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--line)', fontFamily: 'monospace' }}>
                        OLLAMA_ORIGINS="*"
                      </code>{' '}
                      before starting the Ollama service.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => void checkOllamaStatus()}
                    disabled={isRetryingOllama}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: isRetryingOllama ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                    }}
                    title="Retry connection health check to local Ollama API"
                  >
                    {isRetryingOllama ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    {isRetryingOllama ? 'Retrying...' : 'Retry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiSettingsModalTab('provider');
                      setShowAiSettingsModal(true);
                    }}
                    style={{
                      background: 'var(--card)',
                      color: 'var(--text)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Open Ollama API settings and configuration modal"
                  >
                    <Settings size={13} />
                    <span>Configure</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOllamaError(null)}
                    style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
                    title="Dismiss notice"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Contextual LLM Summary Error Notice (for non-Ollama errors) */}
            {llmSummaryError && !ollamaError && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid var(--rose)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  color: 'var(--rose)',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{llmSummaryError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLlmSummaryError(null)}
                  style={{ background: 'transparent', border: 0, color: 'var(--rose)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Executive Summary Card */}
            {(activeTab === 'all' || activeTab === 'summary') && (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} />
                    Executive Summary
                  </h3>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {result.isLlmGenerated && (
                      <span
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Sparkles size={11} /> Gemini 3.8 Flash AI Summary
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleSummarizeWithLlm()}
                      disabled={isSummarizingLlm}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--accent)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        cursor: isSummarizingLlm ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Extract AI summary & IT support log notes using Gemini LLM"
                    >
                      {isSummarizingLlm ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {result.isLlmGenerated
                        ? aiProvider === 'ollama' ? 'Re-summarize with Ollama' : 'Re-summarize with AI'
                        : aiProvider === 'ollama' ? 'Summarize with Ollama' : 'Summarize with Gemini AI'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddCurrentTranscriptToBatch}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Add this transcript to the sequential local Ollama batch queue"
                    >
                      <Layers size={12} color="var(--accent)" />
                      Add to Batch Queue
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(result.summary, 'summary')}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {copiedSection === 'summary' ? (
                        <>
                          <Check size={12} color="var(--emerald)" />
                          <span style={{ color: 'var(--emerald)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                  {result.summary}
                </p>
              </div>
            )}

            {/* Formatted IT Support Log (ServiceNow / Jira Note) Card */}
            {result.itLogEntry && (activeTab === 'all' || activeTab === 'summary' || activeTab === 'actions') && (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--emerald)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '18px',
                  boxShadow: '0 2px 12px rgba(16, 185, 129, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Terminal size={16} />
                    Formatted IT Support Log Note (ServiceNow / Jira)
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.itLogEntry || '', 'itLog')}
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid var(--emerald)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--emerald)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedSection === 'itLog' ? (
                      <>
                        <Check size={12} color="var(--emerald)" />
                        <span style={{ color: 'var(--emerald)' }}>Copied Log Note</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy IT Support Log
                      </>
                    )}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: '0.86rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  {result.itLogEntry}
                </pre>
              </div>
            )}

            {/* Action Items Card */}
            {(activeTab === 'all' || activeTab === 'actions') && (
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ListChecks size={16} />
                    Action Items &amp; Key Takeaways
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.actionItems.join('\n• '), 'actions')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedSection === 'actions' ? (
                      <>
                        <Check size={12} color="var(--emerald)" />
                        <span style={{ color: 'var(--emerald)' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {result.actionItems.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.actionItems.map((item, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.5 }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--emerald)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                    No specific action items were detected in this audio recording.
                  </p>
                )}
              </div>
            )}

            {/* Speaker Diarization & Auto-Correction Overview Banner */}
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Users size={16} color="var(--accent)" />
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                    Speaker Diarization: {result.speakerCount || 1} {result.speakerCount === 1 ? 'Speaker' : 'Speakers Identified'}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent)',
                    }}
                  >
                    {result.diarizationMethod === 'multi-channel'
                      ? 'Multi-Stream Channel Analysis'
                      : result.diarizationMethod === 'voice-activity'
                      ? 'Voice Activity & Acoustic Profiling'
                      : 'Single Stream'}
                  </span>

                  {(result.autoCorrectionCount || 0) > 0 && (
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--emerald)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Wand2 size={11} />
                      {result.autoCorrectionCount} IT Terms &amp; Capitalizations Auto-Corrected
                    </span>
                  )}
                </div>

                {/* View Mode & Filter Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setTranscriptViewMode('speaker')}
                      style={{
                        background: transcriptViewMode === 'speaker' ? 'var(--surface-accent)' : 'transparent',
                        color: transcriptViewMode === 'speaker' ? 'var(--accent)' : 'var(--muted)',
                        border: 0,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Users size={12} />
                      Speaker Dialogue
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranscriptViewMode('plain')}
                      style={{
                        background: transcriptViewMode === 'plain' ? 'var(--surface-accent)' : 'transparent',
                        color: transcriptViewMode === 'plain' ? 'var(--accent)' : 'var(--muted)',
                        border: 0,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlignLeft size={12} />
                      Verbatim Text
                    </button>
                  </div>

                  {transcriptViewMode === 'speaker' && result.speakerStats && result.speakerStats.length > 1 && (
                    <select
                      value={speakerFilter}
                      onChange={(e) => setSpeakerFilter(e.target.value)}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem',
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">All Speakers ({result.speakerCount})</option>
                      {result.speakerStats.map((s) => (
                        <option key={s.speaker} value={s.speaker}>
                          {s.speaker} ({s.turnCount} turns)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Speaker Speaking Time Distribution Bar */}
              {result.speakerStats && result.speakerStats.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '4px' }}>
                    {result.speakerStats.map((s) => (
                      <span key={s.speaker} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ color: s.speakerIndex === 1 ? 'var(--accent)' : 'var(--indigo)' }}>{s.speaker}:</strong>{' '}
                        {s.percentage}% time ({s.wordCount} words)
                      </span>
                    ))}
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'var(--line)', overflow: 'hidden', display: 'flex' }}>
                    {result.speakerStats.map((s) => (
                      <div
                        key={s.speaker}
                        style={{
                          width: `${s.percentage}%`,
                          height: '100%',
                          background: s.speakerIndex === 1 ? 'var(--accent)' : 'var(--indigo)',
                          transition: 'width 0.3s ease',
                        }}
                        title={`${s.speaker}: ${s.percentage}% speaking time`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Applied IT Auto-Corrections Badge List */}
              {result.appliedAutoCorrections && result.appliedAutoCorrections.length > 0 && (
                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Normalized Technical Terms:</span>
                  {result.appliedAutoCorrections.slice(0, 8).map((c, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontFamily: 'monospace',
                        color: 'var(--emerald)',
                      }}
                      title={`Original: "${c.original}" -> Normalized: "${c.replacement}" (${c.count}x)`}
                    >
                      {c.replacement}
                    </span>
                  ))}
                  {result.appliedAutoCorrections.length > 8 && (
                    <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                      +{result.appliedAutoCorrections.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Verbatim / Speaker Dialogue Transcript Card */}
            {(activeTab === 'all' || activeTab === 'transcript') && (
              <>
                {/* Dedicated Print-Only Style Block */}
                <style>{`
                  @media print {
                    body, html {
                      background: #ffffff !important;
                      color: #000000 !important;
                    }
                    header, nav, footer, .no-print, button, input, select, .audio-controls-panel, .recording-controls, .debug-panel {
                      display: none !important;
                    }
                    .transcript-print-container {
                      display: block !important;
                      width: 100% !important;
                      max-width: none !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      background: transparent !important;
                      border: none !important;
                      box-shadow: none !important;
                      color: #000000 !important;
                      font-size: 11pt !important;
                      line-height: 1.6 !important;
                    }
                    .transcript-print-content {
                      font-size: 11pt !important;
                      line-height: 1.65 !important;
                      color: #111111 !important;
                      background: #ffffff !important;
                      border: none !important;
                      padding: 0 !important;
                      max-height: none !important;
                      overflow: visible !important;
                      white-space: pre-wrap !important;
                    }
                    .print-header {
                      display: block !important;
                      margin-bottom: 24px;
                      border-bottom: 2px solid #000;
                      padding-bottom: 12px;
                    }
                    .print-header h1 {
                      font-size: 18pt !important;
                      font-weight: bold !important;
                      color: #000 !important;
                      margin: 0 0 4px !important;
                    }
                    .print-header p {
                      font-size: 10pt !important;
                      color: #555 !important;
                      margin: 0 !important;
                    }
                  }
                  @media screen {
                    .print-header {
                      display: none !important;
                    }
                  }
                `}</style>

                {/* Print-Only Header Banner */}
                <div className="print-header">
                  <h1>AI Audio Transcriber Report</h1>
                  <p>
                    {metaProject ? `Project: ${metaProject} · ` : ''}
                    Category: {metaCategory} · Date: {metaDate} · Audio File: {audioFileName || 'Recording.wav'} · Duration: {formatDurationDisplay(sessionMetadata.durationSeconds)}
                  </p>
                </div>

                <div
                  className="transcript-print-container"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {transcriptViewMode === 'speaker' ? <Users size={16} color="var(--accent)" /> : <AlignLeft size={16} color="var(--accent)" />}
                    {transcriptViewMode === 'speaker' ? 'Differentiated Speaker Dialogue' : 'Verbatim Transcript'}
                  </h3>

                  {/* Real-time Keyword Search Bar in Results Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Search &amp; highlight keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 30px 6px 30px',
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          border: searchQuery.trim() ? '1px solid var(--accent)' : '1px solid var(--line)',
                          background: 'var(--card)',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Clear search query"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: countKeywordMatches(result.transcript, searchQuery) > 0 ? 'rgba(250, 204, 21, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                          color: countKeywordMatches(result.transcript, searchQuery) > 0 ? 'var(--amber)' : 'var(--muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {countKeywordMatches(result.transcript, searchQuery)} {countKeywordMatches(result.transcript, searchQuery) === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowLineTimestamps((prev) => !prev)}
                      style={{
                        background: showLineTimestamps ? 'var(--surface-accent)' : 'transparent',
                        border: showLineTimestamps ? '1px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontFamily: 'monospace',
                        color: showLineTimestamps ? 'var(--accent)' : 'var(--muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Toggle line-by-line timestamp badges in transcript display and .txt exports"
                    >
                      <Timer size={12} />
                      {showLineTimestamps ? 'Line Timestamps ON' : 'Line Timestamps OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setParagraphSpacing((prev) => prev === 'normal' ? 'relaxed' : prev === 'relaxed' ? 'compact' : 'normal')}
                      style={{
                        background: paragraphSpacing !== 'normal' ? 'var(--surface-accent)' : 'transparent',
                        border: paragraphSpacing !== 'normal' ? '1px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontFamily: 'monospace',
                        color: paragraphSpacing !== 'normal' ? 'var(--accent)' : 'var(--muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Toggle paragraph spacing & line-height for readability"
                    >
                      <AlignLeft size={12} />
                      Spacing: {paragraphSpacing.toUpperCase()}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoScrollEnabled((prev) => {
                          const next = !prev;
                          if (next && transcriptScrollRef.current) {
                            transcriptScrollRef.current.scrollTo({
                              top: transcriptScrollRef.current.scrollHeight,
                              behavior: 'smooth',
                            });
                          }
                          return next;
                        });
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontFamily: 'monospace',
                        color: isAutoScrollEnabled ? 'var(--accent)' : 'var(--muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ChevronsDown size={12} />
                      {isAutoScrollEnabled ? 'Auto-Scroll ON' : 'Auto-Scroll OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTranscript}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: 'var(--accent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Download size={12} />
                      Save Transcript
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.35)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#f43f5e',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Download or Print transcript report as PDF in clean document format"
                    >
                      <Printer size={12} />
                      Download as PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: 'var(--accent)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Share transcription text or audio file via Web Share API"
                    >
                      <Share2 size={12} />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          transcriptViewMode === 'speaker' && result.formattedSpeakerTranscript
                            ? result.formattedSpeakerTranscript
                            : showLineTimestamps
                            ? buildTimestampedTranscriptText(
                                result.transcript,
                                sessionMetadata.durationSeconds || verifiedDurationSeconds,
                                result.speakerTurns
                              )
                            : result.transcript,
                          'transcript'
                        )
                      }
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {copiedSection === 'transcript' ? (
                        <>
                          <Check size={12} color="var(--emerald)" />
                          <span style={{ color: 'var(--emerald)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Transcript Body: Speaker Dialogue Turns or Verbatim Text */}
                {transcriptViewMode === 'speaker' && result.speakerTurns && result.speakerTurns.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Global Expand/Collapse controls for speaker cards */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      <span>Speaker Sections ({result.speakerTurns.filter((turn) => speakerFilter === 'all' || turn.speaker === speakerFilter).length})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={expandAllTurns}
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--accent)' }}
                        >
                          Expand All
                        </button>
                        <button
                          type="button"
                          onClick={collapseAllTurns}
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.74rem', cursor: 'pointer', color: 'var(--text)' }}
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    <div className="transcript-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: paragraphSpacing === 'relaxed' ? '16px' : paragraphSpacing === 'compact' ? '8px' : '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
                      {result.speakerTurns
                        .filter((turn) => speakerFilter === 'all' || turn.speaker === speakerFilter)
                        .map((turn, index) => {
                          const isSpeaker1 = turn.speakerIndex === 1;
                          const turnKey = turn.id || String(index);
                          const isCollapsed = Boolean(collapsedTurns[turnKey]);

                          return (
                            <div
                              key={turnKey}
                              className="speaker-turn-card"
                              style={{
                                background: 'var(--card)',
                                border: isSpeaker1
                                  ? '1px solid rgba(56, 189, 248, 0.35)'
                                  : '1px solid rgba(168, 85, 247, 0.35)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {/* Collapsible Card Header */}
                              <div
                                onClick={(e) => toggleTurnCollapsed(turnKey, e)}
                                style={{
                                  padding: '10px 14px',
                                  background: isCollapsed ? 'var(--card)' : 'var(--surface-accent)',
                                  borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  cursor: 'pointer',
                                }}
                                title="Click to expand or collapse speaker section"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '50%',
                                      background: isSpeaker1
                                        ? 'rgba(56, 189, 248, 0.2)'
                                        : 'rgba(168, 85, 247, 0.2)',
                                      color: isSpeaker1 ? 'var(--accent)' : 'var(--indigo)',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    S{turn.speakerIndex}
                                  </span>
                                  <strong style={{ fontSize: '0.9rem', color: isSpeaker1 ? 'var(--accent)' : 'var(--indigo)' }}>
                                    {turn.speaker}
                                  </strong>
                                  {typeof turn.channel === 'number' && (
                                    <span style={{ fontSize: '0.70rem', color: 'var(--muted)', background: 'var(--bg)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                                      Ch {turn.channel + 1}
                                    </span>
                                  )}
                                  {isCollapsed && (
                                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      "{turn.text.slice(0, 50)}..."
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      seekToTime(turn.startTime);
                                    }}
                                    style={{
                                      background: 'var(--bg)',
                                      border: '1px solid var(--line)',
                                      borderRadius: '6px',
                                      padding: '2px 8px',
                                      fontSize: '0.74rem',
                                      fontFamily: 'monospace',
                                      color: 'var(--muted)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    title="Jump audio player to this speaker turn"
                                  >
                                    <Play size={10} color="var(--emerald)" />
                                    {formatSpeakerTimestamp(turn.startTime)} - {formatSpeakerTimestamp(turn.endTime)}
                                  </button>

                                  <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                  </div>
                                </div>
                              </div>

                              {/* Collapsible Card Body */}
                              {!isCollapsed && (
                                <div style={{ padding: '12px 14px' }}>
                                  <p
                                    onClick={() => seekToTime(turn.startTime)}
                                    style={{ margin: 0, fontSize: '0.94rem', lineHeight: paragraphSpacing === 'relaxed' ? 2.0 : paragraphSpacing === 'compact' ? 1.35 : 1.65, color: 'var(--text)', cursor: 'pointer' }}
                                    title="Click to seek audio to this timestamp"
                                  >
                                    {highlightMatchingText(turn.text, searchQuery)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div
                      ref={transcriptScrollRef}
                      className="transcript-scroll-container"
                      onScroll={handleTranscriptScroll}
                      style={{
                        maxHeight: '360px',
                        overflowY: 'auto',
                        padding: paragraphSpacing === 'relaxed' ? '20px' : paragraphSpacing === 'compact' ? '12px' : '16px',
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        lineHeight: paragraphSpacing === 'relaxed' ? 2.0 : paragraphSpacing === 'compact' ? 1.35 : 1.65,
                        color: 'var(--text)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {(() => {
                        if (!showLineTimestamps) {
                          return highlightMatchingText(result.transcript, searchQuery);
                        }

                        const cleanText = result.transcript.trim();
                        const rawLines = cleanText
                          .split(/\n+/)
                          .flatMap((line) => {
                            const trimmed = line.trim();
                            if (!trimmed) return [];
                            const parts = trimmed.split(/(?<=[.!?।۔。])\s+/).map((s) => s.trim()).filter(Boolean);
                            return parts.length > 0 ? parts : [trimmed];
                          });

                        if (rawLines.length === 0) {
                          return highlightMatchingText(result.transcript, searchQuery);
                        }

                        const totalChars = cleanText.length || 1;
                        const dur = sessionMetadata.durationSeconds || verifiedDurationSeconds || 0;
                        let accumChars = 0;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {rawLines.map((line, idx) => {
                              const fraction = accumChars / totalChars;
                              const lineTimeSec = dur * fraction;
                              accumChars += line.length;
                              const timeStr = formatSpeakerTimestamp(lineTimeSec);

                              return (
                                <div
                                  key={idx}
                                  onClick={() => seekToTime(lineTimeSec)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--surface-accent)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                  title={`Seek audio player to ${timeStr}`}
                                >
                                  {showLineTimestamps && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        seekToTime(lineTimeSec);
                                      }}
                                      style={{
                                        background: 'var(--bg)',
                                        border: '1px solid var(--line)',
                                        borderRadius: '4px',
                                        padding: '1px 6px',
                                        fontSize: '0.74rem',
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        color: 'var(--accent)',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        userSelect: 'none',
                                      }}
                                      title={`Jump audio player to ${timeStr}`}
                                    >
                                      [{timeStr}]
                                    </button>
                                  )}
                                  <span style={{ flex: 1 }}>{highlightMatchingText(line, searchQuery)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <div ref={transcriptBottomRef} style={{ height: 0 }} />
                    </div>

                    {isUserScrolledUp && (
                      <button
                        type="button"
                        onClick={scrollToBottom}
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '16px',
                          background: 'var(--accent)',
                          color: '#ffffff',
                          border: 0,
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ArrowDown size={13} />
                        Jump to latest lines
                      </button>
                    )}
                  </div>
                )}

                {/* Real-Time Word, Character & Content Metrics Indicator Bar */}
                {(() => {
                  const currentText =
                    transcriptViewMode === 'speaker' && result.formattedSpeakerTranscript
                      ? result.formattedSpeakerTranscript
                      : result.transcript;
                  const clean = (currentText || '').trim();
                  const chars = clean.length;
                  const charsNoSpaces = clean.replace(/\s+/g, '').length;
                  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
                  const sentences = clean ? clean.split(/(?<=[.!?।۔。])\s+/).filter(Boolean).length : 0;
                  const avgWordLen = words > 0 ? (charsNoSpaces / words).toFixed(1) : '0';
                  const readingTimeMins = Math.max(1, Math.round(words / 200));

                  return (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: '0.80rem',
                        color: 'var(--muted)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <AlignLeft size={13} color="var(--accent)" />
                          <span>
                            <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                              {words.toLocaleString()}
                            </strong>{' '}
                            {words === 1 ? 'Word' : 'Words'}
                          </span>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={13} color="var(--emerald)" />
                          <span>
                            <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                              {chars.toLocaleString()}
                            </strong>{' '}
                            Characters <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>({charsNoSpaces.toLocaleString()} excl. spaces)</span>
                          </span>
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <ListChecks size={13} color="var(--amber)" />
                          <span>
                            <strong style={{ color: 'var(--text-heading)', fontFamily: 'monospace' }}>
                              {sentences.toLocaleString()}
                            </strong>{' '}
                            {sentences === 1 ? 'Sentence' : 'Sentences'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                          Avg: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{avgWordLen}</strong> chars/word
                        </span>
                        <span style={{ fontSize: '0.75rem', background: 'var(--surface-accent)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                          Est. Read: {words < 50 ? '< 1 min' : `~${readingTimeMins} min${readingTimeMins > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              </>
            )}
          </section>
        )}

        {/* Educational & Technical Guide Section matching ITCoverLetterBuilder */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-heading)' }}>
            How In-Browser AI Speech Recognition Works
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 20px' }}>
            Unlike standard voice recording tools that upload confidential audio to remote cloud servers, this tool executes the complete speech-to-text pipeline locally in your web browser using OpenAI Whisper neural network weights running via WebAssembly and WebGPU.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> 1. Zero Server Uploads
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Your microphone input and uploaded files never leave your computer or smartphone. Audio buffers exist solely in RAM.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} /> 2. Multilingual Output
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Transcribes English, Hindi, Urdu, Bengali, Tamil, Telugu, Spanish, French, German, and 20+ languages in native script.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={16} /> 3. 16-Bit Linear PCM WAV
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Encodes studio-grade 16,000 Hz or 44,100 Hz mono PCM audio with verifiable 44-byte RIFF headers and non-zero amplitude validation.
              </p>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListChecks size={16} /> 4. Action Items &amp; Summary
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Automatically extracts key decisions, tasks, and executive summaries from long conversations and meetings.
              </p>
            </div>
          </div>

          {/* Technical FAQ Accordion */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 16px' }}>
              Frequently Asked Questions &amp; Technical Notes
            </h3>

            {[
              {
                q: 'Is my voice data or meeting recording sent to any external server or API?',
                a: 'No. The entire transcription model runs 100% locally on your machine via client-side WebAssembly. No audio bytes, tokens, or transcript texts are ever transmitted over the network.',
              },
              {
                q: 'How can I ensure the best transcription accuracy for Indian accents or technical terminology?',
                a: 'Select the specific language (e.g. Hindi, Urdu, Tamil) instead of "Auto-detect" if you are speaking in that tongue, and choose the "Whisper Base Multilingual" model tier for improved phonetic vocabulary recognition.',
              },
              {
                q: 'What should I do if the microphone permission is blocked or shows 0:00 duration?',
                a: 'Ensure you click "Allow" on the browser microphone permission prompt. If you already clicked allow but audio is silent, check your operating system settings (System Settings → Privacy & Security → Microphone) and ensure your browser has access.',
              },
              {
                q: 'What is the difference between "High Fidelity (44.1kHz)" and "Voice Optimized (16kHz)" presets?',
                a: '"Voice Optimized (16kHz)" samples audio directly at 16,000 Hz, matching OpenAI Whisper\'s native input format for minimal memory overhead and fast transcription. "High Fidelity (44.1kHz)" captures studio-grade acoustic bandwidth, perfect for archiving high-fidelity voice notes or presentations.',
              },
              {
                q: 'Does the AI model need to download again every time I open this page?',
                a: 'No. Model weights are cached locally in your browser Cache Storage. After the first load, the model initializes instantly even when working offline.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    overflow: 'hidden',
                    background: 'var(--bg)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      background: 'transparent',
                      border: 0,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      color: 'var(--text-heading)',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 18px 14px',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        color: 'var(--muted)',
                        borderTop: '1px solid var(--line)',
                        paddingTop: '10px',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Subtle Auto-Save Toast Notification */}
        {showAutoSaveToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              background: 'var(--card)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 0 10px rgba(16, 185, 129, 0.15)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeInOut 0.25s ease-in-out',
              maxWidth: '320px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald)',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Transcript Auto-Saved
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                Saved to browser storage at {lastAutoSaveTime}
              </span>
            </div>
          </div>
        )}

        {/* Hidden Multi-file Input for Batch Transcript Uploads */}
        <input
          ref={batchFileInputRef}
          type="file"
          multiple
          accept=".txt,.json,.srt,.vtt,.md,text/plain,application/json"
          style={{ display: 'none' }}
          onChange={handleBatchFileUpload}
        />

        {/* Local Ollama Batch Summarizer Modal */}
        {showBatchModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-modal-title"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.78)',
              backdropFilter: 'blur(5px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '920px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'fadeInOut 0.2s ease-out',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'var(--bg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                    }}
                  >
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2
                      id="batch-modal-title"
                      style={{
                        margin: 0,
                        fontSize: '1.18rem',
                        fontWeight: 800,
                        color: 'var(--text-heading)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Local Ollama Batch Summarizer
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Queue multiple transcript files for sequential private summarization via local Ollama
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Ollama Status Pill */}
                  <div
                    onClick={() => void checkOllamaStatus()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background:
                        ollamaStatus === 'connected'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : ollamaStatus === 'checking' || isRetryingOllama
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${
                        ollamaStatus === 'connected'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : ollamaStatus === 'checking' || isRetryingOllama
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'
                      }`,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color:
                        ollamaStatus === 'connected'
                          ? 'var(--emerald)'
                          : ollamaStatus === 'checking' || isRetryingOllama
                          ? 'var(--amber)'
                          : '#ef4444',
                      cursor: 'pointer',
                    }}
                    title="Click to check Ollama local connection status"
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background:
                          ollamaStatus === 'connected'
                            ? 'var(--emerald)'
                            : ollamaStatus === 'checking' || isRetryingOllama
                            ? 'var(--amber)'
                            : '#ef4444',
                        boxShadow: ollamaStatus === 'connected' ? '0 0 6px var(--emerald)' : 'none',
                      }}
                    />
                    <span>
                      {ollamaStatus === 'connected'
                        ? `Ollama: ${ollamaModelName}`
                        : ollamaStatus === 'checking' || isRetryingOllama
                        ? 'Checking...'
                        : 'Ollama Disconnected'}
                    </span>
                    {ollamaStatus === 'disconnected' && <RotateCcw size={11} />}
                  </div>

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      borderRadius: '8px',
                      padding: '6px',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Close Batch Summarizer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div
                style={{
                  padding: '14px 24px',
                  background: 'var(--card)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Upload Files Button */}
                  <button
                    type="button"
                    onClick={() => batchFileInputRef.current?.click()}
                    style={{
                      background: 'var(--surface-accent)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Upload .txt, .json, .vtt, .srt, or .md files"
                  >
                    <Plus size={15} />
                    Add Files (.txt, .json, .vtt, .srt, .md)
                  </button>

                  {/* Add Current Recording Transcript */}
                  {result?.transcript && (
                    <button
                      type="button"
                      onClick={handleAddCurrentTranscriptToBatch}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        color: 'var(--text)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Add currently transcribed recording to batch queue"
                    >
                      <FileAudio size={14} color="var(--emerald)" />
                      Add Current Recording
                    </button>
                  )}

                  {/* Clear Completed */}
                  {batchQueue.some((i) => i.status === 'completed') && (
                    <button
                      type="button"
                      onClick={handleClearCompletedBatch}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        color: 'var(--muted)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Completed
                    </button>
                  )}

                  {/* Clear All */}
                  {batchQueue.length > 0 && !isBatchProcessing && (
                    <button
                      type="button"
                      onClick={handleClearBatchQueue}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        color: 'var(--muted)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Export Buttons */}
                  {batchQueue.some((i) => i.status === 'completed') && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportAllBatchSummariesJson}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          color: 'var(--text)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.80rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Download JSON bundle with all completed summaries"
                      >
                        <Download size={13} />
                        Export JSON
                      </button>

                      <button
                        type="button"
                        onClick={handleExportAllBatchSummariesMarkdown}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          color: 'var(--text)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.80rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Download Markdown report of all completed summaries"
                      >
                        <FileText size={13} />
                        Export Report (.md)
                      </button>
                    </>
                  )}

                  {/* Start / Pause Processing Button */}
                  {!isBatchProcessing ? (
                    <button
                      type="button"
                      onClick={() => void handleStartBatchProcessing()}
                      disabled={
                        batchQueue.length === 0 ||
                        !batchQueue.some((i) => i.status === 'pending' || i.status === 'failed')
                      }
                      style={{
                        background:
                          batchQueue.some((i) => i.status === 'pending' || i.status === 'failed')
                            ? 'var(--accent)'
                            : 'var(--surface-accent)',
                        color:
                          batchQueue.some((i) => i.status === 'pending' || i.status === 'failed')
                            ? '#ffffff'
                            : 'var(--muted)',
                        border: 0,
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor:
                          batchQueue.some((i) => i.status === 'pending' || i.status === 'failed')
                            ? 'pointer'
                            : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: batchQueue.some((i) => i.status === 'pending' || i.status === 'failed')
                          ? '0 2px 10px rgba(56, 189, 248, 0.3)'
                          : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Sequentially process pending transcript files using Ollama"
                    >
                      <PlayCircle size={15} />
                      Start Batch Summarization
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopBatchProcessing}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                      }}
                      title="Pause batch queue after current transcript completes"
                    >
                      <StopCircle size={15} />
                      Pause Queue
                    </button>
                  )}
                </div>
              </div>

              {/* Progress & Summary Bar */}
              {batchQueue.length > 0 && (
                <div
                  style={{
                    padding: '12px 24px',
                    background: 'var(--bg)',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span>
                        Total: <strong style={{ color: 'var(--text)' }}>{batchQueue.length}</strong>
                      </span>
                      <span>
                        Pending:{' '}
                        <strong style={{ color: 'var(--amber)' }}>
                          {batchQueue.filter((i) => i.status === 'pending').length}
                        </strong>
                      </span>
                      <span>
                        Completed:{' '}
                        <strong style={{ color: 'var(--emerald)' }}>
                          {batchQueue.filter((i) => i.status === 'completed').length}
                        </strong>
                      </span>
                      {batchQueue.some((i) => i.status === 'failed') && (
                        <span>
                          Failed:{' '}
                          <strong style={{ color: '#ef4444' }}>
                            {batchQueue.filter((i) => i.status === 'failed').length}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 600 }}>
                      {Math.round(
                        (batchQueue.filter((i) => i.status === 'completed').length /
                          batchQueue.length) *
                          100
                      )}
                      % Completed
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: 'var(--card)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(
                          (batchQueue.filter((i) => i.status === 'completed').length /
                            batchQueue.length) *
                            100
                        )}%`,
                        background:
                          'linear-gradient(90deg, var(--accent) 0%, var(--emerald) 100%)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Active Processing Indicator */}
                  {isBatchProcessing && currentBatchIndex >= 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.76rem',
                        color: 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      <Loader2 size={12} className="animate-spin" />
                      <span>
                        Processing item {currentBatchIndex + 1} of {batchQueue.length}:{' '}
                        {batchQueue[currentBatchIndex]?.fileName} via Ollama...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Filter Tabs (when items exist) */}
              {batchQueue.length > 0 && (
                <div
                  style={{
                    padding: '8px 24px',
                    background: 'var(--card)',
                    borderBottom: '1px solid var(--line)',
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBatchFilter('all')}
                    style={{
                      background: batchFilter === 'all' ? 'var(--surface-accent)' : 'transparent',
                      color: batchFilter === 'all' ? 'var(--accent)' : 'var(--muted)',
                      border: 0,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    All ({batchQueue.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFilter('pending')}
                    style={{
                      background: batchFilter === 'pending' ? 'var(--surface-accent)' : 'transparent',
                      color: batchFilter === 'pending' ? 'var(--accent)' : 'var(--muted)',
                      border: 0,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Pending ({batchQueue.filter((i) => i.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFilter('completed')}
                    style={{
                      background: batchFilter === 'completed' ? 'var(--surface-accent)' : 'transparent',
                      color: batchFilter === 'completed' ? 'var(--accent)' : 'var(--muted)',
                      border: 0,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Completed ({batchQueue.filter((i) => i.status === 'completed').length})
                  </button>
                  {batchQueue.some((i) => i.status === 'failed') && (
                    <button
                      type="button"
                      onClick={() => setBatchFilter('failed')}
                      style={{
                        background: batchFilter === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                        color: batchFilter === 'failed' ? '#ef4444' : 'var(--muted)',
                        border: 0,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Failed ({batchQueue.filter((i) => i.status === 'failed').length})
                    </button>
                  )}
                </div>
              )}

              {/* Queue List (Scrollable) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--bg)',
                }}
              >
                {batchQueue.length === 0 ? (
                  <div
                    onClick={() => batchFileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--line)',
                      borderRadius: '12px',
                      padding: '40px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--card)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                        color: 'var(--accent)',
                      }}
                    >
                      <Layers size={24} />
                    </div>
                    <h3
                      style={{
                        margin: '0 0 6px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-heading)',
                      }}
                    >
                      Batch Queue is Empty
                    </h3>
                    <p
                      style={{
                        margin: '0 0 16px',
                        fontSize: '0.84rem',
                        color: 'var(--muted)',
                        maxWidth: '480px',
                        marginInline: 'auto',
                        lineHeight: 1.5,
                      }}
                    >
                      Click here to select multiple transcript files (.txt, .json, .vtt, .srt, .md)
                      or add your active recording transcript to process them sequentially via your
                      local Ollama model.
                    </p>
                    <button
                      type="button"
                      style={{
                        background: 'var(--accent)',
                        color: '#ffffff',
                        border: 0,
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} />
                      Choose Transcript Files
                    </button>
                  </div>
                ) : (
                  batchQueue
                    .filter((item) => {
                      if (batchFilter === 'pending') return item.status === 'pending';
                      if (batchFilter === 'completed') return item.status === 'completed';
                      if (batchFilter === 'failed') return item.status === 'failed';
                      return true;
                    })
                    .map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--card)',
                          border: `1px solid ${
                            item.status === 'completed'
                              ? 'rgba(16, 185, 129, 0.4)'
                              : item.status === 'processing'
                              ? 'rgba(56, 189, 248, 0.5)'
                              : item.status === 'failed'
                              ? 'rgba(239, 68, 68, 0.4)'
                              : 'var(--line)'
                          }`,
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                      >
                        {/* Item Summary Header */}
                        <div
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            background:
                              item.status === 'processing'
                                ? 'rgba(56, 189, 248, 0.05)'
                                : item.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.04)'
                                : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: 'var(--muted)',
                                background: 'var(--bg)',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: '1px solid var(--line)',
                              }}
                            >
                              #{index + 1}
                            </span>

                            {/* Status Badge */}
                            {item.status === 'pending' && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--amber)',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Timer size={11} /> Pending
                              </span>
                            )}
                            {item.status === 'processing' && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--accent)',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                <Loader2 size={11} className="animate-spin" /> Summarizing...
                              </span>
                            )}
                            {item.status === 'completed' && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--emerald)',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={11} /> Completed
                                {item.result?.durationMs && (
                                  <span style={{ opacity: 0.8, marginLeft: '2px' }}>
                                    ({(item.result.durationMs / 1000).toFixed(1)}s)
                                  </span>
                                )}
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#ef4444',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <AlertCircle size={11} /> Failed
                              </span>
                            )}

                            <div>
                              <strong
                                style={{
                                  fontSize: '0.88rem',
                                  color: 'var(--text-heading)',
                                  display: 'block',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {item.fileName}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                {item.wordCount} words • {Math.round(item.fileSize / 1024)} KB
                              </span>
                            </div>
                          </div>

                          {/* Quick Item Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {item.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetryBatchItem(item.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#ef4444',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <RotateCcw size={11} /> Retry
                              </button>
                            )}

                            {item.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadSingleBatchSummary(item)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--line)',
                                  color: 'var(--text)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Download summary report (.txt)"
                              >
                                <Download size={11} /> Download
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleBatchItemExpand(item.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--line)',
                                color: 'var(--text)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {item.isExpanded ? (
                                <>
                                  <ChevronUp size={12} /> Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} /> View Details
                                </>
                              )}
                            </button>

                            {!isBatchProcessing && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBatchItem(item.id)}
                                style={{
                                  background: 'transparent',
                                  border: 0,
                                  color: 'var(--muted)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                }}
                                title="Remove from queue"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error Notice (if failed) */}
                        {item.status === 'failed' && item.error && (
                          <div
                            style={{
                              padding: '10px 16px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                              fontSize: '0.78rem',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertCircle size={14} style={{ flexShrink: 0 }} />
                              <span>{item.error}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRetryBatchItem(item.id)}
                              style={{
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 0,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Retry Now
                            </button>
                          </div>
                        )}

                        {/* Expanded Content (Completed Summary or Verbatim Transcript) */}
                        {item.isExpanded && (
                          <div
                            style={{
                              padding: '16px',
                              borderTop: '1px solid var(--line)',
                              background: 'var(--bg)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            {item.result ? (
                              <>
                                {/* Executive Summary */}
                                <div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom: '6px',
                                    }}
                                  >
                                    <strong
                                      style={{
                                        fontSize: '0.82rem',
                                        color: 'var(--accent)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <FileText size={13} /> Executive Summary
                                    </strong>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyBatchText(
                                          item.result?.summary || '',
                                          `sum-${item.id}`
                                        )
                                      }
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid var(--line)',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        fontSize: '0.70rem',
                                        cursor: 'pointer',
                                        color: 'var(--text)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      {batchCopiedId === `sum-${item.id}` ? (
                                        <>
                                          <Check size={10} color="var(--emerald)" /> Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={10} /> Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: '0.84rem',
                                      color: 'var(--text)',
                                      lineHeight: 1.55,
                                      whiteSpace: 'pre-line',
                                    }}
                                  >
                                    {item.result.summary}
                                  </p>
                                </div>

                                {/* Action Items */}
                                {item.result.actionItems && item.result.actionItems.length > 0 && (
                                  <div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      <strong
                                        style={{
                                          fontSize: '0.82rem',
                                          color: 'var(--emerald)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <ListChecks size={13} /> Action Items
                                      </strong>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyBatchText(
                                            item.result?.actionItems.join('\n• ') || '',
                                            `act-${item.id}`
                                          )
                                        }
                                        style={{
                                          background: 'transparent',
                                          border: '1px solid var(--line)',
                                          borderRadius: '4px',
                                          padding: '2px 8px',
                                          fontSize: '0.70rem',
                                          cursor: 'pointer',
                                          color: 'var(--text)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        {batchCopiedId === `act-${item.id}` ? (
                                          <>
                                            <Check size={10} color="var(--emerald)" /> Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={10} /> Copy
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <ul
                                      style={{
                                        margin: 0,
                                        paddingLeft: '18px',
                                        fontSize: '0.82rem',
                                        color: 'var(--text)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                      }}
                                    >
                                      {item.result.actionItems.map((act, i) => (
                                        <li key={i}>{act}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* IT Support Log Entry */}
                                {item.result.itLogEntry && (
                                  <div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      <strong
                                        style={{
                                          fontSize: '0.82rem',
                                          color: 'var(--text-heading)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <Terminal size={13} color="var(--emerald)" /> IT Support
                                        Log Entry
                                      </strong>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyBatchText(
                                            item.result?.itLogEntry || '',
                                            `it-${item.id}`
                                          )
                                        }
                                        style={{
                                          background: 'transparent',
                                          border: '1px solid var(--line)',
                                          borderRadius: '4px',
                                          padding: '2px 8px',
                                          fontSize: '0.70rem',
                                          cursor: 'pointer',
                                          color: 'var(--text)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        {batchCopiedId === `it-${item.id}` ? (
                                          <>
                                            <Check size={10} color="var(--emerald)" /> Copied
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={10} /> Copy Log
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre
                                      style={{
                                        margin: 0,
                                        background: 'var(--card)',
                                        border: '1px solid var(--line)',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        fontSize: '0.76rem',
                                        fontFamily: 'monospace',
                                        lineHeight: 1.5,
                                        color: 'var(--text)',
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                      }}
                                    >
                                      {item.result.itLogEntry}
                                    </pre>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div>
                                <strong
                                  style={{
                                    display: 'block',
                                    fontSize: '0.80rem',
                                    color: 'var(--muted)',
                                    marginBottom: '6px',
                                  }}
                                >
                                  Transcript Preview ({item.wordCount} words):
                                </strong>
                                <div
                                  style={{
                                    background: 'var(--card)',
                                    border: '1px solid var(--line)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    fontSize: '0.78rem',
                                    color: 'var(--text)',
                                    lineHeight: 1.5,
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                  }}
                                >
                                  {item.transcriptText.slice(0, 500)}
                                  {item.transcriptText.length > 500 ? '...' : ''}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '12px 24px',
                  borderTop: '1px solid var(--line)',
                  background: 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="var(--emerald)" />
                  <span>
                    100% Free &amp; Private: All transcripts are processed sequentially via local
                    Ollama ({ollamaEndpoint}). Zero data leaves your browser.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: '6px',
                    padding: '5px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Provider, Custom Dictionary & Config Import/Export Modal */}
        <AiProviderSettingsModal
          isOpen={showAiSettingsModal}
          onClose={() => setShowAiSettingsModal(false)}
          initialTab={aiSettingsModalTab}
        />
      </main>
    </div>
  );
};

export default AiAudioTranscriber;
