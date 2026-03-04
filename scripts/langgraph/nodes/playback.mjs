/**
 * Node 5: Playback & Review Interface (Deterministic)
 * Assembles the final self-contained HTML file with enhanced playback controls.
 */
import fs from 'fs';
import path from 'path';

const W = 1280, H = 720;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function playbackNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 5: Playback Assembly');
  console.log('══════════════════════════════════════');

  const { blueprint, svgDefs, sceneSvg, timelineCode, roughJsCode, outputDir, slug } = state;
  const TOTAL = blueprint.total_duration;

  // Build scene data for scene jump buttons
  const sceneData = blueprint.scenes.map(s => ({
    id: `scene${s.scene_number}`,
    title: s.title,
    time: s.time_start,
    color: s.concept_color,
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(blueprint.topic)} — Whiteboard Explainer</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Caveat:wght@400;700&family=Patrick+Hand&family=Permanent+Marker&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: #111;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100vh; overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.wrap {
  width: 100vw; max-width: 1280px;
  aspect-ratio: 16/9; position: relative;
  border-radius: 6px; overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,.6);
}
#board { width: 100%; height: 100%; display: block; }
.scene { opacity: 0; }

/* Controls */
#controls {
  margin-top: 10px; display: flex; gap: 8px; align-items: center;
  flex-wrap: wrap; max-width: 1280px; width: 100%;
  padding: 0 4px;
}
#controls button {
  padding: 6px 14px; background: #2b7ec2; color: #fff;
  border: none; border-radius: 5px; font-size: 12px; cursor: pointer;
  transition: background 0.2s;
}
#controls button:hover { background: #1e5fa0; }
#controls button.active { background: #1e5fa0; outline: 2px solid #5ba8e6; }
#timeDisp { color: #888; font: 12px/1 monospace; min-width: 80px; }
#seekWrap {
  flex: 1; min-width: 200px; position: relative; height: 20px;
  display: flex; align-items: center;
}
#seekBar {
  width: 100%; cursor: pointer; accent-color: #2b7ec2;
  height: 6px; -webkit-appearance: none; appearance: none;
  background: #333; border-radius: 3px; outline: none;
}
#seekBar::-webkit-slider-thumb {
  -webkit-appearance: none; width: 14px; height: 14px;
  border-radius: 50%; background: #2b7ec2; cursor: pointer;
}
.scene-marker {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 8px; height: 8px; border-radius: 50%;
  pointer-events: none; opacity: 0.7;
}
#sceneInfo { color: #aaa; font-size: 12px; min-width: 120px; text-align: right; }

