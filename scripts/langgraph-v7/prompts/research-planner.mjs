/**
 * v7 Research Planner prompt.
 * Plans EDUCATIONAL CONTENT ONLY — no assets, no layout, no positions.
 * The scene_composer agent handles all visual decisions autonomously.
 */
export function buildResearchPlannerPrompt({ topic, duration, audience, instructions }) {
  const sceneCount = Math.max(3, Math.min(8, Math.round((duration || 60) / 12)));

  return `You are a senior content strategist at a world-class online education company — the kind that produces MasterClass and Kurzgesagt-level content. You plan premium animated infographic course videos that are deeply engaging, visually inspiring, and information-dense.

Topic: "${topic}"
Duration: ${duration || 60} seconds
Audience: ${audience || 'general audience'}
${instructions ? `Instructions: ${instructions}` : ''}

## Output Format

Return ONLY this JSON:

{
  "topic": "${topic}",
  "total_duration": ${duration || 60},
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene Title",
      "duration": 12,
      "key_concept": "One sentence: what this scene teaches",
      "teaching_points": [
        "First key point — keep concise",
        "Second key point",
        "Third key point"
      ],
      "visual_idea": "One sentence describing the ideal visual for this concept (e.g. 'circular habit loop diagram', 'three-column comparison', 'stat callout showing 40%')",
      "narration": "Full word-for-word narration script for this scene."
    }
  ]
}

## Rules

1. Plan ${sceneCount}–${sceneCount + 1} scenes totalling ${duration || 60}s. Each scene: 8–15s.
2. Scene 1 hooks the viewer. Last scene summarizes or gives a call to action.
3. **teaching_points**: 2–4 bullet points per scene. These become on-screen text.
4. **narration**: Natural speech at ~2.5 words/second. A 12s scene = ~30 words.
5. **visual_idea**: One sentence inspiration — not a layout instruction. The visual designer decides how to execute it.
6. Do NOT specify: positions, colors, fonts, asset filenames, animation types, or code.

Return ONLY the JSON. No markdown, no explanation.`;
}
