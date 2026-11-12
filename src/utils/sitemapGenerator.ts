import notesData from '../data/notesData.json';
import blogData from '../data/blogData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { TOOLS } from '../data/toolsData';
import { STATIC_METADATA, TOOL_METADATA, normalizePath } from '../components/RouteSeo';

export const DEFAULT_SITE_ORIGIN = 'https://jawed.co.in';
export const DEFAULT_LASTMOD = '2026-10-15';

export type SitemapCategory = 'static' | 'note' | 'field-guide' | 'blog' | 'tool';
export type SitemapChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntry {
  loc: string;
  path: string;
  category: SitemapCategory;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: string;
}

export interface SitemapGenerationOptions {
  siteOrigin?: string;
  includeMetadataTags?: boolean;
  defaultLastMod?: string;
}

export interface SitemapSummary {
  total: number;
  byCategory: Record<SitemapCategory, number>;
}

const EXCLUDED_NON_CANONICAL_PATHS = new Set<string>([
  '/notes',
  '/notes/',
  '/diagnostic-tools',
  '/diagnostic-tools/',
  '/offline',
  '/offline/',
  '/404',
]);

const CORE_CANONICAL_STATIC_ROUTES: Array<{
  path: string;
  changefreq: SitemapChangeFreq;
  priority: string;
}> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/guides', changefreq: 'weekly', priority: '0.9' },
  { path: '/tools', changefreq: 'weekly', priority: '0.9' },
  { path: '/services', changefreq: 'monthly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/ai', changefreq: 'monthly', priority: '0.8' },
];

const PRIMARY_HUB_PATHS = new Set<string>([
  '/guides',
  '/field-guides',
  '/tools',
  '/blog',
  '/topics',
  '/resources',
  '/work',
  '/work/projects',
]);

const LEGAL_POLICY_PATHS = new Set<string>([
  '/privacy',
  '/terms',
  '/cookies',
]);

/**
 * Escapes special characters for valid XML text nodes.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extracts an ISO YYYY-MM-DD date from HTML content metadata (e.g. "Updated: 2026-10-13" or "Published: 2026-09-28").
 */
export function extractDateFromHtmlContent(content: string, fallback = DEFAULT_LASTMOD): string {
  if (!content) return fallback;

  const updatedMatch = content.match(/Updated:\s*(\d{4}-\d{2}-\d{2})/i);
  if (updatedMatch?.[1]) {
    return updatedMatch[1];
  }

  const publishedMatch = content.match(/Published:\s*(\d{4}-\d{2}-\d{2})/i);
  if (publishedMatch?.[1]) {
    return publishedMatch[1];
  }

  const standaloneIsoMatch = content.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (standaloneIsoMatch?.[1]) {
    return standaloneIsoMatch[1];
  }

  return fallback;
}

/**
 * Normalizes a date string to YYYY-MM-DD format if valid, otherwise returns the fallback date.
 */
