/**
 * Node 1: Content Planner — Haiku does theme design + content planning.
 *
 * Makes two sequential LLM calls in a single node:
 *   1. Theme design (palette, fonts, stroke) — ~300 tokens
 *   2. Content planning (scenes, teaching points, narration) — ~3K tokens
 *
 * Output: { theme, researchNotes }
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildThemePrompt, buildContentPrompt } from '../prompts/content-planner.mjs';

export async function contentPlannerNode(state) {
  console.log('\n  ── Content Planner (Theme + Content) ──');
  console.log(`    Topic: ${state.topic}`);

  const model = new ChatAnthropic({
    model: MODELS.contentPlanner,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 4096,
  });

  // ── Call 1: Theme Design ──
  console.log('    [1/2] Designing theme...');
  const themePrompt = buildThemePrompt({
    topic: state.topic,
    audience: state.audience,
    instructions: state.instructions,
  });

  const themeResponse = await model.invoke([new HumanMessage(themePrompt)]);
  let themeText = typeof themeResponse.content === 'string'
    ? themeResponse.content
    : themeResponse.content.map(c => c.text || '').join('');

  themeText = themeText.trim();
  if (themeText.startsWith('```')) {
    themeText = themeText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const theme = JSON.parse(themeText);
  const themeUsage = themeResponse.usage_metadata;
  console.log(`    [Haiku theme] ${themeUsage?.input_tokens || '?'} in / ${themeUsage?.output_tokens || '?'} out`);
  console.log(`    Theme: ${theme.headingFont} / ${theme.primaryFont}, primary=${theme.palette?.primary || '?'}`);

  // ── Call 2: Content Planning ──
  console.log('    [2/2] Planning content...');
  const contentPrompt = buildContentPrompt({
    topic: state.topic,
    duration: state.duration,
    audience: state.audience,
    instructions: state.instructions,
  });

  const contentResponse = await model.invoke([new HumanMessage(contentPrompt)]);
  let contentText = typeof contentResponse.content === 'string'
    ? contentResponse.content
    : contentResponse.content.map(c => c.text || '').join('');

  contentText = contentText.trim();
  if (contentText.startsWith('```')) {
    contentText = contentText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const contentUsage = contentResponse.usage_metadata;
  console.log(`    [Haiku content] ${contentUsage?.input_tokens || '?'} in / ${contentUsage?.output_tokens || '?'} out`);

  const researchNotes = JSON.parse(contentText);

  // Ensure 'topic' field exists
  if (!researchNotes.topic) researchNotes.topic = state.topic;

  // Apply maxScenes limit
  if (state.maxScenes > 0 && researchNotes.scenes?.length > state.maxScenes) {
    console.log(`    Trimming ${researchNotes.scenes.length} scenes to maxScenes=${state.maxScenes}`);
    researchNotes.scenes = researchNotes.scenes.slice(0, state.maxScenes);
    researchNotes.total_duration = researchNotes.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);
  }

  // Log scene breakdown
  const totalDuration = researchNotes.scenes?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
  console.log(`    Scenes: ${researchNotes.scenes?.length || 0}, total duration: ${totalDuration}s`);
  for (const s of researchNotes.scenes || []) {
    console.log(`      Scene ${s.scene_number}: "${s.title}" (${s.duration}s)`);
  }

  return { theme, researchNotes };
}
