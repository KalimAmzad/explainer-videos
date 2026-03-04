import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const inputPath = path.join(rootDir, 'output', 'anger-management-simple.svg');
const outputPath = path.join(rootDir, 'output', 'anger-management-rough.svg');

const svgContent = fs.readFileSync(inputPath, 'utf8');

// Extract width/height from the SVG
const widthMatch = svgContent.match(/width="(\d+)"/);
const heightMatch = svgContent.match(/height="(\d+)"/);
const svgWidth = widthMatch ? parseInt(widthMatch[1]) : 1408;
const svgHeight = heightMatch ? parseInt(heightMatch[1]) : 768;

console.log(`SVG dimensions: ${svgWidth}x${svgHeight}`);
console.log('Launching browser for svg2roughjs conversion...');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: svgWidth, height: svgHeight } });

// Inject the SVG + svg2roughjs and run the conversion
const html = `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/svg2roughjs@3.2.2/dist/svg2roughjs.umd.min.js"><\/script>
  <style>
    body { margin: 0; padding: 0; }
    #output { width: ${svgWidth}px; height: ${svgHeight}px; }
  </style>
</head>
<body>
  <div id="output"></div>
  <div id="source" style="display:none;">${svgContent.replace(/<script[\s\S]*?<\/script>/g, '')}</div>
  <script>
    (async () => {
      try {
        const sourceSvg = document.querySelector('#source svg');
        if (!sourceSvg) {
          window.error = 'No SVG found in source';
          return;
        }

        const converter = new svg2roughjs.Svg2Roughjs('#output', svg2roughjs.OutputType.SVG);
        converter.svg = sourceSvg;
        converter.roughConfig = {
          roughness: 1.2,
          strokeWidth: 1.5,
          fillStyle: 'solid',
          seed: 42,
          bowing: 1
        };
        converter.pencilFilter = false;
        converter.randomize = true;
        converter.fontFamily = 'Caveat, Patrick Hand, Comic Sans MS, cursive';

        await converter.sketch();

        const outputSvg = document.querySelector('#output svg');
        if (outputSvg) {
          // Add viewBox for consistent sizing
          outputSvg.setAttribute('viewBox', '0 0 ${svgWidth} ${svgHeight}');
          window.result = outputSvg.outerHTML;
        } else {
          window.error = 'No output SVG generated';
        }
      } catch (e) {
        window.error = e.message + '\\n' + e.stack;
      }
    })();
  <\/script>
</body>
</html>`;

await page.setContent(html, { waitUntil: 'networkidle' });

// Wait for either result or error
await page.waitForFunction(() => window.result || window.error, { timeout: 60000 });

const error = await page.evaluate(() => window.error);
if (error) {
  console.error('svg2roughjs error:', error);
  await browser.close();
  process.exit(1);
}

const result = await page.evaluate(() => window.result);
await browser.close();

fs.writeFileSync(outputPath, result);
const pathCount = (result.match(/<path/g) || []).length;
console.log(`Rough SVG saved: ${outputPath}`);
console.log(`Size: ${(Buffer.byteLength(result) / 1024).toFixed(1)} KB`);
console.log(`Path count: ${pathCount}`);
console.log('Done!');
