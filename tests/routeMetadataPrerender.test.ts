import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyRouteMetadata,
  getRouteHtmlOutputPath,
  prerenderRouteMetadata,
} from '../scripts/prerender-route-metadata';

const BASE_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>Jawed Imtiaz | IT Field Tech, Troubleshooting Guides &amp; Practical Tools</title>
  <meta name="description" content="Homepage description">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://jawed.co.in/">
  <meta property="og:title" content="Homepage title">
  <meta property="og:url" content="https://jawed.co.in/">
  <meta name="twitter:title" content="Homepage title">
</head>
<body><main><div id="root"></div></main></body>
</html>`;

test('applyRouteMetadata emits route-specific title, canonical, description and social metadata', () => {
  const html = applyRouteMetadata(BASE_HTML, '/tools/career-match-resume-review');

  assert.match(html, /<title>Career Match &amp; Resume Review[^<]*<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jawed\.co\.in\/tools\/career-match-resume-review" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/jawed\.co\.in\/tools\/career-match-resume-review" \/>/);
  assert.match(html, /<meta name="robots" content="index, follow" \/>/);
  assert.doesNotMatch(html, /Homepage description/);
});

test('unknown routes remain noindex and canonicalize to the not-found route', () => {
  const html = applyRouteMetadata(BASE_HTML, '/not-a-real-page');

  assert.match(html, /<title>Page Not Found \| Jawed Imtiaz<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex, follow" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/jawed\.co\.in\/404" \/>/);
});

test('route output paths preserve clean URLs for slashless and trailing-slash routes', () => {
  const dist = path.join(os.tmpdir(), 'jawed-prerender-test');
  assert.equal(getRouteHtmlOutputPath(dist, '/'), path.join(dist, 'index.html'));
  assert.equal(getRouteHtmlOutputPath(dist, '/about/'), path.join(dist, 'about', 'index.html'));
  assert.equal(getRouteHtmlOutputPath(dist, '/tools/career-match-resume-review'), path.join(dist, 'tools', 'career-match-resume-review.html'));
});

test('prerenderRouteMetadata writes one route snapshot per sitemap URL', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'jawed-route-seo-'));
  try {
    fs.writeFileSync(path.join(dist, 'index.html'), BASE_HTML, 'utf8');
    fs.writeFileSync(
      path.join(dist, 'sitemap.xml'),
      `<?xml version="1.0"?><urlset>
        <url><loc>https://jawed.co.in/</loc></url>
        <url><loc>https://jawed.co.in/tools/career-match-resume-review</loc></url>
        <url><loc>https://jawed.co.in/about/</loc></url>
      </urlset>`,
      'utf8'
    );

    assert.equal(prerenderRouteMetadata(dist, []), 3);
    assert.equal(fs.existsSync(path.join(dist, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(dist, 'tools', 'career-match-resume-review.html')), true);
    assert.equal(fs.existsSync(path.join(dist, 'about', 'index.html')), true);
    const toolHtml = fs.readFileSync(path.join(dist, 'tools', 'career-match-resume-review.html'), 'utf8');
    assert.match(toolHtml, /career-match-resume-review/);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});


test('explicit noindex routes are emitted even when excluded from the sitemap', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'jawed-noindex-seo-'));
  try {
    fs.writeFileSync(path.join(dist, 'index.html'), BASE_HTML, 'utf8');
    fs.writeFileSync(
      path.join(dist, 'sitemap.xml'),
      `<?xml version="1.0"?><urlset><url><loc>https://jawed.co.in/</loc></url></urlset>`,
      'utf8'
    );

    assert.equal(prerenderRouteMetadata(dist, ['/ai', '/offline']), 3);
    const aiHtml = fs.readFileSync(path.join(dist, 'ai.html'), 'utf8');
    const offlineHtml = fs.readFileSync(path.join(dist, 'offline.html'), 'utf8');
    assert.match(aiHtml, /<meta name="robots" content="noindex, follow" \/>/);
    assert.match(aiHtml, /<link rel="canonical" href="https:\/\/jawed\.co\.in\/ai\/" \/>/);
    assert.match(offlineHtml, /<meta name="robots" content="noindex, follow" \/>/);
    assert.match(offlineHtml, /<link rel="canonical" href="https:\/\/jawed\.co\.in\/offline\/" \/>/);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});
