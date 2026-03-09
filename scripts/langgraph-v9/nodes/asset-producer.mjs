/**
 * Node: Asset Producer — sequential, processes all asset requests.
 *
 * NO LLM CALLS — purely API-based:
 *   - AI images: Gemini Nano Banana (gemini-3.1-flash-image-preview)
 *
 * Reads assetManifest from state (collected from scene coders).
 * Downloads/generates up to MAX_IMAGES images total.
 * Saves to outputDir/remotion/public/assets/.
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { KEYS, MODELS } from '../config.mjs';

const MAX_IMAGES = 3;

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

export async function assetProducerNode(state) {
  const manifest = state.assetManifest || [];
  const outputDir = state.outputDir;

  // Filter to image requests only, cap at MAX_IMAGES
  const imageRequests = manifest
    .filter(a => a.type === 'image' && a.prompt)
    .slice(0, MAX_IMAGES);

  console.log(`\n  ── Asset Producer ──`);
  console.log(`    Total requests: ${manifest.length}, image requests: ${imageRequests.length} (max ${MAX_IMAGES})`);

  if (imageRequests.length === 0) {
    console.log('    No image assets requested — skipping');
    return {};
  }

  const assetsDir = path.join(outputDir, 'remotion', 'public', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const errors = [];

  for (let i = 0; i < imageRequests.length; i++) {
    const asset = imageRequests[i];
    const filename = `${asset.id}.png`;
    const filePath = path.join(assetsDir, filename);

    console.log(`    [${i + 1}/${imageRequests.length}] Generating: ${asset.id}`);
    console.log(`      Prompt: ${asset.prompt.slice(0, 100)}${asset.prompt.length > 100 ? '...' : ''}`);

    // Stagger to avoid rate limits
    if (i > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }

    try {
      const imageBuffer = await withRetry(() => generateImage(asset.prompt, KEYS.gemini));
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`      Saved: ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      const msg = `asset-producer: failed to generate ${asset.id}: ${err.message}`;
      console.warn(`      FAILED: ${err.message}`);
      errors.push(msg);
    }
  }

  console.log(`    Asset production complete: ${imageRequests.length - errors.length} succeeded, ${errors.length} failed`);

  return errors.length > 0 ? { errors } : {};
}
