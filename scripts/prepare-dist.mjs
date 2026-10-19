import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run vite build first.');
  process.exit(1);
}

const filesToCopy = [
  '_headers',
  '_redirects',
  '_routes.json',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'offline.html',
  'service-worker.js',
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'pwa-192.png',
  'pwa-512.png',
  'pwa-maskable-512.png'
];

for (const file of filesToCopy) {
  const src = path.resolve(file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy assets and static page directories if needed
const dirsToCopy = ['assets', 'contact'];
for (const dir of dirsToCopy) {
  const src = path.resolve(dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log('✓ Successfully prepared self-contained dist/ for production deployment.');
