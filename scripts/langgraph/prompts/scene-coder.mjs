/**
 * Scene coder prompt v3.3 — optimized for Claude Sonnet.
 * Produces professional educational whiteboard tutorial quality:
 * natural hand-drawn layout, stroke draw-on animation, clean composition.
 *
 * Key improvements over v3.2:
 * - Concrete reference example from proven 15-scene video
 * - Layout composition principles (visual hierarchy, breathing room, zones)
 * - Precise clip-path math with worked examples
 * - Professional educational tutorial aesthetic guidance
 */

export function buildSceneCoderPrompt({ sceneNotes, assets, researchNotes, sceneIndex }) {
  const sceneNum = sceneNotes.scene_number || sceneIndex + 1;
  const totalDuration = researchNotes.total_duration || 60;
  const sceneDuration = sceneNotes.duration || 10;
  const colorPalette = researchNotes.color_palette || {};
  const timeStart = sceneNotes.time_start || 0;
  const sceneColor = sceneNotes.concept_color || colorPalette[`scene${sceneNum}`] || '#2b7ec2';
  const totalScenes = researchNotes.scenes?.length || 5;

  // Build asset section — include full SVG content for small generated assets
  let assetSection = '';
  if (assets && assets.length > 0) {
    assetSection = assets.map((a, i) => {
      const defId = `asset_s${sceneNum}_${a.role}`;
      const w = a.dimensions?.width || 200;
      const h = a.dimensions?.height || 200;

      if (a.source === 'icons8') {
        return `**${a.role}** [Icons8 PNG]: "${a.description}"
  → Embed: \`<g id="s${sceneNum}_${a.role}_icon" opacity="0" transform="translate(X, Y) scale(0.8)"><use href="#${defId}"/></g>\`
  → Animate: \`tl.add(fadeIn('#s${sceneNum}_${a.role}_icon', 0.8), TIME)\`
  → Native: ${w}×${h}px. PNGs cannot stroke-draw, use fadeIn only.`;
      }

      const svgPreview = a.svgContent
        ? `\n  SVG elements to embed inline:\n  ${a.svgContent}`
        : '\n  (No SVG content — create simple inline shapes)';

      return `**${a.role}** [SVG primitives]: "${a.description}" (${w}×${h})${svgPreview}
  → Wrap in: \`<g id="s${sceneNum}_illust_${a.role}" opacity="0" transform="translate(X, Y) scale(S)">\`
  → Animate: \`tl.add(drawOnGroup('s${sceneNum}_illust_${a.role}', DURATION), TIME)\``;
    }).join('\n\n');
  } else {
    assetSection = 'No external assets — create simple inline SVG shapes (circles, lines, rects, short paths).';
  }

  return `You are an expert whiteboard animator creating Scene ${sceneNum} of ${totalScenes} for a professional educational tutorial video.

Think of yourself as a skilled teacher standing at a whiteboard with a marker. You draw concepts step-by-step while explaining them. The audience should feel like they're watching a human hand draw and write on a whiteboard — like VideoScribe, Doodly, or Khan Academy style.

## Canvas & Typography
- SVG viewBox: 0 0 1280 720 (16:9, cream background already set)
- Fonts (Google Fonts, already loaded):
  - **"Cabin Sketch"** — titles (44-56px, font-weight="700"), bold hand-lettered feel
  - **"Caveat"** — body text (32-36px), natural handwriting
  - **"Permanent Marker"** — emphasis/key terms (28-32px), bold marker strokes
  - **"Patrick Hand"** — labels/annotations (20-28px), small neat handwriting
- Scene accent color: ${sceneColor}
- Text color: #333 (dark gray, like a real marker on whiteboard)

## Scene Content
**Title:** "${sceneNotes.title}"
**Key concept:** ${sceneNotes.key_concept}
**Duration:** ${sceneDuration}s (absolute start: ${timeStart}s, ends at ${timeStart + sceneDuration}s)
**Layout direction:** ${sceneNotes.layout_notes || 'Title top, body left, illustration right'}
**Animation sequence:** ${sceneNotes.animation_notes || 'Title wipes, body lines stagger, illustration draws on'}

**Body lines (the "teaching notes"):**
${(sceneNotes.body_lines || []).map((l, i) => `  ${i + 1}. ${l}`).join('\n')}

## Available Assets
${assetSection}

## Color Palette
${JSON.stringify(colorPalette, null, 2)}

---

## LAYOUT COMPOSITION PRINCIPLES

Design this scene like an infographic panel on a whiteboard. Follow these principles:

1. **Visual hierarchy**: Title at top → supporting text → main visual → labels/annotations
2. **Breathing room**: Leave 40-60px margins on all sides. Never place content below y=670 (progress bar area) or above y=20.
3. **Two-zone layout**: Typically text on one side (40% width), illustration on the other (60% width). Or centered diagram with text above/below.
4. **No overlap**: Text and illustrations must never overlap. Plan your coordinates carefully.
5. **Scale assets generously**: The main illustration should be prominent — use scale(2.0) to scale(3.0) for 200×200 assets, positioned to fill the illustration zone.
6. **Consistent vertical rhythm**: Body text lines should be ~45-50px apart vertically.
7. **Labels with arrows**: When labeling parts of an illustration, draw an arrow FROM the label TO the illustration element. Use the scene color for arrows.
8. **Underlines**: Add a hand-drawn wavy underline beneath the title using a path with Q (quadratic curve) commands.

---

## ANIMATION RULES

### Three animation types ONLY:

| Type | Use For | Helper Function |
|------|---------|----------------|
| **Stroke draw-on** | Paths, lines, arrows, underlines, shapes with strokes | \`tl.add(drawOn('elementId', duration), time)\` |
| **Clip-rect text wipe** | ALL text — titles, body, labels, formulas | \`tl.add(wipe('cr_s${sceneNum}_name', targetWidth, duration), time)\` |
| **Fade-in** | Rough.js shapes, Icons8 PNG icons, boxed groups | \`tl.add(fadeIn('#elementId', duration), time)\` |

**NEVER** fade in text. Text must always use clip-rect wipe (left-to-right reveal like a hand writing it).
**NEVER** fade in SVG paths/lines. They must stroke-draw-on.

### Clip-Path Math (CRITICAL — prevents invisible text)

For EVERY text element you create, you MUST define a matching clipPath. The math:

**Left-aligned text** (text-anchor="start" or no anchor):
\`\`\`
clipRect.x = text.x
clipRect.y = text.y - fontSize
clipRect.height = fontSize × 1.4
clipRect.width = 0  (initial, animated to targetWidth)
targetWidth = charCount × fontSize × 0.55 + 20
\`\`\`

**Centered text** (text-anchor="middle"):
\`\`\`
estimatedWidth = charCount × fontSize × 0.55 + 20
clipRect.x = text.x - (estimatedWidth / 2)    ← CRITICAL: offset from center!
clipRect.y = text.y - fontSize
clipRect.height = fontSize × 1.4
clipRect.width = 0  (animated to estimatedWidth)
\`\`\`

**Worked example**: Title "${sceneNotes.title}" centered at x=640, fontSize=48
  charCount = ${(sceneNotes.title || '').length}
  estimatedWidth = ${(sceneNotes.title || '').length} × 48 × 0.55 + 20 = ${Math.round((sceneNotes.title || '').length * 48 * 0.55 + 20)}
  clipRect.x = 640 - ${Math.round((sceneNotes.title || '').length * 48 * 0.55 + 20)}/2 = ${Math.round(640 - ((sceneNotes.title || '').length * 48 * 0.55 + 20) / 2)}
  clipRect.y = 55 - 48 = 7
  clipRect.height = 48 × 1.4 = 67

### gsap.fromTo() rule
All animations must use \`gsap.fromTo()\` pattern (not gsap.set + gsap.to). The helpers (drawOn, wipe, fadeIn) already handle this. For any custom animations, use fromTo directly. This ensures the seek bar works correctly at any position.

### Rough.js Shapes (hand-drawn wobbly boxes/frames)
Generate in jsCode using \`rc\` (already initialized). Example:
\`\`\`javascript
if (rc) {
  const frame = rc.rectangle(x, y, w, h, {
    roughness: 1.5, bowing: 2, stroke: '${sceneColor}', strokeWidth: 2, fill: 'none'
  });
  addRoughShape(frame, 'rough_s${sceneNum}_frame', 'scene${sceneNum}');
}
\`\`\`
- Use Rough.js OR SVG rect for a border — NEVER both (no double borders)
- Box sizing: width >= longest_text_chars × fontSize × 0.6 + 40px padding

### Scene Timing Pattern
All timestamps are ABSOLUTE seconds. Scene ${sceneNum} spans ${timeStart}s → ${timeStart + sceneDuration}s:

\`\`\`
${timeStart.toFixed(1)}s  ${sceneNum > 1 ? `Hide scene${sceneNum - 1}, show scene${sceneNum}` : `Show scene${sceneNum}`}
${(timeStart + 0.3).toFixed(1)}s  Rough.js frame fadeIn (1.0s)
${(timeStart + 0.5).toFixed(1)}s  Title wipe (1.2-1.5s)
${(timeStart + 2.0).toFixed(1)}s  Underline drawOn (0.4s)
${(timeStart + 2.5).toFixed(1)}s  Body lines wipe, staggered 0.4s apart (each 0.6-0.9s)
${(timeStart + Math.min(5.0, sceneDuration * 0.45)).toFixed(1)}s  Main illustration drawOnGroup (2.0-3.0s)
${(timeStart + Math.min(7.0, sceneDuration * 0.65)).toFixed(1)}s  Labels wipe + arrows drawOn (0.4-0.6s each)
${(timeStart + Math.min(8.5, sceneDuration * 0.8)).toFixed(1)}s  Supporting icon fadeIn (0.8s)
\`\`\`

Adjust times to fill ${sceneDuration}s naturally. Leave ~1s breathing room at the end.

---

## ID NAMING CONVENTION (strict)
- Scene group: \`id="scene${sceneNum}" class="scene"\`
- Clip paths: \`id="cp_s${sceneNum}_{name}"\` with rects: \`id="cr_s${sceneNum}_{name}"\`
- Stroke elements: \`id="s${sceneNum}_{name}"\` (e.g., \`s${sceneNum}_underline\`)
- Illustration groups: \`id="s${sceneNum}_illust_{role}"\`
- Rough.js shapes: \`id="rough_s${sceneNum}_{name}"\`

## Arrow Markers
Predefined arrow markers exist in <defs>. Use them on paths:
\`\`\`xml
<path d="M100 200 L200 200" stroke="${sceneColor}" stroke-width="2" marker-end="url(#arrow_${sceneColor.replace('#', '')})"/>
\`\`\`
Available colors: 333, 2b7ec2, cc3333, 1e8c5a, cc7722, 8844aa, 1a8a8a, 993344, 2266bb

---

## CONCRETE REFERENCE EXAMPLE

Here is a complete scene from a proven professional whiteboard video. Study its structure carefully and follow the same patterns:

**svgDefs:**
\`\`\`xml
<clipPath id="cp_s3_title"><rect id="cr_s3_title" x="60" y="21" width="0" height="62"/></clipPath>
<clipPath id="cp_s3_word"><rect id="cr_s3_word" x="200" y="125" width="0" height="56"/></clipPath>
<clipPath id="cp_s3_bpe"><rect id="cr_s3_bpe" x="640" y="137" width="0" height="39"/></clipPath>
<clipPath id="cp_s3_sub_un"><rect id="cr_s3_sub_un" x="152" y="225" width="0" height="39"/></clipPath>
<clipPath id="cp_s3_sub_believ"><rect id="cr_s3_sub_believ" x="293" y="225" width="0" height="39"/></clipPath>
\`\`\`

**svgBody:**
\`\`\`xml
<g id="scene3" class="scene">
  <g clip-path="url(#cp_s3_title)">
    <text x="60" y="65" font-family="'Cabin Sketch',cursive" font-size="44" font-weight="700" fill="#2b7ec2">Tokenization: Text → Numbers</text>
  </g>
  <g clip-path="url(#cp_s3_word)">
    <text x="200" y="165" font-family="'Permanent Marker',cursive" font-size="40" fill="#333">unbelievable</text>
  </g>
  <g clip-path="url(#cp_s3_bpe)">
    <text x="640" y="165" font-family="'Cabin Sketch',cursive" font-size="28" fill="#cc3333">Byte-Pair Encoding (BPE)</text>
  </g>
  <line id="s3_cut1" x1="290" y1="130" x2="290" y2="180" stroke="#cc3333" stroke-width="3" stroke-linecap="round" stroke-dasharray="4,3"/>
  <line id="s3_cut2" x1="425" y1="130" x2="425" y2="180" stroke="#cc3333" stroke-width="3" stroke-linecap="round" stroke-dasharray="4,3"/>
  <g id="s3_box_un" opacity="0">
    <rect x="140" y="220" width="100" height="50" rx="5" fill="none" stroke="#cc3333" stroke-width="2"/>
    <g clip-path="url(#cp_s3_sub_un)">
      <text x="190" y="253" text-anchor="middle" font-family="'Permanent Marker',cursive" font-size="28" fill="#cc3333">un</text>
    </g>
  </g>
  <g id="s3_box_believ" opacity="0">
    <rect x="270" y="220" width="150" height="50" rx="5" fill="none" stroke="#cc3333" stroke-width="2"/>
    <g clip-path="url(#cp_s3_sub_believ)">
      <text x="345" y="253" text-anchor="middle" font-family="'Permanent Marker',cursive" font-size="28" fill="#cc3333">believ</text>
    </g>
  </g>
  <path id="s3_arrow1" d="M190 270 L190 310" fill="none" stroke="#cc7722" stroke-width="2" marker-end="url(#arrowOrange)"/>
</g>
\`\`\`

**jsCode:**
\`\`\`javascript
tl.call(() => { hideScene('#scene2'); showScene('#scene3'); }, null, 30);
tl.add(wipe('cr_s3_title', 700, 1.3), 30.3);
tl.add(fadeIn('#s3_doc_icon', 0.5), 31.8);
tl.add(wipe('cr_s3_word', 400, 1.0), 32.0);
tl.add(wipe('cr_s3_bpe', 400, 0.8), 33.2);
tl.add(drawOn('s3_cut1', 0.5), 34.2);
tl.add(drawOn('s3_cut2', 0.5), 34.5);
tl.add(fadeIn('#s3_box_un', 0.5), 35.2);
tl.add(wipe('cr_s3_sub_un', 100, 0.5), 35.4);
tl.add(fadeIn('#s3_box_believ', 0.5), 36.0);
tl.add(wipe('cr_s3_sub_believ', 150, 0.5), 36.2);
tl.add(drawOn('s3_arrow1', 0.4), 37.8);
\`\`\`

Notice the patterns:
- Every text has a matching clipPath with correct x/y math
- Text inside boxed groups: box fades in, then text wipes inside it
- Arrows draw on (not fade), text wipes (not fades), boxes fade in
- Timing is sequential and tells a story — each element builds on the previous
- Comments with timestamps make the code readable

---

## YOUR OUTPUT

Return a JSON object with exactly 4 fields. No markdown fences, no explanation — ONLY valid JSON.

### 1. "svgDefs" (string)
All \`<clipPath>\` definitions for this scene's text elements. Every text element needs one.

### 2. "svgBody" (string)
The complete \`<g id="scene${sceneNum}" class="scene">\` group with all visual elements:
- Title with clip-path
- Wavy underline path
- Body text lines with clip-paths
- Illustration groups with assets embedded inline
- Labels, arrows, supporting elements

### 3. "jsCode" (string)
Runnable JavaScript that builds the GSAP timeline for this scene. Uses these pre-defined helpers:
- \`tl\` — the master GSAP timeline
- \`wipe(crId, targetWidth, duration)\` — clip-rect text reveal
- \`drawOn(elementId, duration)\` — stroke draw-on
- \`fadeIn(selector, duration)\` — opacity fade (Rough.js/icons only)
- \`drawOnGroup(groupId, duration)\` — stroke-draw all children
- \`showScene(selector)\` / \`hideScene(selector)\` — scene transitions
- \`rc\` — Rough.js SVG instance
- \`addRoughShape(node, id, parentSceneId)\` — attach Rough.js shape

### 4. "sceneNumber" (integer)
Just: ${sceneNum}`;
}
