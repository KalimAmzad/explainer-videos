/**
 * Node: Content Planner — SIMPLIFIED for v9.
 *
 * Two Haiku calls:
 *   1. Theme design (colors, fonts)
 *   2. Scene breakdown (topics + key concepts ONLY — no narration, no visuals)
 *
 * The scene coder handles all creative decisions downstream.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildThemePrompt, buildContentPrompt } from '../prompts/content-planner.mjs';

function parseJSON(text) {
  let clean = text.trim();
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const jsonStart = clean.search(/\{/);
  if (jsonStart > 0) clean = clean.slice(jsonStart);
  const lastClose = clean.lastIndexOf('}');
  if (lastClose !== -1) clean = clean.slice(0, lastClose + 1);
  return JSON.parse(clean);
}

export async function contentPlannerNode(state) {
  console.log('\n  ── Content Planner (Theme + Content) ──');
  console.log(`    Topic: ${state.topic}`);

  const model = new ChatAnthropic({
    model: MODELS.contentPlanner,
    apiKey: KEYS.anthropic,
    maxTokens: 4096,
    temperature: 0.7,
  });

  // Call 1: Theme
  console.log('    [1/2] Designing theme...');
  const themePrompt = buildThemePrompt({
    topic: state.topic,
    audience: state.audience,
    instructions: state.instructions,
  });
  const themeResp = await model.invoke([new HumanMessage(themePrompt)]);
  const themeText = typeof themeResp.content === 'string'
    ? themeResp.content
    : themeResp.content.map(c => c.text || '').join('');
  const usage1 = themeResp.usage_metadata;
  console.log(`    [Haiku theme] ${usage1?.input_tokens || '?'} in / ${usage1?.output_tokens || '?'} out`);
  const theme = parseJSON(themeText);
  console.log(`    Theme: ${theme.headingFont || '?'} / ${theme.primaryFont || '?'}, primary=${theme.palette?.primary || '?'}`);

  // Call 2: Content
  console.log('    [2/2] Planning content...');
  const contentPrompt = buildContentPrompt({
    topic: state.topic,
    duration: state.duration,
    audience: state.audience,
    instructions: state.instructions,
    maxScenes: state.maxScenes,
  });
  const contentResp = await model.invoke([new HumanMessage(contentPrompt)]);
  const contentText = typeof contentResp.content === 'string'
    ? contentResp.content
    : contentResp.content.map(c => c.text || '').join('');
  const usage2 = contentResp.usage_metadata;
  console.log(`    [Haiku content] ${usage2?.input_tokens || '?'} in / ${usage2?.output_tokens || '?'} out`);
  const content = parseJSON(contentText);

  // Trim scenes if maxScenes specified
  let scenes = content.scenes || [];
  if (state.maxScenes > 0 && scenes.length > state.maxScenes) {
    console.log(`    Trimming ${scenes.length} scenes to maxScenes=${state.maxScenes}`);
    scenes = scenes.slice(0, state.maxScenes);
  }

  console.log(`    Scenes: ${scenes.length}`);
  for (const s of scenes) {
    console.log(`      Scene ${s.scene_number}: "${s.title}" (~${s.estimated_duration || '?'}s)`);
  }

  return { theme, scenes };
}
