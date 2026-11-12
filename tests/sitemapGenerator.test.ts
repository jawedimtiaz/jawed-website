import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectSitemapEntries,
  generateSitemapXml,
  getSitemapSummary,
  extractDateFromHtmlContent,
} from '../src/utils/sitemapGenerator';
import { writeSitemapFiles } from '../scripts/generate-sitemap';
import { FIELD_GUIDES } from '../src/data/fieldGuidesData';
import { TOOLS } from '../src/data/toolsData';
import notesData from '../src/data/notesData.json';
import blogData from '../src/data/blogData.json';
import { normalizePath } from '../src/components/RouteSeo';

test('collectSitemapEntries includes all canonical IT field guides, tools, notes, and blog posts', () => {
  const entries = collectSitemapEntries();
  const paths = new Set(entries.map((entry) => normalizePath(entry.path)));

  // Every IT Field Guide in FIELD_GUIDES must be present
  for (const guide of FIELD_GUIDES) {
    assert.ok(
      paths.has(normalizePath(`/field-guides/${guide.slug}`)),
      `Expected field guide /field-guides/${guide.slug} in sitemap entries`
    );
  }

  // Every interactive tool in TOOLS must be present
  for (const tool of TOOLS) {
    assert.ok(
      paths.has(normalizePath(tool.route)),
      `Expected tool ${tool.route} in sitemap entries`
    );
  }

  // Every note in notesData.json must be present
  for (const note of notesData) {
    assert.ok(
      paths.has(normalizePath(`/notes/${note.slug}`)),
      `Expected note /notes/${note.slug} in sitemap entries`
    );
  }

  // Every blog post in blogData.json must be present
  for (const post of blogData) {
    assert.ok(
      paths.has(normalizePath(`/blog/${post.slug}`)),
      `Expected blog post /blog/${post.slug} in sitemap entries`
    );
  }
  // Core primary canonical routes must be present
  for (const corePath of ['/', '/guides', '/tools', '/services', '/about', '/contact', '/ai']) {
    assert.ok(
      paths.has(normalizePath(corePath)),
      `Expected core route ${corePath} in sitemap entries`
    );
  }
});

test('collectSitemapEntries excludes noindex and non-canonical alias paths', () => {
  const entries = collectSitemapEntries();
  const rawPaths = new Set(entries.map((entry) => entry.path));
  const normalizedPaths = new Set(entries.map((entry) => normalizePath(entry.path)));

  assert.equal(rawPaths.has('/notes'), false, '/notes alias index should be excluded');
  assert.equal(rawPaths.has('/notes/'), false, '/notes/ alias index should be excluded');
  assert.equal(rawPaths.has('/diagnostic-tools'), false, '/diagnostic-tools alias should be excluded');
  assert.equal(rawPaths.has('/diagnostic-tools/'), false, '/diagnostic-tools/ alias should be excluded');
  assert.equal(normalizedPaths.has('/offline'), false, '/offline noindex route should be excluded');
  assert.equal(normalizedPaths.has('/404'), false, '/404 route should be excluded');
});

test('generateSitemapXml produces valid XML with canonical origin and SEO metadata tags', () => {
  const xml = generateSitemapXml();

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(xml.trim().endsWith('</urlset>'));

  const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locMatches.length >= 80, `Expected at least 80 canonical URLs, found ${locMatches.length}`);

  const seenNormalized = new Set<string>();
  for (const loc of locMatches) {
    assert.ok(loc.startsWith('https://jawed.co.in/'), `Expected canonical origin for ${loc}`);
    assert.equal(loc.includes('?'), false, `Unexpected query string in ${loc}`);
    assert.equal(loc.includes('#'), false, `Unexpected hash fragment in ${loc}`);
    assert.equal(loc.endsWith('.html'), false, `Unexpected .html suffix in ${loc}`);

    const parsed = new URL(loc);
    const norm = normalizePath(parsed.pathname);
    assert.equal(seenNormalized.has(norm), false, `Duplicate normalized path ${norm} in sitemap.xml`);
    seenNormalized.add(norm);
  }

  const entries = collectSitemapEntries();
  const entryMap = new Map(entries.map((e) => [e.loc, e]));

  const expectedCorePriorities: Array<[string, string]> = [
    ['https://jawed.co.in/', '1.0'],
    ['https://jawed.co.in/guides', '0.9'],
    ['https://jawed.co.in/tools', '0.9'],
    ['https://jawed.co.in/services', '0.8'],
    ['https://jawed.co.in/about', '0.8'],
    ['https://jawed.co.in/contact', '0.7'],
    ['https://jawed.co.in/ai', '0.7'],
  ];

  for (const [coreUrl, expectedPriority] of expectedCorePriorities) {
    assert.ok(locMatches.includes(coreUrl), `Expected ${coreUrl} in sitemap.xml <loc> list`);
    assert.equal(entryMap.get(coreUrl)?.priority, expectedPriority, `Expected priority ${expectedPriority} for ${coreUrl}`);
  }

  for (const requiredFieldGuideUrl of [
    'https://jawed.co.in/field-guides/server-rack-cable-management-best-practices',
    'https://jawed.co.in/field-guides/rj45-cabling-t568a-vs-t568b-guide',
    'https://jawed.co.in/field-guides/diagnosing-network-port-flapping-cli-guide',
    'https://jawed.co.in/field-guides/poweredge-proliant-amber-led-indicator-cheatsheet',
    'https://jawed.co.in/field-guides/macbook-macos-troubleshooting-and-setup',
    'https://jawed.co.in/field-guides/iphone-ipad-mdm-wifi-troubleshooting',
    'https://jawed.co.in/field-guides/apple-continuity-airdrop-dock-triage',
  ]) {
    assert.ok(locMatches.includes(requiredFieldGuideUrl), `Expected field guide ${requiredFieldGuideUrl} in sitemap.xml`);
  }

  for (const requiredToolUrl of [
    'https://jawed.co.in/tools/ipv4-subnet-calculator',
    'https://jawed.co.in/tools/server-rack-power-btu-calculator',
    'https://jawed.co.in/tools/it-troubleshooting-assistant',
    'https://jawed.co.in/tools/service-desk-note-formatter',
    'https://jawed.co.in/tools/ai-prompt-builder',
    'https://jawed.co.in/tools/money-manager',
    'https://jawed.co.in/tools/it-resume-bullet-builder',
    'https://jawed.co.in/tools/ai-audio-transcriber',
    'https://jawed.co.in/tools/animate-image-to-video',
  ]) {
    assert.ok(locMatches.includes(requiredToolUrl), `Expected tool ${requiredToolUrl} in sitemap.xml`);
  }

  for (const loc of locMatches) {
    if (loc !== 'https://jawed.co.in/') {
      assert.equal(loc.endsWith('/'), false, `Non-root sitemap URL must not have a trailing slash: ${loc}`);
    }
  }

  const lastmodMatches = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.equal(lastmodMatches.length, locMatches.length, 'Every <url> entry must include a <lastmod> date');
  for (const lastmod of lastmodMatches) {
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `Expected YYYY-MM-DD <lastmod> format, got ${lastmod}`);
  }

  assert.ok(xml.includes('<changefreq>'));
  assert.ok(xml.includes('<priority>'));
});

