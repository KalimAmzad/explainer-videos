/**
 * Node 2: SVG Asset Sourcing & Generation Agent
 * ReAct tool-calling loop using Gemini for reasoning + Icons8/SVG gen tools.
 *
 * This node uses the LangGraph messages channel for the ReAct pattern.
 * The agent decides which tools to call based on each scene's illustration requirements.
 */
import { ChatGoogle } from '@langchain/google';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ASSET_SOURCING_SYSTEM_PROMPT } from '../prompts/asset-sourcing.mjs';
import { searchIcons8, downloadIcon } from '../tools/icons8.mjs';
import { generateSvg } from '../tools/svg-generator.mjs';
import { convertToSketchy } from '../tools/svg-to-rough.mjs';
import { MODELS, KEYS } from '../config.mjs';
import { getAllAssets, getAsset } from '../lib/asset-store.mjs';

const MODEL = MODELS.assetAgent;

/** All tools available to the asset agent */
export const assetTools = [searchIcons8, downloadIcon, generateSvg, convertToSketchy];

/**
 * Determine if the asset agent should continue calling tools or move on.
 */
export function shouldContinueAssetLoop(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  // If the last message has tool calls, route to tool execution
  if (lastMessage?.tool_calls?.length > 0) {
    return 'asset_tools';
  }

  // Otherwise, the agent is done — move to next node
  return 'next';
}

/**
 * Asset sourcing agent node.
 * On first call, initializes with blueprint context.
 * On subsequent calls (after tool results), continues reasoning.
 */
export async function assetSourcingAgent(state) {
  const isFirstCall = !state.messages.length ||
    state.messages.every(m => m._getType?.() !== 'system');

  console.log('\n══════════════════════════════════════');
  console.log('  Node 2: Asset Sourcing Agent');
  console.log('══════════════════════════════════════');

  const model = new ChatGoogle({
    model: MODEL,
    temperature: 0.3,
    apiKey: KEYS.gemini,
  });

  const modelWithTools = model.bindTools(assetTools);

  // Build messages for this call
  let messages;
  if (isFirstCall || state.messages.length === 0) {
    // First call: provide system prompt + blueprint context
    const blueprint = state.blueprint;
    const sceneSummaries = blueprint.scenes.map(s => {
      // Support both visual_elements (new) and illustration (legacy) formats
      if (s.visual_elements?.length > 0) {
        const elements = s.visual_elements.map(ve =>
          `    - [${ve.type}] ${ve.id}: "${ve.description}" (${ve.source_preference || 'gemini_generate'}, terms: ${JSON.stringify(ve.icon_search_terms || [])})`
        ).join('\n');
        return `Scene ${s.scene_number}: "${s.title}"\n  Visual elements:\n${elements}`;
      }
      const illust = s.illustration || {};
      return `Scene ${s.scene_number}: "${s.title}"
  - source_preference: ${illust.source_preference || 'gemini_generate'}
  - description: ${illust.description || s.key_concept || s.title}
  - icon_search_terms: ${JSON.stringify(illust.icon_search_terms || [])}
  - style: ${illust.style || 'custom_sketch'}
  - complexity: ${illust.complexity || 'moderate'}`;
    }).join('\n\n');

    const userPrompt = `Here is the video blueprint with ${blueprint.scenes.length} scenes that need illustrations:

${sceneSummaries}

Process each scene in order. For each scene:
1. If source_preference is "icons8", search Icons8 using the icon_search_terms
2. If a good match is found, download it and convert to sketchy style
3. If no good match or source_preference is "gemini_generate", use generateSvg
4. If source_preference is "roughjs", just note it (no tool call needed)

Start with Scene 1.`;

    messages = [
      new SystemMessage(ASSET_SOURCING_SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ];
  } else {
    // Continuation: use existing messages
    messages = state.messages;
  }

  console.log(`  Calling ${MODEL} (${messages.length} messages)...`);
  const response = await modelWithTools.invoke(messages);

  if (response.tool_calls?.length > 0) {
    console.log(`  Agent requested ${response.tool_calls.length} tool call(s):`);
    for (const tc of response.tool_calls) {
      console.log(`    → ${tc.name}(${JSON.stringify(tc.args).slice(0, 100)})`);
    }
  } else {
    console.log('  Agent finished sourcing assets.');
    // Build assets from the global store (tools stored heavy data there)
    const assets = buildAssetsFromStore(state.blueprint);
    return {
      messages: [...messages, response],
      assets,
      currentStep: 'asset_sourcing_complete',
    };
  }

  return {
    messages: [...messages, response],
    currentStep: 'asset_sourcing_in_progress',
  };
}

/**
 * Build the assets array from the global asset store + blueprint defaults.
 * Heavy data (SVG paths, PNGs) is stored in the asset store by tools,
 * not in LLM messages (to avoid context window blowup).
 */
function buildAssetsFromStore(blueprint) {
  const assets = [];

  for (const scene of blueprint.scenes) {
    const n = scene.scene_number;
    const stored = getAsset(n);
    const illust = scene.illustration || {};

    if (stored && (stored.type === 'custom_sketch' || stored.type === 'icons8_sketchy')) {
      assets.push({
        sceneNumber: n,
        type: stored.type,
        svgContent: stored.svgContent || stored.strokePathD || '',
        strokePathD: stored.strokePathD || '',
        pngBase64: stored.pngBase64 || '',
        sourceWidth: stored.sourceWidth,
        sourceHeight: stored.sourceHeight,
        description: stored.description || illust.description || scene.title,
      });
    } else if (illust.source_preference === 'roughjs') {
      assets.push({
        sceneNumber: n,
        type: 'roughjs',
        description: illust.description || scene.title,
        svgContent: '',
      });
    } else {
      assets.push({
        sceneNumber: n,
        type: stored?.type || 'placeholder',
        description: illust.description || scene.title,
        svgContent: stored?.svgContent || '',
      });
    }
  }

  return assets;
}
