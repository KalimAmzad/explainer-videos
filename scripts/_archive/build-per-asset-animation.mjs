/**
 * Step 4: Assemble the final animated HTML from per-asset vectorization data.
 * Each asset is positioned at its correct coordinates and animated individually.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inputPath = process.argv[2] || path.join(rootDir, 'output', 'anger-management-infographic.png');
const manifestPath = path.join(rootDir, 'output', 'asset-manifest.json');

if (!fs.existsSync(manifestPath)) { console.error('Run previous steps first'); process.exit(1); }

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const imgMeta = await sharp(inputPath).metadata();

// ── Canvas mapping ──
const CANVAS_W = 1408;
const CANVAS_H = 768;
const scaleX = CANVAS_W / imgMeta.width;
const scaleY = CANVAS_H / imgMeta.height;
const scale = Math.min(scaleX, scaleY);
const offsetX = (CANVAS_W - imgMeta.width * scale) / 2;
const offsetY = (CANVAS_H - imgMeta.height * scale) / 2;

function mapBox(pixelBox) {
  return {
    x: offsetX + pixelBox.x * scale,
    y: offsetY + pixelBox.y * scale,
    w: pixelBox.w * scale,
    h: pixelBox.h * scale,
  };
}

function mapCrop(crop) {
  return {
    x: offsetX + crop.x * scale,
    y: offsetY + crop.y * scale,
    w: crop.w * scale,
    h: crop.h * scale,
  };
}

console.log(`Image: ${imgMeta.width}x${imgMeta.height} → Canvas: ${CANVAS_W}x${CANVAS_H}`);
console.log(`Scale: ${scale.toFixed(3)}, Offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

// ── Build SVG content ──
let defs = '';
let svgContent = '';
const strokeElements = []; // IDs of elements needing drawOn
const fadeElements = [];   // IDs of elements needing fadeIn
const wipeElements = [];   // { clipRectId, targetWidth }

// Section timing config
const TOTAL_DURATION = 38;
const sectionOrder = ['title', 'section_1', 'section_2', 'section_3', 'section_4', 'section_5', 'connector'];

// Group assets by section
const sections = {};
for (const a of manifest) {
  if (!sections[a.section]) sections[a.section] = [];
  sections[a.section].push(a);
}

// Sort within each section by draw_order
for (const sec of Object.values(sections)) {
  sec.sort((a, b) => a.draw_order - b.draw_order);
}

// ── Generate SVG for each asset ──
for (const asset of manifest) {
  if (!asset.crop) continue;
  const canvasCrop = mapCrop(asset.crop);
  const canvasBox = mapBox(asset.pixel_box);
  const v = asset.vectorized;
  if (!v) continue;

  if (v.type === 'text') {
    // Render as SVG <text> with clip-wipe
    const clipId = `cp_${asset.label}`;
    const crId = `cr_${asset.label}`;
    const textContent = asset.description;

    // Estimate font size from bounding box height
    let fontSize = Math.round(canvasBox.h * 0.55);
    let fontFamily = "'Cabin Sketch', cursive";
    let fontWeight = '700';

    if (asset.type === 'title_banner') {
      fontSize = Math.round(canvasBox.h * 0.4);
      fontFamily = "'Permanent Marker', cursive";
    }

    // Clip path for text wipe
    defs += `  <clipPath id="${clipId}"><rect id="${crId}" x="${canvasBox.x.toFixed(1)}" y="${canvasBox.y.toFixed(1)}" width="0" height="${(canvasBox.h + 10).toFixed(1)}"/></clipPath>\n`;

    // Text element
    const textX = canvasBox.x + (asset.type === 'title_banner' ? canvasBox.w / 2 : 5);
    const textY = canvasBox.y + canvasBox.h * 0.65;
    const anchor = asset.type === 'title_banner' ? 'middle' : 'start';
    const fill = asset.type === 'title_banner' ? '#ffffff' : asset.dominant_color;

    // For title banner, add background rect first
    if (asset.type === 'title_banner') {
      svgContent += `<!-- Title Banner Background -->\n`;
      svgContent += `<rect id="bg_${asset.label}" x="${canvasBox.x.toFixed(1)}" y="${canvasBox.y.toFixed(1)}" width="${canvasBox.w.toFixed(1)}" height="${canvasBox.h.toFixed(1)}" fill="${asset.dominant_color}" rx="4" opacity="0"/>\n`;
      fadeElements.push({ id: `bg_${asset.label}`, duration: 0.6 });
    }

    svgContent += `<!-- ${asset.label} -->\n`;
    svgContent += `<g clip-path="url(#${clipId})">\n`;
    svgContent += `  <text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}">${escapeXml(textContent)}</text>\n`;
    svgContent += `</g>\n`;

    wipeElements.push({ id: crId, targetWidth: canvasBox.w + 20, label: asset.label });

  } else if (v.type === 'stroke') {
    // Container or arrow — stroke draw-on
    const scaleAsset = canvasCrop.w / v.source_w;
    svgContent += `<!-- ${asset.label} -->\n`;
    svgContent += `<path id="stroke_${asset.label}" d="${v.stroke_path_d}" fill="none" stroke="${asset.dominant_color}" stroke-width="${asset.type === 'arrow' ? 2.5 : 1.8}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${canvasCrop.x.toFixed(1)},${canvasCrop.y.toFixed(1)}) scale(${scaleAsset.toFixed(4)})" opacity="0"/>\n`;
    strokeElements.push({ id: `stroke_${asset.label}`, duration: asset.type === 'arrow' ? 0.6 : 1.2, label: asset.label });

  } else if (v.type === 'stroke_and_fill') {
    // Icon — stroke draws first, then fills fade in
    const scaleAsset = canvasCrop.w / v.source_w;
    const transform = `translate(${canvasCrop.x.toFixed(1)},${canvasCrop.y.toFixed(1)}) scale(${scaleAsset.toFixed(4)})`;

    // Color fills layer (behind stroke)
    svgContent += `<!-- ${asset.label} fills -->\n`;
    svgContent += `<g id="fills_${asset.label}" transform="${transform}" opacity="0">\n`;
    for (const fp of v.fill_paths) {
      const fpTransform = (fp.tx || fp.ty) ? ` transform="translate(${fp.tx},${fp.ty})"` : '';
      svgContent += `  <path d="${fp.d}" fill="${fp.fill}"${fpTransform}/>\n`;
    }
    svgContent += `</g>\n`;

    // Stroke layer (on top)
    svgContent += `<!-- ${asset.label} stroke -->\n`;
    svgContent += `<path id="stroke_${asset.label}" d="${v.stroke_path_d}" fill="none" stroke="${asset.dominant_color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="${transform}" opacity="0"/>\n`;

    strokeElements.push({ id: `stroke_${asset.label}`, duration: 1.5, label: asset.label, hasFills: true, fillsId: `fills_${asset.label}` });

  } else if (v.type === 'fill_only') {
    // Character or badge — fade in
    const scaleAsset = canvasCrop.w / v.source_w;
    const transform = `translate(${canvasCrop.x.toFixed(1)},${canvasCrop.y.toFixed(1)}) scale(${scaleAsset.toFixed(4)})`;

    svgContent += `<!-- ${asset.label} -->\n`;
    svgContent += `<g id="asset_${asset.label}" transform="${transform}" opacity="0">\n`;
    for (const fp of v.fill_paths) {
      const fpTransform = (fp.tx || fp.ty) ? ` transform="translate(${fp.tx},${fp.ty})"` : '';
      svgContent += `  <path d="${fp.d}" fill="${fp.fill}"${fpTransform}/>\n`;
    }
    svgContent += `</g>\n`;

    fadeElements.push({ id: `asset_${asset.label}`, duration: asset.type === 'number_badge' ? 0.4 : 1.2, label: asset.label });
  }
}

// ── Build GSAP timeline code ──
let timelineCode = '';
let t = 0;

for (const sectionName of sectionOrder) {
  const assets = sections[sectionName];
  if (!assets) continue;

  timelineCode += `\n  // ═══ ${sectionName} (${t.toFixed(1)}s) ═══\n`;

  for (const asset of assets) {
    const v = asset.vectorized;
    if (!v) continue;

    if (v.type === 'text') {
      // Title banner background fade + text wipe
      if (asset.type === 'title_banner') {
        timelineCode += `  tl.add(fadeIn('#bg_${asset.label}', 0.6), ${t.toFixed(1)});\n`;
        t += 0.4;
      }
      const wipe = wipeElements.find(w => w.label === asset.label);
      if (wipe) {
        timelineCode += `  tl.add(wipeReveal('${wipe.id}', ${wipe.targetWidth.toFixed(0)}, ${asset.type === 'title_banner' ? 1.5 : 0.8}), ${t.toFixed(1)});\n`;
        t += asset.type === 'title_banner' ? 1.2 : 0.6;
      }

    } else if (v.type === 'stroke') {
      const stroke = strokeElements.find(s => s.label === asset.label);
      if (stroke) {
        timelineCode += `  gsap.set('#${stroke.id}', { opacity: 1 });\n`;
        timelineCode += `  tl.add(drawOn('${stroke.id}', ${stroke.duration}), ${t.toFixed(1)});\n`;
        t += stroke.duration * 0.7;
      }

    } else if (v.type === 'stroke_and_fill') {
      const stroke = strokeElements.find(s => s.label === asset.label);
      if (stroke) {
        timelineCode += `  gsap.set('#${stroke.id}', { opacity: 1 });\n`;
        timelineCode += `  tl.add(drawOn('${stroke.id}', ${stroke.duration}), ${t.toFixed(1)});\n`;
        t += stroke.duration * 0.6;
        timelineCode += `  tl.add(fadeIn('#${stroke.fillsId}', 0.8), ${t.toFixed(1)});\n`;
        t += 0.6;
      }

    } else if (v.type === 'fill_only') {
      const fade = fadeElements.find(f => f.label === asset.label);
      if (fade) {
        timelineCode += `  tl.add(fadeIn('#${fade.id}', ${fade.duration}), ${t.toFixed(1)});\n`;
        t += fade.duration * 0.6;
      }
    }
  }

  // Gap between sections
  if (sectionName !== 'connector') t += 0.5;
}

// Hold final frame
t += 1.5;
const totalDuration = Math.ceil(t);

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Assemble HTML ──
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
  width: 100vw; max-width: 1408px;
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
<svg id="board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".04" y2="1">
    <stop offset="0%" stop-color="#f5f3ef"/>
    <stop offset="100%" stop-color="#edeae4"/>
  </linearGradient>
${defs}
</defs>

<!-- Background -->
<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>

${svgContent}

<!-- Progress bar -->
<rect x="0" y="${CANVAS_H - 4}" width="${CANVAS_W}" height="4" fill="#ddd8d0"/>
<rect id="progBar" x="0" y="${CANVAS_H - 4}" width="0" height="4" fill="#2b7ec2"/>
</svg>
</div>

<div id="controls">
  <button id="btnPlay">&#9654; Play</button>
  <button id="btnReplay">&#8635; Replay</button>
  <input type="range" id="seekBar" min="0" max="${totalDuration * 1000}" value="0" step="100"/>
  <span id="timeDisp">0.0 / ${totalDuration}.0s</span>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/DrawSVGPlugin.min.js" onerror="console.log('DrawSVGPlugin not available, using fallback')"><\/script>
<script>
try { if (typeof DrawSVGPlugin !== 'undefined') gsap.registerPlugin(DrawSVGPlugin); } catch(e) {}

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL = ${totalDuration};
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const btnPlay = document.getElementById('btnPlay');
  let isSeeking = false;

  // ── Utility Functions ──
  function drawOn(id, dur, ease) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return gsap.to({}, { duration: 0.01 });
    if (typeof DrawSVGPlugin !== 'undefined') {
      gsap.set(el, { drawSVG: '0%' });
      return gsap.to(el, { drawSVG: '100%', duration: dur, ease: ease || 'power1.inOut' });
    }
    const len = el.getTotalLength ? el.getTotalLength() : 500;
    gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    return gsap.to(el, { strokeDashoffset: 0, duration: dur, ease: ease || 'power1.inOut' });
  }

  function wipeReveal(crId, targetWidth, dur, ease) {
    return gsap.to('#' + crId, {
      attr: { width: targetWidth },
      duration: dur,
      ease: ease || 'power1.inOut'
    });
  }

  function fadeIn(sel, dur) {
    return gsap.to(sel, { opacity: 1, duration: dur || 0.5, ease: 'power2.out' });
  }

  // ── Initialize stroke paths (hide via dashoffset) ──
  document.querySelectorAll('[id^="stroke_"]').forEach(el => {
    if (el.getTotalLength) {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    }
  });

  // ── Master Timeline ──
  const tl = gsap.timeline({
    paused: true,
    onUpdate() {
      const t = tl.time();
      if (!isSeeking) seekBar.value = Math.round(t * 1000);
      timeDisp.textContent = t.toFixed(1) + ' / ' + TOTAL + 's';
      gsap.set('#progBar', { attr: { width: (t / TOTAL) * ${CANVAS_W} } });
    }
  });

${timelineCode}

  // Hold final frame
  tl.to({}, { duration: 1.5 }, ${(totalDuration - 1.5).toFixed(1)});

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
    // Reset all clip rects
    document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
    // Reset all stroke elements
    document.querySelectorAll('[id^="stroke_"]').forEach(el => {
      if (el.getTotalLength) {
        const len = el.getTotalLength();
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
    });
    // Reset all fill/fade elements
    document.querySelectorAll('[id^="fills_"], [id^="asset_"], [id^="bg_"]').forEach(el => {
      gsap.set(el, { opacity: 0 });
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

const outputPath = path.join(rootDir, 'output', 'anger-management-v3-whiteboard.html');
fs.writeFileSync(outputPath, html);
console.log(`\nOutput: ${outputPath}`);
console.log(`Size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
console.log(`Duration: ${totalDuration}s`);
console.log(`Assets: ${manifest.length} (${strokeElements.length} stroke, ${fadeElements.length} fade, ${wipeElements.length} wipe)`);
