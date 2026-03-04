/**
 * Step 2: Crop each identified asset from the source PNG into its own file.
 * Also generates a debug overlay image showing all bounding boxes.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inputPath = process.argv[2] || path.join(rootDir, 'output', 'anger-management-infographic.png');
const manifestPath = path.join(rootDir, 'output', 'asset-manifest.json');
const assetsDir = path.join(rootDir, 'output', 'assets');

if (!fs.existsSync(manifestPath)) { console.error('Run decompose-infographic.mjs first'); process.exit(1); }
fs.mkdirSync(assetsDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const imgMeta = await sharp(inputPath).metadata();
const imgW = imgMeta.width;
const imgH = imgMeta.height;

console.log(`Source image: ${imgW}x${imgH}`);
console.log(`Assets to crop: ${manifest.length}\n`);

// Build debug overlay SVG
let debugSvgPaths = '';
const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

for (let i = 0; i < manifest.length; i++) {
  const asset = manifest[i];
  const { x, y, w, h } = asset.pixel_box;

  // Add padding (8% on each side, clamped)
  const pad = Math.round(Math.max(w, h) * 0.08);
  const cx = Math.max(0, x - pad);
  const cy = Math.max(0, y - pad);
  const cw = Math.min(imgW - cx, w + 2 * pad);
  const ch = Math.min(imgH - cy, h + 2 * pad);

  // Clamp to valid dimensions
  if (cw <= 0 || ch <= 0) {
    console.log(`  SKIP ${asset.label}: invalid crop dimensions ${cw}x${ch}`);
    continue;
  }

  // Store crop metadata
  asset.crop = { x: cx, y: cy, w: cw, h: ch, pad };

  // Crop
  const outPath = path.join(assetsDir, `${asset.label}.png`);
  await sharp(inputPath)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .png()
    .toFile(outPath);

  const fileSize = fs.statSync(outPath).size;
  console.log(`  ${asset.label}: ${cw}x${ch}px (${(fileSize / 1024).toFixed(1)} KB)`);

  // Add to debug SVG
  const color = colors[i % colors.length];
  debugSvgPaths += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="none" stroke="${color}" stroke-width="2"/>`;
  debugSvgPaths += `<text x="${cx + 3}" y="${cy + 14}" font-size="11" fill="${color}" font-family="monospace">${asset.label}</text>`;
}

// Save updated manifest with crop offsets
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest updated with crop offsets`);

// Generate debug overlay image
const debugSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">${debugSvgPaths}</svg>`;
const debugOverlay = Buffer.from(debugSvg);

await sharp(inputPath)
  .composite([{ input: debugOverlay, top: 0, left: 0 }])
  .png()
  .toFile(path.join(rootDir, 'output', 'debug-bounding-boxes.png'));

console.log(`Debug overlay: output/debug-bounding-boxes.png`);
