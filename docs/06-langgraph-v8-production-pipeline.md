# LangGraph v8 — Production Pipeline Architecture

## Problem Statement

v7's `scene_composer` is a ReAct agent that searches icons, downloads PNGs, generates images, and writes TSX — all in a single agentic loop (up to 12 iterations). This causes:

- **Token waste**: ~150-200K tokens across 5 scenes (tool results bloat context every iteration)
- **Non-determinism**: 13 runs to get one good output on "forming-good-habits"
- **No partial retry**: If Scene 3 fails, re-run the entire pipeline
- **Asset mismatches**: Agent guesses filenames, causing broken `staticFile()` references

## Solution: Separate Creative Decisions from Execution

Modeled after professional video production: **Script → Storyboard → Asset Production → Assembly → Render**

## Architecture

```
Phase 1: PRE-PRODUCTION (cheap, sequential — 2 Haiku calls + 1 GPT-5.2 call)

  START → content_planner (Haiku)
    Output: { theme, researchNotes }
    - Theme: colors, fonts, stroke width
    - Content: scenes, teaching points, narration scripts

  → storyboard_designer (GPT-5.2)
    Input: theme + researchNotes
    Output: { storyboard }
    - Per scene: layout, asset manifest, animation choreography, color assignments
    - Complete visual blueprint — locks ALL creative decisions

Phase 2: PRODUCTION (parallel fan-out, mostly NO LLM)

  → [narration_generator × N] (Gemini TTS)
  → [asset_producer × M]     (HTTP only — Icons8 + Gemini image gen)
  → merge_production

Phase 3: ASSEMBLY (parallel fan-out, single-pass code gen)

  → [scene_coder × N] (Kimi K2.5 via OpenRouter)
    Input: storyboard spec + resolved asset paths + narration duration + theme
    Output: Scene{N}.tsx
    NO TOOLS, NO AGENT LOOP — single LLM call

  → merge_scenes

Phase 4: COMPILATION (deterministic)

  → video_compiler
    Scaffold Remotion project, Root.tsx, edit-manifest.json
  → END
```

## Token Cost Comparison

| Component | v7 (5 scenes) | v8 (5 scenes) | Savings |
|-----------|---------------|---------------|---------|
| Theme + Content | ~3K | ~3K | — |
| Storyboard | N/A | ~7K | New (cheap) |
| Asset sourcing | ~50K (inside ReAct) | 0 (HTTP) | 100% |
| Scene code gen | ~150K (ReAct × 12) | ~35K (single-pass) | ~77% |
| **Total** | **~200K+** | **~45K** | **~78%** |

## Models

| Node | Model | API | Purpose |
|------|-------|-----|---------|
| Content Planner | `claude-haiku-4-5` | Anthropic | Theme + content planning |
| Storyboard Designer | `gpt-5.2` | OpenAI | Visual blueprint |
| Narration Generator | `gemini-2.5-flash-preview-tts` | Google GenAI | TTS audio |
| Asset Producer | No LLM | HTTP APIs | Icons8 download, Gemini image gen |
| Scene Coder | `moonshotai/kimi-k2.5` | OpenRouter | Single-pass TSX generation |
| Video Compiler | No LLM | Deterministic | Scaffold Remotion project |

## Storyboard Format

The storyboard_designer produces a structured JSON blueprint per scene:

```json
{
  "scenes": [{
    "scene_number": 1,
    "layout": "split",
    "title": "Scene Title",
    "subtitle": "Scene subtitle",
    "visual_direction": "Dark glassmorphic split layout...",
    "assets": [
      { "id": "s1_brain", "type": "icon", "search_term": "brain", "platform": "color", "size": 256 },
      { "id": "s1_hero", "type": "ai_image", "prompt": "..." }
    ],
    "content_blocks": [
      { "type": "teaching_point", "text": "...", "color": "accent1", "icon_ref": "s1_brain" },
      { "type": "stat", "value": "40%", "label": "...", "color": "primary" }
    ],
    "animations": {
      "title": { "type": "wipe_reveal", "delay_sec": 0 },
      "content_blocks": { "type": "stagger_spring", "stagger_sec": 0.4 },
      "hero": { "type": "fade_scale", "delay_sec": 1.0 },
      "bottom_bar": { "type": "fade_up", "delay_pct": 0.7 }
    },
    "bottom_bar": { "emoji": "...", "text": "Key takeaway..." }
  }]
}
```

## Key Innovations

1. **Deterministic asset naming**: Storyboard assigns `id: "s1_brain"` → asset_producer saves as `s1_brain.png` → scene_coder uses `staticFile('assets/s1_brain.png')`. Zero mismatch bugs.

2. **Partial retry**: Re-run just one scene_coder or one asset_producer without re-running the pipeline.

3. **True parallelism**: Narration + asset production run simultaneously (staggered fan-out).

4. **Single-pass scene coding**: No tools, no agent loop. Given a complete spec, write TSX in one call.

## Running

```bash
npm run langgraph8 -- "Topic Name" --duration=60 --scenes=5 --audience="general"
```

## Output

Same as v7:
```
output/{topic-slug}-v8-run{N}/
├── remotion/
│   ├── src/scenes/Scene{N}.tsx
│   ├── public/assets/
│   └── package.json
├── storyboard.json
└── edit-manifest.json
```
