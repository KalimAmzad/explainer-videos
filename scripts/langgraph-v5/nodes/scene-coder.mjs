/**
 * Node 3: Scene Coder — Claude Sonnet with vision.
 * Receives the Nano Banana reference image and recreates it as
 * animated SVG with stroke draw-on effects.
 * Uses LangChain ChatAnthropic for cost tracking in LangSmith.
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildSceneCoderPrompt } from '../prompts/scene-coder.mjs';

/** Escape control chars only inside JSON string values, leaving structural whitespace intact. */
function sanitizeJsonStrings(text) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { continue; } // skip other control chars
    }
    out += ch;
  }
  return out;
}

export async function sceneCoderNode(state) {
  const sceneNotes = state._sceneNotes;
  const sceneNum = sceneNotes.scene_number;
  const sceneImage = state._sceneImage;
  const totalScenes = state.researchNotes?.scenes?.length || 5;

  console.log(`\n  ── Scene Coder [Scene ${sceneNum}]: ${sceneNotes.title} ──`);

  // Stagger parallel calls
  const staggerMs = (state._sceneIndex || 0) * 1500;
  if (staggerMs > 0) await new Promise(r => setTimeout(r, staggerMs));

  const model = new ChatAnthropic({
    model: MODELS.sceneCoder,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 12000,
  });

  const textPrompt = buildSceneCoderPrompt({ sceneNotes, sceneNum, totalScenes });

  // Build message with image + text
  const messageContent = [];

  // Include reference image if available
  if (sceneImage?.base64) {
    messageContent.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${sceneImage.base64}`,
      },
    });
    messageContent.push({
      type: 'text',
      text: 'Above is the REFERENCE IMAGE for this scene. Study it carefully — recreate its layout, content, and visual elements as SVG with stroke animations.\n\n' + textPrompt,
    });
    console.log(`    With reference image (${(sceneImage.base64.length / 1024).toFixed(0)} KB base64)`);
  } else {
    messageContent.push({ type: 'text', text: textPrompt });
    console.log('    No reference image — coding from description only');
  }

  const response = await model.invoke([new HumanMessage({ content: messageContent })]);

  let text = typeof response.content === 'string'
    ? response.content.trim()
    : response.content;

  if (typeof text === 'string' && text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Sanitize control characters ONLY inside JSON string values (LLM emits literal newlines/tabs in strings)
  let result;
  try {
    result = JSON.parse(text);
  } catch (parseErr) {
    const sanitized = sanitizeJsonStrings(text);
    try {
      result = JSON.parse(sanitized);
      console.log('    (Sanitized control characters in JSON string values)');
    } catch (e2) {
      console.error(`    JSON parse failed even after sanitization. Raw response (first 500 chars):\n${text.slice(0, 500)}`);
      throw parseErr;
    }
  }
  result.sceneNumber = sceneNum;

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.sceneCoder}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  // Save scene files for debugging
  const scenesDir = path.join(state.outputDir, 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.writeFileSync(path.join(scenesDir, `scene${sceneNum}.svg`), result.svgBody || '');
  fs.writeFileSync(path.join(scenesDir, `scene${sceneNum}.js`), result.jsCode || '');
  fs.writeFileSync(path.join(scenesDir, `scene${sceneNum}-defs.svg`), result.svgDefs || '');

  const svgKB = ((result.svgBody?.length || 0) / 1024).toFixed(1);
  const jsKB = ((result.jsCode?.length || 0) / 1024).toFixed(1);
  console.log(`    Output: ${svgKB} KB SVG, ${jsKB} KB JS`);

  return { sceneOutputs: [result] };
}
