import notesData from '../data/notesData.json';
import { FIELD_GUIDES, type FieldGuide } from '../data/fieldGuidesData';

export interface NoteSchemaItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
  publishedDate?: string;
  updatedDate?: string;
  lastUpdated?: string;
  content?: string;
}

export interface ContentFreshnessInfo {
  publishedRaw: string;
  updatedRaw: string;
  publishedFormatted: string;
  updatedFormatted: string;
  isoUpdated: string;
  isoPublished: string;
  isRecentlyUpdated: boolean;
}

/**
 * Formats a raw date string (e.g. "2026-10-13" or "October 23, 2026")
 * into a human-readable date ("October 13, 2026") and ISO date ("2026-10-13").
 */
export function normalizeDateString(raw?: string): { formatted: string; iso: string; timestamp: number } {
  if (!raw || !raw.trim()) {
    return { formatted: '', iso: '', timestamp: 0 };
  }
  const trimmed = raw.trim();

  // Handle YYYY-MM-DD directly to avoid timezone shift
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!Number.isNaN(dateObj.getTime())) {
      const formatted = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return {
        formatted,
        iso: trimmed,
        timestamp: dateObj.getTime(),
      };
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const formatted = parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return {
      formatted,
      iso: `${yyyy}-${mm}-${dd}`,
      timestamp: parsed.getTime(),
    };
  }

  return { formatted: trimmed, iso: trimmed, timestamp: 0 };
}

/**
 * Extracts 'publishedDate' and 'updatedDate' from schema fields, YAML frontmatter,
 * or embedded HTML metadata (<p class="meta">Published: YYYY-MM-DD · Updated: YYYY-MM-DD</p>).
 */
export function extractContentFreshness(item: {
  publishedDate?: string;
  updatedDate?: string;
  lastUpdated?: string;
  content?: string;
  contentHtml?: string;
}): ContentFreshnessInfo {
  let publishedRaw = item.publishedDate || '';
  let updatedRaw = item.lastUpdated || item.updatedDate || '';

  const rawBody = item.content || item.contentHtml || '';

  if (rawBody) {
    // 1. Check YAML frontmatter if present
    const frontmatterMatch = rawBody.match(/^\s*---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
    if (frontmatterMatch) {
      const yamlBlock = frontmatterMatch[1];
      if (!updatedRaw) {
        const updatedMatch = yamlBlock.match(
          /^(?:updated|lastUpdated|updatedDate|last_updated|Updated):\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m
        );
        if (updatedMatch) {
          updatedRaw = (updatedMatch[1] || updatedMatch[2] || updatedMatch[3] || '').trim();
        }
      }
      if (!publishedRaw) {
        const pubMatch = yamlBlock.match(
          /^(?:published|publishedDate|date|Date|Published):\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m
        );
        if (pubMatch) {
          publishedRaw = (pubMatch[1] || pubMatch[2] || pubMatch[3] || '').trim();
        }
      }
    }

    // 2. Check embedded HTML meta lines, e.g. "Published: 2026-09-28 · Updated: 2026-10-13"
    if (!updatedRaw) {
      const htmlUpdatedMatch = rawBody.match(/(?:Updated|Last\s+Updated):\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
      if (htmlUpdatedMatch?.[1]) {
        updatedRaw = htmlUpdatedMatch[1].trim();
      }
    }

    if (!publishedRaw) {
      const htmlPublishedMatch = rawBody.match(/Published:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
      if (htmlPublishedMatch?.[1]) {
        publishedRaw = htmlPublishedMatch[1].trim();
      }
    }
  }

  // Fallback if only one is present
  if (!updatedRaw && publishedRaw) {
    updatedRaw = publishedRaw;
  }
  if (!publishedRaw && updatedRaw) {
    publishedRaw = updatedRaw;
  }

  // Final fallback if neither is found in raw content
  if (!updatedRaw) {
    updatedRaw = '2026-10-23';
  }
  if (!publishedRaw) {
    publishedRaw = updatedRaw;
  }

  const normUpdated = normalizeDateString(updatedRaw);
  const normPublished = normalizeDateString(publishedRaw);

  return {
    publishedRaw,
    updatedRaw,
    publishedFormatted: normPublished.formatted || publishedRaw,
    updatedFormatted: normUpdated.formatted || updatedRaw,
    isoUpdated: normUpdated.iso || updatedRaw,
    isoPublished: normPublished.iso || publishedRaw,
    isRecentlyUpdated: normUpdated.timestamp > 0,
  };
}

/**
 * Resolves the 'Last Updated' timestamp for the current route (if viewing a note or field guide)
 * or the most recent update date across all notes and field guides for the global site footer.
 */
export function getSiteLastUpdated(pathname?: string): {
  formatted: string;
  iso: string;
  contextLabel: string;
} {
  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const slugMatch = cleanPath.match(/^\/(?:notes|field-guides|guides)\/([^/]+)$/);

  if (slugMatch?.[1]) {
    const slug = slugMatch[1];
    const matchedGuide = FIELD_GUIDES.find((g: FieldGuide) => g.slug === slug);
    if (matchedGuide) {
      const info = extractContentFreshness(matchedGuide);
      return {
        formatted: info.updatedFormatted,
        iso: info.isoUpdated,
        contextLabel: 'Guide Last Updated',
      };
    }

    const matchedNote = (notesData as NoteSchemaItem[]).find((n) => n.slug === slug);
    if (matchedNote) {
      const info = extractContentFreshness(matchedNote);
      return {
        formatted: info.updatedFormatted,
        iso: info.isoUpdated,
        contextLabel: 'Note Last Updated',
      };
    }
  }

  // Compute global latest content update across all Field Guides and Notes
  let latestTimestamp = 0;
  let latestFormatted = 'October 23, 2026';
  let latestIso = '2026-10-23';

  for (const guide of FIELD_GUIDES) {
    const raw = guide.lastUpdated || guide.updatedDate || guide.publishedDate;
    const norm = normalizeDateString(raw);
    if (norm.timestamp > latestTimestamp) {
      latestTimestamp = norm.timestamp;
      latestFormatted = norm.formatted;
      latestIso = norm.iso;
    }
  }

  for (const note of notesData as NoteSchemaItem[]) {
    const info = extractContentFreshness(note);
    const norm = normalizeDateString(info.isoUpdated);
    if (norm.timestamp > latestTimestamp) {
      latestTimestamp = norm.timestamp;
      latestFormatted = norm.formatted;
      latestIso = norm.iso;
    }
  }

  return {
    formatted: latestFormatted,
    iso: latestIso,
    contextLabel: 'Last Updated',
  };
}
