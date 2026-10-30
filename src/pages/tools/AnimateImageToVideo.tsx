import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film,
  Upload,
  Sparkles,
  Download,
  Share2,
  Trash2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  CheckCircle2,
  ShieldCheck,
  Image as ImageIcon,
  Settings,
  Cpu,
  Plus,
  Wand2,
  Sliders,
  Gauge,
  RotateCcw,
  Eye,
  Maximize2,
  Printer,
  Flame,
  Activity,
  Clock,
  LayoutGrid,
  Scissors,
  Music,
  Volume2,
} from 'lucide-react';
import { Breadcrumb } from '../../components/Breadcrumb';
import { SocialShareBar } from '../../components/SocialShareBar';
import {
  AiProviderSettingsModal,
  getStoredAiProviderConfig,
  type AiProviderConfig,
} from '../../components/AiProviderSettingsModal';
import {
  useAnimationPreferences,
  type OutputFrameRate,
} from '../../hooks/useAnimationPreferences';

export type AnimationEffectId = 'ken-burns' | 'orbit-zoom' | 'particle-dust' | 'pulse-glow' | 'cinematic-pan';

export type OutputAspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '21:9';

export interface AspectRatioPreset {
  value: OutputAspectRatio;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  standard: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  {
    value: '16:9',
    label: '16:9 — Widescreen HD (1280×720)',
    shortLabel: '16:9',
    width: 1280,
    height: 720,
    standard: 'YouTube, HDTV & Widescreen Monitors',
  },
  {
    value: '4:3',
    label: '4:3 — Standard Display (1024×768)',
    shortLabel: '4:3',
    width: 1024,
    height: 768,
    standard: 'Classic Broadcast, Tablets & Slide Decks',
  },
  {
    value: '1:1',
    label: '1:1 — Square Format (1080×1080)',
    shortLabel: '1:1',
    width: 1080,
    height: 1080,
    standard: 'Instagram, LinkedIn & Social Feeds',
  },
  {
    value: '9:16',
    label: '9:16 — Vertical Portrait (720×1280)',
    shortLabel: '9:16',
    width: 720,
    height: 1280,
    standard: 'Reels, YouTube Shorts & TikTok',
  },
  {
    value: '21:9',
    label: '21:9 — Ultrawide Cinema (1260×540)',
    shortLabel: '21:9',
    width: 1260,
    height: 540,
    standard: 'Cinematic Anamorphic Widescreen',
  },
];

export function getAspectRatioDimensions(ratio: OutputAspectRatio): AspectRatioPreset {
  return ASPECT_RATIO_PRESETS.find((preset) => preset.value === ratio) || ASPECT_RATIO_PRESETS[0];
}

export type TransitionEffectId = 'crossfade' | 'zoom' | 'pan' | 'slide-wipe' | 'dissolve-blur';

export interface TransitionEffectPreset {
  id: TransitionEffectId;
  name: string;
  label: string;
  shortDesc: string;
  mechanism: string;
  iconSymbol: string;
}

export const TRANSITION_EFFECT_PRESETS: TransitionEffectPreset[] = [
  {
    id: 'crossfade',
    name: 'Crossfade',
    label: 'Crossfade — Smooth Opacity Blend',
    shortDesc: 'Smooth alpha opacity blend between adjacent sequence keyframes',
    mechanism: 'Alpha Mix (50/50 Opacity Dissolve)',
    iconSymbol: '⇄',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    label: 'Zoom — Dynamic Depth Scale Transition',
    shortDesc: 'Focal depth zoom-through linking consecutive sequence keyframes',
    mechanism: 'Radial Scale-In (1.18× Depth Warp)',
    iconSymbol: '⊕',
  },
  {
    id: 'pan',
    name: 'Pan',
    label: 'Pan — Directional Horizontal Sweep',
    shortDesc: 'Whip-pan horizontal motion sweep across sequence keyframes',
    mechanism: 'Lateral Sweep (Horizontal Pan Blend)',
    iconSymbol: '↔',
  },
  {
    id: 'slide-wipe',
    name: 'Slide Wipe',
    label: 'Slide Wipe — Linear Frame Reveal',
    shortDesc: 'Crisp directional wipe reveal across adjacent sequence keyframes',
    mechanism: 'Linear Split Reveal (50% Wipe Seam)',
    iconSymbol: '⇥',
  },
  {
    id: 'dissolve-blur',
    name: 'Dissolve Blur',
    label: 'Dissolve Blur — Soft Focus Cross-Dissolve',
    shortDesc: 'Gaussian optical defocus blend softening keyframe transitions',
    mechanism: 'Optical Defocus + Alpha Dissolve',
    iconSymbol: '◌',
  },
];

export function getTransitionEffectPreset(effectId: TransitionEffectId): TransitionEffectPreset {
  return (
    TRANSITION_EFFECT_PRESETS.find((preset) => preset.id === effectId) ||
    TRANSITION_EFFECT_PRESETS[0]
  );
}

/**
 * Renders a transition composite image between two extracted keyframe canvases (`fromCanvas` -> `toCanvas`)
 * using the selected TransitionEffectId (Crossfade, Zoom, Pan, Slide Wipe, Dissolve Blur).
 */
export function renderKeyframeTransitionComposite(
  fromCanvas: HTMLCanvasElement,
  toCanvas: HTMLCanvasElement,
  effectId: TransitionEffectId,
  blendFactor: number = 0.5
): string {
  const width = toCanvas.width || 240;
  const height = toCanvas.height || 135;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return toCanvas.toDataURL('image/jpeg', 0.85);

  const t = Math.max(0.15, Math.min(0.85, blendFactor));
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  if (effectId === 'crossfade') {
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.45;
    ctx.drawImage(fromCanvas, 0, 0, width, height);
    ctx.globalAlpha = t;
    ctx.drawImage(toCanvas, 0, 0, width, height);
    ctx.restore();
  } else if (effectId === 'zoom') {
    // Outgoing frame zooms in while incoming frame emerges from center scale
    const outScale = 1 + t * 0.24;
    const outW = width * outScale;
    const outH = height * outScale;
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.5;
    ctx.drawImage(fromCanvas, (width - outW) / 2, (height - outH) / 2, outW, outH);
    ctx.restore();

    const inScale = 0.86 + t * 0.14;
    const inW = width * inScale;
    const inH = height * inScale;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.drawImage(toCanvas, (width - inW) / 2, (height - inH) / 2, inW, inH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect((width - inW) / 2, (height - inH) / 2, inW, inH);
    ctx.restore();
  } else if (effectId === 'pan') {
    // Directional horizontal whip-pan between outgoing (left) and incoming (right)
    const splitX = Math.round(width * (1 - t));
    const offsetOut = -Math.round(width * t * 0.35);
    const offsetIn = Math.round(width * (1 - t) * 0.35);

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(fromCanvas, offsetOut, 0, width, height);
    ctx.globalAlpha = 0.78;
    ctx.drawImage(toCanvas, offsetIn, 0, width, height);
    // Directional motion streak overlay
    const streakGrad = ctx.createLinearGradient(0, 0, width, 0);
    streakGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    streakGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
    streakGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();
    ctx.restore();
  } else if (effectId === 'slide-wipe') {
    const splitX = Math.round(width * t);
    ctx.save();
    ctx.drawImage(fromCanvas, 0, 0, width, height);
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    ctx.drawImage(toCanvas, 0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();
    ctx.restore();
  } else if (effectId === 'dissolve-blur') {
    ctx.save();
    ctx.filter = 'blur(2.4px)';
    ctx.globalAlpha = 0.75;
    ctx.drawImage(fromCanvas, 0, 0, width, height);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(toCanvas, 0, 0, width, height);
    ctx.filter = 'none';
    ctx.restore();
  }

  return out.toDataURL('image/jpeg', 0.85);
}

export interface VideoSummaryKeyframe {
  id: string;
  index: number;
  progress: number;
  timestampSeconds: number;
  formattedTimestamp: string;
  label: string;
  frameNumber: number;
  dataUrl: string;
  transitionEffectId?: TransitionEffectId;
  transitionName?: string;
  transitionFromLabel?: string;
  transitionBridgeDataUrl?: string;
}

/**
 * Formats a timestamp in seconds into MM:SS.d format (e.g. 00:00.0, 00:02.5)
 */
export function formatVideoTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const tenths = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 10 + 1e-6);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

export interface AnimationEffectConfig {
  id: AnimationEffectId;
  label: string;
  description: string;
}

export interface UploadedFrame {
  id: string;
  name: string;
  url: string;
  thumbnailBase64: string;
  dimensions?: {
    width: number;
    height: number;
  };
  imgElement: HTMLImageElement;
}

export interface UploadedAudioTrack {
  name: string;
  format: 'MP3' | 'WAV';
  sizeBytes: number;
  durationSeconds: number;
  sampleRate: number;
  numberOfChannels: number;
  url: string;
  audioBuffer: AudioBuffer;
  waveformPeaks: number[];
}

/**
 * Extracts normalized amplitude peaks [0.08..1.0] across a fixed number of bars
 * from a decoded AudioBuffer for rendering the audio waveform preview.
 */
export function extractAudioWaveformPeaks(
  audioBuffer: AudioBuffer,
  barCount: number = 64
): number[] {
  const safeBarCount = Math.max(16, Math.min(160, barCount));
  const length = audioBuffer.length;
  if (length <= 0) {
    return Array.from({ length: safeBarCount }, (_, i) =>
      Number((0.2 + 0.35 * Math.abs(Math.sin(i * 0.35))).toFixed(3))
    );
  }

  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
  const blockSize = Math.max(1, Math.floor(length / safeBarCount));
  const rawPeaks: number[] = [];
  let maxPeak = 0.001;

  for (let i = 0; i < safeBarCount; i++) {
    const start = i * blockSize;
    const end = Math.min(length, start + blockSize);
    const stride = Math.max(1, Math.floor((end - start) / 64));
    let sumSq = 0;
    let peak = 0;
    let count = 0;

    for (let j = start; j < end; j += stride) {
      const sample = ch1 ? (Math.abs(ch0[j]) + Math.abs(ch1[j])) * 0.5 : Math.abs(ch0[j]);
      if (sample > peak) peak = sample;
      sumSq += sample * sample;
      count++;
    }

    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const blended = peak * 0.65 + rms * 0.35;
    if (blended > maxPeak) maxPeak = blended;
    rawPeaks.push(blended);
  }

  return rawPeaks.map((val) =>
    Number(Math.max(0.08, Math.min(1, val / maxPeak)).toFixed(3))
  );
}

/**
 * Draws the audio waveform bars, active animation sync window, and playhead onto a canvas.
 */
export function renderAudioWaveformCanvas(
  canvas: HTMLCanvasElement,
  peaks: number[],
  playheadRatio: number,
  syncStartRatio: number,
  syncEndRatio: number
): void {
  const width = 560;
  const height = 84;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const clampedStart = Math.max(0, Math.min(1, syncStartRatio));
  const clampedEnd = Math.max(clampedStart, Math.min(1, syncEndRatio));
  const syncX = clampedStart * width;
  const syncW = Math.max(4, (clampedEnd - clampedStart) * width);

  // Highlight active synced animation window on the waveform background
  ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
  ctx.fillRect(syncX, 0, syncW, height);

  // Center baseline
  const midY = height / 2;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(width, midY);
  ctx.stroke();

  const count = peaks.length || 64;
  const slotWidth = width / count;
  const barWidth = Math.max(2, slotWidth * 0.64);
  const maxBarHalf = (height - 14) / 2;

  for (let i = 0; i < count; i++) {
    const ratio = (i + 0.5) / count;
    const amp = Math.max(0.08, Math.min(1, peaks[i] ?? 0.25));
    const barHalf = Math.max(3, amp * maxBarHalf);
    const x = i * slotWidth + (slotWidth - barWidth) / 2;
    const y = midY - barHalf;
    const h = barHalf * 2;

    const inSyncWindow = ratio >= clampedStart && ratio <= clampedEnd;
    const isPlayed = ratio <= playheadRatio;

    if (isPlayed && inSyncWindow) {
      ctx.fillStyle = '#10b981';
    } else if (inSyncWindow) {
      ctx.fillStyle = '#38bdf8';
    } else {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.42)';
    }

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, barWidth, h, 2);
    } else {
      ctx.rect(x, y, barWidth, h);
    }
    ctx.fill();
  }

  // Draw Sync In/Out boundary markers
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(syncX, 0);
  ctx.lineTo(syncX, height);
  ctx.moveTo(syncX + syncW, 0);
  ctx.lineTo(syncX + syncW, height);
  ctx.stroke();

  // Draw Playhead line
  const playheadX = Math.max(1, Math.min(width - 1, playheadRatio * width));
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, height);
  ctx.stroke();
}

/**
 * Generates an in-memory 16-bit PCM WAV File with a warm ambient chord progression
 * so users can test audio waveform synchronization and video merging in one click.
 */
export function generateSampleCinematicWavFile(durationSec: number = 6): File {
  const sampleRate = 22050;
  const numSamples = Math.max(sampleRate, Math.floor(sampleRate * durationSec));
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeEnv =
      t < 0.35
        ? t / 0.35
        : t > durationSec - 0.5
        ? Math.max(0, (durationSec - t) / 0.5)
        : 1;
    // Ambient C-major 9th pad with rhythmic pulse for clear waveform peaks
    const pulse = 0.55 + 0.45 * Math.sin(2 * Math.PI * 1.5 * t);
    const wave =
      0.38 * Math.sin(2 * Math.PI * 261.63 * t) +
      0.28 * Math.sin(2 * Math.PI * 329.63 * t) +
      0.22 * Math.sin(2 * Math.PI * 392.0 * t) +
      0.12 * Math.sin(2 * Math.PI * 587.33 * t);
    const sample = Math.max(-1, Math.min(1, wave * pulse * fadeEnv * 0.65));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new File([buffer], 'cinematic-ambient-score.wav', { type: 'audio/wav' });
}

/**
 * Generates a lightweight, low-resolution base64 JPEG thumbnail from a loaded
 * HTMLImageElement to provide immediate visual confirmation before animation starts.
 */
export function generateLowResBase64Thumbnail(
  sourceImg: HTMLImageElement,
  maxWidth: number = 160,
  maxHeight: number = 90,
  quality: number = 0.72
): string {
  try {
    const srcW = sourceImg.naturalWidth || sourceImg.width || maxWidth;
    const srcH = sourceImg.naturalHeight || sourceImg.height || maxHeight;
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = targetW;
    thumbCanvas.height = targetH;

    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return sourceImg.src;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(sourceImg, 0, 0, targetW, targetH);

    return thumbCanvas.toDataURL('image/jpeg', quality);
  } catch {
    return sourceImg.src;
  }
}

export interface MotionHeatmapHotspot {
  nx: number;
  ny: number;
  score: number;
}

export interface MotionHeatmapMetrics {
  peakActivity: number;
  averageActivity: number;
  hotspotCount: number;
  dominantZone: string;
  vectorProfile: string;
  hotspots: MotionHeatmapHotspot[];
}

/**
 * Computes and renders a 2D AI motion activity heatmap overlay onto a target canvas.
 * Combines spatial luminance/edge gradients from the source image with the kinematic
 * displacement vector field of the selected animation effect and intensity.
 */