export function normalizeIsoDate(dateInput?: string, fallback = DEFAULT_LASTMOD): string {
  if (!dateInput) return fallback;
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/\b20\d{2}\b/.test(trimmed)) {
    const parsed = new Date(`${trimmed} UTC`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return fallback;
}

/**
 * Collects all canonical, indexable URLs across static pages, IT notes, field guides, blog posts, and interactive tools.
 */
export function collectSitemapEntries(options: SitemapGenerationOptions = {}): SitemapEntry[] {
  const siteOrigin = (options.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  const defaultLastMod = options.defaultLastMod || DEFAULT_LASTMOD;

  const entries: SitemapEntry[] = [];
  const seenNormalizedPaths = new Set<string>();

  const addEntry = (
    rawPath: string,
    category: SitemapCategory,
    lastmod: string,
    changefreq: SitemapChangeFreq,
    priority: string
  ) => {
    if (!rawPath.startsWith('/')) return;
    const cleanPath = normalizePath(rawPath);
    if (EXCLUDED_NON_CANONICAL_PATHS.has(rawPath) || EXCLUDED_NON_CANONICAL_PATHS.has(cleanPath)) {
      return;
    }

    if (seenNormalizedPaths.has(cleanPath)) return;
    seenNormalizedPaths.add(cleanPath);

    entries.push({
      loc: `${siteOrigin}${cleanPath}`,
      path: cleanPath,
      category,
      lastmod: normalizeIsoDate(lastmod, defaultLastMod),
      changefreq,
      priority,
    });
  };

  // 1a. Core Primary Navigation & Hub Routes (/, /guides, /tools, /services, /about, /contact, /ai)
  for (const coreRoute of CORE_CANONICAL_STATIC_ROUTES) {
    addEntry(
      coreRoute.path,
      'static',
      defaultLastMod,
      coreRoute.changefreq,
      coreRoute.priority
    );
  }

  // 1b. Additional Canonical Static Routes (from STATIC_METADATA in RouteSeo.tsx)
  for (const meta of Object.values(STATIC_METADATA)) {
    const cleanCanonicalPath = normalizePath(meta.canonicalPath);
    if (
      EXCLUDED_NON_CANONICAL_PATHS.has(meta.canonicalPath) ||
      EXCLUDED_NON_CANONICAL_PATHS.has(cleanCanonicalPath)
    ) {
      continue;
    }
    if (meta.robots && meta.robots.toLowerCase().includes('noindex') && cleanCanonicalPath !== '/ai') {
      continue;
    }

    let priority = '0.7';
    let changefreq: SitemapChangeFreq = 'monthly';

    if (cleanCanonicalPath === '/') {
      priority = '1.0';
      changefreq = 'weekly';
    } else if (PRIMARY_HUB_PATHS.has(cleanCanonicalPath)) {
      priority = '0.9';
      changefreq = 'weekly';
    } else if (LEGAL_POLICY_PATHS.has(cleanCanonicalPath)) {
      priority = '0.5';
      changefreq = 'yearly';
    }

    addEntry(cleanCanonicalPath, 'static', defaultLastMod, changefreq, priority);
  }

  // 2. IT & Finance Knowledge Base Notes (from src/data/notesData.json)
  for (const note of notesData) {
    if (!note.slug) continue;
    const path = `/notes/${note.slug}`;
    const lastmod = extractDateFromHtmlContent(note.content, defaultLastMod);
    addEntry(path, 'note', lastmod, 'monthly', '0.8');
  }

  // 3. IT Field Guides (from src/data/fieldGuidesData.ts)
  for (const guide of FIELD_GUIDES) {
    if (!guide.slug) continue;
    const path = `/field-guides/${guide.slug}`;
    const lastmod = normalizeIsoDate(guide.updatedDate || guide.publishedDate, defaultLastMod);
    addEntry(path, 'field-guide', lastmod, 'monthly', '0.8');
  }

  // 4. Blog Posts (from src/data/blogData.json)
  for (const post of blogData) {
    if (!post.slug) continue;
    const path = `/blog/${post.slug}`;
    const lastmod = extractDateFromHtmlContent(post.content, defaultLastMod);
    addEntry(path, 'blog', lastmod, 'monthly', '0.7');
  }

  // 5. Interactive IT, Career, AI & Finance Tools (from TOOLS & TOOL_METADATA)
  for (const tool of TOOLS) {
    if (!tool.route) continue;
    const meta = TOOL_METADATA[normalizePath(tool.route)];
    if (meta?.robots && meta.robots.toLowerCase().includes('noindex')) {
      continue;
    }
    const canonicalPath = meta?.canonicalPath || normalizePath(tool.route);
    addEntry(canonicalPath, 'tool', defaultLastMod, 'monthly', '0.8');
  }

  for (const meta of Object.values(TOOL_METADATA)) {
    if (meta.robots && meta.robots.toLowerCase().includes('noindex')) {
      continue;
    }
    addEntry(meta.canonicalPath, 'tool', defaultLastMod, 'monthly', '0.8');
  }

  return entries;
}

/**
 * Generates a summary count of sitemap entries grouped by category.
 */
export function getSitemapSummary(entries: SitemapEntry[] = collectSitemapEntries()): SitemapSummary {
  const byCategory: Record<SitemapCategory, number> = {
    static: 0,
    note: 0,
    'field-guide': 0,
    blog: 0,
    tool: 0,
  };

  for (const entry of entries) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  }

  return {
    total: entries.length,
    byCategory,
  };
}

/**
 * Generates the complete sitemap.xml document string.
 */
export function generateSitemapXml(options: SitemapGenerationOptions = {}): string {
  const includeMetadataTags = options.includeMetadataTags ?? true;
  const entries = collectSitemapEntries(options);

  const urlBlocks = entries.map((entry) => {
    const lines = ['  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`];
    if (includeMetadataTags) {
      if (entry.lastmod) {
        lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }
      if (entry.changefreq) {
        lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
      }
      if (entry.priority) {
        lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
      }
    }
    lines.push('  </url>');
    return lines.join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlBlocks,
    '</urlset>',
    '',
  ].join('\n');
}
