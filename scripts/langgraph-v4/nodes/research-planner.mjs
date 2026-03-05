/**
 * Node 1: Research Planner
 * Uses Claude Opus to generate comprehensive video blueprint with
 * image prompts and asset group definitions per scene.
 */
import Anthropic from '@anthropic-ai/sdk';
import { traceable } from 'langsmith/traceable';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlannerPrompt } from '../prompts/research-planner.mjs';

const callClaude = traceable(async function callClaudeResearch(prompt, model) {
  const client = new Anthropic({ apiKey: KEYS.anthropic });
  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text in Claude response');

  const usage = response.usage;
  console.log(`    [Claude ${model}] ${usage.input_tokens} in / ${usage.output_tokens} out`);

  let text = textBlock.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(text);
}, { run_type: 'llm', name: 'claude_research_planner' });

export async function researchPlannerNode(state) {
  console.log('\n══ Node 1: Research Planner ══');
  console.log(`  Topic: ${state.topic}`);
  console.log(`  Duration: ${state.duration}s`);

  const prompt = buildResearchPlannerPrompt({
    topic: state.topic,
    duration: state.duration,
    audience: state.audience,
    instructions: state.instructions,
  });

  const result = await callClaude(prompt, MODELS.research);

  console.log(`  Scenes planned: ${result.scenes?.length}`);
  for (const s of result.scenes || []) {
    const groupCount = s.asset_groups?.length || 0;
    console.log(`    Scene ${s.scene_number}: "${s.title}" (${s.duration}s, ${groupCount} groups)`);
  }

  return { researchNotes: result };
}
