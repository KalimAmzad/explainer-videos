/**
 * Refined edge detection → stroke tracing pipeline.
 * The Laplacian edge image is excellent — now tune the tracer settings.
 */
import { ImageTracerNodejs, FillStyle } from '@image-tracer-ts/nodejs';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');

// ═══ Step 1: Generate edge images with different settings ═══

// Laplacian edges (already proven good) — but try inverted (black lines on white)
console.log('Generating edge images...');
const laplacianEdges = await sharp(inputPath)
  .greyscale()
  .blur(0.8)
  .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
  .negate()
  .threshold(120)
  .png()
  .toBuffer();

// Inverted version: black lines on white background (what tracers expect)
const invertedEdges = await sharp(laplacianEdges)
  .negate()
  .png()
  .toBuffer();

const invertedPath = path.join(rootDir, 'output', 'v2-edges-inverted.png');
fs.writeFileSync(invertedPath, invertedEdges);
console.log(`  Inverted edges: ${(invertedEdges.length / 1024).toFixed(1)} KB`);

// Also try softer threshold for more detail
const softEdges = await sharp(inputPath)
  .greyscale()
  .blur(0.5)
  .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
  .negate()
  .threshold(90)
  .negate()  // black lines on white
  .png()
  .toBuffer();

const softPath = path.join(rootDir, 'output', 'v2-edges-soft.png');
fs.writeFileSync(softPath, softEdges);
console.log(`  Soft edges: ${(softEdges.length / 1024).toFixed(1)} KB`);

// ═══ Step 2: Try multiple tracer configs ═══

const configs = [
  {
    name: 'edges-stroke-v1',
    input: invertedPath,
    opts: {
      fillStyle: FillStyle.STROKE,
      strokeWidth: 1.5,
      numberOfColors: 2,
      minShapeOutline: 0,    // Don't filter any shapes
      lineErrorMargin: 1,
      curveErrorMargin: 1,
      blurRadius: 0,
      scale: 1,
    }
  },
  {
    name: 'edges-stroke-v2',
    input: invertedPath,
    opts: {
      fillStyle: FillStyle.STROKE,
      strokeWidth: 2,
      numberOfColors: 2,
      minShapeOutline: 3,
      lineErrorMargin: 2,
      curveErrorMargin: 2,
      blurRadius: 0,
      scale: 1,
    }
  },
  {
    name: 'edges-fill-v1',
    input: invertedPath,
    opts: {
      fillStyle: FillStyle.FILL,
      numberOfColors: 2,
      minShapeOutline: 0,
      lineErrorMargin: 1,
      curveErrorMargin: 1,
      blurRadius: 0,
      scale: 1,
    }
  },
  {
    name: 'soft-stroke-v1',
    input: softPath,
    opts: {
      fillStyle: FillStyle.STROKE,
      strokeWidth: 1.5,
      numberOfColors: 2,
      minShapeOutline: 2,
      lineErrorMargin: 1.5,
      curveErrorMargin: 1.5,
      blurRadius: 0,
      scale: 1,
    }
  },
];

for (const cfg of configs) {
  console.log(`\nTracing: ${cfg.name}...`);
  const outPath = path.join(rootDir, 'output', `v2-${cfg.name}.svg`);
  await ImageTracerNodejs.fromFileName(cfg.input, {
    ...cfg.opts,
    out: outPath,
    output: 'svg',
  });
  const svg = fs.readFileSync(outPath, 'utf8');
  const pathCount = (svg.match(/<path/g) || []).length;
  console.log(`  → ${pathCount} paths, ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}

console.log('\nDone! Check output/v2-*.svg files');
