import { useState, useRef, useEffect, useCallback } from 'react';

export type TranscriberErrorCategory =
  | 'mic'
  | 'recording'
  | 'playback'
  | 'upload'
  | 'model'
  | 'transcription';

export interface MicError {
  type: string;
  category: TranscriberErrorCategory;
  message: string;
  raw?: string;
}

export interface PcmAudioStats {
  chunkCount: number;
  totalSamples: number;
  nonZeroSampleCount: number;
  nonZeroRatio: number;
  silentChunkCount: number;
  activeChunkCount: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  rmsDbFs: number;
  hasNonZeroAudio: boolean;
  isSilent: boolean;
}

export interface WavValidationResult {
  valid: boolean;
  error?: string;
  riffHeader: string;
  waveHeader: string;
  fmtHeader: string;
  fmtChunkSize: number;
  dataHeader: string;
  fileSizeField: number;
  actualByteLength: number;
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  expectedByteRate: number;
  blockAlign: number;
  expectedBlockAlign: number;
  bitsPerSample: number;
  dataByteLength: number;
  sampleCount: number;
  nonZeroSampleCount: number;
  nonZeroRatio: number;
  hasNonZeroAudio: boolean;
  firstNonZeroSampleIndex: number;
  durationSeconds: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  headerHexPreview: string;
}

export interface AudioElementDiagnostics {
  event: string;
  src: string;
  duration: number | null;
  rawDuration: string;
  readyState: number;
  readyStateLabel: string;
  networkState: number;
  networkStateLabel: string;
  canPlayWav: string;
  paused: boolean;
  muted: boolean;
  volume: number;
  errorCode: number | null;
  errorMessage: string | null;
  humanError: string | null;
}

export interface RecordingLifecycleDiagnostics {
  trackCount: number;
  trackLabel: string;
  trackReadyState: string;
  trackEnabled: boolean;
  trackMuted: boolean;
  trackSampleRate?: number;
  trackChannelCount?: number;
  audioContextState: string;
  sampleRate: number;
  channelCount: number;
  sourceChannelCount: number;
  processorChannelCount: number;
  destinationMaxChannelCount: number;
  chunkCount: number;
  totalSamples: number;
  nonZeroSampleCount: number;
  nonZeroRatio: number;
  hasNonZeroAudio: boolean;
  peakAmplitude: number;
  rmsAmplitude: number;
  elapsedSeconds: number;
  wavDurationSeconds: number;
  blobSizeBytes: number;
  mimeType: string;
  wavHeaderValid: boolean;
}

export interface WhisperLanguageOption {
  code: string;
  label: string;
  nativeName: string;
  group: 'auto' | 'indian' | 'global';
  accuracyNote: string;
}

export interface WhisperModelOption {
  id: string;
  label: string;
  approxDownloadSize: string;
  description: string;
  multilingual: boolean;
}

export const WHISPER_MODELS: WhisperModelOption[] = [
  {
    id: 'onnx-community/whisper-base',
    label: 'Whisper Base (Multilingual — Recommended)',
    approxDownloadSize: '~75 MB',
    description: 'Balanced multilingual accuracy for English, Hindi, Urdu, Bengali, Tamil, Telugu, and global languages.',
    multilingual: true,
  },
  {
    id: 'onnx-community/whisper-tiny',
    label: 'Whisper Tiny (Multilingual — Fast / Low Memory)',
    approxDownloadSize: '~40 MB',
    description: 'Fastest browser download and lowest RAM usage; best for clear English and short multilingual clips.',
    multilingual: true,
  },
];

export const DEFAULT_WHISPER_MODEL_ID = 'onnx-community/whisper-base';
export const FALLBACK_WHISPER_MODEL_ID = 'onnx-community/whisper-tiny';

