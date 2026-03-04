/**
 * Node 3: Asset Decomposition
 * Uses Gemini Vision to break complex assets into individually-animatable SVG elements.
 */
import { callGeminiVision } from '../lib/gemini-client.mjs';
import { MODELS } from '../config.mjs';
import { buildDecompositionPrompt, DECOMPOSITION_SCHEMA } from '../prompts/asset-decomposition.mjs';

const MODEL = MODELS.decompose;

function validateElements(elements) {
  const valid = [];
  for (const el of elements) {
    if (!el.svg_code || !el.id || typeof el.order !== 'number') continue;
    if (el.svg_code.length < 10) continue;

    // Sanitize SVG
    el.svg_code = el.svg_code
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .trim();

    // Clamp bbox
    if (el.bbox) {
      el.bbox.x = Math.max(0, Math.min(1, el.bbox.x || 0));
      el.bbox.y = Math.max(0, Math.min(1, el.bbox.y || 0));
      el.bbox.w = Math.max(0.01, Math.min(1, el.bbox.w || 0.1));
      el.bbox.h = Math.max(0.01, Math.min(1, el.bbox.h || 0.1));
    } else {
      el.bbox = { x: 0, y: 0, w: 1, h: 1 };
    }

    // Default category
    if (!['main_subject', 'secondary_subject', 'detail', 'annotation', 'connector'].includes(el.category)) {
      el.category = 'detail';
    }
    if (!['simple', 'moderate', 'complex'].includes(el.complexity)) {
      el.complexity = 'moderate';
    }

    valid.push(el);
  }

  return valid.sort((a, b) => a.order - b.order);
}

export async function assetDecompositionNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 3: Asset Decomposition');
  console.log('══════════════════════════════════════');

  const { blueprint, assets } = state;
  const decomposedAssets = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = { ...assets[i] };
    const scene = blueprint.scenes[i];

    if (!scene) {
      decomposedAssets.push(asset);
      continue;
    }

    console.log(`\n  Scene ${scene.scene_number}: "${scene.title}"`);

    // Skip decomposition for roughjs or placeholder assets
    if (asset.type === 'roughjs' || asset.type === 'placeholder' || !asset.pngBase64) {
      console.log(`    Skipping (type: ${asset.type})`);
      decomposedAssets.push(asset);
      continue;
    }

    const illust = scene.illustration || {};
    const complexity = illust.complexity || 'moderate';

    // Skip simple assets
    if (complexity === 'simple') {
      console.log('    Skipping (simple complexity)');
      decomposedAssets.push(asset);
      continue;
    }

    console.log(`    Analyzing with ${MODEL} (complexity: ${complexity})...`);

    try {
      const buffer = Buffer.from(asset.pngBase64, 'base64');
      const sharp = (await import('sharp')).default;
      const meta = await sharp(buffer).metadata();

      const prompt = buildDecompositionPrompt({
        sceneNumber: scene.scene_number,
        topic: blueprint.topic,
        title: scene.title,
        description: illust.description || scene.key_concept || scene.title,
        width: meta.width,
        height: meta.height,
      });

      let result = await callGeminiVision(MODEL, buffer, 'image/png', prompt, DECOMPOSITION_SCHEMA);
      let elements = validateElements(result.elements || []);

      // Retry if too few
      if (elements.length < 3) {
        console.log(`    Only ${elements.length} elements, retrying...`);
        const retryPrompt = prompt + '\n\nYOU RETURNED TOO FEW ELEMENTS. This image has at least 5-10 components. Look MORE carefully.';
        try {
          result = await callGeminiVision(MODEL, buffer, 'image/png', retryPrompt, DECOMPOSITION_SCHEMA);
          const retryElements = validateElements(result.elements || []);
          if (retryElements.length > elements.length) elements = retryElements;
        } catch (e) {
          console.log(`    Retry failed: ${e.message}`);
        }
      }

      asset.elements = elements;
      asset.sourceWidth = meta.width;
      asset.sourceHeight = meta.height;

      console.log(`    Found ${elements.length} elements:`);
      for (const el of elements) {
        console.log(`      ${el.order}. [${el.category}] ${el.description} (${el.svg_code.length} chars)`);
      }
    } catch (e) {
      console.error(`    ERROR: ${e.message}`);
      state.errors?.push?.(`Decomposition failed for scene ${scene.scene_number}: ${e.message}`);
    }

    decomposedAssets.push(asset);
  }

  const totalElements = decomposedAssets.reduce((sum, a) => sum + (a.elements?.length || 0), 0);
  console.log(`\n  Total: ${totalElements} elements across ${decomposedAssets.length} assets`);

  return {
    decomposedAssets,
    currentStep: 'asset_decomposition_complete',
  };
}
