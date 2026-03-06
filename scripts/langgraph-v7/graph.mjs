/**
 * LangGraph v7 StateGraph — Remotion + LLM Scene Composer pipeline.
 *
 * Flow:
 *   START → theme_designer
 *         → research_planner
 *         → [narration_generator × N] (fan-out per scene — TTS first so real durations are known)
 *         → merge_narrations (sync barrier)
 *         → [asset_generator × M] (fan-out per asset from research_planner.assets_needed)
 *         → merge_assets (sync barrier)
 *         → [scene_composer × N] (fan-out per scene — LLM writes Remotion TSX with full creative freedom)
 *         → merge_scenes (sync barrier)
 *         → video_compiler (deterministic)
 *         → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { themeDesignerNode } from './nodes/theme-designer.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { assetGeneratorNode } from './nodes/asset-generator.mjs';
import { narrationGeneratorNode } from './nodes/narration-generator.mjs';
import { sceneComposerNode } from './nodes/scene-composer.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: after research_planner, create one Send per scene for TTS narration.
 * Narrations run FIRST so real audio durations feed into scene_composer timing.
 */
function fanOutNarrations(state) {
  const scenes = state.researchNotes?.scenes || [];

  if (scenes.length === 0) {
    return [new Send('merge_narrations', state)];
  }

  console.log(`\n  Fanning out ${scenes.length} narration generators...`);
  return scenes.map((_, i) =>
    new Send('narration_generator', { ...state, _sceneIndex: i })
  );
}

/**
 * Fan-out: after merge_narrations, create one Send per asset.
 * Reads assets_needed from each scene in researchNotes.
 */
function fanOutAssets(state) {
  const scenes = state.researchNotes?.scenes || [];
  const allAssets = scenes.flatMap(s => s.assets_needed || []);

  if (allAssets.length === 0) {
    return [new Send('merge_assets', state)];
  }

  console.log(`\n  Fanning out ${allAssets.length} asset generators...`);
  return allAssets.map((asset, i) =>
    new Send('asset_generator', { ...state, _asset: asset, _sceneIndex: i })
  );
}

/**
 * Fan-out: after merge_assets, create one Send per scene for LLM scene composition.
 * Scene composer has narration durations + all assets — full creative freedom in TSX.
 */
function fanOutSceneComposers(state) {
  const scenes = state.researchNotes?.scenes || [];

  if (scenes.length === 0) {
    return [new Send('merge_scenes', state)];
  }

  console.log(`\n  Fanning out ${scenes.length} scene composers...`);
  return scenes.map((_, i) =>
    new Send('scene_composer', { ...state, _sceneIndex: i })
  );
}

/** Sync barrier — no-op node that waits for all fan-out sends to complete. */
function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('theme_designer', themeDesignerNode)
    .addNode('research_planner', researchPlannerNode)
    .addNode('narration_generator', narrationGeneratorNode)
    .addNode('merge_narrations', mergeNode)
    .addNode('asset_generator', assetGeneratorNode)
    .addNode('merge_assets', mergeNode)
    .addNode('scene_composer', sceneComposerNode)
    .addNode('merge_scenes', mergeNode)
    .addNode('video_compiler', videoCompilerNode)

    // Linear: theme → research
    .addEdge(START, 'theme_designer')
    .addEdge('theme_designer', 'research_planner')

    // Fan-out narrations: research_planner → [narration_generator × N] → merge_narrations
    .addConditionalEdges('research_planner', fanOutNarrations, ['narration_generator', 'merge_narrations'])
    .addEdge('narration_generator', 'merge_narrations')

    // Fan-out assets: merge_narrations → [asset_generator × M] → merge_assets
    .addConditionalEdges('merge_narrations', fanOutAssets, ['asset_generator', 'merge_assets'])
    .addEdge('asset_generator', 'merge_assets')

    // Fan-out scene composers: merge_assets → [scene_composer × N] → merge_scenes
    .addConditionalEdges('merge_assets', fanOutSceneComposers, ['scene_composer', 'merge_scenes'])
    .addEdge('scene_composer', 'merge_scenes')

    // Final: merge_scenes → video_compiler → END
    .addEdge('merge_scenes', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
