# Technical Workflow: Creating a Whiteboard Explainer Video

End-to-end technical guide covering how a topic goes from idea to finished animated HTML file, then to MP4.

---

## Phase 1: Topic Research & Content Planning

### 1.1 Input Gathering
The user provides: topic, target audience, approximate duration, depth level.

### 1.2 Research with Subagents
For complex/technical topics, multiple research agents run **in parallel**:
- **Content agent**: Gathers the pedagogical structure (e.g., Raschka's bottom-up LLM framework). Determines what concepts to cover, in what order, at what depth.
- **Visual asset agent**: Identifies what SVG icons, diagrams, and graphs are needed. Searches Icons8 MCP, SVGRepo, unDraw for reusable assets.
- **Reference agent**: Checks formulas, numbers, and statistics for accuracy (parameter counts, vocabulary sizes, etc.).

### 1.3 Scene Breakdown
Content is divided into **scenes** (typically 3-15). Each scene covers **one concept** and gets:
- A time allocation (5-20 seconds)
- A concept color from the palette
- A layout pattern (text+illustration, labeled diagram, flow, comparison, etc.)
- A list of visual elements (text, formulas, icons, graphs, Rough.js shapes)

### 1.4 Plan Document
All of this is written into a plan file (`.claude/plans/`) for user approval before any code is written. The plan includes:
- Scene table with time ranges and content
- Color coding assignments
- SVG assets to embed
- Critical positioning rules
- Implementation stages

---

## Phase 2: SVG Structure (The HTML Scaffold)

### 2.1 File Structure
A single HTML file with this structure:

```
<!DOCTYPE html>
<html>
<head>
  <style>  CSS (fonts, layout, controls)  </style>
</head>
<body>
  <div class="wrap">
    <svg id="board" viewBox="0 0 1280 720">
      <defs>
        ├── Background gradient
        ├── SVG icon assets (<g> definitions)
        ├── Arrow markers (<marker> definitions)
        └── Clip paths for EVERY text element
      </defs>

      <rect fill="url(#bg)"/>          ← background

      <g id="scene1" class="scene">    ← scene groups (opacity: 0)
        ├── Text elements (with clip-path)
        ├── Illustration groups (opacity="0")
        ├── Lines, arrows, paths
        └── (Rough.js shapes appended by JS)
      </g>
      <g id="scene2" class="scene">...</g>
      ...
      <rect id="progBar"/>             ← progress bar
    </svg>
  </div>

  <div id="controls">                 ← Play, Replay, Seek, Time
  </div>

  <script> CDN: gsap, DrawSVGPlugin, rough.js </script>
  <script> All animation logic </script>
</body>
</html>
```

### 2.2 SVG Canvas
- ViewBox: `0 0 1280 720` (16:9, 720p equivalent)
- Background: cream gradient (`#f5f3ef` → `#edeae4`)
- All coordinates are absolute within this 1280×720 space

### 2.3 Reusable Icon Assets in `<defs>`
SVG icons are defined once inside `<defs>` as `<g>` groups:

```svg
<defs>
  <g id="icon_brain" fill="none" stroke="#2b7ec2" stroke-width="2">
    <path d="..."/>
  </g>
</defs>
```

Referenced anywhere via `<use href="#icon_brain"/>` with transform for positioning/scaling:

```svg
<g transform="translate(590, 460) scale(1.5)">
  <use href="#icon_brain"/>
</g>
```

### 2.4 Arrow Markers
SVG `<marker>` elements defined per color (arrowGreen, arrowRed, etc.) and used via `marker-end="url(#arrowGreen)"` on paths/lines.

---

## Phase 3: Clip Paths (Text Reveal System)

This is the **most critical** part of the build. Every text element needs a clip path for the left-to-right wipe reveal animation.

### 3.1 How Clip-Path Text Wipe Works

```
Before animation:                  After animation:
┌─────┐                           ┌────────────────────┐
│     │ ← clip rect width=0       │ Hello World        │ ← clip rect width=200
└─────┘                           └────────────────────┘
  Text is hidden behind            Text is fully revealed
  zero-width clip rect             as rect width grows
```

For each text element, you define:
1. A `<clipPath>` in `<defs>` containing a `<rect>`
2. The text `<g>` gets `clip-path="url(#cp_name)"`
3. GSAP animates the rect's `width` attribute from 0 to target width

### 3.2 Positioning Rules (Critical)

**Left-aligned text** (`text-anchor="start"` or default):
```
clip rect x = text x coordinate
clip rect y = text y - font_size        (y is baseline, clip starts above)
clip rect height = font_size × 1.4      (room for descenders)
clip rect target width = estimated text pixel width
```

**Centered text** (`text-anchor="middle"`):
```
clip rect x = text_x - (estimated_text_width / 2)    ← OFFSET REQUIRED
clip rect y = text y - font_size
clip rect height = font_size × 1.4
clip rect target width = estimated text pixel width
```

If you skip the offset for centered text, the left half of the text is permanently clipped.

### 3.3 Text Width Estimation
```
width ≈ character_count × font_size × 0.55
```
This varies by font — Cabin Sketch is wider (~0.6), Caveat is narrower (~0.5). Always add 10-20px buffer.

### 3.4 ID Naming Convention
```
<clipPath id="cp_s1_title">              ← clipPath wrapper
  <rect id="cr_s1_title" .../>           ← animatable rect
</clipPath>
```
Pattern: `cp_{scene}_{element}` and `cr_{scene}_{element}`

### 3.5 Example

```svg
<!-- In <defs> -->
<clipPath id="cp_s1_title">
  <rect id="cr_s1_title" x="290" y="220" width="0" height="80"/>
</clipPath>

<!-- In scene group -->
<g clip-path="url(#cp_s1_title)">
  <text x="640" y="280" text-anchor="middle" font-size="56">
    Large Language Models
  </text>
</g>
```

Here, text is centered at x=640. "Large Language Models" is ~23 chars × 56 × 0.55 ≈ 700px.
So clip rect x = 640 - 700/2 = 290. Target width = 700.

---

## Phase 4: Scene Content (SVG Markup)

### 4.1 Scene Group Structure
Each scene is a `<g>` with class `scene` (starts `opacity: 0`):

```svg
<g id="scene3" class="scene">
  <!-- Title (always first) -->
  <g clip-path="url(#cp_s3_title)">
    <text ...>Scene Title</text>
  </g>

  <!-- Illustrations (opacity="0", revealed by timeline) -->
  <g id="s3_diagram" opacity="0">
    <rect .../> <path .../> <text .../>
  </g>

  <!-- Stroke elements (lines, arrows) -->
  <line id="s3_underline" x1="..." y1="..." x2="..." y2="..." .../>
  <path id="s3_arrow" d="..." .../>
</g>
```

### 4.2 Visual Element Types

| Element | SVG Tag | Animation Type |
|---------|---------|---------------|
| Titles, body text, labels, formulas | `<text>` in `<g clip-path>` | Clip-rect wipe |
| Lines, underlines, arrows | `<line>`, `<path>` | Stroke draw-on |
| Simple boxes, frames | Rough.js `rc.rectangle()` | Fade-in |
| Complex diagrams, icon groups | `<g opacity="0">` | Fade-in |
| Bar charts, data viz | `<rect>` | `gsap.fromTo()` width |

### 4.3 Formulas & Math
SVG `<text>` with `<tspan>` for subscripts/superscripts:

```svg
<text font-family="'Permanent Marker'" font-size="32" fill="#cc3333">
  P(w<tspan font-size="22" dy="6">t</tspan>
  <tspan dy="-6"> | w</tspan>
  <tspan font-size="22" dy="6">1</tspan>
  <tspan dy="-6">, ..., w</tspan>
  <tspan font-size="22" dy="6">t-1</tspan>
  <tspan dy="-6">)</tspan>
</text>
```

Key: Use `dy` offsets for sub/superscript positioning. Always reset `dy` after.

### 4.4 Graphs & Charts
Built from SVG primitives:

**Axes**: `<line>` elements, drawn on with stroke animation
**Data points**: `<circle>` elements in a group, faded in
**Curves**: `<path>` with hand-drawn coordinates, drawn on with stroke animation
**Bars**: `<rect>` elements, animated width with `gsap.fromTo()`
**Labels**: `<text>` with clip-path wipe

---

## Phase 5: Rough.js Shapes (Hand-Drawn Aesthetic)

### 5.1 Why Rough.js
Clean SVG `<rect>` and `<circle>` look too perfect for a whiteboard style. Rough.js generates shapes with natural imperfections — wobbly lines, uneven corners, visible stroke variation.

### 5.2 Generation Pattern (JavaScript)
Shapes are generated at runtime, not in SVG markup:

```javascript
const rc = rough.svg(document.getElementById('board'));

const box = rc.rectangle(x, y, width, height, {
  roughness: 1.5,      // 0 = clean, 3 = very rough
  stroke: '#2b7ec2',
  strokeWidth: 2,
  fill: 'rgba(43,126,194,0.05)',
  fillStyle: 'hachure',  // or 'cross-hatch', 'solid'
  hachureGap: 10,
  bowing: 2             // line curve amount
});
```

### 5.3 Attaching to Scene Groups

```javascript
function addRoughShape(shape, id, parentId) {
  shape.setAttribute('opacity', '0');    // start hidden
  shape.id = id;
  document.getElementById(parentId).appendChild(shape);
  return shape;
}

addRoughShape(box, 'rough_s1_frame', 'scene1');
```

### 5.4 Critical Rule: No Double Borders
Never place a Rough.js shape on top of an SVG `<rect>`. Use one OR the other:
- Rough.js for decorative frames, boxes, emphasis
- SVG `<rect>` for data bars, matrix cells, functional rectangles

---

## Phase 6: GSAP Animation Timeline

### 6.1 Master Timeline
A single paused timeline controls the entire video:

```javascript
const tl = gsap.timeline({
  paused: true,
  onUpdate() {
    const t = tl.time();
    if (!isSeeking) seekBar.value = Math.round(t * 1000);
    timeDisp.textContent = t.toFixed(1) + ' / ' + TOTAL + 's';
    gsap.set('#progBar', { attr: { width: (t / TOTAL) * 1280 } });
  }
});
```

### 6.2 Absolute Timestamps
All animations use absolute timestamps (seconds from start):

```javascript
// SCENE 1 (0-10s)
tl.call(() => showScene('#scene1'), null, 0);
tl.add(wipe('cr_s1_title', 700, 1.5), 1.0);     // at 1.0s
tl.add(drawOn('s1_underline', 0.8), 4.2);         // at 4.2s
tl.add(fadeIn('#s1_brain', 1.0), 6.5);             // at 6.5s

// SCENE 2 (10-30s)
tl.call(() => { hideScene('#scene1'); showScene('#scene2'); }, null, 10);
tl.add(wipe('cr_s2_title', 620, 1.3), 10.3);      // at 10.3s
```

Why absolute, not relative: seek bar correctness — scrubbing to 15.0s must show exactly what's visible at 15 seconds, regardless of animation order.

### 6.3 Animation Utility Functions

```javascript
// Stroke draw-on (with DrawSVGPlugin fallback)
function drawOn(el, dur, ease) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return gsap.to({}, { duration: 0.01 });
  if (typeof DrawSVGPlugin !== 'undefined') {
    return gsap.fromTo(el,
      { drawSVG: '0%' },
      { drawSVG: '100%', duration: dur, ease: ease || 'power1.inOut' }
    );
  }
  // Fallback: strokeDasharray
  const len = el.getTotalLength ? el.getTotalLength() : 500;
  return gsap.fromTo(el,
    { strokeDasharray: len, strokeDashoffset: len },
    { strokeDashoffset: 0, duration: dur, ease: ease || 'power1.inOut' }
  );
}

// Clip-rect text wipe (left to right)
function wipe(clipRectId, targetWidth, dur, ease) {
  return gsap.to('#' + clipRectId, {
    attr: { width: targetWidth },
    duration: dur,
    ease: ease || 'power1.inOut'
  });
}

// Fade-in for illustration groups
function fadeIn(sel, dur) {
  return gsap.to(sel, { opacity: 1, duration: dur || 0.5, ease: 'power2.out' });
}
```

### 6.4 fromTo vs set+to
**Always use `gsap.fromTo()`** for elements that animate from a non-default state (bars growing, strokes drawing). This bakes the start state into the timeline so the seek bar can scrub backwards correctly.

`gsap.set()` + `gsap.to()` breaks seeking because `set()` fires instantly and isn't reversible by the timeline.

### 6.5 Scene Transitions
```javascript
function showScene(sel) { gsap.set(sel, { opacity: 1 }); }
function hideScene(sel) { gsap.set(sel, { opacity: 0 }); }

// In timeline:
tl.call(() => { hideScene('#scene1'); showScene('#scene2'); }, null, 10.0);
```

### 6.6 Timing Pattern for a Typical Scene

```
0.0s  showScene()
0.3s  Title wipe (1.3s duration)
1.8s  Subtitle/formula wipe (0.8-1.0s)
3.0s  Illustration group fade-in (1.5s)
4.5s  Label wipes (0.4-0.6s each, staggered 0.3s apart)
6.0s  Supporting text wipe (0.8s)
7.0s  Detail arrows/lines draw on (0.5s)
8.0s  Key insight text wipe (1.0s)
---
10.0s hideScene(), showScene() for next
```

---

## Phase 7: Controls & Playback

### 7.1 Play/Pause Toggle
```javascript
btnPlay.addEventListener('click', () => {
  if (tl.isActive()) {
    tl.pause();
    btnPlay.textContent = '▶ Play';
  } else {
    tl.play();
    btnPlay.textContent = '⏸ Pause';
  }
});
```

### 7.2 Seek Bar
```javascript
seekBar.addEventListener('input', () => {
  isSeeking = true;
  tl.seek(seekBar.value / 1000).pause();
  btnPlay.textContent = '▶ Play';
  setTimeout(() => { isSeeking = false; }, 100);
});
```

### 7.3 Replay (Full State Reset)
The replay handler must reset **all** animation side-effects:

```javascript
document.getElementById('btnReplay').addEventListener('click', () => {
  tl.seek(0).pause();
  // Reset all scene visibility
  document.querySelectorAll('.scene').forEach(s => gsap.set(s, { opacity: 0 }));
  // Reset all clip rects to width 0
  document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
  // Reset any fromTo-animated elements (bars, etc.)
  ['#bar1', '#bar2'].forEach(s => gsap.set(s, { attr: { width: 0 } }));
  // Reset progress bar
  gsap.set('#progBar', { attr: { width: 0 } });
  tl.restart();
  btnPlay.textContent = '⏸ Pause';
});
```

### 7.4 Auto-Play with Font Loading
```javascript
document.fonts.ready.then(() => {
  setTimeout(() => {
    tl.play();
    btnPlay.textContent = '⏸ Pause';
  }, 400);    // 400ms buffer after fonts load
});
```

---

## Phase 8: Staged Implementation

For complex videos (10+ scenes), the build is split into stages, each handled by a subagent:

| Stage | What | Why Separate |
|-------|------|-------------|
| 1. Scaffold | HTML structure, ALL `<defs>` clip paths, scene `<g>` groups, JS utilities, SVG icon definitions | Clip path positions must be calculated for every text element up front |
| 2-6. Scene batches | 2-3 scenes per stage — SVG content + timeline animations | Keeps each subagent focused, prevents context overflow |
| 7. Polish | Fix clip-path misalignments, test seek/replay, fix any missing animations | Catch-all for integration bugs |

Each subagent receives:
- The current file content
- The specific scenes to implement
- The clip-path positioning rules
- The SVG asset path data to embed

---

## Phase 9: MP4 Export

### 9.1 Capture Script
Uses Playwright to record the browser viewport while the animation plays:

```bash
node scripts/capture-video.mjs output/video.html 300
```

How it works:
1. Launches headless Chromium via `@playwright/test`
2. Opens the HTML file with `recordVideo` context option (1280×720)
3. Waits for fonts to load
4. Clicks Play if needed
5. Waits for full duration + buffer
6. Closes context → Playwright saves `.webm`
7. Converts webm → mp4 via ffmpeg (`libx264`, CRF 20, yuv420p)
8. Cleans up temp files

### 9.2 Why Not timecut?
`timecut` (the tool referenced in older docs) bundles Puppeteer 2.x which can't find its Chrome binary on modern systems. The Playwright-based script uses the project's existing `@playwright/test` dependency.

### 9.3 Output
- Format: H.264 MP4, 1280×720, 25fps
- Typical size: ~5MB for a 5-minute video (mostly static content = high compression)
- Location: `output/{name}.mp4`

---

## Appendix: Complete File Anatomy

```
Line ranges for a typical 15-scene video (~2770 lines):

    1-35     HTML head, CSS, fonts
   36-38     Body wrapper, SVG open
   39-150    <defs>: gradient, icons, arrow markers
  150-390    <defs>: ALL clip paths (~168 clip paths for 15 scenes)
  390-395    Background rect
  395-1970   Scene groups (scene1 through scene15) — SVG markup
 1970-1980   Progress bar, SVG close, controls HTML
 1980-1985   CDN script tags (gsap, DrawSVGPlugin, rough.js)
 1985-2060   Utility functions (drawOn, wipe, fadeIn, showScene, hideScene, addRoughShape)
 2060-2170   Rough.js shape generation (~20 shapes)
 2170-2720   Master timeline — ALL scene animations with absolute timestamps
 2720-2770   Controls (play, replay, seek), auto-play, script close
```

---

## Appendix: Debugging Checklist

When something doesn't appear:

1. **Blank page, stuck at 0.0s** → JavaScript crash during initialization. Check browser console. Most likely: CDN script 404, or `registerPlugin` on undefined variable.
2. **Text invisible in one scene** → Clip-path x/y mismatch. Compare `<text x="..." y="...">` with `<rect x="..." y="...">` in the corresponding `<clipPath>`. For centered text, did you offset x by half the text width?
3. **Rough.js shape has double border** → A clean SVG `<rect>` exists at the same position. Remove the SVG rect and keep only the Rough.js shape.
4. **Seek bar shows wrong state** → Used `gsap.set()` + `gsap.to()` instead of `gsap.fromTo()`. The from-state isn't captured in the timeline.
5. **Replay doesn't fully reset** → Missing explicit reset for elements animated outside the clip-rect pattern (bars, opacity labels, etc.).
6. **Content appears before its scene** → Element is outside its scene `<g>` group, or the element's initial opacity isn't 0.
