/**
 * Node 1: Research Plan (v3)
 * Uses Claude Opus for brief, expert-level research notes with 16×32 grid layout.
 */
import Anthropic from '@anthropic-ai/sdk';
import { traceable } from 'langsmith/traceable';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlanPrompt } from '../prompts/research-plan-v3.mjs';

const callClaudeStructured = traceable(async function callClaudeStructured(prompt, model) {
  const client = new Anthropic({ apiKey: KEYS.anthropic });

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock?.text) throw new Error('No text in Claude response');

  const usage = response.usage;
  console.log(`  Tokens: ${usage.input_tokens} in / ${usage.output_tokens} out`);

  let text = textBlock.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(text);
}, { run_type: 'llm', name: 'claude_research' });

export async function researchPlanNode(state) {
  const model = MODELS.research;

  console.log('\n══════════════════════════════════════');
  console.log('  Node 1: Research Plan');
  console.log('══════════════════════════════════════');
  console.log(`  Topic:    ${state.topic}`);
  console.log(`  Audience: ${state.audience || 'general audience'}`);
  console.log(`  Duration: ${state.duration ? state.duration + 's' : 'auto'}`);
  console.log(`  Model:    ${model}`);

  const prompt = buildResearchPlanPrompt({
    topic: state.topic,
    audience: state.audience || undefined,
    duration: state.duration || undefined,
    instructions: state.instructions || undefined,
  });

  console.log(`  Calling ${model}...`);
  const researchNotes = await callClaudeStructured(prompt, model);

  // Ensure scene_number is set
  for (let i = 0; i < researchNotes.scenes.length; i++) {
    if (!researchNotes.scenes[i].scene_number) {
      researchNotes.scenes[i].scene_number = i + 1;
    }
  }

  // Calculate cumulative time_start for each scene if not present
  let cumulativeTime = 0;
  for (const scene of researchNotes.scenes) {
    if (scene.time_start === undefined) {
      scene.time_start = cumulativeTime;
    }
    cumulativeTime = scene.time_start + (scene.duration || 10);
  }

  console.log(`\n  Research notes generated:`);
  console.log(`    Topic:      ${researchNotes.topic}`);
  console.log(`    Duration:   ${researchNotes.total_duration}s`);
  console.log(`    Scenes:     ${researchNotes.scenes.length}`);

  for (const scene of researchNotes.scenes) {
    const assetCount = scene.assets?.length || 0;
    console.log(`\n    Scene ${scene.scene_number}: ${scene.title} (${scene.duration}s)`);
    console.log(`      Key concept: ${scene.key_concept}`);
    console.log(`      Assets: ${assetCount}`);
    for (const a of (scene.assets || [])) {
      console.log(`        [${a.source_hint}] ${a.role}: ${(a.description || '').slice(0, 60)}`);
    }
  }

  return {
    researchNotes,
    currentStep: 'research_plan_complete',
  };
}
