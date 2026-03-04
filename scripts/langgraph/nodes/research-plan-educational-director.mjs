/**
 * Node 1: Research & Plan Educational Director
 * Uses Claude Opus via @anthropic-ai/claude-agent-sdk for deep research
 * and comprehensive video blueprint generation.
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import { MODELS, KEYS } from '../config.mjs';
import { buildResearchPlanPrompt, BLUEPRINT_JSON_SCHEMA } from '../prompts/research-plan.mjs';

/**
 * Call Claude Opus to generate a rich video blueprint.
 * Uses structured output (json_schema) for reliable JSON.
 */
async function callClaudeStructured(prompt, schema, model) {
  // Ensure ANTHROPIC_API_KEY is in env
  if (KEYS.anthropic && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = KEYS.anthropic;
  }

  const q = query({
    prompt,
    options: {
      model,
      maxTokens: 16384,
      outputFormat: {
        type: 'json_schema',
        schema,
      },
    },
  });

  for await (const message of q) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        console.log(`  Claude usage: ${JSON.stringify(message.usage)}`);
        console.log(`  Cost: $${message.total_cost_usd?.toFixed(4) || '?'}`);

        // structured_output is already parsed JSON
        if (message.structured_output) {
          return message.structured_output;
        }
        // Fallback: parse from text result
        if (message.result) {
          return JSON.parse(message.result);
        }
        throw new Error('No structured output or text result from Claude');
      } else {
        const errors = message.errors?.join(', ') || 'Unknown error';
        throw new Error(`Claude query failed: ${errors}`);
      }
    }
  }

  throw new Error('Claude query ended without result');
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
  console.log(`  Audience: ${state.audience}`);
  console.log(`  Duration: ${state.duration}s`);
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
  // so downstream nodes (asset-sourcing) can consume either format
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
