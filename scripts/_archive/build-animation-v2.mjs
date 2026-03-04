/**
 * V2 Animation builder:
 * - Potrace edge SVG as stroke layer (animated draw-on)
 * - VTracer Cutout SVG as color fill layer (faded in by region)
 * - Uses CSS animation + GSAP for maximum compatibility
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load SVGs
const potraceSvg = fs.readFileSync(path.join(rootDir, 'output', 'v3-c-potrace-edges.svg'), 'utf8');
const vtracerSvg = fs.readFileSync(path.join(rootDir, 'output', 'v3-b-vtracer-cutout-hifi.svg'), 'utf8');

// Extract the single path d attribute from Potrace SVG
const potracePathMatch = potraceSvg.match(/<path d="([^"]+)"/);
const potracePathD = potracePathMatch ? potracePathMatch[1] : '';
console.log(`Potrace path length: ${potracePathD.length} chars`);

// Extract all paths from VTracer SVG, with spatial info for grouping
const vtracerPaths = [];
const pathRegex = /<path d="([^"]+)" fill="([^"]+)" transform="translate\(([^,]+),([^)]+)\)"/g;
let m;
while ((m = pathRegex.exec(vtracerSvg)) !== null) {
  const d = m[1];
  const fill = m[2];
  const tx = parseFloat(m[3]);
  const ty = parseFloat(m[4]);

  // Estimate center from first move command + transform
  const moveMatch = d.match(/^M([\d.-]+)\s+([\d.-]+)/);
  const mx = moveMatch ? parseFloat(moveMatch[1]) : 0;
  const my = moveMatch ? parseFloat(moveMatch[2]) : 0;
  const cx = tx + mx;
  const cy = ty + my;

  vtracerPaths.push({ d, fill, tx, ty, cx, cy });
}
console.log(`VTracer paths: ${vtracerPaths.length}`);

// Group VTracer paths into spatial regions
function classifyRegion(cx, cy) {
  if (cy < 100) return 'title';
  if (cx < 470 && cy < 430) return 's1';
  if (cx >= 470 && cx < 940 && cy < 300) return 's2';
  if (cx >= 940 && cy < 430) return 's4';
  if (cx < 470 && cy >= 430) return 's3_left';
  if (cx >= 470 && cx < 940 && cy >= 300) return 's3';
  return 's5';
}

const regions = {};
for (const p of vtracerPaths) {
  const region = classifyRegion(p.cx, p.cy);
  if (!regions[region]) regions[region] = [];
  regions[region].push(p);
}

for (const [name, paths] of Object.entries(regions)) {
  console.log(`  Region ${name}: ${paths.length} paths`);
}

// Build region SVG content
function buildRegionGroup(regionName, paths) {
  return paths.map((p, i) =>
    `<path d="${p.d}" fill="${p.fill}" transform="translate(${p.tx},${p.ty})" class="fill-item region-${regionName}" opacity="0"/>`
  ).join('\n');
}

// Region timing (when color fills fade in)
const regionOrder = ['title', 's1', 's2', 's3', 's3_left', 's4', 's5'];
const TOTAL_DURATION = 35; // seconds
const STROKE_DURATION = 25; // how long the stroke draw-on takes

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
#controls {
  margin-top: 10px; display: flex; gap: 10px; align-items: center;
}
#controls button {
  padding: 7px 18px; background: #2b7ec2; color: #fff;
  border: none; border-radius: 5px; font-size: 13px; cursor: pointer;
}
#controls button:hover { background: #1e5fa0; }
#timeDisp { color: #888; font: 13px/1 monospace; min-width: 90px; }
#seekBar { width: 300px; cursor: pointer; accent-color: #2b7ec2; }
</style>
</head>
<body>
<div class="wrap">
<svg id="board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1408 768">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".04" y2="1">
    <stop offset="0%" stop-color="#f5f3ef"/>
    <stop offset="100%" stop-color="#edeae4"/>
  </linearGradient>
</defs>

<!-- Background -->
<rect width="1408" height="768" fill="url(#bg)"/>

<!-- Color fill layer (VTracer Cutout paths, initially hidden) -->
<g id="colorLayer">
${regionOrder.map(r => regions[r] ? buildRegionGroup(r, regions[r]) : '').join('\n')}
</g>

<!-- Stroke outline layer (Potrace edge path, animated draw-on) -->
<path id="strokePath"
  d="${potracePathD}"
  fill="none"
  stroke="#1a2844"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
/>

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

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const TOTAL = ${TOTAL_DURATION};
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const btnPlay = document.getElementById('btnPlay');
  let isSeeking = false;

  // ── Measure stroke path length ──
  const strokePath = document.getElementById('strokePath');
  const pathLength = strokePath.getTotalLength();
  console.log('Stroke path total length:', pathLength);

  // Set initial state: stroke hidden via dashoffset
  gsap.set(strokePath, {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength,
  });

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

  // ═══ Stroke draw-on animation (0s → ${STROKE_DURATION}s) ═══
  // The entire infographic outlines draw themselves in
  tl.to(strokePath, {
    strokeDashoffset: 0,
    duration: ${STROKE_DURATION},
    ease: 'power1.inOut',
  }, 0);

  // ═══ Color fill fade-in (staggered by region) ═══
  // Each region fades in its color fills as the stroke passes through it
  const regionTimings = {
    title:   { start: 1.5, dur: 2.5 },
    s1:      { start: 4.0, dur: 3.0 },
    s2:      { start: 8.0, dur: 3.0 },
    s3:      { start: 13.0, dur: 3.0 },
    s3_left: { start: 17.0, dur: 3.0 },
    s4:      { start: 21.0, dur: 3.0 },
    s5:      { start: 25.0, dur: 3.0 },
  };

  for (const [region, timing] of Object.entries(regionTimings)) {
    const items = document.querySelectorAll('.region-' + region);
    if (items.length === 0) continue;
    const stagger = timing.dur / items.length;

    items.forEach((item, i) => {
      const t = timing.start + i * stagger;
      tl.to(item, {
        opacity: 1,
        duration: Math.min(stagger * 2, 0.8),
        ease: 'power2.out',
      }, t);
    });
  }

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
    gsap.set(strokePath, { strokeDashoffset: pathLength });
    document.querySelectorAll('.fill-item').forEach(el => gsap.set(el, { opacity: 0 }));
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

const outputPath = path.join(rootDir, 'output', 'anger-management-v2-whiteboard.html');
fs.writeFileSync(outputPath, html);
console.log(`\nOutput: ${outputPath}`);
console.log(`Size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
