/**
 * Three vectorization approaches compared:
 * A) VTracer Cutout mode — high-fidelity color fills with element separation
 * B) image-tracer-ts stroke mode — native stroke paths from original
 * C) Edge detection (sharp Laplacian) → image-tracer-ts — clean outlines
 * C2) Edge detection (sharp Sobel) → image-tracer-ts — another edge variant
 */
import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import { ImageTracerNodejs, FillStyle } from '@image-tracer-ts/nodejs';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');
const pngBuffer = fs.readFileSync(inputPath);

console.log(`Input: ${inputPath} (${(pngBuffer.length / 1024).toFixed(1)} KB)\n`);

function countPaths(svgStr) { return (svgStr.match(/<path/g) || []).length; }

// ═══════════════════════════════════════════
//  APPROACH A: VTracer Cutout + high precision
// ═══════════════════════════════════════════
console.log('=== Approach A: VTracer Cutout mode (high precision) ===');
const svgA = await vectorize(pngBuffer, {
  colorMode: ColorMode.Color,
  hierarchical: Hierarchical.Cutout,
  colorPrecision: 8,
  filterSpeckle: 2,
  layerDifference: 5,
  cornerThreshold: 60,
  lengthThreshold: 4.0,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 3,
  mode: PathSimplifyMode.Spline,
});
fs.writeFileSync(path.join(rootDir, 'output', 'v2-approach-a-cutout.svg'), svgA);
console.log(`  Paths: ${countPaths(svgA)}, Size: ${(Buffer.byteLength(svgA) / 1024).toFixed(1)} KB`);

// ═══════════════════════════════════════════
//  APPROACH B: image-tracer-ts stroke mode
// ═══════════════════════════════════════════
console.log('\n=== Approach B: image-tracer-ts stroke mode (direct on original) ===');
const outB = path.join(rootDir, 'output', 'v2-approach-b-stroke.svg');
await ImageTracerNodejs.fromFileName(inputPath, {
  out: outB,
  output: 'svg',
  fillStyle: FillStyle.STROKE,
  strokeWidth: 1.5,
  numberOfColors: 24,
  minShapeOutline: 5,
  lineErrorMargin: 1,
  curveErrorMargin: 1,
  blurRadius: 0,
  scale: 1,
});
const svgB = fs.readFileSync(outB, 'utf8');
console.log(`  Paths: ${countPaths(svgB)}, Size: ${(Buffer.byteLength(svgB) / 1024).toFixed(1)} KB`);

// ═══════════════════════════════════════════
//  APPROACH C: Laplacian edge detection → stroke trace
// ═══════════════════════════════════════════
console.log('\n=== Approach C: Laplacian edge detection → stroke trace ===');
const edgeBuffer = await sharp(inputPath)
  .greyscale()
  .blur(0.8)
  .convolve({
    width: 3, height: 3,
    kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
  })
  .negate()
  .threshold(120)
  .png()
  .toBuffer();

const edgePath = path.join(rootDir, 'output', 'v2-edges-laplacian.png');
fs.writeFileSync(edgePath, edgeBuffer);
console.log(`  Edge image: ${(edgeBuffer.length / 1024).toFixed(1)} KB`);

const outC = path.join(rootDir, 'output', 'v2-approach-c-edges.svg');
await ImageTracerNodejs.fromFileName(edgePath, {
  out: outC,
  output: 'svg',
  fillStyle: FillStyle.STROKE,
  strokeWidth: 1.5,
  numberOfColors: 2,
  minShapeOutline: 8,
  lineErrorMargin: 1.5,
  curveErrorMargin: 1.5,
  blurRadius: 0,
  scale: 1,
});
const svgC = fs.readFileSync(outC, 'utf8');
console.log(`  Paths: ${countPaths(svgC)}, Size: ${(Buffer.byteLength(svgC) / 1024).toFixed(1)} KB`);

// ═══════════════════════════════════════════
//  APPROACH C2: Sobel edge detection → stroke trace
// ═══════════════════════════════════════════
console.log('\n=== Approach C2: Sobel edge detection → stroke trace ===');
const sobelX = await sharp(inputPath)
  .greyscale()
  .convolve({ width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1] })
  .toBuffer();
const sobelY = await sharp(inputPath)
  .greyscale()
  .convolve({ width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] })
  .toBuffer();
const sobelCombined = await sharp(sobelX)
  .composite([{ input: sobelY, blend: 'add' }])
  .negate()
  .threshold(140)
  .png()
  .toBuffer();

const sobelEdgePath = path.join(rootDir, 'output', 'v2-edges-sobel.png');
fs.writeFileSync(sobelEdgePath, sobelCombined);
console.log(`  Sobel edge image: ${(sobelCombined.length / 1024).toFixed(1)} KB`);

const outC2 = path.join(rootDir, 'output', 'v2-approach-c2-sobel.svg');
await ImageTracerNodejs.fromFileName(sobelEdgePath, {
  out: outC2,
  output: 'svg',
  fillStyle: FillStyle.STROKE,
  strokeWidth: 1.5,
  numberOfColors: 2,
  minShapeOutline: 10,
  lineErrorMargin: 1.5,
  curveErrorMargin: 1.5,
  blurRadius: 0,
  scale: 1,
});
const svgC2 = fs.readFileSync(outC2, 'utf8');
console.log(`  Paths: ${countPaths(svgC2)}, Size: ${(Buffer.byteLength(svgC2) / 1024).toFixed(1)} KB`);

// ═══════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════
console.log('\n=== Summary ===');
console.log(`  A) VTracer Cutout:      ${countPaths(svgA)} paths, ${(Buffer.byteLength(svgA) / 1024).toFixed(0)} KB`);
console.log(`  B) ImageTracer stroke:  ${countPaths(svgB)} paths, ${(Buffer.byteLength(svgB) / 1024).toFixed(0)} KB`);
console.log(`  C) Laplacian edges:     ${countPaths(svgC)} paths, ${(Buffer.byteLength(svgC) / 1024).toFixed(0)} KB`);
console.log(`  C2) Sobel edges:        ${countPaths(svgC2)} paths, ${(Buffer.byteLength(svgC2) / 1024).toFixed(0)} KB`);
