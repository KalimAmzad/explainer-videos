/**
 * v7 Research Planner prompt.
 * Haiku plans content AND specifies assets per scene.
 * No layout, no positions, no animation types — but DOES specify what assets to generate.
 */
export function buildResearchPlannerPrompt({ topic, duration, audience, instructions }) {
  const sceneCount = Math.max(3, Math.min(8, Math.round((duration || 60) / 12)));

  return `You are a senior educational content director planning a whiteboard explainer video.

## Task
Plan the educational content AND asset requirements for a whiteboard-style explainer video.

Topic: "${topic}"
Duration: ${duration || 60} seconds
Target audience: ${audience || 'general audience'}
${instructions ? `Special instructions: ${instructions}` : ''}

## Output Format
Return a JSON object:

{
  "topic": "${topic}",
  "total_duration": ${duration || 60},
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene Title",
      "duration": 12,
      "key_concept": "One sentence summary of what this scene teaches",
      "teaching_points": [
        "First teaching point",
        "Second teaching point",
        "Third teaching point"
      ],
      "visual_concept": "Freeform description of what to show visually — diagrams, icons, illustrations. Describe the visual narrative, not positions or sizes.",
      "narration": "Full narration script — exactly what the narrator says for this scene.",
      "assets_needed": [
        {
          "asset_id": "s1_diagram_name",
          "asset_type": "svg",
          "generation_method": "llm_svg",
          "description": "Detailed description for the SVG generator. Include shapes, labels, connections.",
          "sub_elements": [
            { "sub_id": "part1", "description": "First animatable part" },
            { "sub_id": "part2", "description": "Second animatable part" }
          ]
        }
      ]
    }
  ]
}

## Rules

### Scene structure
1. **Scene count**: Plan ${sceneCount} to ${sceneCount + 2} scenes for a ${duration || 60}s video. Each scene should be 8-15 seconds.
2. Scene 1 hooks the viewer. Middle scenes teach core concepts. Final scene summarizes or calls to action.
3. **teaching_points**: 2-4 concise bullet points per scene. These become on-screen text.

### Narration
4. **narration**: Natural, conversational speech. ~2.5 words/second pace.
   - A 12-second scene = ~30 words of narration.
   - Write complete sentences. Each sentence aligns with a visual element.

### Visual concept
5. **visual_concept**: Describe WHAT to show, not HOW or WHERE. Examples:
   - "A circular flow diagram connecting three stages with labels Cue, Routine, Reward"
   - "Side-by-side contrast: old messy desk vs organized desk with labels"
   - "A numbered checklist building up item by item with icons beside each"

### Assets
6. **assets_needed**: Specify 0-3 visual assets per scene. Only request assets you'll actually show.
   - Use **llm_svg** for: diagrams, flow charts, icons, simple illustrations, geometric concepts
   - Use **icons8** for: single concept icons (productivity, brain, clock, goal, etc.)
   - Use **nano_banana** for: rich photo-realistic illustrations only (rarely needed)
   - Text and simple styled text need NO asset — the scene composer handles text directly.
   - **asset_id** format: "s{scene_number}_{descriptive_name}" (e.g., "s1_habit_loop", "s2_brain_icon")
   - For SVGs with multiple animatable parts, specify sub_elements (max 4 per asset).
   - For icons/images, sub_elements is null or omitted.

### Duration
7. Distribute the ${duration || 60} seconds across scenes. Ensure total equals ${duration || 60}.

## Do NOT specify
- Layout positions (x, y, width, height, left, right)
- Animation types or timing
- Colors, fonts, or styling (handled by theme system)
- Technical implementation details

Return ONLY the JSON object. No markdown fences, no explanation.`;
}