export const SUPPORTED_TRANSCRIPTION_LANGUAGES: WhisperLanguageOption[] = [
  {
    code: 'auto',
    label: 'Auto-Detect Spoken Language',
    nativeName: 'Auto',
    group: 'auto',
    accuracyNote: 'Automatically detects the spoken language from the first 30 seconds of speech.',
  },
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    group: 'indian',
    accuracyNote: 'Highest transcription accuracy across accents (Indian, US, UK, Australian).',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeName: 'हिन्दी',
    group: 'indian',
    accuracyNote: 'Good accuracy in Devanagari script with Whisper Base on clear microphone input.',
  },
  {
    code: 'ur',
    label: 'Urdu',
    nativeName: 'اردو',
    group: 'indian',
    accuracyNote: 'Good conversational accuracy in Urdu script on clear recordings.',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nativeName: 'বাংলা',
    group: 'indian',
    accuracyNote: 'Moderate accuracy in Bengali script; speak clearly with minimal background noise.',
  },
  {
    code: 'ta',
    label: 'Tamil',
    nativeName: 'தமிழ்',
    group: 'indian',
    accuracyNote: 'Moderate accuracy in Tamil script; selecting Tamil explicitly is recommended over Auto-Detect.',
  },
  {
    code: 'te',
    label: 'Telugu',
    nativeName: 'తెలుగు',
    group: 'indian',
    accuracyNote: 'Moderate accuracy in Telugu script; explicit language selection improves recognition.',
  },
  {
    code: 'mr',
    label: 'Marathi',
    nativeName: 'मराठी',
    group: 'indian',
    accuracyNote: 'Moderate accuracy in Devanagari script; explicit language selection avoids Hindi confusion.',
  },
  {
    code: 'gu',
    label: 'Gujarati',
    nativeName: 'ગુજરાતી',
    group: 'indian',
    accuracyNote: 'Basic-to-moderate accuracy for clear speech; explicit language selection is recommended.',
  },
  {
    code: 'kn',
    label: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    group: 'indian',
    accuracyNote: 'Basic-to-moderate accuracy; explicit language selection is strongly recommended.',
  },
  {
    code: 'ml',
    label: 'Malayalam',
    nativeName: 'മലയാളം',
    group: 'indian',
    accuracyNote: 'Basic-to-moderate accuracy; best with slow, clear speech in a quiet environment.',
  },
  {
    code: 'pa',
    label: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    group: 'indian',
    accuracyNote: 'Basic-to-moderate accuracy; explicit language selection is recommended.',
  },
  {
    code: 'ar',
    label: 'Arabic',
    nativeName: 'العربية',
    group: 'global',
    accuracyNote: 'Strong accuracy across Modern Standard Arabic and major dialects.',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeName: 'Español',
    group: 'global',
    accuracyNote: 'High accuracy for conversational and technical Spanish.',
  },
  {
    code: 'fr',
    label: 'French',
    nativeName: 'Français',
    group: 'global',
    accuracyNote: 'High accuracy for conversational and technical French.',
  },
  {
    code: 'de',
    label: 'German',
    nativeName: 'Deutsch',
    group: 'global',
    accuracyNote: 'High accuracy for conversational and technical German.',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    nativeName: 'Português',
    group: 'global',
    accuracyNote: 'High accuracy for Brazilian and European Portuguese.',
  },
  {
    code: 'ru',
    label: 'Russian',
    nativeName: 'Русский',
    group: 'global',
    accuracyNote: 'High accuracy in Cyrillic script.',
  },
  {
    code: 'zh',
    label: 'Chinese',
    nativeName: '中文',
    group: 'global',
    accuracyNote: 'Good accuracy for Mandarin Chinese.',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeName: '日本語',
    group: 'global',
    accuracyNote: 'Good accuracy for standard Japanese speech.',
  },
];

export interface WhisperTranscriptionOptions {
  chunk_length_s: number;
  stride_length_s: number;
  return_timestamps: boolean;
  task: 'transcribe';
  language?: string;
}

export function buildWhisperTranscriptionOptions(selectedLanguage: string): WhisperTranscriptionOptions {
  const normalized = (selectedLanguage || 'auto').trim().toLowerCase();
  const isKnownNonAuto =
    normalized !== 'auto' &&
    SUPPORTED_TRANSCRIPTION_LANGUAGES.some((lang) => lang.code === normalized);

  const options: WhisperTranscriptionOptions = {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
    task: 'transcribe',
  };

  if (isKnownNonAuto) {
    options.language = normalized;
  }

  return options;
}