/* Speed controls */
.speed-group { display: flex; gap: 2px; }
.speed-group button { padding: 4px 8px; font-size: 11px; background: #444; }
.speed-group button.active { background: #2b7ec2; }

/* Scene jump bar */
#sceneJumps {
  margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;
  max-width: 1280px; width: 100%; padding: 0 4px;
}
.scene-jump {
  padding: 4px 10px; border-radius: 4px; font-size: 11px;
  cursor: pointer; border: 1px solid #444; color: #ccc;
  background: #222; transition: all 0.2s;
}
.scene-jump:hover { border-color: #666; color: #fff; }
.scene-jump.active { color: #fff; }

/* Keyboard hint */
#kbHint {
  color: #555; font-size: 10px; margin-top: 4px;
  max-width: 1280px; text-align: center;
}
</style>
</head>
<body>
<div class="wrap" id="playerWrap">
<svg id="board" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".04" y2="1">
    <stop offset="0%" stop-color="#f5f3ef"/>
    <stop offset="100%" stop-color="#edeae4"/>
  </linearGradient>
${svgDefs}
</defs>

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
  <div id="seekWrap">
    <input type="range" id="seekBar" min="0" max="${TOTAL * 1000}" value="0" step="100"/>
    ${sceneData.map(s => `<div class="scene-marker" style="left:${(s.time / TOTAL * 100).toFixed(1)}%;background:${s.color}"></div>`).join('\n    ')}
  </div>
  <span id="timeDisp">0.0 / ${TOTAL}s</span>
  <span id="sceneInfo">Scene 1</span>
  <div class="speed-group">
    <button data-speed="0.5">0.5x</button>
    <button data-speed="1" class="active">1x</button>
    <button data-speed="1.5">1.5x</button>
    <button data-speed="2">2x</button>
  </div>
  <button id="btnFullscreen">&#x26F6; Full</button>
</div>

<div id="sceneJumps">
  ${sceneData.map((s, i) => `<div class="scene-jump" data-time="${s.time}" data-scene="${i + 1}" style="border-color:${s.color}">${i + 1}. ${esc(s.title)}</div>`).join('\n  ')}
</div>

<div id="kbHint">Space: play/pause &nbsp; &#8592;&#8594;: seek &plusmn;2s &nbsp; R: replay &nbsp; 1-9: jump to scene &nbsp; F: fullscreen</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/DrawSVGPlugin.min.js" onerror="console.log('DrawSVGPlugin not available, using fallback')"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min.js"></${'script'}>
<script>
try { if (typeof DrawSVGPlugin !== 'undefined') gsap.registerPlugin(DrawSVGPlugin); } catch(e) {}

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL = ${TOTAL};
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const sceneInfo = document.getElementById('sceneInfo');
  const btnPlay = document.getElementById('btnPlay');
  let isSeeking = false;

  // Scene time boundaries
  const sceneTimes = ${JSON.stringify(sceneData.map(s => ({ time: s.time, title: s.title })))};

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

  // Initialize stroke paths
  document.querySelectorAll('[id$="_illust"], [id$="_underline"]').forEach(el => {
    if (el.getTotalLength) {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    }
  });

  // Rough.js setup
  const rc = typeof rough !== 'undefined' ? rough.svg(document.getElementById('board')) : null;
${roughJsCode}

  // Current scene tracker
  function getCurrentScene(time) {
    for (let i = sceneTimes.length - 1; i >= 0; i--) {
      if (time >= sceneTimes[i].time) return i;
    }
    return 0;
  }

  // Master timeline
  const tl = gsap.timeline({
    paused: true,
    onUpdate() {
      const t = tl.time();
      if (!isSeeking) seekBar.value = Math.round(t * 1000);
      timeDisp.textContent = t.toFixed(1) + ' / ' + TOTAL + 's';
      gsap.set('#progBar', { attr: { width: (t / TOTAL) * ${W} } });
      const si = getCurrentScene(t);
      sceneInfo.textContent = 'Scene ' + (si + 1) + ': ' + sceneTimes[si].title;
      // Highlight active scene jump
      document.querySelectorAll('.scene-jump').forEach((btn, i) => {
        btn.classList.toggle('active', i === si);
      });
    }
  });

${timelineCode}

  // Hold final frame
  tl.to({}, { duration: 1.0 }, ${(TOTAL - 1).toFixed(1)});

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

  function doReplay() {
    document.querySelectorAll('.scene').forEach(s => gsap.set(s, { opacity: 0 }));
    document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
    document.querySelectorAll('[id$="_illust"], [id$="_underline"]').forEach(el => {
      if (el.getTotalLength) {
        const len = el.getTotalLength();
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      }
    });
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
  }

  document.getElementById('btnReplay').addEventListener('click', doReplay);

  seekBar.addEventListener('input', () => {
    isSeeking = true;
    tl.seek(seekBar.value / 1000).pause();
    btnPlay.textContent = '\\u25B6 Play';
    setTimeout(() => { isSeeking = false; }, 100);
  });

  // Speed controls
  document.querySelectorAll('.speed-group button').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      tl.timeScale(speed);
      document.querySelectorAll('.speed-group button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Scene jump buttons
  document.querySelectorAll('.scene-jump').forEach(btn => {
    btn.addEventListener('click', () => {
      const time = parseFloat(btn.dataset.time);
      tl.seek(time).pause();
      btnPlay.textContent = '\\u25B6 Play';
    });
  });

  // Fullscreen
  document.getElementById('btnFullscreen').addEventListener('click', () => {
    const wrap = document.getElementById('playerWrap');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrap.requestFullscreen().catch(() => {});
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        btnPlay.click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        tl.seek(Math.max(0, tl.time() - 2)).pause();
        btnPlay.textContent = '\\u25B6 Play';
        break;
      case 'ArrowRight':
        e.preventDefault();
        tl.seek(Math.min(TOTAL, tl.time() + 2)).pause();
        btnPlay.textContent = '\\u25B6 Play';
        break;
      case 'r':
      case 'R':
        doReplay();
        break;
      case 'f':
      case 'F':
        document.getElementById('btnFullscreen').click();
        break;
      default:
        // Number keys 1-9 for scene jumps
        const num = parseInt(e.key);
        if (num >= 1 && num <= sceneTimes.length) {
          tl.seek(sceneTimes[num - 1].time).pause();
          btnPlay.textContent = '\\u25B6 Play';
        }
    }
  });

  // Auto-play after fonts load
  setTimeout(() => {
    tl.play();
    btnPlay.textContent = '\\u23F8 Pause';
  }, 800);
});
</${'script'}>
</body>
</html>`;

  // Write to disk
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${slug}-whiteboard.html`);
  fs.writeFileSync(outputPath, html);

  const size = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`\n  Output: ${outputPath}`);
  console.log(`  Size: ${size} KB`);
  console.log(`  Duration: ${TOTAL}s, Scenes: ${blueprint.scenes.length}`);

  return {
    finalHtml: html,
    outputPath,
    currentStep: 'playback_complete',
  };
}
