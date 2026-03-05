/**
 * SVG pipeline v3.2 — LLM-generated primitive SVG code.
 * NO MORE PNG→potrace tracing. Gemini writes SVG code directly.
 */
import { callGeminiJSON } from './gemini-client.mjs';

const SVG_CODE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    svgContent: { type: 'STRING' },
  },
  required: ['svgContent'],
};

/**
 * Generate SVG code using Gemini — primitive elements only.
 * @param {string} description - What to draw
 * @param {string} [svgElementsHint] - Hint about what primitives to use
 * @returns {Promise<{svg: string, width: number, height: number}>}
 */
export async function generateSvgCode(description, svgElementsHint) {
  const hint = svgElementsHint ? `\nElement hint: ${svgElementsHint}` : '';

  const prompt = `Generate SVG code for a whiteboard-style illustration of: ${description}
${hint}

STRICT RULES:
1. Use ONLY these SVG elements: <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <path>
2. For <path>: maximum 5 commands per path. The final command MUST be Z (close path). If a path has only 1 command, set stroke-width="3" to make it visible.
3. FORBIDDEN elements: <text>, <tspan>, <image>, <linearGradient>, <radialGradient>, <clipPath>, <filter>, <mask>, <use>, <symbol>, <defs>
4. All elements must have: fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
5. Exception: for filled areas (like an eye dot), use fill="#333" stroke="none"
6. ViewBox is 0 0 200 200 — center your drawing within this space
7. Hand-drawn feel: use slightly imperfect coordinates (e.g., 101 not 100, 49 not 50)
8. Each distinct visual part MUST be a SEPARATE element (head = one circle, body = one line, arm = another line). Do NOT merge into a single path.
9. Keep it SIMPLE: stick figures, basic geometric shapes, minimal detail. Think whiteboard sketch, not detailed illustration.
10. Use stroke-dasharray for dotted/dashed lines where appropriate.

Return ONLY the SVG elements (no <svg> wrapper, no xmlns, no comments).
Output as JSON with a single field "svgContent" containing the SVG elements as a string.`;

  const result = await callGeminiJSON('gemini-2.5-flash', prompt, SVG_CODE_SCHEMA);
  const svgContent = result.svgContent || '';

  // Wrap in SVG tag for saving to disk
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${svgContent}</svg>`;

  return { svg, svgContent, width: 200, height: 200 };
}
