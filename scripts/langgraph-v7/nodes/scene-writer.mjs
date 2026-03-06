/**
 * Node: Scene Writer — LLM-based scene compositor (fan-out, one per scene).
 *
 * Replaces the deterministic scene-compositor with an LLM that writes
 * actual Remotion TSX code for each scene. Produces professional video
 * animations instead of rigid template compositions.
 *
 * Receives state._sceneIndex (0-based index into sceneDesigns array)
 * via LangGraph Send API.
 *
 * Input:  state.sceneDesigns, state.assets, state.theme, state.narrations,
 *         state.outputDir, state._sceneIndex
 * Output: { compiledScenes: [{ sceneNumber, tsxContent }] }
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, CANVAS } from '../config.mjs';
import { buildSceneWriterPrompt } from '../prompts/scene-writer.mjs';

/**
 * Extract TSX code from an LLM response.
 * Handles responses wrapped in ```tsx ... ``` fences or raw code.
 *
 * @param {string} text - Raw LLM response text
 * @returns {string} Cleaned TSX code
 */
function extractTSX(text) {
  if (!text) return '';

  let code = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = code.match(/^```(?:tsx|typescript|ts|jsx|react)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    code = fenceMatch[1].trim();
  }

  // If still wrapped in fences (sometimes LLMs double-wrap), strip again
  if (code.startsWith('```')) {
    code = code.replace(/^```(?:tsx|typescript|ts|jsx|react)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return code.trim();
}

/**
 * Scene Writer fan-out node.
 * Called once per scene via LangGraph Send API.
 *
 * @param {object} state - LangGraph state with _sceneIndex for fan-out
 * @returns {{ compiledScenes: Array<{ sceneNumber: number, tsxContent: string }> }}
 */
export async function sceneWriterNode(state) {
  const sceneIndex = state._sceneIndex;
  const sceneDesigns = state.sceneDesigns || [];

  if (sceneIndex < 0 || sceneIndex >= sceneDesigns.length) {
    console.error(`    scene-writer: invalid _sceneIndex ${sceneIndex} (${sceneDesigns.length} scenes)`);
    return { errors: [`scene-writer: invalid _sceneIndex ${sceneIndex}`] };
  }

  const sceneDesign = sceneDesigns[sceneIndex];
  const sceneNumber = sceneDesign.scene_number || sceneIndex + 1;

  console.log(`\n  ── Scene Writer [Scene ${sceneNumber}] ──`);

  // Stagger parallel calls to avoid rate limits
  const staggerMs = sceneIndex * 1500;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Find matching assets for this scene (match by asset_id prefix s{sceneNumber}_)
  const allAssets = state.assets || [];
  const scenePrefix = `s${sceneNumber}_`;
  const sceneAssets = allAssets.filter(a =>
    a && a.asset_id && a.asset_id.startsWith(scenePrefix)
  );
  console.log(`    Found ${sceneAssets.length} assets for scene ${sceneNumber}`);

  // Get narration info if available
  const narrations = state.narrations || [];
  const narration = narrations[sceneIndex] || narrations.find(n => n?.sceneNumber === sceneNumber) || null;
  const narrationDuration = narration?.duration || 0;
  const narrationFile = narration?.filePath || '';

  // Build the prompt
  const { system: systemPrompt, user: userMessage } = buildSceneWriterPrompt({
    sceneDesign,
    assets: sceneAssets,
    theme: state.theme || {},
    narrationDuration,
    narrationFile,
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
  });

  try {
    // Call Claude Sonnet via @anthropic-ai/sdk
    const client = new Anthropic();
    const modelName = MODELS.sceneWriter;

    console.log(`    Calling ${modelName}...`);

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text from response
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Log token usage
    const usage = response.usage;
    console.log(`    [${modelName}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

    // Extract TSX code
    const tsxContent = extractTSX(responseText);

    if (!tsxContent) {
      console.error(`    Scene ${sceneNumber}: LLM returned empty content`);
      return {
        compiledScenes: [{ sceneNumber, tsxContent: '', error: 'LLM returned empty content' }],
        errors: [`scene-writer [Scene ${sceneNumber}]: empty response`],
      };
    }

    // Validate basic structure
    if (!tsxContent.includes(`Scene${sceneNumber}`)) {
      console.warn(`    Scene ${sceneNumber}: TSX does not contain expected export name "Scene${sceneNumber}"`);
    }

    if (!tsxContent.includes('useCurrentFrame') && !tsxContent.includes('useVideoConfig')) {
      console.warn(`    Scene ${sceneNumber}: TSX missing Remotion hooks (useCurrentFrame/useVideoConfig)`);
    }

    // Write the TSX file to disk
    if (state.outputDir) {
      const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
      fs.mkdirSync(scenesDir, { recursive: true });

      const filePath = path.join(scenesDir, `Scene${sceneNumber}.tsx`);
      fs.writeFileSync(filePath, tsxContent, 'utf8');
      console.log(`    Wrote Scene${sceneNumber}.tsx (${tsxContent.length} chars)`);
    }

    return {
      compiledScenes: [{ sceneNumber, tsxContent }],
    };
  } catch (err) {
    console.error(`    Scene ${sceneNumber} FAILED: ${err.message}`);

    // Return error state but don't crash the pipeline
    return {
      compiledScenes: [{ sceneNumber, tsxContent: '', error: err.message }],
      errors: [`scene-writer [Scene ${sceneNumber}]: ${err.message}`],
    };
  }
}
