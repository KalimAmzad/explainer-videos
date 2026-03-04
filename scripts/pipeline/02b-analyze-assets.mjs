/**
 * Step 2b: Analyze existing scene PNGs with Gemini Vision.
 * Decomposes each illustration into individually-animatable SVG elements
 * with content flow ordering.
 *
 * Uses gemini-3.1-flash-lite-preview (cheapest vision model).
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { callGeminiVision, rootDir } from './lib/gemini-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const slug = process.argv[2]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'anger-management-for-corporate-leaders';
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);
const singleScene = process.argv.find(a => a.startsWith('--scene='))?.split('=')[1];
const planPath = path.join(outputDir, 'scene-plan.json');
const assetsDir = path.join(outputDir, 'assets');

if (!fs.existsSync(planPath)) { console.error(`No scene plan: ${planPath}`); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

const MODEL = 'gemini-3.1-flash-lite-preview';

const ELEMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    elements: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          order: { type: 'INTEGER' },
          description: { type: 'STRING' },
          category: { type: 'STRING' },
          svg_code: { type: 'STRING' },
          bbox: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' },
              y: { type: 'NUMBER' },
              w: { type: 'NUMBER' },
              h: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'w', 'h'],
          },
          complexity: { type: 'STRING' },
        },
        required: ['id', 'order', 'description', 'category', 'svg_code', 'bbox'],
      },
    },
    element_count: { type: 'INTEGER' },
  },
  required: ['elements', 'element_count'],
};

function buildPrompt(scene, width, height) {
  const elementsHint = scene.illustration_elements?.length
    ? `\nKNOWN ELEMENTS IN THIS IMAGE:\n${scene.illustration_elements.map((e, i) => `  ${i + 1}. [${e.type}] ${e.description || e.desc}`).join('\n')}`
    : '';

  return `You are an SVG illustration expert. Analyze this hand-drawn whiteboard sketch and decompose EVERY visible element into separate SVG shapes that can be animated individually.

CONTEXT:
- This is scene ${scene.scene_number} of a whiteboard explainer video about "${plan.topic}"
- Scene title: "${scene.title}"
- What this illustration shows: "${scene.illustration_description}"${elementsHint}

YOUR TASK:
Look at EVERY single visual element in this image. Do NOT miss anything — every line, curve, shape, figure, arrow, hatching pattern, decorative mark must be captured as a separate SVG element.

SVG RULES:
1. Use coordinate system: 0,0 to ${width},${height} pixels (matching the image exactly)
2. Keep paths SIMPLIFIED — use clean curves with minimal control points. Hand-drawn imperfection is GOOD.
3. Prefer simple SVG primitives where possible:
   - <circle cx="..." cy="..." r="..."/> for circles and dots
   - <ellipse cx="..." cy="..." rx="..." ry="..."/> for ovals
   - <rect x="..." y="..." width="..." height="..."/> for rectangles
   - <line x1="..." y1="..." x2="..." y2="..."/> for straight lines
   - <polyline points="x1,y1 x2,y2 ..."/> for connected segments
   - <path d="M... C... L... Z"/> for complex organic curves
4. For human figures: simplified stick-figure style. Head = circle, body = lines, limbs = lines
5. Each element's SVG code must be SELF-CONTAINED (no external references)
6. All strokes: stroke-linecap="round" stroke-linejoin="round"
7. Do NOT include any text/letters — text is handled separately by the animation system
8. Default: fill="none" stroke="#333" stroke-width="2"
9. For filled areas (like solid dots, filled shapes): use fill="#333" or appropriate color

ELEMENT ORDERING (this determines animation sequence):
- order=1: Main subject / largest central figure (drawn FIRST on the whiteboard)
- order=2-3: Secondary subjects / supporting figures
- order=4+: Detail elements (hatching lines, shading, small decorations)
- Higher orders: Annotations (arrows, pointers, indicator lines)
- Last: Connectors (lines linking elements together), frames, borders

BOUNDING BOX: For each element, provide bbox as fractions (0.0 to 1.0) of image dimensions.
Example: an element in the top-left quarter → bbox: {x: 0.0, y: 0.0, w: 0.5, h: 0.5}

CATEGORY must be one of: main_subject, secondary_subject, detail, annotation, connector
COMPLEXITY must be one of: simple, moderate, complex

CRITICAL INSTRUCTIONS:
- Be EXTREMELY thorough. Count every distinct visual component.
- If you see a person: head is one element, body/torso is another, each set of limbs can be grouped
- If you see hatching/shading lines: group related parallel lines into one element
- If you see a thought/speech bubble: outline is one element, contents inside are separate
- If you see arrows: each arrow or arrow group is a separate element
- If you see wavy lines (like steam, motion lines): group them as one element
- Aim for 5-15 elements per image. More is better than fewer.
- Every visible mark in the image should belong to some element.`;
}

function validateElements(elements) {
  const valid = [];
  for (const el of elements) {
    if (!el.svg_code || !el.id || typeof el.order !== 'number') continue;
    if (el.svg_code.length < 10) continue;

    // Sanitize SVG
    el.svg_code = el.svg_code
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .trim();

    // Clamp bbox
    if (el.bbox) {
      el.bbox.x = Math.max(0, Math.min(1, el.bbox.x || 0));
      el.bbox.y = Math.max(0, Math.min(1, el.bbox.y || 0));
      el.bbox.w = Math.max(0.01, Math.min(1, el.bbox.w || 0.1));
      el.bbox.h = Math.max(0.01, Math.min(1, el.bbox.h || 0.1));
    } else {
      el.bbox = { x: 0, y: 0, w: 1, h: 1 };
    }

    // Default category
    if (!['main_subject', 'secondary_subject', 'detail', 'annotation', 'connector'].includes(el.category)) {
      el.category = 'detail';
    }

    if (!['simple', 'moderate', 'complex'].includes(el.complexity)) {
      el.complexity = 'moderate';
    }

    valid.push(el);
  }

  return valid.sort((a, b) => a.order - b.order);
}

console.log(`Analyzing assets for ${plan.scenes.length} scenes with ${MODEL}...\n`);

for (const scene of plan.scenes) {
  if (singleScene && scene.scene_number !== parseInt(singleScene)) continue;

  const pngFile = scene.asset?.png_file;
  if (!pngFile) {
    console.log(`Scene ${scene.scene_number}: No PNG file, skipping`);
    continue;
  }

  const pngPath = path.join(assetsDir, pngFile);
  if (!fs.existsSync(pngPath)) {
    console.log(`Scene ${scene.scene_number}: PNG not found: ${pngPath}, skipping`);
    continue;
  }

  console.log(`Scene ${scene.scene_number}: "${scene.title}"`);
  console.log(`  Analyzing ${pngFile}...`);

  const buffer = fs.readFileSync(pngPath);
  const meta = await sharp(buffer).metadata();
  const prompt = buildPrompt(scene, meta.width, meta.height);

  let result;
  try {
    result = await callGeminiVision(MODEL, buffer, 'image/png', prompt, ELEMENT_SCHEMA);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
    continue;
  }

  let elements = validateElements(result.elements || []);

  // Retry if too few elements
  if (elements.length < 3) {
    console.log(`  Only ${elements.length} elements found, retrying with more insistence...`);
    const retryPrompt = prompt + `\n\nYOU RETURNED TOO FEW ELEMENTS LAST TIME. This image contains at least 5-10 distinct visual components. Look MORE carefully. Break down compound shapes. Every separate visual mark counts.`;
    try {
      result = await callGeminiVision(MODEL, buffer, 'image/png', retryPrompt, ELEMENT_SCHEMA);
      const retryElements = validateElements(result.elements || []);
      if (retryElements.length > elements.length) elements = retryElements;
    } catch (e) {
      console.log(`  Retry failed: ${e.message}`);
    }
  }

  // Store elements, remove old monolithic path
  scene.asset.elements = elements;
  scene.asset.source_w = meta.width;
  scene.asset.source_h = meta.height;
  delete scene.asset.stroke_path_d;

  console.log(`  Found ${elements.length} elements:`);
  for (const el of elements) {
    console.log(`    ${el.order}. [${el.category}] ${el.description} (${el.svg_code.length} chars SVG)`);
  }
  console.log();
}

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`Plan updated with decomposed elements: ${planPath}`);

const totalElements = plan.scenes.reduce((sum, s) => sum + (s.asset?.elements?.length || 0), 0);
console.log(`Total: ${totalElements} elements across ${plan.scenes.length} scenes`);
