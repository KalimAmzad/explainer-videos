/**
 * Node: Critic-Reviser — CREATIVE DIRECTOR.
 *
 * Fan-out, one per scene. Reviews scene coder's first draft and improves it:
 *   - Infographic quality (replace text with charts/diagrams)
 *   - Visual-narration sync (terms appear when narrated)
 *   - Animation coverage (no static elements)
 *   - Code correctness (crash patterns, imports)
 *   - Component suggestions (add missing visual elements)
 *
 * Model: gemini-2.5-flash (fast, capable code reviewer)
 * Input: compiledScenes[i] (TSX + narration from scene coder)
 * Output: updated compiledScenes[i] (improved TSX + narration)
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MODELS, KEYS, CANVAS } from '../config.mjs';
import { buildCriticReviserPrompt } from '../prompts/critic-reviser.mjs';

/**
 * Parse critic output — same format as scene coder (narration JSON + TSX).
 */
function parseCriticOutput(text) {
  if (!text) return { narration: [], tsx: '' };

  let clean = text.trim();
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:\w+)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const narrationMarker = '---NARRATION_JSON---';
  const tsxMarker = '---TSX_CODE---';

  const narrationIdx = clean.indexOf(narrationMarker);
  const tsxIdx = clean.indexOf(tsxMarker);

  let narration = [];
  let tsx = '';

  if (narrationIdx !== -1 && tsxIdx !== -1) {
    const narrationBlock = clean.slice(narrationIdx + narrationMarker.length, tsxIdx).trim();
    tsx = clean.slice(tsxIdx + tsxMarker.length).trim();

    let narrationJson = narrationBlock;
    if (narrationJson.startsWith('```')) {
      narrationJson = narrationJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    try {
      narration = JSON.parse(narrationJson);
    } catch (e) {
      console.warn(`    Warning: could not parse critic narration JSON: ${e.message}`);
      narration = [];
    }
  } else if (tsxIdx !== -1) {
    tsx = clean.slice(tsxIdx + tsxMarker.length).trim();
  } else {
    tsx = clean;
  }

  // Clean up TSX
  if (tsx.startsWith('```')) {
    tsx = tsx.replace(/^```(?:tsx|typescript|typescriptreact|ts|jsx|react|js|javascript)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  tsx = tsx.replace(/\n---[\w_]*---\s*$/, '').replace(/\n```\s*$/, '').replace(/\n---\s*$/, '').trimEnd();

  const importIdx = tsx.search(/^(?:import|\/\*\*?|\/\/|export)/m);
  if (importIdx > 0) tsx = tsx.slice(importIdx).trim();

  return { narration, tsx };
}

export async function criticReviserNode(state) {
  const sceneIndex = state._sceneIndex;
  const compiledScenes = state.compiledScenes || [];

  // Sort compiled scenes by scene number to get consistent indexing
  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  if (sceneIndex < 0 || sceneIndex >= sortedScenes.length) {
    const msg = `critic-reviser: invalid _sceneIndex ${sceneIndex} (${sortedScenes.length} scenes)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const scene = sortedScenes[sceneIndex];
  const sceneNumber = scene.sceneNumber;
  const sceneSpec = (state.scenes || []).find(s => s.scene_number === sceneNumber) || {};

  console.log(`\n  ── Critic-Reviser [Scene ${sceneNumber}/${sortedScenes.length}] — Creative Director ──`);
  console.log(`    Original: ${scene.tsxContent.length} chars, ${scene.narrationSegments?.length || 0} narration segments`);

  // Stagger parallel invocations
  const staggerMs = sceneIndex * 2000;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Build prompt with original code + spec
  const { system, user } = buildCriticReviserPrompt({
    sceneSpec,
    sceneNumber,
    totalScenes: sortedScenes.length,
    originalTSX: scene.tsxContent,
    narrationSegments: scene.narrationSegments || [],
    theme: state.theme || {},
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
  });

  // LLM call — Sonnet for strong code review + creative improvement
  const model = new ChatAnthropic({
    model: MODELS.criticReviser,
    apiKey: KEYS.anthropic,
    maxTokens: 16384,
    temperature: 0.4, // Lower temp for focused improvements
  });

  let response;
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000);
    try {
      response = await model.invoke(
        [new SystemMessage(system), new HumanMessage(user)],
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);
      break;
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      if (isTimeout && attempt < MAX_ATTEMPTS) {
        console.log(`    Scene ${sceneNumber}: critic attempt ${attempt} timed out, retrying...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (isTimeout) {
        console.warn(`    Scene ${sceneNumber}: critic timed out — using original code`);
        return { revisedScenes: [scene] };
      }
      throw err;
    }
  }

  let rawText = typeof response.content === 'string'
    ? response.content
    : (response.content || []).map(c => c.text || '').join('');

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.criticReviser}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  // Parse improved output
  const { narration, tsx } = parseCriticOutput(rawText);

  if (!tsx || tsx.length < 100) {
    console.warn(`    Scene ${sceneNumber}: critic returned empty/short TSX — using original`);
    return { revisedScenes: [scene] };
  }

  // Calculate improvement
  const improvement = tsx.length - scene.tsxContent.length;
  const improvementPct = ((improvement / scene.tsxContent.length) * 100).toFixed(0);
  console.log(`    Improved: ${scene.tsxContent.length} → ${tsx.length} chars (${improvement >= 0 ? '+' : ''}${improvementPct}%)`);

  if (narration.length > 0) {
    const totalWords = narration.reduce((sum, s) => sum + (s.text || '').split(/\s+/).length, 0);
    console.log(`    Narration: ${narration.length} segments, ${totalWords} words`);
  } else {
    console.log(`    Narration: unchanged (using original)`);
  }

  // Estimate duration
  const effectiveNarration = narration.length > 0 ? narration : scene.narrationSegments || [];
  const totalWords = effectiveNarration.reduce((sum, s) => sum + (s.text || '').split(/\s+/).length, 0);
  const estimatedFromWords = totalWords > 0 ? totalWords / 2.5 + 1.5 : 0;
  const durationSec = Math.max(sceneSpec.estimated_duration || 15, estimatedFromWords);
  const durationFrames = Math.round(durationSec * CANVAS.fps);

  // Write improved scene file
  const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.writeFileSync(path.join(scenesDir, `Scene${sceneNumber}.tsx`), tsx, 'utf8');
  console.log(`    Wrote improved Scene${sceneNumber}.tsx — creative director ✓`);

  return {
    revisedScenes: [{
      sceneNumber,
      tsxContent: tsx,
      durationFrames,
      narrationSegments: narration.length > 0 ? narration : scene.narrationSegments || [],
    }],
  };
}