export function writeWavString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function readWavString(view: DataView, offset: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += String.fromCharCode(view.getUint8(offset + i));
  }
  return out;
}

export function computePcmStats(chunks: Float32Array[]): PcmAudioStats {
  let totalSamples = 0;
  let nonZeroSampleCount = 0;
  let silentChunkCount = 0;
  let activeChunkCount = 0;
  let peakAmplitude = 0;
  let sumSquares = 0;

  for (const chunk of chunks) {
    totalSamples += chunk.length;
    let chunkHasSignal = false;
    for (let i = 0; i < chunk.length; i += 1) {
      const sample = chunk[i];
      if (!Number.isFinite(sample)) continue;
      const abs = Math.abs(sample);
      if (abs > 0) {
        nonZeroSampleCount += 1;
      }
      if (abs >= 0.0001) {
        chunkHasSignal = true;
      }
      if (abs > peakAmplitude) {
        peakAmplitude = abs;
      }
      sumSquares += sample * sample;
    }
    if (chunkHasSignal) {
      activeChunkCount += 1;
    } else {
      silentChunkCount += 1;
    }
  }

  const rmsAmplitude = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) : 0;
  const rmsDbFs = rmsAmplitude > 0 ? 20 * Math.log10(rmsAmplitude) : -Infinity;
  const nonZeroRatio = totalSamples > 0 ? nonZeroSampleCount / totalSamples : 0;
  const hasNonZeroAudio = nonZeroSampleCount > 0;

  return {
    chunkCount: chunks.length,
    totalSamples,
    nonZeroSampleCount,
    nonZeroRatio,
    silentChunkCount,
    activeChunkCount,
    peakAmplitude,
    rmsAmplitude,
    rmsDbFs,
    hasNonZeroAudio,
    isSilent: totalSamples === 0 || peakAmplitude < 0.0001,
  };
}

