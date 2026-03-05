/**
 * Node 2: Scene Image Generator — Nano Banana 2 (gemini-3.1-flash-image-preview).
 * Generates educational infographic images per scene. Parallel via Send.
 * Uses raw @google/genai since LangChain doesn't support image generation output.
 */
import fs from 'fs';
import path from 'path';
import { traceable } from 'langsmith/traceable';
import { MODELS } from '../config.mjs';
import { callGeminiImage } from '../../langgraph/lib/gemini-client.mjs';

export async function sceneImageGenNode(state) {
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number;

  console.log(`\n  ── Image Gen [Scene ${sceneNum}]: ${sceneNotes.title} ──`);

  // Stagger parallel calls
  const staggerMs = (state._sceneIndex || 0) * 2000;
  if (staggerMs > 0) await new Promise(r => setTimeout(r, staggerMs));

  const prompt = sceneNotes.image_prompt;
  console.log(`    Prompt: ${prompt.slice(0, 100)}...`);

  const result = await callGeminiImage(MODELS.imageGen, prompt);

  // Save image
  const imagesDir = path.join(state.outputDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  const imagePath = path.join(imagesDir, `scene${sceneNum}_ref.png`);
  fs.writeFileSync(imagePath, result.buffer);
  console.log(`    Saved: ${path.basename(imagePath)} (${(result.buffer.length / 1024).toFixed(0)} KB)`);

  return {
    sceneImages: [{
      sceneNumber: sceneNum,
      imagePath,
      base64: result.buffer.toString('base64'),
    }],
  };
}
