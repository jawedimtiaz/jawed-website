/**
 * Default average reading speed in words per minute (~200 WPM) used for technical engineering notes.
 */
export const AVERAGE_READING_SPEED_WPM = 200;

/**
 * Helper utility: calculateWordCount
 * Strips YAML frontmatter, HTML tags, and markdown markup to return an accurate clean word count.
 */
export const calculateWordCount = (contentOrText?: string): number => {
  if (!contentOrText) return 0;

  const cleanText = contentOrText
    .replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_~[\]()]/g, ' ')
    .trim();

  return cleanText.split(/\s+/).filter((word) => word.length > 0).length;
};

/**
 * Helper utility: calculateReadTimeMinutes
 * Returns estimated reading time in whole minutes based on word count (~200 WPM).
 */
export const calculateReadTimeMinutes = (
  contentOrText?: string,
  wpm: number = AVERAGE_READING_SPEED_WPM
): number => {
  const safeWpm = wpm > 0 ? wpm : AVERAGE_READING_SPEED_WPM;
  const words = calculateWordCount(contentOrText);
  return Math.max(1, Math.ceil(words / safeWpm));
};

/**
 * Helper utility: calculateReadTime
 * Calculates estimated reading time (e.g. '5 min read') based on word count (~200 WPM).
 */
export const calculateReadTime = (
  contentOrText?: string,
  wpm: number = AVERAGE_READING_SPEED_WPM
): string => {
  const minutes = calculateReadTimeMinutes(contentOrText, wpm);
  return `${minutes} min read`;
};

export interface EstimatedReadTimeStats {
  wordCount: number;
  minutes: number;
  wpm: number;
  formattedReadTime: string;
  estimatedLabel: string;
  speedLabel: string;
}

/**
 * Dynamically calculates estimated read time statistics based on average reading speed (~200 WPM).
 */
export const calculateEstimatedReadTime = (
  contentOrText?: string,
  wpm: number = AVERAGE_READING_SPEED_WPM
): EstimatedReadTimeStats => {
  const safeWpm = wpm > 0 ? wpm : AVERAGE_READING_SPEED_WPM;
  const wordCount = calculateWordCount(contentOrText);
  const minutes = calculateReadTimeMinutes(contentOrText, safeWpm);
  const formattedReadTime = `${minutes} min read`;

  return {
    wordCount,
    minutes,
    wpm: safeWpm,
    formattedReadTime,
    estimatedLabel: `Estimated read time: ${formattedReadTime}`,
    speedLabel: `~${safeWpm} WPM`,
  };
};

export interface RemainingReadTimeResult {
  totalMinutes: number;
  remainingMinutes: number;
  formattedTotal: string;
  formattedRemaining: string;
  percent: number;
  wordCount: number;
}

/**
 * Calculates remaining read time based on current scroll progress (0.0 to 1.0).
 */
export const calculateRemainingReadTime = (
  contentOrText?: string,
  progress = 0,
  wpm: number = AVERAGE_READING_SPEED_WPM
): RemainingReadTimeResult => {
  const safeWpm = wpm > 0 ? wpm : AVERAGE_READING_SPEED_WPM;
  const wordCount = calculateWordCount(contentOrText);
  const totalMinutes = Math.max(1, Math.ceil(wordCount / safeWpm));
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const percent = Math.round(clampedProgress * 100);
  const rawRemaining = Math.ceil(totalMinutes * (1 - clampedProgress));
  const remainingMinutes = clampedProgress >= 0.95 ? 0 : Math.max(0, rawRemaining);

  let formattedRemaining = `${remainingMinutes} min left`;
  if (clampedProgress >= 0.95 || remainingMinutes === 0) {
    formattedRemaining = 'Completed';
  } else if (remainingMinutes === 1) {
    formattedRemaining = '1 min left';
  }

  return {
    totalMinutes,
    remainingMinutes,
    formattedTotal: `${totalMinutes} min read`,
    formattedRemaining,
    percent,
    wordCount,
  };
};

export interface HeaderReadTimeDetails {
  wordCount: number;
  minutes: number;
  wpm: number;
  formattedReadTime: string;
  label: string;
}

/**
 * Computes structured Read Time indicator details (word count, estimated minutes, formatted read time)
 * for display in the NoteDetailPage header and top-of-content banner.
 */
export const getHeaderReadTimeDetails = (
  contentOrText?: string,
  wpm: number = AVERAGE_READING_SPEED_WPM
): HeaderReadTimeDetails => {
  const safeWpm = wpm > 0 ? wpm : AVERAGE_READING_SPEED_WPM;
  const wordCount = calculateWordCount(contentOrText);
  const minutes = calculateReadTimeMinutes(contentOrText, safeWpm);
  const formattedReadTime = calculateReadTime(contentOrText, safeWpm);
  return {
    wordCount,
    minutes,
    wpm: safeWpm,
    formattedReadTime,
    label: `Read Time: ${formattedReadTime} (${wordCount} words)`,
  };
};