export function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const normalizedSampleRate = Math.round(Number(sampleRate));
  if (!Number.isFinite(normalizedSampleRate) || normalizedSampleRate <= 0) {
    throw new Error(`Invalid WAV sample rate: ${sampleRate}`);
  }

  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (totalSamples <= 0) {
    throw new Error('Cannot encode WAV: zero audio samples were captured.');
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = normalizedSampleRate * blockAlign;
  const dataBytes = totalSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = Linear PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = mono)
  view.setUint32(24, normalizedSampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataBytes, true); // Subchunk2Size

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      const raw = Number.isFinite(chunk[i]) ? chunk[i] : 0;
      const sample = Math.max(-1, Math.min(1, raw));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function parseAndValidateWav(buffer: ArrayBuffer): WavValidationResult {
  const actualByteLength = buffer ? buffer.byteLength : 0;
  if (!buffer || actualByteLength < 44) {
    return {
      valid: false,
      error: `WAV buffer too small (${actualByteLength} bytes, minimum 44 bytes required).`,
      riffHeader: '',
      waveHeader: '',
      fmtHeader: '',
      fmtChunkSize: 0,
      dataHeader: '',
      fileSizeField: 0,
      actualByteLength,
      audioFormat: 0,
      numChannels: 0,
      sampleRate: 0,
      byteRate: 0,
      expectedByteRate: 0,
      blockAlign: 0,
      expectedBlockAlign: 0,
      bitsPerSample: 0,
      dataByteLength: 0,
      sampleCount: 0,
      nonZeroSampleCount: 0,
      nonZeroRatio: 0,
      hasNonZeroAudio: false,
      firstNonZeroSampleIndex: -1,
      durationSeconds: 0,
      peakAmplitude: 0,
      rmsAmplitude: 0,
      headerHexPreview: '',
    };
  }

  const view = new DataView(buffer);
  const headerBytes = new Uint8Array(buffer, 0, Math.min(44, actualByteLength));
  const headerHexPreview = Array.from(headerBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

  const riffHeader = readWavString(view, 0, 4);
  const fileSizeField = view.getUint32(4, true);
  const waveHeader = readWavString(view, 8, 4);
  const fmtHeader = readWavString(view, 12, 4);
  const fmtChunkSize = view.getUint32(16, true);
  const audioFormat = view.getUint16(20, true);
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const byteRate = view.getUint32(28, true);
  const blockAlign = view.getUint16(32, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataHeader = readWavString(view, 36, 4);
  const dataByteLength = view.getUint32(40, true);

  const expectedBlockAlign = numChannels * (bitsPerSample / 8);
  const expectedByteRate = sampleRate * expectedBlockAlign;
  const sampleCount = expectedBlockAlign > 0 ? Math.floor(dataByteLength / expectedBlockAlign) : 0;
  const durationSeconds = sampleRate > 0 ? sampleCount / sampleRate : 0;

  let peakAmplitude = 0;
  let sumSquares = 0;
  let nonZeroSampleCount = 0;
  let firstNonZeroSampleIndex = -1;
  let totalDecodedSamples = 0;

  if (bitsPerSample === 16 && actualByteLength >= 44) {
    const safeEndOffset = Math.min(actualByteLength, 44 + dataByteLength);
    let sampleIdx = 0;
    for (let offset = 44; offset + 1 < safeEndOffset; offset += 2) {
      const int16 = view.getInt16(offset, true);
      if (int16 !== 0) {
        nonZeroSampleCount += 1;
        if (firstNonZeroSampleIndex === -1) {
          firstNonZeroSampleIndex = sampleIdx;
        }
      }
      const norm = int16 < 0 ? Math.abs(int16 / 0x8000) : int16 / 0x7fff;
      if (norm > peakAmplitude) {
        peakAmplitude = norm;
      }
      sumSquares += norm * norm;
      totalDecodedSamples += 1;
      sampleIdx += 1;
    }
  }

  const rmsAmplitude =
    totalDecodedSamples > 0 ? Math.sqrt(sumSquares / totalDecodedSamples) : 0;
  const nonZeroRatio = sampleCount > 0 ? nonZeroSampleCount / sampleCount : 0;
  const hasNonZeroAudio = nonZeroSampleCount > 0;

  let error: string | undefined;
  if (riffHeader !== 'RIFF') {
    error = `Invalid RIFF header: "${riffHeader}"`;
  } else if (waveHeader !== 'WAVE') {
    error = `Invalid WAVE header: "${waveHeader}"`;
  } else if (fmtHeader !== 'fmt ') {
    error = `Invalid fmt chunk header: "${fmtHeader}"`;
  } else if (fmtChunkSize !== 16) {
    error = `Unexpected PCM fmt chunk size: ${fmtChunkSize}`;
  } else if (audioFormat !== 1) {
    error = `Unsupported WAV audio format ${audioFormat} (expected 1 for Linear PCM)`;
  } else if (numChannels < 1) {
    error = `Invalid channel count: ${numChannels}`;
  } else if (sampleRate < 8000 || sampleRate > 192000) {
    error = `Out-of-range sample rate: ${sampleRate} Hz`;
  } else if (bitsPerSample !== 16) {
    error = `Unsupported bit depth: ${bitsPerSample} (expected 16-bit PCM)`;
  } else if (blockAlign !== expectedBlockAlign) {
    error = `BlockAlign mismatch: header=${blockAlign}, expected=${expectedBlockAlign}`;
  } else if (byteRate !== expectedByteRate) {
    error = `ByteRate mismatch: header=${byteRate}, expected=${expectedByteRate}`;
  } else if (dataHeader !== 'data') {
    error = `Invalid data chunk header: "${dataHeader}"`;
  } else if (dataByteLength <= 0) {
    error = 'WAV data chunk contains 0 bytes of audio samples.';
  } else if (fileSizeField !== 36 + dataByteLength) {
    error = `RIFF chunk size mismatch: header=${fileSizeField}, expected=${36 + dataByteLength}`;
  } else if (actualByteLength !== 44 + dataByteLength) {
    error = `WAV buffer byteLength mismatch: actual=${actualByteLength}, expected=${44 + dataByteLength}`;
  }

  return {
    valid: !error,
    error,
    riffHeader,
    waveHeader,
    fmtHeader,
    fmtChunkSize,
    dataHeader,
    fileSizeField,
    actualByteLength,
    audioFormat,
    numChannels,
    sampleRate,
    byteRate,
    expectedByteRate,
    blockAlign,
    expectedBlockAlign,
    bitsPerSample,
    dataByteLength,
    sampleCount,
    nonZeroSampleCount,
    nonZeroRatio,
    hasNonZeroAudio,
    firstNonZeroSampleIndex,
    durationSeconds,
    peakAmplitude,
    rmsAmplitude,
    headerHexPreview,
  };
}

export function resampleMonoAudio(
  input: Float32Array,
  sourceRate: number,
  targetRate = 16000
): Float32Array {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!sourceRate || sourceRate === targetRate) return input;
  const outputLength = Math.max(1, Math.round((input.length * targetRate) / sourceRate));
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / targetRate;

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const weight = position - leftIndex;
    output[i] = input[leftIndex] * (1 - weight) + input[rightIndex] * weight;
  }

  return output;
}

