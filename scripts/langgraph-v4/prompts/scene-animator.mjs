/**
 * Scene animator prompt for v4 pipeline.
 * Generates Revideo TypeScript scene code from decomposed asset groups.
 */

export function buildSceneAnimatorPrompt({ sceneNotes, groups, sceneNum, canvasWidth, canvasHeight }) {
  const groupDescriptions = groups.map(g => {
    const pos = g.bbox_frac;
    const timing = `${g.time_start.toFixed(1)}s → ${g.time_end.toFixed(1)}s`;
    const duration = (g.time_end - g.time_start).toFixed(1);
    return `  Group ${g.group_id} "${g.label}" (${g.type}):
    Position: x=${(pos.x * 100).toFixed(0)}% y=${(pos.y * 100).toFixed(0)}% w=${(pos.w * 100).toFixed(0)}% h=${(pos.h * 100).toFixed(0)}%
    Timing: ${timing} (${duration}s)
    Narration: "${g.narration}"
    ${g.text_content ? `Text content: "${g.text_content}"` : 'Image asset (cropped PNG)'}
    Crop file: scene${sceneNum}_group${g.group_id}.png`;
  }).join('\n\n');

  return `You are an expert Revideo animator creating Scene ${sceneNum} for an educational explainer video.

## Canvas
- Width: ${canvasWidth}px, Height: ${canvasHeight}px (16:9)
- Background: cream/off-white (#f5f3ef)

## Scene: "${sceneNotes.title}" (${sceneNotes.duration}s)
Key concept: ${sceneNotes.key_concept}

## Asset Groups (in animation order)
${groupDescriptions}

## Revideo Scene Code Requirements

Write a complete Revideo scene file. The scene should animate each asset group in sequence.

### Animation Strategy

**For TEXT type groups** (titles, labels, body text):
- Recreate the text using Revideo's \`<Txt>\` component
- Use typewriter effect: \`yield* txtRef().text('full text', duration)\`
- Font: sans-serif for body, bold for titles
- Color: #333 for body, scene color for emphasis

**For DIAGRAM/ICON/CHART/MIXED type groups** (visual assets):
- Load the cropped PNG using \`<Img>\` component
- Animate with a clip-rect reveal effect (left-to-right or top-to-bottom)
- Use \`yield* imgRef().opacity(0, 0).to(1, 0.3)\` for simple fade
- Or use clip animation for draw-on effect

### Positioning
- Convert fractional bbox coordinates to pixel positions:
  - x_px = bbox.x * ${canvasWidth}
  - y_px = bbox.y * ${canvasHeight}
  - Position is the CENTER of the element in Revideo

### Template

\`\`\`typescript
import {makeScene2D, Img, Txt, Rect} from '@revideo/2d';
import {createRef, waitFor, chain, all} from '@revideo/core';

export default makeScene2D(function* (view) {
  // Background
  view.fill('#f5f3ef');

  // Group 1: Title text
  const title = createRef<Txt>();
  view.add(
    <Txt
      ref={title}
      x={centerX}
      y={centerY}
      fontSize={48}
      fontWeight={700}
      fill={'#333'}
      text={''}
    />
  );
  yield* title().text('Scene Title', 1.5);
  yield* waitFor(0.3);

  // Group 2: Diagram image
  const diagram = createRef<Img>();
  view.add(
    <Img
      ref={diagram}
      src={'./scene1_group2.png'}
      x={centerX}
      y={centerY}
      width={imgWidth}
      opacity={0}
    />
  );
  yield* diagram().opacity(1, 0.8);
  yield* waitFor(2);

  // ... more groups
});
\`\`\`

### Rules
1. Import paths for images: \`'./scene${sceneNum}_group{N}.png'\` (relative to scene file)
2. All positions in PIXELS (convert from fractional bbox)
3. Each group animates IN ORDER matching the timing
4. Use \`waitFor()\` between groups to match narration timing
5. Total scene duration should match ${sceneNotes.duration}s
6. For text groups with known text_content, recreate the text (don't use PNG)
7. For visual groups, use the cropped PNG image

### Output
Return ONLY a JSON object with exactly 2 fields:
{
  "tsCode": "// The complete TypeScript scene code as a string",
  "sceneNumber": ${sceneNum}
}

No markdown fences, no explanation — ONLY valid JSON.`;
}
