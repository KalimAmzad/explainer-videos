/**
 * Node 4: Scene Animator
 * Uses Claude Sonnet to generate Revideo TypeScript code for each scene.
 * Runs in parallel via Send API.
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { traceable } from 'langsmith/traceable';
import { MODELS, KEYS, CANVAS } from '../config.mjs';
import { buildSceneAnimatorPrompt } from '../prompts/scene-animator.mjs';

const callClaude = traceable(async function callClaudeAnimator(prompt, model) {
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
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(text);
}, { run_type: 'llm', name: 'claude_scene_animator' });

export async function sceneAnimatorNode(state) {
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number;
  const groupData = state._sceneGroupData;

  console.log(`\n  ── Scene Animator [Scene ${sceneNum}]: ${sceneNotes.title} ──`);

  // Stagger parallel calls
  const staggerMs = (state._sceneIndex || 0) * 1500;
  if (staggerMs > 0) {
    await new Promise(r => setTimeout(r, staggerMs));
  }

  const groups = groupData?.groups || [];
  console.log(`    Groups: ${groups.length}`);

  const prompt = buildSceneAnimatorPrompt({
    sceneNotes,
    groups,
    sceneNum,
    canvasWidth: CANVAS.width,
    canvasHeight: CANVAS.height,
  });

  const result = await callClaude(prompt, MODELS.sceneAnimator);

  // Save scene TS code
  const scenesDir = path.join(state.outputDir, 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  const tsPath = path.join(scenesDir, `scene${sceneNum}.tsx`);
  fs.writeFileSync(tsPath, result.tsCode || '');

  console.log(`    Scene ${sceneNum} code: ${((result.tsCode?.length || 0) / 1024).toFixed(1)} KB`);

  return {
    sceneCode: [{
      sceneNumber: sceneNum,
      tsCode: result.tsCode,
      tsPath,
    }],
  };
}
