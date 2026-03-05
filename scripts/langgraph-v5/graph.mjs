/**
 * LangGraph v5 StateGraph — Image-guided SVG animation.
 *
 * Flow:
 *   START → research_planner
 *         → [scene_image_gen × N] → merge_images
 *         → [scene_coder × N] (with reference image)
 *         → scene_compiler → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { sceneImageGenNode } from './nodes/scene-image-gen.mjs';
import { sceneCoderNode } from './nodes/scene-coder.mjs';
import { sceneCompilerNode } from './nodes/scene-compiler.mjs';

/** Fan-out: one image generator per scene (respects maxScenes). */
function fanOutImageGen(state) {
  let scenes = state.researchNotes?.scenes || [];
  if (state.maxScenes > 0) scenes = scenes.slice(0, state.maxScenes);
  console.log(`\n  Fanning out ${scenes.length} image generators...`);
  return scenes.map((scene, i) =>
    new Send('scene_image_gen', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
    })
  );
}

/** Fan-out: one scene coder per scene (with reference image, respects maxScenes). */
function fanOutSceneCoders(state) {
  let scenes = state.researchNotes?.scenes || [];
  if (state.maxScenes > 0) scenes = scenes.slice(0, state.maxScenes);
  const images = state.sceneImages || [];
  console.log(`\n  Fanning out ${scenes.length} scene coders (with reference images)...`);

  return scenes.map((scene, i) => {
    const sceneNum = scene.scene_number;
    const img = images.find(im => im.sceneNumber === sceneNum);
    return new Send('scene_coder', {
      ...state,
      _sceneIndex: i,
      _sceneNotes: scene,
      _sceneImage: img || null,
    });
  });
}

/** No-op merge node. */
function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('research_planner', researchPlannerNode)
    .addNode('scene_image_gen', sceneImageGenNode)
    .addNode('merge_images', mergeNode)
    .addNode('scene_coder', sceneCoderNode)
    .addNode('scene_compiler', sceneCompilerNode)

    .addEdge(START, 'research_planner')
    .addConditionalEdges('research_planner', fanOutImageGen, ['scene_image_gen'])
    .addEdge('scene_image_gen', 'merge_images')
    .addConditionalEdges('merge_images', fanOutSceneCoders, ['scene_coder'])
    .addEdge('scene_coder', 'scene_compiler')
    .addEdge('scene_compiler', END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
