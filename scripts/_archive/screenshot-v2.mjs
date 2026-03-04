import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'output', 'anger-management-v2-whiteboard.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 900 } });
page.on('console', msg => { if (msg.type() === 'error') console.log(`ERR: ${msg.text()}`); });
page.on('console', msg => { if (msg.text().startsWith('Stroke')) console.log(`LOG: ${msg.text()}`); });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const timestamps = [0, 3, 6, 10, 15, 20, 25, 30, 34];

for (const t of timestamps) {
  await page.evaluate((time) => {
    const tls = gsap.globalTimeline.getChildren(false, false, true);
    if (tls.length > 0) tls[0].seek(time).pause();
  }, t);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(rootDir, 'output', `v2_frame_${String(t).padStart(2, '0')}s.png`),
    clip: { x: 0, y: 0, width: 1408, height: 800 }
  });
  console.log(`Frame at ${t}s`);
}

await browser.close();
console.log('Done!');
