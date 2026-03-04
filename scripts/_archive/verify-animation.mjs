/**
 * Step 5: Verify the V3 animation by taking screenshots at key timestamps.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const htmlPath = process.argv[2] || path.join(rootDir, 'output', 'anger-management-v3-whiteboard.html');

if (!fs.existsSync(htmlPath)) { console.error(`File not found: ${htmlPath}`); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 900 } });
page.on('console', msg => { if (msg.type() === 'error') console.log(`ERR: ${msg.text()}`); });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const timestamps = [0, 2, 5, 8, 12, 16, 20, 24, 26];

for (const t of timestamps) {
  await page.evaluate((time) => {
    const tls = gsap.globalTimeline.getChildren(false, false, true);
    if (tls.length > 0) tls[0].seek(time).pause();
  }, t);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(rootDir, 'output', `v3_frame_${String(t).padStart(2, '0')}s.png`),
    clip: { x: 0, y: 0, width: 1408, height: 800 }
  });
  console.log(`Frame at ${t}s`);
}

await browser.close();
console.log('Done!');
