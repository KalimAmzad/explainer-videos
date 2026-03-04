# LLM from Scratch -- Whiteboard Explainer Video: Approach & Accuracy Measures

## 1. Overview

- **Topic**: Large Language Models from Scratch (following Sebastian Raschka's pedagogical framework)
- **Target audience**: CS graduate students
- **Duration**: 5 minutes (300 seconds), 15 scenes
- **Output**: Single self-contained HTML file (`output/llm-from-scratch-whiteboard.html`)
- **Tech stack**: GSAP 3.14.2 + DrawSVGPlugin, Rough.js 4.6.6, inline SVG (viewBox 0 0 1280 720)
- **Fonts**: Cabin Sketch 400/700, Permanent Marker, Caveat, Patrick Hand (Google Fonts)

This is a **v2 complete rewrite** of an earlier 120-second / 10-scene version that had critical text-clipping, double-border, and alignment bugs.

---

## 2. Pedagogical Approach

### Why Raschka's "Build an LLM from Scratch" Sequence

Sebastian Raschka's pedagogical framework was chosen because it builds understanding from the ground up in a way that mirrors how an LLM is actually constructed. Rather than presenting the transformer as a black box and then explaining its parts, the sequence starts with the most primitive operation (tokenization) and adds one layer of complexity per scene, so that each new concept has a foundation in what came before.

This approach is particularly effective for CS graduate students because:
- They have the mathematical maturity for formulas and numerical walkthroughs.
- They benefit from seeing the full pipeline, not just isolated components.
- The "build it yourself" framing connects theory to implementation.

### Scene Flow

The 15 scenes follow a strict bottom-up construction order:

1. **Title Card** -- sets context and framing
2. **What Is a Language Model?** -- establishes next-token prediction as the core objective
3. **Tokenization & BPE** -- how raw text becomes integer sequences
4. **Embeddings & Vector Space** -- token IDs become dense vectors; semantic similarity
5. **Positional Encoding** -- why word order matters; sinusoidal encoding
6. **Self-Attention Intuition** -- context-dependent representations; the disambiguation problem
7. **Q/K/V Deep Dive** -- the mechanics of attention with numerical walkthrough
8. **Multi-Head Attention** -- parallel attention heads for different relationship types
9. **Transformer Block** -- assembling the full block: MHA + FFN + LayerNorm + residuals
10. **Full Architecture** -- stacking blocks into a complete model; parameter counting
11. **Training (Next Token Prediction)** -- the training loop; data sources; compute cost
12. **Cross-Entropy Loss** -- loss function detail; gradient descent visualization
13. **Scaling Laws** -- log-log scaling; Chinchilla optimal compute allocation
14. **From GPT to ChatGPT (RLHF)** -- SFT + RLHF pipeline; alignment
15. **Recap** -- stacked building blocks summary

Each concept builds directly on the previous one. A student who watches from the beginning has all the prerequisite knowledge for every subsequent scene.

### Graduate-Level Depth

The video includes:
- Mathematical formulas (attention equation, cross-entropy, gradient update rule, scaling power law, sinusoidal positional encoding)
- Numerical walkthroughs (Q/K/V dot products, softmax, cross-entropy loss calculation)
- Graphs (sinusoidal encoding waves, loss landscape contours, log-log scaling curve)
- Architectural diagrams (transformer block internals, full model pipeline, training loop)
- Concrete statistics (GPT-2/GPT-3 parameter counts, vocabulary sizes, head counts)

---

## 3. Technical Architecture

### Single HTML File

The entire video is a single self-contained HTML file (~2,770 lines) with no external dependencies beyond CDN-loaded libraries and Google Fonts. All SVG markup, JavaScript, and CSS are inline.

### SVG Canvas

- ViewBox: `0 0 1280 720` (16:9 aspect ratio)
- Background: Warm cream linear gradient (`#f5f3ef` to `#edeae4`)
- Progress bar at y=716, height=4, animated width tied to timeline position

### Libraries (CDN)

```
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/DrawSVGPlugin.min.js
https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min.js
```

Note: GSAP 3.14.2 is used instead of 3.12.7 because DrawSVGPlugin was not available in the 3.12.7 npm package on the CDN (see Lessons Learned).

### GSAP Master Timeline

A single `gsap.timeline({ paused: true })` controls all 300 seconds of animation. All animations are placed at **absolute timestamps** (e.g., `tl.add(wipe(...), 52.3)`) rather than relative offsets. This ensures:
- Seek bar works correctly at any position
- Replay resets cleanly
- Scene timing is predictable and easy to audit

The `onUpdate` callback drives the seek bar position, time display, and progress bar width.

### Three Animation Types

| Type | Use Case | Implementation |
|------|----------|----------------|
| **Stroke draw-on** | Paths, lines, arrows, shapes | `DrawSVGPlugin` with `gsap.fromTo()`, or `strokeDasharray`/`strokeDashoffset` fallback |
| **Clip-rect text wipe** | ALL text elements | Animated `clipPath` rect width (left-to-right reveal) |
| **Fade-in** | Complex multi-path illustration groups, Rough.js shapes | `gsap.to(sel, { opacity: 1 })` |

### Scene-Based Structure

Each scene is a `<g id="sceneN" class="scene">` group, initially set to `opacity: 0` via the `.scene` CSS class. Scene transitions use `showScene()` / `hideScene()` helper functions called at the scene boundary timestamp.

### SVG Icon Assets

Reusable icon definitions are placed in `<defs>` as `<g>` elements with descriptive IDs:

| Asset ID | Icon | Used In |
|----------|------|---------|
| `icon_brain` | Brain (stroke) | Scenes 1, 15 |
| `icon_doc` | Document (stroke) | Scenes 3, 7 |
| `icon_globe` | Globe (stroke) | Scene 11 |
| `icon_chart` | Bar chart (stroke) | Scene 13 |
| `icon_book` | Book (stroke) | Scene 11 |
| `icon_lightning` | Lightning bolt (filled) | Scene 11 |
| `icon_gpu` | Microchip/GPU (stroke) | Scene 13 |
| `icon_db` | Database (stroke) | Scene 13 |
| `icon_thumbsup` | Thumbs up (filled) | Scene 14 |
| `icon_thumbsdown` | Thumbs down (filled) | Scene 14 |

Icons are referenced via `<use href="#icon_brain">` and scaled/positioned with `transform`.

### Rough.js Shape Generation

All Rough.js shapes are generated in JavaScript (not SVG markup) and appended to their parent scene groups via `addRoughShape()`. Each shape starts at `opacity="0"` and is revealed by `fadeIn()` at its designated timestamp. Shapes include:
- Title frame (Scene 1)
- N-gram / Neural comparison boxes (Scene 2)
- Token and semantic space frames (Scene 4)
- Position and PE formula boxes (Scene 5)
- Sentence frame (Scene 6)
- Numerical example frame (Scene 7)
- Head bracket (Scene 8)
- Transformer block frame (Scene 9)
- Pipeline frame (Scene 10)
- Training cost ellipse (Scene 11)
- Chart frame and "high!" emphasis circle (Scene 12)
- Scaling plot frame (Scene 13)
- RLHF pipeline frame (Scene 14)
- Recap stack frame (Scene 15)

---

## 4. Quality & Accuracy Measures

### Clip-Path Positioning Rules

Correct clip-path positioning is the single most important factor for text visibility. The rules are:

| Text Alignment | Clip Rect x | Clip Rect width target |
|----------------|-------------|----------------------|
| **Left-aligned** (`text-anchor="start"` or default) | Same as the text element's `x` coordinate | Estimated text width |
| **Centered** (`text-anchor="middle"`) | `text_x - estimated_text_width / 2` | Full estimated text width |

For all text:
- **Clip rect y** = `text_y - font_size` (because SVG text `y` is the baseline, and the clip must start above the text)
- **Clip rect height** = `font_size * 1.4` (to accommodate descenders like g, p, q, y)

The centered-text rule is critical: if the clip rect's `x` is set to the text's `x` coordinate (which is the center point), the left half of the text will be invisible.

### No Double Shapes Rule

Use ONLY Rough.js rectangles OR SVG `<rect>` elements for the same visual element -- never both. In v1, some scenes had a clean SVG rect with a Rough.js rect overlaid on top, creating a "double border" effect that looked like a rendering bug. All such duplicates were eliminated in v2.

### Box Sizing Rule

All text-containing boxes must have:
```
width >= text_length * font_size * 0.6 + 30px padding
```

This prevents text overflow, which was a problem in v1's tokenization scene where subword boxes like "believ" were too narrow.

### Animation Correctness

- **`gsap.fromTo()` over `gsap.set()` + `gsap.to()`**: Using `fromTo()` ensures the animation has both a start and end state baked in. This makes the seek bar work correctly -- scrubbing backwards resets the element to its `from` state. Using `set()` + `to()` can leave stale state when seeking.
- **Replay handler**: The replay button handler resets ALL state:
  - Seeks timeline to 0 and pauses
  - Sets all `.scene` groups to `opacity: 0`
  - Resets all clip rects (elements with `id^="cr_"`) to `width="0"`
  - Resets specific animated rects (probability bar widths) to `width: 0`
  - Resets opacity on percentage labels
  - Resets progress bar width to 0
  - Then calls `tl.restart()`
- **`drawOn()` fallback**: The `drawOn()` utility checks `typeof DrawSVGPlugin !== 'undefined'` at call time and falls back to the `strokeDasharray` / `strokeDashoffset` method if the plugin is unavailable. This ensures the video still works if the CDN fails to load DrawSVGPlugin.

### CDN Reliability

- **GSAP 3.14.2** is used, NOT 3.12.7. The DrawSVGPlugin JS file returned a 404 on the CDN at the `gsap@3.12.7` path. Version 3.14.2 was verified to serve DrawSVGPlugin correctly.
- **Guard plugin registration**: `if (typeof DrawSVGPlugin !== 'undefined') gsap.registerPlugin(DrawSVGPlugin);` prevents a runtime error if the script fails to load.
- **Rough.js 4.6.6**: Stable release, no known CDN issues.

### Visual Verification Checklist

- [ ] All text visible -- no clipping or truncation in any of the 15 scenes
- [ ] All illustrations draw on visibly (stroke-by-stroke, 0.6-1.2s durations)
- [ ] Math formulas render correctly (subscripts, superscripts, Greek letters via Unicode)
- [ ] Color coding is consistent per concept throughout the video
- [ ] Rough.js shapes have no double borders (only one border source per element)
- [ ] Seek bar works at any position -- scrubbing shows correct visual state
- [ ] Replay button resets all state properly (clip rects, opacities, bar widths, progress bar)
- [ ] No content overlaps or off-canvas elements
- [ ] Positional encoding graph (Scene 5) shows 3 sine waves with distinct colors/frequencies
- [ ] Q/K/V numerical example (Scene 7) has correct arithmetic
- [ ] Log-log scaling plot (Scene 13) shows decreasing loss with model labels
- [ ] RLHF pipeline (Scene 14) shows the 3-stage progression clearly
- [ ] Progress bar at bottom animates from 0 to full width over 300 seconds
- [ ] Fonts load before animation starts (auto-play fires after `document.fonts.ready`)

---

## 5. Scene Breakdown Summary

| # | Scene | Time Range | Key Content | Visual Elements |
|---|-------|-----------|-------------|-----------------|
| 1 | Title Card | 0-10s | "Large Language Models from Scratch" | Rough.js frame, brain icon, circuit lines |
| 2 | What Is a Language Model? | 10-30s | P(w_t \| context), next-token prediction | Probability bar chart, N-gram vs Neural comparison boxes |
| 3 | Tokenization & BPE | 30-52s | "unbelievable" -> subwords -> token IDs, merge table | Cutting lines, subword boxes, ID boxes, doc icon |
| 4 | Embeddings & Vector Space | 52-76s | Embedding lookup, semantic space, king-queen analogy | Matrix grid, 2D scatter with word clusters, analogy arrows |
| 5 | Positional Encoding | 76-98s | "Dog bites man" vs "Man bites dog", sinusoidal PE formulas | 3 sine waves at different frequencies, position + embedding sum |
| 6 | Self-Attention | 98-120s | "The bank of the river was steep", attention weights | Spotlight beams with opacity/weight, before/after embedding shift |
| 7 | Q/K/V Deep Dive | 120-148s | Q/K/V definitions, numerical walkthrough with ["I","love","cats"] | Three columns with formulas, dot product scores, softmax weights |
| 8 | Multi-Head Attention | 148-168s | 4 parallel heads (syntax, semantics, position, coreference) | Head lanes with attention patterns, concat + linear boxes |
| 9 | Transformer Block | 168-190s | MHA -> Add&Norm -> FFN -> Add&Norm, residual connections | Block diagram with skip-connection arrows, stack of N blocks |
| 10 | Full Architecture | 190-210s | Input -> Tokenizer -> Embed -> Transformers -> Softmax -> Output | End-to-end pipeline boxes, parameter count table |
| 11 | Training | 210-232s | Training loop, data sources, compute cost | Circular flow diagram, globe/book/GPU icons, cost ellipse |
| 12 | Cross-Entropy Loss | 232-254s | L = -sum log P, gradient descent, Adam optimizer | Bar chart, numerical loss examples, contour map with descent path |
| 13 | Scaling Laws | 254-274s | Parameters/Data/Compute axes, log-log plot, Chinchilla | Icon-labeled axes, descending curve with model labels, power law |
| 14 | From GPT to ChatGPT | 274-294s | Pre-training -> SFT -> RLHF pipeline, alignment comparison | Three-stage pipeline, thumbs up/down icons, base vs chat comparison |
| 15 | Recap | 294-300s | 7 stacked building blocks = LLM | Colored blocks stacking bottom-to-top, bracket, brain icon |

---

## 6. Color Coding System

Each major concept category is assigned a dedicated color that is used consistently throughout all scenes:

| Concept Category | Color Name | Hex Code | Usage |
|-----------------|------------|----------|-------|
| Titles / Headers | Blue | `#2b7ec2` | Scene titles, primary emphasis, title frame |
| Key Terms / Math | Red | `#cc3333` | Formulas, key terms, cutting lines, emphasis circles |
| Language Model / Probability | Green | `#1e8c5a` | Probability bars, neural box, thumbs up icon |
| Embeddings / Vectors | Orange | `#cc7722` | Embedding matrix, token frames, N-gram box, lightning icon |
| Attention Mechanism | Purple | `#8844aa` | Self-attention beams, Q/K/V frames, attention patterns |
| Training / Loss | Teal | `#2299aa` | Cross-entropy formulas, loss chart, book icon |
| Scaling / RLHF | Dark Red | `#993344` | Scaling curve, GPU icon, database icon, RLHF pipeline |
| Body Text | Dark Gray | `#333` | All body text, annotations, general labels |
| Frames / Structural | Gray | `#555` | Rough.js structural frames, gray arrows |

Arrow markers are defined per color (`arrowGreen`, `arrowRed`, `arrowBlue`, `arrowPurple`, `arrowOrange`, `arrowGray`) for consistent use throughout scenes.

---

## 7. Lessons Learned / Pitfalls

### DrawSVGPlugin CDN 404 with gsap@3.12.7

The CLAUDE.md project conventions specified `gsap@3.12.7` for CDN URLs. However, `DrawSVGPlugin.min.js` was not available at that version path on jsDelivr, returning a 404. This was resolved by upgrading to `gsap@3.14.2`, where DrawSVGPlugin (made free in April 2025) is properly included.

**Lesson**: Always verify CDN URL availability before committing to a version. The `if (typeof DrawSVGPlugin !== 'undefined')` guard prevents a hard crash if the CDN fails.

### Centered Text Clip-Path Positioning

This was the single biggest source of "invisible text" bugs in v1. When text uses `text-anchor="middle"`, the SVG `x` attribute is the CENTER of the text, not the left edge. Setting the clip rect's `x` to the same value clips away the left half of the text entirely.

**Fix**: For centered text, calculate `clip_x = text_x - (estimated_text_width / 2)` and set the clip rect target width to the full estimated text width.

**Lesson**: Always check every text element's `text-anchor` property before calculating its clip-path coordinates. Left-aligned text is straightforward; centered text requires the offset calculation.

### Always Test Seek Bar at Multiple Points

The seek bar test catches a class of bugs that are invisible during normal playback. If `gsap.set()` + `gsap.to()` is used instead of `gsap.fromTo()`, seeking backwards past an animation leaves the element in its final state rather than reverting it.

**Lesson**: Use `gsap.fromTo()` for any animation where the "before" state matters (e.g., bar chart widths, probability rectangles). Reserve `gsap.to()` for cases where the initial state is already set by SVG attributes (e.g., clip rect widths that start at 0 in the markup).

### Rough.js Shapes Must Be Generated in JavaScript

Rough.js shapes cannot be defined in SVG markup. They must be generated at runtime via `rough.svg(board).rectangle(...)` (or `.ellipse(...)`, `.line(...)`, etc.) and appended to their parent DOM node. Attempting to write Rough.js-style shapes as static SVG produces clean geometry, defeating the hand-drawn aesthetic.

**Lesson**: Always generate Rough.js shapes in the `<script>` block and use `addRoughShape()` to attach them to scene groups with initial `opacity="0"`.

### Box Width for Subword Tokens

In v1, BPE subword boxes were sized based on rough character estimates that were too narrow. The word "believ" overflowed its box visually. The fix was to enforce a minimum width formula:

```
width = max(text.length * fontSize * 0.6 + 30, 160)
```

**Lesson**: Always add padding to text-containing boxes and set a reasonable minimum width (160px for subword tokens at 32-36px font size).

### Font Loading Race Condition

If the animation starts before Google Fonts finish loading, text renders in a fallback font with different metrics, causing clip-path alignment issues. The video uses `document.fonts.ready.then(...)` with a 400ms delay to ensure fonts are loaded before auto-play begins.

**Lesson**: Never auto-play immediately on DOMContentLoaded. Wait for `document.fonts.ready` and add a small delay buffer.

### Replay Must Reset Everything

The replay handler must reset not just the timeline position, but all side effects:
- All scene group opacities (back to 0)
- All clip rect widths (back to 0)
- All animated rect/bar widths (back to 0)
- All opacity-animated elements (back to 0)
- The progress bar width (back to 0)

Missing any of these causes visual artifacts on replay (elements visible before their scene, bars at full width, etc.).

**Lesson**: The replay handler should use broad selectors (`[id^="cr_"]`, `.scene`) to catch all elements, plus explicit resets for any elements animated via `fromTo()` outside the clip-rect pattern.
