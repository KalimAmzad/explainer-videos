/**
 * LangGraph v9 StateGraph — Scene-Coder-First Pipeline with Critic + Assets.
 *
 * Flow:
 *   START → content_planner (Haiku: theme + scene topics)
 *         → [scene_coder × N] (minimax-m2.5: first draft TSX + narration)
 *         → merge_scenes
 *         → [critic_reviser × N] (minimax-m2.5: improve infographic + sync)
 *         → merge_revisions
 *         → asset_producer (Nano Banana: max 3 images, no LLM)
 *         → [tts_generator × N] (Gemini TTS: audio from revised narration)
 *         → merge_tts
 *         → video_compiler (deterministic)
 *         → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { contentPlannerNode } from './nodes/content-planner.mjs';
import { sceneCoderNode } from './nodes/scene-coder.mjs';
import { criticReviserNode } from './nodes/critic-reviser.mjs';
import { assetProducerNode } from './nodes/asset-producer.mjs';
import { ttsGeneratorNode } from './nodes/tts-generator.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: scene_coder × N (one per scene, first draft).
 */
function fanOutSceneCoders(state) {
  const scenes = state.scenes || [];
  if (scenes.length === 0) return [new Send('merge_scenes', state)];
  console.log(`\n  Fanning out ${scenes.length} scene coders...`);
  return scenes.map((_, i) =>
    new Send('scene_coder', { ...state, _sceneIndex: i })
  );
}

/**
 * Fan-out: critic_reviser × N (one per scene, reviews + improves).
 */
function fanOutCritics(state) {
  const compiled = state.compiledScenes || [];
  const valid = compiled.filter(s => s.tsxContent);
  if (valid.length === 0) return [new Send('merge_revisions', state)];
  console.log(`\n  Fanning out ${valid.length} critic-revisers...`);
  return valid
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((_, i) => new Send('critic_reviser', { ...state, _sceneIndex: i }));
}

/**
 * Fan-out: tts_generator × N (from revised narration).
 */
function fanOutTTS(state) {
  const scenes = (state.revisedScenes?.length > 0 ? state.revisedScenes : state.compiledScenes) || [];
  const withNarration = scenes.filter(s => s.narrationSegments?.length > 0);
  if (withNarration.length === 0) return [new Send('merge_tts', state)];
  console.log(`\n  Fanning out ${withNarration.length} TTS generators...`);
  return withNarration.map((_, i) =>
    new Send('tts_generator', { ...state, _sceneIndex: i })
  );
}

function mergeNode() { return {}; }

export function buildGraph() {
  const workflow = new StateGraph(VideoState)
    // Phase 1: Content planning
    .addNode('content_planner', contentPlannerNode)

    // Phase 2: Scene coding (parallel fan-out — first draft)
    .addNode('scene_coder', sceneCoderNode)
    .addNode('merge_scenes', mergeNode)

    // Phase 3: Critic review (parallel fan-out — improve infographic + sync)
    .addNode('critic_reviser', criticReviserNode)
    .addNode('merge_revisions', mergeNode)

    // Phase 4: Asset production (sequential — Nano Banana, max 3 images)
    .addNode('asset_producer', assetProducerNode)

    // Phase 5: TTS generation (parallel fan-out)
    .addNode('tts_generator', ttsGeneratorNode)
    .addNode('merge_tts', mergeNode)

    // Phase 6: Compilation (deterministic)
    .addNode('video_compiler', videoCompilerNode)

    // Edges
    .addEdge(START, 'content_planner')
    .addConditionalEdges('content_planner', fanOutSceneCoders, [
      'scene_coder', 'merge_scenes',
    ])
    .addEdge('scene_coder', 'merge_scenes')
    .addConditionalEdges('merge_scenes', fanOutCritics, [
      'critic_reviser', 'merge_revisions',
    ])
    .addEdge('critic_reviser', 'merge_revisions')
    .addEdge('merge_revisions', 'asset_producer')
    .addConditionalEdges('asset_producer', fanOutTTS, [
      'tts_generator', 'merge_tts',
    ])
    .addEdge('tts_generator', 'merge_tts')
    .addEdge('merge_tts', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
