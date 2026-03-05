/**
 * Research planner prompt for v4 pipeline.
 * Generates scene plan with image generation prompts and asset group definitions.
 */

export function buildResearchPlannerPrompt({ topic, duration, audience, instructions }) {
  return `You are a senior content director planning an educational explainer video.

## Task
Plan a whiteboard-style explainer video about: "${topic}"
Duration: ${duration || 60} seconds
Target audience: ${audience || 'general audience'}
${instructions ? `Special instructions: ${instructions}` : ''}

## Output Format
Return a JSON object with this exact structure:

{
  "title": "Video title",
  "total_duration": ${duration || 60},
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene Title",
      "duration": 12,
      "time_start": 0,
      "key_concept": "One sentence explaining what this scene teaches",
      "narration_text": "Full narration script for this scene. Write it as if you're a teacher explaining to a student. Keep it natural and conversational.",
      "image_prompt": "A detailed prompt for generating an educational infographic image for this scene. Describe the exact visual layout: what goes where, what diagrams/charts/icons to include, what text labels to show. Be specific about colors, positioning (top-left, center, bottom-right), and visual hierarchy. Style: clean educational whiteboard infographic on cream/light background, hand-drawn aesthetic.",
      "asset_groups": [
        {
          "group_id": 1,
          "label": "title",
          "description": "The scene title text at the top",
          "type": "text",
          "time_start": 0,
          "time_end": 1.5,
          "narration_segment": "First part of narration that plays while this group appears"
        },
        {
          "group_id": 2,
          "label": "main_diagram",
          "description": "The central diagram showing...",
          "type": "diagram",
          "time_start": 1.5,
          "time_end": 5.0,
          "narration_segment": "Next part of narration..."
        }
      ],
      "concept_color": "#2b7ec2"
    }
  ],
  "color_palette": {
    "scene1": "#2b7ec2",
    "scene2": "#cc3333",
    "scene3": "#1e8c5a"
  }
}

## Rules

1. **Scene count**: For a ${duration || 60}s video, use ${Math.max(3, Math.min(8, Math.round((duration || 60) / 15)))} to ${Math.max(4, Math.min(10, Math.round((duration || 60) / 10)))} scenes. Each scene should be 8-20 seconds.

2. **Asset groups per scene**: 3-7 groups. Each group is a visually distinct element that will be animated separately:
   - "text" type: titles, subtitles, body text, labels
   - "diagram" type: flowcharts, cycles, graphs, visual explanations
   - "icon" type: simple icons representing concepts
   - "chart" type: bar charts, pie charts, data visualizations
   - "mixed" type: complex visual elements combining text and graphics

3. **Timing**: Asset groups within a scene should have sequential, non-overlapping timing. Each group's time_start/time_end is relative to the scene start (0 = scene start). Groups should fill the scene duration naturally.

4. **Image prompts**: Write detailed, specific prompts that describe:
   - Exact layout (what goes top-left, center, bottom-right, etc.)
   - Visual style (hand-drawn, whiteboard marker, educational infographic)
   - Colors (use the scene's concept_color for accents)
   - Text content to include in the image
   - Diagram/chart specifics (what data to show, how to visualize it)
   - Background: cream/off-white, like a whiteboard
   - Resolution: 1920×1080, 16:9 aspect ratio

5. **Narration**: Write conversational, teacher-like narration. Each asset_group's narration_segment should correspond to what's being shown.

6. **Color palette**: Assign distinct colors to each scene. Available: #2b7ec2 (blue), #cc3333 (red), #1e8c5a (green), #cc7722 (orange), #8844aa (purple), #1a8a8a (teal), #2266bb (navy), #993344 (wine).

7. **Concept progression**: Start simple, build complexity. Each scene should teach ONE key concept.

Return ONLY the JSON object. No markdown fences, no explanation.`;
}
