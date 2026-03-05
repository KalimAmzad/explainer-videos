/**
 * LangGraph v3 StateGraph — 4 nodes with parallel scene coding via Send API.
 *
 * Flow:
 *   START → research_plan → asset_sourcing → [scene_coder × N] → scene_compiler → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { researchPlanNode } from './nodes/research-plan.mjs';
import { assetSourcingNode } from './nodes/asset-sourcing.mjs';
import { sceneCoderNode } from './nodes/scene-coder.mjs';
import { sceneCompilerNode } from './nodes/scene-compiler.mjs';

/**
 * Fan-out: spawn one scene_coder per scene.
 */
function fanOutScenes(state) {
  const scenes = state.researchNotes?.scenes || [];
  console.log(`\n  Fanning out ${scenes.length} scene coders in parallel...`);
  return scenes.map((scene, i) =>
    new Send('scene_coder', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
    })
  );
}

/**
 * Build and compile the LangGraph v3 workflow.
 */
export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('research_plan', researchPlanNode)
    .addNode('asset_sourcing', assetSourcingNode)
    .addNode('scene_coder', sceneCoderNode)
    .addNode('scene_compiler', sceneCompilerNode)

    .addEdge(START, 'research_plan')
    .addEdge('research_plan', 'asset_sourcing')
    .addConditionalEdges('asset_sourcing', fanOutScenes, ['scene_coder'])
    .addEdge('scene_coder', 'scene_compiler')
    .addEdge('scene_compiler', END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
