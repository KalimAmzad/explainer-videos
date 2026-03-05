/**
 * v5 Scene coder prompt — image-guided SVG recreation.
 * Claude Sonnet receives a reference infographic image and recreates it
 * as animated SVG with stroke draw-on effects.
 */
export function buildSceneCoderPrompt({ sceneNotes, sceneNum, totalScenes }) {
  const sceneColor = sceneNotes.concept_color || '#2b7ec2';
  const timeStart = sceneNotes.time_start || 0;
  const sceneDuration = sceneNotes.duration || 12;

  return `You are an expert SVG animator. You will receive a REFERENCE IMAGE of an educational infographic scene. Your job is to **recreate** this image as SVG code with hand-drawn stroke animations — as if a teacher is drawing it on a whiteboard in real-time.

## YOUR TASK
Look at the reference image carefully. Recreate its content and layout as SVG elements with GSAP timeline animations. The final result should look like the image being drawn stroke-by-stroke.

## SCENE INFO
- Scene ${sceneNum} of ${totalScenes}: "${sceneNotes.title}"
- Duration: ${sceneDuration}s (absolute start: ${timeStart}s, ends: ${timeStart + sceneDuration}s)
- Accent color: ${sceneColor}
- Canvas: 1280×720 SVG viewBox

## ANIMATION SEQUENCE
${sceneNotes.animation_sequence || 'Draw title first, then main visual elements, then labels and text.'}

## FONTS
- **"Cabin Sketch"** — titles (44-56px, font-weight="700")
- **"Caveat"** — body text (30-36px)
- **"Permanent Marker"** — emphasis terms (28-32px)
- **"Patrick Hand"** — labels/annotations (20-28px)

## HOW TO RECREATE THE IMAGE

### Study the reference image and identify:
1. **Title text** — what it says, where it is
2. **Diagrams/shapes** — circles, arrows, boxes, flow lines, charts
3. **Body text** — teaching points, bullet lists
4. **Labels** — annotations on diagrams
5. **Icons/symbols** — simple shapes you can approximate with SVG primitives
6. **Layout** — how elements are arranged (left/right zones, centered, stacked)

### Recreate each element using SVG:
- **Text** → \`<text>\` with clip-path wipe animation (NOT fade)
- **Lines/arrows** → \`<line>\` or \`<path>\` with stroke draw-on animation
- **Rectangles/boxes** → \`<rect>\` with stroke draw-on
- **Circles** → \`<circle>\` or \`<ellipse>\` with stroke draw-on
- **Complex shapes** → \`<path>\` with simple d commands (M, L, Q, C, Z)
- **Filled areas** → use fill color but animate with fadeIn
- **Flow arrows** → \`<path>\` with marker-end="url(#arrow_${sceneColor.replace('#', '')})"

### CRITICAL RULES:
1. **ALL text must use clip-path wipe** — never fade text. This creates a "hand writing" effect.
2. **ALL shapes must stroke draw-on** — paths, lines, circles draw as if a pen is tracing them.
3. **Use absolute timestamps** — all times relative to the master timeline (start at ${timeStart}s).
4. **Use gsap.fromTo()** — never gsap.set()+gsap.to(). Ensures seek bar works.
5. **Don't be pixel-perfect** — slightly imperfect coordinates give a hand-drawn feel.
6. **Keep SVG simple** — use basic primitives. No gradients, no filters, no complex paths.
7. **Match the reference image's layout** — elements should be in roughly the same positions.

## CLIP-PATH MATH (for text wipe animation)

For EVERY text element, create a matching clipPath:

**Left-aligned** (text-anchor="start"):
\`\`\`
clipRect.x = text.x
clipRect.y = text.y - fontSize
clipRect.height = fontSize × 1.4
targetWidth = charCount × fontSize × 0.55 + 20
\`\`\`

**Centered** (text-anchor="middle"):
\`\`\`
estimatedWidth = charCount × fontSize × 0.55 + 20
clipRect.x = text.x - estimatedWidth/2
clipRect.y = text.y - fontSize
clipRect.height = fontSize × 1.4
targetWidth = estimatedWidth
\`\`\`

## TIMING PATTERN
\`\`\`
${timeStart.toFixed(1)}s  ${sceneNum > 1 ? `hideScene('#scene${sceneNum - 1}'); showScene('#scene${sceneNum}')` : `showScene('#scene${sceneNum}')`}
${(timeStart + 0.3).toFixed(1)}s  Title wipe (1.0-1.5s)
${(timeStart + 1.8).toFixed(1)}s  Underline draws on (0.4s)
${(timeStart + 2.5).toFixed(1)}s  Main visual elements draw stroke-by-stroke
${(timeStart + Math.min(sceneDuration * 0.6, 7)).toFixed(1)}s  Body text lines wipe in
${(timeStart + Math.min(sceneDuration * 0.8, 9)).toFixed(1)}s  Labels and annotations
\`\`\`
Fill the ${sceneDuration}s naturally. Leave ~1s breathing room at the end.

## ID NAMING
- Scene group: \`id="scene${sceneNum}" class="scene"\`
- Clip paths: \`id="cp_s${sceneNum}_{name}"\` with rects: \`id="cr_s${sceneNum}_{name}"\`
- Stroke elements: \`id="s${sceneNum}_{name}"\`
- Rough.js shapes: \`id="rough_s${sceneNum}_{name}"\`

## AVAILABLE HELPERS
\`\`\`javascript
tl.add(wipe('cr_s${sceneNum}_name', targetWidth, duration), time)  // text reveal
tl.add(drawOn('s${sceneNum}_name', duration), time)                // stroke draw
tl.add(fadeIn('#elementId', duration), time)                        // opacity (shapes only)
tl.add(drawOnGroup('s${sceneNum}_group', duration), time)          // draw all children
tl.call(() => { hideScene('#scene${sceneNum - 1}'); showScene('#scene${sceneNum}'); }, null, time)
\`\`\`

Arrow markers available: arrow_333, arrow_2b7ec2, arrow_cc3333, arrow_1e8c5a, arrow_cc7722, arrow_8844aa

## OUTPUT FORMAT
Return a JSON object with exactly 4 fields:

### 1. "svgDefs" (string)
All \`<clipPath>\` definitions for this scene's text elements.

### 2. "svgBody" (string)
Complete \`<g id="scene${sceneNum}" class="scene">\` with all visual elements recreating the reference image.

### 3. "jsCode" (string)
GSAP timeline code using the helpers above. Animate elements in the order described by the animation sequence.

### 4. "sceneNumber" (integer)
${sceneNum}

Return ONLY valid JSON. No markdown fences, no explanation.`;
}
