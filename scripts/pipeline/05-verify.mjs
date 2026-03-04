/**
 * Step 5: Take screenshots at key timestamps for visual verification.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

const slug = process.argv[2]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'anger-management-for-corporate-leaders';
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);

const htmlPath = path.join(outputDir, `${slug}-whiteboard.html`);
const planPath = path.join(outputDir, 'scene-plan.json');
const framesDir = path.join(outputDir, 'frames');

if (!fs.existsSync(htmlPath)) { console.error(`HTML not found: ${htmlPath}`); process.exit(1); }
fs.mkdirSync(framesDir, { recursive: true });

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

// Screenshot at start and middle of each scene
const timestamps = [];
for (const scene of plan.scenes) {
  timestamps.push(scene.time_start + 0.5);
  timestamps.push((scene.time_start + scene.time_end) / 2);
  timestamps.push(scene.time_end - 0.5);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
page.on('console', msg => { if (msg.type() === 'error') console.log(`ERR: ${msg.text()}`); });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
// Wait for GSAP to be available
await page.waitForFunction(() => typeof gsap !== 'undefined', { timeout: 10000 }).catch(() => {
  console.log('Warning: GSAP not detected, screenshots may not be seekable');
});
await page.waitForTimeout(500);

for (const t of timestamps) {
  await page.evaluate((time) => {
    const tls = gsap.globalTimeline.getChildren(false, false, true);
    if (tls.length > 0) tls[0].seek(time).pause();
  }, t);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(framesDir, `frame_${t.toFixed(1).replace('.', '_')}s.png`),
    clip: { x: 0, y: 0, width: 1280, height: 720 }
  });
  console.log(`Frame at ${t.toFixed(1)}s`);
}

await browser.close();
console.log(`\nDone! ${timestamps.length} frames saved to ${framesDir}`);
