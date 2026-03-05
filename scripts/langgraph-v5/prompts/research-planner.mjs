/**
 * v5 Research planner prompt.
 * Plans scenes with detailed visual descriptions for Nano Banana image generation.
 */
export function buildResearchPlannerPrompt({ topic, duration, audience, instructions }) {
  const sceneCount = Math.max(3, Math.min(8, Math.round((duration || 60) / 12)));

  return `You are a senior educational content director planning a whiteboard explainer video.

## Task
Plan a whiteboard-style explainer video about: "${topic}"
Duration: ${duration || 60} seconds
Target audience: ${audience || 'general audience'}
${instructions ? `Special instructions: ${instructions}` : ''}

## Output Format
Return a JSON object:

{
  "title": "Video title",
  "total_duration": ${duration || 60},
  "color_palette": { "scene1": "#2b7ec2", "scene2": "#cc3333", ... },
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene Title",
      "duration": 12,
      "time_start": 0,
      "key_concept": "One sentence summary",
      "concept_color": "#2b7ec2",
      "body_lines": [
        "First teaching point with *key terms* emphasized",
        "Second teaching point",
        "Third teaching point"
      ],
      "visual_description": "Detailed description of how this scene should look as an educational infographic. Describe the layout: what goes where (top-left, center, bottom-right). What diagrams, icons, or charts to include. What text labels to show. Be specific about visual elements — arrows, circles, boxes, flow diagrams, comparisons, timelines, etc. Think of it as a whiteboard that a teacher has drawn on with markers.",
      "animation_sequence": "Describe the order elements should appear: 1) Title draws in at top 2) Main diagram draws stroke by stroke 3) Labels appear next to diagram parts 4) Body text writes in on the left 5) Supporting icon fades in",
      "image_prompt": "Generate an educational whiteboard infographic on a cream/off-white background. [VERY DETAILED description of the exact visual layout, including all text content, diagram shapes, icons, colors, and positioning. This must be specific enough for an AI image generator to produce a clean, well-composed infographic panel. Style: hand-drawn marker aesthetic, educational, clean with good spacing. Resolution: widescreen 16:9 aspect ratio.]"
    }
  ]
}

## Rules

1. **${sceneCount}-${sceneCount + 2} scenes** for a ${duration || 60}s video. Each 8-15 seconds.

2. **body_lines**: 3-5 short teaching notes per scene. Use *asterisks* for key terms.

3. **visual_description**: Describe the scene as if briefing an illustrator. Include:
   - Layout zones (title area, main visual area, text area)
   - Specific diagrams/charts with their data
   - Icon descriptions
   - Color usage (use concept_color for accents)
   - Text labels that appear ON the illustration

4. **animation_sequence**: Number each element in the order it should be drawn/revealed. Think: "what does the teacher draw first, second, third?"

5. **image_prompt**: Write a production-ready prompt for Gemini image generation. Must include:
   - "Educational whiteboard infographic on cream/off-white background"
   - Exact text content to render in the image
   - Specific visual elements with positions
   - "Hand-drawn marker style, clean educational aesthetic"
   - "16:9 widescreen aspect ratio, 1280x720"

6. **Color palette**: Assign each scene a distinct accent color from: #2b7ec2 (blue), #cc3333 (red), #1e8c5a (green), #cc7722 (orange), #8844aa (purple), #1a8a8a (teal).

7. **Concept progression**: Simple → complex. Each scene = ONE key concept.

Return ONLY the JSON object. No markdown fences.`;
}
