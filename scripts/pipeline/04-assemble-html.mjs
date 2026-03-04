/**
 * Step 4: Assemble the final self-contained HTML whiteboard video.
 * Scene-based: each concept gets the full 1280x720 canvas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

const slug = process.argv[2]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'anger-management-for-corporate-leaders';
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);
const planPath = path.join(outputDir, 'scene-plan.json');

if (!fs.existsSync(planPath)) { console.error(`No scene plan: ${planPath}`); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

const W = 1280, H = 720;
const TOTAL = plan.total_duration;

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function stripStars(s) { return s.replace(/\*/g, ''); }

// ── Build defs (clip paths) ──
let defs = '';
for (const scene of plan.scenes) {
  const c = scene.computed;
  // Title clip
  defs += `  <clipPath id="${c.title.clipId}"><rect id="${c.title.clipRectId}" x="${c.title.clipX.toFixed(0)}" y="${c.title.clipY.toFixed(0)}" width="0" height="${c.title.clipHeight.toFixed(0)}"/></clipPath>\n`;
  // Body line clips
  for (const bl of c.bodyLines) {
    defs += `  <clipPath id="${bl.clipId}"><rect id="${bl.clipRectId}" x="${bl.clipX.toFixed(0)}" y="${bl.clipY.toFixed(0)}" width="0" height="${bl.clipHeight.toFixed(0)}"/></clipPath>\n`;
  }
  // Label clips
  for (const lb of c.labels) {
    defs += `  <clipPath id="${lb.clipId}"><rect id="${lb.clipRectId}" x="${lb.clipX.toFixed(0)}" y="${lb.clipY.toFixed(0)}" width="0" height="${lb.clipHeight.toFixed(0)}"/></clipPath>\n`;
  }
}

// ── Build scene SVG groups ──
let sceneSvg = '';
for (const scene of plan.scenes) {
  const c = scene.computed;
  const sceneId = c.sceneId;

  sceneSvg += `\n<!-- ═══ Scene ${scene.scene_number}: ${esc(scene.title)} ═══ -->\n`;
  sceneSvg += `<g id="${sceneId}" class="scene">\n`;

  // Title with clip wipe
  const titleAnchor = c.title.anchor || 'start';
  sceneSvg += `  <g clip-path="url(#${c.title.clipId})">\n`;
  sceneSvg += `    <text x="${c.title.x}" y="${c.title.y}" font-family="${c.title.font}" font-size="${c.title.fontSize}" font-weight="${c.title.fontWeight}" fill="${c.title.fill}" text-anchor="${titleAnchor}">${esc(stripStars(scene.title))}</text>\n`;
  sceneSvg += `  </g>\n`;

  // Title underline (stroke draw-on)
  const ulY = c.title.y + 8;
  const ulX1 = titleAnchor === 'middle' ? c.title.x - c.title.clipWidth / 2 : c.title.x;
  const ulX2 = ulX1 + c.title.clipWidth - 30;
  sceneSvg += `  <line id="${sceneId}_underline" x1="${ulX1}" y1="${ulY}" x2="${ulX2}" y2="${ulY}" stroke="${c.title.fill}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>\n`;

  // Body text lines with clip wipe
  for (const bl of c.bodyLines) {
    sceneSvg += `  <g clip-path="url(#${bl.clipId})">\n`;
    // Render segments (key terms in red, rest in dark gray)
    let xCursor = bl.x;
    if (bl.anchor === 'middle') {
      // For centered text, use a single tspan approach
      sceneSvg += `    <text x="${bl.x}" y="${bl.y}" font-family="${bl.font}" font-size="${bl.fontSize}" text-anchor="middle">`;
      for (const seg of bl.segments) {
        const weight = seg.bold ? ' font-weight="700"' : '';
        sceneSvg += `<tspan fill="${seg.fill}"${weight}>${esc(seg.text)}</tspan>`;
      }
      sceneSvg += `</text>\n`;
    } else {
      sceneSvg += `    <text x="${bl.x}" y="${bl.y}" font-family="${bl.font}" font-size="${bl.fontSize}">`;
      for (const seg of bl.segments) {
        const weight = seg.bold ? ' font-weight="700"' : '';
        sceneSvg += `<tspan fill="${seg.fill}"${weight}>${esc(seg.text)}</tspan>`;
      }
      sceneSvg += `</text>\n`;
    }
    sceneSvg += `  </g>\n`;
  }

  // Illustration — multi-element (V5) or single-path fallback (V4)
  if (c.elements?.length > 0 && c.illustrationTransform) {
    const tx = c.illustrationTransform;
    const transform = `translate(${tx.offsetX.toFixed(1)},${tx.offsetY.toFixed(1)}) scale(${tx.scale.toFixed(4)})`;
    sceneSvg += `  <!-- ${c.elements.length} illustration elements -->\n`;
    for (let i = 0; i < c.elements.length; i++) {
      const el = c.elements[i];
      const elId = `${sceneId}_el${i}`;
      sceneSvg += `  <g id="${elId}" class="illust-el" transform="${transform}" opacity="0">\n`;
      // Inject Gemini-generated SVG code with default stroke attrs
      let svgCode = el.svg_code;
      sceneSvg += `    ${svgCode}\n`;
      sceneSvg += `  </g>\n`;
    }
  } else if (scene.asset?.type === 'custom_sketch' && scene.asset.stroke_path_d) {
    const illust = c.illustration;
    const srcW = scene.asset.source_w;
    const srcH = scene.asset.source_h;
    const scale = Math.min(illust.w / srcW, illust.h / srcH) * 0.85;
    const tx = illust.x + (illust.w - srcW * scale) / 2;
    const ty = illust.y + (illust.h - srcH * scale) / 2;
    sceneSvg += `  <path id="${sceneId}_illust" d="${scene.asset.stroke_path_d}" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})" opacity="0"/>\n`;
  }

  // Labels with clip wipe
  for (const lb of c.labels) {
    sceneSvg += `  <g clip-path="url(#${lb.clipId})">\n`;
    sceneSvg += `    <text x="${lb.x}" y="${lb.y}" font-family="${lb.font}" font-size="${lb.fontSize}" fill="${lb.fill}" text-anchor="${lb.anchor}">${esc(lb.text)}</text>\n`;
    sceneSvg += `  </g>\n`;
  }

  sceneSvg += `</g>\n`;
}

