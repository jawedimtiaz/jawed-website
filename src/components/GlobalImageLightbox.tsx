import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Move } from 'lucide-react';

export const MIN_LIGHTBOX_ZOOM = 1;
export const MAX_LIGHTBOX_ZOOM = 4;
export const LIGHTBOX_ZOOM_STEP = 0.5;
export const LIGHTBOX_OPEN_EVENT = 'jawed:open-image-lightbox';

export interface LightboxImageItem {
  src: string;
  alt: string;
  caption?: string;
}

export interface LightboxTransformState {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Clamps a zoom factor between MIN_LIGHTBOX_ZOOM and MAX_LIGHTBOX_ZOOM.
 */
export function clampLightboxZoom(
  zoom: number,
  min: number = MIN_LIGHTBOX_ZOOM,
  max: number = MAX_LIGHTBOX_ZOOM
): number {
  if (!Number.isFinite(zoom)) return min;
  const clamped = Math.min(max, Math.max(min, zoom));
  return Math.round(clamped * 100) / 100;
}

/**
 * Computes the next zoom and pan transform state for zoom-in, zoom-out, or reset actions.
 */
export function computeZoomStep(
  current: LightboxTransformState,
  direction: 'in' | 'out' | 'reset',
  step: number = LIGHTBOX_ZOOM_STEP
): LightboxTransformState {
  if (direction === 'reset') {
    return { zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 };
  }

  const delta = direction === 'in' ? step : -step;
  const nextZoom = clampLightboxZoom(current.zoom + delta);

  if (nextZoom <= MIN_LIGHTBOX_ZOOM) {
    return { zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 };
  }

  return {
    zoom: nextZoom,
    panX: current.panX,
    panY: current.panY,
  };
}

/**
 * Computes updated pan coordinates when dragging/panning a zoomed image.
 */
export function computePanOffset(
  current: LightboxTransformState,
  deltaX: number,
  deltaY: number
): LightboxTransformState {
  if (current.zoom <= MIN_LIGHTBOX_ZOOM) {
    return { zoom: current.zoom, panX: 0, panY: 0 };
  }

  const maxPan = (current.zoom - 1) * 450;
  const nextPanX = Math.max(-maxPan, Math.min(maxPan, current.panX + deltaX));
  const nextPanY = Math.max(-maxPan, Math.min(maxPan, current.panY + deltaY));

  return {
    zoom: current.zoom,
    panX: Math.round(nextPanX),
    panY: Math.round(nextPanY),
  };
}

/**
 * Checks whether the current pathname corresponds to a NotesDetail (or FieldGuide) or BlogPostPage route.
 */
export function isLightboxEligibleRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    /^\/notes\/[^/]+/.test(pathname) ||
    /^\/guides\/[^/]+/.test(pathname) ||
    /^\/field-guides\/[^/]+/.test(pathname) ||
    /^\/blog\/[^/]+/.test(pathname)
  );
}

/**
 * Extracts image metadata (src, alt, caption) from an image DOM element.
 */
export function extractLightboxImageFromElement(
  imgEl:
    | HTMLImageElement
    | {
        getAttribute?: (name: string) => string | null;
        src?: string;
        alt?: string;
        title?: string;
        closest?: (selector: string) => any;
      }
    | null
): LightboxImageItem | null {
  if (!imgEl) return null;

  const rawSrc =
    (typeof imgEl.getAttribute === 'function' ? imgEl.getAttribute('src') : '') ||
    imgEl.src ||
    '';
  const src = rawSrc.trim();
  if (!src) return null;

  const rawAlt =
    (typeof imgEl.getAttribute === 'function' ? imgEl.getAttribute('alt') : '') ||
    imgEl.alt ||
    '';
  const alt = rawAlt.trim() || 'Full screen article image';

  let caption =
    (typeof imgEl.getAttribute === 'function' ? imgEl.getAttribute('data-caption') : '') ||
    imgEl.title ||
    '';

  if (!caption && typeof imgEl.closest === 'function') {
    const figure = imgEl.closest('figure');
    const figcaption = figure?.querySelector?.('figcaption');
    if (figcaption?.textContent) {
      caption = figcaption.textContent.trim();
    }
  }

  return {
    src,
    alt,
    caption: caption || alt,
  };
}

