/**
 * Node 1: Research Planner — Claude Opus via LangChain (cost-tracked).
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlannerPrompt } from '../prompts/research-planner.mjs';

export async function researchPlannerNode(state) {
  console.log('\n══ Node 1: Research Planner ══');
  console.log(`  Topic: ${state.topic}`);

  const model = new ChatAnthropic({
    model: MODELS.research,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 16384,
  });

  const prompt = buildResearchPlannerPrompt({
    topic: state.topic,
    duration: state.duration,
    audience: state.audience,
    instructions: state.instructions,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = response.content.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const result = JSON.parse(text);

  const usage = response.usage_metadata;
  console.log(`  [${MODELS.research}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);
  console.log(`  Scenes: ${result.scenes?.length}`);
  for (const s of result.scenes || []) {
    console.log(`    Scene ${s.scene_number}: "${s.title}" (${s.duration}s)`);
  }

  // Ensure 'topic' field exists (v3.2 compiler expects researchNotes.topic)
  if (!result.topic) result.topic = result.title || state.topic;

  return { researchNotes: result };
}
