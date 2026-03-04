import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const files = [
  'v3-a-vtracer-edges.svg',
  'v3-b-vtracer-cutout-hifi.svg',
  'v3-c-potrace-edges.svg',
  'v3-d-potrace-posterize.svg',
];

const browser = await chromium.launch();

for (const file of files) {
  const svgPath = path.join(rootDir, 'output', file);
  if (!fs.existsSync(svgPath)) continue;

  const page = await browser.newPage({ viewport: { width: 1408, height: 768 } });

  // Create a simple HTML wrapper with white background
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#fff;">${svgContent}</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const screenshotName = file.replace('.svg', '.png');
  await page.screenshot({
    path: path.join(rootDir, 'output', screenshotName),
    clip: { x: 0, y: 0, width: 1408, height: 768 }
  });
  console.log(`Screenshot: ${screenshotName}`);
  await page.close();
}

await browser.close();
console.log('Done!');
