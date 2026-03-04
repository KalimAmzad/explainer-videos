/**
 * System prompt for the Content Research node.
 * Generates a comprehensive video blueprint from a topic.
 */

export function buildContentResearchPrompt({ topic, audience, duration, numScenes }) {
  return `You are a Khan Academy-style educational content designer. Given a topic, create a comprehensive scene-by-scene blueprint for a whiteboard explainer video.

TOPIC: ${topic}
TARGET AUDIENCE: ${audience}
DURATION: ${duration} seconds
NUMBER OF SCENES: ${numScenes}

Design exactly ${numScenes} scenes. Each scene covers ONE concept and uses the FULL 1280x720 canvas (previous scene clears before the next appears).

## Khan Academy Whiteboard Style Rules
- Simple hand-drawn ink art (black strokes + hatching, minimal color)
- Spacious layout, lots of whitespace
- One main illustration per scene (big, clear, centered or right-aligned)
- Text on the left, illustration on the right (or centered for diagram scenes)
- Progressive reveal: title → body text → illustration → labels

## For Each Scene, Specify:

### Content
1. "title": Short title (3-6 words)
2. "key_concept": One-sentence summary of the concept
3. "body_lines": Array of 1-3 text lines (each under 50 chars). Mark key terms with *asterisks*
4. "highlight_terms": Array of terms to color-code in red

### Timing
5. "time_start": Absolute start time in seconds
6. "time_end": Absolute end time in seconds
7. "transition_from_previous": "fade" | "wipe" | "none"

### Layout
8. "layout": One of: "title_left_illust_right", "centered_diagram", "title_top_illust_center", "comparison_left_right"
9. "title_position": { x, y, fontSize (40-52), anchor ("start" or "middle") }
10. "body_position": { x, y, fontSize (24-30), lineHeight (36-44) }
11. "illustration_position": { x, y, width, height }

### Illustration (for asset sourcing)
12. "illustration": {
  "description": Plain text description — be specific: "stick figure person meditating cross-legged", not "meditation"
  "style": "icon" | "custom_sketch" | "roughjs_shape" | "diagram"
  "complexity": "simple" | "moderate" | "complex"
  "source_preference": "icons8" | "gemini_generate" | "roughjs"
  "icon_search_terms": ["meditation", "yoga", "zen"] — for Icons8 search
  "fallback_description": Alternative description if primary source fails
}

### Animation Sequence
13. "animation_sequence": Array of steps, each with:
  - "order": 1, 2, 3...
  - "target": "title" | "body_line_0" | "body_line_1" | "illustration" | "label_0" | "underline" | "decoration_0"
  - "type": "clip_wipe" | "stroke_draw" | "fade_in"
  - "delay_after_previous": seconds (0.1-1.0)
  - "duration": seconds (0.3-2.0)
  - "easing": "power2.out" | "power1.inOut" | "none"
  - "notes": optional notes like "draw underline while title wipes in"

### Labels & Annotations
14. "labels": Array of { text, position: {x, y}, arrow_to: {x, y} or null, font_size (18-22), color }

### Decorations (Rough.js shapes)
15. "decorations": Array of { type: "box"|"underline"|"circle"|"arrow", target, roughness (1.0-2.0), color, fill (hachure color or null) }

### Visual Color
16. "concept_color": Hex color for this concept (from palette: #2b7ec2 blue, #cc3333 red, #1e8c5a green, #cc7722 orange, #8844aa purple, #2266bb navy)

### Narration
17. "narration": A 2-3 sentence narration script for this scene (for future TTS)

## Global Fields
- "topic": The full topic title
- "target_audience": The audience
- "total_duration": Total video duration in seconds
- "learning_objectives": 3-5 key takeaways (array of strings)
- "pacing_notes": Overall pacing guidance
- "color_legend": Array of {concept, color} pairs mapping concept name → hex color

## Layout Coordinate Guide (1280x720 canvas)
- title_left_illust_right: title at (60, 80), body at (60, 150), illustration at (560, 60, 660x580)
- centered_diagram: title at (640, 70) middle, body at (640, 130) middle, illustration at (190, 180, 900x480)
- title_top_illust_center: title at (640, 70) middle, body at (640, 130) middle, illustration at (240, 200, 800x460)
- comparison_left_right: title at (640, 70) middle, body at (640, 130) middle, illustration at (60, 200, 1160x460)

## Animation Timing Guide
- Title wipe: ~1.2-1.5s
- Underline draw: ~0.3-0.5s
- Body line wipe: ~0.6-0.9s each
- Illustration draw-on: 1.5-4.0s depending on complexity
- Label wipe: ~0.4-0.6s each
- Leave 0.3s gap between scenes for transition`;
}

