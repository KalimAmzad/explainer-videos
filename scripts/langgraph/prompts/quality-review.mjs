/**
 * Prompts and schemas for the Quality Review agent.
 *
 * Two-phase review:
 * 1. Structural review → returns corrections for layout/animation nodes to re-process
 * 2. HTML-level fixes → search/replace on the final HTML for minor issues
 *
 * If structural issues are found, the graph loops back to animation node.
 * If only minor/no issues, fixes are applied directly and pipeline ends.
 */

/**
 * Build the quality review prompt.
 */
export function buildQualityReviewPrompt({ html, blueprint, iteration }) {
  const sceneCount = blueprint.scenes.length;
  const duration = blueprint.total_duration;

  const sceneSummary = blueprint.scenes.map(s => {
    const veCount = s.visual_elements?.length || 0;
    return `  Scene ${s.scene_number}: "${s.title}" (${s.time_start}-${s.time_end}s, layout: ${s.layout}, ${veCount} visual elements, color: ${s.concept_color})`;
  }).join('\n');

  const iterNote = iteration > 0
    ? `\n\nNOTE: This is review iteration ${iteration + 1}. Previous reviews found issues that were corrected. Focus on verifying the fixes were applied correctly and finding any remaining issues.\n`
    : '';

  return `You are an expert quality reviewer for professional whiteboard explainer video HTML files (VideoScribe/Doodly style). These are self-contained HTML files with inline SVG (1280x720 viewBox), GSAP animations, and Rough.js hand-drawn shapes.
${iterNote}
## Video Specifications
Topic: ${blueprint.topic}
Scenes: ${sceneCount}
Duration: ${duration}s

### Scene Reference:
${sceneSummary}

## Review Categories

### STRUCTURAL Issues (require re-processing by animation node)
These cannot be fixed with simple search/replace — they need layout recomputation:

1. **Overlapping content** — text overlapping illustrations, or elements at same coordinates
   → Correction: specify which scene, which elements overlap, and suggested new positions
2. **Off-canvas elements** — content outside 0-1280 x 0-720 bounds
   → Correction: specify which elements and what coordinates they should move to
3. **Timing problems** — dead gaps > 3s, animations extending past scene end time, wrong sequencing
   → Correction: specify which scene, what the timing issue is, and suggested fix
4. **Missing scene content** — scenes with no visible illustration or animation
   → Correction: specify which scene is missing content
5. **Layout misalignment** — title/body/illustration positions that don't match the intended layout
   → Correction: specify the correct positions for the misaligned elements

### HTML-LEVEL Issues (fixable with search/replace)
These are minor fixes applied directly to the HTML string:

6. **Clip-path mismatches** — rect width/x doesn't match text dimensions
7. **Missing opacity:0** — scene groups that should start hidden
8. **Color inconsistencies** — wrong hex colors for concept-coded elements
9. **Script/font loading** — missing CDN URLs (but NEVER add duplicates)
10. **Seek bar compatibility** — gsap.to() that should be gsap.fromTo()

## HTML to Review:

\`\`\`html
${html}
\`\`\`

## Output Instructions

Return a JSON object with:

1. **issues**: All issues found (severity: "critical" | "warning" | "info")
2. **overall_quality**: "excellent" | "good" | "needs_fixes" | "poor"
3. **structural_corrections**: Array of corrections that require re-processing (layout/animation changes). Each correction has:
   - "scene_number": which scene is affected
   - "category": "overlap" | "off_canvas" | "timing" | "missing_content" | "misalignment"
   - "description": what's wrong
   - "correction": specific fix instruction (e.g., "move illustration to x=600, y=100" or "extend scene 3 animation to fill gap from 25s to 28s")
4. **html_fixes**: Array of direct search/replace fixes for minor HTML issues
5. **needs_reprocessing**: boolean — true if structural_corrections is non-empty
6. **summary**: brief overall assessment

IMPORTANT:
- Be CONSERVATIVE — only flag actual bugs, not style preferences
- NEVER add script tags that are already present
- NEVER change library versions
- structural_corrections should only contain issues that genuinely need layout recomputation
- If the HTML looks good, set needs_reprocessing=false and overall_quality="good" or "excellent"`;
}

/**
 * Response schema for the quality review.
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
        },
        required: ['severity', 'category', 'description'],
      },
    },
    overall_quality: { type: 'STRING' },
    structural_corrections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          scene_number: { type: 'INTEGER' },
          category: { type: 'STRING' },
          description: { type: 'STRING' },
          correction: { type: 'STRING' },
        },
        required: ['scene_number', 'category', 'description', 'correction'],
      },
    },
    html_fixes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          search: { type: 'STRING' },
          replace: { type: 'STRING' },
        },
        required: ['description', 'search', 'replace'],
      },
    },
    needs_reprocessing: { type: 'BOOLEAN' },
    summary: { type: 'STRING' },
  },
  required: ['issues', 'overall_quality', 'structural_corrections', 'html_fixes', 'needs_reprocessing', 'summary'],
};
