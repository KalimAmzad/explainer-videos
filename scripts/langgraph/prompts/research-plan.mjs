/**
 * Prompt and JSON schema for the Research & Plan Educational Director agent.
 * Generates a comprehensive, rich video blueprint using Claude Opus.
 *
 * Inputs: topic (required), audience/duration/instructions (optional).
 * Output: scenes array with dynamic count (agent decides optimal number).
 */

/**
 * Build the prompt for the research & plan agent.
 * @param {Object} params
 * @param {string} params.topic - Video topic (required)
 * @param {string} [params.audience] - Target audience
 * @param {number} [params.duration] - Target duration in seconds
 * @param {string} [params.instructions] - Additional user instructions
 */
export function buildResearchPlanPrompt({ topic, audience, duration, instructions }) {
  const audienceStr = audience || 'general audience';
  const durationStr = duration ? `${duration} seconds` : 'appropriate length (you decide)';

  let instructionBlock = '';
  if (instructions) {
    instructionBlock = `\n## Additional Instructions from User\n${instructions}\n`;
  }

  return `You are an expert Educational Video Director — think VideoScribe, Doodly, and Whiteboard Animation Studio level quality. You research topics deeply and design visually rich, professionally structured whiteboard explainer videos.

TOPIC: ${topic}
TARGET AUDIENCE: ${audienceStr}
TARGET DURATION: ${durationStr}
${instructionBlock}
Your job: create a complete scene-by-scene blueprint for an animated whiteboard explainer video. YOU decide the optimal number of scenes based on the topic's complexity, breadth, and the target duration. Do not use a fixed formula — think about what makes educational sense.

## Video Style: Professional Whiteboard Explainer
- VideoScribe / Doodly / RSA Animate style hand-drawn animation
- Black ink strokes on warm cream background, with color-coded marker accents
- Each scene is visually DENSE — multiple illustrations, labeled diagrams, annotations, arrows
- Progressive reveal: elements draw on sequentially, building understanding layer by layer
- Professional educational course quality — every frame should teach something

## Scene Design Philosophy

Each scene must feel like a **complete visual infographic page**, NOT a slide with one image. Fill the 1280x720 canvas with:

1. **Multiple visual elements per scene** (2-5 per scene):
   - Main illustration (large, detailed, hand-drawn style)
   - Supporting icons or mini-illustrations beside key points
   - Comparison diagrams (before/after, A vs B, pros/cons tables)
   - Simple data visualizations (bar charts, pie charts, flow diagrams)
   - Process flows, hierarchy diagrams, mind maps, timelines

2. **Rich annotations and labels**:
   - Labels with arrows pointing to specific parts of illustrations
   - Callout boxes for key facts, statistics, or definitions
   - Numbered step markers for processes
   - Key terms in colored highlight boxes (red for emphasis)

3. **Visual storytelling**:
   - Metaphorical illustrations (brain as factory, habits as chains, etc.)
   - Before/after comparisons showing transformation
   - Scale or size comparisons for perspective
   - Cause-and-effect arrows connecting concepts
   - Timeline progressions showing change over time

## Scene Count — You Decide
Think about how many distinct concepts need their own visual scene. Guidelines:
- Short videos (30-45s): typically 3-5 scenes
- Medium videos (46-90s): typically 5-8 scenes
- Long videos (91-180s): typically 8-12 scenes
- Extended (180s+): typically 12-20 scenes

But ALWAYS prioritize educational clarity over hitting a number. Some topics need more scenes, some fewer.

## Per-Scene Specification

### Content
- "title": Short, punchy title (3-6 words)
- "key_concept": One-sentence summary of what this scene teaches
- "body_lines": 2-4 text lines (each under 50 characters). Mark key terms with *asterisks*
- "highlight_terms": Array of terms to render in red/emphasis color

### Timing
- "time_start": Absolute start time in seconds
- "time_end": Absolute end time in seconds
- "transition_from_previous": "fade" | "wipe" | "none"

### Layout
Choose a layout that best fits the content. Use VARIED layouts — don't repeat the same layout across consecutive scenes.
- "layout": "title_left_illust_right" | "centered_diagram" | "title_top_illust_center" | "comparison_left_right" | "infographic_grid" | "process_flow"
- "title_position": { x, y, fontSize (40-52), anchor ("start" or "middle") }
- "body_position": { x, y, fontSize (24-30), lineHeight (36-44) }

### Visual Elements — THE CORE (make these RICH)
- "visual_elements": Array of 2-5 elements. Each element:
  - "id": Unique identifier like "ve_1_main", "ve_1_icon_a", "ve_2_chart"
  - "type": "main_illustration" | "supporting_icon" | "diagram" | "chart" | "comparison" | "process_flow" | "infographic"
  - "description": VERY specific, detailed plain text. E.g., "stick figure person sitting at desk with laptop open, thought bubble above head containing interconnected gears and lightbulb" — NOT just "person thinking"
  - "position": { x, y, width, height } in the 1280x720 canvas
  - "source_preference": "gemini_generate" | "icons8" | "roughjs"
  - "icon_search_terms": ["term1", "term2"] (for Icons8 searches)
  - "complexity": "simple" | "moderate" | "complex"
  - "z_order": Layering order (0 = behind, higher = in front)

### Labels & Annotations
- "labels": Array, each with:
  - "text": Short label text
  - "position": { x, y }
  - "arrow_to": { x, y } or null (for pointer arrow)
  - "font_size": 18-24
  - "color": hex color string
  - "style": "normal" | "boxed" | "circled" | "underlined"

### Decorations (Rough.js hand-drawn shapes)
- "decorations": Array, each with:
  - "type": "box" | "underline" | "circle" | "arrow" | "bracket" | "connector"
  - "target": What it decorates (element id or "title")
  - "roughness": 1.0-2.0
  - "color": hex color
  - "fill": Hachure fill color or null
  - "points": { x1, y1, x2, y2 } for arrows/connectors (optional)

### Animation Sequence (order of progressive reveal)
- "animation_sequence": Array of steps:
  - "order": 1, 2, 3...
  - "target": "title" | "body_line_0" | "ve_1_main" | "label_0" | "decoration_0"
  - "type": "clip_wipe" (for text) | "stroke_draw" (for paths/lines) | "fade_in" (for complex groups)
  - "delay_after_previous": 0.1-1.0 seconds
  - "duration": 0.3-3.0 seconds
  - "easing": "power2.out" | "power1.inOut"

### Scene Color & Narration
- "concept_color": Hex color from palette (#2b7ec2, #cc3333, #1e8c5a, #cc7722, #8844aa, #2266bb, #1a8a8a)
- "narration": 2-4 sentence voiceover script for this scene

## Global Blueprint Fields
- "topic": Full topic title
- "target_audience": The audience description
- "total_duration": Total video duration in seconds
- "learning_objectives": 3-5 key takeaways (string array)
- "pacing_notes": Overall pacing and flow guidance
- "color_legend": Array of { concept, color } pairs

## Canvas Coordinate Reference (1280x720)
| Layout | Title | Body | Main Illustration |
|--------|-------|------|-------------------|
| title_left_illust_right | (60, 80) start | (60, 150) | (560, 60, 660x580) |
| centered_diagram | (640, 70) middle | (640, 130) middle | (190, 180, 900x480) |
| title_top_illust_center | (640, 70) middle | (640, 130) middle | (240, 200, 800x460) |
| comparison_left_right | (640, 70) middle | (640, 130) middle | Left: (60,200,560x460) Right: (660,200,560x460) |
| infographic_grid | (640, 60) middle | — | 2x2 grid starting at (60, 140) |
| process_flow | (640, 60) middle | — | Horizontal flow at y=200, 3-5 connected boxes |

## Animation Timing Reference
- Title clip-wipe: 1.2-1.5s
- Body line clip-wipe: 0.6-0.9s each, stagger 0.3s
- Main illustration draw-on/fade-in: 2.0-4.0s
- Supporting icons: 0.8-1.5s each
- Labels + arrows: 0.4-0.6s each
- Decorations: 0.3-0.5s each
- Scene transition gap: 0.3s between scenes

## Quality Expectations
- Every scene fills the canvas with purposeful visual content
- Layouts vary across scenes — no two consecutive scenes use the same layout
- Visual metaphors over abstract text wherever possible
- Labels and arrows make every illustration self-explanatory
- Animation sequence creates a natural teaching flow: context → concept → detail → annotation

Return a complete JSON blueprint. The scenes array should contain however many scenes the topic naturally requires.`;
}

