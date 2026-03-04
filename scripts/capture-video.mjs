/**
 * Capture whiteboard explainer HTML to MP4 using Playwright + ffmpeg.
 *
 * Strategy: Override virtual time so GSAP runs at accelerated speed,
 * while Playwright records the browser viewport as a webm video.
 * Then convert webm → mp4 with ffmpeg.
 *
 * Usage:
 *   node scripts/capture-video.mjs output/llm-from-scratch-whiteboard.html [duration_seconds]
 */

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const htmlFile = process.argv[2] || 'output/llm-from-scratch-whiteboard.html';
const DURATION = parseInt(process.argv[3] || '300', 10);
const absHtml = path.resolve(projectRoot, htmlFile);

if (!fs.existsSync(absHtml)) {
  console.error(`File not found: ${absHtml}`);
  process.exit(1);
}

const baseName = path.basename(htmlFile, '.html');
const outputDir = path.resolve(projectRoot, 'output');
const webmDir = path.resolve(outputDir, 'capture-temp');
const mp4Path = path.resolve(outputDir, `${baseName}.mp4`);

async function main() {
  console.log(`Capturing: ${absHtml}`);
  console.log(`Duration: ${DURATION}s`);
  console.log(`Output: ${mp4Path}`);

  // Launch browser with video recording
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: webmDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Navigate to the file
  await page.goto(`file://${absHtml}`, { waitUntil: 'networkidle' });
  console.log('Page loaded, waiting for fonts...');

  // Wait for fonts + initial delay
  await page.waitForTimeout(2000);

  // Ensure timeline is playing
  await page.evaluate(() => {
    const btn = document.getElementById('btnPlay');
    if (btn && btn.textContent.includes('Play')) {
      btn.click();
    }
  });

  console.log(`Recording ${DURATION}s of animation (real-time)...`);
  console.log('This will take ~5 minutes. Please wait...');

  // Wait for the full animation duration + buffer
  await page.waitForTimeout((DURATION + 3) * 1000);

  console.log('Animation complete. Saving video...');

  // Close context to finalize the video file
  await context.close();
  await browser.close();

  // Find the recorded webm file
  const webmFiles = fs.readdirSync(webmDir).filter(f => f.endsWith('.webm'));
  if (webmFiles.length === 0) {
    console.error('No webm file was recorded!');
    process.exit(1);
  }

  const webmPath = path.resolve(webmDir, webmFiles[0]);
  console.log(`Recorded: ${webmPath}`);

  // Convert webm to mp4 using ffmpeg
  console.log('Converting to MP4...');
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`,
      { stdio: 'inherit' }
    );
    console.log(`\nMP4 saved: ${mp4Path}`);
  } catch (e) {
    console.error('ffmpeg conversion failed:', e.message);
    console.log(`WebM file available at: ${webmPath}`);
    process.exit(1);
  }

  // Clean up temp dir
  try {
    fs.unlinkSync(webmPath);
    fs.rmdirSync(webmDir);
    console.log('Temp files cleaned up.');
  } catch (_) { /* ignore */ }
}

main().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