// ── Build GSAP timeline code ──
let tlCode = '';
for (const scene of plan.scenes) {
  const c = scene.computed;
  const sceneId = c.sceneId;
  const t0 = scene.time_start;
  const prevId = scene.scene_number > 1 ? `scene${scene.scene_number - 1}` : null;

  tlCode += `\n  // ═══ Scene ${scene.scene_number}: ${scene.title} (${t0}s) ═══\n`;

  // Scene transition
  if (prevId) {
    tlCode += `  tl.set('#${prevId}', { opacity: 0 }, ${t0.toFixed(1)});\n`;
  }
  tlCode += `  tl.set('#${sceneId}', { opacity: 1 }, ${t0.toFixed(1)});\n`;

  let t = t0 + 0.3;

  // Title wipe
  tlCode += `  tl.add(wipe('${c.title.clipRectId}', ${c.title.clipWidth.toFixed(0)}, 1.3), ${t.toFixed(1)});\n`;
  t += 1.5;

  // Underline draw-on
  tlCode += `  tl.add(drawOn('${sceneId}_underline', 0.4), ${t.toFixed(1)});\n`;
  t += 0.5;

  // Body text wipes
  for (const bl of c.bodyLines) {
    tlCode += `  tl.add(wipe('${bl.clipRectId}', ${bl.clipWidth.toFixed(0)}, 0.8), ${t.toFixed(1)});\n`;
    t += 0.7;
  }

  // Illustration draw-on — multi-element (V5) or single-path (V4)
  if (c.elements?.length > 0) {
    const categoryWeights = { main_subject: 3, secondary_subject: 2, detail: 1, annotation: 1, connector: 0.5 };
    const totalIllustTime = Math.min(6.0, (scene.time_end - t0) * 0.45);
    const totalWeight = c.elements.reduce((sum, el) => sum + (categoryWeights[el.category] || 1), 0);

    for (let i = 0; i < c.elements.length; i++) {
      const el = c.elements[i];
      const elId = `${sceneId}_el${i}`;
      const dur = Math.max(0.3, ((categoryWeights[el.category] || 1) / totalWeight) * totalIllustTime);

      tlCode += `  // Element ${i}: ${el.description}\n`;
      tlCode += `  gsap.set('#${elId}', { opacity: 1 });\n`;
      tlCode += `  tl.add(drawOnGroup('${elId}', ${dur.toFixed(1)}), ${t.toFixed(1)});\n`;
      t += dur * 0.65; // overlap elements by 35% for flow
    }
  } else if (scene.asset?.type === 'custom_sketch') {
    const drawDur = Math.min(4.0, (scene.time_end - t0) * 0.4);
    tlCode += `  gsap.set('#${sceneId}_illust', { opacity: 1 });\n`;
    tlCode += `  tl.add(drawOn('${sceneId}_illust', ${drawDur.toFixed(1)}), ${t.toFixed(1)});\n`;
    t += drawDur * 0.8;
  }

  // Label wipes
  for (const lb of c.labels) {
    tlCode += `  tl.add(wipe('${lb.clipRectId}', ${lb.clipWidth.toFixed(0)}, 0.5), ${t.toFixed(1)});\n`;
    t += 0.4;
  }
}

