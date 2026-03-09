/**
 * LangGraph v8 StateGraph — Production Pipeline.
 *
 * Flow:
 *   START → content_planner (Haiku: theme + content)
 *         → storyboard_designer (GPT-5.2: visual blueprint)
 *         → [narration_generator × N, asset_producer × M] (parallel fan-out)
 *         → merge_production
 *         → [scene_coder × N] (single-pass TSX, no tools)
 *         → merge_scenes
 *         → video_compiler
 *         → END
 *
 * Key difference from v7: scene_composer (ReAct agent, 12 iterations, 4 tools)
 * is replaced by storyboard_designer + asset_producer + scene_coder (single-pass).
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { contentPlannerNode } from './nodes/content-planner.mjs';
import { storyboardDesignerNode } from './nodes/storyboard-designer.mjs';
import { assetProducerNode, flattenAssets } from './nodes/asset-producer.mjs';
import { narrationGeneratorNode } from './nodes/narration-generator.mjs';
import { sceneCoderNode } from './nodes/scene-coder.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: narration_generator × N + asset_producer × M (parallel).
 * Both types merge into merge_production.
 */
function fanOutProduction(state) {
  const scenes = state.researchNotes?.scenes || [];
  const allAssets = flattenAssets(state.storyboard);
  const sends = [];

  // Fan out narration generators (1 per scene)
  if (scenes.length > 0) {
    console.log(`\n  Fanning out ${scenes.length} narration generators + ${allAssets.length} asset producers...`);
    for (let i = 0; i < scenes.length; i++) {
      sends.push(new Send('narration_generator', { ...state, _sceneIndex: i }));
    }
  }

  // Fan out asset producers (1 per asset across all scenes)
  for (let i = 0; i < allAssets.length; i++) {
    sends.push(new Send('asset_producer', { ...state, _assetIndex: i }));
  }

  // If nothing to fan out, skip to merge
  if (sends.length === 0) {
    return [new Send('merge_production', state)];
  }

  return sends;
}

/**
 * Fan-out: scene_coder × N (one per scene, single-pass TSX generation).
 */
function fanOutSceneCoders(state) {
  const scenes = state.storyboard?.scenes || [];
  if (scenes.length === 0) return [new Send('merge_scenes', state)];
  console.log(`\n  Fanning out ${scenes.length} scene coders (single-pass)...`);
  return scenes.map((_, i) =>
    new Send('scene_coder', { ...state, _sceneIndex: i })
  );
}

function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    // Phase 1: Pre-production (sequential)
    .addNode('content_planner', contentPlannerNode)
    .addNode('storyboard_designer', storyboardDesignerNode)

    // Phase 2: Production (parallel fan-out)
    .addNode('narration_generator', narrationGeneratorNode)
    .addNode('asset_producer', assetProducerNode)
    .addNode('merge_production', mergeNode)

    // Phase 3: Assembly (parallel fan-out, single-pass)
    .addNode('scene_coder', sceneCoderNode)
    .addNode('merge_scenes', mergeNode)

    // Phase 4: Compilation (deterministic)
    .addNode('video_compiler', videoCompilerNode)

    // Edges
    .addEdge(START, 'content_planner')
    .addEdge('content_planner', 'storyboard_designer')
    .addConditionalEdges('storyboard_designer', fanOutProduction, [
      'narration_generator', 'asset_producer', 'merge_production',
    ])
    .addEdge('narration_generator', 'merge_production')
    .addEdge('asset_producer', 'merge_production')
    .addConditionalEdges('merge_production', fanOutSceneCoders, [
      'scene_coder', 'merge_scenes',
    ])
    .addEdge('scene_coder', 'merge_scenes')
    .addEdge('merge_scenes', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
