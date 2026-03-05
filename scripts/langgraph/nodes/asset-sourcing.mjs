/**
 * Node 2: Asset Sourcing (v3.2)
 * Two paths:
 * - Icons8 → download PNG → store as base64 for <image> embedding
 * - Generated → Gemini writes primitive SVG code directly (no PNG→potrace)
 */
import fs from 'fs';
import path from 'path';
import { searchIcons8, downloadIconPng } from '../lib/icons8-api.mjs';
import { generateSvgCode } from '../lib/svg-pipeline.mjs';

/**
 * Source a single asset.
 */
async function sourceOneAsset(asset, sceneNumber, assetsDir) {
  const roleLabel = `scene${sceneNumber}_${asset.role}`;
  console.log(`  [Asset] ${roleLabel}: ${asset.source_hint || 'generate'} — "${(asset.description || '').slice(0, 60)}"`);

  try {
    // Path A: Icons8 icon → download PNG → store as base64
    if (asset.source_hint === 'icons8' && asset.search_terms?.length) {
      for (const term of asset.search_terms) {
        console.log(`    [Icons8] Searching: "${term}"`);
        const results = await searchIcons8(term);

        if (results.length > 0) {
          const icon = results[0];
          console.log(`    [Icons8] Found: ${icon.name} (${icon.id})`);

          const pngBuffer = await downloadIconPng(icon.id, 128);
          if (pngBuffer) {
            // Save source PNG
            const pngFilename = `${roleLabel}_icon_src.png`;
            fs.writeFileSync(path.join(assetsDir, pngFilename), pngBuffer);

            // Store base64 for embedding in HTML
            const base64 = pngBuffer.toString('base64');
            const svgWrapper = `<image href="data:image/png;base64,${base64}" width="128" height="128"/>`;

            // Save SVG wrapper for debugging
            const svgFilename = `${roleLabel}_icon.svg`;
            fs.writeFileSync(path.join(assetsDir, svgFilename),
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${svgWrapper}</svg>`);

            console.log(`    [Icons8] Saved: ${pngFilename} + ${svgFilename} (base64 embedded)`);
            return {
              filename: svgFilename,
              description: asset.description,
              role: asset.role,
              dimensions: { width: 128, height: 128 },
              source: 'icons8',
              svgContent: svgWrapper,
              sceneNumber,
            };
          }
        }
        console.log(`    [Icons8] No results for "${term}", trying next...`);
      }
      console.log(`    [Icons8] All search terms exhausted, falling back to SVG generation`);
    }

    // Path B: LLM-generated primitive SVG code
    console.log(`    [Gemini SVG] Generating code for: "${(asset.description || '').slice(0, 60)}"`);
    const { svg, svgContent, width, height } = await generateSvgCode(
      asset.description,
      asset.svg_elements
    );

    const svgFilename = `${roleLabel}_gen.svg`;
    fs.writeFileSync(path.join(assetsDir, svgFilename), svg);

    const charCount = svgContent.length;
    console.log(`    [Gemini SVG] Saved: ${svgFilename} (${charCount} chars, ${width}x${height})`);

    return {
      filename: svgFilename,
      description: asset.description,
      role: asset.role,
      dimensions: { width, height },
      source: 'gemini_svg',
      svgContent,
      sceneNumber,
    };
  } catch (e) {
    console.error(`    [Asset] ERROR for ${roleLabel}: ${e.message}`);
    return {
      filename: null,
      description: asset.description,
      role: asset.role,
      dimensions: null,
      source: 'error',
      svgContent: '',
      error: e.message,
      sceneNumber,
    };
  }
}

export async function assetSourcingNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 2: Asset Sourcing (v3.2)');
  console.log('══════════════════════════════════════');

  const { researchNotes, outputDir } = state;
  const assetsDir = path.join(outputDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Collect all assets from all scenes
  const allTasks = [];
  for (const scene of researchNotes.scenes) {
    const sceneNum = scene.scene_number;
    for (const asset of (scene.assets || [])) {
      allTasks.push({ asset, sceneNumber: sceneNum });
    }
  }

  console.log(`  Total assets to source: ${allTasks.length}`);

  // Process all assets in parallel
  const results = await Promise.all(
    allTasks.map(({ asset, sceneNumber }) => sourceOneAsset(asset, sceneNumber, assetsDir))
  );

  // Group by scene number
  const sceneAssets = {};
  for (const result of results) {
    const sn = result.sceneNumber;
    if (!sceneAssets[sn]) sceneAssets[sn] = [];
    sceneAssets[sn].push(result);
  }

  // Build combined asset <defs> block
  const defsLines = [];
  for (const result of results) {
    if (!result.svgContent) continue;
    const defId = `asset_s${result.sceneNumber}_${result.role}`;
    defsLines.push(`<g id="${defId}">${result.svgContent}</g>`);
  }
  const assetDefs = defsLines.join('\n');

  // Save for debugging
  fs.writeFileSync(path.join(assetsDir, 'asset-defs.svg'), `<defs>\n${assetDefs}\n</defs>`);

  // Summary
  const successCount = results.filter(r => r.filename).length;
  const errorCount = results.filter(r => !r.filename).length;
  const icons8Count = results.filter(r => r.source === 'icons8').length;
  const svgGenCount = results.filter(r => r.source === 'gemini_svg').length;

  console.log(`\n  Asset sourcing complete:`);
  console.log(`    Total: ${results.length} (${successCount} success, ${errorCount} errors)`);
  console.log(`    Icons8 PNG: ${icons8Count}, Gemini SVG code: ${svgGenCount}`);
  console.log(`    Asset defs: ${defsLines.length} assets wrapped for <use href>`);

  return {
    sceneAssets,
    assetDefs,
    currentStep: 'asset_sourcing_complete',
  };
}
