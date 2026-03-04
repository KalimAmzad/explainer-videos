import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const htmlPath = path.join(rootDir, 'output', 'anger-management-whiteboard.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 900 } });
page.on('console', msg => { if (msg.type() === 'error') console.log(`ERR: ${msg.text()}`); });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Seek to various timestamps using direct GSAP timeline access
const timestamps = [0, 2, 5, 10, 15, 20, 25, 28];

for (const t of timestamps) {
  await page.evaluate((time) => {
    // Access the GSAP timeline directly
    const tls = gsap.globalTimeline.getChildren(false, false, true);
    if (tls.length > 0) {
      tls[0].seek(time).pause();
    }
  }, t);
  await page.waitForTimeout(200);

  await page.screenshot({
    path: path.join(rootDir, 'output', `frame_${String(t).padStart(2, '0')}s.png`),
    clip: { x: 0, y: 0, width: 1408, height: 800 }
  });
  console.log(`Screenshot at ${t}s saved`);
}

await browser.close();
console.log('Done!');
