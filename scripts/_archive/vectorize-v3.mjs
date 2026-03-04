/**
 * V3: Best vectorization approaches for stroke animation.
 */
import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const potrace = require('potrace');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');

function countPaths(s) { return (s.match(/<path/g) || []).length; }
function save(name, svg) {
  const p = path.join(rootDir, 'output', name);
  fs.writeFileSync(p, svg);
  console.log(`  → ${countPaths(svg)} paths, ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB`);
}

const fullConfig = (overrides) => ({
  colorMode: ColorMode.Color,
  hierarchical: Hierarchical.Stacked,
  colorPrecision: 6,
  filterSpeckle: 4,
  layerDifference: 5,
  cornerThreshold: 60,
  lengthThreshold: 4.0,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 3,
  mode: PathSimplifyMode.Spline,
  ...overrides,
});

// ═══ Generate edge images ═══
console.log('Generating edge images...');
const edgesWoB = await sharp(inputPath)
  .greyscale().blur(0.8)
  .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
  .negate().threshold(120)
  .png().toBuffer();
const edgesBoW = await sharp(edgesWoB).negate().png().toBuffer();

fs.writeFileSync(path.join(rootDir, 'output', 'v3-edges-wob.png'), edgesWoB);
fs.writeFileSync(path.join(rootDir, 'output', 'v3-edges-bow.png'), edgesBoW);

// ═══ A: VTracer Cutout on edge image (black lines on white) ═══
console.log('\n=== A: VTracer Cutout on edge image ===');
const bowBuf = fs.readFileSync(path.join(rootDir, 'output', 'v3-edges-bow.png'));
const svgA = await vectorize(bowBuf, fullConfig({
  hierarchical: Hierarchical.Cutout,
  colorPrecision: 4,
  filterSpeckle: 2,
  layerDifference: 10,
}));
save('v3-a-vtracer-edges.svg', svgA);

// ═══ B: VTracer Cutout high-fidelity on original image ═══
console.log('\n=== B: VTracer Cutout on original (high fidelity) ===');
const origBuf = fs.readFileSync(inputPath);
const svgB = await vectorize(origBuf, fullConfig({
  hierarchical: Hierarchical.Cutout,
  colorPrecision: 8,
  filterSpeckle: 2,
  layerDifference: 5,
}));
save('v3-b-vtracer-cutout-hifi.svg', svgB);

// ═══ C: Potrace on edge image ═══
console.log('\n=== C: Potrace on edge image ===');
const potraceAsync = (input, opts) => new Promise((resolve, reject) => {
  potrace.trace(input, opts, (err, svg) => err ? reject(err) : resolve(svg));
});
const svgC = await potraceAsync(path.join(rootDir, 'output', 'v3-edges-bow.png'), {
  threshold: 128,
  turdSize: 2,
  alphaMax: 1,
  optCurve: true,
  optTolerance: 0.2,
  color: '#1a2844',
  background: 'transparent',
});
save('v3-c-potrace-edges.svg', svgC);

// ═══ D: Potrace posterize on original ═══
console.log('\n=== D: Potrace posterize on original ===');
const posterizeAsync = (input, opts) => new Promise((resolve, reject) => {
  potrace.posterize(input, opts, (err, svg) => err ? reject(err) : resolve(svg));
});
const svgD = await posterizeAsync(inputPath, {
  steps: 5,
  threshold: 128,
  turdSize: 4,
  optCurve: true,
  optTolerance: 0.3,
  fillStrategy: 'dominant',
});
save('v3-d-potrace-posterize.svg', svgD);

console.log('\n=== Done ===');
