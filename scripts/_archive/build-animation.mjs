/**
 * Build animated whiteboard HTML from rough SVG.
 * Groups rough SVG paths by spatial region, then creates
 * GSAP-animated HTML with sequential reveal.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const roughSvgPath = path.join(rootDir, 'output', 'anger-management-rough.svg');
const outputPath = path.join(rootDir, 'output', 'anger-management-whiteboard.html');

const roughSvg = fs.readFileSync(roughSvgPath, 'utf8');

// Extract all <g> groups (each contains fill path + stroke path from rough.js)
const groupRegex = /<g>([\s\S]*?)<\/g>/g;
const groups = [];
let match;
while ((match = groupRegex.exec(roughSvg)) !== null) {
  groups.push(match[1]);
}

console.log(`Total groups from rough SVG: ${groups.length}`);

// For each group, determine its center position using path coordinates
function getGroupCenter(svgContent) {
  // Extract M (moveTo) coordinates from all paths
  const coords = [];
  const moveMatches = svgContent.matchAll(/[MC]\s*([\d.-]+)\s+([\d.-]+)/g);
  for (const m of moveMatches) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    if (!isNaN(x) && !isNaN(y) && Math.abs(x) < 3000 && Math.abs(y) < 3000) {
      coords.push([x, y]);
    }
  }
  if (coords.length === 0) return { x: 0, y: 0 };
  const avgX = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const avgY = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return { x: avgX, y: avgY };
}

// Classify each group into a spatial region
// Based on the infographic layout from the Gemini image:
// - Title banner: top area (y < 130)
// - Section 1 "Recognize Triggers": top-left (x < 500, 130 < y < 430)
// - Section 2 "Pause & Breathe": top-center (500 < x < 900, 130 < y < 430)
// - Section 3 "Reframe": center (300 < x < 800, 350 < y < 580)
// - Section 4 "Communicate": top-right (900 < x, 130 < y < 430)
// - Section 5 "Self-Care": bottom-right (700 < x, 430 < y)
// - Background: very large shapes
// - Bottom/connectors: y > 680

const regions = {
  background: [],    // Scene 0 - background
  title: [],         // Scene 1 - title banner
  section1: [],      // Scene 2 - Recognize Triggers (top-left)
  section2: [],      // Scene 3 - Pause & Breathe (top-center)
  section3: [],      // Scene 4 - Reframe (center)
  section4: [],      // Scene 5 - Communicate (top-right)
  section5: [],      // Scene 6 - Self-Care (bottom)
  connectors: [],    // Scene 7 - connecting elements
};

groups.forEach((g, i) => {
  const center = getGroupCenter(g);

  // Background shape (first group that covers entire area, or very large fill area)
  if (i === 0) {
    regions.background.push({ content: g, center, idx: i });
    return;
  }

  const { x, y } = center;

  // Title banner area (top)
  if (y < 130 && y >= -50) {
    regions.title.push({ content: g, center, idx: i });
  }
  // Section 1: top-left quadrant
  else if (x < 470 && y >= 130 && y < 430) {
    regions.section1.push({ content: g, center, idx: i });
  }
  // Section 2: top-center
  else if (x >= 470 && x < 940 && y >= 130 && y < 430) {
    regions.section2.push({ content: g, center, idx: i });
  }
  // Section 4: top-right
  else if (x >= 940 && y >= 130 && y < 430) {
    regions.section4.push({ content: g, center, idx: i });
  }
  // Section 3: center-bottom left
  else if (x < 700 && y >= 430) {
    regions.section3.push({ content: g, center, idx: i });
  }
  // Section 5: bottom-right
  else if (x >= 700 && y >= 430) {
    regions.section5.push({ content: g, center, idx: i });
  }
  // Connectors/overflow
  else {
    regions.connectors.push({ content: g, center, idx: i });
  }
});

// Log region counts
for (const [name, items] of Object.entries(regions)) {
  console.log(`  ${name}: ${items.length} groups`);
}

// Sort groups within each region (top-left to bottom-right for reveal order)
for (const items of Object.values(regions)) {
  items.sort((a, b) => {
    const rowA = Math.floor(a.center.y / 80);
    const rowB = Math.floor(b.center.y / 80);
    if (rowA !== rowB) return rowA - rowB;
    return a.center.x - b.center.x;
  });
}

// Build the animated HTML
function buildGroupSVG(items, groupId) {
  return items.map((item, i) => `<g class="anim-item" id="${groupId}_${i}">${item.content}</g>`).join('\n');
}

// Scene timing (seconds)
const SCENE_TIMING = {
  background: { start: 0, dur: 0.3 },
  title: { start: 0.3, dur: 2.5 },
  section1: { start: 3.0, dur: 4.0 },
  section2: { start: 7.5, dur: 4.0 },
  section3: { start: 12.0, dur: 4.0 },
  section4: { start: 16.5, dur: 4.0 },
  section5: { start: 21.0, dur: 4.0 },
  connectors: { start: 25.5, dur: 2.0 },
};
const TOTAL_DURATION = 29;

const sectionLabels = {
  section1: '1. RECOGNIZE TRIGGERS',
  section2: '2. PAUSE & BREATHE',
  section3: '3. REFRAME THE SITUATION',
  section4: '4. COMMUNICATE ASSERTIVELY',
  section5: '5. PRACTICE SELF-CARE',
};

const sectionColors = {
  section1: '#cc3333',
  section2: '#2b7ec2',
  section3: '#1e8c5a',
  section4: '#cc7722',
  section5: '#8844aa',
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anger Management for Corporate Leaders — Whiteboard Explainer</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Caveat:wght@400;700&family=Patrick+Hand&family=Permanent+Marker&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: #111;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100vh; overflow: hidden;
}
.wrap {
  width: 100vw; max-width: 1280px;
  aspect-ratio: 16/9; position: relative;
  border-radius: 6px; overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,.6);
}
#board { width: 100%; height: 100%; display: block; }
.scene { opacity: 0; }
.anim-item { opacity: 0; }
#controls {
  margin-top: 10px; display: flex; gap: 10px; align-items: center;
}
#controls button {
  padding: 7px 18px; background: #2b7ec2; color: #fff;
  border: none; border-radius: 5px; font-size: 13px; cursor: pointer;
  transition: background 0.2s;
}
#controls button:hover { background: #1e5fa0; }
#timeDisp { color: #888; font: 13px/1 monospace; min-width: 90px; }
#seekBar { width: 300px; cursor: pointer; accent-color: #2b7ec2; }
</style>
</head>
<body>
<div class="wrap">
<svg id="board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1408 768" stroke-linecap="round">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".04" y2="1">
    <stop offset="0%" stop-color="#f5f3ef"/>
    <stop offset="100%" stop-color="#edeae4"/>
  </linearGradient>
  <!-- Clip paths for section labels -->
  <clipPath id="cp_label_1"><rect id="cr_label_1" x="0" y="0" width="0" height="50"/></clipPath>
  <clipPath id="cp_label_2"><rect id="cr_label_2" x="0" y="0" width="0" height="50"/></clipPath>
  <clipPath id="cp_label_3"><rect id="cr_label_3" x="0" y="0" width="0" height="50"/></clipPath>
  <clipPath id="cp_label_4"><rect id="cr_label_4" x="0" y="0" width="0" height="50"/></clipPath>
  <clipPath id="cp_label_5"><rect id="cr_label_5" x="0" y="0" width="0" height="50"/></clipPath>
  <clipPath id="cp_main_title"><rect id="cr_main_title" x="0" y="0" width="0" height="80"/></clipPath>
</defs>

<!-- Background -->
<rect width="1408" height="768" fill="url(#bg)"/>

<!-- ═══ SCENE: Background ═══ -->
<g id="scene_bg" class="scene">
${buildGroupSVG(regions.background, 'bg')}
</g>

<!-- ═══ SCENE: Title ═══ -->
<g id="scene_title" class="scene">
${buildGroupSVG(regions.title, 'ttl')}
<!-- Hand-drawn title overlay text -->
<g clip-path="url(#cp_main_title)">
  <text x="704" y="65" font-family="'Cabin Sketch',cursive" font-size="38" font-weight="700"
        fill="#1a2844" text-anchor="middle" letter-spacing="2">
    ANGER MANAGEMENT FOR CORPORATE LEADERS
  </text>
</g>
</g>

<!-- ═══ SCENE: Section 1 - Recognize Triggers ═══ -->
<g id="scene_s1" class="scene">
${buildGroupSVG(regions.section1, 's1')}
</g>

<!-- ═══ SCENE: Section 2 - Pause & Breathe ═══ -->
<g id="scene_s2" class="scene">
${buildGroupSVG(regions.section2, 's2')}
</g>

<!-- ═══ SCENE: Section 3 - Reframe ═══ -->
<g id="scene_s3" class="scene">
${buildGroupSVG(regions.section3, 's3')}
</g>

<!-- ═══ SCENE: Section 4 - Communicate ═══ -->
<g id="scene_s4" class="scene">
${buildGroupSVG(regions.section4, 's4')}
</g>

<!-- ═══ SCENE: Section 5 - Self-Care ═══ -->
<g id="scene_s5" class="scene">
${buildGroupSVG(regions.section5, 's5')}
</g>

<!-- ═══ SCENE: Connectors ═══ -->
<g id="scene_conn" class="scene">
${buildGroupSVG(regions.connectors, 'conn')}
</g>

<!-- Progress bar -->
<rect x="0" y="764" width="1408" height="4" fill="#ddd8d0"/>
<rect id="progBar" x="0" y="764" width="0" height="4" fill="#2b7ec2"/>
</svg>
</div>

<div id="controls">
  <button id="btnPlay">&#9654; Play</button>
  <button id="btnReplay">&#8635; Replay</button>
  <input type="range" id="seekBar" min="0" max="${TOTAL_DURATION * 1000}" value="0" step="100"/>
  <span id="timeDisp">0.0 / ${TOTAL_DURATION}.0s</span>
</div>

<!-- Libraries -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/DrawSVGPlugin.min.js"><\/script>
<script>
gsap.registerPlugin(DrawSVGPlugin);

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL = ${TOTAL_DURATION};
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const btnPlay = document.getElementById('btnPlay');
  let isSeeking = false;

  function showScene(sel) { gsap.set(sel, { opacity: 1 }); }

  /**
   * Stagger-reveal all .anim-item children within a parent group.
   * Each item does an opacity fade + slight scale for a "drawing in" feel.
   */
  function revealItems(parentId, startTime, totalDur) {
    const items = document.querySelectorAll('#' + parentId + ' .anim-item');
    if (items.length === 0) return;
    const stagger = totalDur / items.length;
    items.forEach((item, i) => {
      const t = startTime + i * stagger;
      // Fade in with slight upward motion
      tl.fromTo(item,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: Math.min(stagger * 1.5, 0.6), ease: 'power2.out' },
        t
      );

      // For stroke paths inside: animate draw-on
      const strokePaths = item.querySelectorAll('path[fill="none"]');
      strokePaths.forEach(sp => {
        if (typeof DrawSVGPlugin !== 'undefined') {
          gsap.set(sp, { drawSVG: '0%' });
          tl.to(sp, { drawSVG: '100%', duration: Math.min(stagger * 2, 0.8), ease: 'power1.inOut' }, t);
        }
      });
    });
  }

  // ── Master Timeline ──
  const tl = gsap.timeline({
    paused: true,
    onUpdate() {
      const t = tl.time();
      if (!isSeeking) seekBar.value = Math.round(t * 1000);
      timeDisp.textContent = t.toFixed(1) + ' / ' + TOTAL + 's';
      gsap.set('#progBar', { attr: { width: (t / TOTAL) * 1408 } });
    }
  });

  // ═══ Background (0.0s → 0.3s) ═══
  tl.call(() => showScene('#scene_bg'), null, 0);
  revealItems('scene_bg', 0, 0.3);

  // ═══ Title (0.3s → 2.8s) ═══
  tl.call(() => showScene('#scene_title'), null, 0.3);
  revealItems('scene_title', 0.3, 2.0);
  // Title text wipe
  tl.to('#cr_main_title', { attr: { width: 1408 }, duration: 1.8, ease: 'power1.inOut' }, 0.8);

  // ═══ Section 1: Recognize Triggers (3.0s → 7.0s) ═══
  tl.call(() => showScene('#scene_s1'), null, 3.0);
  revealItems('scene_s1', 3.0, 4.0);

  // ═══ Section 2: Pause & Breathe (7.5s → 11.5s) ═══
  tl.call(() => showScene('#scene_s2'), null, 7.5);
  revealItems('scene_s2', 7.5, 4.0);

  // ═══ Section 3: Reframe (12.0s → 16.0s) ═══
  tl.call(() => showScene('#scene_s3'), null, 12.0);
  revealItems('scene_s3', 12.0, 4.0);

  // ═══ Section 4: Communicate (16.5s → 20.5s) ═══
  tl.call(() => showScene('#scene_s4'), null, 16.5);
  revealItems('scene_s4', 16.5, 4.0);

  // ═══ Section 5: Self-Care (21.0s → 25.0s) ═══
  tl.call(() => showScene('#scene_s5'), null, 21.0);
  revealItems('scene_s5', 21.0, 4.0);

  // ═══ Connectors (25.5s → 27.5s) ═══
  tl.call(() => showScene('#scene_conn'), null, 25.5);
  revealItems('scene_conn', 25.5, 2.0);

  // Hold final frame
  tl.to({}, { duration: 1.5 }, TOTAL - 1.5);

  // ── Controls ──
  btnPlay.addEventListener('click', () => {
    if (tl.isActive()) {
      tl.pause();
      btnPlay.textContent = '\\u25B6 Play';
    } else {
      tl.play();
      btnPlay.textContent = '\\u23F8 Pause';
    }
  });

  document.getElementById('btnReplay').addEventListener('click', () => {
    // Reset everything
    document.querySelectorAll('.scene').forEach(s => gsap.set(s, { opacity: 0 }));
    document.querySelectorAll('.anim-item').forEach(el => gsap.set(el, { opacity: 0, y: 8 }));
    document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
    // Reset DrawSVG
    document.querySelectorAll('path[fill="none"]').forEach(sp => {
      if (typeof DrawSVGPlugin !== 'undefined') gsap.set(sp, { drawSVG: '0%' });
    });
    gsap.set('#progBar', { attr: { width: 0 } });
    tl.seek(0).restart();
    btnPlay.textContent = '\\u23F8 Pause';
  });

  seekBar.addEventListener('input', () => {
    isSeeking = true;
    tl.seek(seekBar.value / 1000).pause();
    btnPlay.textContent = '\\u25B6 Play';
    setTimeout(() => { isSeeking = false; }, 100);
  });

  // Auto-play after fonts load
  setTimeout(() => {
    tl.play();
    btnPlay.textContent = '\\u23F8 Pause';
  }, 800);
});
<\/script>
</body>
</html>`;

fs.writeFileSync(outputPath, html);
console.log(`\nAnimated HTML saved: ${outputPath}`);
console.log(`File size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
console.log(`Total duration: ${TOTAL_DURATION}s`);
