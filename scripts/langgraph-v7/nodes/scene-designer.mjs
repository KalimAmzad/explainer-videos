/**
 * Node 3: Scene Designer — Haiku transforms content plan into visual design.
 * Selects layout templates, enumerates assets, assigns slots, defines
 * narration-synced timeline blocks. Designs ALL scenes in one call
 * for cross-scene visual consistency.
 *
 * This is the bridge between content (research planner) and visuals
 * (asset generator + deterministic compositor).
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildSceneDesignerPrompt } from '../prompts/scene-designer.mjs';

export async function sceneDesignerNode(state) {
  console.log('\n  ── Scene Designer ──');

  const model = new ChatAnthropic({
    model: MODELS.sceneDesigner,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 8192,
  });

  const prompt = buildSceneDesignerPrompt({
    researchNotes: state.researchNotes,
    theme: state.theme,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = typeof response.content === 'string'
    ? response.content
    : response.content.map(c => c.text || '').join('');

  // Strip markdown fences
  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.sceneDesigner}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  const sceneDesigns = JSON.parse(text);

  // Validate: should be an array
  const designs = Array.isArray(sceneDesigns) ? sceneDesigns : sceneDesigns.scenes || [sceneDesigns];

  // Log template selections per scene
  for (const scene of designs) {
    const assetCount = (scene.sync_blocks || [])
      .filter(b => b.visual?.asset_type !== 'text')
      .length;
    console.log(`    Scene ${scene.scene_number}: layout="${scene.layout_template}", ${assetCount} visual assets, ${(scene.sync_blocks || []).length} sync blocks`);
  }

  // Save raw design to outputDir for debugging
  if (state.outputDir) {
    fs.mkdirSync(state.outputDir, { recursive: true });
    const debugPath = path.join(state.outputDir, 'scene-designs.json');
    fs.writeFileSync(debugPath, JSON.stringify(designs, null, 2));
    console.log(`    Saved debug: ${debugPath}`);
  }

  return { sceneDesigns: designs };
}
