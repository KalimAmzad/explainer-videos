/**
 * Node 2: Research Planner — Kimi K2.5 via OpenRouter plans WHAT to teach.
 * Purely educational content planning: scenes, teaching points, narration.
 * No layout, no assets, no positions, no animations.
 */
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS, OPENROUTER_BASE_URL } from '../config.mjs';
import { buildResearchPlannerPrompt } from '../prompts/research-planner.mjs';

export async function researchPlannerNode(state) {
  console.log('\n  ── Research Planner ──');
  console.log(`    Topic: ${state.topic}`);

  const model = new ChatOpenAI({
    model: MODELS.researchPlanner,
    apiKey: KEYS.openrouter,
    configuration: { baseURL: OPENROUTER_BASE_URL },
    maxTokens: 32768,
    temperature: 0.7,
    // Disable extended thinking for Qwen3 thinking models on OpenRouter
    model_kwargs: { enable_thinking: false },
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

  // Strip <think>...</think> blocks (Qwen3 thinking models)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  } else {
    // Find first JSON object/array (handles thinking preamble without tags)
    const jsonStart = text.search(/[{[]/);
    if (jsonStart > 0) text = text.slice(jsonStart);
    // Strip any trailing text after closing brace/bracket
    const lastClose = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (lastClose !== -1) text = text.slice(0, lastClose + 1);
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
