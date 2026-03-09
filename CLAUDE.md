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

## LangGraph Pipeline v3 (Legacy — SVG+GSAP in HTML)

Uses LangGraph StateGraph with 6 nodes for single-HTML output.

```bash
npm run langgraph -- "Topic Name" --duration=60 --audience="target audience"
```

Key files: `scripts/langgraph/`

## LangGraph Pipeline v7 (Legacy — Remotion + ReAct Scene Composer)

Replaced by v8. Uses a ReAct agent (scene_composer) with tool calls for asset sourcing + TSX generation in a single loop.

### Running
```bash
npm run langgraph7 -- "Topic Name" --duration=60 --scenes=5 --audience="general"
```

### Architecture
```
START → theme_designer → research_planner → scene_designer
→ [asset_generator × M] → merge_assets
→ [narration_generator × N] → merge_narrations
→ [scene_writer × N] → merge_scenes
→ video_compiler → END
```

### Nodes (10 total: 6 LLM + 4 deterministic)
1. **Theme Designer** (Haiku) — Color palette, fonts, stroke width
2. **Research Planner** (Haiku) — Scene breakdown, key concepts, narration text
3. **Scene Designer** (Haiku) — Template selection, asset enumeration, sync blocks, animation assignments
4. **Asset Generator** (Haiku/Gemini, fan-out × M) — SVG via Haiku, images via Gemini `gemini-3.1-flash-image-preview`, icons via Icons8
5. **Narration Generator** (Gemini TTS, fan-out × N) — Per-scene TTS audio
6. **Scene Writer** (Sonnet, fan-out × N) — LLM writes complete Remotion TSX per scene with proper animations
7. **Video Compiler** (deterministic) — Scaffolds Remotion project, Root.tsx, audio integration

### Key Design Principles
- LLMs do **classification** (template selection, animation assignment) AND **code generation** (Remotion TSX)
- 12 pre-built CSS layout templates handle spatial positioning
- Pre-built animation components (WipeReveal, DrawOnSVG, FadeScale, FadeIn, Typewriter)
- Narration audio synced to scene animations
- Scene Writer LLM has full Remotion API reference in prompt

### Models
| Node | Model | Purpose |
|------|-------|---------|
| Theme/Research/Scene Design | `claude-haiku-4-5` | Classification, planning |
| SVG Generation | `claude-haiku-4-5` | Generate SVG with sub-elements |
| Image Generation | `gemini-3.1-flash-image-preview` | AI illustrations (Nano Banana) |
| Narration TTS | `gemini-2.5-flash-preview-tts` | Text-to-speech audio |
| Scene Writer | `claude-sonnet-4-6` | Write Remotion TSX code |

### Key Files
```
scripts/langgraph-v7/
├── index.mjs          — CLI entry point
├── graph.mjs          — StateGraph (10 nodes, 3 fan-out stages)
├── state.mjs          — State schema (Annotation + concatReducer)
├── config.mjs         — Models, API keys, canvas config
├── nodes/
│   ├── theme-designer.mjs
│   ├── research-planner.mjs
│   ├── scene-designer.mjs
│   ├── asset-generator.mjs      — Fan-out per asset (SVG/image/icon)
│   ├── narration-generator.mjs  — Fan-out per scene (Gemini TTS)
│   ├── scene-writer.mjs         — Fan-out per scene (Sonnet writes TSX)
│   └── video-compiler.mjs       — Scaffold Remotion project + Root.tsx
├── prompts/
│   ├── theme-designer.mjs
│   ├── research-planner.mjs
│   ├── scene-designer.mjs       — Template catalog + sync modes
│   ├── asset-svg-gen.mjs
│   └── scene-writer.mjs         — Remotion API reference + animation patterns
└── remotion-template/            — Pre-built Remotion project template
    └── src/
        ├── layouts/              — 12 layout templates (CSS flexbox)
        ├── animations/           — 5 animation components
        ├── components/           — StyledText, SVGAsset, ImageAsset
        └── ThemeContext.tsx       — React context for theme
```