const READY_STATE_LABELS: Record<number, string> = {
  0: 'HAVE_NOTHING (0)',
  1: 'HAVE_METADATA (1)',
  2: 'HAVE_CURRENT_DATA (2)',
  3: 'HAVE_FUTURE_DATA (3)',
  4: 'HAVE_ENOUGH_DATA (4)',
};

const NETWORK_STATE_LABELS: Record<number, string> = {
  0: 'NETWORK_EMPTY (0)',
  1: 'NETWORK_IDLE (1)',
  2: 'NETWORK_LOADING (2)',
  3: 'NETWORK_NO_SOURCE (3)',
};

export function describeMediaElementError(
  errorCode: number | null | undefined,
  errorMessage?: string | null,
  src?: string | null
): string {
  const isBlobSrc = Boolean(src && src.startsWith('blob:'));
  switch (errorCode) {
    case 1:
      return 'Audio playback was aborted before completion (MEDIA_ERR_ABORTED, code 1).';
    case 2:
      return 'A network or blob read error interrupted audio loading (MEDIA_ERR_NETWORK, code 2).';
    case 3:
      return 'The browser failed to decode the audio data (MEDIA_ERR_DECODE, code 3). Verify the WAV header or file integrity.';
    case 4:
      return isBlobSrc
        ? 'The browser rejected the recorded blob: audio source (MEDIA_ERR_SRC_NOT_SUPPORTED, code 4). This occurs if Content-Security-Policy omits media-src blob: or if the WAV buffer is empty.'
        : 'The selected audio format or source is not supported by this browser (MEDIA_ERR_SRC_NOT_SUPPORTED, code 4).';
    default:
      return errorMessage
        ? `Audio playback error: ${errorMessage}`
        : 'Audio playback failed due to an unknown media element error.';
  }
}

export function extractAudioElementDiagnostics(
  event: string,
  audioEl: {
    currentSrc?: string;
    src?: string;
    duration?: number;
    readyState?: number;
    networkState?: number;
    paused?: boolean;
    muted?: boolean;
    volume?: number;
    canPlayType?: (type: string) => string;
    error?: { code?: number; message?: string } | null;
  }
): AudioElementDiagnostics {
  const rawDur = audioEl.duration;
  const validDuration =
    typeof rawDur === 'number' && Number.isFinite(rawDur) && rawDur >= 0 ? rawDur : null;
  const readyState = typeof audioEl.readyState === 'number' ? audioEl.readyState : 0;
  const networkState = typeof audioEl.networkState === 'number' ? audioEl.networkState : 0;
  const errorCode = audioEl.error?.code ?? null;
  const errorMessage = audioEl.error?.message ?? null;
  const src = audioEl.currentSrc || audioEl.src || '';
  const canPlayWav =
    typeof audioEl.canPlayType === 'function'
      ? audioEl.canPlayType('audio/wav; codecs="1"') || audioEl.canPlayType('audio/wav') || 'unknown'
      : 'unknown';

  return {
    event,
    src,
    duration: validDuration,
    rawDuration: String(rawDur),
    readyState,
    readyStateLabel: READY_STATE_LABELS[readyState] || `UNKNOWN (${readyState})`,
    networkState,
    networkStateLabel: NETWORK_STATE_LABELS[networkState] || `UNKNOWN (${networkState})`,
    canPlayWav,
    paused: Boolean(audioEl.paused ?? true),
    muted: Boolean(audioEl.muted ?? false),
    volume: typeof audioEl.volume === 'number' ? audioEl.volume : 1,
    errorCode,
    errorMessage,
    humanError: errorCode ? describeMediaElementError(errorCode, errorMessage, src) : null,
  };
}

