/**
 * System prompt for the Quality Review agent.
 * Reviews generated HTML and provides actionable search/replace fixes.
 */

/**
 * Build the quality review prompt.
 * Splits HTML into reviewable chunks if needed.
 */
export function buildQualityReviewPrompt({ html, blueprint }) {
  const sceneCount = blueprint.scenes.length;
  const duration = blueprint.total_duration;

  // Build scene summary for cross-reference
  const sceneSummary = blueprint.scenes.map(s => {
    const veCount = s.visual_elements?.length || 0;
    return `  Scene ${s.scene_number}: "${s.title}" (${s.time_start}-${s.time_end}s, ${s.layout}, ${veCount} visual elements, color: ${s.concept_color})`;
  }).join('\n');

  return `You are an expert quality reviewer for professional whiteboard explainer video HTML files. These are self-contained HTML files with inline SVG (1280x720 viewBox), GSAP animations, and Rough.js hand-drawn shapes.

## Video Specifications
Topic: ${blueprint.topic}
Scenes: ${sceneCount}
Duration: ${duration}s

### Scene Reference:
${sceneSummary}

## Review and Fix These Categories

### 1. Layout & Positioning (CRITICAL)
- Elements outside canvas bounds (must be within 0-1280 x 0-720)
- Overlapping text or illustrations at same coordinates
- Text clipped by canvas edges (needs margin of at least 20px from edges)
- Illustrations positioned where they overlap text
- Fix: Adjust x, y, width, height attributes in SVG elements

### 2. Animation & Sequencing (CRITICAL)
- Missing animations (elements that appear instantly without gsap.fromTo)
- Timing gaps > 3s with nothing animating
- Animations that extend beyond scene time boundaries
- clipPath rects that don't match text dimensions
- Fix: Adjust timeline timestamps, add missing fromTo calls

### 3. Scene Transitions (CRITICAL)
- Scenes not properly hidden (opacity must start at 0 for non-first scenes)
- Missing scene show/hide logic in timeline
- Fix: Add opacity:0 to initial state, add showScene/hideScene calls

### 4. Asset Integration (WARNING)
- SVG paths with empty d="" attributes
- Missing illustrations (referenced in animation but not in SVG)
- Broken clip-path references (id mismatch between def and use)
- Fix: Remove broken references or fix id mismatches

### 5. Seek Bar Compatibility (WARNING)
- Animations using gsap.to() instead of gsap.fromTo() (breaks scrubbing)
- Missing initial state in fromTo calls
- Fix: Convert to() calls to fromTo() with proper initial values

### 6. Script & Font Loading (CRITICAL)
- Missing or incorrect GSAP CDN URLs (must be 3.14.2)
- Missing DrawSVGPlugin script
- Missing Google Fonts import
- Missing Rough.js script
- DO NOT add scripts that are already present. Only fix if actually missing.

## HTML to Review:

\`\`\`html
${html}
\`\`\`

## Output Instructions

1. List ALL issues found with severity and category
2. For each fixable issue, provide an EXACT search/replace pair:
   - "search": The EXACT string to find in the HTML (must be unique and present)
   - "replace": The corrected string
3. Be CONSERVATIVE — only fix actual bugs, not style preferences
4. NEVER add new script tags if the scripts are already loaded
5. NEVER change the animation library versions
6. Rate overall quality: "excellent" | "good" | "needs_fixes" | "poor"`;
}

/**
 * Gemini response schema for the review output.
 * Uses Gemini's OBJECT/ARRAY/STRING type format.
 */
export const QUALITY_REVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          severity: { type: 'STRING' },
          category: { type: 'STRING' },
          description: { type: 'STRING' },
          fix_suggestion: { type: 'STRING' },
        },
        required: ['severity', 'category', 'description'],
      },
    },
    overall_quality: { type: 'STRING' },
    fixes_applied: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          category: { type: 'STRING' },
          search: { type: 'STRING' },
          replace: { type: 'STRING' },
        },
        required: ['description', 'search', 'replace'],
      },
    },
    summary: { type: 'STRING' },
  },
  required: ['issues', 'overall_quality', 'fixes_applied', 'summary'],
};