### Output
```
output/{topic-slug}/
├── remotion/                     — Complete Remotion project
│   ├── src/scenes/Scene{N}.tsx   — LLM-generated scene code
│   ├── public/assets/            — SVGs, PNGs, narration WAVs
│   └── package.json
├── scene-designs.json            — Debug: scene designer output
└── edit-manifest.json            — Edit metadata
```

### Dependencies
`@langchain/langgraph`, `@anthropic-ai/sdk`, `@google/genai`, `remotion`, `@remotion/cli`, `@remotion/paths`, `@remotion/google-fonts`

## LangGraph Pipeline v8 (Active — Production Pipeline)

Replaces v7. Separates creative decisions (storyboard) from execution (asset fetching + code gen). ~78% fewer tokens than v7.

### Running
```bash
npm run langgraph8 -- "Topic Name" --duration=60 --scenes=5 --audience="general"
```

### Architecture
```
START → content_planner (Haiku: theme + content)
      → storyboard_designer (GPT-5.2: visual blueprint)
      → [narration_gen × N + asset_producer × M] (parallel, no LLM for assets)
      → merge_production
      → [scene_coder × N] (Kimi K2.5, single-pass TSX, NO tools)
      → merge_scenes
      → video_compiler (deterministic)
      → END
```

### Nodes (8 total: 3 LLM + 1 TTS + 4 deterministic)
1. **Content Planner** (Haiku) — Theme design + scene breakdown + narration scripts
2. **Storyboard Designer** (GPT-5.2) — Visual blueprint: layout, assets, animations per scene
3. **Asset Producer** (fan-out × M, NO LLM) — Icons8 HTTP + Gemini image gen
4. **Narration Generator** (Gemini TTS, fan-out × N) — Per-scene TTS audio
5. **Scene Coder** (Kimi K2.5 via OpenRouter, fan-out × N) — Single-pass TSX from storyboard spec
6. **Video Compiler** (deterministic) — Scaffold Remotion project

### Models
| Node | Model | Purpose |
|------|-------|---------|
| Content Planner | `claude-haiku-4-5` | Theme + content planning |
| Storyboard Designer | `claude-haiku-4-5` | Visual blueprint (layout, assets, animations) |
| Asset Producer | No LLM | Icons8 HTTP API + Gemini image gen |
| Narration TTS | `gemini-2.5-flash-preview-tts` | Text-to-speech audio |
| Scene Coder | `qwen/qwen3.5-35b-a3b` | Single-pass TSX generation (OpenRouter) |

### Key Design Principles
- **Storyboard locks creative decisions** before expensive downstream work
- **Asset sourcing is deterministic** — no LLM tokens wasted on tool calls
- **Scene coding is single-pass** — no agent loop, no tools, just TSX from spec
- **True parallelism** — narration + assets run simultaneously
- **Partial retry** — re-run one scene_coder without re-running entire pipeline

### Key Files
```
scripts/langgraph-v8/
├── index.mjs          — CLI entry point
├── graph.mjs          — StateGraph (8 nodes, 2 fan-out stages)
├── state.mjs          — State schema
├── config.mjs         — Models, API keys
├── nodes/
│   ├── content-planner.mjs      — Haiku: theme + content (2 calls)
│   ├── storyboard-designer.mjs  — GPT-5.2: visual blueprint
│   ├── asset-producer.mjs       — HTTP: Icons8 + Gemini (no LLM)
│   ├── narration-generator.mjs  — Gemini TTS
│   ├── scene-coder.mjs          — Kimi K2.5: single-pass TSX
│   └── video-compiler.mjs       — Deterministic: Remotion scaffold
└── prompts/
    ├── content-planner.mjs
    ├── storyboard-designer.mjs
    └── scene-coder.mjs
```

### Output
```
output/{topic-slug}-v8-run{N}/
├── remotion/                     — Complete Remotion project
│   ├── src/scenes/Scene{N}.tsx   — LLM-generated scene code
│   ├── public/assets/            — Icons, PNGs, narration WAVs
│   └── package.json
├── storyboard.json               — Debug: storyboard designer output
└── edit-manifest.json            — Edit metadata
```

## Reference
Full system prompt with all style rules, animation patterns, and code examples:
→ `prompts/whiteboard-video-system-prompt.md`
