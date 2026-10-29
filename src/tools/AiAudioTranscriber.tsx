import React, { useState, useRef, useEffect } from 'react';

// Reuse the model during this page session; inference runs locally in the visitor's browser.
let localWhisperPipeline: any = null;
let localWhisperPipelinePromise: Promise<any> | null = null;
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Mic, Square, Play, Pause, Trash2, Upload, FileAudio, Copy, Check, Download, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const AiAudioTranscriber: React.FC = () => {
  const isOnline = useOnlineStatus();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [fileName, setFileName] = useState<string>('');

  // Custom prompt & mode state
  const [contextMode, setContextMode] = useState<'standard' | 'service_desk' | 'summary_only' | 'custom'>('standard');
  const [customPrompt, setCustomPrompt] = useState('');

  // Result & Loading states
  const [loading, setLoading] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ name?: string; message?: string; stack?: string } | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio URL and media streams on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  // Record raw PCM with Web Audio and wrap it in a WAV container.
  // This avoids browser-specific MediaRecorder container/fragmentation problems
  // that can produce a 0:00 player in Safari, Chrome, and Edge.
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleRateRef = useRef(44100);

  const encodePcmWav = (chunks: Float32Array[], sampleRate: number): Blob => {
    const sampleCount = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    if (sampleCount === 0) throw new Error('No microphone samples were captured. Please try recording again.');
    const bytesPerSample = 2;
    const dataBytes = sampleCount * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const writeText = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, dataBytes, true);
    let offset = 44;
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const initPcmRecorder = async (stream: MediaStream) => {
    activeStreamRef.current = stream;
    pcmChunksRef.current = [];
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('This browser does not support Web Audio recording.');
    }
    const context: AudioContext = new AudioContextCtor();
    audioContextRef.current = context;
    await context.resume();
    pcmSampleRateRef.current = context.sampleRate;
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    audioSourceRef.current = source;
    audioProcessorRef.current = processor;
    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const samples = event.inputBuffer.getChannelData(0);
      pcmChunksRef.current.push(new Float32Array(samples));
    };
    // Connect through a zero-gain node so processing continues without microphone
    // monitoring/feedback through the speakers.
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);
    setAudioMimeType('audio/wav');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscriptResult(null);
    setIsRecording(true);
  };

  const finishPcmRecording = async () => {
    const processor = audioProcessorRef.current;
    const source = audioSourceRef.current;
    const context = audioContextRef.current;
    if (processor) {
      processor.onaudioprocess = null;
      try { processor.disconnect(); } catch {}
    }
    if (source) {
      try { source.disconnect(); } catch {}
    }
    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];
    try {
      if (!chunks.length) throw new Error('No audio samples were captured. Check microphone input and record again.');
      const blob = encodePcmWav(chunks, pcmSampleRateRef.current);
      if (blob.size < 1024) throw new Error('The recording is too short or empty. Please record for at least 2 seconds.');
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioMimeType('audio/wav');
      setAudioUrl(url);
      setFileName(`Voice_Recording_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.wav`);
      setErrorMsg(null);
      setErrorDetails(null);
      console.info('[Audio Transcriber] WAV recording finalized', { bytes: blob.size, sampleRate: pcmSampleRateRef.current, chunks: chunks.length });
    } catch (err: any) {
      console.error('[Audio Transcriber] WAV recording failed:', err);
      setErrorDetails({ name: err?.name || 'RecordingError', message: err?.message || String(err), stack: err?.stack || '' });
      setErrorMsg(err?.message || 'Recording could not be finalized. Please try again.');
    } finally {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      audioContextRef.current = null;
      if (context && context.state !== 'closed') await context.close().catch(() => undefined);
    }
  };

  // Detailed error handler with triaging
  const handleDetailedMicError = (err: any) => {
    const errorName = err?.name || 'UnknownError';
    const errorMessage = err?.message || 'Access denied';
    const errorStack = err?.stack || '';

    setErrorDetails({ name: errorName, message: errorMessage, stack: errorStack });

    console.group(`🎙️ [MediaDevices Debugger] Microphone Access Failure: ${errorName}`);
    console.error('Error Name:', errorName);
    console.error('Error Message:', errorMessage);
    console.error('Error Stack:', errorStack);
    console.info('Is secure context (HTTPS/localhost):', window.isSecureContext);
    console.info('Navigator mediaDevices supported:', !!navigator.mediaDevices);
    console.info('User Agent:', navigator.userAgent);
    console.groupEnd();

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }

    let friendlyReason = 'Microphone access was blocked or is unavailable.';
    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
      friendlyReason = 'Microphone permission was denied by the browser or system policy.';
    } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorMessage === 'NO_AUDIO_INPUT_DEVICES') {
      friendlyReason = 'No microphone device was detected on your system.';
    } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      friendlyReason = 'Your microphone is currently in use by another application or tab.';
    } else if (!window.isSecureContext) {
      friendlyReason = 'Microphone recording requires a secure context (HTTPS or localhost).';
    }

    setErrorMsg(`${friendlyReason} (${errorName}: ${errorMessage})`);
  };

  // Acquire the default microphone on an explicit user click. Keep constraints
  // optional and avoid exact deviceId constraints, which can turn a permission
  // or device problem into a misleading OverconstrainedError on Chromium browsers.
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      setErrorDetails(null);

      if (window.self !== window.top) {
        try {
          const docAny = document as any;
          const policy = docAny.permissionsPolicy || docAny.featurePolicy;
          if (policy && typeof policy.allowsFeature === 'function' && !policy.allowsFeature('microphone')) {
            throw new Error('MICROPHONE_BLOCKED_BY_EMBEDDING_POLICY');
          }
        } catch (policyErr: any) {
          if (policyErr?.message === 'MICROPHONE_BLOCKED_BY_EMBEDDING_POLICY') throw policyErr;
          console.warn('Could not inspect iframe microphone policy:', policyErr);
        }
      }

      if (!window.isSecureContext) {
        throw new Error('Microphone recording requires HTTPS or localhost.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser or context.');
      }

      // Call getUserMedia immediately from the explicit button click. Avoid awaiting
      // the Permissions API first: permission-state queries are diagnostic only,
      // and must not delay the actual browser permission request.
      let stream: MediaStream;
      try {
        // These are preferences, not mandatory device requirements.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
      } catch (firstError) {
        console.warn('Microphone request with audio-processing preferences failed; retrying with basic audio:', firstError);
        try {
          // Broadest supported request: let the browser choose an available input.
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (finalError: any) {
          // Enumerate only for diagnostics. Do not request a device using
          // deviceId: { exact: ... }; that can fail with OverconstrainedError.
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            if (!devices.some((device) => device.kind === 'audioinput')) {
              handleDetailedMicError(new Error('NO_AUDIO_INPUT_DEVICES'));
              return;
            }
          } catch (enumerationError) {
            console.warn('Could not enumerate audio inputs for diagnostics:', enumerationError);
          }
          handleDetailedMicError(finalError || firstError);
          return;
        }
      }

      await initPcmRecorder(stream);
    } catch (err: any) {
      handleDetailedMicError(err);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    void finishPcmRecording();
  };

  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setFileName('');
    setTranscriptResult(null);
    setErrorMsg(null);
    setErrorDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds 25MB limit. Please upload a smaller audio clip.');
      return;
    }

    clearAudio();
    setErrorMsg(null);
    setFileName(file.name);
    setAudioBlob(file);
    setAudioMimeType(file.type || 'audio/mp3');
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleTranscribe = async () => {
    if (!audioBlob) { setErrorMsg('Please record audio or upload an audio file first.'); return; }
    if (!isOnline) {
      setErrorMsg('An internet connection is needed to download the speech model the first time. Audio is processed locally in your browser.');
      return;
    }
    if (audioBlob.size < 128) { setErrorMsg('This recording contains no usable audio data. Please record again or upload another file.'); return; }

    setLoading(true);
    setErrorMsg(null);
    setTranscriptResult(null);
    try {
      // Transformers.js loads a small open-source model; inference stays in this browser tab.
      if (!localWhisperPipeline) {
        if (!localWhisperPipelinePromise) {
          localWhisperPipelinePromise = (async () => {
            const moduleUrl = 'https://esm.sh/@huggingface/transformers@3.7.2?bundle';
            // @ts-ignore - runtime-only ESM import, intentionally excluded from Vite bundling.
            const transformers = await import(/* @vite-ignore */ moduleUrl);
            return transformers.pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
              device: 'wasm',
              dtype: 'q8',
              progress_callback: (progress: any) => {
                if (progress?.status === 'progress' && typeof progress.progress === 'number') {
                  console.info('[Audio Transcriber] Speech model download', Math.round(progress.progress), '%');
                }
              },
            });
          })();
        }
        try { localWhisperPipeline = await localWhisperPipelinePromise; }
        catch (modelError) { localWhisperPipelinePromise = null; throw modelError; }
      }

      // Decode supported browser audio, downmix to mono, and resample to Whisper's 16 kHz input.
      const audioContext = new AudioContext();
      try {
        const decoded = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
        const targetRate = 16000;
        const targetLength = Math.ceil(decoded.duration * targetRate);
        if (!Number.isFinite(targetLength) || targetLength < 1 || targetLength > targetRate * 60 * 30) {
          throw new Error('Audio duration is invalid or exceeds the 30-minute local processing limit.');
        }
        const offline = new OfflineAudioContext(1, targetLength, targetRate);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start(0);
        const resampled = await offline.startRendering();
        const result = await localWhisperPipeline(resampled.getChannelData(0), {
          sampling_rate: targetRate, chunk_length_s: 30, stride_length_s: 5, return_timestamps: false,
        });
        const transcript = typeof result?.text === 'string' ? result.text.trim() : '';
        if (!transcript) throw new Error('No speech was detected. Try a longer or clearer recording.');

        let output = transcript;
        if (contextMode === 'service_desk') {
          output = ['### Issue Description & Symptoms', transcript, '', '### Diagnostics & Troubleshooting Taken',
            'Not specified in the transcript.', '', '### Resolution / Pending Next Steps',
            'Review the transcript and confirm any required follow-up.'].join('\n');
        } else if (contextMode === 'summary_only') {
          output = '### Transcript\n' + transcript + '\n\n### Note\nThis is a transcript, not an AI-generated summary.';
        } else if (contextMode === 'custom' && customPrompt.trim()) {
          output = '### Transcript\n' + transcript + '\n\n### Your note\n' + customPrompt.trim() +
            '\n\nNote: custom instructions are included as a note; no separate generative model is used.';
        } else {
          output = '### Full Transcript\n' + transcript;
        }
        setTranscriptResult(output);
      } finally {
        await audioContext.close().catch(() => undefined);
      }
    } catch (err: any) {
      console.error('[Audio Transcriber] Local transcription failed:', err);
      const message = String(err?.message || err || 'Unknown error');
      setErrorDetails({ name: err?.name || 'TranscriptionError', message, stack: err?.stack || '' });
      if (/decode|encoding|supported source/i.test(message)) {
        setErrorMsg('The browser could not decode this audio format. Try exporting it as WAV or MP3, then upload it again.');
      } else if (/fetch|network|download|failed to load|failed to fetch|networkerror|load failed/i.test(message)) {
        setErrorMsg('The free speech model could not be downloaded. Open Debug Log for the underlying browser error. Check network/content blockers and retry.');
      } else {
        setErrorMsg('Local transcription failed: ' + message);
      }
    } finally { setLoading(false); }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    if (!transcriptResult) return;
    navigator.clipboard.writeText(transcriptResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!transcriptResult) return;
    const blob = new Blob([transcriptResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'Transcription'}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tools', href: '/tools' },
              { label: 'AI Audio Transcriber & Voice Notes' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="AI Audio Transcriber & Voice Note Assistant"
            text="Record or upload audio to generate crystal-clear transcripts, ITSM ticket notes, and technical summaries powered by Gemini 3.5 Transcribe."
          />
        </div>

        <header className="page-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '20px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>
            <Sparkles size={16} /> Free, local browser transcription
          </div>
          <h1 className="page-title">AI Audio Transcriber &amp; Voice Note Assistant</h1>
          <p className="page-lead">
            Record voice notes or upload audio to generate a transcript locally in your browser. No transcription API charges; first use downloads an open-source speech model.
          </p>
        </header>

        {!isOnline && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              color: '#fca5a5',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            role="status"
          >
            <AlertCircle size={20} /> The free speech model needs an internet connection for its first download. Audio processing runs locally.
          </div>
        )}

        <div className="workspace" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Input Panel */}
          <div className="panel" style={{ background: 'var(--surface)', borderRadius: '12px', padding: '24px', border: '1px solid var(--line)' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', marginBottom: '16px' }}>
              <Mic size={20} className="text-primary" /> Audio Input Source
            </h2>

            {/* Microphone Recording Section */}
            <div style={{ background: 'var(--surface-elevated, rgba(15, 23, 42, 0.4))', borderRadius: '10px', padding: '20px', textAlign: 'center', border: '1px border-dashed var(--line)', marginBottom: '20px' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                Direct Microphone Voice Note
              </p>

              {isRecording ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 700, fontSize: '1.25rem' }}>
                    <span className="pulse-indicator" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                    {formatTimer(recordingTime)}
                  </div>
                  <button
                    type="button"
                    className="button"
                    onClick={stopRecording}
                    style={{ background: '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Square size={18} /> Stop Recording
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={startRecording}
                    disabled={loading}
                    style={{ padding: '10px 20px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Mic size={18} /> Record Voice
                  </button>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', margin: '14px 0', position: 'relative' }}>
              <span style={{ background: 'var(--surface)', padding: '0 12px', color: 'var(--muted)', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
                OR UPLOAD AUDIO FILE (100% INDEPENDENT)
              </span>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--line)', zIndex: 0 }}></div>
            </div>

            {/* File Upload Drop Zone - Always operational regardless of mic state */}
            <div style={{ border: '2px dashed var(--line)', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-elevated, rgba(15, 23, 42, 0.2))' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="audio-file-input"
              />
              <label htmlFor="audio-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Upload size={28} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Upload Audio File</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Supports MP3, WAV, M4A, WEBM, OGG, AAC (Max 25MB)
                </span>
              </label>
            </div>

            {/* Audio Preview & Status */}
            {audioUrl && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                    <FileAudio size={18} className="text-primary" />
                    {fileName || 'Recorded Audio Clip'}
                  </div>
                  <button
                    type="button"
                    onClick={clearAudio}
                    title="Remove audio"
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
              </div>
            )}

            {/* Transcription Context Options */}
            <div style={{ marginTop: '24px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '0.95rem' }}>
                Transcription Mode &amp; Output Format
              </label>
              <select
                value={contextMode}
                onChange={(e) => setContextMode(e.target.value as any)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.9rem', marginBottom: '12px' }}
              >
                <option value="standard">🎙️ Technical Notes &amp; Full Transcript (Default)</option>
                <option value="service_desk">🎫 Service Desk Ticket Note (transcript-based)</option>
                <option value="summary_only">📝 Transcript Only (no AI summary)</option>
                <option value="custom">💬 Transcript + Custom Note</option>
              </select>

              {contextMode === 'custom' && (
                <div style={{ marginTop: '10px' }}>
                  <label htmlFor="customPrompt" style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Optional note to include below transcript:
                  </label>
                  <textarea
                    id="customPrompt"
                    rows={3}
                    placeholder="e.g. Focus on extracting device serial numbers and customer contact preferences..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.9rem' }}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="button button-primary"
                onClick={handleTranscribe}
                disabled={loading || !audioBlob || !isOnline}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="spin" /> Loading model / transcribing locally...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Transcribe Audio
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#f87171' }}>
                    <AlertCircle size={18} /> Multi-Stage Diagnostic Error
                  </div>
                  <label style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--muted)' }}>
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => setDebugMode(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Debug Log
                  </label>
                </div>

                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{errorMsg}</p>

                {debugMode && errorDetails && (
                  <div style={{ marginBottom: '10px', padding: '10px', background: 'rgba(2, 6, 23, 0.7)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#38bdf8', overflowX: 'auto' }}>
                    <div><strong>Error Name:</strong> {errorDetails.name}</div>
                    <div><strong>Error Message:</strong> {errorDetails.message}</div>
                    {errorDetails.stack && <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px', opacity: 0.85 }}>{errorDetails.stack}</div>}
                  </div>
                )}

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'grid', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#f87171', display: 'block', marginBottom: '2px' }}>a) Browser Address Bar Lock:</strong>
                    Ensure microphone is allowed in the browser address bar lock icon (🔒).
                  </div>
                  <div>
                    <strong style={{ color: '#f87171', display: 'block', marginBottom: '2px' }}>b) macOS / Windows System Permission:</strong>
                    On Mac, check <strong>System Settings → Privacy &amp; Security → Microphone</strong> and ensure your browser (Edge, Chrome, or Safari) is toggled <strong>ON</strong>.
                  </div>
                  <div>
                    <strong style={{ color: '#f87171', display: 'block', marginBottom: '2px' }}>c) Permissions Policy &amp; Iframe Check:</strong>
                    Ensure this page is not rendered inside a restricted iframe without `allow="microphone *"`.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="panel" style={{ background: 'var(--surface)', borderRadius: '12px', padding: '24px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 className="section-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                Transcript &amp; Notes
              </h2>
              {transcriptResult && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleCopy}
                    style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleDownload}
                    style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Export MD
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minHeight: '300px', background: 'var(--surface-elevated, rgba(15, 23, 42, 0.5))', borderRadius: '10px', padding: '18px', border: '1px solid var(--line)', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', color: 'var(--muted)', gap: '14px' }}>
                  <Sparkles size={36} className="text-primary spin" style={{ animationDuration: '3s' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Running Whisper locally in your browser...</p>
                  <small style={{ color: 'var(--muted)' }}>The model is downloaded once and cached by your browser.</small>
                </div>
              ) : transcriptResult ? (
                <div className="tool-output" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem', color: 'var(--text)' }}>
                  {transcriptResult}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px', color: 'var(--muted)', textAlign: 'center' }}>
                  <Mic size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No audio transcribed yet.</p>
                  <small style={{ color: 'var(--muted)', marginTop: '4px' }}>
                    Record a voice note or upload an audio file to see transcript &amp; structured notes here.
                  </small>
                </div>
              )}
            </div>

            {transcriptResult && contextMode === 'service_desk' && (
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Link to="/tools/service-desk-note-formatter" className="button button-secondary" style={{ fontSize: '0.88rem' }}>
                  Open Service Desk Note Formatter →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
