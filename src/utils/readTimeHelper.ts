/**
 * Helper utility: calculateReadTime
 * Calculates estimated reading time (e.g. '5 min read') based on word count (~200 WPM).
 */
export const calculateReadTime = (contentOrText?: string): string => {
  if (!contentOrText) return '1 min read';

  // Strip YAML frontmatter, HTML tags, and markdown formatting characters
  const cleanText = contentOrText
    .replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_~[\]()]/g, ' ')
    .trim();

  const words = cleanText.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  return `${minutes} min read`;
};
