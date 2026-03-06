/**
 * LangGraph v7 StateGraph — Remotion + Scene Composer Agent pipeline.
 *
 * Flow:
 *   START → theme_designer
 *         → research_planner
 *         → [narration_generator × N] (TTS first — real durations feed composer timing)
 *         → merge_narrations
 *         → [scene_composer × N] (ReAct agent — generates assets + writes TSX autonomously)
 *         → merge_scenes
 *         → video_compiler
 *         → END
 *
 * scene_composer is a tool-calling ReAct agent with:
 *   - generate_svg (Haiku LLM)
 *   - search_icons8 + download_icon_png (Icons8 via @modelcontextprotocol/sdk)
 *   - generate_image (Gemini)
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { themeDesignerNode } from './nodes/theme-designer.mjs';
import { researchPlannerNode } from './nodes/research-planner.mjs';
import { narrationGeneratorNode } from './nodes/narration-generator.mjs';
import { sceneComposerNode } from './nodes/scene-composer.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

function fanOutNarrations(state) {
  const scenes = state.researchNotes?.scenes || [];
  if (scenes.length === 0) return [new Send('merge_narrations', state)];
  console.log(`\n  Fanning out ${scenes.length} narration generators...`);
  return scenes.map((_, i) =>
    new Send('narration_generator', { ...state, _sceneIndex: i })
  );
}

function fanOutSceneComposers(state) {
  const scenes = state.researchNotes?.scenes || [];
  if (scenes.length === 0) return [new Send('merge_scenes', state)];
  console.log(`\n  Fanning out ${scenes.length} scene composer agents...`);
  return scenes.map((_, i) =>
    new Send('scene_composer', { ...state, _sceneIndex: i })
  );
}

function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    .addNode('theme_designer', themeDesignerNode)
    .addNode('research_planner', researchPlannerNode)
    .addNode('narration_generator', narrationGeneratorNode)
    .addNode('merge_narrations', mergeNode)
    .addNode('scene_composer', sceneComposerNode)
    .addNode('merge_scenes', mergeNode)
    .addNode('video_compiler', videoCompilerNode)

    .addEdge(START, 'theme_designer')
    .addEdge('theme_designer', 'research_planner')
    .addConditionalEdges('research_planner', fanOutNarrations, ['narration_generator', 'merge_narrations'])
    .addEdge('narration_generator', 'merge_narrations')
    .addConditionalEdges('merge_narrations', fanOutSceneComposers, ['scene_composer', 'merge_scenes'])
    .addEdge('scene_composer', 'merge_scenes')
    .addEdge('merge_scenes', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