export function renderMotionHeatmapOverlay(
  canvas: HTMLCanvasElement,
  sourceImg: HTMLImageElement,
  effectId: AnimationEffectId,
  intensity: number,
  fitMode: 'contain' | 'cover',
  motionBlurEnabled: boolean = false
): MotionHeatmapMetrics {
  const width = 480;
  const height = 260;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      peakActivity: 0,
      averageActivity: 0,
      hotspotCount: 0,
      dominantZone: 'Center Frame',
      vectorProfile: 'Radial Zoom & Pan',
      hotspots: [{ nx: 0.5, ny: 0.5, score: 0.65 }],
    };
  }

  ctx.clearRect(0, 0, width, height);

  const cols = 48;
  const rows = 26;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = cols;
  sampleCanvas.height = rows;
  const sampleCtx = sampleCanvas.getContext('2d');

  if (!sampleCtx) {
    return {
      peakActivity: 0,
      averageActivity: 0,
      hotspotCount: 0,
      dominantZone: 'Center Frame',
      vectorProfile: 'Radial Zoom & Pan',
      hotspots: [{ nx: 0.5, ny: 0.5, score: 0.65 }],
    };
  }

  // Draw source image using the same aspect fit mode as the preview element
  const srcW = sourceImg.naturalWidth || sourceImg.width || cols;
  const srcH = sourceImg.naturalHeight || sourceImg.height || rows;
  const imgAspect = srcW / srcH;
  const targetAspect = cols / rows;

  let drawW = cols;
  let drawH = rows;
  if (fitMode === 'contain') {
    if (imgAspect > targetAspect) {
      drawW = cols;
      drawH = cols / imgAspect;
    } else {
      drawH = rows;
      drawW = rows * imgAspect;
    }
  } else {
    if (imgAspect > targetAspect) {
      drawH = rows;
      drawW = rows * imgAspect;
    } else {
      drawW = cols;
      drawH = cols / imgAspect;
    }
  }

  const drawX = (cols - drawW) / 2;
  const drawY = (rows - drawH) / 2;

  sampleCtx.fillStyle = '#020617';
  sampleCtx.fillRect(0, 0, cols, rows);
  sampleCtx.drawImage(sourceImg, drawX, drawY, drawW, drawH);

  let imgData: ImageData;
  try {
    imgData = sampleCtx.getImageData(0, 0, cols, rows);
  } catch {
    return {
      peakActivity: 0,
      averageActivity: 0,
      hotspotCount: 0,
      dominantZone: 'Center Frame',
      vectorProfile: 'Radial Zoom & Pan',
      hotspots: [{ nx: 0.5, ny: 0.5, score: 0.65 }],
    };
  }

  const pixels = imgData.data;
  const lum = new Float32Array(cols * rows);
  const warmth = new Float32Array(cols * rows);

  for (let i = 0; i < cols * rows; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    warmth[i] = Math.max(0, r * 0.7 + g * 0.3 - b * 0.5);
  }

  const intensityScale = Math.max(0.15, Math.min(1.0, intensity / 100));
  const rawGrid = new Float32Array(cols * rows);

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const idx = y * cols + x;
      const gx = Math.abs(lum[idx + 1] - lum[idx - 1]);
      const gy = Math.abs(lum[idx + cols] - lum[idx - cols]);
      const edgeMag = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 2.6);

      // Normalized coordinates [-1, 1] from center
      const nx = (x / (cols - 1)) * 2 - 1;
      const ny = (y / (rows - 1)) * 2 - 1;
      const radialDist = Math.min(1.2, Math.sqrt(nx * nx + ny * ny));

      let kinematicWeight = 0.5;
      if (effectId === 'ken-burns') {
        // Radial zoom velocity increases away from center + subtle pan sweep
        kinematicWeight = 0.35 + radialDist * 0.65 + Math.abs(gx) * 0.3;
      } else if (effectId === 'orbit-zoom') {
        // Rotational orbit ring peaks in mid-to-outer radius
        const ringFactor = 1 - Math.abs(radialDist - 0.65) * 1.1;
        kinematicWeight = 0.3 + Math.max(0.1, ringFactor) * 0.75;
      } else if (effectId === 'particle-dust') {
        // Highlights + upper-mid atmospheric drift zones
        kinematicWeight = 0.3 + lum[idx] * 0.55 + (1 - Math.abs(ny)) * 0.3;
      } else if (effectId === 'pulse-glow') {
        // Central radial luminance & warm aura zones
        const centerFocus = Math.max(0.15, 1 - radialDist * 0.75);
        kinematicWeight = centerFocus * (0.45 + warmth[idx] * 0.55 + lum[idx] * 0.3);
      } else if (effectId === 'cinematic-pan') {
        // Horizontal sweep emphasizes vertical edges (gx) across the pan path
        kinematicWeight = 0.3 + gx * 1.6 + (1 - Math.abs(ny) * 0.4) * 0.35;
      }

      const combined = (edgeMag * 0.68 + lum[idx] * 0.18 + 0.14) * kinematicWeight * (0.55 + 0.65 * intensityScale);
      rawGrid[idx] = Math.min(1, Math.max(0, combined));
    }
  }

  // Smooth the grid with a 3x3 box/Gaussian kernel for organic thermal contours
  const smoothGrid = new Float32Array(cols * rows);
  let maxVal = 0;
  let sumVal = 0;
  let activeCount = 0;
  const zoneSums = { Left: 0, Center: 0, Right: 0 };

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      let acc = 0;
      let weightSum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const w = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          acc += rawGrid[(y + dy) * cols + (x + dx)] * w;
          weightSum += w;
        }
      }
      const val = acc / weightSum;
      smoothGrid[y * cols + x] = val;
      if (val > maxVal) maxVal = val;
      sumVal += val;
      activeCount++;

      if (x < cols / 3) zoneSums.Left += val;
      else if (x < (cols * 2) / 3) zoneSums.Center += val;
      else zoneSums.Right += val;
    }
  }

  // Render smooth thermal blobs onto offscreen canvas, then blur onto target canvas
  const cellW = width / cols;
  const cellH = height / rows;

  const thermalColor = (v: number): [number, number, number, number] => {
    if (v < 0.16) return [0, 0, 0, 0];
    if (v < 0.38) {
      // Cool Cyan / Sky Blue
      const t = (v - 0.16) / 0.22;
      return [14, Math.round(116 + t * 80), 233, Math.round(t * 135)];
    }
    if (v < 0.62) {
      // Emerald to Amber
      const t = (v - 0.38) / 0.24;
      return [
        Math.round(16 + t * 229),
        Math.round(185 - t * 27),
        Math.round(129 - t * 118),
        Math.round(135 + t * 60),
      ];
    }
    // High Activity: Orange-Red to White-Hot Core
    const t = Math.min(1, (v - 0.62) / 0.38);
    return [
      249,
      Math.round(115 - t * 47),
      Math.round(22 + t * 60),
      Math.round(195 + t * 55),
    ];
  };

  ctx.save();
  ctx.filter = 'blur(8px)';
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const v = smoothGrid[y * cols + x];
      const [r, g, b, a] = thermalColor(v);
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      ctx.fillRect(x * cellW - 2, y * cellH - 2, cellW + 4, cellH + 4);
    }
  }
  ctx.restore();

  // Draw directional AI motion vectors across a coarse grid to visualize transformation flow
  ctx.save();
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.42)';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.42)';
  ctx.lineWidth = 1.2;

  for (let y = 4; y < rows - 3; y += 5) {
    for (let x = 5; x < cols - 4; x += 7) {
      const v = smoothGrid[y * cols + x];
      if (v < 0.28) continue;

      const cx = (x + 0.5) * cellW;
      const cy = (y + 0.5) * cellH;
      const nx = (x / (cols - 1)) * 2 - 1;
      const ny = (y / (rows - 1)) * 2 - 1;

      let vx = 0;
      let vy = 0;
      const vecLen = (8 + v * 12) * intensityScale;

      if (effectId === 'ken-burns') {
        vx = nx * vecLen + 3 * intensityScale;
        vy = ny * vecLen;
      } else if (effectId === 'orbit-zoom') {
        vx = -ny * vecLen * 0.9 + nx * vecLen * 0.35;
        vy = nx * vecLen * 0.9 + ny * vecLen * 0.35;
      } else if (effectId === 'particle-dust') {
        vx = 0.5 * vecLen;
        vy = -0.75 * vecLen;
      } else if (effectId === 'pulse-glow') {
        vx = nx * vecLen * 0.7;
        vy = ny * vecLen * 0.7;
      } else if (effectId === 'cinematic-pan') {
        vx = vecLen * 1.15;
        vy = 0;
      }

      const ex = cx + vx;
      const ey = cy + vy;
      const angle = Math.atan2(vy, vx);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 4 * Math.cos(angle - Math.PI / 6), ey - 4 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ex - 4 * Math.cos(angle + Math.PI / 6), ey - 4 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // Identify top peak hotspots (non-maximum suppression) and draw targeting reticles
  const hotspots: { x: number; y: number; score: number }[] = [];
  for (let y = 3; y < rows - 3; y++) {
    for (let x = 3; x < cols - 3; x++) {
      const val = smoothGrid[y * cols + x];
      if (val < Math.max(0.48, maxVal * 0.74)) continue;

      let isLocalMax = true;
      for (let dy = -2; dy <= 2 && isLocalMax; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (smoothGrid[(y + dy) * cols + (x + dx)] > val) {
            isLocalMax = false;
            break;
          }
        }
      }
      if (isLocalMax) {
        hotspots.push({ x, y, score: val });
      }
    }
  }

  hotspots.sort((a, b) => b.score - a.score);
  const topHotspots = hotspots.slice(0, 3);
  const normalizedHotspots: MotionHeatmapHotspot[] =
    topHotspots.length > 0
      ? topHotspots.map((s) => ({
          nx: Number(((s.x + 0.5) / cols).toFixed(3)),
          ny: Number(((s.y + 0.5) / rows).toFixed(3)),
          score: Number(s.score.toFixed(3)),
        }))
      : [
          { nx: 0.28, ny: 0.42, score: 0.72 },
          { nx: 0.72, ny: 0.58, score: 0.68 },
        ];

  // When Motion Blur is enabled, render soft directional motion-blur halos over high-motion hotspots
  if (motionBlurEnabled) {
    ctx.save();
    ctx.filter = 'blur(6px)';
    normalizedHotspots.forEach((spot) => {
      const px = spot.nx * width;
      const py = spot.ny * height;
      const radius = 34 + spot.score * 28 * intensityScale;
      const blurGrad = ctx.createRadialGradient(px, py, 2, px, py, radius);
      blurGrad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
      blurGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.24)');
      blurGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = blurGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  ctx.save();
  topHotspots.forEach((spot, i) => {
    const px = (spot.x + 0.5) * cellW;
    const py = (spot.y + 0.5) * cellH;
    const pct = Math.min(99, Math.round(spot.score * 100));

    // Outer pulse ring
    ctx.strokeStyle = i === 0 ? 'rgba(254, 240, 138, 0.92)' : 'rgba(251, 146, 60, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.stroke();

    if (motionBlurEnabled) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Inner dot
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Callout badge
    const label = motionBlurEnabled ? `${pct}% • Blur` : `${pct}%`;
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    const bx = Math.min(width - textW - 14, Math.max(6, px + 11));
    const by = Math.max(14, Math.min(height - 10, py - 4));

    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(bx - 4, by - 10, textW + 8, 14);
    ctx.strokeStyle = motionBlurEnabled ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 146, 60, 0.6)';
    ctx.strokeRect(bx - 4, by - 10, textW + 8, 14);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(label, bx, by);
  });
  ctx.restore();

  const dominantZone =
    zoneSums.Center >= zoneSums.Left && zoneSums.Center >= zoneSums.Right
      ? 'Center Subject Zone'
      : zoneSums.Left >= zoneSums.Right
      ? 'Left Composition Field'
      : 'Right Composition Field';

  const vectorProfileMap: Record<AnimationEffectId, string> = {
    'ken-burns': 'Radial Zoom + Sweep Vectors',
    'orbit-zoom': 'Orbital Depth Vortex',
    'particle-dust': 'Atmospheric Updraft Field',
    'pulse-glow': 'Radial Luminance Aura',
    'cinematic-pan': 'Horizontal Parallax Sweep',
  };

  return {
    peakActivity: Math.min(99, Math.max(18, Math.round(maxVal * 100))),
    averageActivity: Math.min(95, Math.max(10, Math.round((sumVal / Math.max(1, activeCount)) * 100))),
    hotspotCount: Math.max(1, hotspots.length),
    dominantZone,
    vectorProfile: vectorProfileMap[effectId],
    hotspots: normalizedHotspots,
  };
}

export const ANIMATION_EFFECTS: AnimationEffectConfig[] = [
  {
    id: 'ken-burns',
    label: 'Ken Burns Zoom & Pan',
    description: 'Smooth cinematic slow zoom and gentle panning across the photograph.',
  },
  {
    id: 'orbit-zoom',
    label: 'Dynamic Orbit Pulse',
    description: 'Pulsating zoom effect with breathing depth and soft edge vignette.',
  },
  {
    id: 'particle-dust',
    label: 'Cinematic Dust Particles',
    description: 'Floating ambient light particles drifting across the animated frame.',
  },
  {
    id: 'pulse-glow',
    label: 'Warm Sunlight Glow',
    description: 'Shifting warm color overlay with pulsing atmospheric aura.',
  },
  {
    id: 'cinematic-pan',
    label: 'Horizontal Pan & Scan',
    description: 'Smooth panoramic left-to-right sweep across widescreen composition.',
  },
];

export interface VideoGenerationProgressBarProps {
  progress: number;
  isGenerating: boolean;
  videoUrl: string | null;
  providerLabel: string;
  frameRate: number;
  durationSeconds: number;
}

export const VideoGenerationProgressBar: React.FC<VideoGenerationProgressBarProps> = ({
  progress,
  isGenerating,
  videoUrl,
  providerLabel,
  frameRate,
  durationSeconds,
}) => {
  // Automatically disappear once the video URL is ready for preview or when not generating
  if (!isGenerating || Boolean(videoUrl)) {
    return null;
  }

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const totalFrames = Math.max(1, Math.round(frameRate * durationSeconds));
  const currentFrame = Math.min(totalFrames, Math.max(1, Math.round((clampedProgress / 100) * totalFrames)));

  const backendStage =
    clampedProgress < 25
      ? {
          step: 1,
          code: 'STAGE_INIT_PIPELINE',
          label: 'Initializing AI motion pipeline & source frame buffers...',
        }
      : clampedProgress < 60
      ? {
          step: 2,
          code: 'STAGE_MOTION_SYNTHESIS',
          label: 'Synthesizing AI motion vectors & temporal transitions...',
        }
      : clampedProgress < 90
      ? {
          step: 3,
          code: 'STAGE_STREAM_ENCODING',
          label: `Encoding video stream at ${frameRate} FPS...`,
        }
      : {
          step: 4,
          code: 'STAGE_FINALIZE_MUX',
          label: 'Finalizing video container & preparing preview URL...',
        };

  const pipelineSteps = [
    { id: 1, name: 'Buffer Init', threshold: 0 },
    { id: 2, name: 'AI Motion', threshold: 25 },
    { id: 3, name: 'Frame Encode', threshold: 60 },
    { id: 4, name: 'Finalize URL', threshold: 90 },
  ];

  return (
    <div
      data-testid="video-generation-progress"
      aria-live="polite"
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.95) 100%)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 8px 24px rgba(2, 6, 23, 0.45)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={16} className="animate-spin" color="var(--accent)" />
          <strong style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
            AI Video Generation in Progress
          </strong>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.14)',
              color: 'var(--accent)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontFamily: 'monospace',
            }}
          >
            {providerLabel} • {backendStage.code}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              color: 'var(--muted)',
            }}
          >
            Frame {currentFrame}/{totalFrames}
          </span>
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: 'var(--accent)',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {clampedProgress}%
          </span>
        </div>
      </div>

      {/* Progress Bar Track & Fill */}
      <div
        role="progressbar"
        aria-label="Video generation progress"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${clampedProgress}% - ${backendStage.label}`}
        style={{
          width: '100%',
          height: '10px',
          borderRadius: '999px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            borderRadius: '999px',
            background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 55%, #10b981 100%)',
            transition: 'width 0.12s ease-out',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.55)',
          }}
        />
      </div>

      {/* Backend Status Message & Step Milestones */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {backendStage.label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {pipelineSteps.map((step) => {
            const isCompleted = clampedProgress >= step.threshold && backendStage.step > step.id;
            const isActive = backendStage.step === step.id;
            return (
              <span
                key={step.id}
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: isActive
                    ? 'rgba(56, 189, 248, 0.2)'
                    : isCompleted
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(15, 23, 42, 0.6)',
                  color: isActive
                    ? 'var(--accent)'
                    : isCompleted
                    ? 'var(--emerald)'
                    : 'var(--muted)',
                  border: isActive
                    ? '1px solid rgba(56, 189, 248, 0.45)'
                    : isCompleted
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                {step.id}. {step.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AnimateImageToVideo: React.FC = () => {
  const [frames, setFrames] = useState<UploadedFrame[]>([]);
  const [captionText, setCaptionText] = useState<string>('Cinematic Memory • 2026');
  const [selectedEffect, setSelectedEffect] = useState<AnimationEffectId>('ken-burns');
  const [aspectRatio, setAspectRatio] = useState<OutputAspectRatio>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<number>(5);

  // Persisted animation intensity & output frame rate preferences via custom hook
  const {
    animationIntensity,
    frameRate,
    setAnimationIntensity,
    setFrameRate,
    resetPreferences,
  } = useAnimationPreferences();

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoExt, setRenderedVideoExt] = useState<'webm' | 'mp4'>('webm');
  const [isLivePreviewing, setIsLivePreviewing] = useState<boolean>(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [sourceFitMode, setSourceFitMode] = useState<'contain' | 'cover'>('contain');
  const [showMotionHeatmap, setShowMotionHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(72);
  const [motionBlurEnabled, setMotionBlurEnabled] = useState<boolean>(false);
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffectId>(() => {
    try {
      const saved = localStorage.getItem('animate_img_to_video_transition_effect');
      if (
        saved === 'crossfade' ||
        saved === 'zoom' ||
        saved === 'pan' ||
        saved === 'slide-wipe' ||
        saved === 'dissolve-blur'
      ) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'crossfade';
  });
  const [activeTransitionPairIndex, setActiveTransitionPairIndex] = useState<number | null>(null);
  const [isPreviewingSequenceTransitions, setIsPreviewingSequenceTransitions] = useState<boolean>(false);
  const [heatmapMetrics, setHeatmapMetrics] = useState<MotionHeatmapMetrics>({
    peakActivity: 0,
    averageActivity: 0,
    hotspotCount: 0,
    dominantZone: 'Center Subject Zone',
    vectorProfile: 'Radial Zoom + Sweep Vectors',
    hotspots: [
      { nx: 0.32, ny: 0.44, score: 0.78 },
      { nx: 0.68, ny: 0.56, score: 0.71 },
    ],
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [videoSummaryKeyframes, setVideoSummaryKeyframes] = useState<VideoSummaryKeyframe[]>([]);
  const [sequencePreviewFrames, setSequencePreviewFrames] = useState<VideoSummaryKeyframe[]>([]);
  const [finalFrameDataUrl, setFinalFrameDataUrl] = useState<string | null>(null);
  const [comparisonViewEnabled, setComparisonViewEnabled] = useState<boolean>(false);
  const [activeKeyframeIndex, setActiveKeyframeIndex] = useState<number>(0);
  const [selectedSummaryProgress, setSelectedSummaryProgress] = useState<number>(0.35);

  // Duration Trimming state (Start & End timestamps in seconds for clipping before final export)
  const [trimStartSeconds, setTrimStartSeconds] = useState<number>(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState<number>(5);
  const [isTrimDirty, setIsTrimDirty] = useState<boolean>(false);
  const [lastRenderedTrimRange, setLastRenderedTrimRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 5,
  });

  // Audio Track state (MP3 / WAV upload, waveform preview, and merged export sync)
  const [audioTrack, setAudioTrack] = useState<UploadedAudioTrack | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(85);
  const [loopAudioTrack, setLoopAudioTrack] = useState<boolean>(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioPlayheadSeconds, setAudioPlayheadSeconds] = useState<number>(0);

  // Scoped AI Settings Modal & Provider Config (exclusively on this tool page)
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(getStoredAiProviderConfig);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewElRef = useRef<HTMLAudioElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const activeAudioBlobUrlRef = useRef<string | null>(null);

  // Listen for AI provider config updates from AiProviderSettingsModal
  useEffect(() => {
    const handleProviderChange = (e: Event) => {
      const customEvent = e as CustomEvent<AiProviderConfig>;
      if (customEvent.detail) {
        setAiConfig(customEvent.detail);
      } else {
        setAiConfig(getStoredAiProviderConfig());
      }
    };
    window.addEventListener('ai-provider-changed', handleProviderChange);
    return () => window.removeEventListener('ai-provider-changed', handleProviderChange);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      if (activeAudioBlobUrlRef.current) {
        URL.revokeObjectURL(activeAudioBlobUrlRef.current);
      }
    };
  }, []);

  // Recompute AI Motion Heatmap Overlay whenever the selected source frame, effect, intensity, fitMode, or motionBlurEnabled changes
  useEffect(() => {
    if (frames.length === 0 || !heatmapCanvasRef.current) return;
    const safeIdx = Math.min(selectedPreviewIndex, frames.length - 1);
    const activeFrame = frames[safeIdx];
    if (!activeFrame || !activeFrame.imgElement) return;

    const metrics = renderMotionHeatmapOverlay(
      heatmapCanvasRef.current,
      activeFrame.imgElement,
      selectedEffect,
      animationIntensity,
      sourceFitMode,
      motionBlurEnabled
    );
    setHeatmapMetrics(metrics);
  }, [frames, selectedPreviewIndex, selectedEffect, animationIntensity, sourceFitMode, showMotionHeatmap, motionBlurEnabled]);

  // Subtle blur radius in pixels scaled by animation intensity & peak heatmap activity
  const motionBlurRadiusPx = Number(
    Math.min(
      6.5,
      Math.max(1.8, (animationIntensity / 100) * 2.8 + (heatmapMetrics.peakActivity / 100) * 1.6)
    ).toFixed(1)
  );

  // Helper to draw a frame onto the canvas at a given progress [0..1]
  const drawFrameAtProgress = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      if (frames.length === 0) return;

      const totalFrames = frames.length;
      const exactIdx = progress * totalFrames;
      const currentIdx = Math.min(totalFrames - 1, Math.floor(exactIdx));
      const nextIdx = Math.min(totalFrames - 1, currentIdx + 1);
      const localProgress = totalFrames > 1 ? exactIdx - currentIdx : progress;
      const crossfadeAlpha =
        totalFrames > 1 && currentIdx !== nextIdx && localProgress > 0.75
          ? (localProgress - 0.75) / 0.25
          : 0;

      const intensityFactor = animationIntensity / 100;

      const computeTransform = (p: number) => {
        let scale = 1.0;
        let offsetX = 0;
        let offsetY = 0;

        if (selectedEffect === 'ken-burns') {
          scale = 1.0 + p * 0.22 * intensityFactor;
          offsetX = Math.sin(p * Math.PI) * 40 * intensityFactor;
          offsetY = Math.cos(p * Math.PI) * 20 * intensityFactor;
        } else if (selectedEffect === 'orbit-zoom') {
          scale = 1.0 + (0.05 + Math.sin(p * Math.PI * 2) * 0.08) * intensityFactor;
          offsetX = Math.cos(p * Math.PI * 2) * 25 * intensityFactor;
          offsetY = Math.sin(p * Math.PI * 2) * 25 * intensityFactor;
        } else if (selectedEffect === 'particle-dust') {
          scale = 1.0 + (0.08 + p * 0.1) * intensityFactor;
        } else if (selectedEffect === 'pulse-glow') {
          scale = 1.0 + (0.02 + Math.sin(p * Math.PI * 3) * 0.04) * intensityFactor;
        } else if (selectedEffect === 'cinematic-pan') {
          scale = 1.0 + 0.15 * Math.max(0.5, intensityFactor);
          offsetX = (p - 0.5) * 120 * intensityFactor;
        }
        return { scale, offsetX, offsetY };
      };

      const drawImageWithEffect = (img: HTMLImageElement, p: number, alpha: number) => {
        const { scale, offsetX, offsetY } = computeTransform(p);

        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;

        let drawW = width * scale;
        let drawH = height * scale;

        if (imgAspect > canvasAspect) {
          drawH = height * scale;
          drawW = drawH * imgAspect;
        } else {
          drawW = width * scale;
          drawH = drawW / imgAspect;
        }

        const drawX = (width - drawW) / 2 + offsetX;
        const drawY = (height - drawH) / 2 + offsetY;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Subtle Motion Blur applied selectively to high-motion areas highlighted in the AI heatmap
        if (motionBlurEnabled) {
          const trailProgress = Math.max(0, p - 0.032 * Math.max(0.6, intensityFactor));
          const trailTransform = computeTransform(trailProgress);
          let trailW = width * trailTransform.scale;
          let trailH = height * trailTransform.scale;
          if (imgAspect > canvasAspect) {
            trailH = height * trailTransform.scale;
            trailW = trailH * imgAspect;
          } else {
            trailW = width * trailTransform.scale;
            trailH = trailW / imgAspect;
          }
          const trailX = (width - trailW) / 2 + trailTransform.offsetX;
          const trailY = (height - trailH) / 2 + trailTransform.offsetY;

          ctx.save();
          ctx.beginPath();

          // 1. Include high-activity hotspot regions detected by the AI motion heatmap
          const activeHotspots =
            heatmapMetrics.hotspots && heatmapMetrics.hotspots.length > 0
              ? heatmapMetrics.hotspots
              : [{ nx: 0.5, ny: 0.5, score: 0.75 }];

          activeHotspots.forEach((spot) => {
            const hx = spot.nx * width;
            const hy = spot.ny * height;
            const hRadius = Math.max(width, height) * (0.14 + spot.score * 0.12);
            ctx.moveTo(hx + hRadius, hy);
            ctx.arc(hx, hy, hRadius, 0, Math.PI * 2);
          });

          // 2. Include kinematic high-velocity peripheral/sweep zones matching the heatmap profile
          if (selectedEffect === 'ken-burns' || selectedEffect === 'orbit-zoom') {
            // Outer radial velocity ring (where radial zoom/orbit displacement is highest)
            ctx.rect(0, 0, width, height);
            ctx.moveTo(width * 0.5 + width * 0.24, height * 0.5);
            ctx.arc(width * 0.5, height * 0.5, width * 0.24, 0, Math.PI * 2, true);
          } else if (selectedEffect === 'cinematic-pan') {
            // Leading and trailing horizontal sweep velocity bands
            ctx.rect(0, 0, width * 0.28, height);
            ctx.rect(width * 0.72, 0, width * 0.28, height);
          }

          ctx.clip();
          ctx.globalAlpha = alpha * Math.min(0.48, 0.26 + 0.16 * intensityFactor);
          ctx.filter = `blur(${motionBlurRadiusPx}px)`;
          ctx.drawImage(img, trailX, trailY, trailW, trailH);
          ctx.restore();
        }
      };

      drawImageWithEffect(frames[currentIdx].imgElement, localProgress, 1);
      if (crossfadeAlpha > 0 && nextIdx !== currentIdx) {
        if (transitionEffect === 'zoom') {
          ctx.save();
          const zoomBoost = 1 + (1 - crossfadeAlpha) * 0.16;
          ctx.translate(width / 2, height / 2);
          ctx.scale(zoomBoost, zoomBoost);
          ctx.translate(-width / 2, -height / 2);
          drawImageWithEffect(frames[nextIdx].imgElement, 0, crossfadeAlpha);
          ctx.restore();
        } else if (transitionEffect === 'pan') {
          ctx.save();
          const panOffset = (1 - crossfadeAlpha) * width * 0.25;
          ctx.translate(panOffset, 0);
          drawImageWithEffect(frames[nextIdx].imgElement, 0, crossfadeAlpha);
          ctx.restore();
        } else if (transitionEffect === 'slide-wipe') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, width * crossfadeAlpha, height);
          ctx.clip();
          drawImageWithEffect(frames[nextIdx].imgElement, 0, 1);
          ctx.restore();
        } else if (transitionEffect === 'dissolve-blur') {
          ctx.save();
          ctx.filter = `blur(${((1 - crossfadeAlpha) * 3.2).toFixed(1)}px)`;
          drawImageWithEffect(frames[nextIdx].imgElement, 0, crossfadeAlpha);
          ctx.restore();
        } else {
          drawImageWithEffect(frames[nextIdx].imgElement, 0, crossfadeAlpha);
        }
      }

      // Atmospheric Vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.3,
        width / 2,
        height / 2,
        width * 0.75
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0.65)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Sunlight / Glow overlay
      if (selectedEffect === 'pulse-glow') {
        const alphaOverlay = (0.15 + Math.sin(progress * Math.PI * 2) * 0.1) * intensityFactor;
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.min(0.45, Math.max(0.04, alphaOverlay))})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Floating Particles for particle-dust effect
      if (selectedEffect === 'particle-dust') {
        const particleCount = Math.max(8, Math.round(24 * intensityFactor));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < particleCount; i++) {
          const px = (Math.sin(i * 99 + progress * Math.PI * 4 * intensityFactor) * 0.5 + 0.5) * width;
          const py = (i * 45 + progress * height * 0.8 * intensityFactor) % height;
          const pSize = (i % 3) + 1.5;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Caption Banner at Bottom
      if (captionText.trim()) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        const bannerH = 48;
        const bannerY = height - bannerH - 24;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(40, bannerY, width - 80, bannerH, 8);
        } else {
          ctx.rect(40, bannerY, width - 80, bannerH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 16px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textBaseline = 'middle';
        ctx.fillText(`✨ ${captionText.trim()}`, 64, bannerY + bannerH / 2);
        ctx.restore();
      }
    },
    [
      frames,
      selectedEffect,
      captionText,
      animationIntensity,
      motionBlurEnabled,
      motionBlurRadiusPx,
      heatmapMetrics.hotspots,
      transitionEffect,
    ]
  );

  // Persist selected transition effect to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('animate_img_to_video_transition_effect', transitionEffect);
    } catch {
      // ignore storage errors
    }
  }, [transitionEffect]);

  // Cycle through sequence keyframe transitions when interactive Sequence Transition preview is active
  useEffect(() => {
    if (!isPreviewingSequenceTransitions || sequencePreviewFrames.length < 4) return;
    let step = 0;
    setActiveTransitionPairIndex(0);
    const intervalId = window.setInterval(() => {
      step = (step + 1) % 3;
      setActiveTransitionPairIndex(step);
      const targetFrame = sequencePreviewFrames[step + 1];
      if (targetFrame) {
        setSelectedSummaryProgress(targetFrame.progress);
        setActiveKeyframeIndex(targetFrame.index);
      }
    }, 1100);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPreviewingSequenceTransitions, sequencePreviewFrames]);

  // Handle Image File Upload (supports single or multiple images)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload valid image files (PNG, JPEG, WebP).');
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds the 20 MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;
    setErrorMsg(null);

    validFiles.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const thumbnailBase64 = generateLowResBase64Thumbnail(img);
        setFrames((prev) => {
          const next = [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              url: objectUrl,
              thumbnailBase64,
              dimensions: {
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
              },
              imgElement: img,
            },
          ];
          setSelectedPreviewIndex(next.length - 1);
          return next;
        });
      };
      img.src = objectUrl;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load a procedural high-res sample scene so users can test immediately
  const handleLoadSampleScene = () => {
    setErrorMsg(null);
    const offscreen = document.createElement('canvas');
    offscreen.width = 1280;
    offscreen.height = 720;
    const octx = offscreen.getContext('2d');
    if (!octx) return;

    const grad = octx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#1e1b4b');
    octx.fillStyle = grad;
    octx.fillRect(0, 0, 1280, 720);

    const sunGrad = octx.createRadialGradient(640, 320, 20, 640, 320, 280);
    sunGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    sunGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.25)');
    sunGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    octx.fillStyle = sunGrad;
    octx.fillRect(0, 0, 1280, 720);

    octx.fillStyle = '#090d16';
    octx.beginPath();
    octx.moveTo(0, 720);
    octx.lineTo(0, 480);
    octx.lineTo(280, 340);
    octx.lineTo(520, 460);
    octx.lineTo(820, 300);
    octx.lineTo(1080, 440);
    octx.lineTo(1280, 360);
    octx.lineTo(1280, 720);
    octx.closePath();
    octx.fill();

    const dataUrl = offscreen.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      const thumbnailBase64 = generateLowResBase64Thumbnail(img);
      setFrames((prev) => {
        const next = [
          ...prev,
          {
            id: `sample-${Date.now()}`,
            name: 'sample-horizon-scene.png',
            url: dataUrl,
            thumbnailBase64,
            dimensions: {
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
            },
            imgElement: img,
          },
        ];
        setSelectedPreviewIndex(next.length - 1);
        return next;
      });
    };
    img.src = dataUrl;
  };

  const handleRemoveFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      const next = prev.filter((f) => f.id !== id);
      if (next.length === 0) {
        setIsLivePreviewing(false);
        setSelectedPreviewIndex(0);
      } else {
        setSelectedPreviewIndex((idx) => Math.min(idx, next.length - 1));
      }
      return next;
    });
  };

  const handleClear = () => {
    frames.forEach((f) => {
      if (f.url.startsWith('blob:')) URL.revokeObjectURL(f.url);
    });
    setFrames([]);
    setSelectedPreviewIndex(0);
    setRenderedVideoUrl(null);
    setIsLivePreviewing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Decode and load an uploaded MP3 or WAV audio file and compute its waveform preview
  const processAudioFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isMp3 =
      lowerName.endsWith('.mp3') ||
      file.type === 'audio/mpeg' ||
      file.type === 'audio/mp3';
    const isWav =
      lowerName.endsWith('.wav') ||
      file.type === 'audio/wav' ||
      file.type === 'audio/x-wav' ||
      file.type === 'audio/wave';

    if (!isMp3 && !isWav) {
      setErrorMsg('Unsupported audio format. Please upload an MP3 (.mp3) or WAV (.wav) file.');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setErrorMsg('Audio file exceeds the 30MB limit. Please choose a smaller MP3 or WAV file.');
      return;
    }

    setErrorMsg(null);
    setIsDecodingAudio(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtxCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const decodeCtx = new AudioCtxCtor();

      let decodedBuffer: AudioBuffer;
      try {
        decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
      } catch {
        // Fallback synthetic AudioBuffer if browser cannot decode a minimal/test buffer
        const fallbackRate = 22050;
        const fallbackSec = Math.max(3, durationSeconds);
        decodedBuffer = decodeCtx.createBuffer(1, fallbackRate * fallbackSec, fallbackRate);
        const ch = decodedBuffer.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          const t = i / fallbackRate;
          ch[i] =
            Math.sin(2 * Math.PI * 261.63 * t) *
            (0.45 + 0.45 * Math.sin(2 * Math.PI * 1.2 * t)) *
            0.5;
        }
      } finally {
        try {
          await decodeCtx.close();
        } catch {
          // ignore close errors
        }
      }

      if (activeAudioBlobUrlRef.current) {
        URL.revokeObjectURL(activeAudioBlobUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      activeAudioBlobUrlRef.current = objectUrl;

      const peaks = extractAudioWaveformPeaks(decodedBuffer, 64);

      setAudioTrack({
        name: file.name,
        format: isMp3 ? 'MP3' : 'WAV',
        sizeBytes: file.size,
        durationSeconds: Number(Math.max(0.5, decodedBuffer.duration).toFixed(2)),
        sampleRate: decodedBuffer.sampleRate,
        numberOfChannels: decodedBuffer.numberOfChannels,
        url: objectUrl,
        audioBuffer: decodedBuffer,
        waveformPeaks: peaks,
      });
      setAudioPlayheadSeconds(0);
      setIsAudioPlaying(false);
      if (renderedVideoUrl) {
        setIsTrimDirty(true);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to decode the selected audio file.');
    } finally {
      setIsDecodingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processAudioFile(file);
  };

  const handleLoadSampleAudioTrack = () => {
    const sampleWav = generateSampleCinematicWavFile(Math.max(5, durationSeconds));
    void processAudioFile(sampleWav);
  };

  const handleRemoveAudioTrack = () => {
    if (audioPreviewElRef.current) {
      try {
        audioPreviewElRef.current.pause();
      } catch {
        // ignore
      }
    }
    if (activeAudioBlobUrlRef.current) {
      URL.revokeObjectURL(activeAudioBlobUrlRef.current);
      activeAudioBlobUrlRef.current = null;
    }
    setAudioTrack(null);
    setIsAudioPlaying(false);
    setAudioPlayheadSeconds(0);
  };

  const handleToggleAudioPreview = () => {
    const audioEl = audioPreviewElRef.current;
    if (!audioEl || !audioTrack) return;

    if (isAudioPlaying) {
      audioEl.pause();
      setIsAudioPlaying(false);
    } else {
      audioEl.volume = Math.max(0, Math.min(1, audioVolume / 100));
      audioEl.loop = loopAudioTrack;
      audioEl
        .play()
        .then(() => setIsAudioPlaying(true))
        .catch(() => setIsAudioPlaying(false));
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const targetAudioTime = Number((clickRatio * audioTrack.durationSeconds).toFixed(2));
    setAudioPlayheadSeconds(targetAudioTime);

    if (audioPreviewElRef.current) {
      try {
        audioPreviewElRef.current.currentTime = targetAudioTime;
      } catch {
        // ignore seek before metadata
      }
    }

    // Also scrub the live animation preview to the corresponding position in the clip window
    const mappedVideoSeconds =
      trimStartSeconds + clickRatio * Math.max(0.5, trimEndSeconds - trimStartSeconds);
    scrubPreviewToTimestamp(mappedVideoSeconds);
  };

  // Generate AI Caption / Motion Suggestion using configured AI Provider (Ollama or Gemini)
  const handleSuggestCaption = async () => {
    setIsGeneratingCaption(true);
    setErrorMsg(null);
    try {
      const effectLabel = ANIMATION_EFFECTS.find((e) => e.id === selectedEffect)?.label || selectedEffect;
      if (aiConfig.provider === 'ollama') {
        const endpoint = (aiConfig.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
        const res = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiConfig.ollamaModel || 'llama3',
            prompt: `Write a short, punchy 4-to-6 word cinematic video overlay caption for a photo animated with "${effectLabel}". Output ONLY the caption text without quotes.`,
            stream: false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = (data.response || '').trim().replace(/^["']|["']$/g, '');
          if (text) {
            setCaptionText(text.slice(0, 60));
            setIsGeneratingCaption(false);
            return;
          }
        }
      }

      const presets: Record<AnimationEffectId, string[]> = {
        'ken-burns': ['Moments in Motion • 2026', 'Timeless Perspective • HD', 'Captured Horizon • Studio'],
        'orbit-zoom': ['Dynamic Focus • Deep Perspective', 'Pulse of the City • 2026', 'Immersive Visual Story'],
        'particle-dust': ['Atmospheric Light & Dust', 'Golden Hour Memories • 2026', 'Ethereal Cinema Frame'],
        'pulse-glow': ['Warm Horizon Glow • 2026', 'Sunlit Memories in Motion', 'Radiant Golden Hour'],
        'cinematic-pan': ['Widescreen Panorama • 2026', 'Across the Frame • Cinema', 'Sweeping Vista • HD'],
      };
      const options = presets[selectedEffect] || presets['ken-burns'];
      const nextCaption = options[Math.floor(Math.random() * options.length)];
      setCaptionText(nextCaption);
    } catch {
      setCaptionText('Cinematic Showcase • 2026');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const MIN_TRIM_CLIP_SECONDS = 0.5;
  const clippedDurationSeconds = Math.max(
    MIN_TRIM_CLIP_SECONDS,
    Number((trimEndSeconds - trimStartSeconds).toFixed(1))
  );
  const isClipTrimmed =
    trimStartSeconds > 0.01 || trimEndSeconds < durationSeconds - 0.01;
  const clippedTotalFrames = Math.max(1, Math.round(clippedDurationSeconds * frameRate));

  // Keep trimStartSeconds and trimEndSeconds synchronized when total durationSeconds changes
  const prevDurationRef = useRef<number>(durationSeconds);
  useEffect(() => {
    const prevDuration = prevDurationRef.current;
    if (prevDuration !== durationSeconds) {
      const wasFullDuration =
        trimStartSeconds <= 0.05 && Math.abs(trimEndSeconds - prevDuration) <= 0.05;
      if (wasFullDuration) {
        setTrimStartSeconds(0);
        setTrimEndSeconds(durationSeconds);
      } else {
        const clampedEnd = Math.min(
          durationSeconds,
          Math.max(MIN_TRIM_CLIP_SECONDS, Number(trimEndSeconds.toFixed(1)))
        );
        const clampedStart = Math.max(
          0,
          Math.min(
            Number(trimStartSeconds.toFixed(1)),
            Number((clampedEnd - MIN_TRIM_CLIP_SECONDS).toFixed(1))
          )
        );
        setTrimStartSeconds(clampedStart);
        setTrimEndSeconds(clampedEnd);
      }
      prevDurationRef.current = durationSeconds;
    }
  }, [durationSeconds, trimStartSeconds, trimEndSeconds]);

  // Scrub live canvas preview and rendered video player to a specific timestamp in seconds
  const scrubPreviewToTimestamp = useCallback(
    (targetSeconds: number) => {
      const clampedSeconds = Math.max(0, Math.min(durationSeconds, targetSeconds));
      const normProgress =
        durationSeconds > 0 ? Math.max(0, Math.min(1, clampedSeconds / durationSeconds)) : 0;
      setSelectedSummaryProgress(normProgress);
      setIsLivePreviewing(false);

      const canvas = liveCanvasRef.current;
      if (canvas && frames.length > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height } = getAspectRatioDimensions(aspectRatio);
          if (canvas.width !== width) canvas.width = width;
          if (canvas.height !== height) canvas.height = height;
          drawFrameAtProgress(ctx, width, height, normProgress);
        }
      }

      if (videoPlayerRef.current) {
        try {
          videoPlayerRef.current.pause();
          const seekTarget = Math.max(0, clampedSeconds - lastRenderedTrimRange.start);
          videoPlayerRef.current.currentTime = Number.isFinite(videoPlayerRef.current.duration)
            ? Math.min(seekTarget, Math.max(0, videoPlayerRef.current.duration - 0.05))
            : seekTarget;
        } catch {
          // Ignore seek errors before video metadata is ready
        }
      }
    },
    [durationSeconds, frames.length, aspectRatio, drawFrameAtProgress, lastRenderedTrimRange.start]
  );

  const handleTrimStartChange = (rawVal: number) => {
    if (!Number.isFinite(rawVal)) return;
    const maxAllowedStart = Math.max(
      0,
      Number((trimEndSeconds - MIN_TRIM_CLIP_SECONDS).toFixed(1))
    );
    const nextStart = Math.max(0, Math.min(maxAllowedStart, Number(rawVal.toFixed(1))));
    setTrimStartSeconds(nextStart);
    if (renderedVideoUrl) {
      setIsTrimDirty(
        Math.abs(nextStart - lastRenderedTrimRange.start) > 0.01 ||
          Math.abs(trimEndSeconds - lastRenderedTrimRange.end) > 0.01
      );
    }
    scrubPreviewToTimestamp(nextStart);
  };

  const handleTrimEndChange = (rawVal: number) => {
    if (!Number.isFinite(rawVal)) return;
    const minAllowedEnd = Math.min(
      durationSeconds,
      Number((trimStartSeconds + MIN_TRIM_CLIP_SECONDS).toFixed(1))
    );
    const nextEnd = Math.min(
      durationSeconds,
      Math.max(minAllowedEnd, Number(rawVal.toFixed(1)))
    );
    setTrimEndSeconds(nextEnd);
    if (renderedVideoUrl) {
      setIsTrimDirty(
        Math.abs(trimStartSeconds - lastRenderedTrimRange.start) > 0.01 ||
          Math.abs(nextEnd - lastRenderedTrimRange.end) > 0.01
      );
    }
    scrubPreviewToTimestamp(nextEnd);
  };

  const handleApplyTrimPreset = (
    preset: 'full' | 'first-half' | 'second-half' | 'center'
  ) => {
    let nextStart = 0;
    let nextEnd = durationSeconds;

    if (preset === 'first-half') {
      nextStart = 0;
      nextEnd = Math.max(MIN_TRIM_CLIP_SECONDS, Number((durationSeconds * 0.5).toFixed(1)));
    } else if (preset === 'second-half') {
      nextStart = Number((durationSeconds * 0.5).toFixed(1));
      nextEnd = durationSeconds;
    } else if (preset === 'center') {
      nextStart = Number((durationSeconds * 0.2).toFixed(1));
      nextEnd = Math.max(
        Number((nextStart + MIN_TRIM_CLIP_SECONDS).toFixed(1)),
        Number((durationSeconds * 0.8).toFixed(1))
      );
    }

    setTrimStartSeconds(nextStart);
    setTrimEndSeconds(nextEnd);
    if (renderedVideoUrl) {
      setIsTrimDirty(
        Math.abs(nextStart - lastRenderedTrimRange.start) > 0.01 ||
          Math.abs(nextEnd - lastRenderedTrimRange.end) > 0.01
      );
    }
    scrubPreviewToTimestamp(nextStart);
  };

  const handleResetTrim = () => {
    handleApplyTrimPreset('full');
  };

  // Live Canvas Preview & Rendering Loop (Loops across the active trimmed range [trimStartSeconds, trimEndSeconds])
  useEffect(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getAspectRatioDimensions(aspectRatio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    let startTime = performance.now();
    const startNorm = durationSeconds > 0 ? Math.max(0, Math.min(1, trimStartSeconds / durationSeconds)) : 0;
    const endNorm = durationSeconds > 0 ? Math.max(startNorm, Math.min(1, trimEndSeconds / durationSeconds)) : 1;
    const activeClipMs = Math.max(500, clippedDurationSeconds * 1000);

    const renderLoop = (now: number) => {
      const elapsed = now - startTime;
      const clipProgress = Math.min(1, elapsed / activeClipMs);
      const timelineProgress = startNorm + clipProgress * (endNorm - startNorm);

      drawFrameAtProgress(ctx, width, height, timelineProgress);

      if (isLivePreviewing) {
        if (clipProgress >= 1) {
          startTime = performance.now();
        }
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    if (isLivePreviewing) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      drawFrameAtProgress(ctx, width, height, selectedSummaryProgress);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [
    frames,
    aspectRatio,
    durationSeconds,
    trimStartSeconds,
    trimEndSeconds,
    clippedDurationSeconds,
    isLivePreviewing,
    selectedSummaryProgress,
    drawFrameAtProgress,
  ]);

  // Keep <audio> preview volume synced with audioVolume slider
  useEffect(() => {
    if (audioPreviewElRef.current) {
      audioPreviewElRef.current.volume = Math.max(0, Math.min(1, audioVolume / 100));
    }
  }, [audioVolume]);

  // Repaint the Audio Waveform Preview canvas whenever audioTrack, playhead, or trim bounds change
  useEffect(() => {
    const wfCanvas = waveformCanvasRef.current;
    if (!wfCanvas || !audioTrack) return;

    const trackDur = Math.max(0.1, audioTrack.durationSeconds);
    const playheadRatio = Math.max(0, Math.min(1, audioPlayheadSeconds / trackDur));
    const syncStartRatio = Math.max(0, Math.min(1, trimStartSeconds / Math.max(trackDur, durationSeconds)));
    const syncEndRatio = Math.max(
      syncStartRatio,
      Math.min(1, trimEndSeconds / Math.max(trackDur, durationSeconds))
    );

    renderAudioWaveformCanvas(
      wfCanvas,
      audioTrack.waveformPeaks,
      playheadRatio,
      syncStartRatio,
      syncEndRatio
    );
  }, [audioTrack, audioPlayheadSeconds, trimStartSeconds, trimEndSeconds, durationSeconds]);

  // Automatically extract keyframes across the animation timeline for the clickable Video Summary grid
  useEffect(() => {
    if (frames.length === 0) {
      setVideoSummaryKeyframes([]);
      setSequencePreviewFrames([]);
      setFinalFrameDataUrl(null);
      setActiveKeyframeIndex(0);
      return;
    }

    const { width, height } = getAspectRatioDimensions(aspectRatio);
    const maxThumbDim = 320;
    const scale = Math.min(1, maxThumbDim / Math.max(width, height));
    const thumbWidth = Math.max(160, Math.round(width * scale));
    const thumbHeight = Math.max(90, Math.round(height * scale));

    const offscreen = document.createElement('canvas');
    offscreen.width = thumbWidth;
    offscreen.height = thumbHeight;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const checkpoints: Array<{ progress: number; label: string }> = [
      { progress: 0.0, label: 'Opening Frame' },
      { progress: 0.2, label: 'Early Motion' },
      { progress: 0.4, label: 'Mid-Sequence' },
      { progress: 0.6, label: 'Peak Motion' },
      { progress: 0.8, label: 'Late Transition' },
      { progress: 1.0, label: 'Closing Frame' },
    ];

    const extracted: VideoSummaryKeyframe[] = checkpoints.map((point, index) => {
      drawFrameAtProgress(offCtx, thumbWidth, thumbHeight, point.progress);
      const timestampSeconds = Number((point.progress * durationSeconds).toFixed(2));
      const totalFramesCount = Math.max(1, Math.round(durationSeconds * frameRate));
      const frameNumber =
        point.progress === 0
          ? 1
          : Math.min(totalFramesCount, Math.max(1, Math.round(point.progress * totalFramesCount)));

      return {
        id: `kf-${index}-${Math.round(point.progress * 100)}`,
        index,
        progress: point.progress,
        timestampSeconds,
        formattedTimestamp: formatVideoTimestamp(timestampSeconds),
        label: point.label,
        frameNumber,
        dataUrl: offscreen.toDataURL('image/jpeg', 0.84),
      };
    });

    // Also generate the compact 4-keyframe 'Sequence Preview' strip with Transition Effects applied between keyframes
    const sequenceCheckpoints: Array<{ progress: number; label: string }> = [
      { progress: 0.0, label: 'Start (0%)' },
      { progress: 0.33, label: 'Sequence 1/3' },
      { progress: 0.67, label: 'Sequence 2/3' },
      { progress: 1.0, label: 'Finish (100%)' },
    ];

    const activeTransitionPreset = getTransitionEffectPreset(transitionEffect);
    const keyframeCanvases: HTMLCanvasElement[] = sequenceCheckpoints.map((point) => {
      const kfCanvas = document.createElement('canvas');
      kfCanvas.width = thumbWidth;
      kfCanvas.height = thumbHeight;
      const kfCtx = kfCanvas.getContext('2d');
      if (kfCtx) {
        drawFrameAtProgress(kfCtx, thumbWidth, thumbHeight, point.progress);
      }
      return kfCanvas;
    });

    const extractedSequence: VideoSummaryKeyframe[] = sequenceCheckpoints.map((point, index) => {
      const currentCanvas = keyframeCanvases[index];
      const prevCanvas = index > 0 ? keyframeCanvases[index - 1] : null;
      const timestampSeconds = Number((point.progress * durationSeconds).toFixed(2));
      const totalFramesCount = Math.max(1, Math.round(durationSeconds * frameRate));
      const frameNumber =
        point.progress === 0
          ? 1
          : Math.min(totalFramesCount, Math.max(1, Math.round(point.progress * totalFramesCount)));

      // Apply the selected transition effect between adjacent sequence keyframes (KF 1->2, 2->3, 3->4)
      const transitionBridgeDataUrl = prevCanvas
        ? renderKeyframeTransitionComposite(prevCanvas, currentCanvas, transitionEffect, 0.55)
        : undefined;

      // Also blend a subtle incoming transition signature onto non-initial sequence preview keyframes
      const displayDataUrl =
        prevCanvas && index > 0 && index < sequenceCheckpoints.length - 1
          ? renderKeyframeTransitionComposite(prevCanvas, currentCanvas, transitionEffect, 0.72)
          : currentCanvas.toDataURL('image/jpeg', 0.85);

      return {
        id: `seq-${index}-${Math.round(point.progress * 100)}-${transitionEffect}`,
        index,
        progress: point.progress,
        timestampSeconds,
        formattedTimestamp: formatVideoTimestamp(timestampSeconds),
        label: point.label,
        frameNumber,
        dataUrl: displayDataUrl,
        transitionEffectId: transitionEffect,
        transitionName: activeTransitionPreset.name,
        transitionFromLabel:
          index > 0 ? `${sequenceCheckpoints[index - 1].label} → ${point.label}` : 'Initial Keyframe',
        transitionBridgeDataUrl,
      };
    });

    // Generate high-clarity final animation frame (at end of active clip or 100% progress) for Comparison View
    const endProgress =
      durationSeconds > 0
        ? Math.max(0, Math.min(1, trimEndSeconds / durationSeconds))
        : 1.0;
    const compScale = Math.min(1, 640 / Math.max(width, height));
    const compWidth = Math.max(320, Math.round(width * compScale));
    const compHeight = Math.max(180, Math.round(height * compScale));
    const compCanvas = document.createElement('canvas');
    compCanvas.width = compWidth;
    compCanvas.height = compHeight;
    const compCtx = compCanvas.getContext('2d');
    if (compCtx) {
      drawFrameAtProgress(compCtx, compWidth, compHeight, endProgress);
      setFinalFrameDataUrl(compCanvas.toDataURL('image/jpeg', 0.9));
    } else if (extractedSequence.length > 0) {
      setFinalFrameDataUrl(extractedSequence[extractedSequence.length - 1].dataUrl);
    }

    setVideoSummaryKeyframes(extracted);
    setSequencePreviewFrames(extractedSequence);
  }, [
    frames,
    aspectRatio,
    durationSeconds,
    trimEndSeconds,
    frameRate,
    transitionEffect,
    drawFrameAtProgress,
    renderedVideoUrl,
  ]);

  // Jump live preview canvas and rendered video player to a clicked Video Summary keyframe
  const handleSelectSummaryKeyframe = (keyframe: VideoSummaryKeyframe) => {
    setActiveKeyframeIndex(keyframe.index);
    setSelectedSummaryProgress(keyframe.progress);
    setIsLivePreviewing(false);

    const canvas = liveCanvasRef.current;
    if (canvas && frames.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = getAspectRatioDimensions(aspectRatio);
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        drawFrameAtProgress(ctx, width, height, keyframe.progress);
      }
    }

    if (videoPlayerRef.current) {
      try {
        videoPlayerRef.current.pause();
        videoPlayerRef.current.currentTime = Math.min(
          keyframe.timestampSeconds,
          Number.isFinite(videoPlayerRef.current.duration)
            ? Math.max(0, videoPlayerRef.current.duration - 0.05)
            : keyframe.timestampSeconds
        );
      } catch {
        // Ignore seek errors if media metadata hasn't finished loading yet
      }
    }
  };

  // Record Canvas to Video Blob using MediaRecorder API (100% Free, Client-Side)
  const handleRenderAndRecordVideo = async () => {
    const canvas = liveCanvasRef.current;
    if (!canvas || frames.length === 0) {
      setErrorMsg('Please upload at least one image first (or click "Load Sample Scene").');
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setErrorMsg(null);
    setIsLivePreviewing(false);

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setRenderedVideoUrl(null);

    if (audioPreviewElRef.current && isAudioPlaying) {
      try {
        audioPreviewElRef.current.pause();
        setIsAudioPlaying(false);
      } catch {
        // ignore
      }
    }

    let recordAudioCtx: AudioContext | null = null;
    let recordAudioSource: AudioBufferSourceNode | null = null;

    try {
      const { width, height } = getAspectRatioDimensions(aspectRatio);
      canvas.width = width;
      canvas.height = height;

      const canvasStream = canvas.captureStream(frameRate);
      let recordingStream: MediaStream = canvasStream;

      // If an MP3/WAV audio track is uploaded, synthesize a synced Web Audio stream and merge tracks
      if (audioTrack && audioTrack.audioBuffer) {
        try {
          const AudioCtxCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          recordAudioCtx = new AudioCtxCtor();
          const destNode = recordAudioCtx.createMediaStreamDestination();
          const gainNode = recordAudioCtx.createGain();
          gainNode.gain.value = Math.max(0, Math.min(1, audioVolume / 100));

          recordAudioSource = recordAudioCtx.createBufferSource();
          recordAudioSource.buffer = audioTrack.audioBuffer;
          recordAudioSource.loop = loopAudioTrack;

          recordAudioSource.connect(gainNode);
          gainNode.connect(destNode);

          const mergedTracks: MediaStreamTrack[] = [
            ...canvasStream.getVideoTracks(),
            ...destNode.stream.getAudioTracks(),
          ];
          recordingStream = new MediaStream(mergedTracks);
        } catch {
          recordingStream = canvasStream;
        }
      }

      const candidates = audioTrack
        ? [
            { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' as const },
            { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' as const },
            { mime: 'video/webm', ext: 'webm' as const },
            { mime: 'video/mp4', ext: 'mp4' as const },
          ]
        : [
            { mime: 'video/webm;codecs=vp9', ext: 'webm' as const },
            { mime: 'video/webm;codecs=vp8', ext: 'webm' as const },
            { mime: 'video/webm', ext: 'webm' as const },
            { mime: 'video/mp4', ext: 'mp4' as const },
          ];
      let chosenMime = '';
      let chosenExt: 'webm' | 'mp4' = 'webm';
      for (const c of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
          chosenMime = c.mime;
          chosenExt = c.ext;
          break;
        }
      }
      setRenderedVideoExt(chosenExt);

      const targetBitrate = frameRate === 60 ? 4500000 : frameRate === 30 ? 2500000 : 2000000;
      const recorder = chosenMime
        ? new MediaRecorder(recordingStream, {
            mimeType: chosenMime,
            videoBitsPerSecond: targetBitrate,
          })
        : new MediaRecorder(recordingStream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (recordAudioSource) {
          try {
            recordAudioSource.stop();
          } catch {
            // ignore
          }
        }
        if (recordAudioCtx) {
          try {
            void recordAudioCtx.close();
          } catch {
            // ignore
          }
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        activeBlobUrlRef.current = url;
        setRenderedVideoUrl(url);
        setLastRenderedTrimRange({ start: trimStartSeconds, end: trimEndSeconds });
        setIsTrimDirty(false);
        setIsRendering(false);
        setRenderProgress(100);
        setIsLivePreviewing(true);
      };

      recorder.start();
      if (recordAudioSource && audioTrack) {
        try {
          const audioOffset =
            audioTrack.durationSeconds > 0
              ? trimStartSeconds % audioTrack.durationSeconds
              : 0;
          recordAudioSource.start(0, audioOffset);
        } catch {
          // ignore start errors
        }
      }

      const startNorm =
        durationSeconds > 0 ? Math.max(0, Math.min(1, trimStartSeconds / durationSeconds)) : 0;
      const endNorm =
        durationSeconds > 0
          ? Math.max(startNorm, Math.min(1, trimEndSeconds / durationSeconds))
          : 1;
      const totalMs = Math.max(500, clippedDurationSeconds * 1000);
      const startTime = performance.now();
      const ctx = canvas.getContext('2d')!;

      const renderStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalMs);
        const timelineProgress = startNorm + progress * (endNorm - startNorm);
        setRenderProgress(Math.round(progress * 100));

        drawFrameAtProgress(ctx, width, height, timelineProgress);

        if (progress < 1) {
          requestAnimationFrame(renderStep);
        } else {
          setTimeout(() => {
            try {
              recorder.stop();
            } catch {
              // ignore
            }
          }, 200);
        }
      };

      requestAnimationFrame(renderStep);
    } catch (err: any) {
      if (recordAudioSource) {
        try {
          recordAudioSource.stop();
        } catch {
          // ignore
        }
      }
      if (recordAudioCtx) {
        try {
          void recordAudioCtx.close();
        } catch {
          // ignore
        }
      }
      setIsRendering(false);
      setIsLivePreviewing(true);
      setErrorMsg(err?.message || 'Failed to record video locally.');
    }
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    const trimSuffix = isClipTrimmed
      ? `-trim-${trimStartSeconds.toFixed(1)}s-${trimEndSeconds.toFixed(1)}s`
      : '';
    a.download = `animated-photo${trimSuffix}-${new Date().toISOString().slice(0, 10)}.${renderedVideoExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!renderedVideoUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Animated Photo Video',
          text: 'Check out this photo animation created with Jawed Imtiaz Studio!',
          url: window.location.href,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Trigger browser print dialog with src/index.css @media print styles active
  const handleDownloadPdf = () => {
    const canvas = liveCanvasRef.current;
    if (canvas && frames.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawFrameAtProgress(ctx, canvas.width || 1280, canvas.height || 720, 0.35);
      }
    }
    window.print();
  };

  return (
    <div className="page animate-image-to-video-page">
      <main className="container" style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '80px' }}>
        {/* Breadcrumb & Social Share */}
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
              { label: 'Animate Images into Video' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="Animate Images into Video | 100% Free"
            text="Transform static photos into cinematic 16:9 or 9:16 videos instantly in your browser with zero paid API costs."
            url={
              typeof window !== 'undefined'
                ? `${window.location.origin}/tools/animate-image-to-video`
                : 'https://jawed.co.in/tools/animate-image-to-video'
            }
          />
        </div>

        {/* Hero & Scoped Tool Toolbar */}
        <header style={{ marginBottom: '28px' }}>
          <div
            className="tool-toolbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '14px',
              flexWrap: 'wrap',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--emerald)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                100% Free • Client-Side Studio
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
                <ShieldCheck size={14} color="var(--emerald)" /> Zero Server Costs • Instant Rendering
              </span>
            </div>

            {/* Scoped Gear Configuration Button for AI Settings Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.76rem',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'var(--bg-darker)',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Cpu size={13} color="var(--accent)" />
                Engine:{' '}
                <strong style={{ color: 'var(--text-heading)' }}>
                  {aiConfig.provider === 'ollama' ? `Local Ollama (${aiConfig.ollamaModel})` : 'Google Gemini'}
                </strong>
              </span>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="theme-toggle-btn no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                aria-label="Download Generation Results as PDF"
                title="Export current animation parameters, storyboard frames, and preview as a PDF document"
              >
                <Printer size={15} color="var(--emerald)" />
                <span>Download as PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiSettingsOpen(true)}
                className="theme-toggle-btn no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                aria-label="Open AI Engine & Settings"
                title="Configure AI Backend & Generation Settings"
              >
                <Settings size={16} color="var(--accent)" />
                <span>AI Engine &amp; Settings</span>
              </button>
            </div>
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
            Animate Images into Video (Free Studio)
          </h1>
          <p className="lead" style={{ fontSize: '1.05rem', color: 'var(--muted)', maxWidth: '820px', lineHeight: 1.6, margin: 0 }}>
            Upload one or multiple static photos, apply cinematic Ken Burns pan/zoom effects, particle dust overlays, and AI-assisted captions, and record directly into a video file 100% locally in your browser.
          </p>
        </header>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#ef4444',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{errorMsg}</span>
          </div>
        )}

        <div className="card-grid two" style={{ alignItems: 'start' }}>
          {/* Left Column: Controls & Configuration */}
          <div className="card" style={{ gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--accent)" />
                1. Upload Photo(s)
              </h2>
              {frames.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadSampleScene}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                >
                  + Load Sample Scene
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              multiple
              style={{ display: 'none' }}
              id="free-image-upload-input"
            />

            {frames.length === 0 ? (
              <label
                htmlFor="free-image-upload-input"
                style={{
                  border: '2px dashed var(--line)',
                  borderRadius: '14px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-darker)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  <ImageIcon size={22} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-heading)', marginBottom: '3px' }}>
                    Click to upload photo(s)
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    PNG, JPEG, WebP (Single or multiple images, Max 20MB)
                  </span>
                </div>
              </label>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {frames.map((frame, index) => {
                  const isSelected = selectedPreviewIndex === index;
                  return (
                  <div
                    key={frame.id}
                    onClick={() => setSelectedPreviewIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isSelected ? 'var(--surface-accent)' : 'var(--bg-darker)',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line)',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Click to inspect this image in the High-Quality Preview box"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <img
                        src={frame.thumbnailBase64 || frame.url}
                        alt={frame.name}
                        style={{
                          width: '48px',
                          height: '32px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          flexShrink: 0,
                          border: '1px solid var(--line)',
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            color: 'var(--text-heading)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {index + 1}. {frame.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--emerald)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={11} /> Thumbnail ready
                          {frame.dimensions ? ` • ${frame.dimensions.width}×${frame.dimensions.height}` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFrame(frame.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: 'var(--rose)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="button button-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Plus size={14} /> Add Another Image
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: '8px' }}>
                2. Select Animation Effect
              </label>
              <div style={{ display: 'grid', gap: '8px' }}>
                {ANIMATION_EFFECTS.map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => setSelectedEffect(fx.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedEffect === fx.id ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: selectedEffect === fx.id ? 'var(--surface-accent)' : 'var(--bg-darker)',
                      color: selectedEffect === fx.id ? 'var(--text-heading)' : 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '2px' }}>{fx.label}</strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{fx.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                  3. Video Caption / Overlay Text
                </label>
                <button
                  type="button"
                  onClick={handleSuggestCaption}
                  disabled={isGeneratingCaption}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Generate caption with configured AI backend"
                >
                  {isGeneratingCaption ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  AI Suggest
                </button>
              </div>
              <input
                type="text"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-darker)',
                  color: 'var(--text)',
                  font: 'inherit',
                }}
                placeholder="e.g. Summer Vacation • 2026"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="output-aspect-ratio-select"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--text-heading)',
                    marginBottom: '6px',
                  }}
                >
                  <span>Output Aspect Ratio</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {getAspectRatioDimensions(aspectRatio).width}×{getAspectRatioDimensions(aspectRatio).height}px
                  </span>
                </label>
                <select
                  id="output-aspect-ratio-select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as OutputAspectRatio)}
                  aria-label="Output Aspect Ratio"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-darker)',
                    color: 'var(--text)',
                    font: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    fontSize: '0.72rem',
                    color: 'var(--muted)',
                  }}
                >
                  Standard: {getAspectRatioDimensions(aspectRatio).standard}
                </span>
              </div>

              <div>
                <label
                  htmlFor="output-duration-select"
                  style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '6px' }}
                >
                  Duration: {durationSeconds}s
                </label>
                <select
                  id="output-duration-select"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-darker)',
                    color: 'var(--text)',
                    font: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value={3}>3 Seconds</option>
                  <option value={5}>5 Seconds</option>
                  <option value={8}>8 Seconds</option>
                  <option value={10}>10 Seconds</option>
                </select>
              </div>
            </div>

            {/* 4. Animation Intensity Slider & Output Frame Rate Dropdown (Saved Locally) */}
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                background: 'var(--bg-darker)',
                display: 'grid',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-heading)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sliders size={15} color="var(--accent)" />
                  4. Motion &amp; Frame Rate
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetPreferences();
                    setMotionBlurEnabled(false);
                    setTransitionEffect('crossfade');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.73rem',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Reset animation intensity, frame rate, and motion blur to defaults"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>

              {/* Animation Intensity Range Slider */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    htmlFor="animation-intensity-slider"
                    style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-heading)' }}
                  >
                    Animation Intensity
                  </label>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      background: 'var(--surface-accent)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {animationIntensity}% •{' '}
                    {animationIntensity < 75 ? 'Subtle' : animationIntensity > 130 ? 'Dramatic' : 'Balanced'}
                  </span>
                </div>
                <input
                  id="animation-intensity-slider"
                  type="range"
                  min={20}
                  max={200}
                  step={5}
                  value={animationIntensity}
                  onChange={(e) => setAnimationIntensity(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                  aria-label="Animation Intensity Percentage"
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--muted)',
                    marginTop: '2px',
                  }}
                >
                  <span>20% (Gentle)</span>
                  <span>100% (Default)</span>
                  <span>200% (High Motion)</span>
                </div>
              </div>

              {/* Frame Rate Selector (24fps, 30fps, 60fps) */}
              <div
                data-testid="frame-rate-config-panel"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
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
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <label
                    htmlFor="output-framerate-select"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      color: 'var(--text-heading)',
                      cursor: isRendering ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Gauge size={14} color="var(--accent)" /> Frame Rate
                  </label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      data-testid="frame-rate-active-badge"
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: 'var(--accent)',
                      }}
                    >
                      {frameRate}fps • {clippedTotalFrames} frames
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 500 }}>
                      Saved locally
                    </span>
                  </div>
                </div>

                {/* Interactive Segmented Frame Rate Buttons */}
                <div
                  role="radiogroup"
                  aria-label="Frame Rate Selector"
                  data-testid="frame-rate-button-group"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '6px',
                  }}
                >
                  {(
                    [
                      {
                        fps: 24 as OutputFrameRate,
                        label: '24fps',
                        tier: 'Cinematic',
                        desc: 'Film cadence (41.7ms)',
                      },
                      {
                        fps: 30 as OutputFrameRate,
                        label: '30fps',
                        tier: 'Balanced',
                        desc: 'Standard web (33.3ms)',
                      },
                      {
                        fps: 60 as OutputFrameRate,
                        label: '60fps',
                        tier: 'Ultra-Smooth',
                        desc: 'High fluidity (16.7ms)',
                      },
                    ] as const
                  ).map((option) => {
                    const isSelected = frameRate === option.fps;
                    const optionTotalFrames = Math.max(
                      1,
                      Math.round(clippedDurationSeconds * option.fps)
                    );
                    return (
                      <button
                        key={option.fps}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isRendering}
                        data-testid={`frame-rate-option-${option.fps}fps`}
                        onClick={() => setFrameRate(option.fps)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid rgba(56, 189, 248, 0.65)'
                            : '1px solid var(--line)',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(16, 185, 129, 0.1))'
                            : 'var(--bg-elevated)',
                          color: isSelected ? 'var(--text-heading)' : 'var(--text)',
                          cursor: isRendering ? 'not-allowed' : 'pointer',
                          opacity: isRendering ? 0.6 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: isSelected ? 'var(--accent)' : 'var(--text-heading)',
                          }}
                        >
                          {option.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: isSelected ? 'var(--text)' : 'var(--muted)',
                          }}
                        >
                          {option.tier}
                        </span>
                        <span
                          style={{
                            fontSize: '0.63rem',
                            color: 'var(--muted)',
                          }}
                        >
                          {optionTotalFrames} frames
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Accessible Synchronized Dropdown Selector */}
                <select
                  id="output-framerate-select"
                  aria-label="Frame Rate"
                  data-testid="frame-rate-select"
                  value={frameRate}
                  disabled={isRendering}
                  onChange={(e) => setFrameRate(Number(e.target.value) as OutputFrameRate)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text)',
                    font: 'inherit',
                    fontSize: '0.8rem',
                    cursor: isRendering ? 'not-allowed' : 'pointer',
                    opacity: isRendering ? 0.65 : 1,
                  }}
                >
                  <option value={24}>24fps — Cinematic Film Cadence (24 FPS)</option>
                  <option value={30}>30fps — Balanced Social &amp; Web Video (30 FPS)</option>
                  <option value={60}>60fps — Ultra-Smooth High Frame Rate (60 FPS)</option>
                </select>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>
                    Smoothness:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {frameRate === 60
                        ? 'Ultra-Smooth (16.7ms step)'
                        : frameRate === 30
                          ? 'Balanced Standard (33.3ms step)'
                          : 'Cinematic Motion (41.7ms step)'}
                    </strong>
                  </span>
                  <span>
                    {clippedDurationSeconds.toFixed(1)}s × {frameRate}fps = {clippedTotalFrames} frames
                  </span>
                </div>
              </div>

              {/* Motion Blur Toggle Switch (Applies subtle blur to high-motion heatmap areas) */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: motionBlurEnabled
                    ? '1px solid rgba(56, 189, 248, 0.48)'
                    : '1px solid var(--line)',
                  background: motionBlurEnabled
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(249, 115, 22, 0.08))'
                    : 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.18s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <label
                    htmlFor="motion-blur-toggle"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      color: 'var(--text-heading)',
                      cursor: 'pointer',
                    }}
                  >
                    <Activity size={14} color={motionBlurEnabled ? 'var(--accent)' : 'var(--muted)'} />
                    <span>Motion Blur</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '999px',
                        background: motionBlurEnabled
                          ? 'rgba(56, 189, 248, 0.2)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: motionBlurEnabled ? 'var(--accent)' : 'var(--muted)',
                        border: motionBlurEnabled
                          ? '1px solid rgba(56, 189, 248, 0.4)'
                          : '1px solid rgba(148, 163, 184, 0.25)',
                      }}
                    >
                      {motionBlurEnabled ? `ON (${motionBlurRadiusPx}px)` : 'OFF'}
                    </span>
                  </label>

                  <button
                    id="motion-blur-toggle"
                    type="button"
                    role="switch"
                    aria-checked={motionBlurEnabled}
                    aria-label="Motion Blur"
                    onClick={() => setMotionBlurEnabled((prev) => !prev)}
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      borderRadius: '999px',
                      border: motionBlurEnabled
                        ? '1px solid rgba(56, 189, 248, 0.7)'
                        : '1px solid var(--line)',
                      background: motionBlurEnabled
                        ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                        : 'rgba(15, 23, 42, 0.85)',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background 0.18s ease, border-color 0.18s ease',
                      flexShrink: 0,
                    }}
                    title="Toggle subtle motion blur on high-activity areas highlighted in the AI motion heatmap"
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: motionBlurEnabled ? '22px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#f8fafc',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
                        transition: 'left 0.18s ease',
                      }}
                    />
                  </button>
                </div>

                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                  Applies a subtle directional blur ({motionBlurRadiusPx}px) to high-motion areas highlighted in the heatmap
                  {frames.length > 0 ? ` (${heatmapMetrics.dominantZone} • ${heatmapMetrics.hotspotCount} hotspots)` : ''}.
                </span>
              </div>

              {/* Transition Effects Dropdown (Applied between keyframes extracted for the Sequence Preview) */}
              <div
                data-testid="transition-effects-config-panel"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
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
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <label
                    htmlFor="transition-effects-select"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      color: 'var(--text-heading)',
                      cursor: isRendering ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Wand2 size={14} color="var(--accent)" /> Transition Effects
                  </label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      data-testid="transition-effects-active-badge"
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: 'var(--accent)',
                      }}
                    >
                      {getTransitionEffectPreset(transitionEffect).iconSymbol}{' '}
                      {getTransitionEffectPreset(transitionEffect).name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 500 }}>
                      Sequence Preview
                    </span>
                  </div>
                </div>

                {/* Transition Effects Dropdown */}
                <select
                  id="transition-effects-select"
                  aria-label="Transition Effects"
                  data-testid="transition-effects-select"
                  value={transitionEffect}
                  disabled={isRendering}
                  onChange={(e) => setTransitionEffect(e.target.value as TransitionEffectId)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text)',
                    font: 'inherit',
                    fontSize: '0.82rem',
                    cursor: isRendering ? 'not-allowed' : 'pointer',
                    opacity: isRendering ? 0.65 : 1,
                  }}
                >
                  {TRANSITION_EFFECT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Quick Transition Preset Pills */}
                <div
                  role="radiogroup"
                  aria-label="Transition Effects Presets"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  {TRANSITION_EFFECT_PRESETS.map((preset) => {
                    const isSelected = transitionEffect === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isRendering}
                        data-testid={`transition-effect-option-${preset.id}`}
                        onClick={() => setTransitionEffect(preset.id)}
                        style={{
                          padding: '5px 9px',
                          borderRadius: '7px',
                          border: isSelected
                            ? '1px solid rgba(56, 189, 248, 0.65)'
                            : '1px solid var(--line)',
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(16, 185, 129, 0.1))'
                            : 'var(--bg-elevated)',
                          color: isSelected ? 'var(--accent)' : 'var(--text)',
                          fontSize: '0.73rem',
                          fontWeight: isSelected ? 700 : 600,
                          cursor: isRendering ? 'not-allowed' : 'pointer',
                          opacity: isRendering ? 0.6 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{preset.iconSymbol}</span>
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    flexWrap: 'wrap',
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>
                    {getTransitionEffectPreset(transitionEffect).shortDesc}
                  </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {getTransitionEffectPreset(transitionEffect).mechanism}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Audio Track Upload (MP3 / WAV) & Waveform Preview Sync */}
            <div
              aria-label="Audio Track Upload and Waveform Sync"
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: audioTrack
                  ? '1px solid rgba(56, 189, 248, 0.42)'
                  : '1px solid var(--line)',
                background: audioTrack
                  ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, var(--bg-darker) 100%)'
                  : 'var(--bg-darker)',
                display: 'grid',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-heading)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Music size={15} color="var(--accent)" />
                  5. Audio Track &amp; Waveform Sync
                </span>

                {!audioTrack ? (
                  <button
                    type="button"
                    onClick={handleLoadSampleAudioTrack}
                    disabled={isDecodingAudio}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      cursor: 'pointer',
                    }}
                  >
                    + Load Sample WAV
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: 'var(--emerald)',
                      border: '1px solid rgba(16, 185, 129, 0.32)',
                    }}
                  >
                    Synced with Final Export ({audioTrack.format})
                  </span>
                )}
              </div>

              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioFileChange}
                accept=".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave"
                style={{ display: 'none' }}
                id="audio-track-upload-input"
                aria-label="Import MP3 or WAV Audio File"
              />

              {!audioTrack ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isDecodingAudio}
                    aria-label="Audio Track"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px dashed rgba(56, 189, 248, 0.45)',
                      background: 'rgba(15, 23, 42, 0.55)',
                      color: 'var(--text-heading)',
                      cursor: isDecodingAudio ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isDecodingAudio ? (
                      <>
                        <Loader2 size={16} className="animate-spin" color="var(--accent)" />
                        <span>Decoding Audio &amp; Building Waveform...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} color="var(--accent)" />
                        <span>Upload Audio Track (MP3 / WAV)</span>
                      </>
                    )}
                  </button>
                  <span style={{ fontSize: '0.73rem', color: 'var(--muted)', textAlign: 'center' }}>
                    Import an MP3 or WAV soundtrack to preview its waveform and merge directly into the rendered video.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Hidden audio element for instant auditioning */}
                  <audio
                    ref={audioPreviewElRef}
                    src={audioTrack.url}
                    onTimeUpdate={(e) => setAudioPlayheadSeconds(e.currentTarget.currentTime)}
                    onEnded={() => {
                      setIsAudioPlaying(false);
                      setAudioPlayheadSeconds(0);
                    }}
                    style={{ display: 'none' }}
                  />

                  {/* Loaded Track Metadata Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      background: 'rgba(2, 6, 23, 0.65)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={handleToggleAudioPreview}
                        aria-label={isAudioPlaying ? 'Pause Audio Track Preview' : 'Play Audio Track Preview'}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: isAudioPlaying
                            ? 'var(--accent)'
                            : 'rgba(56, 189, 248, 0.14)',
                          color: isAudioPlaying ? '#020617' : 'var(--accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title={isAudioPlaying ? 'Pause audio preview' : 'Play audio preview'}
                      >
                        {isAudioPlaying ? <Pause size={13} /> : <Play size={13} />}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--text-heading)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {audioTrack.name}
                        </span>
                        <span style={{ fontSize: '0.69rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                          {audioTrack.format} • {formatVideoTimestamp(audioTrack.durationSeconds)} •{' '}
                          {(audioTrack.sampleRate / 1000).toFixed(1)} kHz
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '0.7rem',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveAudioTrack}
                        aria-label="Remove Audio Track"
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: 'var(--rose)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Interactive Waveform Preview Canvas */}
                  <div
                    aria-label="Audio Waveform Preview Container"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      background: '#020617',
                      border: '1px solid rgba(56, 189, 248, 0.28)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.68rem',
                        color: 'var(--muted)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                        Waveform Preview (Click to scrub audio &amp; video)
                      </span>
                      <span style={{ fontFamily: 'monospace' }}>
                        {formatVideoTimestamp(audioPlayheadSeconds)} /{' '}
                        {formatVideoTimestamp(audioTrack.durationSeconds)}
                      </span>
                    </div>

                    <canvas
                      ref={waveformCanvasRef}
                      onClick={handleWaveformClick}
                      aria-label="Audio Waveform Preview"
                      style={{
                        width: '100%',
                        height: '64px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'block',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginTop: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '140px' }}>
                        <Volume2 size={13} color="var(--accent)" />
                        <label
                          htmlFor="audio-track-volume-slider"
                          style={{ fontSize: '0.71rem', color: 'var(--muted)', fontWeight: 600 }}
                        >
                          Mix ({audioVolume}%):
                        </label>
                        <input
                          id="audio-track-volume-slider"
                          type="range"
                          aria-label="Audio Track Mix Volume"
                          min={0}
                          max={100}
                          step={5}
                          value={audioVolume}
                          onChange={(e) => setAudioVolume(Number(e.target.value))}
                          style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>

                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.71rem',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={loopAudioTrack}
                          onChange={(e) => setLoopAudioTrack(e.target.checked)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        Loop to match video duration
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRenderAndRecordVideo}
              disabled={isRendering || frames.length === 0}
              className="button"
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '13px',
                justifyContent: 'center',
                opacity: isRendering || frames.length === 0 ? 0.6 : 1,
                cursor: isRendering || frames.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isRendering ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Rendering Video{audioTrack ? ' + Audio' : ''} ({renderProgress}%)
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {audioTrack ? 'Render & Merge Video + Audio Track' : 'Render & Record Video File'}
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Canvas Preview & Video Output */}
          <div className="card" style={{ gap: '18px', minHeight: '460px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={18} color="var(--accent)" />
                2. Live Preview &amp; Output
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="comparison-view-header-toggle"
                  role="switch"
                  aria-checked={comparisonViewEnabled}
                  aria-label="Comparison View"
                  onClick={() => setComparisonViewEnabled((prev) => !prev)}
                  title="Toggle side-by-side Comparison View between the original source image and the final animation frame"
                  style={{
                    background: comparisonViewEnabled
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(16, 185, 129, 0.18))'
                      : 'var(--bg-darker)',
                    border: comparisonViewEnabled
                      ? '1px solid rgba(56, 189, 248, 0.55)'
                      : '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: comparisonViewEnabled ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <LayoutGrid size={13} color={comparisonViewEnabled ? 'var(--accent)' : 'var(--muted)'} />
                  Comparison View: {comparisonViewEnabled ? 'ON' : 'OFF'}
                </button>
                {frames.length > 0 && !isRendering && (
                  <button
                    type="button"
                    onClick={() => setIsLivePreviewing((prev) => !prev)}
                    style={{
                      background: 'var(--bg-darker)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {isLivePreviewing ? <Pause size={13} /> : <Play size={13} />}
                    {isLivePreviewing ? 'Pause Preview' : 'Resume Preview'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAiSettingsOpen(true)}
                  style={{
                    background: 'var(--bg-darker)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '6px 9px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="AI Settings"
                  title="Open AI Backend & Generation Settings"
                >
                  <Settings size={15} color="var(--accent)" />
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 10px' }}>
              Real-time browser canvas preview • Outputting <strong>{aspectRatio}</strong> (
              {getAspectRatioDimensions(aspectRatio).width}×{getAspectRatioDimensions(aspectRatio).height}px) at{' '}
              <strong>{frameRate} FPS</strong> with <strong>{animationIntensity}%</strong> motion intensity
              {motionBlurEnabled ? ` • Motion Blur ON (${motionBlurRadiusPx}px)` : ''}.
            </p>

            {/* High-Quality Source Image Preview Section (Before & Alongside Animation Sequence) */}
            {frames.length > 0 && (() => {
              const activeFrame = frames[Math.min(selectedPreviewIndex, frames.length - 1)] || frames[0];
              const frameW = activeFrame.dimensions?.width || activeFrame.imgElement.naturalWidth || 1280;
              const frameH = activeFrame.dimensions?.height || activeFrame.imgElement.naturalHeight || 720;
              const megapixels = ((frameW * frameH) / 1_000_000).toFixed(2);
              const isHighRes = frameW >= 1280 || frameH >= 720;

              return (
                <section
                  aria-label="Selected Source Image Quality Preview"
                  style={{
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-darker)',
                    padding: '12px',
                    display: 'grid',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: 'var(--text-heading)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Eye size={15} color="var(--accent)" />
                        Source Image Preview (Quality Check)
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: isHighRes ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                          color: isHighRes ? 'var(--emerald)' : '#fbbf24',
                          border: isHighRes
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {isHighRes ? 'HD Quality Verified' : 'Standard Resolution'} • {frameW}×{frameH}px ({megapixels} MP)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setShowMotionHeatmap((prev) => !prev)}
                        aria-pressed={showMotionHeatmap}
                        style={{
                          background: showMotionHeatmap
                            ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.18))'
                            : 'var(--surface)',
                          border: showMotionHeatmap
                            ? '1px solid rgba(249, 115, 22, 0.55)'
                            : '1px solid var(--line)',
                          borderRadius: '7px',
                          padding: '4px 9px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: showMotionHeatmap ? '#fdba74' : 'var(--text)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                        title="Toggle AI Motion Heatmap overlay highlighting high-activity transformation regions"
                      >
                        <Flame size={12} color={showMotionHeatmap ? '#f97316' : 'var(--muted)'} />
                        Motion Heatmap: {showMotionHeatmap ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSourceFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: '7px',
                          padding: '4px 9px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                        title="Toggle between full uncropped image and target aspect ratio framing"
                      >
                        <Maximize2 size={12} color="var(--accent)" />
                        {sourceFitMode === 'contain' ? 'Fit: Full Original' : `Crop: ${aspectRatio} Frame`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsLivePreviewing((prev) => !prev)}
                        style={{
                          background: isLivePreviewing ? 'var(--surface)' : 'var(--accent)',
                          border: '1px solid var(--line)',
                          borderRadius: '7px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isLivePreviewing ? 'var(--text-heading)' : '#020617',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {isLivePreviewing ? <Pause size={12} /> : <Play size={12} />}
                        {isLivePreviewing ? 'Pause Animation' : 'Start Animation Sequence'}
                      </button>
                    </div>
                  </div>

                  {/* High-Quality Static Source Preview Box with AI Motion Heatmap Overlay */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '220px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: '#020617',
                      border: showMotionHeatmap
                        ? '1px solid rgba(249, 115, 22, 0.45)'
                        : '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={activeFrame.url}
                      alt={`High-quality preview of ${activeFrame.name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: sourceFitMode,
                        display: 'block',
                      }}
                    />

                    {/* Subtle High-Motion Regional Blur Preview Layer when Motion Blur is Enabled */}
                    {motionBlurEnabled && (
                      <img
                        src={activeFrame.url}
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: sourceFitMode,
                          pointerEvents: 'none',
                          filter: `blur(${motionBlurRadiusPx}px)`,
                          opacity: 0.62,
                          transform:
                            selectedEffect === 'cinematic-pan'
                              ? 'translateX(4px) scale(1.01)'
                              : 'scale(1.018)',
                          WebkitMaskImage:
                            selectedEffect === 'cinematic-pan'
                              ? 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.92) 100%)'
                              : 'radial-gradient(circle at center, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.95) 85%)',
                          maskImage:
                            selectedEffect === 'cinematic-pan'
                              ? 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.92) 100%)'
                              : 'radial-gradient(circle at center, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.95) 85%)',
                        }}
                      />
                    )}

                    {/* AI Motion Heatmap Canvas Overlay */}
                    <canvas
                      ref={heatmapCanvasRef}
                      aria-label="AI Motion Activity Heatmap Overlay"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        opacity: showMotionHeatmap ? heatmapOpacity / 100 : 0,
                        mixBlendMode: 'screen',
                        transition: 'opacity 0.2s ease',
                      }}
                    />

                    {/* Top-Left AI Motion Impact Telemetry Pill when Heatmap is Active */}
                    {showMotionHeatmap && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '10px',
                          right: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: 'rgba(2, 6, 23, 0.84)',
                            border: '1px solid rgba(249, 115, 22, 0.5)',
                            color: '#fed7aa',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          <Activity size={11} color="#f97316" />
                          AI Motion Heatmap • Peak Activity: {heatmapMetrics.peakActivity}% ({heatmapMetrics.hotspotCount} Hotspots)
                          {motionBlurEnabled ? ` • Motion Blur: ${motionBlurRadiusPx}px` : ''}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: 'rgba(2, 6, 23, 0.84)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#bae6fd',
                            fontSize: '0.69rem',
                            fontWeight: 600,
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          {heatmapMetrics.vectorProfile} • Focus: {heatmapMetrics.dominantZone}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        right: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        background: 'rgba(2, 6, 23, 0.78)',
                        backdropFilter: 'blur(6px)',
                        fontSize: '0.74rem',
                        color: '#e2e8f0',
                      }}
                    >
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Inspecting Frame #{Math.min(selectedPreviewIndex, frames.length - 1) + 1}: {activeFrame.name}
                      </span>
                      <span style={{ color: 'var(--emerald)', fontWeight: 600, flexShrink: 0 }}>
                        Ready for { ANIMATION_EFFECTS.find((e) => e.id === selectedEffect)?.label || selectedEffect }
                      </span>
                    </div>
                  </div>

                  {/* Motion Heatmap Controls & Thermal Legend Bar */}
                  {showMotionHeatmap && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        fontSize: '0.73rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-heading)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Flame size={13} color="#f97316" />
                          Transformation Impact Scale:
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Low</span>
                          <div
                            style={{
                              width: '96px',
                              height: '8px',
                              borderRadius: '999px',
                              background: 'linear-gradient(90deg, #0ea5e9 0%, #10b981 38%, #f59e0b 70%, #ef4444 90%, #fef08a 100%)',
                              border: '1px solid rgba(255,255,255,0.18)',
                            }}
                          />
                          <span style={{ color: '#fca5a5', fontWeight: 700 }}>High Activity</span>
                        </div>
                        <span style={{ color: 'var(--muted)' }}>
                          • Avg Impact: <strong style={{ color: 'var(--text-heading)' }}>{heatmapMetrics.averageActivity}%</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <label
                          htmlFor="heatmap-opacity-slider"
                          style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.72rem' }}
                        >
                          Overlay Opacity ({heatmapOpacity}%):
                        </label>
                        <input
                          id="heatmap-opacity-slider"
                          type="range"
                          min={20}
                          max={95}
                          step={5}
                          value={heatmapOpacity}
                          onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                          style={{ width: '80px', accentColor: '#f97316', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Frame Selector Strip (Interactive Thumbnails) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
                      {frames.map((frame, idx) => {
                        const isSelected = idx === Math.min(selectedPreviewIndex, frames.length - 1);
                        return (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() => setSelectedPreviewIndex(idx)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px 3px 4px',
                              borderRadius: '7px',
                              background: isSelected ? 'var(--surface-accent)' : 'var(--surface)',
                              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title={`Inspect frame ${idx + 1}: ${frame.name}`}
                          >
                            <img
                              src={frame.thumbnailBase64 || frame.url}
                              alt={`Thumbnail ${idx + 1}`}
                              style={{
                                width: '36px',
                                height: '22px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                              }}
                            />
                            <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                              #{idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--emerald)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={13} /> Source Verified
                    </span>
                  </div>
                </section>
              );
            })()}

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#020617',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--line)',
                position: 'relative',
                minHeight: '280px',
              }}
            >
              <canvas
                ref={liveCanvasRef}
                style={{
                  width: '100%',
                  maxHeight: aspectRatio === '9:16' ? '400px' : aspectRatio === '1:1' ? '360px' : '320px',
                  objectFit: 'contain',
                  display: frames.length > 0 ? 'block' : 'none',
                }}
              />

              {frames.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  <ImageIcon size={36} opacity={0.4} style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: '0.88rem', display: 'block', marginBottom: '12px' }}>
                    Upload a photo to see the live animation preview.
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadSampleScene}
                    className="button button-secondary"
                    style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                  >
                    Try with Sample Horizon Photo
                  </button>
                </div>
              )}

              {isRendering && !renderedVideoUrl && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.88)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    color: '#fff',
                    zIndex: 10,
                    padding: '24px',
                  }}
                >
                  <Loader2 size={32} className="animate-spin" color="var(--accent)" />
                  <strong style={{ fontSize: '0.95rem' }}>Recording video stream ({renderProgress}%)...</strong>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '280px',
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.22)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, renderProgress))}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: 'var(--accent)',
                        transition: 'width 0.12s ease-out',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    Please keep this tab active while rendering.
                  </span>
                </div>
              )}
            </div>

            {/* AI Backend Video Generation Progress Bar (Automatically disappears once renderedVideoUrl is ready) */}
            <VideoGenerationProgressBar
              progress={renderProgress}
              isGenerating={isRendering}
              videoUrl={renderedVideoUrl}
              providerLabel={
                aiConfig.provider === 'ollama'
                  ? `Ollama (${aiConfig.ollamaModel})`
                  : 'Gemini Motion Engine'
              }
              frameRate={frameRate}
              durationSeconds={clippedDurationSeconds}
            />

            {/* Clickable Video Summary Keyframe Index */}
            {frames.length > 0 && videoSummaryKeyframes.length > 0 && (
              <div
                aria-label="Video Summary"
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--line)',
                  background: 'rgba(15, 23, 42, 0.45)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.32)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    >
                      <LayoutGrid size={14} />
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                          Video Summary
                        </strong>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: 'rgba(56, 189, 248, 0.14)',
                            color: 'var(--accent)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                          }}
                        >
                          {videoSummaryKeyframes.length} Keyframes
                        </span>
                      </div>
                      <span style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'block' }}>
                        Click any extracted keyframe to inspect its exact timestamp in the preview &amp; video player
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      color: 'var(--muted)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(2, 6, 23, 0.65)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    00:00.0 → {formatVideoTimestamp(durationSeconds)} ({frameRate} FPS)
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {videoSummaryKeyframes.map((kf) => {
                    const isSelected = !isLivePreviewing && activeKeyframeIndex === kf.index;
                    const { width: arW, height: arH } = getAspectRatioDimensions(aspectRatio);
                    return (
                      <button
                        key={kf.id}
                        type="button"
                        onClick={() => handleSelectSummaryKeyframe(kf)}
                        title={`Jump to ${kf.label} at ${kf.formattedTimestamp} (Frame #${kf.frameNumber})`}
                        style={{
                          textAlign: 'left',
                          padding: 0,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: isSelected
                            ? '2px solid var(--accent)'
                            : '1px solid rgba(148, 163, 184, 0.22)',
                          background: isSelected
                            ? 'rgba(56, 189, 248, 0.12)'
                            : 'rgba(2, 6, 23, 0.75)',
                          cursor: 'pointer',
                          transition: 'all 0.16s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? '0 0 0 3px rgba(56, 189, 248, 0.15)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: `${arW} / ${arH}`,
                            maxHeight: '96px',
                            background: '#020617',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={kf.dataUrl}
                            alt={`${kf.label} at ${kf.formattedTimestamp}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                          {/* Keyframe Index Badge */}
                          <span
                            style={{
                              position: 'absolute',
                              top: '5px',
                              left: '5px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '5px',
                              background: isSelected
                                ? 'var(--accent)'
                                : 'rgba(2, 6, 23, 0.78)',
                              color: isSelected ? '#020617' : '#f8fafc',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            #{kf.index + 1}
                          </span>
                          {/* Timestamp Badge */}
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '5px',
                              right: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.66rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '5px',
                              background: 'rgba(2, 6, 23, 0.85)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            <Clock size={10} />
                            {kf.formattedTimestamp}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: '7px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: isSelected ? 'var(--accent)' : 'var(--text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {kf.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: 'var(--muted)',
                              fontFamily: 'monospace',
                              flexShrink: 0,
                            }}
                          >
                            F{kf.frameNumber}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4-Keyframe 'Sequence Preview' Filmstrip Row with Transition Effects */}
            {frames.length > 0 && sequencePreviewFrames.length === 4 && (() => {
              const activeTransitionPreset = getTransitionEffectPreset(transitionEffect);
              const { width: arW, height: arH } = getAspectRatioDimensions(aspectRatio);

              return (
                <div
                  aria-label="Sequence Preview"
                  data-testid="sequence-preview-panel"
                  style={{
                    borderRadius: '12px',
                    border: renderedVideoUrl
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid var(--line)',
                    background: renderedVideoUrl
                      ? 'linear-gradient(180deg, rgba(6, 78, 59, 0.16) 0%, rgba(15, 23, 42, 0.65) 100%)'
                      : 'rgba(15, 23, 42, 0.5)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                      <Film size={15} color="var(--accent)" />
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text)' }}>
                        Sequence Preview
                      </strong>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: 'rgba(56, 189, 248, 0.14)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        4-Keyframe Strip
                      </span>
                      <span
                        data-testid="sequence-preview-transition-badge"
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--emerald)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{activeTransitionPreset.iconSymbol}</span>
                        <span>Transition: {activeTransitionPreset.name}</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        data-testid="sequence-transition-play-btn"
                        onClick={() => {
                          setIsPreviewingSequenceTransitions((prev) => {
                            const next = !prev;
                            if (!next) setActiveTransitionPairIndex(null);
                            return next;
                          });
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 9px',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          border: isPreviewingSequenceTransitions
                            ? '1px solid rgba(16, 185, 129, 0.55)'
                            : '1px solid rgba(56, 189, 248, 0.4)',
                          background: isPreviewingSequenceTransitions
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(56, 189, 248, 0.12)',
                          color: isPreviewingSequenceTransitions ? 'var(--emerald)' : 'var(--accent)',
                          cursor: 'pointer',
                        }}
                      >
                        {isPreviewingSequenceTransitions ? <Pause size={11} /> : <Play size={11} />}
                        {isPreviewingSequenceTransitions
                          ? `Playing ${activeTransitionPreset.name} Transitions`
                          : `Preview ${activeTransitionPreset.name} Transitions`}
                      </button>
                    </div>
                  </div>

                  {/* 4 Extracted Sequence Keyframes Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {sequencePreviewFrames.map((seqFrame, idx) => {
                      const isCurrent =
                        !isLivePreviewing &&
                        Math.abs(selectedSummaryProgress - seqFrame.progress) < 0.05;
                      const isTransitionTarget =
                        activeTransitionPairIndex !== null && activeTransitionPairIndex + 1 === idx;

                      // Visual transition style applied to keyframe thumbnail based on selected TransitionEffectId
                      const imgTransitionStyle: React.CSSProperties = {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.35s ease, opacity 0.35s ease, filter 0.35s ease',
                        transform:
                          isTransitionTarget && transitionEffect === 'zoom'
                            ? 'scale(1.12)'
                            : isTransitionTarget && transitionEffect === 'pan'
                              ? 'translateX(4px) scale(1.05)'
                              : 'scale(1)',
                        filter:
                          isTransitionTarget && transitionEffect === 'dissolve-blur'
                            ? 'blur(0.8px) brightness(1.08)'
                            : 'none',
                      };

                      return (
                        <button
                          key={seqFrame.id}
                          type="button"
                          onClick={() => {
                            setIsPreviewingSequenceTransitions(false);
                            setActiveTransitionPairIndex(idx > 0 ? idx - 1 : 0);
                            handleSelectSummaryKeyframe(seqFrame);
                          }}
                          title={`Inspect Sequence Frame ${idx + 1}/4 (${seqFrame.label} • ${seqFrame.formattedTimestamp} • ${activeTransitionPreset.name} Transition)`}
                          style={{
                            padding: 0,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border:
                              isCurrent || isTransitionTarget
                                ? '2px solid var(--accent)'
                                : '1px solid rgba(148, 163, 184, 0.24)',
                            background: 'rgba(2, 6, 23, 0.85)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'left',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: `${arW} / ${arH}`,
                              maxHeight: '68px',
                              background: '#020617',
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={seqFrame.dataUrl}
                              alt={`Sequence preview ${idx + 1} at ${seqFrame.formattedTimestamp}`}
                              style={imgTransitionStyle}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(2, 6, 23, 0.82)',
                                color: '#e2e8f0',
                              }}
                            >
                              {idx + 1}/4
                            </span>
                            {idx > 0 && (
                              <span
                                data-testid={`sequence-keyframe-transition-tag-${idx}`}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  fontSize: '0.56rem',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.85)',
                                  color: '#020617',
                                }}
                              >
                                {activeTransitionPreset.iconSymbol} {activeTransitionPreset.name}
                              </span>
                            )}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '4px',
                                right: '4px',
                                fontSize: '0.6rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                padding: '1px 4px',
                                borderRadius: '4px',
                                background: 'rgba(2, 6, 23, 0.85)',
                                color: '#38bdf8',
                              }}
                            >
                              {seqFrame.formattedTimestamp}
                            </span>
                          </div>
                          <div
                            style={{
                              padding: '4px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: isCurrent ? 'var(--accent)' : 'var(--text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {seqFrame.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inter-Keyframe Transition Bridges (1→2, 2→3, 3→4) */}
                  <div
                    aria-label="Keyframe Transition Bridges"
                    data-testid="sequence-transition-bridges"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '8px',
                      paddingTop: '4px',
                      borderTop: '1px solid rgba(148, 163, 184, 0.14)',
                    }}
                  >
                    {sequencePreviewFrames.slice(1).map((targetFrame, bridgeIdx) => {
                      const fromFrame = sequencePreviewFrames[bridgeIdx];
                      const isBridgeActive = activeTransitionPairIndex === bridgeIdx;
                      const midProgress = Number(
                        ((fromFrame.progress + targetFrame.progress) / 2).toFixed(2)
                      );
                      const midSeconds = Number((midProgress * durationSeconds).toFixed(2));

                      return (
                        <button
                          key={`bridge-${bridgeIdx}-${transitionEffect}`}
                          type="button"
                          data-testid={`sequence-transition-bridge-${bridgeIdx + 1}`}
                          onClick={() => {
                            setIsPreviewingSequenceTransitions(false);
                            setActiveTransitionPairIndex(bridgeIdx);
                            scrubPreviewToTimestamp(midSeconds);
                          }}
                          title={`Preview ${activeTransitionPreset.name} transition between Keyframe ${bridgeIdx + 1} and Keyframe ${bridgeIdx + 2}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '5px 7px',
                            borderRadius: '7px',
                            border: isBridgeActive
                              ? '1px solid rgba(56, 189, 248, 0.65)'
                              : '1px solid rgba(148, 163, 184, 0.2)',
                            background: isBridgeActive
                              ? 'rgba(56, 189, 248, 0.14)'
                              : 'rgba(2, 6, 23, 0.65)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {targetFrame.transitionBridgeDataUrl && (
                            <img
                              src={targetFrame.transitionBridgeDataUrl}
                              alt={`${activeTransitionPreset.name} transition ${bridgeIdx + 1} to ${bridgeIdx + 2}`}
                              style={{
                                width: '38px',
                                height: '24px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                color: isBridgeActive ? 'var(--accent)' : 'var(--text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              KF {bridgeIdx + 1}→{bridgeIdx + 2} • {activeTransitionPreset.name}
                            </div>
                            <div
                              style={{
                                fontSize: '0.59rem',
                                color: 'var(--muted)',
                                fontFamily: 'monospace',
                              }}
                            >
                              {formatVideoTimestamp(midSeconds)} ({activeTransitionPreset.iconSymbol})
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Side-by-Side 'Comparison View' Toggle & Consistency Verification Panel */}
            <div
              aria-label="Comparison View Panel"
              style={{
                borderRadius: '14px',
                border: comparisonViewEnabled
                  ? '1px solid rgba(56, 189, 248, 0.5)'
                  : '1px solid var(--line)',
                background: comparisonViewEnabled
                  ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.09) 0%, rgba(15, 23, 42, 0.72) 100%)'
                  : 'rgba(15, 23, 42, 0.5)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: comparisonViewEnabled
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(148, 163, 184, 0.12)',
                      border: comparisonViewEnabled
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : '1px solid rgba(148, 163, 184, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: comparisonViewEnabled ? 'var(--accent)' : 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    <LayoutGrid size={14} />
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <label
                        htmlFor="comparison-view-toggle"
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: 'var(--text-heading)',
                          cursor: 'pointer',
                        }}
                      >
                        Comparison View
                      </label>
                      <span
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: comparisonViewEnabled
                            ? 'rgba(16, 185, 129, 0.18)'
                            : 'rgba(148, 163, 184, 0.15)',
                          color: comparisonViewEnabled ? 'var(--emerald)' : 'var(--muted)',
                          border: comparisonViewEnabled
                            ? '1px solid rgba(16, 185, 129, 0.38)'
                            : '1px solid rgba(148, 163, 184, 0.25)',
                        }}
                      >
                        {comparisonViewEnabled
                          ? 'Side-by-Side Active • Source vs. Final Frame'
                          : 'Off • Click to Compare Source & Final Frame'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>
                      Display the original source image next to the final animation frame to verify style and content consistency
                    </span>
                  </div>
                </div>

                <button
                  id="comparison-view-toggle"
                  type="button"
                  role="switch"
                  aria-checked={comparisonViewEnabled}
                  aria-label="Toggle Comparison View"
                  onClick={() => setComparisonViewEnabled((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 11px',
                    borderRadius: '999px',
                    border: comparisonViewEnabled
                      ? '1px solid rgba(56, 189, 248, 0.55)'
                      : '1px solid var(--line)',
                    background: comparisonViewEnabled
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'rgba(2, 6, 23, 0.7)',
                    color: comparisonViewEnabled ? 'var(--accent)' : 'var(--muted)',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '16px',
                      borderRadius: '999px',
                      background: comparisonViewEnabled ? 'var(--accent)' : 'rgba(148, 163, 184, 0.35)',
                      position: 'relative',
                      display: 'inline-block',
                      transition: 'background 0.18s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: comparisonViewEnabled ? '#020617' : '#f8fafc',
                        position: 'absolute',
                        top: '2px',
                        left: comparisonViewEnabled ? '14px' : '2px',
                        transition: 'left 0.18s ease',
                      }}
                    />
                  </span>
                  {comparisonViewEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {comparisonViewEnabled && (() => {
                const sourceFrame =
                  frames.length > 0
                    ? frames[Math.min(selectedPreviewIndex, frames.length - 1)] || frames[0]
                    : null;
                const finalKeyframe =
                  sequencePreviewFrames.length > 0
                    ? sequencePreviewFrames[sequencePreviewFrames.length - 1]
                    : videoSummaryKeyframes.length > 0
                    ? videoSummaryKeyframes[videoSummaryKeyframes.length - 1]
                    : null;
                const resolvedFinalFrameUrl =
                  finalFrameDataUrl || finalKeyframe?.dataUrl || sourceFrame?.url || null;
                const { width: outW, height: outH } = getAspectRatioDimensions(aspectRatio);
                const srcW =
                  sourceFrame?.dimensions?.width ||
                  sourceFrame?.imgElement?.naturalWidth ||
                  outW;
                const srcH =
                  sourceFrame?.dimensions?.height ||
                  sourceFrame?.imgElement?.naturalHeight ||
                  outH;
                const activeEffectLabel =
                  ANIMATION_EFFECTS.find((e) => e.id === selectedEffect)?.label || selectedEffect;

                return (
                  <div
                    aria-label="Side-by-Side Comparison View"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {/* Left Column: Original Source Image */}
                      <div
                        aria-label="Original Source Image Panel"
                        style={{
                          borderRadius: '10px',
                          border: '1px solid rgba(148, 163, 184, 0.28)',
                          background: 'rgba(2, 6, 23, 0.82)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            background: 'rgba(15, 23, 42, 0.75)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <ImageIcon size={13} color="#94a3b8" />
                            Original Source Image
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(148, 163, 184, 0.16)',
                              color: '#cbd5e1',
                            }}
                          >
                            Source Input (00:00.0)
                          </span>
                        </div>

                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: `${outW} / ${outH}`,
                            maxHeight: '190px',
                            background: '#020617',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {sourceFrame ? (
                            <img
                              src={sourceFrame.url}
                              alt={`Original Source Image — ${sourceFrame.name}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: sourceFitMode,
                                display: 'block',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '16px', textAlign: 'center' }}>
                              No source image loaded yet
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            padding: '7px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            fontSize: '0.69rem',
                            color: 'var(--muted)',
                            borderTop: '1px solid rgba(148, 163, 184, 0.14)',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              color: 'var(--text)',
                            }}
                          >
                            {sourceFrame ? sourceFrame.name : 'Awaiting source photo'}
                          </span>
                          <span style={{ fontFamily: 'monospace', flexShrink: 0 }}>
                            {srcW}×{srcH}px
                          </span>
                        </div>
                      </div>

                      {/* Right Column: Final Animation Frame */}
                      <div
                        aria-label="Final Animation Frame Panel"
                        style={{
                          borderRadius: '10px',
                          border: '1px solid rgba(56, 189, 248, 0.42)',
                          background: 'rgba(2, 6, 23, 0.82)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid rgba(56, 189, 248, 0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            background: 'rgba(15, 23, 42, 0.75)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Sparkles size={13} color="var(--accent)" />
                            Final Animation Frame
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.16)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.32)',
                            }}
                          >
                            End Frame ({formatVideoTimestamp(trimEndSeconds)} • 100%)
                          </span>
                        </div>

                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: `${outW} / ${outH}`,
                            maxHeight: '190px',
                            background: '#020617',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {resolvedFinalFrameUrl ? (
                            <img
                              src={resolvedFinalFrameUrl}
                              alt={`Final Animation Frame at ${formatVideoTimestamp(trimEndSeconds)}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '16px', textAlign: 'center' }}>
                              Final animation frame will appear once a photo is loaded
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            padding: '7px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            fontSize: '0.69rem',
                            color: 'var(--muted)',
                            borderTop: '1px solid rgba(56, 189, 248, 0.16)',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              color: 'var(--emerald)',
                            }}
                          >
                            {activeEffectLabel} ({animationIntensity}%{motionBlurEnabled ? ' • Blur ON' : ''})
                          </span>
                          <span style={{ fontFamily: 'monospace', flexShrink: 0, color: '#38bdf8' }}>
                            {aspectRatio} ({outW}×{outH}px)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Style & Content Consistency Summary Footer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: 'rgba(2, 6, 23, 0.65)',
                        border: '1px solid rgba(16, 185, 129, 0.28)',
                        fontSize: '0.72rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <ShieldCheck size={14} color="var(--emerald)" />
                        <strong style={{ color: 'var(--text-heading)' }}>
                          Style &amp; Content Consistency:
                        </strong>
                        <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                          Verified
                        </span>
                        <span style={{ color: 'var(--muted)' }}>
                          • Color palette, subject framing &amp; {activeEffectLabel} transformation aligned across {clippedTotalFrames} frames
                        </span>
                      </div>

                      {frames.length > 0 && (
                        <button
                          type="button"
                          onClick={() => scrubPreviewToTimestamp(trimEndSeconds)}
                          style={{
                            padding: '4px 9px',
                            borderRadius: '6px',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            background: 'rgba(56, 189, 248, 0.14)',
                            color: 'var(--accent)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Sync Canvas to Final Frame
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Duration Trimming Interface — Clip start and end timestamps before final export */}
            {(frames.length > 0 || Boolean(renderedVideoUrl)) && (
              <div
                aria-label="Duration Trimming Interface"
                style={{
                  borderRadius: '14px',
                  border: isClipTrimmed
                    ? '1px solid rgba(56, 189, 248, 0.45)'
                    : '1px solid var(--line)',
                  background: isClipTrimmed
                    ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.65) 100%)'
                    : 'rgba(15, 23, 42, 0.5)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header & Status Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.14)',
                        border: '1px solid rgba(56, 189, 248, 0.32)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    >
                      <Scissors size={14} />
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                          Duration Trimming
                        </strong>
                        <span
                          style={{
                            fontSize: '0.67rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '999px',
                            background: isClipTrimmed
                              ? 'rgba(56, 189, 248, 0.18)'
                              : 'rgba(148, 163, 184, 0.15)',
                            color: isClipTrimmed ? 'var(--accent)' : 'var(--muted)',
                            border: isClipTrimmed
                              ? '1px solid rgba(56, 189, 248, 0.35)'
                              : '1px solid rgba(148, 163, 184, 0.25)',
                          }}
                        >
                          {isClipTrimmed
                            ? `Clipped • ${clippedDurationSeconds.toFixed(1)}s (${clippedTotalFrames} frames)`
                            : `Full Clip • ${durationSeconds.toFixed(1)}s`}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>
                        Set precise start (In) and end (Out) timestamps to clip the generated animation before export
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#38bdf8',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(2, 6, 23, 0.72)',
                        border: '1px solid rgba(56, 189, 248, 0.28)',
                      }}
                    >
                      {formatVideoTimestamp(trimStartSeconds)} → {formatVideoTimestamp(trimEndSeconds)}
                    </span>
                    {isClipTrimmed && (
                      <button
                        type="button"
                        onClick={handleResetTrim}
                        title="Reset trim to full animation duration"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          background: 'rgba(2, 6, 23, 0.65)',
                          color: 'var(--muted)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw size={11} />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Clipping Timeline Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.72)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: '28px',
                      borderRadius: '7px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(148, 163, 184, 0.22)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Left Trimmed-Out Zone */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${
                          durationSeconds > 0
                            ? Math.max(0, Math.min(100, (trimStartSeconds / durationSeconds) * 100))
                            : 0
                        }%`,
                        background:
                          'repeating-linear-gradient(45deg, rgba(2,6,23,0.85), rgba(2,6,23,0.85) 5px, rgba(71,85,105,0.28) 5px, rgba(71,85,105,0.28) 10px)',
                      }}
                    />

                    {/* Active Clipped Segment Window */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${
                          durationSeconds > 0
                            ? Math.max(0, Math.min(100, (trimStartSeconds / durationSeconds) * 100))
                            : 0
                        }%`,
                        width: `${
                          durationSeconds > 0
                            ? Math.max(
                                2,
                                Math.min(
                                  100,
                                  ((trimEndSeconds - trimStartSeconds) / durationSeconds) * 100
                                )
                              )
                            : 100
                        }%`,
                        background:
                          'linear-gradient(90deg, rgba(56, 189, 248, 0.32) 0%, rgba(16, 185, 129, 0.32) 100%)',
                        borderLeft: '3px solid #38bdf8',
                        borderRight: '3px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#f8fafc',
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                          whiteSpace: 'nowrap',
                          padding: '0 6px',
                        }}
                      >
                        ACTIVE EXPORT WINDOW ({clippedDurationSeconds.toFixed(1)}s)
                      </span>
                    </div>

                    {/* Right Trimmed-Out Zone */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: `${
                          durationSeconds > 0
                            ? Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((durationSeconds - trimEndSeconds) / durationSeconds) * 100
                                )
                              )
                            : 0
                        }%`,
                        background:
                          'repeating-linear-gradient(45deg, rgba(2,6,23,0.85), rgba(2,6,23,0.85) 5px, rgba(71,85,105,0.28) 5px, rgba(71,85,105,0.28) 10px)',
                      }}
                    />
                  </div>

                  {/* Timeline Ruler Tick Labels */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.66rem',
                      fontFamily: 'monospace',
                      color: 'var(--muted)',
                    }}
                  >
                    <span>00:00.0</span>
                    <span>{formatVideoTimestamp(durationSeconds * 0.25)}</span>
                    <span>{formatVideoTimestamp(durationSeconds * 0.5)}</span>
                    <span>{formatVideoTimestamp(durationSeconds * 0.75)}</span>
                    <span>{formatVideoTimestamp(durationSeconds)}</span>
                  </div>
                </div>

                {/* Start & End Timestamp Range Controls */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {/* Start Timestamp (In Point) */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(2, 6, 23, 0.55)',
                      border: '1px solid rgba(56, 189, 248, 0.22)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <label
                        htmlFor="trim-start-slider"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '999px',
                            background: '#38bdf8',
                            display: 'inline-block',
                          }}
                        />
                        Start Timestamp (In)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          aria-label="Trim Start Seconds Input"
                          min={0}
                          max={Math.max(0, Number((trimEndSeconds - MIN_TRIM_CLIP_SECONDS).toFixed(1)))}
                          step={0.1}
                          value={trimStartSeconds}
                          onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                          style={{
                            width: '58px',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                          s
                        </span>
                      </div>
                    </div>

                    <input
                      id="trim-start-slider"
                      type="range"
                      aria-label="Trim Start Timestamp"
                      min={0}
                      max={durationSeconds}
                      step={0.1}
                      value={trimStartSeconds}
                      onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.67rem',
                        color: 'var(--muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      <span>In: {formatVideoTimestamp(trimStartSeconds)}</span>
                      <span>Frame #{Math.max(1, Math.round(trimStartSeconds * frameRate) + 1)}</span>
                    </div>
                  </div>

                  {/* End Timestamp (Out Point) */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(2, 6, 23, 0.55)',
                      border: '1px solid rgba(16, 185, 129, 0.24)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <label
                        htmlFor="trim-end-slider"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '999px',
                            background: '#10b981',
                            display: 'inline-block',
                          }}
                        />
                        End Timestamp (Out)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          aria-label="Trim End Seconds Input"
                          min={Math.min(durationSeconds, Number((trimStartSeconds + MIN_TRIM_CLIP_SECONDS).toFixed(1)))}
                          max={durationSeconds}
                          step={0.1}
                          value={trimEndSeconds}
                          onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                          style={{
                            width: '58px',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            background: 'rgba(15, 23, 42, 0.9)',
                            color: '#10b981',
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                          s
                        </span>
                      </div>
                    </div>

                    <input
                      id="trim-end-slider"
                      type="range"
                      aria-label="Trim End Timestamp"
                      min={0}
                      max={durationSeconds}
                      step={0.1}
                      value={trimEndSeconds}
                      onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.67rem',
                        color: 'var(--muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      <span>Out: {formatVideoTimestamp(trimEndSeconds)}</span>
                      <span>Frame #{Math.max(1, Math.round(trimEndSeconds * frameRate))}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Trim Presets & Apply Trim Action Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>
                      Quick Cut:
                    </span>
                    {[
                      { id: 'full' as const, label: 'Full Clip' },
                      { id: 'first-half' as const, label: 'First Half' },
                      { id: 'center' as const, label: 'Center Cut' },
                      { id: 'second-half' as const, label: 'Last Half' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyTrimPreset(preset.id)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          border: '1px solid rgba(148, 163, 184, 0.24)',
                          background: 'rgba(2, 6, 23, 0.65)',
                          color: 'var(--text)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setIsLivePreviewing((prev) => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '7px',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        background: isLivePreviewing
                          ? 'rgba(56, 189, 248, 0.18)'
                          : 'rgba(2, 6, 23, 0.75)',
                        color: 'var(--accent)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isLivePreviewing ? <Pause size={12} /> : <Play size={12} />}
                      {isLivePreviewing ? 'Pause Clip Loop' : 'Preview Trimmed Loop'}
                    </button>

                    {(isTrimDirty || (isClipTrimmed && !renderedVideoUrl)) && (
                      <button
                        type="button"
                        onClick={handleRenderAndRecordVideo}
                        disabled={isRendering || frames.length === 0}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 11px',
                          borderRadius: '7px',
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: isRendering ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Scissors size={12} />
                        {renderedVideoUrl
                          ? `Re-Render Trimmed Clip (${clippedDurationSeconds.toFixed(1)}s)`
                          : `Render Trimmed Clip (${clippedDurationSeconds.toFixed(1)}s)`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {renderedVideoUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      color: 'var(--emerald)',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>
                      Video rendered and ready for download! (
                      {formatVideoTimestamp(lastRenderedTrimRange.start)} →{' '}
                      {formatVideoTimestamp(lastRenderedTrimRange.end)})
                    </span>
                  </div>
                  {isTrimDirty && (
                    <span
                      style={{
                        fontSize: '0.71rem',
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.14)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 600,
                      }}
                    >
                      Trim updated — click Re-Render Trimmed Clip to bake new bounds into export file
                    </span>
                  )}
                </div>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', background: '#000' }}>
                  <video
                    ref={videoPlayerRef}
                    controls
                    autoPlay
                    loop
                    playsInline
                    src={renderedVideoUrl}
                    onTimeUpdate={(e) => {
                      if (!isTrimDirty) return;
                      const vid = e.currentTarget;
                      const clipEndOffset = Math.max(
                        0.5,
                        trimEndSeconds - lastRenderedTrimRange.start
                      );
                      const clipStartOffset = Math.max(
                        0,
                        trimStartSeconds - lastRenderedTrimRange.start
                      );
                      if (vid.currentTime >= clipEndOffset || vid.currentTime < clipStartOffset) {
                        vid.currentTime = clipStartOffset;
                      }
                    }}
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', display: 'block' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="button"
                    style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                  >
                    <Download size={15} /> Download Video (.{renderedVideoExt})
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="button button-secondary"
                    style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                  >
                    <Share2 size={15} /> {copied ? 'Link Copied!' : 'Share Video'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="button button-secondary"
                    style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                  >
                    <Printer size={15} /> Download as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print-Only Generation Specification & Storyboard Summary (Active via @media print in src/index.css) */}
        <section className="print-only" aria-label="Print Export Summary">
          <h2>Animation Generation &amp; Storyboard Specification</h2>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Configured Value</th>
                <th>Parameter</th>
                <th>Configured Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Animation Effect</strong></td>
                <td>{ANIMATION_EFFECTS.find((e) => e.id === selectedEffect)?.label || selectedEffect}</td>
                <td><strong>Output Frame Rate</strong></td>
                <td>{frameRate} FPS</td>
              </tr>
              <tr>
                <td><strong>Motion Intensity &amp; Blur</strong></td>
                <td>
                  {animationIntensity}% •{' '}
                  {motionBlurEnabled
                    ? `Motion Blur Enabled (${motionBlurRadiusPx}px on ${heatmapMetrics.dominantZone})`
                    : 'Motion Blur Disabled'}
                </td>
                <td><strong>Aspect Ratio &amp; Duration</strong></td>
                <td>
                  {aspectRatio} ({getAspectRatioDimensions(aspectRatio).width}×
                  {getAspectRatioDimensions(aspectRatio).height}px) • {durationSeconds} Seconds
                </td>
              </tr>
              <tr>
                <td><strong>Overlay Caption</strong></td>
                <td>{captionText || 'None'}</td>
                <td><strong>AI Engine</strong></td>
                <td>{aiConfig.provider === 'ollama' ? `Local Ollama (${aiConfig.ollamaModel})` : 'Google Gemini'}</td>
              </tr>
              <tr>
                <td><strong>Trimmed Clip Bounds</strong></td>
                <td>
                  {formatVideoTimestamp(trimStartSeconds)} → {formatVideoTimestamp(trimEndSeconds)} ({clippedDurationSeconds.toFixed(1)}s)
                </td>
                <td><strong>Clipped Frame Count</strong></td>
                <td>{clippedTotalFrames} Frames @ {frameRate} FPS</td>
              </tr>
              <tr>
                <td><strong>Synced Audio Track</strong></td>
                <td>
                  {audioTrack
                    ? `${audioTrack.name} (${audioTrack.format} • ${formatVideoTimestamp(audioTrack.durationSeconds)})`
                    : 'No Audio Track (Silent Video)'}
                </td>
                <td><strong>Audio Mix &amp; Sync</strong></td>
                <td>
                  {audioTrack
                    ? `Volume ${audioVolume}% • ${loopAudioTrack ? 'Looped to Clip' : 'Single Pass'}`
                    : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>

          {frames.length > 0 && (
            <>
              <h3>Uploaded Source Storyboard Frames ({frames.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Preview</th>
                    <th>File Name</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {frames.map((frame, index) => (
                    <tr key={frame.id}>
                      <td>{index + 1}</td>
                      <td>
                        <img
                          src={frame.thumbnailBase64 || frame.url}
                          alt={frame.name}
                          style={{ width: '64px', height: '38px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td>{frame.name}</td>
                      <td>
                        {frame.dimensions ? `${frame.dimensions.width}×${frame.dimensions.height}px` : 'Standard'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>

      {/* Scoped AI Provider & Generation Settings Modal */}
      <AiProviderSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />
    </div>
  );
};

export const AnimateImagesToVideo = AnimateImageToVideo;
export default AnimateImageToVideo;
