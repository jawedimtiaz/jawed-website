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
  Video,
  Image as ImageIcon,
  Sliders,
  RotateCcw,
  Layers,
  Sun,
  Maximize2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';

export type AnimationEffectId = 'ken-burns' | 'orbit-zoom' | 'particle-dust' | 'pulse-glow' | 'cinematic-pan';

export interface AnimationEffectConfig {
  id: AnimationEffectId;
  label: string;
  description: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [captionText, setCaptionText] = useState<string>('Cinematic Memory • 2026');
  const [selectedEffect, setSelectedEffect] = useState<AnimationEffectId>('ken-burns');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [durationSeconds, setDurationSeconds] = useState<number>(5);

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [isLivePreviewing, setIsLivePreviewing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Handle Image File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds the 20 MB limit.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setIsLivePreviewing(true);
    };
    img.src = objectUrl;
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageElement(null);
    setRenderedVideoUrl(null);
    setIsLivePreviewing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Live Canvas Preview & Rendering Loop
  useEffect(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !imageElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    const totalDurationMs = durationSeconds * 1000;

    const renderLoop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);

      // Canvas dimensions based on aspect ratio
      const width = aspectRatio === '16:9' ? 1280 : 720;
      const height = aspectRatio === '16:9' ? 720 : 1280;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Effect calculations
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;
      let alphaOverlay = 0;

      if (selectedEffect === 'ken-burns') {
        scale = 1.0 + progress * 0.22;
        offsetX = Math.sin(progress * Math.PI) * 40;
        offsetY = Math.cos(progress * Math.PI) * 20;
      } else if (selectedEffect === 'orbit-zoom') {
        scale = 1.05 + Math.sin(progress * Math.PI * 2) * 0.08;
        offsetX = Math.cos(progress * Math.PI * 2) * 25;
        offsetY = Math.sin(progress * Math.PI * 2) * 25;
      } else if (selectedEffect === 'particle-dust') {
        scale = 1.08 + progress * 0.1;
      } else if (selectedEffect === 'pulse-glow') {
        scale = 1.02 + Math.sin(progress * Math.PI * 3) * 0.04;
        alphaOverlay = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
      } else if (selectedEffect === 'cinematic-pan') {
        scale = 1.15;
        offsetX = (progress - 0.5) * 120;
      }

