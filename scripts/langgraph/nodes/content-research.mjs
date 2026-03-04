/**
 * Node 1: Content Research & Direction
 * Uses Gemini to generate a comprehensive video blueprint.
 */
import { callGeminiJSON } from '../lib/gemini-client.mjs';
import { buildContentResearchPrompt, BLUEPRINT_SCHEMA } from '../prompts/content-research.mjs';

const MODEL = 'gemini-3.1-flash-lite-preview';

export async function contentResearchNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 1: Content Research');
  console.log('══════════════════════════════════════');
  console.log(`  Topic: ${state.topic}`);
  console.log(`  Audience: ${state.audience}`);
  console.log(`  Duration: ${state.duration}s`);

  const numScenes = Math.max(4, Math.min(10, Math.round(state.duration / 10)));
  console.log(`  Target scenes: ${numScenes}`);

  const prompt = buildContentResearchPrompt({
    topic: state.topic,
    audience: state.audience,
    duration: state.duration,
    numScenes,
  });

  console.log(`  Calling ${MODEL}...`);
  const blueprint = await callGeminiJSON(MODEL, prompt, BLUEPRINT_SCHEMA);

  // Validate and log
  console.log(`\n  Blueprint generated:`);
  console.log(`    Topic: ${blueprint.topic}`);
  console.log(`    Duration: ${blueprint.total_duration}s`);
  console.log(`    Scenes: ${blueprint.scenes.length}`);
  if (blueprint.learning_objectives) {
    console.log(`    Objectives: ${blueprint.learning_objectives.length}`);
  }

  for (const scene of blueprint.scenes) {
    console.log(`\n    Scene ${scene.scene_number} (${scene.time_start}-${scene.time_end}s): ${scene.title}`);
    console.log(`      Layout: ${scene.layout}, Color: ${scene.concept_color}`);
    console.log(`      Illustration: ${scene.illustration?.source_preference} — "${(scene.illustration?.description || '').slice(0, 50)}..."`);
    console.log(`      Body: ${(scene.body_lines || []).join(' | ')}`);
    console.log(`      Animation steps: ${(scene.animation_sequence || []).length}`);
  }

  return {
    blueprint,
    currentStep: 'content_research_complete',
  };
}
