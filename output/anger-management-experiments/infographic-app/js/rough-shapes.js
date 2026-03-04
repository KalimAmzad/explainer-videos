// ── Rough.js shapes: step boxes, badges, banner background ──

import { CONFIG } from './config.js';

/**
 * Generate all Rough.js hand-drawn shapes and add them to the DOM.
 * Returns an object with references to created elements for animation.
 */
export function createRoughShapes(rc, board) {
  const shapes = {};

  // ── Title banner background ──
  const banner = rc.rectangle(0, 0, 1280, 58, {
    roughness: 0.8,
    stroke: '#15585a',
    strokeWidth: 2,
    fill: '#1a6b6a',
    fillStyle: 'solid',
    bowing: 1,
  });
  banner.id = 'rough_banner';
  banner.setAttribute('opacity', '0');
  document.getElementById('g_banner').appendChild(banner);
  shapes.banner = banner;

  // ── Step boxes ──
  const stepLabels = [
    'RECOGNIZE TRIGGERS',
    'PAUSE & BREATHE',
    'REFRAME THE SITUATION',
    'COMMUNICATE ASSERTIVELY',
    'PRACTICE SELF-CARE',
  ];

  const stepPositions = [
    { x: 30,  y: 72,  w: 370, h: 280 },
    { x: 440, y: 72,  w: 370, h: 280 },
    { x: 240, y: 380, w: 370, h: 280 },
    { x: 860, y: 72,  w: 380, h: 280 },
    { x: 660, y: 380, w: 380, h: 280 },
  ];

  shapes.boxes = [];
  shapes.badges = [];

  stepPositions.forEach((pos, i) => {
    // Step box
    const box = rc.rectangle(pos.x, pos.y, pos.w, pos.h, {
      roughness: 1.5,
      stroke: '#bbb8b0',
      strokeWidth: 1.5,
      fill: 'rgba(255,255,255,0.3)',
      fillStyle: 'solid',
      bowing: 2,
    });
    box.id = `rough_box_${i + 1}`;
    box.setAttribute('opacity', '0');
    document.getElementById(`g_step${i + 1}`).insertBefore(box, document.getElementById(`g_step${i + 1}`).firstChild);
    shapes.boxes.push(box);

    // Step badge (numbered circle)
    const badge = rc.circle(pos.x + 15, pos.y + 16, 32, {
      roughness: 1.2,
      stroke: '#d4762c',
      strokeWidth: 2,
      fill: '#d4762c',
      fillStyle: 'solid',
      bowing: 1.5,
    });
    badge.id = `rough_badge_${i + 1}`;
    badge.setAttribute('opacity', '0');
    document.getElementById(`g_step${i + 1}`).appendChild(badge);
    shapes.badges.push(badge);
  });

  return shapes;
}
