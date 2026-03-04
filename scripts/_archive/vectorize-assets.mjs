/**
 * Step 3: Per-asset vectorization.
 * - containers/arrows: Potrace edge detection → stroke path
 * - icons: Potrace stroke + VTracer color fills
 * - characters: VTracer color fills only (fade-in)
 * - text_block/title_banner: skip (re-render as SVG <text>)
 * - number_badge: VTracer color fills (fade-in)
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
const assetsDir = path.join(rootDir, 'output', 'assets');
const manifestPath = path.join(rootDir, 'output', 'asset-manifest.json');

if (!fs.existsSync(manifestPath)) { console.error('Run decompose-infographic.mjs and crop-assets.mjs first'); process.exit(1); }

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const potraceAsync = (input, opts) => new Promise((resolve, reject) => {
  potrace.trace(input, opts, (err, svg) => err ? reject(err) : resolve(svg));
});

const vtracerConfig = {
  colorMode: ColorMode.Color,
  hierarchical: Hierarchical.Cutout,
  colorPrecision: 6,
  filterSpeckle: 4,
  layerDifference: 5,
  cornerThreshold: 60,
  lengthThreshold: 4.0,
  spliceThreshold: 45,
  maxIterations: 10,
  pathPrecision: 3,
  mode: PathSimplifyMode.Spline,
};

function extractPotracePathD(svgString) {
  const match = svgString.match(/<path d="([^"]+)"/);
  return match ? match[1] : '';
}

function extractVtracerPaths(svgString) {
  const paths = [];
  const regex = /<path d="([^"]+)" fill="([^"]+)"(?: transform="translate\(([^,]+),([^)]+)\)")?/g;
  let m;
  while ((m = regex.exec(svgString)) !== null) {
    paths.push({
      d: m[1],
      fill: m[2],
      tx: m[3] ? parseFloat(m[3]) : 0,
      ty: m[4] ? parseFloat(m[4]) : 0,
    });
  }
  return paths;
}

console.log(`Vectorizing ${manifest.length} assets...\n`);

let processed = 0;
let skipped = 0;

for (const asset of manifest) {
  const assetPath = path.join(assetsDir, `${asset.label}.png`);
  if (!fs.existsSync(assetPath)) {
    console.log(`  SKIP ${asset.label}: crop file not found`);
    skipped++;
    continue;
  }

  // Skip text — will be rendered as SVG <text>
  if (asset.type === 'text_block' || asset.type === 'title_banner') {
    console.log(`  TEXT ${asset.label}: skipped (will render as SVG text)`);
    asset.vectorized = { type: 'text' };
    skipped++;
    continue;
  }

  const buf = fs.readFileSync(assetPath);
  const meta = await sharp(assetPath).metadata();

  try {
    if (asset.type === 'container' || asset.type === 'arrow') {
      // Edge detection → Potrace for stroke path
      const edges = await sharp(assetPath)
        .greyscale()
        .blur(0.8)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .negate()
        .threshold(120)
        .negate()
        .png()
        .toBuffer();

      const strokeSvg = await potraceAsync(edges, {
        threshold: 128,
        turdSize: asset.type === 'arrow' ? 1 : 2,
        alphaMax: 1,
        optCurve: true,
        optTolerance: 0.3,
        color: asset.dominant_color,
        background: 'transparent',
      });

      const pathD = extractPotracePathD(strokeSvg);
      asset.vectorized = {
        type: 'stroke',
        stroke_path_d: pathD,
        source_w: meta.width,
        source_h: meta.height,
      };
      console.log(`  STROKE ${asset.label}: path ${pathD.length} chars`);

    } else if (asset.type === 'icon') {
      // Potrace stroke + VTracer color fills
      const edges = await sharp(assetPath)
        .greyscale()
        .blur(0.8)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .negate()
        .threshold(120)
        .negate()
        .png()
        .toBuffer();

      const strokeSvg = await potraceAsync(edges, {
        threshold: 128,
        turdSize: 2,
        alphaMax: 1,
        optCurve: true,
        optTolerance: 0.3,
        color: asset.dominant_color,
        background: 'transparent',
      });

      const colorSvg = await vectorize(buf, vtracerConfig);
      const fillPaths = extractVtracerPaths(colorSvg);

      asset.vectorized = {
        type: 'stroke_and_fill',
        stroke_path_d: extractPotracePathD(strokeSvg),
        fill_paths: fillPaths,
        source_w: meta.width,
        source_h: meta.height,
      };
      console.log(`  ICON ${asset.label}: stroke ${asset.vectorized.stroke_path_d.length} chars, ${fillPaths.length} fill paths`);

    } else if (asset.type === 'character') {
      // VTracer color fills only (too complex for stroke)
      const colorSvg = await vectorize(buf, vtracerConfig);
      const fillPaths = extractVtracerPaths(colorSvg);

      asset.vectorized = {
        type: 'fill_only',
        fill_paths: fillPaths,
        source_w: meta.width,
        source_h: meta.height,
      };
      console.log(`  CHAR ${asset.label}: ${fillPaths.length} fill paths`);

    } else if (asset.type === 'number_badge') {
      // Small element — VTracer for simple fill
      const colorSvg = await vectorize(buf, {
        ...vtracerConfig,
        colorPrecision: 4,
        filterSpeckle: 1,
      });
      const fillPaths = extractVtracerPaths(colorSvg);

      asset.vectorized = {
        type: 'fill_only',
        fill_paths: fillPaths,
        source_w: meta.width,
        source_h: meta.height,
      };
      console.log(`  BADGE ${asset.label}: ${fillPaths.length} fill paths`);
    }

    processed++;
  } catch (e) {
    console.error(`  ERROR ${asset.label}: ${e.message}`);
    asset.vectorized = { type: 'error', error: e.message };
  }
}

// Save enriched manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nDone: ${processed} vectorized, ${skipped} skipped`);
console.log(`Manifest updated: ${manifestPath}`);
