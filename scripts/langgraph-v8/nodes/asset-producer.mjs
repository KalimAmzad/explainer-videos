/**
 * Node: Asset Producer — fan-out, one invocation per asset.
 *
 * NO LLM CALLS — purely HTTP-based asset fetching:
 *   - Icons: Icons8 HTTP API (search + download PNG)
 *   - AI images: Gemini image generation API
 *
 * Receives `state._assetIndex` (0-based) via LangGraph Send API.
 * Reads asset spec from the flattened storyboard asset list.
 *
 * Output: { resolvedAssets: [{ id, status, filePath?, error?, type }] }
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { KEYS, MODELS } from '../config.mjs';

// ── Icons8 HTTP API ─────────────────────────────────────────────

async function searchIcons8(query, platform = 'color', amount = 3) {
  const url = `https://search.icons8.com/api/iconsets/v6/search?term=${encodeURIComponent(query)}&amount=${amount}&platform=${platform}`;
  const data = await fetch(url).then(r => r.json());
  return (data.icons || []).slice(0, amount).map(i => ({
    id: i.id,
    commonName: i.commonName,
    platform: i.platform || platform,
  }));
}

async function downloadIcon(commonName, platform = 'color', size = 256) {
  const url = `https://img.icons8.com/${platform}/${size}/${commonName}.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Icons8 download failed: ${res.status} for ${commonName}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Gemini Image Generation ─────────────────────────────────────

async function generateImage(prompt, apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODELS.imageGen,
    contents: prompt,
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) {
    const textResponse = parts.map(p => p.text || '').join('');
    throw new Error(`No image returned. Text: ${textResponse.slice(0, 200)}`);
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ── Retry helper ────────────────────────────────────────────────

async function withRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.log(`      Retry ${attempt + 1}/${maxRetries} after ${(delay / 1000).toFixed(1)}s: ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Main entry point ────────────────────────────────────────────

/**
 * Flatten all assets from storyboard into a single indexed list.
 * Used by both the fan-out function (graph.mjs) and this node.
 */
export function flattenAssets(storyboard) {
  const assets = [];
  for (const scene of storyboard?.scenes || []) {
    for (const asset of scene.assets || []) {
      assets.push({ ...asset, sceneNumber: scene.scene_number });
    }
  }
  return assets;
}

export async function assetProducerNode(state) {
  const assetIndex = state._assetIndex;
  const allAssets = flattenAssets(state.storyboard);

  if (assetIndex < 0 || assetIndex >= allAssets.length) {
    const msg = `asset-producer: invalid _assetIndex ${assetIndex} (${allAssets.length} assets)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const asset = allAssets[assetIndex];
  const { id, type, sceneNumber } = asset;

  console.log(`\n  ── Asset Producer [${id}] (${type}) ──`);

  // Stagger to avoid rate limits
  const staggerMs = assetIndex * 500;
  if (staggerMs > 0) {
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Ensure output directory
  const assetsDir = path.join(state.outputDir, 'remotion', 'public', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const filePath = path.join(assetsDir, `${id}.png`);

  try {
    if (type === 'icon') {
      // Search Icons8, then download the best match
      const searchTerm = asset.search_term || id.replace(/^s\d+_/, '').replace(/_/g, ' ');
      const platform = asset.platform || 'color';
      const size = asset.size || 256;

      console.log(`    Searching Icons8: "${searchTerm}" (${platform})...`);
      const results = await withRetry(() => searchIcons8(searchTerm, platform, 3));

      if (results.length === 0) {
        console.warn(`    No icons found for "${searchTerm}"`);
        return {
          resolvedAssets: [{ id, status: 'failed', type, error: `No icons found for "${searchTerm}"` }],
          errors: [`asset-producer [${id}]: no icons found for "${searchTerm}"`],
        };
      }

      const bestMatch = results[0];
      console.log(`    Downloading: ${bestMatch.commonName} (${platform}/${size})...`);
      const buffer = await withRetry(() => downloadIcon(bestMatch.commonName, platform, size));
      fs.writeFileSync(filePath, buffer);
      console.log(`    Saved: ${id}.png (${(buffer.length / 1024).toFixed(1)} KB)`);

      return {
        resolvedAssets: [{ id, status: 'ok', filePath, type, commonName: bestMatch.commonName }],
      };

    } else if (type === 'ai_image') {
      // Generate image via Gemini
      const prompt = asset.prompt || `Illustration for ${id}`;
      console.log(`    Generating image: "${prompt.slice(0, 80)}..."...`);

      if (!KEYS.gemini) {
        return {
          resolvedAssets: [{ id, status: 'failed', type, error: 'GEMINI_API_KEY not set' }],
          errors: [`asset-producer [${id}]: GEMINI_API_KEY not set`],
        };
      }

      const buffer = await withRetry(() => generateImage(prompt, KEYS.gemini));
      fs.writeFileSync(filePath, buffer);
      console.log(`    Saved: ${id}.png (${(buffer.length / 1024).toFixed(1)} KB)`);

      return {
        resolvedAssets: [{ id, status: 'ok', filePath, type }],
      };

    } else {
      console.warn(`    Unknown asset type: ${type}`);
      return {
        resolvedAssets: [{ id, status: 'failed', type, error: `Unknown asset type: ${type}` }],
      };
    }
  } catch (err) {
    console.error(`    Asset ${id} FAILED: ${err.message}`);
    return {
      resolvedAssets: [{ id, status: 'failed', type, error: err.message }],
      errors: [`asset-producer [${id}]: ${err.message}`],
    };
  }
}
