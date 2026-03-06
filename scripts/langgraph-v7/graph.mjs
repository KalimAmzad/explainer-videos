/**
 * LangGraph v7 StateGraph — Remotion + Template Layout pipeline.
 *
 * Flow:
 *   START → theme_designer
 *         → research_planner
 *         → scene_designer
 *         → [asset_generator × M] (fan-out per non-text asset)
 *         → merge_assets (sync barrier)
 *         → timing_resolver (deterministic)
 *         → scene_compositor (deterministic)
 *         → video_compiler (deterministic)
 *         → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { themeDesignerNode } from './nodes/theme-designer.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { sceneDesignerNode } from './nodes/scene-designer.mjs';
import { assetGeneratorNode } from './nodes/asset-generator.mjs';
import { timingResolverNode } from './nodes/timing-resolver.mjs';
import { sceneCompositorNode } from './nodes/scene-compositor.mjs';
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

/** Sync barrier — no-op node that waits for all asset_generator sends to complete. */
function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('theme_designer', themeDesignerNode)
    .addNode('research_planner', researchPlannerNode)
    .addNode('scene_designer', sceneDesignerNode)
    .addNode('asset_generator', assetGeneratorNode)
    .addNode('merge_assets', mergeNode)
    .addNode('timing_resolver', timingResolverNode)
    .addNode('scene_compositor', sceneCompositorNode)
    .addNode('video_compiler', videoCompilerNode)

    .addEdge(START, 'theme_designer')
    .addEdge('theme_designer', 'research_planner')
    .addEdge('research_planner', 'scene_designer')
    .addConditionalEdges('scene_designer', fanOutAssets, ['asset_generator', 'merge_assets'])
    .addEdge('asset_generator', 'merge_assets')
    .addEdge('merge_assets', 'timing_resolver')
    .addEdge('timing_resolver', 'scene_compositor')
    .addEdge('scene_compositor', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
