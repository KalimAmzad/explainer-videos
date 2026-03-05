# Workflow 1: Sequential Shell Pipeline

**Status:** Legacy (still runnable)
**Run:** `npm run pipeline "Topic" --duration=60 --audience="..."`
**Location:** `scripts/pipeline/`

## Flow

```
01-plan-content → 02-source-assets → 02b-analyze-assets → 03-process-assets → 04-assemble-html → 05-verify
```

Each step is a standalone script. Output from step N is read by step N+1 via filesystem.

## Models

| Node | Model |
|------|-------|
| Content planning | `gemini-2.5-flash` |
| Image generation | `gemini-2.5-flash` |
| Asset analysis | Deterministic (sharp, potrace) |
| HTML assembly | Deterministic (template) |
| Verification | Playwright screenshots |

## Output

Single self-contained HTML file: `output/{slug}/{slug}-whiteboard.html`
Canvas: 1280×720 SVG + GSAP animations

## Findings

### Pros
- Simple linear flow, easy to debug and re-run individual steps
- `--skip=N` flag to restart from any step
- No LLM state management complexity
- Fast iteration on individual steps

### Cons
- **No parallelism** — each step waits for previous, ~5-10 min total
- **PNG→potrace SVG conversion destroys quality** — icons become ugly single-path blobs
- **Deterministic layout is rigid** — fixed grid, no creative flexibility
- **No checkpointing** — failure at step 5 means re-running from scratch
- **No observability** — no LangSmith tracing
- Gemini-only (no Claude reasoning for complex content planning)

### Key Learning
Potrace SVG conversion from raster images produces unusable results for animation. Need either native SVG primitives or keep assets as PNG with fade-in animation.
