/**
 * Prompt and schema for the Asset Decomposition agent (Node 3).
 * Breaks complex SVG/PNG assets into individually-animatable elements.
 */

/**
 * Build the decomposition prompt for a specific scene's asset.
 */
export function buildDecompositionPrompt({ sceneNumber, topic, title, description, width, height }) {
  return `You are an SVG illustration expert. Analyze this hand-drawn whiteboard sketch and decompose EVERY visible element into separate SVG shapes that can be animated individually.

CONTEXT:
- Scene ${sceneNumber} of a whiteboard explainer video about "${topic}"
- Scene title: "${title}"
- Illustration shows: "${description}"

YOUR TASK:
Identify EVERY distinct visual element in this image. Do NOT miss anything.

SVG RULES:
1. Coordinate system: 0,0 to ${width},${height} pixels (matching image exactly)
2. Keep paths SIMPLIFIED — clean curves with minimal control points
3. Prefer SVG primitives where possible (circle, ellipse, rect, line, polyline, path)
4. Each element's SVG code must be SELF-CONTAINED (a single element or small group)
5. All strokes: stroke-linecap="round" stroke-linejoin="round"
6. Do NOT include text/letters — only shapes and drawings
7. Default styling: fill="none" stroke="#333" stroke-width="2"

ELEMENT ORDERING (for progressive reveal animation):
- order=1: Main subject / largest element (drawn FIRST on whiteboard)
- order=2-3: Secondary subjects, supporting elements
- order=4+: Detail elements (hatching, shading, patterns)
- Higher: Annotations (arrows, pointers, callout lines)
- Last: Connectors, frames, borders

BOUNDING BOX: Use fractions (0.0 to 1.0) of image dimensions.
CATEGORY: main_subject | secondary_subject | detail | annotation | connector
COMPLEXITY: simple | moderate | complex

Target 5-15 elements. Every visible mark in the image should belong to an element.`;
}

/**
 * Gemini response schema for element decomposition.
 */
export const DECOMPOSITION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    elements: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          order: { type: 'INTEGER' },
          description: { type: 'STRING' },
          category: { type: 'STRING' },
          svg_code: { type: 'STRING' },
          bbox: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' },
              y: { type: 'NUMBER' },
              w: { type: 'NUMBER' },
              h: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'w', 'h'],
          },
          complexity: { type: 'STRING' },
        },
        required: ['id', 'order', 'description', 'category', 'svg_code', 'bbox'],
      },
    },
    element_count: { type: 'INTEGER' },
  },
  required: ['elements', 'element_count'],
};