/**
 * JSON Schema for the blueprint output.
 * Used with Claude's structured output (json_schema format).
 *
 * Only 'topic' and 'scenes' are required at the top level.
 * The agent dynamically decides scene count.
 */
export const BLUEPRINT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    target_audience: { type: 'string' },
    total_duration: { type: 'integer' },
    learning_objectives: {
      type: 'array',
      items: { type: 'string' },
    },
    pacing_notes: { type: 'string' },
    color_legend: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          concept: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['concept', 'color'],
      },
    },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          scene_number: { type: 'integer' },
          title: { type: 'string' },
          key_concept: { type: 'string' },
          time_start: { type: 'number' },
          time_end: { type: 'number' },
          concept_color: { type: 'string' },
          transition_from_previous: { type: 'string' },
          layout: { type: 'string' },
          title_position: {
            type: 'object',
            properties: {
              x: { type: 'number' }, y: { type: 'number' },
              fontSize: { type: 'number' }, anchor: { type: 'string' },
            },
            required: ['x', 'y', 'fontSize', 'anchor'],
          },
          body_position: {
            type: 'object',
            properties: {
              x: { type: 'number' }, y: { type: 'number' },
              fontSize: { type: 'number' }, lineHeight: { type: 'number' },
            },
            required: ['x', 'y', 'fontSize', 'lineHeight'],
          },
          body_lines: { type: 'array', items: { type: 'string' } },
          highlight_terms: { type: 'array', items: { type: 'string' } },
          visual_elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' }, y: { type: 'number' },
                    width: { type: 'number' }, height: { type: 'number' },
                  },
                  required: ['x', 'y', 'width', 'height'],
                },
                source_preference: { type: 'string' },
                icon_search_terms: { type: 'array', items: { type: 'string' } },
                complexity: { type: 'string' },
                z_order: { type: 'integer' },
              },
              required: ['id', 'type', 'description', 'position', 'source_preference'],
            },
          },
          labels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                position: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' } },
                  required: ['x', 'y'],
                },
                arrow_to: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' } },
                },
                font_size: { type: 'number' },
                color: { type: 'string' },
                style: { type: 'string' },
              },
              required: ['text', 'position'],
            },
          },
          decorations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                target: { type: 'string' },
                roughness: { type: 'number' },
                color: { type: 'string' },
                fill: { type: 'string' },
                points: {
                  type: 'object',
                  properties: {
                    x1: { type: 'number' }, y1: { type: 'number' },
                    x2: { type: 'number' }, y2: { type: 'number' },
                  },
                },
              },
              required: ['type', 'target', 'color'],
            },
          },
          animation_sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                order: { type: 'integer' },
                target: { type: 'string' },
                type: { type: 'string' },
                delay_after_previous: { type: 'number' },
                duration: { type: 'number' },
                easing: { type: 'string' },
              },
              required: ['order', 'target', 'type', 'duration'],
            },
          },
          narration: { type: 'string' },
        },
        required: [
          'scene_number', 'title', 'key_concept', 'time_start', 'time_end',
          'concept_color', 'layout', 'body_lines', 'visual_elements',
          'animation_sequence',
        ],
      },
    },
  },
  required: ['topic', 'scenes'],
};
