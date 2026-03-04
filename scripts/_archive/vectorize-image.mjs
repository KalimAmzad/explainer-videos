import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');
const outputPath = path.join(rootDir, 'output', 'anger-management-infographic.svg');

console.log('Vectorizing PNG to SVG...');
const pngBuffer = fs.readFileSync(inputPath);
console.log(`Input: ${inputPath} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);

const svgString = await vectorize(pngBuffer, {
  colorMode: ColorMode.Color,
  colorPrecision: 6,
  filterSpeckle: 4,
  spliceThreshold: 45,
  cornerThreshold: 60,
  hierarchical: Hierarchical.Stacked,
  mode: PathSimplifyMode.Spline,
  layerDifference: 5,
  lengthThreshold: 4.0,
  maxIterations: 2,
  pathPrecision: 3,
});

fs.writeFileSync(outputPath, svgString);
console.log(`Output: ${outputPath} (${(Buffer.byteLength(svgString) / 1024).toFixed(1)} KB)`);
console.log('Vectorization complete!');
