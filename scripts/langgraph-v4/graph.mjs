/**
 * LangGraph v4 StateGraph — 5 nodes with triple fan-out via Send API.
 *
 * Flow:
 *   START → research_planner
 *         → [scene_image_gen × N] → route_to_decomposer
 *         → [asset_decomposer × N] → route_to_animator
 *         → [scene_animator × N] → video_compiler → END
 *
 * Router nodes wait for all parallel Sends to complete before fanning out the next stage.
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { sceneImageGenNode } from './nodes/scene-image-gen.mjs';
import { assetDecomposerNode } from './nodes/asset-decomposer.mjs';
import { sceneAnimatorNode } from './nodes/scene-animator.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: spawn one scene_image_gen per scene.
 */
function fanOutImageGen(state) {
  const scenes = state.researchNotes?.scenes || [];
  console.log(`\n  Fanning out ${scenes.length} image generators...`);
  return scenes.map((scene, i) =>
    new Send('scene_image_gen', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
    })
  );
}

/**
 * Router: after all images generated, fan out decomposers.
 */
function routeToDecomposer(state) {
  const scenes = state.researchNotes?.scenes || [];
  const images = state.sceneImages || [];
  console.log(`\n  Routing ${scenes.length} scenes to decomposer (${images.length} images ready)...`);

  return scenes.map((scene, i) => {
    const sceneNum = scene.scene_number;
    const sceneImage = images.find(img => img.sceneNumber === sceneNum);
    return new Send('asset_decomposer', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
      _sceneImage: sceneImage || null,
    });
  });
}

/**
 * Router: after all groups detected, fan out animators.
 */
function routeToAnimator(state) {
  const scenes = state.researchNotes?.scenes || [];
  const groupsList = state.sceneGroups || [];
  console.log(`\n  Routing ${scenes.length} scenes to animator (${groupsList.length} groups ready)...`);

  return scenes.map((scene, i) => {
    const sceneNum = scene.scene_number;
    const groupData = groupsList.find(g => g.sceneNumber === sceneNum);
    return new Send('scene_animator', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
      _sceneGroupData: groupData || null,
    });
  });
}

/** No-op merge node — just passes state through after all Sends complete. */
function mergeNode(state) {
  return {};
}

/**
 * Build and compile the LangGraph v4 workflow.
 */
export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('research_planner', researchPlannerNode)
    .addNode('scene_image_gen', sceneImageGenNode)
    .addNode('merge_images', mergeNode)
    .addNode('asset_decomposer', assetDecomposerNode)
    .addNode('merge_groups', mergeNode)
    .addNode('scene_animator', sceneAnimatorNode)
    .addNode('video_compiler', videoCompilerNode)

    // research → fan-out image gen
    .addEdge(START, 'research_planner')
    .addConditionalEdges('research_planner', fanOutImageGen, ['scene_image_gen'])

    // image gen → merge → fan-out decomposer
    .addEdge('scene_image_gen', 'merge_images')
    .addConditionalEdges('merge_images', routeToDecomposer, ['asset_decomposer'])

    // decomposer → merge → fan-out animator
    .addEdge('asset_decomposer', 'merge_groups')
    .addConditionalEdges('merge_groups', routeToAnimator, ['scene_animator'])

    // animator → compiler → END
    .addEdge('scene_animator', 'video_compiler')
    .addEdge('video_compiler', END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
