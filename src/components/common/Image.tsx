import React, { useState } from 'react';

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'src'> {
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
 * Custom performance-optimized Image component.
 * Features:
 * - Native lazy loading (`loading="lazy"`) by default.
 * - Eager loading & fetchPriority="high" when `priority={true}` for LCP optimization.
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
  loading,
  decoding,
  fetchPriority,
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

  // Determine native loading & decoding attributes
  const effectiveLoading: 'lazy' | 'eager' = loading ?? (priority ? 'eager' : 'lazy');
  const effectiveDecoding: 'async' | 'sync' | 'auto' = decoding ?? (priority ? 'sync' : 'async');
  const effectiveFetchPriority: 'high' | 'low' | 'auto' = fetchPriority ?? (priority ? 'high' : 'auto');

  // Compute WebP source if appropriate
  const isSvg = /\.svg($|\?)/i.test(src);
  const isAlreadyWebp = /\.webp($|\?)/i.test(src);
  const canUseWebp = !isSvg && !isAlreadyWebp && !hasError;

  let computedWebpSrc: string | undefined = webpSrc;
  if (!computedWebpSrc && canUseWebp && /\.(png|jpe?g)($|\?)/i.test(currentSrc)) {
    computedWebpSrc = currentSrc.replace(/\.(png|jpe?g)($|\?)/i, '.webp$2');
  }

  // Combined inline styles preserving dimensions & aspect ratio to eliminate CLS
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}),
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  const imgElement = (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={effectiveLoading}
      decoding={effectiveDecoding}
      // Note: React 18 types support fetchPriority as lowercase or camelCase
      {...({ fetchpriority: effectiveFetchPriority } as Record<string, unknown>)}
      fetchPriority={effectiveFetchPriority}
      className={className}
      style={mergedStyle}
      onError={handleImgError}
      onLoad={onLoad}
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
