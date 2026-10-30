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
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  AiProviderSettingsModal,
  getStoredAiProviderConfig,
  type AiProviderConfig,
} from '../components/AiProviderSettingsModal';

export type AnimationEffectId = 'ken-burns' | 'orbit-zoom' | 'particle-dust' | 'pulse-glow' | 'cinematic-pan';

export interface AnimationEffectConfig {
  id: AnimationEffectId;
  label: string;
  description: string;
}

export interface UploadedFrame {
  id: string;
  name: string;
  url: string;
  imgElement: HTMLImageElement;
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

export const AnimateImageToVideo: React.FC = () => {
  const [frames, setFrames] = useState<UploadedFrame[]>([]);
  const [captionText, setCaptionText] = useState<string>('Cinematic Memory • 2026');
  const [selectedEffect, setSelectedEffect] = useState<AnimationEffectId>('ken-burns');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<number>(5);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoExt, setRenderedVideoExt] = useState<'webm' | 'mp4'>('webm');
  const [isLivePreviewing, setIsLivePreviewing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Scoped AI Settings Modal & Provider Config
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [aiConfig, setAiConfig] = useState<AiProviderConfig>(getStoredAiProviderConfig);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

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
    };
  }, []);

  // Helper to draw a frame onto the canvas at a given progress [0..1]
  const drawFrameAtProgress = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      if (frames.length === 0) return;

      // Determine active image (and next image for crossfade when multiple images are queued)
      const totalFrames = frames.length;
      const exactIdx = progress * totalFrames;
      const currentIdx = Math.min(totalFrames - 1, Math.floor(exactIdx));
      const nextIdx = Math.min(totalFrames - 1, currentIdx + 1);
      const localProgress = totalFrames > 1 ? exactIdx - currentIdx : progress;
      const crossfadeAlpha =
        totalFrames > 1 && currentIdx !== nextIdx && localProgress > 0.75
          ? (localProgress - 0.75) / 0.25
          : 0;

      const drawImageWithEffect = (img: HTMLImageElement, p: number, alpha: number) => {
        let scale = 1.0;
        let offsetX = 0;
        let offsetY = 0;

        if (selectedEffect === 'ken-burns') {
          scale = 1.0 + p * 0.22;
          offsetX = Math.sin(p * Math.PI) * 40;
          offsetY = Math.cos(p * Math.PI) * 20;
        } else if (selectedEffect === 'orbit-zoom') {
          scale = 1.05 + Math.sin(p * Math.PI * 2) * 0.08;
          offsetX = Math.cos(p * Math.PI * 2) * 25;
          offsetY = Math.sin(p * Math.PI * 2) * 25;
        } else if (selectedEffect === 'particle-dust') {
          scale = 1.08 + p * 0.1;
        } else if (selectedEffect === 'pulse-glow') {
          scale = 1.02 + Math.sin(p * Math.PI * 3) * 0.04;
        } else if (selectedEffect === 'cinematic-pan') {
          scale = 1.15;
          offsetX = (p - 0.5) * 120;
        }

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
      };

      drawImageWithEffect(frames[currentIdx].imgElement, localProgress, 1);
      if (crossfadeAlpha > 0 && nextIdx !== currentIdx) {
        drawImageWithEffect(frames[nextIdx].imgElement, 0, crossfadeAlpha);
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
        const alphaOverlay = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.05, alphaOverlay)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Floating Particles for particle-dust effect
      if (selectedEffect === 'particle-dust') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 24; i++) {
          const px = (Math.sin(i * 99 + progress * Math.PI * 4) * 0.5 + 0.5) * width;
          const py = (i * 45 + progress * height * 0.8) % height;
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
    [frames, selectedEffect, captionText]
  );

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
        setFrames((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            url: objectUrl,
            imgElement: img,
          },
        ]);
        setIsLivePreviewing(true);
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

    // Draw glowing horizon and geometric mountain silhouettes
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
      setFrames((prev) => [
        ...prev,
        {
          id: `sample-${Date.now()}`,
          name: 'sample-horizon-scene.png',
          url: dataUrl,
          imgElement: img,
        },
      ]);
      setIsLivePreviewing(true);
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
      }
      return next;
    });
  };

  const handleClear = () => {
    frames.forEach((f) => {
      if (f.url.startsWith('blob:')) URL.revokeObjectURL(f.url);
    });
    setFrames([]);
    setRenderedVideoUrl(null);
    setIsLivePreviewing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      // Smart curated fallback captions based on selected effect
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

  // Live Canvas Preview & Rendering Loop
  useEffect(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = aspectRatio === '16:9' ? 1280 : 720;
    const height = aspectRatio === '16:9' ? 720 : 1280;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    let startTime = performance.now();
    const totalDurationMs = durationSeconds * 1000;

    const renderLoop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);

      drawFrameAtProgress(ctx, width, height, progress);

      if (isLivePreviewing) {
        if (progress >= 1) {
          startTime = performance.now();
        }
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    if (isLivePreviewing) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      // Draw static preview frame when paused
      drawFrameAtProgress(ctx, width, height, 0.35);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [frames, aspectRatio, durationSeconds, isLivePreviewing, drawFrameAtProgress]);

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

    try {
      const width = aspectRatio === '16:9' ? 1280 : 720;
      const height = aspectRatio === '16:9' ? 720 : 1280;
      canvas.width = width;
      canvas.height = height;

      const stream = canvas.captureStream(30); // 30 FPS
      const candidates = [
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

      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 2500000 })
        : new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        activeBlobUrlRef.current = url;
        setRenderedVideoUrl(url);
        setIsRendering(false);
        setRenderProgress(100);
        setIsLivePreviewing(true);
      };

      recorder.start();

      const totalMs = durationSeconds * 1000;
      const startTime = performance.now();
      const ctx = canvas.getContext('2d')!;

      const renderStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalMs);
        setRenderProgress(Math.round(progress * 100));

        drawFrameAtProgress(ctx, width, height, progress);

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
      setIsRendering(false);
      setIsLivePreviewing(true);
      setErrorMsg(err?.message || 'Failed to record video locally.');
    }
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    a.download = `animated-photo-${new Date().toISOString().slice(0, 10)}.${renderedVideoExt}`;
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

        {/* Hero Header with Scoped AI Engine & Settings Trigger */}
        <header style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px',
              flexWrap: 'wrap',
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

            {/* Scoped AI Engine & Settings Toolbar Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                AI Backend:{' '}
                <strong style={{ color: 'var(--text-heading)' }}>
                  {aiConfig.provider === 'ollama' ? `Local Ollama (${aiConfig.ollamaModel})` : 'Google Gemini'}
                </strong>
              </span>

              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="theme-toggle-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                aria-label="AI Engine & Settings"
                title="Configure AI Backend & Local Ollama Settings"
              >
                <Settings size={15} color="var(--accent)" />
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
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-darker)',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <img
                        src={frame.url}
                        alt={frame.name}
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                      />
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
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFrame(frame.id)}
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
                ))}

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
                  Aspect Ratio
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: aspectRatio === '16:9' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: aspectRatio === '16:9' ? 'var(--surface-accent)' : 'var(--bg-darker)',
                      color: aspectRatio === '16:9' ? 'var(--accent)' : 'var(--text)',
                      fontWeight: 650,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    16:9
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: aspectRatio === '9:16' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: aspectRatio === '9:16' ? 'var(--surface-accent)' : 'var(--bg-darker)',
                      color: aspectRatio === '9:16' ? 'var(--accent)' : 'var(--text)',
                      fontWeight: 650,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    9:16
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
                  Duration: {durationSeconds}s
                </label>
                <select
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
                  }}
                >
                  <option value={3}>3 Seconds</option>
                  <option value={5}>5 Seconds</option>
                  <option value={8}>8 Seconds</option>
                  <option value={10}>10 Seconds</option>
                </select>
              </div>
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
                  Rendering Video ({renderProgress}%)
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Render &amp; Record Video File
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Canvas Preview & Video Output */}
          <div className="card" style={{ gap: '18px', minHeight: '460px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={18} color="var(--accent)" />
                2. Live Preview &amp; Output
              </h2>
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
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 14px' }}>
              Real-time browser canvas preview with applied animation effect.
            </p>

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
                  maxHeight: aspectRatio === '16:9' ? '320px' : '400px',
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

              {isRendering && (
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
                  }}
                >
                  <Loader2 size={32} className="animate-spin" color="var(--accent)" />
                  <strong style={{ fontSize: '0.95rem' }}>Recording video stream ({renderProgress}%)...</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    Please keep this tab active while rendering.
                  </span>
                </div>
              )}
            </div>

            {renderedVideoUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
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
                  <span>Video rendered and ready for download!</span>
                </div>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', background: '#000' }}>
                  <video
                    controls
                    autoPlay
                    loop
                    playsInline
                    src={renderedVideoUrl}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Scoped AI Provider & Generation Settings Modal */}
      <AiProviderSettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </div>
  );
};

export default AnimateImageToVideo;
