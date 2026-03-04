# Whiteboard Explainer Video Generator — Project Guide

## Project Overview
This project creates Khan Academy-style animated whiteboard explainer videos as single self-contained HTML files using SVG + GSAP + Rough.js.

## Directory Structure
```
explainer-videos/
├── CLAUDE.md                  # This file — project conventions for Claude Code
├── prompts/
│   └── whiteboard-video-system-prompt.md  # Full system prompt (use as reference)
├── templates/
│   └── base.html              # Base HTML template to start from
├── examples/                  # Working reference examples
│   ├── what-are-cells.html    # Multi-scene biology explainer (7 scenes, ~65s)
│   └── writing-composition.html # Single-scene skills overview (~15s)
├── docs/                      # Technical documentation
│   ├── llm-from-scratch-approach.md
│   └── technical-workflow.md
├── scripts/
│   ├── pipeline/              # Automated video generation pipeline
│   │   ├── run-pipeline.mjs   # Orchestrator (runs steps 1-5)
│   │   ├── 01-plan-content.mjs
│   │   ├── 02-source-assets.mjs
│   │   ├── 02b-analyze-assets.mjs
│   │   ├── 03-process-assets.mjs
│   │   ├── 04-assemble-html.mjs
│   │   ├── 05-verify.mjs
│   │   └── lib/               # Shared utilities (gemini-client, etc.)
│   ├── capture-video.mjs      # HTML → MP4 export (Playwright + ffmpeg)
│   └── _archive/              # Experimental/superseded scripts
├── output/                    # Generated video HTML files go here
│   └── {topic-slug}/          # Each project gets its own subdirectory
└── assets/svg/                # Reusable SVG illustrations
```

## Tech Stack
- **GSAP 3.14.2** — Animation engine, timeline sequencing, easing
- **GSAP DrawSVGPlugin** — Stroke draw-on animation (free since April 2025; NOT available in 3.12.7)
- **GSAP MotionPathPlugin** — Animate objects along paths (optional)
- **Rough.js 4.6+** — Generate hand-drawn/sketchy SVG shapes
- **Google Fonts** — Cabin Sketch, Caveat, Patrick Hand, Permanent Marker

SVG Asset Sources
- Icons8 MCP — Already connected, search with search_icons
- unDraw (undraw.co) — Free recolorable SVG illustrations
- SVGRepo (svgrepo.com) — 300K+ free SVGs
- svg2roughjs — Convert any clean SVG to hand-drawn style

### CDN URLs (always use these exact versions)
```
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/DrawSVGPlugin.min.js
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/MotionPathPlugin.min.js
https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min.js
```

## Creating a New Video

### Step 1: User provides a topic
The user gives: topic, key points/script, target audience, duration.

### Step 2: Plan scenes
Break the content into 3-10 scenes. Each scene covers one concept. Allocate 5-10 seconds per scene.

### Step 3: Generate HTML
Start from `templates/base.html`. The output is always a **single self-contained HTML file** saved to `output/`.

### Naming convention
`output/{topic-slug}-whiteboard.html` (e.g., `output/what-are-cells-whiteboard.html`)

## Animation Conventions

### Three animation types only:
1. **Stroke draw-on** — For paths, lines, shapes. Uses DrawSVGPlugin or strokeDasharray fallback.
2. **Clip-rect wipe** — For ALL text. Left-to-right reveal via animated clipPath rect width.
3. **Fade-in** — For complex multi-path illustration groups only.

### ID naming convention:
- Scenes: `scene1`, `scene2`, ...
- Clip paths: `cp_{scene}_{element}` (e.g., `cp_s1_title`)
- Clip rects: `cr_{scene}_{element}` (e.g., `cr_s1_title`)
- Stroke elements: `s{scene}_{name}` (e.g., `s1_underline`, `s3_cell`)
- Groups: `g_{scene}_{name}` (e.g., `g_s2_illustration`)
- Rough.js generated: `rough_{scene}_{name}` (e.g., `rough_s1_box`)

### Timeline construction:
- Use absolute timestamps, not relative offsets
- Comment each animation with its time range
- Use `showScene`/`hideScene` helpers for transitions

### Color coding:
Assign each major concept a dedicated color. Common palette:
- Blue `#2b7ec2` — titles, primary
- Red `#cc3333` — key terms, emphasis
- Green `#1e8c5a` — concept A
- Steel Blue `#2266bb` — concept B
- Orange `#cc7722` — concept C
- Purple `#8844aa` — concept D

## SVG Canvas
- ViewBox: `0 0 1280 720` (16:9 aspect ratio)
- Background: Warm cream gradient (`#f5f3ef` to `#edeae4`)
- Progress bar at y=716, height=4

## Quality Checklist
Before delivering a video file, verify:
- [ ] All text uses clip-path wipe reveal (no text fades or instant appearances)
- [ ] All illustrations start at opacity="0" and are revealed via timeline
- [ ] Replay button properly resets ALL state (clip rects, drawSVG, opacities, scene visibility)
- [ ] Seek bar works — scrubbing to any point shows correct state
- [ ] No content overlaps or goes off-canvas
- [ ] Each concept has its own color coding
- [ ] Hand-drawn feel: Rough.js shapes or imperfect manual paths (no perfect geometry)
- [ ] Progress bar animates correctly
- [ ] Google Fonts load before animation starts (800ms auto-play delay)

## Video Export
To convert HTML to MP4 (uses Playwright + ffmpeg):
```bash
npm run capture -- output/video.html 60
```

## Reference
Full system prompt with all style rules, animation patterns, and code examples:
→ `prompts/whiteboard-video-system-prompt.md`
