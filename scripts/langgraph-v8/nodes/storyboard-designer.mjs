/**
 * Node 2: Storyboard Designer — designs complete visual blueprint.
 *
 * Takes content plan + theme, outputs structured storyboard JSON with:
 *   - Layout selection per scene
 *   - Asset manifest (icons + AI images)
 *   - Animation choreography
 *   - Content block placement
 *   - Color assignments
 *
 * Single LLM call. Output saved as storyboard.json for debugging.
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildStoryboardPrompt } from '../prompts/storyboard-designer.mjs';

export async function storyboardDesignerNode(state) {
  console.log(`\n  ── Storyboard Designer (${MODELS.storyboardDesigner}) ──`);

  const model = new ChatAnthropic({
    model: MODELS.storyboardDesigner,
    apiKey: KEYS.anthropic,
    maxTokens: 16384,
    temperature: 0.7,
  });

  const prompt = buildStoryboardPrompt({
    researchNotes: state.researchNotes,
    theme: state.theme,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = typeof response.content === 'string'
    ? response.content
    : response.content.map(c => c.text || '').join('');

  // Strip <think> blocks (if model produces them)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Find first JSON object (handles preamble text)
  const jsonStart = text.search(/\{/);
  if (jsonStart > 0) text = text.slice(jsonStart);
  const lastClose = text.lastIndexOf('}');
  if (lastClose !== -1) text = text.slice(0, lastClose + 1);

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.storyboardDesigner}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  const storyboard = JSON.parse(text);

  // Log storyboard summary
  const scenes = storyboard.scenes || [];
  const totalAssets = scenes.reduce((sum, s) => sum + (s.assets?.length || 0), 0);
  console.log(`    Storyboard: ${scenes.length} scenes, ${totalAssets} total assets`);
  for (const s of scenes) {
    const assetSummary = (s.assets || []).map(a => `${a.id}(${a.type})`).join(', ');
    console.log(`      Scene ${s.scene_number}: layout="${s.layout}", assets=[${assetSummary}]`);
  }

  // Save storyboard for debugging
  const storyboardPath = path.join(state.outputDir, 'storyboard.json');
  fs.mkdirSync(state.outputDir, { recursive: true });
  fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), 'utf8');
  console.log(`    Saved: ${storyboardPath}`);

  return { storyboard };
}
