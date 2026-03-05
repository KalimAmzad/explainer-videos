/**
 * Node 3: Asset Decomposer
 * Uses Gemini Vision to detect bounding boxes for asset groups in scene images.
 * Crops each group as a separate PNG using sharp.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { traceable } from 'langsmith/traceable';
import { MODELS, CANVAS } from '../config.mjs';
import { callGeminiVision } from '../lib/gemini-client.mjs';

const VISION_SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_id:    { type: 'integer' },
          label:       { type: 'string' },
          type:        { type: 'string', enum: ['text', 'diagram', 'icon', 'chart', 'mixed'] },
          bbox: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' },
            },
            required: ['x', 'y', 'w', 'h'],
          },
          text_content: { type: 'string' },
        },
        required: ['group_id', 'label', 'type', 'bbox'],
      },
    },
  },
  required: ['groups'],
};

function buildVisionPrompt(sceneNotes) {
  const groupHints = (sceneNotes.asset_groups || [])
    .map(g => `  - Group ${g.group_id} "${g.label}": ${g.description} (type: ${g.type})`)
    .join('\n');

  return `You are analyzing an educational infographic image to identify distinct visual asset groups for animation.

## Scene: "${sceneNotes.title}"

## Expected Asset Groups
${groupHints}

## Task
Identify the bounding box for each asset group in the image. Return fractional coordinates (0.0 to 1.0) relative to the image dimensions.

For each group:
- **bbox.x**: Left edge as fraction of image width (0.0 = left edge, 1.0 = right edge)
- **bbox.y**: Top edge as fraction of image height (0.0 = top, 1.0 = bottom)
- **bbox.w**: Width as fraction of image width
- **bbox.h**: Height as fraction of image height
- **text_content**: If the group contains text, extract it exactly as shown

Be generous with bounding boxes — include some padding around each element. Make sure no important content is cut off.

If a group from the expected list is not visible in the image, still include it with your best estimate of where it should be.`;
}

const detectGroups = traceable(async function detectGroups(imageBuffer, sceneNotes, model) {
  const prompt = buildVisionPrompt(sceneNotes);
  return await callGeminiVision(model, imageBuffer, 'image/png', prompt, VISION_SCHEMA);
}, { run_type: 'chain', name: 'asset_decomposer' });

export async function assetDecomposerNode(state) {
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number;
  const sceneImage = state._sceneImage;

  console.log(`\n  ── Asset Decomposer [Scene ${sceneNum}]: ${sceneNotes.title} ──`);

  // Stagger parallel calls
  const staggerMs = (state._sceneIndex || 0) * 1000;
  if (staggerMs > 0) {
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Get image buffer
  const imageBuffer = Buffer.from(sceneImage.bufferBase64, 'base64');
  const metadata = await sharp(imageBuffer).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;

  console.log(`    Image: ${imgW}×${imgH}`);

  // Detect bounding boxes
  const result = await detectGroups(imageBuffer, sceneNotes, MODELS.vision);
  const groups = result.groups || [];

  console.log(`    Detected ${groups.length} groups`);

  // Crop each group
  const cropsDir = path.join(state.outputDir, 'crops');
  fs.mkdirSync(cropsDir, { recursive: true });

  const processedGroups = [];
  for (const group of groups) {
    const bbox = group.bbox;
    // Convert fractional to pixel coordinates
    const left = Math.max(0, Math.round(bbox.x * imgW));
    const top = Math.max(0, Math.round(bbox.y * imgH));
    const width = Math.min(imgW - left, Math.max(10, Math.round(bbox.w * imgW)));
    const height = Math.min(imgH - top, Math.max(10, Math.round(bbox.h * imgH)));

    const cropPath = path.join(cropsDir, `scene${sceneNum}_group${group.group_id}.png`);

    try {
      await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .toFile(cropPath);

      console.log(`    Group ${group.group_id} "${group.label}": ${width}×${height} → ${path.basename(cropPath)}`);
    } catch (e) {
      console.log(`    Group ${group.group_id} crop failed: ${e.message}`);
      continue;
    }

    // Match timing from research notes
    const assetGroup = sceneNotes.asset_groups?.find(ag => ag.group_id === group.group_id);

    processedGroups.push({
      group_id: group.group_id,
      label: group.label,
      type: group.type,
      text_content: group.text_content || '',
      bbox_px: { left, top, width, height },
      bbox_frac: bbox,
      cropPath,
      narration: assetGroup?.narration_segment || '',
      time_start: assetGroup?.time_start || 0,
      time_end: assetGroup?.time_end || 0,
    });
  }

  return {
    sceneGroups: [{
      sceneNumber: sceneNum,
      groups: processedGroups,
    }],
  };
}
