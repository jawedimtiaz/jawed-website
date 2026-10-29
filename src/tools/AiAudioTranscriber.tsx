import React, { useState, useRef, useEffect } from 'react';
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

  // Initialize MediaRecorder helper
  const initMediaRecorder = (stream: MediaStream) => {
    activeStreamRef.current = stream;
    audioChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/wav';

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType });
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = mediaRecorder;
    // The browser may choose a different format if the requested MIME type is unsupported.
    const actualMimeType = mediaRecorder.mimeType || mimeType;
    setAudioMimeType(actualMimeType);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
        console.debug("[Audio Transcriber] Captured audio chunk", {
          chunkBytes: event.data.size,
          totalChunks: audioChunksRef.current.length,
          totalBytes: audioChunksRef.current.reduce((total, chunk) => total + chunk.size, 0),
          mimeType: event.data.type || mediaRecorder.mimeType || actualMimeType,
        });
      }
    };

    mediaRecorder.onerror = (event: Event) => {
      console.error("[Audio Transcriber] MediaRecorder error", event);
      setErrorMsg("The browser encountered an error while recording. Please try again or upload an audio file.");
      setIsRecording(false);
    };

    mediaRecorder.onstop = () => {
      // MediaRecorder dispatches the final dataavailable event before onstop.
      // Use its actual MIME type, not only the requested preference.
      const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || actualMimeType });
      if (blob.size < 128) {
        console.error("[Audio Transcriber] Recording produced no usable audio", {
          blobBytes: blob.size,
          chunkCount: audioChunksRef.current.length,
          chunkBytes: audioChunksRef.current.map((chunk) => chunk.size),
          requestedMimeType: actualMimeType,
          actualMimeType: mediaRecorder.mimeType,
        });
        setAudioBlob(null);
        setAudioUrl(null);
        setErrorMsg('The browser returned an empty or incomplete recording. Please record for at least 2 seconds and try again, or upload an audio file.');
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((track) => track.stop());
          activeStreamRef.current = null;
        }
        return;
      }
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setFileName(`Voice_Recording_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`);
      
      // Clean up tracks
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };

    mediaRecorder.start(250); // collecting chunks every 250ms
    setIsRecording(true);
    setRecordingTime(0);
    setTranscriptResult(null);
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

      initMediaRecorder(stream);
    } catch (err: any) {
      handleDetailedMicError(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        const recorder = mediaRecorderRef.current;
        // Ask the browser to flush the last encoded chunk before stop(). This
        // is important for short recordings and browsers with delayed encoders.
        if (recorder.state === 'recording') {
          try {
            recorder.requestData();
          } catch (requestDataError) {
            console.warn('[Audio Transcriber] requestData() could not flush a chunk:', requestDataError);
          }
          recorder.stop();
        }
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
        setErrorMsg('The recording could not be finalized. Please try recording again.');
      }
      setIsRecording(false);
    }
    // Do not stop tracks here: MediaRecorder still needs to flush its final
    // dataavailable event. The onstop handler releases the stream after the Blob is built.
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
    if (!audioBlob) {
      setErrorMsg('Please record audio or upload an audio file first.');
      return;
    }

    if (!isOnline) {
      setErrorMsg('Audio transcription requires an active internet connection.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setTranscriptResult(null);

    try {
      const base64Audio = await convertBlobToBase64(audioBlob);

      if (audioBlob.size < 128) {
        throw new Error('This recording contains no usable audio data. Please record again or upload an audio file.');
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioMimeType || audioBlob.type || 'audio/webm',
          contextMode,
          prompt: contextMode === 'custom' ? customPrompt : undefined,
        }),
      });

      // Read the body as text first so a proxy/404/empty server response does
      // not hide the actual HTTP status behind "Unexpected end of JSON input".
      const responseText = await response.text();
      let data: any = null;
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(`Transcription service returned a non-JSON response (HTTP ${response.status}). Please retry shortly.`);
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Transcription failed (HTTP ${response.status}).`);
      }
      if (!data || typeof data.transcript !== 'string' || !data.transcript.trim()) {
        throw new Error('Transcription service returned no transcript. Please try a longer recording or upload an audio file.');
      }

      setTranscriptResult(data.transcript);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMsg(err.message || 'Error communicating with Gemini transcription service.');
    } finally {
      setLoading(false);
    }
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
            <Sparkles size={16} /> Powered by Gemini 3.5 Transcribe
          </div>
          <h1 className="page-title">AI Audio Transcriber &amp; Voice Note Assistant</h1>
          <p className="page-lead">
            Record support phone calls, spoken troubleshooting notes, or upload voice memos. Get high-precision transcripts, structured ITSM ticket updates, and technical key takeaways in seconds.
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
            <AlertCircle size={20} /> AI Audio Transcription requires an active internet connection.
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
                <option value="service_desk">🎫 Service Desk Ticket Note (ITSM Format)</option>
                <option value="summary_only">📝 Executive Action Items &amp; Key Decisions</option>
                <option value="custom">💬 Custom Instructions / Prompt</option>
              </select>

              {contextMode === 'custom' && (
                <div style={{ marginTop: '10px' }}>
                  <label htmlFor="customPrompt" style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Specific Transcription Instructions:
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
                    <RefreshCw size={18} className="spin" /> Transcribing with Gemini 3.5...
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
                AI Output &amp; Transcript
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
                  <p style={{ margin: 0, fontWeight: 600 }}>Analyzing audio with Gemini 3.5 Transcribe...</p>
                  <small style={{ color: 'var(--muted)' }}>Processing speech recognition and technical context</small>
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
