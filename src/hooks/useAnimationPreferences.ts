import { useState, useEffect, useCallback } from 'react';

export type OutputFrameRate = 24 | 30 | 60;

export interface AnimationPreferences {
  animationIntensity: number;
  frameRate: OutputFrameRate;
}

const STORAGE_KEY = 'jawed_animate_video_preferences';

export const DEFAULT_ANIMATION_PREFERENCES: AnimationPreferences = {
  animationIntensity: 100,
  frameRate: 30,
};

const VALID_FRAME_RATES: OutputFrameRate[] = [24, 30, 60];

function readStoredPreferences(): AnimationPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_ANIMATION_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ANIMATION_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<AnimationPreferences>;
    const rawIntensity = Number(parsed.animationIntensity);
    const animationIntensity = Number.isFinite(rawIntensity)
      ? Math.min(200, Math.max(20, Math.round(rawIntensity)))
      : DEFAULT_ANIMATION_PREFERENCES.animationIntensity;

    const rawFps = Number(parsed.frameRate) as OutputFrameRate;
    const frameRate: OutputFrameRate = VALID_FRAME_RATES.includes(rawFps)
      ? rawFps
      : DEFAULT_ANIMATION_PREFERENCES.frameRate;

    return {
      animationIntensity,
      frameRate,
    };
  } catch {
    return DEFAULT_ANIMATION_PREFERENCES;
  }
}

/**
 * Custom hook that manages and persists AnimateImageToVideo animation intensity
 * and output frame rate preferences in localStorage.
 */
export function useAnimationPreferences() {
  const [preferences, setPreferences] = useState<AnimationPreferences>(readStoredPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota or private mode errors
    }
  }, [preferences]);

  const setAnimationIntensity = useCallback((value: number) => {
    const clamped = Math.min(200, Math.max(20, Math.round(value)));
    setPreferences((prev) => ({
      ...prev,
      animationIntensity: clamped,
    }));
  }, []);

  const setFrameRate = useCallback((fps: OutputFrameRate) => {
    if (!VALID_FRAME_RATES.includes(fps)) return;
    setPreferences((prev) => ({
      ...prev,
      frameRate: fps,
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_ANIMATION_PREFERENCES);
  }, []);

  return {
    animationIntensity: preferences.animationIntensity,
    frameRate: preferences.frameRate,
    setAnimationIntensity,
    setFrameRate,
    resetPreferences,
  };
}
