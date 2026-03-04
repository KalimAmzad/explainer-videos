// ── Main Orchestrator ──

import { CONFIG } from './config.js';
import { loadAllSVGs, loadArrows } from './svg-loader.js';
import { createRoughShapes } from './rough-shapes.js';
import { buildTimeline } from './timeline.js';
import { setupControls } from './controls.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Register GSAP plugins
  if (typeof DrawSVGPlugin !== 'undefined') gsap.registerPlugin(DrawSVGPlugin);

  const board = document.getElementById('board');

  // 1. Load SVG assets into DOM
  await loadAllSVGs();
  await loadArrows();

  // 2. After SVGs are loaded, tag subgroups for targeted animation
  tagIllustrationGroups();

  // 3. Generate Rough.js shapes
  const rc = rough.svg(board);
  const shapes = createRoughShapes(rc, board);

  // 4. Build GSAP timeline
  const tl = buildTimeline(shapes);

  // 5. Setup playback controls
  setupControls(tl, CONFIG.TOTAL_DURATION);

  // 6. Auto-play after short delay for fonts
  setTimeout(() => {
    tl.play();
    document.getElementById('btnPlay').textContent = '\u23F8 Pause';
  }, 800);
});

/**
 * After SVGs are injected, split their children into tagged groups
 * for targeted draw-on animation (outlines vs fills vs icons/bubbles).
 */
function tagIllustrationGroups() {
  for (let i = 1; i <= 5; i++) {
    const parent = document.getElementById(`illust_step${i}`);
    if (!parent) continue;

    // Create sub-groups
    const outlines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    outlines.id = `illust_step${i}_outlines`;

    const icons = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    icons.id = `illust_step${i}_icons`;

    const bubbles = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bubbles.id = `illust_step${i}_bubbles`;

    // Move children into sub-groups based on class
    const children = Array.from(parent.children);
    children.forEach(child => {
      // Skip defs, text, etc.
      if (child.tagName === 'defs' || child.tagName === 'text') return;
      if (child.classList.contains('fill-shape')) return; // fills stay in place

      const classList = child.classList;
      if (classList.contains('outlines')) {
        // Check if this is the main outline or a secondary element
        const stroke = child.getAttribute('stroke') || '';
        const isMainOutline = stroke === '#333' || stroke === '';

        // For step-specific handling:
        if (isMainOutline) {
          outlines.appendChild(child);
        } else {
          // Secondary stroke groups (thought bubbles, icons, etc.)
          // Determine if it's a "bubble" or "icon" type
          const hasCircle = child.querySelector('circle, ellipse');
          if (hasCircle && child.querySelectorAll('circle, ellipse').length > 1) {
            bubbles.appendChild(child);
          } else {
            icons.appendChild(child);
          }
        }
      }
    });

    // Add sub-groups to parent
    if (outlines.children.length > 0) parent.appendChild(outlines);
    if (icons.children.length > 0) parent.appendChild(icons);
    if (bubbles.children.length > 0) parent.appendChild(bubbles);
  }
}
