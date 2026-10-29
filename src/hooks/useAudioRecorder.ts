import { useState, useRef, useEffect, useCallback } from 'react';

export interface MicError {
  type: string;
  message: string;
  raw?: string;
}

export interface UseAudioRecorderOptions {
  onRecordingComplete?: (blob: Blob, mimeType: string) => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isRequestingMic: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioMimeType: string;
  micError: MicError | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAudio: () => void;
  setManualAudio: (blob: Blob, mimeType: string, url: string) => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [micError, setMicError] = useState<MicError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  // Handle timer during active recording
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

  const initMediaRecorder = useCallback(
    (stream: MediaStream) => {
      activeStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported
          ? MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/wav'
          : 'audio/webm';

      setAudioMimeType(mimeType);

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((track) => track.stop());
          activeStreamRef.current = null;
        }

        options?.onRecordingComplete?.(blob, mimeType);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
    },
    [options]
  );

  const startRecording = useCallback(async () => {
    setMicError(null);
    setIsRequestingMic(true);

    // Security Context Check
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError({
        type: 'INSECURE_CONTEXT',
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
        message: 'Your browser does not support audio recording via getUserMedia.',
      });
      setIsRequestingMic(false);
      return;
    }

    try {
      // Standard audio request compatible across all modern Chromium & WebKit browsers
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      initMediaRecorder(stream);
    } catch (error: any) {
      console.error('Audio capture error:', error);
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
        message: errorMessage,
        raw: error.message || String(error),
      });
    } finally {
      setIsRequestingMic(false);
    }
  }, [initMediaRecorder]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
      setIsRecording(false);
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, [isRecording]);

  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setMicError(null);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }, [audioUrl]);

  const setManualAudio = useCallback(
    (blob: Blob, mimeType: string, url: string) => {
      clearAudio();
      setAudioBlob(blob);
      setAudioMimeType(mimeType);
      setAudioUrl(url);
    },
    [clearAudio]
  );

  return {
    isRecording,
    isRequestingMic,
    recordingTime,
    audioBlob,
    audioUrl,
    audioMimeType,
    micError,
    startRecording,
    stopRecording,
    clearAudio,
    setManualAudio,
  };
}
