#!/usr/bin/env node
/**
 * CLI entry point for LangGraph v8 — Production Pipeline.
 *
 * Usage:
 *   node scripts/langgraph-v8/index.mjs "Topic Name" [--duration=60] [--scenes=5] [--audience="..."] [--instructions="..."] [--output=path] [--thread=id]
 */
import fs from 'fs';
import path from 'path';
import { setupLangSmith, validateKeys, LANGSMITH, PATHS } from './config.mjs';

const tracingEnabled = setupLangSmith();
validateKeys(['anthropic', 'gemini', 'openai', 'openrouter']);

const { buildGraph } = await import('./graph.mjs');

// --- Parse CLI args ---
const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node scripts/langgraph-v8/index.mjs "Topic Name" [--duration=60] [--scenes=5] [--audience="..."]');
  process.exit(1);
}

const getArg = (prefix) => process.argv.find(a => a.startsWith(prefix))?.split('=').slice(1).join('=');

const duration     = parseInt(getArg('--duration=') || '60', 10);
const maxScenes    = parseInt(getArg('--scenes=')   || '0', 10);
const audience     = getArg('--audience=')     || '';
const instructions = getArg('--instructions=') || '';
const slug         = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

// Versioned output: find next available run number
function nextOutputDir(base) {
  if (getArg('--output=')) return getArg('--output=');
  let n = 1;
  while (fs.existsSync(path.join(base, `${slug}-v8-run${n}`))) n++;
  return path.join(base, `${slug}-v8-run${n}`);
}
const outputDir = nextOutputDir(PATHS.output);
const threadId  = getArg('--thread=') || `v8-${slug}-${Date.now()}`;

// --- Banner ---
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  LangGraph v8 — Production Pipeline              ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log();
console.log(`  Topic:    ${topic}`);
console.log(`  Duration: ${duration}s`);
console.log(`  Scenes:   ${maxScenes || 'auto'}`);
console.log(`  Audience: ${audience || 'general audience'}`);
console.log(`  Output:   ${outputDir}`);
console.log(`  Thread:   ${threadId}`);
if (tracingEnabled) console.log(`  Tracing:  LangSmith (${LANGSMITH.project})`);
console.log();
console.log('  Pipeline: content_planner → storyboard_designer');
console.log('            → [narration × N + assets × M] (parallel)');
console.log('            → [scene_coder × N] (single-pass)');
console.log('            → video_compiler');
console.log();

fs.mkdirSync(outputDir, { recursive: true });

// --- Run pipeline ---
const startTime = Date.now();
const graph = buildGraph();

try {
  console.log('Starting pipeline...\n');
  const result = await graph.invoke(
    { topic, audience, duration, instructions, slug, outputDir, maxScenes },
    { configurable: { thread_id: threadId } }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Pipeline Complete                                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Video:    ${result.videoPath || 'N/A'}`);
  console.log(`  Scenes:   ${result.compiledScenes?.length || 0}`);
  console.log(`  Assets:   ${result.resolvedAssets?.length || 0} (${result.resolvedAssets?.filter(a => a.status === 'ok').length || 0} ok)`);
  console.log(`  Elapsed:  ${elapsed}s`);
  if (result.errors?.length) {
    console.log(`  Warnings: ${result.errors.length}`);
    for (const err of result.errors) console.log(`    - ${err}`);
  }
  console.log();
} catch (e) {
  console.error(`\nPipeline failed: ${e.message}`);
  console.error(e.stack);
  console.error(`\nTo resume: node scripts/langgraph-v8/index.mjs "${topic}" --thread=${threadId}`);
  process.exit(1);
}
