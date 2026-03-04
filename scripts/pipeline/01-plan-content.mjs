/**
 * Step 1: Use Gemini 2.5 Flash to plan scene-by-scene content for a whiteboard explainer video.
 * Output: scene-plan.json
 */
import fs from 'fs';
import path from 'path';
import { callGeminiJSON, rootDir } from './lib/gemini-client.mjs';

const topic = process.argv[2] || 'Anger Management for Corporate Leaders';
const duration = parseInt(process.argv.find(a => a.startsWith('--duration='))?.split('=')[1] || '60', 10);
const audience = process.argv.find(a => a.startsWith('--audience='))?.split('=')[1] || 'corporate professionals';
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);

fs.mkdirSync(outputDir, { recursive: true });

const numScenes = Math.max(4, Math.min(10, Math.round(duration / 10)));

const prompt = `You are a Khan Academy-style educational content designer. Given a topic, create a scene-by-scene plan for a whiteboard explainer video.

TOPIC: ${topic}
TARGET AUDIENCE: ${audience}
DURATION: ${duration} seconds
NUMBER OF SCENES: ${numScenes}

Design exactly ${numScenes} scenes. Each scene covers ONE concept and uses the FULL 1280x720 canvas (previous scene clears before the next appears).

Khan Academy whiteboard style rules:
- Simple hand-drawn ink art (black strokes + hatching, minimal color)
- Spacious layout, lots of whitespace
- One main illustration per scene (big, clear, centered or right-aligned)
- Text on the left, illustration on the right (or centered for diagram scenes)
- Progressive reveal: title → body text → illustration → labels

For each scene specify:
1. "title": Short title (3-6 words)
2. "body_lines": Array of 1-3 text lines (each under 50 chars). Mark key terms with *asterisks*
3. "illustration_description": What to DRAW — think simple line art a teacher would sketch on a whiteboard. Be specific: "stick figure person meditating cross-legged", not just "meditation"
4. "illustration_source": One of:
   - "roughjs:rectangle", "roughjs:circle", "roughjs:ellipse" — for simple geometric shapes
   - "icon:search_term" — for an Icons8 SVG icon (e.g., "icon:brain", "icon:meditation")
   - "custom_sketch" — for complex illustrations that need image generation
5. "illustration_elements": Array of sub-elements to draw (e.g., for a brain scene: [{type:"main", desc:"brain outline"}, {type:"detail", desc:"lightning bolts around brain"}, {type:"label", desc:"amygdala", position:"inside-left"}])
6. "labels": Array of labels pointing to parts of the illustration: [{text, target, position}]
7. "layout": One of: "title_left_illust_right", "centered_diagram", "title_top_illust_center", "comparison_left_right"
8. "concept_color": Hex color for this concept (from palette: #2b7ec2 blue, #cc3333 red, #1e8c5a green, #cc7722 orange, #8844aa purple, #2266bb navy)
9. "narration": A 2-3 sentence narration script for this scene (for future TTS)

Also provide:
- "topic": The full topic title
- "total_duration": Total video duration in seconds
- Color assignments for each major concept`;

const schema = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    total_duration: { type: 'INTEGER' },
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          scene_number: { type: 'INTEGER' },
          title: { type: 'STRING' },
          time_start: { type: 'NUMBER' },
          time_end: { type: 'NUMBER' },
          concept_color: { type: 'STRING' },
          layout: { type: 'STRING' },
          body_lines: { type: 'ARRAY', items: { type: 'STRING' } },
          illustration_description: { type: 'STRING' },
          illustration_source: { type: 'STRING' },
          illustration_elements: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                description: { type: 'STRING' },
                position: { type: 'STRING' },
              },
              required: ['type', 'description'],
            },
          },
          labels: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING' },
                target: { type: 'STRING' },
                position: { type: 'STRING' },
              },
              required: ['text'],
            },
          },
          narration: { type: 'STRING' },
        },
        required: ['scene_number', 'title', 'time_start', 'time_end', 'concept_color', 'layout', 'body_lines', 'illustration_description', 'illustration_source', 'narration'],
      },
    },
  },
  required: ['topic', 'total_duration', 'scenes'],
};

console.log(`Planning "${topic}" (${numScenes} scenes, ${duration}s)...`);

const plan = await callGeminiJSON('gemini-2.5-flash', prompt, schema);

// Add metadata
plan.slug = slug;
plan.audience = audience;
plan.output_dir = outputDir;

console.log(`\nScene plan for: ${plan.topic}`);
console.log(`Duration: ${plan.total_duration}s, Scenes: ${plan.scenes.length}\n`);

for (const scene of plan.scenes) {
  const source = scene.illustration_source;
  console.log(`  Scene ${scene.scene_number} (${scene.time_start}-${scene.time_end}s): ${scene.title}`);
  console.log(`    Layout: ${scene.layout}, Color: ${scene.concept_color}`);
  console.log(`    Illustration: ${source} — "${scene.illustration_description.slice(0, 60)}..."`);
  console.log(`    Body: ${scene.body_lines.join(' | ')}`);
  console.log(`    Labels: ${(scene.labels || []).map(l => l.text).join(', ') || 'none'}`);
  console.log();
}

const planPath = path.join(outputDir, 'scene-plan.json');
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`Scene plan saved: ${planPath}`);
