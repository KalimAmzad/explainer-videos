# Workflow 3: LangGraph v4 — AI Image Gen + Vision Decompose + Revideo

**Status:** Experimental, first successful run
**Run:** `npm run langgraph4 -- "Topic" --duration=60 --audience="..."`
**Location:** `scripts/langgraph-v4/`

## Flow

```
START → research_planner
      → [scene_image_gen × N]     (Gemini generates infographic PNGs)
      → merge_images
      → [asset_decomposer × N]    (Gemini Vision detects bounding boxes, crops)
      → merge_groups
      → [scene_animator × N]      (Claude generates Revideo TypeScript)
      → video_compiler → END
```

Triple fan-out with merge nodes between stages. 5 nodes total.

## Models

| Node | Model | Purpose |
|------|-------|---------|
| Research | `claude-opus-4-6` | Scene plan + image prompts + asset groups |
| Image gen | `gemini-2.5-flash-image` | Full scene infographic PNG |
| Vision | `gemini-2.5-flash` | Bounding box detection, asset cropping |
| Animator | `claude-sonnet-4-6` | Revideo TypeScript code per scene |
| Compiler | Deterministic | Project scaffolding, HTML preview |

## Output

```
output/{slug}/
├── images/           # Full scene infographics (1024×1024 PNG)
├── crops/            # Cropped asset groups per scene
├── scenes/           # Revideo .tsx files
├── revideo-project/  # Scaffolded Revideo project (render to MP4)
└── {slug}-preview.html  # HTML slideshow preview
```

## First Test Run: "Forming Good Habits" (60s, 5 scenes)

- **Pipeline time:** 153s
- **5 scene images:** Clean educational infographics, good composition, no overlapping
- **26 cropped groups:** Vision correctly identified title, diagram, text, chart groups
- **5 Revideo scenes:** Valid TypeScript with positioning math from bbox
- **HTML preview:** Working slideshow with narration

## Findings

### Pros
- **AI handles layout perfectly** — Gemini image gen produces clean, well-composed infographics. No overlapping, no broken positioning. This solves v3's fundamental problem.
- **Vision decomposition works** — bounding boxes correctly identify distinct visual groups
- **Two-tier animation** — text recreated as code (typewriter), diagrams as PNG (clip-reveal)
- **Higher resolution** — 1920×1080 canvas, 30fps target
- **Revideo output** — can render to MP4 programmatically
- **Domain agnostic** — image gen handles any topic (science, religion, business, etc.)

### Cons
- **Images are 1024×1024** (square) — Gemini ignores 16:9 aspect ratio requests. Need post-processing or aspect ratio API param.
- **No stroke draw-on** — assets animate as PNG clip-reveal, not hand-drawn stroke animation. Loses the "whiteboard being drawn" feel.
- **Revideo rendering not yet automated** — compiler scaffolds project but doesn't run render (needs `npm install` in sub-project)
- **Slower** — 153s vs ~120s for v3 (image gen + vision adds overhead)
- **LangSmith payload too large** — base64 image data in state exceeds 26MB trace limit
- **PNG quality ceiling** — cropped groups are raster, can't scale up without quality loss
- **Vision bbox accuracy varies** — some groups have loose/tight bounds

### Key Learning
Separating layout (AI image gen) from animation (code gen) is the right architecture. The image gen model is far better at visual composition than any text-based LLM trying to write coordinates.

However, the output lacks the "hand is drawing this" whiteboard feel. It's more like an animated slideshow of infographic cards. To get true whiteboard animation, we'd need to either:
1. Convert cropped PNGs to SVG paths (potrace — but we know this has quality issues)
2. Have the LLM generate drawing instructions alongside the image
3. Use a different animation approach (e.g., progressive reveal with a hand cursor)

## Next Steps to Explore
- Force 16:9 aspect ratio in image gen (API config or prompt engineering)
- Automate Revideo render pipeline (npm install + render in video-compiler node)
- Experiment with "hand drawing" overlay animation on clip-reveal
- Try Gemini 3 Pro Image for higher quality scene images
- Reduce state payload size (store images on disk, not base64 in state)
