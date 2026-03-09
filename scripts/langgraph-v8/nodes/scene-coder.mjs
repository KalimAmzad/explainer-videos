/**
 * Node: Scene Coder — fan-out, single-pass TSX generation per scene.
 *
 * Unlike v7's scene_composer (ReAct agent with tools, up to 12 iterations),
 * this node makes a SINGLE LLM call with no tools. The storyboard provides
 * all creative decisions, and asset paths are already resolved.
 *
 * Model: moonshotai/kimi-k2.5 via OpenRouter
 * Output: { compiledScenes: [{ sceneNumber, tsxContent, durationFrames }] }
 */
import fs from 'fs';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MODELS, KEYS, CANVAS, OPENROUTER_BASE_URL } from '../config.mjs';
import { buildSceneCoderPrompt } from '../prompts/scene-coder.mjs';

function extractTSX(text) {
  if (!text) return '';
  let code = text.trim();

  // Strip <think>...</think> blocks (Qwen3/Kimi thinking models)
  code = code.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Try code fence
  const fence = code.match(/```(?:tsx|typescript|typescriptreact|ts|jsx|react|js|javascript)?\s*\n([\s\S]+?)(?:\n```|$)/);
  if (fence) return fence[1].trim();

  // No fence — strip preamble before first import
  const importIdx = code.search(/^(?:import|\/\*\*?|\/\/|export)/m);
  if (importIdx > 0) code = code.slice(importIdx).trim();

  return code;
}

export async function sceneCoderNode(state) {
  const sceneIndex = state._sceneIndex;
  const storyboard = state.storyboard;
  const scenes = storyboard?.scenes || [];

  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    const msg = `scene-coder: invalid _sceneIndex ${sceneIndex} (${scenes.length} scenes)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const sceneSpec = scenes[sceneIndex];
  const sceneNumber = sceneSpec.scene_number || sceneIndex + 1;
  const totalScenes = scenes.length;

  console.log(`\n  ── Scene Coder [Scene ${sceneNumber}/${totalScenes}] ──`);

  // Stagger parallel invocations
  const staggerMs = sceneIndex * 2000;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Get narration timing
  const narrations = state.narrations || [];
  const narration = narrations.find(n => n?.sceneNumber === sceneNumber);
  const narrationDuration = narration?.duration || 10;
  const durationFrames = Math.round((narrationDuration + 0.5) * CANVAS.fps);

  console.log(`    Duration: ${narrationDuration.toFixed(1)}s narration → ${durationFrames} frames`);
  if (sceneSpec.layout) console.log(`    Layout: ${sceneSpec.layout}`);
  console.log(`    Assets: ${(sceneSpec.assets || []).map(a => a.id).join(', ')}`);

  // Build prompt with storyboard spec + resolved assets
  const { system, user } = buildSceneCoderPrompt({
    sceneSpec,
    resolvedAssets: state.resolvedAssets || [],
    narrationDuration,
    hasNarrationFile: !!narration?.filePath,
    sceneNumber,
    totalScenes,
    theme: state.theme || {},
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
  });

  // Single-pass LLM call — NO TOOLS, NO LOOP
  const model = new ChatOpenAI({
    model: MODELS.sceneCoder,
    apiKey: KEYS.openrouter,
    configuration: { baseURL: OPENROUTER_BASE_URL },
    maxTokens: 32768,
    temperature: 0.7,
    model_kwargs: { enable_thinking: false },
  });

  // Retry with timeout: up to 2 attempts, 4 min each
  let response;
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240_000);
    try {
      response = await model.invoke(
        [new SystemMessage(system), new HumanMessage(user)],
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);
      break; // success
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      if (isTimeout && attempt < MAX_ATTEMPTS) {
        console.log(`    Scene ${sceneNumber}: attempt ${attempt} timed out, retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (isTimeout) {
        console.error(`    Scene ${sceneNumber}: LLM call timed out after ${MAX_ATTEMPTS} attempts`);
        return {
          compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames, error: 'timeout' }],
          errors: [`scene-coder [Scene ${sceneNumber}]: timed out (${MAX_ATTEMPTS} attempts)`],
        };
      }
      throw err;
    }
  }

  let rawText = typeof response.content === 'string'
    ? response.content
    : (response.content || []).map(c => c.text || '').join('');

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.sceneCoder}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  const tsxContent = extractTSX(rawText);

  if (!tsxContent) {
    console.error(`    Scene ${sceneNumber}: empty TSX returned`);
    return {
      compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames, error: 'empty TSX' }],
      errors: [`scene-coder [Scene ${sceneNumber}]: empty TSX`],
    };
  }

  // Write scene file early for debugging
  const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.writeFileSync(path.join(scenesDir, `Scene${sceneNumber}.tsx`), tsxContent, 'utf8');
  console.log(`    Wrote Scene${sceneNumber}.tsx (${tsxContent.length} chars) — single pass ✓`);

  return {
    compiledScenes: [{ sceneNumber, tsxContent, durationFrames }],
  };
}
