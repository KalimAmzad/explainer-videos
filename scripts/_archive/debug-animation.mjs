import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const htmlPath = path.join(rootDir, 'output', 'anger-management-whiteboard.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 900 } });

// Capture console messages
page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

// Wait for scripts to load
await page.waitForTimeout(2000);

// Check the state
const state = await page.evaluate(() => {
  const scenes = document.querySelectorAll('.scene');
  const animItems = document.querySelectorAll('.anim-item');
  const board = document.getElementById('board');

  // Check GSAP
  const hasGsap = typeof gsap !== 'undefined';
  const hasDrawSVG = typeof DrawSVGPlugin !== 'undefined';

  // Check if rough SVG paths exist
  const paths = board ? board.querySelectorAll('path') : [];

  // Check scenes visibility
  const sceneStates = [];
  scenes.forEach(s => {
    sceneStates.push({
      id: s.id,
      opacity: window.getComputedStyle(s).opacity,
      childCount: s.children.length
    });
  });

  return {
    hasGsap,
    hasDrawSVG,
    sceneCount: scenes.length,
    animItemCount: animItems.length,
    pathCount: paths.length,
    boardExists: !!board,
    boardViewBox: board?.getAttribute('viewBox'),
    sceneStates,
    firstPathD: paths.length > 0 ? paths[0].getAttribute('d')?.substring(0, 100) : 'none'
  };
});

console.log('\n=== Debug State ===');
console.log(JSON.stringify(state, null, 2));

// Force show everything and take screenshot
await page.evaluate(() => {
  document.querySelectorAll('.scene').forEach(s => {
    s.style.opacity = '1';
  });
  document.querySelectorAll('.anim-item').forEach(el => {
    el.style.opacity = '1';
  });
});

await page.waitForTimeout(500);
await page.screenshot({
  path: path.join(rootDir, 'output', 'debug_forced_visible.png'),
  clip: { x: 0, y: 0, width: 1408, height: 800 }
});
console.log('\nForced-visible screenshot saved');

await browser.close();
