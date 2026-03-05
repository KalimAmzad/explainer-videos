/**
 * Node 3: Scene Coder (v3.3)
 * Called N times in parallel via Send API — one instance per scene.
 * Uses Claude Sonnet for superior layout, natural drawing, and professional
 * educational tutorial quality.
 *
 * v3.3: Switch from Gemini to Claude Sonnet 4.6 for scene coding.
 * Claude produces better SVG layout, more natural whiteboard aesthetics,
 * and more reliable JSON output.
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { traceable } from 'langsmith/traceable';
import { MODELS, KEYS } from '../config.mjs';
import { buildSceneCoderPrompt } from '../prompts/scene-coder.mjs';

const callClaudeSceneCoder = traceable(async function callClaudeSceneCoder(prompt, model) {
  const client = new Anthropic({ apiKey: KEYS.anthropic });

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text in Claude response');

  const usage = response.usage;
  console.log(`    [Claude ${model}] ${usage.input_tokens} in / ${usage.output_tokens} out`);

  let text = textBlock.text.trim();
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(text);
}, { run_type: 'llm', name: 'claude_scene_coder' });

export async function sceneCoderNode(state) {
  const sceneIndex = state._sceneIndex;
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number || sceneIndex + 1;

  console.log(`\n  ── Scene Coder [${sceneNum}]: ${sceneNotes.title} ──`);

  // Pass full asset info including svgContent (small primitive SVG, 200-800 chars)
  const assets = state.sceneAssets?.[sceneNum] || [];
  const assetInfo = assets.map(a => ({
    filename: a.filename,
    description: a.description,
    role: a.role,
    dimensions: a.dimensions,
    source: a.source,
    svgContent: a.svgContent || '',
  }));

  const svgChars = assetInfo.reduce((sum, a) => sum + (a.svgContent?.length || 0), 0);
  console.log(`    Assets: ${assetInfo.length} (${svgChars} chars SVG content)`);

  // Build prompt with full asset SVG content
  const prompt = buildSceneCoderPrompt({
    sceneNotes,
    assets: assetInfo,
    researchNotes: state.researchNotes,
    sceneIndex,
  });

  // Stagger parallel calls slightly to spread load
  const staggerMs = sceneIndex * 1000;
  if (staggerMs > 0) {
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Call Claude Sonnet
  const model = MODELS.sceneCoder;
  console.log(`    Calling ${model}...`);

  const result = await callClaudeSceneCoder(prompt, model);

  // Ensure sceneNumber is set correctly
  result.sceneNumber = sceneNum;

  // Save individual scene files for debugging/editing
  const scenesDir = path.join(state.outputDir, 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });

  fs.writeFileSync(
    path.join(scenesDir, `scene${sceneNum}.svg`),
    result.svgBody || ''
  );
  fs.writeFileSync(
    path.join(scenesDir, `scene${sceneNum}.js`),
    result.jsCode || ''
  );
  fs.writeFileSync(
    path.join(scenesDir, `scene${sceneNum}-defs.svg`),
    result.svgDefs || ''
  );

  const svgSize = ((result.svgBody?.length || 0) / 1024).toFixed(1);
  const jsSize = ((result.jsCode?.length || 0) / 1024).toFixed(1);
  console.log(`    Scene ${sceneNum} generated: ${svgSize} KB SVG, ${jsSize} KB JS code`);

  return {
    sceneOutputs: [result],
  };
}
