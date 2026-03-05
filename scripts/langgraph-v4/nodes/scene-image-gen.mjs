/**
 * Node 2: Scene Image Generator
 * Uses Gemini Flash Image to generate a complete educational infographic
 * image for each scene. Runs in parallel via Send API.
 */
import fs from 'fs';
import path from 'path';
import { traceable } from 'langsmith/traceable';
import { MODELS } from '../config.mjs';
import { callGeminiImage } from '../lib/gemini-client.mjs';

const generateSceneImage = traceable(async function generateSceneImage(imagePrompt, model) {
  return await callGeminiImage(model, imagePrompt);
}, { run_type: 'chain', name: 'scene_image_gen' });

export async function sceneImageGenNode(state) {
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number;

  console.log(`\n  ── Image Gen [Scene ${sceneNum}]: ${sceneNotes.title} ──`);

  // Stagger parallel calls
  const staggerMs = (state._sceneIndex || 0) * 1500;
  if (staggerMs > 0) {
    await new Promise(r => setTimeout(r, staggerMs));
  }

  const prompt = sceneNotes.image_prompt;
  console.log(`    Prompt: ${prompt.slice(0, 100)}...`);

  const result = await generateSceneImage(prompt, MODELS.imageGen);

  // Save image
  const imagesDir = path.join(state.outputDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const imagePath = path.join(imagesDir, `scene${sceneNum}_full.png`);
  fs.writeFileSync(imagePath, result.buffer);

  console.log(`    Saved: ${imagePath} (${(result.buffer.length / 1024).toFixed(0)} KB)`);

  return {
    sceneImages: [{
      sceneNumber: sceneNum,
      imagePath,
      bufferBase64: result.buffer.toString('base64'),
    }],
  };
}
