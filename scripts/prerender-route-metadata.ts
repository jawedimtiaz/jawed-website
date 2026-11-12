import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl, resolveMetadata } from '../src/components/RouteSeo';

const DIST = path.resolve(process.cwd(), 'dist');
const SITE_ORIGIN = 'https://jawed.co.in';
const DEFAULT_OG_IMAGE = 'https://jawed.co.in/assets/images/social-preview.png';

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

function upsertMeta(html: string, attribute: 'name' | 'property', key: string, content: string): string {
  const selector = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapeRegExp(key)}")[^>]*>`, "i");
  const tag = '<meta ' + attribute + '="' + key + '" content="' + escapeHtmlAttribute(content) + '" />';
  if (selector.test(html)) return html.replace(selector, tag);
  return html.replace('</head>', '  ' + tag + '\n  </head>');
}

function upsertCanonical(html: string, href: string): string {
  const selector = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  const tag = '<link rel="canonical" href="' + escapeHtmlAttribute(href) + '" />';
  if (selector.test(html)) return html.replace(selector, tag);
  return html.replace('</head>', '  ' + tag + '\n  </head>');
}

export function applyRouteMetadata(html: string, pathname: string): string {
  const metadata = resolveMetadata(pathname);
  const title = metadata.title.includes('Jawed Imtiaz') ? metadata.title : metadata.title + ' | Jawed Imtiaz';
  const description = metadata.description;
  const ogTitle = metadata.ogTitle
    ? (metadata.ogTitle.includes('Jawed Imtiaz') ? metadata.ogTitle : metadata.ogTitle + ' | Jawed Imtiaz')
    : title;
  const ogDescription = metadata.ogDescription || description;
  const canonical = canonicalUrl(metadata.canonicalPath);
  const robots = metadata.robots || 'index, follow';

  let output = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, '<title>' + escapeHtmlAttribute(title) + '</title>');
  output = upsertMeta(output, 'name', 'description', description);
  output = upsertMeta(output, 'name', 'robots', robots);
  output = upsertMeta(output, 'property', 'og:site_name', 'Jawed Imtiaz');
  output = upsertMeta(output, 'property', 'og:title', ogTitle);
  output = upsertMeta(output, 'property', 'og:description', ogDescription);
  output = upsertMeta(output, 'property', 'og:type', metadata.ogType || 'website');
  output = upsertMeta(output, 'property', 'og:image', DEFAULT_OG_IMAGE);
  output = upsertMeta(output, 'property', 'og:image:width', '1200');
  output = upsertMeta(output, 'property', 'og:image:height', '630');
  output = upsertMeta(output, 'property', 'og:url', canonical);
  output = upsertMeta(output, 'name', 'twitter:card', 'summary_large_image');
  output = upsertMeta(output, 'name', 'twitter:title', ogTitle);
  output = upsertMeta(output, 'name', 'twitter:description', ogDescription);
  output = upsertMeta(output, 'name', 'twitter:image', DEFAULT_OG_IMAGE);
  output = upsertCanonical(output, canonical);
  return output;
}

export function getRouteHtmlOutputPath(distDir: string, pathname: string): string {
  const normalized = pathname.replace(/^\/+|\/+$/g, '');
  if (!normalized) return path.join(distDir, 'index.html');
  if (pathname.endsWith('/')) return path.join(distDir, normalized, 'index.html');
  return path.join(distDir, normalized + '.html');
}

export function prerenderRouteMetadata(distDir = DIST): number {
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(sitemapPath)) throw new Error('Generated sitemap not found: ' + sitemapPath);
  if (!fs.existsSync(indexPath)) throw new Error('Vite entry HTML not found: ' + indexPath);

  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const locations = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1].trim());
  if (!locations.length) throw new Error('Generated sitemap contains no locations; refusing to publish route snapshots.');

  const baseHtml = fs.readFileSync(indexPath, 'utf8');
  const seen = new Set<string>();
  let written = 0;

  for (const location of locations) {
    const url = new URL(location);
    if (url.origin !== SITE_ORIGIN || url.protocol !== 'https:') throw new Error('Non-canonical sitemap URL encountered: ' + location);
    if (url.search || url.hash) throw new Error('Sitemap URL must not contain query strings or fragments: ' + location);

    const outputPath = getRouteHtmlOutputPath(distDir, url.pathname);
    if (seen.has(outputPath)) continue;
    seen.add(outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, applyRouteMetadata(baseHtml, url.pathname), 'utf8');
    written += 1;
  }

  console.log('[route-seo-prerender] Wrote route-specific metadata to ' + written + ' HTML snapshots.');
  return written;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) prerenderRouteMetadata();
