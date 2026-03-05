# Workflow 2: LangGraph v3 — SVG + GSAP in HTML

**Status:** Stable, superseded by v4
**Run:** `npm run langgraph -- "Topic" --duration=60 --audience="..."`
**Location:** `scripts/langgraph/`

## Flow

```
START → research_plan → asset_sourcing → [scene_coder × N parallel] → scene_compiler → END
```

Parallel scene coding via LangGraph Send API. Shared state, checkpointing, LangSmith tracing.

## Models

| Node | Model | Purpose |
|------|-------|---------|
| Research | `claude-opus-4-6` | Content plan, scene breakdown |
| Asset sourcing | `gemini-2.5-flash` | SVG primitive generation |
| Scene coder | `claude-sonnet-4-6` | Per-scene SVG + GSAP timeline |
| Compiler | Deterministic | HTML assembly |

## Output

Single HTML file: `output/{slug}/{slug}-whiteboard.html`
Canvas: 1280×720 SVG + GSAP. Three animation types: stroke draw-on, clip-rect text wipe, fade-in.

## Evolution

- **v2**: 6 nodes with ReAct agent loop for assets (slow). Quality review node.
- **v3**: Simplified to 4 nodes. Dropped ReAct loop. Claude Opus for research.
- **v3.2**: Replaced PNG→potrace with LLM-generated SVG primitives. Added Rough.js rules, clip-path math to prompt.
- **v3.3**: Switched scene coder from Gemini to Claude Sonnet. Major prompt rewrite with concrete reference examples.

## Findings

### Pros
- **Parallel scene coding** — multiple scenes generated simultaneously, ~2-4 min total
- **LangSmith tracing** — full observability of every LLM call
- **Checkpointing** — resume from failure with `--thread=ID`
- **Claude scene coder** (v3.3) produces inline diagrams, width calculations, creative animations
- **Single HTML output** — portable, no dependencies, opens in any browser
- **Seek bar works** — GSAP timeline fully scrubbable

### Cons
- **LLMs cannot do pixel-precise spatial layout** — overlapping elements, broken positioning, text clipping. This is the fundamental problem no amount of prompting fixes.
- **Blind coding** — LLM generates SVG without seeing the result. Like writing CSS blindfolded.
- **SVG complexity** — clip-path math, absolute positioning, element IDs all must be perfect. One wrong x/y and text is invisible.
- **Quality inconsistent** — some scenes render beautifully, others are broken. No way to predict.
- **No visual feedback loop** — can't show the LLM what it produced and ask it to fix layout issues.

### Key Learning
LLMs are fundamentally bad at spatial layout when they can't see the output. Even with detailed clip-path math formulas, concrete examples, and layout composition rules, the output breaks ~40% of the time. The approach of having an LLM write pixel-precise SVG coordinates blindly is architecturally flawed.

**Root cause:** The LLM has no visual feedback. A human designer looks at the canvas, sees overlap, and adjusts. The LLM writes coordinates from imagination alone.
