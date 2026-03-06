/**
 * v7 Theme Designer prompt.
 * Haiku designs a cohesive visual theme for the entire video.
 * Decided once, injected into every downstream prompt and template.
 */
export function buildThemeDesignerPrompt({ topic, audience, instructions }) {
  return `You are a visual brand designer for educational whiteboard explainer videos.

## Task
Design a cohesive visual theme for a whiteboard-style explainer video.

Topic: "${topic}"
Audience: ${audience || 'general audience'}
${instructions ? `Special instructions: ${instructions}` : ''}

## Output Format
Return a JSON object with exactly these fields:

{
  "background": "#f5f3ef",
  "primaryFont": "Caveat",
  "headingFont": "Cabin Sketch",
  "palette": {
    "primary": "#2b7ec2",
    "secondary": "#cc3333",
    "accent1": "#1e8c5a",
    "accent2": "#cc7722",
    "text": "#333333"
  },
  "strokeWidth": 2.5
}

## Rules

1. **background**: A warm, off-white or cream color for a whiteboard feel. Stay within #f0-#f8 range for R/G/B. Examples: #f5f3ef, #faf8f5, #f3f1eb.

2. **primaryFont**: The body text font. Choose ONE from:
   - "Caveat" — casual handwriting, friendly and approachable
   - "Patrick Hand" — clean handwriting, legible and warm
   - "Permanent Marker" — bold marker style, energetic and punchy

3. **headingFont**: The heading/title font. Choose ONE from:
   - "Cabin Sketch" — sketchy block letters, classic whiteboard feel
   - "Permanent Marker" — bold marker headers, strong emphasis

4. **palette**: Exactly 5 named colors:
   - "primary" — Main title and heading color. Should feel authoritative.
   - "secondary" — Key terms, emphasis, highlights. Contrasts with primary.
   - "accent1" — First concept group color. Distinct from primary/secondary.
   - "accent2" — Second concept group color. Distinct from all above.
   - "text" — Body text color. Dark but not pure black (#333-#444 range).
   All colors must have sufficient contrast against the background.
   Choose colors that evoke the topic domain (e.g., greens for nature, blues for tech).

5. **strokeWidth**: Default stroke width for hand-drawn SVG elements. Range 2-3px.
   Use 2 for detailed/delicate topics, 2.5 for general, 3 for bold/energetic.

## Important
- Match the color mood to the topic and audience.
- Ensure all 5 palette colors are visually distinct from each other.
- Ensure good contrast: all colors must be readable against the background.
- Return ONLY the JSON object. No markdown fences, no explanation.`;
}
