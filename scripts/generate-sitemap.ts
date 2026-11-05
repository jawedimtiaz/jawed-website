import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectSitemapEntries,
  DEFAULT_LASTMOD,
  DEFAULT_SITE_ORIGIN,
  escapeXml,
  getSitemapSummary,
  normalizeIsoDate,
  type SitemapEntry,
  type SitemapGenerationOptions,
  type SitemapSummary,
} from '../src/utils/sitemapGenerator';

export const MONEY_MANAGER_SITEMAP_ROUTE = '/tools/money-manager';

export interface WriteSitemapResult {
  xml: string;
  summary: SitemapSummary;
  writtenPaths: string[];
}

export interface WriteSitemapFilesOptions extends SitemapGenerationOptions {
  rootDir?: string;
  outDir?: string;
  writeToDist?: boolean;
}

/**
 * Ensures the Money Manager tool route (/tools/money-manager) is always present
 * in the collected canonical sitemap entries.
 */
export function ensureMoneyManagerSitemapEntry(
  entries: SitemapEntry[],
  options: SitemapGenerationOptions = {}
): SitemapEntry[] {
  const siteOrigin = (options.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  const defaultLastMod = options.defaultLastMod || DEFAULT_LASTMOD;
  const hasMoneyManager = entries.some(
    (entry) => entry.path.replace(/\/+$/, '') === MONEY_MANAGER_SITEMAP_ROUTE
  );

  if (hasMoneyManager) {
    return entries;
  }

  return [
    ...entries,
    {
      loc: `${siteOrigin}${MONEY_MANAGER_SITEMAP_ROUTE}`,
      path: MONEY_MANAGER_SITEMAP_ROUTE,
      category: 'tool',
      lastmod: normalizeIsoDate(defaultLastMod, DEFAULT_LASTMOD),
      changefreq: 'monthly',
      priority: '0.8',
    },
  ];
}

function serializeSitemapXml(
  entries: SitemapEntry[],
  options: SitemapGenerationOptions = {}
): string {
  const includeMetadataTags = options.includeMetadataTags ?? true;

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

/**
 * Generates sitemap.xml and writes it to public/sitemap.xml, root sitemap.xml,
 * and optionally the build output directory (dist/sitemap.xml).
 */
export function writeSitemapFiles(options: WriteSitemapFilesOptions = {}): WriteSitemapResult {
  const rootDir = options.rootDir || process.cwd();
  const outDir = options.outDir || path.resolve(rootDir, 'dist');
  const entries = ensureMoneyManagerSitemapEntry(collectSitemapEntries(options), options);
  const summary = getSitemapSummary(entries);
  const xml = serializeSitemapXml(entries, options);

  const targetPaths = [
    path.resolve(rootDir, 'public', 'sitemap.xml'),
    path.resolve(rootDir, 'sitemap.xml'),
  ];

  const shouldWriteDist =
    options.writeToDist === true ||
    (options.writeToDist !== false && fs.existsSync(outDir));

  if (shouldWriteDist) {
    targetPaths.push(path.resolve(outDir, 'sitemap.xml'));
  }

  const writtenPaths: string[] = [];
  for (const targetPath of targetPaths) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
    if (existing !== xml) {
      fs.writeFileSync(targetPath, xml, 'utf8');
    }
    writtenPaths.push(targetPath);
  }

  return {
    xml,
    summary,
    writtenPaths,
  };
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const forceDist = process.argv.includes('--dist');
  const result = writeSitemapFiles({ writeToDist: forceDist ? true : undefined });
  const { total, byCategory } = result.summary;

  console.log(
    `[sitemap] Generated ${total} canonical URLs ` +
      `(static: ${byCategory.static}, notes: ${byCategory.note}, ` +
      `field-guides: ${byCategory['field-guide']}, blog: ${byCategory.blog}, tools: ${byCategory.tool})`
  );
  for (const filePath of result.writtenPaths) {
    console.log(`[sitemap] Wrote ${path.relative(process.cwd(), filePath) || filePath}`);
  }
}

