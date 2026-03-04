/**
 * Gemini image generation + potrace vectorization tool.
 * Generates hand-drawn sketch PNGs and converts to SVG paths.
 * Heavy data (paths, PNGs) stored in asset-store, only summary returned to LLM.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createRequire } from 'module';
import { storeAsset } from '../lib/asset-store.mjs';
import { PATHS } from '../config.mjs';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const potraceAsync = (input, opts) =>
  new Promise((resolve, reject) => {
    potrace.trace(input, opts, (err, svg) => (err ? reject(err) : resolve(svg)));
  });

function extractPathD(svgString) {
  const match = svgString.match(/<path d="([^"]+)"/);
  return match ? match[1] : '';
}

/**
 * Generate a hand-drawn SVG illustration using Gemini image generation + potrace.
 */
export const generateSvg = tool(
  async ({ description, sceneNumber }) => {
    const { callGeminiImage } = await import('../lib/gemini-client.mjs');

    console.log(`  [SVG Gen] Scene ${sceneNumber}: Generating sketch for "${description.slice(0, 60)}..."`);

    const sketchPrompt = `Draw a simple hand-drawn whiteboard sketch of: ${description}

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
      console.log(`  [SVG Gen] PNG generated: ${(buffer.length / 1024).toFixed(1)} KB`);

      // Edge detection + potrace vectorization
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
        threshold: 128,
        turdSize: 3,
        alphaMax: 1,
        optCurve: true,
        optTolerance: 0.4,
        color: '#333333',
        background: 'transparent',
      });

      const pathD = extractPathD(strokeSvg);
      const meta = await sharp(buffer).metadata();

      console.log(`  [SVG Gen] Vectorized: ${pathD.length} chars path (${meta.width}x${meta.height})`);

      // Save debug assets to disk (PNG + SVG) for manual review
      try {
        const assetsDir = path.join(PATHS.output, '_debug-assets');
        fs.mkdirSync(assetsDir, { recursive: true });
        const prefix = `scene${sceneNumber}_${Date.now()}`;
        fs.writeFileSync(path.join(assetsDir, `${prefix}.png`), buffer);
        fs.writeFileSync(path.join(assetsDir, `${prefix}_edges.png`), edges);
        const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${meta.width} ${meta.height}"><path d="${pathD}" fill="none" stroke="#333" stroke-width="2"/></svg>`;
        fs.writeFileSync(path.join(assetsDir, `${prefix}.svg`), svgFull);
        console.log(`  [SVG Gen] Debug assets saved: ${assetsDir}/${prefix}.*`);
      } catch (e) {
        // Non-critical, don't fail pipeline
        console.warn(`  [SVG Gen] Debug save failed: ${e.message}`);
      }

      // Store heavy data in asset store (NOT in LLM messages)
      storeAsset(sceneNumber, {
        type: 'custom_sketch',
        svgContent: pathD,
        strokePathD: pathD,
        pngBase64: buffer.toString('base64'),
        sourceWidth: meta.width,
        sourceHeight: meta.height,
        description,
      });

      // Return only a short summary to the LLM
      return JSON.stringify({
        success: true,
        sceneNumber,
        pathLength: pathD.length,
        dimensions: `${meta.width}x${meta.height}`,
        message: `Generated and vectorized sketch for scene ${sceneNumber}: ${pathD.length} chars SVG path (${meta.width}x${meta.height})`,
      });
    } catch (e) {
      console.error(`  [SVG Gen] ERROR: ${e.message}`);
      return JSON.stringify({ success: false, error: e.message, sceneNumber });
    }
  },
  {
    name: 'generateSvg',
    description: 'Generate a hand-drawn sketch illustration using Gemini image generation, then vectorize it to SVG paths via edge detection + potrace. Stores SVG data internally and returns a summary.',
    schema: z.object({
      description: z.string().describe('Detailed description of what to draw (e.g., "stick figure person meditating cross-legged")'),
      sceneNumber: z.number().describe('Scene number this illustration belongs to'),
    }),
  }
);