export class SafeObjectUrlManager {
  private currentUrl: string | null = null;
  private revokedUrls: string[] = [];

  replaceWithBlob(blob: Blob): string {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.revokedUrls.push(this.currentUrl);
    }
    const nextUrl = URL.createObjectURL(blob);
    this.currentUrl = nextUrl;
    return nextUrl;
  }

  clear(): void {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.revokedUrls.push(this.currentUrl);
      this.currentUrl = null;
    }
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  getRevokedUrls(): string[] {
    return [...this.revokedUrls];
  }
}

export interface UseAudioRecorderOptions {
  onRecordingComplete?: (
    blob: Blob,
    mimeType: string,
    diagnostics: RecordingLifecycleDiagnostics
  ) => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isRequestingMic: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioMimeType: string;
  micError: MicError | null;
  diagnostics: RecordingLifecycleDiagnostics | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearAudio: () => void;
  setManualAudio: (blob: Blob, mimeType: string) => string;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/wav');
  const [micError, setMicError] = useState<MicError | null>(null);
  const [diagnostics, setDiagnostics] = useState<RecordingLifecycleDiagnostics | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const startTimestampRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const urlManagerRef = useRef<SafeObjectUrlManager>(new SafeObjectUrlManager());

  const stopRecordingGraph = useCallback(async () => {
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
      try {
        await audioContextRef.current.close();
      } catch {
        // Ignore already closed AudioContext
      }
      audioContextRef.current = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      urlManagerRef.current.clear();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      void stopRecordingGraph();
    };
  }, [stopRecordingGraph]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    setMicError(null);
    setIsRequestingMic(true);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError({
        type: 'INSECURE_CONTEXT',
        category: 'mic',
        message: 'Microphone recording requires a secure HTTPS connection.',
      });
      setIsRequestingMic(false);
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError({
        type: 'NOT_SUPPORTED',
        category: 'mic',
        message: 'Your browser does not support audio recording via getUserMedia.',
      });
      setIsRequestingMic(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await stopRecordingGraph();

      activeStreamRef.current = stream;
      pcmChunksRef.current = [];
      startTimestampRef.current = Date.now();

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioContextCtor();
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume();
      }

