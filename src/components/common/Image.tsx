import React, { useState, useEffect, useRef } from 'react';

export const DEFAULT_LQIP_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0b1120"/></linearGradient><radialGradient id="r" cx="25%" cy="30%" r="55%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#r)"/></svg>'
  );

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'src' | 'fetchPriority'> {
  /**
   * Primary image source URL (PNG, JPG, SVG, WebP, etc.).
   */
  src: string;
  /**
   * Accessible alternative text describing the image. Required for web accessibility.
   */
  alt: string;
  /**
   * Optional custom WebP source URL.
   * If not provided and `src` ends with .png, .jpg, or .jpeg, a matching .webp URL will be automatically inferred.
   */
  webpSrc?: string;
  /**
   * Optional fallback image URL if both WebP and the original source fail to load.
   */
  fallbackSrc?: string;
  /**
   * Set to `true` for above-the-fold / Largest Contentful Paint (LCP) elements.
   * Configures loading="eager", decoding="sync", and fetchPriority="high".
   * Defaults to `false`, which uses native loading="lazy" and decoding="async".
   */
  priority?: boolean;
  /**
   * Enables progressive blur-up loading with a lightweight LQIP placeholder
   * and smooth opacity transition once the high-resolution image finishes decoding.
   */
  progressive?: boolean;
  /**
   * Optional low-quality image placeholder (LQIP) data URL or SVG used during progressive loading.
   */
  placeholderSrc?: string;
  /**
   * Explicitly injects a <link rel="preload" as="image"> tag in document.head for LCP optimization.
   * Defaults to true when `priority={true}`.
   */
  preload?: boolean;
  /**
   * Explicit override for native loading attribute ('lazy' | 'eager').
   * If omitted, defaults to priority ? 'eager' : 'lazy'.
   */
  loading?: 'lazy' | 'eager';
  /**
   * Explicit override for image decoding behavior.
   */
  decoding?: 'async' | 'sync' | 'auto';
  /**
   * Explicit override for network fetch priority.
   */
  fetchPriority?: 'high' | 'low' | 'auto';
  /**
   * Lowercase alias for fetchPriority.
   */
  fetchpriority?: 'high' | 'low' | 'auto';
  /**
   * Optional CSS class name applied to the outer <picture> element when rendered.
   */
  pictureClassName?: string;
  /**
   * Optional CSS inline styles applied to the outer <picture> element.
   */
  pictureStyle?: React.CSSProperties;
  /**
   * CSS aspect ratio helper (e.g. "16 / 9", "1 / 1") to reserve layout space and prevent Cumulative Layout Shift (CLS).
   */
  aspectRatio?: string | number;
}

/**
 * Ensures a <link rel="preload" as="image"> tag exists in document.head for the given href.
 */
export function ensureImagePreloadLink(href: string, mimeType?: string): void {
  if (typeof document === 'undefined' || !href) return;
  const existing = document.head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  if (mimeType) {
    link.type = mimeType;
  }
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}

/**
 * Custom performance-optimized Image component.
 * Features:
 * - Native lazy loading (`loading="lazy"`) by default.
 * - Eager loading, preload link injection & fetchPriority="high" when `priority={true}` for LCP optimization.
 * - Progressive LQIP blur-up loading strategy when `progressive={true}`.
 * - Automated WebP format delivery via modern HTML5 `<picture>` & `<source>` tags.
 * - Aspect ratio & layout space preservation to prevent CLS.
 * - Graceful fallback handling.
 */
export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  webpSrc,
  fallbackSrc,
  priority = false,
  progressive = false,
  placeholderSrc = DEFAULT_LQIP_DATA_URL,
  preload,
  loading,
  decoding,
  fetchPriority,
  fetchpriority,
  width,
  height,
  className,
  style,
  pictureClassName,
  pictureStyle,
  aspectRatio,
  onError,
  onLoad,
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  // Determine native loading & decoding attributes
  const effectiveLoading: 'lazy' | 'eager' = loading ?? (priority ? 'eager' : 'lazy');
  const effectiveDecoding: 'async' | 'sync' | 'auto' = decoding ?? (priority ? 'sync' : 'async');
  // React 18 only recognizes lowercase `fetchpriority` on native DOM elements
  const effectiveFetchPriority: 'high' | 'low' | 'auto' | undefined =
    fetchPriority ?? fetchpriority ?? (priority ? 'high' : undefined);
  const fetchPriorityProps = effectiveFetchPriority
    ? ({ fetchpriority: effectiveFetchPriority } as Record<string, unknown>)
    : {};

  // Compute WebP source if appropriate
  const isSvg = /\.svg($|\?)/i.test(src);
  const isAlreadyWebp = /\.webp($|\?)/i.test(src);
  const canUseWebp = !isSvg && !isAlreadyWebp && !hasError;

  let computedWebpSrc: string | undefined = webpSrc;
  if (!computedWebpSrc && canUseWebp && /\.(png|jpe?g)($|\?)/i.test(currentSrc)) {
    computedWebpSrc = currentSrc.replace(/\.(png|jpe?g)($|\?)/i, '.webp$2');
  }

  const shouldPreload = preload ?? priority;

  useEffect(() => {
    if (shouldPreload) {
      if (computedWebpSrc) {
        ensureImagePreloadLink(computedWebpSrc, 'image/webp');
      } else if (currentSrc) {
        ensureImagePreloadLink(currentSrc);
      }
    }
  }, [shouldPreload, computedWebpSrc, currentSrc]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  // Combined inline styles preserving dimensions & aspect ratio to eliminate CLS
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}),
    ...(progressive
      ? {
          backgroundImage: !isLoaded && placeholderSrc ? `url("${placeholderSrc}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: isLoaded ? 'blur(0px)' : 'blur(8px)',
          transform: isLoaded ? 'scale(1)' : 'scale(1.01)',
          transition: 'filter 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
        }
      : {}),
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setIsLoaded(true);
    }
    if (onError) {
      onError(e);
    }
  };

  const imgElement = (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={effectiveLoading}
      decoding={effectiveDecoding}
      {...fetchPriorityProps}
      data-loaded={isLoaded ? 'true' : 'false'}
      className={className}
      style={mergedStyle}
      onError={handleImgError}
      onLoad={handleImgLoad}
      {...rest}
    />
  );

  // If a WebP alternate source exists, wrap inside <picture>
  if (computedWebpSrc && !hasError) {
    return (
      <picture className={pictureClassName} style={pictureStyle}>
        <source srcSet={computedWebpSrc} type="image/webp" />
        {imgElement}
      </picture>
    );
  }

  return imgElement;
};

export default Image;

