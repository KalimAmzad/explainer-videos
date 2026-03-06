/**
 * v7 Asset SVG Generation prompt.
 * Haiku generates hand-drawn SVG illustrations for non-text visual assets.
 * If the asset has sub_elements, creates named <g> groups for progressive animation.
 */
export function buildAssetSvgGenPrompt({ asset, theme }) {
  const palette = theme?.palette || {};
  const strokeWidth = theme?.strokeWidth || 2.5;
  const primaryFont = theme?.primaryFont || 'Caveat';

  const subElementsSection = asset.sub_elements
    ? `
## SUB-ELEMENT GROUPS (REQUIRED)

This SVG must contain named groups for progressive draw-on animation. Create one <g> group per sub-element:

${asset.sub_elements.map((sub, i) => `${i + 1}. <g id="${asset.asset_id}__${sub.sub_id}">
   Description: ${sub.description}
   Must be independently visible and meaningful when shown alone.
   </g>`).join('\n\n')}

Rules for sub-element groups:
- Use double underscore (__) separator: id="${asset.asset_id}__{sub_id}"
- Each group must contain complete visual elements (paths, shapes, text) for that part.
- Groups should NOT overlap — each part occupies its own visual space.
- Draw connecting elements (arrows, lines between parts) in the group they point TO.
- Every visual element must be inside exactly one group.`
    : `
## STRUCTURE

Create a single cohesive SVG illustration. No sub-element groups are needed — the entire SVG will animate as one unit.`;

  return `You are an expert SVG illustrator specializing in hand-drawn, whiteboard-style educational graphics.

## TASK

Generate an SVG illustration for a whiteboard explainer video.

Description: ${asset.description}
Asset ID: ${asset.asset_id}

## SPECIFICATIONS

- ViewBox: "0 0 400 300" (or adjust proportions to fit the content, max 500 in any dimension)
- Style: Hand-drawn, marker aesthetic — slightly imperfect lines, organic curves
- NO perfect geometric shapes — wobble circles slightly, don't use exact right angles
- Stroke width: ${strokeWidth}px for primary strokes, ${strokeWidth * 0.6}px for detail strokes

## COLOR PALETTE

Use these theme colors:
- Primary: ${palette.primary || '#2b7ec2'} — main structural elements, outlines
- Secondary: ${palette.secondary || '#cc3333'} — emphasis, highlights, key labels
- Accent 1: ${palette.accent1 || '#1e8c5a'} — category/group differentiation
- Accent 2: ${palette.accent2 || '#cc7722'} — secondary category/group differentiation
- Text: ${palette.text || '#333333'} — labels, annotations

## FONT

Use font-family="${primaryFont}, cursive" for all text elements. Keep text concise — labels and short phrases only.
${subElementsSection}

## SVG QUALITY RULES

1. Use <path> elements with hand-drawn d attributes (slightly wobbly control points).
2. For circles, use <ellipse> or <path> with slight irregularity — not perfect <circle>.
3. For rectangles, use <path> with rounded, imperfect corners — not <rect>.
4. Include stroke="..." and fill="..." attributes on shapes. Use fill="none" for outlined shapes.
5. Add slight variations in stroke-width (e.g., 2.3, 2.7 instead of always 2.5).
6. Keep the SVG clean and semantic — no unnecessary wrappers or empty groups.
7. Ensure all text has appropriate font-size (14-22px range for labels, 24-32px for titles).
8. Use text-anchor="middle" for centered labels.
9. Include xmlns="http://www.w3.org/2000/svg" on the root <svg> element.
10. Total SVG size should be reasonable — aim for under 5KB.

## OUTPUT

Return ONLY the raw SVG markup. No markdown fences, no explanation, no wrapping.
Start with <svg and end with </svg>.`;
}
