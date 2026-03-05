# Workflow 4: LangGraph v5 — Image-Guided SVG Animation

**Status:** Experimental, first successful run (with issues)
**Run:** `npm run langgraph5 -- "Topic" --duration=60 --scenes=1 --audience="..."`
**Location:** `scripts/langgraph-v5/`

## Core Idea

Use AI image generation to solve layout, then have a vision-capable code LLM **recreate** the image as animated SVG. The image is a reference guide, not the final output. This combines v4's layout quality with v3's SVG+GSAP animation approach.

## Flow

```
START → research_planner (Claude Opus)
      → [scene_image_gen × N]  (Nano Banana generates reference PNGs)
      → merge_images
      → [scene_coder × N]      (Claude Sonnet sees image + codes SVG)
      → scene_compiler → END
```

4 nodes. Double fan-out with merge node between stages.

## Models

| Node | Model | Purpose |
|------|-------|---------|
| Research | `claude-opus-4-6` (ChatAnthropic) | Scene plan + image prompts + visual descriptions |
| Image gen | `gemini-3.1-flash-image-preview` (Nano Banana 2) | Reference infographic PNG per scene |
| Scene coder | `claude-sonnet-4-6` (ChatAnthropic + vision) | Sees reference image → writes SVG + GSAP JS |
| Compiler | Deterministic (reused v3.2) | Assembles HTML |

Using `ChatAnthropic` (LangChain wrapper) for cost tracking in LangSmith.

## Output

```
output/{slug}/
├── images/          # Nano Banana reference PNGs
├── scenes/          # Per-scene SVG, JS, defs files
└── {slug}-whiteboard.html  # Final animated HTML
```

## First Test Run: "Forming Good Habits" (60s, 6 scenes)

- **Pipeline time:** 206s
- **6 reference images:** Clean infographics from Nano Banana 2
- **6 scene SVGs coded:** 5-12 KB SVG + 1-7 KB JS per scene
- **HTML output:** 84 KB, auto-plays with controls, seek, replay

## Findings

### Pros
- **Image guides layout** — Claude sees the reference image and recreates spatial arrangement as SVG. Much better positioning than v3's blind coding.
- **True SVG output** — stroke draw-on, clip-rect wipe, fade-in animations. Real whiteboard feel with hand-drawn aesthetic.
- **Self-contained HTML** — single file, no external assets needed (unlike v4's PNG dependency).
- **Reuses v3.2 compiler** — proven HTML assembly, controls, seek, keyboard shortcuts.
- **Cost-tracked via LangSmith** — ChatAnthropic reports model + pricing automatically.
- **Simpler pipeline** — 4 nodes vs v4's 5 nodes. No vision decomposition step.

### Cons
- **Garbled text** — Claude misreads text from the reference image (OCR-like errors). Body text in some scenes is nonsensical (e.g., "Cue is start the bell of one innut rout").
- **Bad SVG paths** — some path `d` attributes have NaN values, truncated data, or formatting errors. Non-fatal but produces console errors.
- **JSON parse issues** — Claude's JSON response contains literal control characters (newlines/tabs inside string values). Required a `sanitizeJsonStrings()` fix to parse reliably.
- **LangSmith payload too large** — base64 images in state exceed 26MB trace limit (non-blocking warning).
- **Slower** — 206s for 6 scenes. Image gen + vision coding adds overhead vs v3.
- **Image gen model limitations** — Nano Banana sometimes generates 1024×1024 square images despite 16:9 prompt.

### Key Issue: Text Fidelity

The fundamental problem is that Claude is trying to read text from the reference image (like OCR) and often misreads it. The research planner already has the correct text in `body_lines`, but the scene coder prompt tells Claude to "recreate" what it sees in the image.

**Fix:** The prompt should instruct Claude to use the `body_lines` from the scene notes for text content, and only use the image for **layout and visual structure** (where things go, what diagrams look like, color usage). Text content should come from the structured data, not from reading the image.

### Key Issue: SVG Path Quality

Some SVG paths have bad data (NaN, truncated). This is because Claude generates complex SVG paths from visual memory of the image. Complex curves and shapes are hard to reproduce accurately from a screenshot.

**Fix:** Encourage simpler SVG primitives (rect, circle, line, text) over complex freeform paths. The prompt already does this but could be more explicit.

## Experiment Mode

Use `--scenes=1` to generate only 1 scene during experimentation. This saves cost and reduces latency (~40s vs ~200s).

```bash
npm run langgraph5 -- "Topic" --scenes=1 --output=output/experiment-name
```

## Next Steps
- Fix text fidelity: use `body_lines` from scene notes, not OCR from image
- Improve SVG path quality: constrain to simple primitives
- Reduce state payload: store image paths not base64
- Test with different topics to evaluate generalization
