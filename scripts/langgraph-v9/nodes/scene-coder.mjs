/**
 * Node: Scene Coder — CREATIVE BRAIN of v9.
 *
 * Fan-out, one invocation per scene. Each call:
 *   1. Plans the visual presentation approach
 *   2. Designs infographics, charts, animations — all in code
 *   3. Writes narration script matched to visuals
 *   4. Outputs complete Remotion TSX + narration JSON
 *
 * Model: configurable via OpenRouter (default: minimax/minimax-m2.5)
 * No tools, no agent loop — single LLM call.
 */
import fs from 'fs';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MODELS, KEYS, CANVAS } from '../config.mjs';
import { buildSceneCoderPrompt } from '../prompts/scene-coder.mjs';

/**
 * Parse the LLM response into narration JSON + TSX code.
 * Expected format:
 *   ---NARRATION_JSON---
 *   [{...}, ...]
 *   ---TSX_CODE---
 *   import React from 'react';
 *   ...
 */
function parseSceneCoderOutput(text) {
  if (!text) return { narration: [], assets: [], tsx: '' };

  let clean = text.trim();

  // Strip <think> blocks
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip outer code fence if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:\w+)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Try to split on markers
  const assetMarker = '---ASSET_MANIFEST---';
  const narrationMarker = '---NARRATION_JSON---';
  const tsxMarker = '---TSX_CODE---';

  const assetIdx = clean.indexOf(assetMarker);
  const narrationIdx = clean.indexOf(narrationMarker);
  const tsxIdx = clean.indexOf(tsxMarker);

  let assets = [];
  let narration = [];
  let tsx = '';

  // Parse asset manifest if present
  if (assetIdx !== -1) {
    const assetEnd = narrationIdx !== -1 ? narrationIdx : tsxIdx !== -1 ? tsxIdx : clean.length;
    let assetBlock = clean.slice(assetIdx + assetMarker.length, assetEnd).trim();
    if (assetBlock.startsWith('```')) {
      assetBlock = assetBlock.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    try {
      assets = JSON.parse(assetBlock);
    } catch (e) {
      console.warn(`    Warning: could not parse asset manifest: ${e.message}`);
      assets = [];
    }
  }

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
      console.warn(`    Warning: could not parse narration JSON: ${e.message}`);
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

  return { narration, assets, tsx };
}

export async function sceneCoderNode(state) {
  const sceneIndex = state._sceneIndex;
  const scenes = state.scenes || [];

  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    const msg = `scene-coder: invalid _sceneIndex ${sceneIndex} (${scenes.length} scenes)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const sceneSpec = scenes[sceneIndex];
  const sceneNumber = sceneSpec.scene_number || sceneIndex + 1;
  const totalScenes = scenes.length;

  console.log(`\n  ── Scene Coder [Scene ${sceneNumber}/${totalScenes}] — Creative Brain ──`);
  console.log(`    Title: "${sceneSpec.title}"`);
  console.log(`    Concept: ${sceneSpec.key_concept || 'N/A'}`);
  console.log(`    Content points: ${sceneSpec.content_points?.length || 0}`);

  // Stagger parallel invocations
  const staggerMs = sceneIndex * 3000;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Build prompt
  const { system, user } = buildSceneCoderPrompt({
    sceneSpec,
    sceneNumber,
    totalScenes,
    theme: state.theme || {},
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
  });

  // Single-pass LLM call via OpenRouter
  const model = new ChatOpenAI({
    model: MODELS.sceneCoder,
    apiKey: KEYS.openrouter,
    maxTokens: 32768,
    temperature: 0.7,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
  });

  // Retry with timeout: up to 2 attempts, 5 min each
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
        console.log(`    Scene ${sceneNumber}: attempt ${attempt} timed out, retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (isTimeout) {
        console.error(`    Scene ${sceneNumber}: LLM call timed out after ${MAX_ATTEMPTS} attempts`);
        return {
          compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames: 0, narrationSegments: [], error: 'timeout' }],
          errors: [`scene-coder [Scene ${sceneNumber}]: timed out`],
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

  // Parse structured output
  const { narration, assets, tsx } = parseSceneCoderOutput(rawText);

  if (!tsx) {
    console.error(`    Scene ${sceneNumber}: empty TSX returned`);
    return {
      compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames: 0, narrationSegments: [], error: 'empty TSX' }],
      errors: [`scene-coder [Scene ${sceneNumber}]: empty TSX`],
    };
  }

  // Estimate duration from narration word count (~2.5 words/sec)
  const totalWords = narration.reduce((sum, s) => sum + (s.text || '').split(/\s+/).length, 0);
  const estimatedFromWords = totalWords > 0 ? totalWords / 2.5 + 1.5 : 0; // +1.5s buffer
  let durationSec = Math.max(sceneSpec.estimated_duration || 15, estimatedFromWords);
  const durationFrames = Math.round(durationSec * CANVAS.fps);

  // Log narration segments (proportional format: startPct/endPct)
  console.log(`    Narration: ${narration.length} segments, ${totalWords} words → ~${durationSec.toFixed(1)}s estimated`);
  for (const seg of narration) {
    const pctStart = seg.startPct ?? seg.startSec ?? '?';
    const pctEnd = seg.endPct ?? seg.endSec ?? '?';
    console.log(`      [${pctStart}–${pctEnd}] ${(seg.text || '').slice(0, 60)}...`);
  }
  console.log(`    Duration: ${durationFrames} frames (${durationSec.toFixed(1)}s) — will adjust to TTS audio`);
  console.log(`    TSX: ${tsx.length} chars`);
  if (assets.length > 0) {
    console.log(`    Assets requested: ${assets.length}`);
    for (const a of assets) console.log(`      - [${a.type}] ${a.id}: ${(a.prompt || '').slice(0, 60)}...`);
  }

  // Write scene file for debugging
  const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.writeFileSync(path.join(scenesDir, `Scene${sceneNumber}.tsx`), tsx, 'utf8');
  console.log(`    Wrote Scene${sceneNumber}.tsx — creative brain ✓`);

  // Write narration script for TTS
  const narrationDir = path.join(state.outputDir, 'narration-scripts');
  fs.mkdirSync(narrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(narrationDir, `scene${sceneNumber}.json`),
    JSON.stringify({ sceneNumber, segments: narration, totalDuration: durationSec }, null, 2),
    'utf8',
  );

  return {
    compiledScenes: [{
      sceneNumber,
      tsxContent: tsx,
      durationFrames,
      narrationSegments: narration,
    }],
    assetManifest: assets,
  };
}
