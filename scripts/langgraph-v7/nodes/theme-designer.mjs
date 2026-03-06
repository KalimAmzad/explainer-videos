/**
 * Node 1: Theme Designer — Haiku establishes visual branding.
 * Decides fonts, color palette, stroke style for the entire video.
 * Runs once; output injected into all downstream nodes/templates.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { MODELS, KEYS } from '../config.mjs';
import { buildThemeDesignerPrompt } from '../prompts/theme-designer.mjs';

export async function themeDesignerNode(state) {
  console.log('\n  ── Theme Designer ──');

  const model = new ChatAnthropic({
    model: MODELS.themeDesigner,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 1024,
  });

  const prompt = buildThemeDesignerPrompt({
    topic: state.topic,
    audience: state.audience,
    instructions: state.instructions,
  });

  const response = await model.invoke([new HumanMessage(prompt)]);
  let text = typeof response.content === 'string'
    ? response.content
    : response.content.map(c => c.text || '').join('');

  // Strip markdown fences
  text = text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const usage = response.usage_metadata;
  console.log(`    [${MODELS.themeDesigner}] ${usage?.input_tokens || '?'} in / ${usage?.output_tokens || '?'} out`);

  const theme = JSON.parse(text);
  console.log(`    Theme: ${theme.headingFont} / ${theme.primaryFont}, primary=${theme.palette?.primary || '?'}`);

  return { theme };
}