/**
 * Imperatively opens the global image lightbox with the given image item.
 */
export function openGlobalImageLightbox(item: LightboxImageItem): void {
  if (!item?.src || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<LightboxImageItem>(LIGHTBOX_OPEN_EVENT, {
      detail: item,
    })
  );
}

/**
 * Delegated click handler that can be attached to NoteDetailPage or BlogPostPage containers.
 * Detects clicks on any <img> element and opens it in the GlobalImageLightbox.
 */
export function handleArticleImageLightboxClick(
  event: {
    target: EventTarget | null;
    preventDefault?: () => void;
    stopPropagation?: () => void;
  }
): LightboxImageItem | null {
  const target = event.target as HTMLElement | null;
  if (!target) return null;

  const imgEl =
    target.tagName?.toUpperCase() === 'IMG'
      ? (target as HTMLImageElement)
      : target.closest?.('img');

  if (!imgEl) return null;
  if (imgEl.getAttribute?.('data-no-lightbox') === 'true') return null;

  const item = extractLightboxImageFromElement(imgEl);
  if (!item) return null;

  event.preventDefault?.();
  event.stopPropagation?.();
  openGlobalImageLightbox(item);
  return item;
}

export const GlobalImageLightbox: React.FC = () => {
  const { pathname } = useLocation();
  const [activeImage, setActiveImage] = useState<LightboxImageItem | null>(null);
  const [transform, setTransform] = useState<LightboxTransformState>({
    zoom: MIN_LIGHTBOX_ZOOM,
    panX: 0,
    panY: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const closeLightbox = useCallback(() => {
    setActiveImage(null);
    setTransform({ zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 });
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Close lightbox when route changes
  useEffect(() => {
    closeLightbox();
  }, [pathname, closeLightbox]);

  // Listen for imperative openGlobalImageLightbox custom events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<LightboxImageItem>;
      if (customEvent.detail?.src) {
        setActiveImage(customEvent.detail);
        setTransform({ zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 });
        setIsDragging(false);
      }
    };

    window.addEventListener(LIGHTBOX_OPEN_EVENT, handleCustomOpen);
    return () => {
      window.removeEventListener(LIGHTBOX_OPEN_EVENT, handleCustomOpen);
    };
  }, []);

  // Global delegated click listener for images inside NotesDetail, FieldGuideDetailPage, and BlogPostPage
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the lightbox modal itself
      if (target.closest('[data-testid="global-image-lightbox"]')) return;

      const imgEl =
        target.tagName.toUpperCase() === 'IMG'
          ? (target as HTMLImageElement)
          : target.closest('img');

      if (!imgEl) return;
      if (imgEl.getAttribute('data-no-lightbox') === 'true') return;

      // Ignore header/footer/navbar brand images
      if (imgEl.closest('header.site-header, footer, nav')) return;

      const inArticleScope = Boolean(
        imgEl.closest(
          '.note-rendered-content, .blog-rendered-content, .guide-embedded-body, .quick-note-article, [data-lightbox-scope="true"]'
        )
      );

      if (!inArticleScope && !isLightboxEligibleRoute(pathname)) {
        return;
      }

      const item = extractLightboxImageFromElement(imgEl);
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();
      setActiveImage(item);
      setTransform({ zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 });
      setIsDragging(false);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [pathname]);

  // Keyboard shortcuts when lightbox is open: Escape, +, -, 0, Arrow keys
  useEffect(() => {
    if (!activeImage || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setTransform((prev) => computeZoomStep(prev, 'in'));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setTransform((prev) => computeZoomStep(prev, 'out'));
      } else if (e.key === '0') {
        e.preventDefault();
        setTransform((prev) => computeZoomStep(prev, 'reset'));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTransform((prev) => computePanOffset(prev, 40, 0));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTransform((prev) => computePanOffset(prev, -40, 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTransform((prev) => computePanOffset(prev, 0, 40));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTransform((prev) => computePanOffset(prev, 0, -40));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage, closeLightbox]);

  const handleZoomIn = () => {
    setTransform((prev) => computeZoomStep(prev, 'in'));
  };

  const handleZoomOut = () => {
    setTransform((prev) => computeZoomStep(prev, 'out'));
  };

  const handleResetZoom = () => {
    setTransform((prev) => computeZoomStep(prev, 'reset'));
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setTransform((prev) => computeZoomStep(prev, 'in', 0.25));
    } else if (e.deltaY > 0) {
      setTransform((prev) => computeZoomStep(prev, 'out', 0.25));
    }
  };

  const handleDoubleClick = () => {
    setTransform((prev) =>
      prev.zoom > MIN_LIGHTBOX_ZOOM
        ? { zoom: MIN_LIGHTBOX_ZOOM, panX: 0, panY: 0 }
        : { zoom: 2, panX: 0, panY: 0 }
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (transform.zoom <= MIN_LIGHTBOX_ZOOM) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
    setTransform((prev) => computePanOffset(prev, deltaX, deltaY));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (transform.zoom <= MIN_LIGHTBOX_ZOOM || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { clientX: touch.clientX, clientY: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.clientX;
    const deltaY = touch.clientY - dragStartRef.current.clientY;
    dragStartRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    setTransform((prev) => computePanOffset(prev, deltaX, deltaY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  if (!activeImage) {
    return null;
  }

  const zoomPercent = Math.round(transform.zoom * 100);
  const canPan = transform.zoom > MIN_LIGHTBOX_ZOOM;

  return (
    <div
      className="global-image-lightbox-overlay no-print"
      data-testid="global-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Full screen image viewer: ${activeImage.alt}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLightbox();
        }
      }}
    >
      {/* Top Toolbar: Image Title + Zoom / Pan / Close Controls */}
      <div
        className="global-image-lightbox-toolbar"
        data-testid="lightbox-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          zIndex: 2,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f8fafc',
            fontSize: '0.88rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '55vw',
          }}
        >
          <Maximize2 size={15} className="text-sky-400" />
          <span>{activeImage.alt}</span>
          {canPan && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              <Move size={11} />
              <span>Drag to pan</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            data-testid="lightbox-zoom-out-btn"
            onClick={handleZoomOut}
            disabled={transform.zoom <= MIN_LIGHTBOX_ZOOM}
            aria-label="Zoom out"
            title="Zoom out (-)"
            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 text-sky-400" />
          </button>

          <button
            type="button"
            data-testid="lightbox-zoom-reset-btn"
            onClick={handleResetZoom}
            aria-label="Reset zoom and pan"
            title="Reset zoom and pan (0)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span data-testid="lightbox-zoom-level">{zoomPercent}%</span>
          </button>

          <button
            type="button"
            data-testid="lightbox-zoom-in-btn"
            onClick={handleZoomIn}
            disabled={transform.zoom >= MAX_LIGHTBOX_ZOOM}
            aria-label="Zoom in"
            title="Zoom in (+)"
            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 text-sky-400" />
          </button>

          <button
            type="button"
            data-testid="lightbox-close-btn"
            onClick={closeLightbox}
            aria-label="Close full screen image viewer"
            title="Close (Esc)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Interactive Zoom & Pan Viewport */}
      <div
        className="global-image-lightbox-viewport"
        data-testid="lightbox-viewport"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeLightbox();
          }
        }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: canPan ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          padding: '24px',
        }}
      >
        <img
          src={activeImage.src}
          alt={activeImage.alt}
          data-testid="lightbox-fullscreen-image"
          draggable={false}
          style={{
            maxWidth: '90vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            transform: `translate3d(${transform.panX}px, ${transform.panY}px, 0) scale(${transform.zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Bottom Caption & Controls Hint */}
      <div
        className="global-image-lightbox-footer"
        style={{
          padding: '10px 20px',
          background: 'rgba(15, 23, 42, 0.85)',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '0.78rem',
          color: '#94a3b8',
          zIndex: 2,
        }}
      >
        <span data-testid="lightbox-caption">{activeImage.caption || activeImage.alt}</span>
        <span>Scroll or double-click to zoom • Drag or use arrow keys to pan • Press Esc to close</span>
      </div>
    </div>
  );
};

export default GlobalImageLightbox;