      const imgAspect = imageElement.width / imageElement.height;
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
      ctx.drawImage(imageElement, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Atmospheric Vignette
      const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.75);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(2, 6, 23, 0.65)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Sunlight / Glow overlay
      if (alphaOverlay > 0 || selectedEffect === 'pulse-glow') {
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.05, alphaOverlay)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Floating Particles for particle-dust effect
      if (selectedEffect === 'particle-dust') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 24; i++) {
          const px = (Math.sin(i * 99 + progress * Math.PI * 4) * 0.5 + 0.5) * width;
          const py = ((i * 45 + progress * height * 0.8) % height);
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

      if (progress < 1 && isLivePreviewing) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      } else if (progress >= 1 && isLivePreviewing) {
        // Loop animation
        startTime = performance.now();
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    if (isLivePreviewing) {
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [imageElement, selectedEffect, aspectRatio, durationSeconds, captionText, isLivePreviewing]);

  // Record Canvas to Video Blob using MediaRecorder API (100% Free, Client-Side)
  const handleRenderAndRecordVideo = async () => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !imageElement) {
      setErrorMsg('Please upload an image first.');
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
      const stream = canvas.captureStream(30); // 30 FPS
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 }) : new MediaRecorder(stream);
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

      // Render frames over durationSeconds
      const totalMs = durationSeconds * 1000;
      const startTime = performance.now();
      const ctx = canvas.getContext('2d')!;
      const width = canvas.width;
      const height = canvas.height;

      const renderStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalMs);
        setRenderProgress(Math.round(progress * 100));

        // Draw frame
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        let scale = 1.0;
        let offsetX = 0;
        let offsetY = 0;
        let alphaOverlay = 0;

        if (selectedEffect === 'ken-burns') {
          scale = 1.0 + progress * 0.22;
          offsetX = Math.sin(progress * Math.PI) * 40;
          offsetY = Math.cos(progress * Math.PI) * 20;
        } else if (selectedEffect === 'orbit-zoom') {
          scale = 1.05 + Math.sin(progress * Math.PI * 2) * 0.08;
          offsetX = Math.cos(progress * Math.PI * 2) * 25;
          offsetY = Math.sin(progress * Math.PI * 2) * 25;
        } else if (selectedEffect === 'particle-dust') {
          scale = 1.08 + progress * 0.1;
        } else if (selectedEffect === 'pulse-glow') {
          scale = 1.02 + Math.sin(progress * Math.PI * 3) * 0.04;
          alphaOverlay = 0.15 + Math.sin(progress * Math.PI * 2) * 0.1;
        } else if (selectedEffect === 'cinematic-pan') {
          scale = 1.15;
          offsetX = (progress - 0.5) * 120;
        }

        const imgAspect = imageElement.width / imageElement.height;
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

        ctx.drawImage(imageElement, drawX, drawY, drawW, drawH);

        const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.75);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(2, 6, 23, 0.65)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        if (alphaOverlay > 0 || selectedEffect === 'pulse-glow') {
          ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.05, alphaOverlay)})`;
          ctx.fillRect(0, 0, width, height);
        }

        if (selectedEffect === 'particle-dust') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          for (let i = 0; i < 24; i++) {
            const px = (Math.sin(i * 99 + progress * Math.PI * 4) * 0.5 + 0.5) * width;
            const py = ((i * 45 + progress * height * 0.8) % height);
            const pSize = (i % 3) + 1.5;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

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
    a.download = `animated-photo-${new Date().toISOString().slice(0, 10)}.webm`;
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
          text: `Check out this photo animation created with Jawed AI Studio!`,
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
              { label: 'Animate Images into Video (100% Free)' },
            ]}
            style={{ marginBottom: 0 }}
          />
          <SocialShareBar
            title="Animate Images into Video | 100% Free"
            text="Transform static photos into cinematic 16:9 or 9:16 videos instantly in your browser with zero paid API costs."
            url={typeof window !== 'undefined' ? `${window.location.origin}/tools/animate-image-to-video` : 'https://jawed.co.in/tools/animate-image-to-video'}
          />
        </div>

        {/* Header */}
        <header style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="var(--emerald)" /> Zero Server Costs • Instant Rendering
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px', color: 'var(--text-heading)' }}>
            Animate Images into Video (Free Studio)
          </h1>
          <p className="lead" style={{ fontSize: '1.05rem', color: 'var(--muted)', maxWidth: '820px', lineHeight: 1.6, margin: 0 }}>
            Upload any static photo, apply cinematic Ken Burns pan/zoom effects, particle dust overlays, and text captions, and record it directly into a video file 100% locally in your browser.
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
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 2px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="var(--accent)" />
              1. Upload Photo
            </h2>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              id="free-image-upload-input"
            />

            {!previewUrl ? (
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
                    Click to upload photo
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>PNG, JPEG, WebP (Max 20MB)</span>
                </div>
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-darker)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedFile?.name || 'photo.png'}
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{ background: 'transparent', border: 0, color: 'var(--rose)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={13} /> Change
                </button>
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
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: '6px' }}>
                3. Video Caption / Overlay Text
              </label>
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
              disabled={isRendering || !imageElement}
              className="button"
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '13px',
                justifyContent: 'center',
                opacity: isRendering || !imageElement ? 0.6 : 1,
                cursor: isRendering || !imageElement ? 'not-allowed' : 'pointer',
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
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 2px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Film size={18} color="var(--accent)" />
              2. Live Preview &amp; Output
            </h2>
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
                  display: imageElement ? 'block' : 'none',
                }}
              />

              {!imageElement && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                  <ImageIcon size={36} opacity={0.4} style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: '0.88rem' }}>Upload a photo to see the live animation preview.</span>
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
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Please keep this tab active while rendering.</span>
                </div>
              )}
            </div>

            {renderedVideoUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--line)', background: '#000' }}>
                  <video
                    controls
                    autoPlay
                    loop
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
                    <Download size={15} /> Download Video (.webm)
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
    </div>
  );
};
