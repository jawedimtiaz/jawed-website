import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

function findImages(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findImages(fullPath));
    } else if (/\.(png|jpe?g)$/i.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('[WebP Generator] Scanning for raster images in public/...');
const images = findImages(publicDir);
let converted = 0;

for (const imgPath of images) {
  const webpPath = imgPath.replace(/\.(png|jpe?g)$/i, '.webp');
  const needsConvert = !fs.existsSync(webpPath) || fs.statSync(imgPath).mtimeMs > fs.statSync(webpPath).mtimeMs;

  if (needsConvert) {
    try {
      execFileSync('convert', [imgPath, '-quality', '85', webpPath]);
      const origSize = fs.statSync(imgPath).size;
      const webpSize = fs.statSync(webpPath).size;
      const savings = Math.round((1 - webpSize / origSize) * 100);
      console.log(`Converted: ${path.relative(rootDir, imgPath)} -> ${path.relative(rootDir, webpPath)} (${origSize}B -> ${webpSize}B, ${savings}% reduction)`);
      converted++;
    } catch (err) {
      console.error(`Failed to convert ${imgPath}:`, err.message);
    }
  } else {
    console.log(`Up to date: ${path.relative(rootDir, webpPath)}`);
  }
}

console.log(`[WebP Generator] Completed. Converted ${converted} of ${images.length} images.`);
