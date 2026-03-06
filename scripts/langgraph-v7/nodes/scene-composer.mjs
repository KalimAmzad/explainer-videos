/**
 * Node: Scene Composer — LLM-based scene writer (fan-out, one per scene).
 *
 * Replaces scene-writer + scene-designer with a single LLM that receives
 * full creative freedom to write Remotion TSX. Reads from researchNotes
 * (not sceneDesigns) and uses actual narration duration for timing.
 *
 * Receives state._sceneIndex (0-based) via LangGraph Send API.
 *
 * Input:  state.researchNotes, state.assets, state.theme, state.narrations,
 *         state.outputDir, state._sceneIndex
 * Output: { compiledScenes: [{ sceneNumber, tsxContent, durationFrames }] }
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, CANVAS, KEYS } from '../config.mjs';
import { buildSceneComposerPrompt } from '../prompts/scene-composer.mjs';

/**
 * Extract TSX code from an LLM response.
 */
function extractTSX(text) {
  if (!text) return '';
  let code = text.trim();
  const fenceMatch = code.match(/^```(?:tsx|typescript|ts|jsx|react)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) code = fenceMatch[1].trim();
  if (code.startsWith('```')) {
    code = code.replace(/^```(?:tsx|typescript|ts|jsx|react)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return code.trim();
}

/**
 * Scene Composer fan-out node.
 */
export async function sceneComposerNode(state) {
  const sceneIndex = state._sceneIndex;
  const scenes = state.researchNotes?.scenes || [];

  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    console.error(`    scene-composer: invalid _sceneIndex ${sceneIndex} (${scenes.length} scenes)`);
    return { errors: [`scene-composer: invalid _sceneIndex ${sceneIndex}`] };
  }

  const scene = scenes[sceneIndex];
  const sceneNumber = scene.scene_number || sceneIndex + 1;

  console.log(`\n  ── Scene Composer [Scene ${sceneNumber}] ──`);

  // Stagger parallel calls to avoid rate limits
  const staggerMs = sceneIndex * 2000;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Get narration info (find by sceneNumber — fan-out order not guaranteed)
  const narrations = state.narrations || [];
  const narration = narrations.find(n => n?.sceneNumber === sceneNumber) || null;
  const narrationDuration = narration?.duration || scene.duration || 10;
  const narrationFile = narration?.filePath || null;

  // Calculate scene duration: narration + 0.5s buffer
  const durationFrames = Math.round((narrationDuration + 0.5) * CANVAS.fps);

  console.log(`    Narration: ${narrationDuration.toFixed(1)}s → ${durationFrames} frames`);

  // Find matching assets for this scene (prefix s{N}_)
  const allAssets = state.assets || [];
  const scenePrefix = `s${sceneNumber}_`;
  const sceneAssets = allAssets.filter(a => a?.asset_id?.startsWith(scenePrefix));
  console.log(`    Assets: ${sceneAssets.length} for scene ${sceneNumber}`);

  // Build the prompt
  const { system: systemPrompt, user: userMessage } = buildSceneComposerPrompt({
    scene,
    assets: sceneAssets,
    theme: state.theme || {},
    narrationDuration,
    narrationFile,
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
    sceneCount: scenes.length,
  });

  try {
    const client = new Anthropic({ apiKey: KEYS.anthropic });
    const modelName = MODELS.sceneComposer;

    console.log(`    Calling ${modelName}...`);

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const usage = response.usage;
    console.log(`    [${modelName}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

    const tsxContent = extractTSX(responseText);

    if (!tsxContent) {
      console.error(`    Scene ${sceneNumber}: LLM returned empty content`);
      return {
        compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames, error: 'LLM returned empty content' }],
        errors: [`scene-composer [Scene ${sceneNumber}]: empty response`],
      };
    }

    if (!tsxContent.includes(`Scene${sceneNumber}`)) {
      console.warn(`    Scene ${sceneNumber}: TSX missing expected export "Scene${sceneNumber}"`);
    }

    // Write TSX file to disk
    if (state.outputDir) {
      const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
      fs.mkdirSync(scenesDir, { recursive: true });
      const filePath = path.join(scenesDir, `Scene${sceneNumber}.tsx`);
      fs.writeFileSync(filePath, tsxContent, 'utf8');
      console.log(`    Wrote Scene${sceneNumber}.tsx (${tsxContent.length} chars)`);
    }

    return {
      compiledScenes: [{ sceneNumber, tsxContent, durationFrames }],
    };
  } catch (err) {
    console.error(`    Scene ${sceneNumber} FAILED: ${err.message}`);
    return {
      compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames, error: err.message }],
      errors: [`scene-composer [Scene ${sceneNumber}]: ${err.message}`],
    };
  }
}