test('public/robots.txt and routing configs do not intercept /sitemap.xml or /robots.txt', () => {
  const robotsTxt = fs.readFileSync(path.resolve(process.cwd(), 'public/robots.txt'), 'utf8');
  assert.ok(robotsTxt.includes('User-agent: *'), 'public/robots.txt must include User-agent: *');
  assert.ok(robotsTxt.includes('Allow: /'), 'public/robots.txt must include Allow: /');
  assert.ok(
    robotsTxt.includes('Sitemap: https://jawed.co.in/sitemap.xml'),
    'public/robots.txt must explicitly declare Sitemap: https://jawed.co.in/sitemap.xml'
  );

  const redirectsTxt = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf8');
  const redirectLines = redirectsTxt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  for (const line of redirectLines) {
    const [source] = line.split(/\s+/);
    assert.notEqual(source, '/*', 'public/_redirects must not use a wildcard /* catch-all that intercepts /sitemap.xml');
    assert.notEqual(source, '/sitemap.xml', 'public/_redirects must not redirect /sitemap.xml');
    assert.notEqual(source, '/robots.txt', 'public/_redirects must not redirect /robots.txt');
  }
});

test('extractDateFromHtmlContent extracts Updated or Published ISO dates', () => {
  assert.equal(
    extractDateFromHtmlContent('<p class="meta">Published: 2026-09-28 · Updated: 2026-10-13</p>'),
    '2026-10-13'
  );
  assert.equal(
    extractDateFromHtmlContent('<p class="meta">Published: 2026-09-27</p>'),
    '2026-09-27'
  );
  assert.equal(
    extractDateFromHtmlContent('<p>No date present</p>', '2026-10-15'),
    '2026-10-15'
  );
});

test('writeSitemapFiles writes identical XML to root, public/, and dist/ output directories', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
  try {
    const result = writeSitemapFiles({
      rootDir: tempRoot,
      outDir: path.join(tempRoot, 'dist'),
      writeToDist: true,
    });

    const rootSitemapPath = path.join(tempRoot, 'sitemap.xml');
    const publicSitemapPath = path.join(tempRoot, 'public', 'sitemap.xml');
    const distSitemapPath = path.join(tempRoot, 'dist', 'sitemap.xml');

    assert.ok(fs.existsSync(rootSitemapPath), 'Root sitemap.xml should exist');
    assert.ok(fs.existsSync(publicSitemapPath), 'public/sitemap.xml should exist');
    assert.ok(fs.existsSync(distSitemapPath), 'dist/sitemap.xml should exist');

    const rootXml = fs.readFileSync(rootSitemapPath, 'utf8');
    const publicXml = fs.readFileSync(publicSitemapPath, 'utf8');
    const distXml = fs.readFileSync(distSitemapPath, 'utf8');

    assert.equal(rootXml, result.xml);
    assert.equal(publicXml, result.xml);
    assert.equal(distXml, result.xml);

    const summary = getSitemapSummary();
    assert.equal(result.summary.total, summary.total);
    assert.equal(result.summary.byCategory['field-guide'], FIELD_GUIDES.length);
    assert.equal(result.summary.byCategory.tool, TOOLS.length);
    assert.equal(result.summary.byCategory.note, notesData.length);
    assert.equal(result.summary.byCategory.blog, blogData.length);
    assert.ok(
      result.xml.includes('<loc>https://jawed.co.in/tools/money-manager</loc>'),
      'Generated sitemap XML must include https://jawed.co.in/tools/money-manager'
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

