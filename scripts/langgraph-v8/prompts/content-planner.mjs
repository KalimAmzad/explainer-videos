/**
 * v8 Content Planner prompts.
 * Two prompts in one file — theme design + content planning.
 * Both run as separate Haiku calls within the content_planner node.
 */

// ── Theme Design Prompt ─────────────────────────────────────────

export function buildThemePrompt({ topic, audience, instructions }) {
  return `You are a world-class motion design art director for premium online courses — think MasterClass, Kurzgesagt, and Linear.app combined.

## Task
Design a stunning, modern visual theme for a premium animated infographic video.

Topic: "${topic}"
Audience: ${audience || 'general audience'}
${instructions ? `Special instructions: ${instructions}` : ''}

## Output Format
Return a JSON object with exactly these fields:

{
  "background": "#0f1117",
  "primaryFont": "Inter",
  "headingFont": "Inter",
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

1. **background**: Rich, deep background — dark themes look premium and cinematic.
   - Dark options: #0f1117, #0d1117, #111827, #0f172a, #1a1a2e, #0e0e1a
   - Default to DARK. Dark backgrounds make colors pop.

2. **primaryFont**: Choose ONE: "Inter", "DM Sans", "Plus Jakarta Sans", "Nunito"

3. **headingFont**: Same as primaryFont (unified) or "Space Grotesk" (bold tech feel)

4. **palette**: 5 colors that work against the background:
   - "primary" — Hero color: vibrant, high-contrast
   - "secondary" — Warm accent: yellow, orange, amber
   - "accent1" — Cool accent: teal, green, emerald
   - "accent2" — Pop accent: pink, purple, coral
   - "text" — Near-white for dark BG (#e2e8f0 to #f8fafc)

5. **strokeWidth**: 2 for modern/minimal look

## Color Philosophy
- Productivity/Business: navy + indigo + amber
- Health/Wellbeing: dark green + emerald + coral
- Tech/Science: dark space + cyan + electric blue
- Psychology/Mind: deep purple + violet + rose

Return ONLY the JSON object. No markdown fences, no explanation.`;
}

// ── Content Planning Prompt ─────────────────────────────────────

export function buildContentPrompt({ topic, duration, audience, instructions }) {
  const sceneCount = Math.max(3, Math.min(8, Math.round((duration || 60) / 12)));

  return `You are a senior content strategist at a world-class online education company — the kind that produces MasterClass and Kurzgesagt-level content.

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
      "subtitle": "A short subtitle (max 10 words)",
      "duration": 12,
      "key_concept": "One sentence: what this scene teaches",
      "teaching_points": [
        "First key point — concise",
        "Second key point",
        "Third key point"
      ],
      "visual_idea": "One sentence describing the ideal visual (e.g. 'circular habit loop diagram', 'three-column comparison', 'stat callout showing 40%')",
      "narration": "Full word-for-word narration script for this scene."
    }
  ]
}

## Rules

1. Plan ${sceneCount}–${sceneCount + 1} scenes totalling ${duration || 60}s. Each scene: 8–15s.
2. Scene 1 hooks the viewer. Last scene summarizes or gives a call to action.
3. **teaching_points**: 2–4 bullet points per scene. These become on-screen text cards.
4. **narration**: Natural speech at ~2.5 words/second. A 12s scene = ~30 words.
5. **subtitle**: Short tagline for each scene (displayed below title).
6. **visual_idea**: Describe what should be SHOWN — not how to animate it. The visual director decides execution.
7. Do NOT specify: positions, colors, fonts, asset filenames, animation types, or code.

Return ONLY the JSON. No markdown, no explanation.`;
}
