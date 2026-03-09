/**
 * LangGraph v9 StateGraph — Scene-Coder-First Pipeline with Hybrid Assets.
 *
 * Flow:
 *   START → content_planner (Haiku: theme + scene topics)
 *         → [scene_coder × N] (Sonnet 4.6: TSX + narration + asset manifest)
 *         → merge_scenes
 *         → asset_producer (Nano Banana: max 3 images, no LLM)
 *         → [tts_generator × N] (Gemini TTS: audio from narration)
 *         → merge_tts
 *         → video_compiler (deterministic)
 *         → END
 */
import { StateGraph, START, END, Send, MemorySaver } from '@langchain/langgraph';
import { VideoState } from './state.mjs';
import { contentPlannerNode } from './nodes/content-planner.mjs';
import { sceneCoderNode } from './nodes/scene-coder.mjs';
import { assetProducerNode } from './nodes/asset-producer.mjs';
import { ttsGeneratorNode } from './nodes/tts-generator.mjs';
import { videoCompilerNode } from './nodes/video-compiler.mjs';

/**
 * Fan-out: scene_coder × N (one per scene).
 */
function fanOutSceneCoders(state) {
  const scenes = state.scenes || [];
  if (scenes.length === 0) return [new Send('merge_scenes', state)];
  console.log(`\n  Fanning out ${scenes.length} scene coders (Sonnet 4.6)...`);
  return scenes.map((_, i) =>
    new Send('scene_coder', { ...state, _sceneIndex: i })
  );
}

/**
 * Fan-out: tts_generator × N (from scene coder narration).
 */
function fanOutTTS(state) {
  const scenes = state.compiledScenes || [];
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
    // Phase 1: Content planning (sequential)
    .addNode('content_planner', contentPlannerNode)

    // Phase 2: Scene coding (parallel fan-out — Sonnet 4.6, single pass)
    .addNode('scene_coder', sceneCoderNode)
    .addNode('merge_scenes', mergeNode)

    // Phase 3: Asset production (sequential — Nano Banana, max 3 images)
    .addNode('asset_producer', assetProducerNode)

    // Phase 4: TTS generation (parallel fan-out)
    .addNode('tts_generator', ttsGeneratorNode)
    .addNode('merge_tts', mergeNode)

    // Phase 5: Compilation (deterministic)
    .addNode('video_compiler', videoCompilerNode)

    // Edges
    .addEdge(START, 'content_planner')
    .addConditionalEdges('content_planner', fanOutSceneCoders, [
      'scene_coder', 'merge_scenes',
    ])
    .addEdge('scene_coder', 'merge_scenes')
    .addEdge('merge_scenes', 'asset_producer')
    .addConditionalEdges('asset_producer', fanOutTTS, [
      'tts_generator', 'merge_tts',
    ])
    .addEdge('tts_generator', 'merge_tts')
    .addEdge('merge_tts', 'video_compiler')
    .addEdge('video_compiler', END);

  return workflow.compile({ checkpointer: new MemorySaver() });
}
