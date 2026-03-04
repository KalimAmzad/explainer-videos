#!/usr/bin/env node
/**
 * Bundle the multi-file project into a single self-contained HTML file.
 * Usage: node scripts/bundle.mjs
 * Output: ../anger-management-infographic-whiteboard.html
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '..', 'anger-management-infographic-whiteboard.html');

async function read(relPath) {
  return readFile(resolve(ROOT, relPath), 'utf-8');
}

async function bundle() {
  console.log('Bundling anger management infographic...');

  // Read all files
  const [
    indexHtml, css,
    configJs, layoutJs, animationJs, controlsJs,
    svgLoaderJs, roughShapesJs, timelineJs, mainJs,
    bannerSvg, step1Svg, step2Svg, step3Svg, step4Svg, step5Svg, arrowsSvg,
  ] = await Promise.all([
    read('index.html'), read('styles.css'),
    read('js/config.js'), read('js/layout.js'), read('js/animation.js'), read('js/controls.js'),
    read('js/svg-loader.js'), read('js/rough-shapes.js'), read('js/timeline.js'), read('js/main.js'),
    read('assets/title-banner.svg'), read('assets/step1-brain.svg'),
    read('assets/step2-meditator.svg'), read('assets/step3-reframer.svg'),
    read('assets/step4-communicators.svg'), read('assets/step5-selfcare.svg'),
    read('assets/arrows.svg'),
  ]);

  // Strip export/import statements from JS modules and combine
  function stripModuleSyntax(code) {
    return code
      .replace(/^export\s+(const|function|class|let|var|async\s+function)/gm, '$1')
      .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
      .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '');
  }

  const allJs = [configJs, layoutJs, animationJs, controlsJs, roughShapesJs, timelineJs]
    .map(stripModuleSyntax).join('\n\n');

  // For svg-loader and main.js, we need special handling:
  // Instead of fetch(), embed SVGs as inline data
  const svgMap = {
    'assets/step1-brain.svg': step1Svg,
    'assets/step2-meditator.svg': step2Svg,
    'assets/step3-reframer.svg': step3Svg,
    'assets/step4-communicators.svg': step4Svg,
    'assets/step5-selfcare.svg': step5Svg,
    'assets/arrows.svg': arrowsSvg,
  };

  // Create inline SVG loader that uses embedded data
  const inlineSvgData = `
const SVG_DATA = ${JSON.stringify(svgMap)};

async function inlineFetch(url) {
  const data = SVG_DATA[url];
  if (!data) return { ok: false, status: 404 };
  return { ok: true, async text() { return data; } };
}
`;

  // Modify svg-loader to use inlineFetch
  const modifiedLoader = stripModuleSyntax(svgLoaderJs)
    .replace(/fetch\(asset\.file\)/g, 'inlineFetch(asset.file)')
    .replace(/fetch\('assets\/arrows\.svg'\)/g, "inlineFetch('assets/arrows.svg')");

  const modifiedMain = stripModuleSyntax(mainJs);

  // Build the single HTML file
  // Start from index.html but inline everything
  let html = indexHtml;

  // Replace stylesheet link with inline style
  html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${css}\n</style>`
  );

  // Remove module script tag and replace with inline script
  html = html.replace(
    '<script type="module" src="js/main.js"></script>',
    `<script>
${allJs}

${inlineSvgData}

${modifiedLoader}

${modifiedMain}
</script>`
  );

  await writeFile(OUT, html, 'utf-8');
  console.log(`Bundled to: ${OUT}`);
}

bundle().catch(console.error);
