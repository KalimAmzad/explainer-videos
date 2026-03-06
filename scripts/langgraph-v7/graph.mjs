/**
 * LangGraph v7 StateGraph — Remotion + Template Layout pipeline.
 *
 * Flow:
 *   START → theme_designer
 *         → research_planner
 *         → scene_designer
 *         → [asset_generator × M] (fan-out per non-text asset)
 *         → merge_assets (sync barrier)
 *         → [narration_generator × N] (fan-out per scene for TTS)
 *         → merge_narrations (sync barrier)
 *         → [scene_writer × N] (fan-out per scene, LLM writes Remotion TSX)
 *         → merge_scenes (sync barrier)
 *         → video_compiler (deterministic)
 *         → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { themeDesignerNode } from './nodes/theme-designer.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { sceneDesignerNode } from './nodes/scene-designer.mjs';
import { assetGeneratorNode } from './nodes/asset-generator.mjs';
import { narrationGeneratorNode } from './nodes/narration-generator.mjs';
import { sceneWriterNode } from './nodes/scene-writer.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: after scene_designer, create one Send per non-text asset.
 * Text assets are rendered directly by Remotion — no generation needed.
 */
function fanOutAssets(state) {
  const designs = state.sceneDesigns || [];
  const assetsToGenerate = [];

  for (const scene of designs) {
    for (const block of scene.sync_blocks || []) {
      const v = block.visual;
      if (v && v.asset_type !== 'text') {
        assetsToGenerate.push({
          asset_id: v.asset_id,
          asset_type: v.asset_type,
          description: v.description || '',
          generation_method: v.generation_method || 'llm_svg',
          sub_elements: v.sub_elements || null,
        });
      }
    }
  }

  if (assetsToGenerate.length === 0) {
    return [new Send('merge_assets', state)];
  }

  console.log(`\n  Fanning out ${assetsToGenerate.length} asset generators...`);
  return assetsToGenerate.map((asset, i) =>
    new Send('asset_generator', { ...state, _asset: asset, _sceneIndex: i })
  );
}

/**
 * Fan-out: after merge_assets, create one Send per scene for TTS narration.
 * Each Send carries _sceneIndex (0-based) so the node knows which scene to process.
 */
function fanOutNarrations(state) {
  const scenes = state.sceneDesigns || [];

  if (scenes.length === 0) {
    return [new Send('merge_narrations', state)];
  }

  console.log(`\n  Fanning out ${scenes.length} narration generators...`);
  return scenes.map((_, i) =>
    new Send('narration_generator', { ...state, _sceneIndex: i })
  );
}

/**
 * Fan-out: after merge_narrations, create one Send per scene for LLM scene writing.
 * Each Send carries _sceneIndex (0-based) so the node knows which scene to process.
 */
function fanOutSceneWriters(state) {
  const scenes = state.sceneDesigns || [];

  if (scenes.length === 0) {
    return [new Send('merge_scenes', state)];
  }

  console.log(`\n  Fanning out ${scenes.length} scene writers...`);
  return scenes.map((_, i) =>
    new Send('scene_writer', { ...state, _sceneIndex: i })
  );
}

/** Sync barrier — no-op node that waits for all fan-out sends to complete. */
function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('theme_designer', themeDesignerNode)
    .addNode('research_planner', researchPlannerNode)
    .addNode('scene_designer', sceneDesignerNode)
    .addNode('asset_generator', assetGeneratorNode)
    .addNode('merge_assets', mergeNode)
    .addNode('narration_generator', narrationGeneratorNode)
    .addNode('merge_narrations', mergeNode)
    .addNode('scene_writer', sceneWriterNode)
    .addNode('merge_scenes', mergeNode)
    .addNode('video_compiler', videoCompilerNode)

    // Linear chain: theme → research → scene_designer
    .addEdge(START, 'theme_designer')
    .addEdge('theme_designer', 'research_planner')
    .addEdge('research_planner', 'scene_designer')

    // Fan-out assets: scene_designer → [asset_generator × M] → merge_assets
    .addConditionalEdges('scene_designer', fanOutAssets, ['asset_generator', 'merge_assets'])
    .addEdge('asset_generator', 'merge_assets')

    // Fan-out narrations: merge_assets → [narration_generator × N] → merge_narrations
    .addConditionalEdges('merge_assets', fanOutNarrations, ['narration_generator', 'merge_narrations'])
    .addEdge('narration_generator', 'merge_narrations')

    // Fan-out scene writers: merge_narrations → [scene_writer × N] → merge_scenes
    .addConditionalEdges('merge_narrations', fanOutSceneWriters, ['scene_writer', 'merge_scenes'])
    .addEdge('scene_writer', 'merge_scenes')

    // Final: merge_scenes → video_compiler → END
    .addEdge('merge_scenes', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
