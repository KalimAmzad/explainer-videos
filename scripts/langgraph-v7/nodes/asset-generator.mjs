/**
 * Node 4: Asset Generator — fan-out node, one invocation per visual asset.
 * Routes to the correct generation method:
 *   - llm_svg / svg  → Haiku generates SVG code with theme colors
 *   - icons8         → Icons8 API search + download PNG
 *   - nano_banana    → Gemini image generation
 *   - text           → Skipped (rendered directly by Remotion)
 *
 * Receives `state._asset` with individual asset info via LangGraph Send API.
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildAssetSvgGenPrompt } from '../prompts/asset-svg-gen.mjs';

// ---------- Main entry point ----------

export async function assetGeneratorNode(state) {
  const asset = state._asset;
  if (!asset) return { errors: ['asset-generator: no _asset in state'] };

  console.log(`\n  ── Asset Generator [${asset.asset_id}] ──`);
  console.log(`    Type: ${asset.asset_type}, Method: ${asset.generation_method}`);

  // Stagger parallel calls to avoid rate limits
  const staggerMs = (state._sceneIndex || 0) * 800;
  if (staggerMs > 0) await new Promise(r => setTimeout(r, staggerMs));

  const assetsDir = path.join(state.outputDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  try {
    if (asset.generation_method === 'llm_svg' || asset.asset_type === 'svg') {
      return await generateSvg(asset, state, assetsDir);
    } else if (asset.generation_method === 'icons8') {
      return await generateIcon(asset, state, assetsDir);
    } else if (asset.generation_method === 'nano_banana') {
      return await generateImage(asset, state, assetsDir);
    } else {
      console.log(`    Unknown method: ${asset.generation_method}, falling back to SVG`);
      return await generateSvg(asset, state, assetsDir);
    }
  } catch (e) {
    console.error(`    Asset generation failed: ${e.message}`);
    return { errors: [`asset-generator [${asset.asset_id}]: ${e.message}`] };
  }
}

// ---------- SVG generation via Haiku ----------

async function generateSvg(asset, state, assetsDir) {
  const model = new ChatAnthropic({
    model: MODELS.assetSvgGen,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 4096,
  });

  const prompt = buildAssetSvgGenPrompt({
    asset,
    theme: state.theme,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = typeof response.content === 'string'
    ? response.content
    : response.content.map(c => c.text || '').join('');

  // Strip markdown fences
  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:svg|xml|html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.assetSvgGen}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  // Validate SVG structure
  if (!text.includes('<svg') || !text.includes('</svg>')) {
    throw new Error('Response does not contain valid SVG markup');
  }

  // Verify sub-element groups if expected
  if (asset.sub_elements?.length > 0) {
    const missingGroups = [];
    for (const sub of asset.sub_elements) {
      const groupId = `${asset.asset_id}__${sub.sub_id}`;
      if (!text.includes(`id="${groupId}"`)) {
        missingGroups.push(groupId);
      }
    }
    if (missingGroups.length > 0) {
      console.warn(`    Missing sub-element groups: ${missingGroups.join(', ')}`);
    }
  }

  // Save to disk
  const filePath = path.join(assetsDir, `${asset.asset_id}.svg`);
  fs.writeFileSync(filePath, text);
  const sizeKB = (text.length / 1024).toFixed(1);
  console.log(`    Saved: ${asset.asset_id}.svg (${sizeKB} KB)`);

  return {
    assets: [{
      asset_id: asset.asset_id,
      type: 'svg',
      content: text,
      filePath,
      hasSubElements: !!(asset.sub_elements?.length),
    }],
  };
}

// ---------- Icons8 search + download ----------

async function generateIcon(asset, state, assetsDir) {
  const searchTerm = asset.description || asset.asset_id;
  const encodedTerm = encodeURIComponent(searchTerm);
  const searchUrl = `https://search.icons8.com/api/iconsets/v6/search?term=${encodedTerm}&amount=5&platform=color`;

  console.log(`    Icons8 search: "${searchTerm}"`);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`Icons8 search failed: ${searchRes.status} ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  const icons = searchData.icons || [];

  if (icons.length === 0) {
    throw new Error(`No Icons8 results for "${searchTerm}"`);
  }

  // Pick the first result
  const icon = icons[0];
  const iconId = icon.id || icon.commonName;
  console.log(`    Found: "${icon.name || icon.commonName}" (id: ${iconId})`);

  // Download PNG at a usable size
  const pngUrl = `https://img.icons8.com/color/256/${icon.commonName || iconId}.png`;
  const pngRes = await fetch(pngUrl);
  if (!pngRes.ok) {
    throw new Error(`Icons8 PNG download failed: ${pngRes.status} ${pngRes.statusText}`);
  }

  const buffer = Buffer.from(await pngRes.arrayBuffer());
  const filePath = path.join(assetsDir, `${asset.asset_id}.png`);
  fs.writeFileSync(filePath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`    Saved: ${asset.asset_id}.png (${sizeKB} KB)`);

  return {
    assets: [{
      asset_id: asset.asset_id,
      type: 'png',
      filePath,
      hasSubElements: false,
    }],
  };
}

// ---------- Gemini image generation (Nano Banana) ----------

async function generateImage(asset, state, assetsDir) {
  // Dynamic import to avoid hard dependency when not using this method
  const { callGeminiImage } = await import('../../langgraph/lib/gemini-client.mjs');

  const prompt = asset.description || `Generate an illustration for: ${asset.asset_id}`;
  console.log(`    Gemini image prompt: ${prompt.slice(0, 100)}...`);

  const result = await callGeminiImage(MODELS.imageGen, prompt);

  const filePath = path.join(assetsDir, `${asset.asset_id}.png`);
  fs.writeFileSync(filePath, result.buffer);
  const sizeKB = (result.buffer.length / 1024).toFixed(1);
  console.log(`    Saved: ${asset.asset_id}.png (${sizeKB} KB)`);

  if (result.text) {
    console.log(`    Gemini text: ${result.text.slice(0, 80)}`);
  }

  return {
    assets: [{
      asset_id: asset.asset_id,
      type: 'png',
      filePath,
      hasSubElements: false,
    }],
  };
}
