/**
 * Step 1: Use Gemini Vision to decompose an infographic into individual assets
 * with bounding boxes, types, and educational delivery order.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load API key
const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error('No GEMINI_API_KEY found in .env'); process.exit(1); }

const inputPath = process.argv[2] || path.join(rootDir, 'output', 'anger-management-infographic.png');
if (!fs.existsSync(inputPath)) { console.error(`File not found: ${inputPath}`); process.exit(1); }

// Use Gemini 2.5 Flash for vision analysis (NOT image-preview model)
const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Get image dimensions
const imgMeta = await sharp(inputPath).metadata();
console.log(`Input image: ${imgMeta.width}x${imgMeta.height}`);

// Base64 encode the image
const imageBuffer = fs.readFileSync(inputPath);
const base64Image = imageBuffer.toString('base64');

const prompt = `Analyze this infographic image and identify every distinct visual asset/component.

For each asset, provide:
- "label": A short snake_case identifier (e.g., "title_banner", "s1_container", "s1_brain_icon", "arrow_1_to_2")
- "type": One of: "container", "icon", "character", "text_block", "arrow", "number_badge", "title_banner"
- "box_2d": Bounding box as [ymin, xmin, ymax, xmax] with coordinates normalized 0-1000
- "description": What the asset depicts or its text content
- "dominant_color": Primary color as hex string
- "draw_order": Integer (1 = drawn first). Containers before their contents, text after illustrations
- "animation_type": "stroke_draw" for outlines/icons/arrows, "clip_wipe" for text, "fade_in" for complex multi-color illustrations
- "section": Which section this belongs to ("title", "section_1", "section_2", "section_3", "section_4", "section_5", "connector")

Important rules:
- Identify EVERY distinct element: title banner, section containers/boxes, number badges, section title text, icons/illustrations, description text, and connecting arrows
- Each section's container box is a separate asset from its contents
- Number badges (circled numbers 1-5) are separate assets
- Arrows connecting sections are separate assets
- Text labels within sections are separate assets
- Order: title first, then section 1 (container→badge→title→illustration→text), then section 2, etc., arrows last

Return a JSON array of all assets sorted by draw_order.`;

console.log(`\nSending to Gemini ${MODEL} for decomposition...`);

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            label:          { type: 'STRING' },
            type:           { type: 'STRING' },
            box_2d:         { type: 'ARRAY', items: { type: 'INTEGER' } },
            description:    { type: 'STRING' },
            dominant_color: { type: 'STRING' },
            draw_order:     { type: 'INTEGER' },
            animation_type: { type: 'STRING' },
            section:        { type: 'STRING' }
          },
          required: ['label', 'type', 'box_2d', 'description', 'dominant_color', 'draw_order', 'animation_type', 'section']
        }
      }
    }
  })
});

if (!response.ok) {
  const errText = await response.text();
  console.error(`API error ${response.status}: ${errText.slice(0, 1000)}`);
  process.exit(1);
}

const data = await response.json();
const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
if (!textPart) {
  console.error('No text response from Gemini');
  console.error(JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

let assets;
try {
  assets = JSON.parse(textPart);
} catch (e) {
  console.error('Failed to parse JSON response:', e.message);
  console.error('Raw response:', textPart.slice(0, 2000));
  process.exit(1);
}

console.log(`\nGemini identified ${assets.length} assets:`);

// Convert normalized coords (0-1000) to pixel coordinates
for (const asset of assets) {
  const [ymin, xmin, ymax, xmax] = asset.box_2d;
  asset.pixel_box = {
    x: Math.round((xmin / 1000) * imgMeta.width),
    y: Math.round((ymin / 1000) * imgMeta.height),
    w: Math.round(((xmax - xmin) / 1000) * imgMeta.width),
    h: Math.round(((ymax - ymin) / 1000) * imgMeta.height),
  };
  console.log(`  [${asset.draw_order}] ${asset.label} (${asset.type}) — ${asset.animation_type} — ${asset.pixel_box.w}x${asset.pixel_box.h}px`);
}

// Sort by draw_order
assets.sort((a, b) => a.draw_order - b.draw_order);

// Save manifest
const manifestPath = path.join(rootDir, 'output', 'asset-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(assets, null, 2));
console.log(`\nManifest saved: ${manifestPath}`);
console.log(`Total assets: ${assets.length}`);

// Print section summary
const sections = {};
for (const a of assets) {
  if (!sections[a.section]) sections[a.section] = [];
  sections[a.section].push(a.label);
}
console.log('\nSection breakdown:');
for (const [sec, labels] of Object.entries(sections)) {
  console.log(`  ${sec}: ${labels.join(', ')}`);
}
