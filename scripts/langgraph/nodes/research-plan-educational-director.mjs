/**
 * Node 1: Research & Plan Educational Director
 * Uses Claude Opus via @anthropic-ai/sdk for deep research
 * and comprehensive video blueprint generation.
 */
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlanPrompt, BLUEPRINT_JSON_SCHEMA } from '../prompts/research-plan.mjs';

/**
 * Call Claude with structured JSON output via the Anthropic SDK.
 */
async function callClaudeStructured(prompt, schema, model) {
  const client = new Anthropic({ apiKey: KEYS.anthropic });

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from the response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('No text in Claude response');
  }

  // Log usage
  const usage = response.usage;
  console.log(`  Tokens: ${usage.input_tokens} in / ${usage.output_tokens} out`);

  // Parse JSON from response (Claude returns JSON when prompted to)
  let text = textBlock.text.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(text);
}

/**
 * Research & Plan Educational Director node.
 * Generates a comprehensive, visually rich video blueprint.
 */
export async function researchPlanNode(state) {
  const model = MODELS.research;

  console.log('\n══════════════════════════════════════');
  console.log('  Node 1: Research & Plan Educational Director');
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
  const blueprint = await callClaudeStructured(prompt, BLUEPRINT_JSON_SCHEMA, model);

  // Log blueprint summary
  console.log(`\n  Blueprint generated:`);
  console.log(`    Topic:      ${blueprint.topic}`);
  console.log(`    Duration:   ${blueprint.total_duration}s`);
  console.log(`    Scenes:     ${blueprint.scenes.length}`);
  console.log(`    Objectives: ${blueprint.learning_objectives?.length || 0}`);

  for (const scene of blueprint.scenes) {
    const veCount = scene.visual_elements?.length || 0;
    const labelCount = scene.labels?.length || 0;
    const decoCount = scene.decorations?.length || 0;
    const animCount = scene.animation_sequence?.length || 0;

    console.log(`\n    Scene ${scene.scene_number} (${scene.time_start}-${scene.time_end}s): ${scene.title}`);
    console.log(`      Layout: ${scene.layout}, Color: ${scene.concept_color}`);
    console.log(`      Visual elements: ${veCount}, Labels: ${labelCount}, Decorations: ${decoCount}`);
    console.log(`      Animation steps: ${animCount}`);

    for (const ve of (scene.visual_elements || [])) {
      console.log(`        [${ve.type}] ${ve.id}: "${(ve.description || '').slice(0, 60)}..." (${ve.source_preference})`);
    }
  }

  // Backward compatibility: create illustration field from first visual_element
  for (const scene of blueprint.scenes) {
    if (!scene.illustration && scene.visual_elements?.length > 0) {
      const main = scene.visual_elements.find(v => v.type === 'main_illustration') || scene.visual_elements[0];
      scene.illustration = {
        description: main.description,
        style: main.type === 'supporting_icon' ? 'icon' : 'custom_sketch',
        complexity: main.complexity || 'moderate',
        source_preference: main.source_preference || 'gemini_generate',
        icon_search_terms: main.icon_search_terms || [],
        fallback_description: main.description,
      };
      scene.illustration_position = main.position;
    }
  }

  return {
    blueprint,
    currentStep: 'research_plan_complete',
  };
}
