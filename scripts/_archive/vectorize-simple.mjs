import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');
const outputPath = path.join(rootDir, 'output', 'anger-management-simple.svg');

console.log('Vectorizing PNG to simplified SVG...');
const pngBuffer = fs.readFileSync(inputPath);

const svgString = await vectorize(pngBuffer, {
  colorMode: ColorMode.Color,
  colorPrecision: 4,       // Fewer colors
  filterSpeckle: 20,       // Remove small patches
  spliceThreshold: 45,
  cornerThreshold: 120,    // Smoother corners
  hierarchical: Hierarchical.Stacked,
  mode: PathSimplifyMode.Spline,
  layerDifference: 16,     // Larger layer difference = fewer layers
  lengthThreshold: 8.0,    // Longer segments
  maxIterations: 4,
  pathPrecision: 2,
});

fs.writeFileSync(outputPath, svgString);

const pathCount = (svgString.match(/<path/g) || []).length;
console.log(`Output: ${outputPath}`);
console.log(`Size: ${(Buffer.byteLength(svgString) / 1024).toFixed(1)} KB`);
console.log(`Path count: ${pathCount}`);