      sampleRateRef.current = Math.round(context.sampleRate || 44100);

      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);
      const silentGain = context.createGain();
      silentGain.gain.value = 0;

      sourceNodeRef.current = source;
      processorRef.current = processor;
      silentGainRef.current = silentGain;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const input = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);

      if (context.state === 'suspended') {
        await context.resume();
      }

      setAudioMimeType('audio/wav');
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error: any) {
      let errorMessage = 'Microphone permission was denied by the browser or system.';
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone device was detected on your machine.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage =
          'Microphone permission was denied. If browser permission is already "Allow", check macOS System Settings → Privacy & Security → Microphone.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage =
          'Microphone hardware is currently locked or in use by another application (e.g., Zoom, Teams, or another tab).';
      }

      setMicError({
        type: error.name || 'UNKNOWN',
        category: 'mic',
        message: errorMessage,
        raw: error.message || String(error),
      });
    } finally {
      setIsRequestingMic(false);
    }
  }, [stopRecordingGraph]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);

    const tracks = activeStreamRef.current?.getAudioTracks?.() || [];
    const primaryTrack = tracks[0];
    const trackSettings = primaryTrack?.getSettings ? primaryTrack.getSettings() : {};
    const trackLabel = primaryTrack?.label || 'Default Microphone';
    const trackReadyState = primaryTrack?.readyState || 'ended';
    const trackEnabled = primaryTrack?.enabled ?? true;
    const trackMuted = (primaryTrack as any)?.muted ?? false;
    const contextState = audioContextRef.current?.state || 'closed';
    const sourceChannelCount = sourceNodeRef.current?.channelCount ?? 1;
    const processorChannelCount = processorRef.current?.channelCount ?? 1;
    const destinationMaxChannelCount =
      audioContextRef.current?.destination?.maxChannelCount ?? 2;
    const elapsedSeconds = Math.max(0.1, (Date.now() - startTimestampRef.current) / 1000);

    await stopRecordingGraph();

    const chunks = pcmChunksRef.current;
    const stats = computePcmStats(chunks);

    if (stats.totalSamples === 0) {
      setMicError({
        type: 'EMPTY_RECORDING',
        category: 'recording',
        message:
          'No audio samples were captured before stopping. Please record for at least 1 second and check that your microphone is not muted.',
      });
      return;
    }

    const blob = encodeWav(chunks, sampleRateRef.current);
    const buffer = await blob.arrayBuffer();
    const validation = parseAndValidateWav(buffer);

    if (!validation.valid) {
      setMicError({
        type: 'WAV_VALIDATION_FAILED',
        category: 'recording',
        message: `Generated WAV failed validation: ${validation.error}`,
      });
      return;
    }

    const url = urlManagerRef.current.replaceWithBlob(blob);
    const lifecycleDiag: RecordingLifecycleDiagnostics = {
      trackCount: tracks.length,
      trackLabel,
      trackReadyState,
      trackEnabled,
      trackMuted,
      trackSampleRate: trackSettings.sampleRate,
      trackChannelCount: trackSettings.channelCount,
      audioContextState: contextState,
      sampleRate: validation.sampleRate,
      channelCount: validation.numChannels,
      sourceChannelCount,
      processorChannelCount,
      destinationMaxChannelCount,
      chunkCount: stats.chunkCount,
      totalSamples: stats.totalSamples,
      nonZeroSampleCount: stats.nonZeroSampleCount,
      nonZeroRatio: stats.nonZeroRatio,
      hasNonZeroAudio: stats.hasNonZeroAudio && validation.hasNonZeroAudio,
      peakAmplitude: stats.peakAmplitude,
      rmsAmplitude: stats.rmsAmplitude,
      elapsedSeconds,
      wavDurationSeconds: validation.durationSeconds,
      blobSizeBytes: blob.size,
      mimeType: blob.type,
      wavHeaderValid: validation.valid,
    };

    setDiagnostics(lifecycleDiag);
    setAudioBlob(blob);
    setAudioMimeType('audio/wav');
    setAudioUrl(url);
    options?.onRecordingComplete?.(blob, 'audio/wav', lifecycleDiag);
  }, [isRecording, options, stopRecordingGraph]);

  const clearAudio = useCallback(() => {
    urlManagerRef.current.clear();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setMicError(null);
    setDiagnostics(null);
    pcmChunksRef.current = [];
    void stopRecordingGraph();
  }, [stopRecordingGraph]);

  const setManualAudio = useCallback(
    (blob: Blob, mimeType: string) => {
      void stopRecordingGraph();
      pcmChunksRef.current = [];
      setRecordingTime(0);
      setMicError(null);
      setDiagnostics(null);
      const nextUrl = urlManagerRef.current.replaceWithBlob(blob);
      setAudioBlob(blob);
      setAudioMimeType(mimeType || blob.type || 'audio/wav');
      setAudioUrl(nextUrl);
      return nextUrl;
    },
    [stopRecordingGraph]
  );

  return {
    isRecording,
    isRequestingMic,
    recordingTime,
    audioBlob,
    audioUrl,
    audioMimeType,
    micError,
    diagnostics,
    startRecording,
    stopRecording,
    clearAudio,
    setManualAudio,
  };
}
