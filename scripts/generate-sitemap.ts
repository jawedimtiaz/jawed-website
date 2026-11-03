import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectSitemapEntries,
  generateSitemapXml,
  getSitemapSummary,
  type SitemapGenerationOptions,
  type SitemapSummary,
} from '../src/utils/sitemapGenerator';

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
 * Generates sitemap.xml and writes it to public/sitemap.xml, root sitemap.xml,
 * and optionally the build output directory (dist/sitemap.xml).
 */
export function writeSitemapFiles(options: WriteSitemapFilesOptions = {}): WriteSitemapResult {
  const rootDir = options.rootDir || process.cwd();
  const outDir = options.outDir || path.resolve(rootDir, 'dist');
  const entries = collectSitemapEntries(options);
  const summary = getSitemapSummary(entries);
  const xml = generateSitemapXml(options);

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