/**
 * Gemini JSON schema for the blueprint response.
 * Uses Gemini's structured output format (not Zod).
 */
export const BLUEPRINT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    target_audience: { type: 'STRING' },
    total_duration: { type: 'INTEGER' },
    learning_objectives: { type: 'ARRAY', items: { type: 'STRING' } },
    pacing_notes: { type: 'STRING' },
    color_legend: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          concept: { type: 'STRING' },
          color: { type: 'STRING' },
        },
        required: ['concept', 'color'],
      },
    },
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          scene_number: { type: 'INTEGER' },
          title: { type: 'STRING' },
          key_concept: { type: 'STRING' },
          time_start: { type: 'NUMBER' },
          time_end: { type: 'NUMBER' },
          concept_color: { type: 'STRING' },
          transition_from_previous: { type: 'STRING' },
          layout: { type: 'STRING' },
          title_position: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' }, y: { type: 'NUMBER' },
              fontSize: { type: 'NUMBER' }, anchor: { type: 'STRING' },
            },
            required: ['x', 'y', 'fontSize', 'anchor'],
          },
          body_position: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' }, y: { type: 'NUMBER' },
              fontSize: { type: 'NUMBER' }, lineHeight: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'fontSize', 'lineHeight'],
          },
          illustration_position: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' }, y: { type: 'NUMBER' },
              width: { type: 'NUMBER' }, height: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'width', 'height'],
          },
          body_lines: { type: 'ARRAY', items: { type: 'STRING' } },
          highlight_terms: { type: 'ARRAY', items: { type: 'STRING' } },
          illustration: {
            type: 'OBJECT',
            properties: {
              description: { type: 'STRING' },
              style: { type: 'STRING' },
              complexity: { type: 'STRING' },
              source_preference: { type: 'STRING' },
              icon_search_terms: { type: 'ARRAY', items: { type: 'STRING' } },
              fallback_description: { type: 'STRING' },
            },
            required: ['description', 'style', 'source_preference', 'icon_search_terms'],
          },
          animation_sequence: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                order: { type: 'INTEGER' },
                target: { type: 'STRING' },
                type: { type: 'STRING' },
                delay_after_previous: { type: 'NUMBER' },
                duration: { type: 'NUMBER' },
                easing: { type: 'STRING' },
                notes: { type: 'STRING' },
              },
              required: ['order', 'target', 'type', 'duration'],
            },
          },
          labels: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING' },
                position: {
                  type: 'OBJECT',
                  properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' } },
                  required: ['x', 'y'],
                },
                arrow_to: {
                  type: 'OBJECT',
                  properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' } },
                },
                font_size: { type: 'NUMBER' },
                color: { type: 'STRING' },
              },
              required: ['text', 'position'],
            },
          },
          decorations: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                target: { type: 'STRING' },
                roughness: { type: 'NUMBER' },
                color: { type: 'STRING' },
                fill: { type: 'STRING' },
              },
              required: ['type', 'target', 'color'],
            },
          },
          narration: { type: 'STRING' },
        },
        required: [
          'scene_number', 'title', 'key_concept', 'time_start', 'time_end',
          'concept_color', 'layout', 'body_lines', 'illustration',
          'animation_sequence', 'narration',
        ],
      },
    },
  },
  required: ['topic', 'total_duration', 'scenes', 'learning_objectives'],
};
