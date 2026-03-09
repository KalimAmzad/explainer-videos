/**
 * v9 Content Planner prompts — SIMPLIFIED.
 *
 * Theme design + scene topic breakdown ONLY.
 * No narration scripts, no visual specs, no asset manifests.
 * The scene coder handles all creative decisions.
 */

export function buildThemePrompt({ topic, audience, instructions }) {
  return `You are a motion design art director for premium animated videos (MasterClass, Kurzgesagt quality).

## Task
Design a visual theme for: "${topic}"
Audience: ${audience || 'general audience'}
${instructions ? `Instructions: ${instructions}` : ''}

## Output — JSON only
{
  "background": "#0f1117",
  "primaryFont": "Inter",
  "headingFont": "Space Grotesk",
  "palette": {
    "primary": "#6366f1",
    "secondary": "#f59e0b",
    "accent1": "#10b981",
    "accent2": "#ec4899",
    "text": "#f1f5f9"
  },
  "strokeWidth": 2
}

## Rules
1. **background**: Dark, cinematic (#0f1117, #0d1117, #111827, #0f172a)
2. **primaryFont**: One of: "Inter", "DM Sans", "Plus Jakarta Sans", "Nunito"
3. **headingFont**: Same or "Space Grotesk" for tech topics
4. **palette**: 5 colors that pop against dark background
5. **strokeWidth**: 2

Return ONLY the JSON object.`;
}

export function buildContentPrompt({ topic, duration, audience, instructions, maxScenes }) {
  const sceneCount = maxScenes || Math.max(3, Math.min(8, Math.round((duration || 60) / 15)));

  return `You are a senior content strategist for world-class educational videos.

Topic: "${topic}"
Duration: ${duration || 60} seconds
Audience: ${audience || 'general audience'}
${instructions ? `Instructions: ${instructions}` : ''}

## Task
Break this topic into ${sceneCount} scenes. Each scene covers ONE focused concept.

## Output — JSON only
{
  "topic": "${topic}",
  "total_duration": ${duration || 60},
  "scenes": [
    {
      "scene_number": 1,
      "title": "Scene Title",
      "estimated_duration": 15,
      "key_concept": "One sentence: what this scene teaches",
      "content_points": [
        "First key point with specific data/examples",
        "Second key point",
        "Third key point"
      ],
      "suggested_visuals": "Brief description of what could be SHOWN (not how). E.g. 'BPE merge table showing character pairs', 'embedding space coordinate plot', 'attention heatmap matrix'"
    }
  ]
}

## Rules
1. ${sceneCount} scenes totalling ~${duration || 60}s. Each scene: 10–25s.
2. Scene 1 hooks the viewer with a compelling question or surprising fact.
3. Last scene summarizes or gives a call to action.
4. **content_points**: 2–5 specific, detailed points per scene. Include numbers, formulas, examples.
5. **suggested_visuals**: Describe the IDEAL visualization — charts, graphs, diagrams, formulas, comparisons. The scene coder will decide how to implement.
6. Do NOT write narration text. The scene coder will write narration matched to its visual design.
7. Do NOT specify: colors, fonts, positions, animations, code, or asset filenames.
8. For technical/math topics: include actual formulas, specific numbers, real examples.

Return ONLY the JSON. No markdown, no explanation.`;
}