// ── Assemble HTML ──
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(plan.topic)} — Whiteboard Explainer</title>
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
<svg id="board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".04" y2="1">
    <stop offset="0%" stop-color="#f5f3ef"/>
    <stop offset="100%" stop-color="#edeae4"/>
  </linearGradient>
${defs}
</defs>

<!-- Background -->
<rect width="${W}" height="${H}" fill="url(#bg)"/>

${sceneSvg}

<!-- Progress bar -->
<rect x="0" y="${H - 4}" width="${W}" height="4" fill="#ddd8d0"/>
<rect id="progBar" x="0" y="${H - 4}" width="0" height="4" fill="#2b7ec2"/>
</svg>
</div>

<div id="controls">
  <button id="btnPlay">&#9654; Play</button>
  <button id="btnReplay">&#8635; Replay</button>
  <input type="range" id="seekBar" min="0" max="${TOTAL * 1000}" value="0" step="100"/>
  <span id="timeDisp">0.0 / ${TOTAL}.0s</span>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></` + `script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/DrawSVGPlugin.min.js" onerror="console.log('DrawSVGPlugin not available, using fallback')"></` + `script>
<script>
try { if (typeof DrawSVGPlugin !== 'undefined') gsap.registerPlugin(DrawSVGPlugin); } catch(e) {}

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL = ${TOTAL};
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const btnPlay = document.getElementById('btnPlay');
  let isSeeking = false;

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

  function wipe(crId, targetWidth, dur, ease) {
    return gsap.to('#' + crId, {
      attr: { width: targetWidth },
      duration: dur,
      ease: ease || 'power1.inOut'
    });
  }

  function fadeIn(sel, dur) {
    return gsap.to(sel, { opacity: 1, duration: dur || 0.5, ease: 'power2.out' });
  }

  function drawOnGroup(groupId, dur) {
    const group = document.getElementById(groupId);
    if (!group) return gsap.to({}, { duration: 0.01 });
    const children = group.querySelectorAll('path, line, circle, ellipse, polyline, rect');
    if (children.length === 0) return fadeIn('#' + groupId, dur);
    const perChild = dur / children.length;
    const mini = gsap.timeline();
    children.forEach((child, i) => {
      if (child.getTotalLength) {
        const len = child.getTotalLength();
        gsap.set(child, { strokeDasharray: len, strokeDashoffset: len });
        mini.to(child, { strokeDashoffset: 0, duration: Math.max(0.2, perChild), ease: 'power1.inOut' }, i * perChild * 0.7);
      } else {
        gsap.set(child, { opacity: 0 });
        mini.to(child, { opacity: 1, duration: Math.max(0.2, perChild), ease: 'power2.out' }, i * perChild * 0.7);
      }
    });
    return mini;
  }

  // Initialize stroke paths (underlines + old single-path illust)
  document.querySelectorAll('[id$="_illust"], [id$="_underline"]').forEach(el => {
    if (el.getTotalLength) {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    }
  });

  const tl = gsap.timeline({
    paused: true,
    onUpdate() {
      const t = tl.time();
      if (!isSeeking) seekBar.value = Math.round(t * 1000);
      timeDisp.textContent = t.toFixed(1) + ' / ' + TOTAL + 's';
      gsap.set('#progBar', { attr: { width: (t / TOTAL) * ${W} } });
    }
  });

${tlCode}

  // Hold final frame
  tl.to({}, { duration: 1.0 }, ${(TOTAL - 1).toFixed(1)});

  // Controls
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
    document.querySelectorAll('.scene').forEach(s => gsap.set(s, { opacity: 0 }));
    document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
    document.querySelectorAll('[id$="_illust"], [id$="_underline"]').forEach(el => {
      if (el.getTotalLength) {
        const len = el.getTotalLength();
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
    });
    // Reset multi-element illustrations
    document.querySelectorAll('.illust-el').forEach(g => {
      gsap.set(g, { opacity: 0 });
      g.querySelectorAll('path, line, circle, ellipse, polyline, rect').forEach(child => {
        if (child.getTotalLength) {
          const len = child.getTotalLength();
          gsap.set(child, { strokeDasharray: len, strokeDashoffset: len });
        }
        gsap.set(child, { opacity: 1 });
      });
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

  setTimeout(() => {
    tl.play();
    btnPlay.textContent = '\\u23F8 Pause';
  }, 800);
});
</` + `script>
</body>
</html>`;

const outputPath = path.join(outputDir, `${slug}-whiteboard.html`);
fs.writeFileSync(outputPath, html);
console.log(`\nOutput: ${outputPath}`);
console.log(`Size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
console.log(`Duration: ${TOTAL}s, Scenes: ${plan.scenes.length}`);
