/**
 * Step 2: Source/generate assets for each scene.
 * - custom_sketch: Gemini generates hand-drawn PNG → Potrace vectorizes
 * - icon:{term}: Placeholder (for Icons8 MCP search — done manually or via API)
 * - roughjs:{shape}: Record params, generated at runtime in browser
 * - svg_code: Gemini generates SVG elements as JSON
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createRequire } from 'module';
import { callGeminiImage, callGeminiJSON, rootDir } from './lib/gemini-client.mjs';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const slug = process.argv[2]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'anger-management-for-corporate-leaders';
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);
const planPath = path.join(outputDir, 'scene-plan.json');

if (!fs.existsSync(planPath)) { console.error(`No scene plan found at ${planPath}`); process.exit(1); }

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const assetsDir = path.join(outputDir, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

const potraceAsync = (input, opts) => new Promise((resolve, reject) => {
  potrace.trace(input, opts, (err, svg) => err ? reject(err) : resolve(svg));
});

function extractPathD(svgString) {
  const match = svgString.match(/<path d="([^"]+)"/);
  return match ? match[1] : '';
}

console.log(`Sourcing assets for ${plan.scenes.length} scenes...\n`);

for (const scene of plan.scenes) {
  const sceneId = `scene${scene.scene_number}`;
  const source = scene.illustration_source;

  console.log(`Scene ${scene.scene_number}: "${scene.title}" — source: ${source}`);

  if (source.startsWith('roughjs:')) {
    // Rough.js shape — just record params, generated at runtime
    const shapeType = source.split(':')[1];
    scene.asset = {
      type: 'roughjs',
      shape: shapeType,
      color: scene.concept_color,
      elements: scene.illustration_elements || [],
    };
    console.log(`  → Rough.js ${shapeType} (runtime generation)`);

  } else if (source.startsWith('icon:')) {
    // Icon search — generate a simple sketch as fallback
    // In production, this would call Icons8 MCP. For now, generate a sketch.
    const searchTerm = source.split(':')[1];
    console.log(`  → Icon "${searchTerm}" — generating sketch as fallback...`);

    const sketchPrompt = `Draw a simple hand-drawn whiteboard sketch of: ${scene.illustration_description}

Style: BLACK INK on PURE WHITE background. Khan Academy whiteboard style.
- Simple line art with hatching for shading (diagonal lines, not solid fills)
- No text, no labels, no words
- No color (black/dark gray strokes only)
- Clean, isolated subject centered in the image
- Visible pen/marker strokes, slightly imperfect lines
- Leave whitespace around the subject (at least 15% margins)
- NO background patterns, gradients, or decorations`;

    try {
      const { buffer } = await callGeminiImage('gemini-3.1-flash-image-preview', sketchPrompt);
      const pngPath = path.join(assetsDir, `${sceneId}_illustration.png`);
      fs.writeFileSync(pngPath, buffer);
      console.log(`  → PNG saved: ${(buffer.length / 1024).toFixed(1)} KB`);

      // Vectorize: edge detection → Potrace
      const edges = await sharp(buffer)
        .greyscale()
        .blur(0.8)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .negate()
        .threshold(110)
        .negate()
        .png()
        .toBuffer();

      const strokeSvg = await potraceAsync(edges, {
        threshold: 128, turdSize: 3, alphaMax: 1,
        optCurve: true, optTolerance: 0.4,
        color: '#333333', background: 'transparent',
      });

      const pathD = extractPathD(strokeSvg);
      const meta = await sharp(buffer).metadata();

      scene.asset = {
        type: 'custom_sketch',
        stroke_path_d: pathD,
        source_w: meta.width,
        source_h: meta.height,
        png_file: `${sceneId}_illustration.png`,
      };
      console.log(`  → Vectorized: ${pathD.length} chars stroke path (${meta.width}x${meta.height})`);
    } catch (e) {
      console.error(`  → ERROR: ${e.message}`);
      scene.asset = { type: 'error', error: e.message };
    }

  } else if (source === 'custom_sketch') {
    // Generate hand-drawn sketch with Gemini
    const sketchPrompt = `Draw a simple hand-drawn whiteboard sketch of: ${scene.illustration_description}

Style: BLACK INK on PURE WHITE background. Khan Academy whiteboard style.
- Simple line art with hatching for shading (diagonal lines, not solid fills)
- No text, no labels, no words written
- No color (black/dark gray strokes only)
- Clean, isolated subject centered in the image
- Visible pen/marker strokes, slightly imperfect lines
- Leave whitespace around the subject (at least 15% margins)
- NO background patterns, gradients, or decorations`;

    try {
      const { buffer } = await callGeminiImage('gemini-3.1-flash-image-preview', sketchPrompt);
      const pngPath = path.join(assetsDir, `${sceneId}_illustration.png`);
      fs.writeFileSync(pngPath, buffer);
      console.log(`  → PNG saved: ${(buffer.length / 1024).toFixed(1)} KB`);

      // Vectorize
      const edges = await sharp(buffer)
        .greyscale()
        .blur(0.8)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .negate()
        .threshold(110)
        .negate()
        .png()
        .toBuffer();

      const strokeSvg = await potraceAsync(edges, {
        threshold: 128, turdSize: 3, alphaMax: 1,
        optCurve: true, optTolerance: 0.4,
        color: '#333333', background: 'transparent',
      });

      const pathD = extractPathD(strokeSvg);
      const meta = await sharp(buffer).metadata();

      scene.asset = {
        type: 'custom_sketch',
        stroke_path_d: pathD,
        source_w: meta.width,
        source_h: meta.height,
        png_file: `${sceneId}_illustration.png`,
      };
      console.log(`  → Vectorized: ${pathD.length} chars stroke path (${meta.width}x${meta.height})`);
    } catch (e) {
      console.error(`  → ERROR: ${e.message}`);
      scene.asset = { type: 'error', error: e.message };
    }

  } else if (source === 'svg_code') {
    // Ask Gemini to generate SVG elements directly
    console.log(`  → Requesting SVG code from Gemini...`);
    // TODO: implement LLM SVG generation
    scene.asset = { type: 'svg_code', elements: [] };
  }

  console.log();
}

// Save enriched plan
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`Plan updated with assets: ${planPath}`);

// Summary
const types = plan.scenes.map(s => s.asset?.type || 'unknown');
console.log(`\nAsset summary: ${types.join(', ')}`);
