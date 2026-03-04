/**
 * Convert clean SVG/PNG to hand-drawn style using edge detection + potrace.
 * Heavy data stored in asset-store, only summary returned to LLM.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import sharp from 'sharp';
import { createRequire } from 'module';
import { storeAsset, getAsset } from '../lib/asset-store.mjs';

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
 * Convert a PNG (base64) to hand-drawn SVG style.
 */
export const convertToSketchy = tool(
  async ({ sceneNumber }) => {
    console.log(`  [Sketchy] Converting PNG to hand-drawn SVG for scene ${sceneNumber}...`);

    // Read PNG from asset store (stored by downloadIcon)
    const stored = getAsset(sceneNumber);
    const pngBase64 = stored?.pngBase64;
    if (!pngBase64) {
      return JSON.stringify({ success: false, error: `No PNG data found in store for scene ${sceneNumber}. Download an icon first.` });
    }

    try {
      const buffer = Buffer.from(pngBase64, 'base64');
      const meta = await sharp(buffer).metadata();

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

      console.log(`  [Sketchy] Converted: ${pathD.length} chars path (${meta.width}x${meta.height})`);

      // Store heavy data in asset store
      storeAsset(sceneNumber, {
        type: 'icons8_sketchy',
        svgContent: pathD,
        strokePathD: pathD,
        sourceWidth: meta.width,
        sourceHeight: meta.height,
      });

      return JSON.stringify({
        success: true,
        sceneNumber,
        pathLength: pathD.length,
        dimensions: `${meta.width}x${meta.height}`,
        message: `Converted to sketchy SVG for scene ${sceneNumber}: ${pathD.length} chars path`,
      });
    } catch (e) {
      console.error(`  [Sketchy] ERROR: ${e.message}`);
      return JSON.stringify({ success: false, error: e.message });
    }
  },
  {
    name: 'convertToSketchy',
    description: 'Convert a PNG image (base64) to hand-drawn SVG style using edge detection + potrace. Stores SVG data internally and returns a summary.',
    schema: z.object({
      sceneNumber: z.number().describe('Scene number to convert (PNG must have been downloaded first via downloadIcon)'),
    }),
  }
);
