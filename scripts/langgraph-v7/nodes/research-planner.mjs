/**
 * Node 2: Research Planner — Haiku plans WHAT to teach.
 * Purely educational content planning: scenes, teaching points, narration.
 * No layout, no assets, no positions, no animations.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlannerPrompt } from '../prompts/research-planner.mjs';

export async function researchPlannerNode(state) {
  console.log('\n  ── Research Planner ──');
  console.log(`    Topic: ${state.topic}`);

  const model = new ChatAnthropic({
    model: MODELS.researchPlanner,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 4096,
  });

  const prompt = buildResearchPlannerPrompt({
    topic: state.topic,
    duration: state.duration,
    audience: state.audience,
    instructions: state.instructions,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = typeof response.content === 'string'
    ? response.content
    : response.content.map(c => c.text || '').join('');

  // Strip markdown fences
  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.researchPlanner}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  const researchNotes = JSON.parse(text);

  // Ensure 'topic' field exists (downstream nodes expect researchNotes.topic)
  if (!researchNotes.topic) researchNotes.topic = researchNotes.title || state.topic;

  // Apply maxScenes limit if set
  if (state.maxScenes > 0 && researchNotes.scenes?.length > state.maxScenes) {
    console.log(`    Trimming ${researchNotes.scenes.length} scenes to maxScenes=${state.maxScenes}`);
    researchNotes.scenes = researchNotes.scenes.slice(0, state.maxScenes);
    // Recalculate total duration from remaining scenes
    researchNotes.total_duration = researchNotes.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);
  }

  // Log scene breakdown
  const totalDuration = researchNotes.scenes?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
  console.log(`    Scenes: ${researchNotes.scenes?.length || 0}, total duration: ${totalDuration}s`);
  for (const s of researchNotes.scenes || []) {
    console.log(`      Scene ${s.scene_number}: "${s.title}" (${s.duration}s)`);
  }

  return { researchNotes };
}
