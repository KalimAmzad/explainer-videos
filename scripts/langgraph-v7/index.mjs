#!/usr/bin/env node
/**
 * CLI entry point for LangGraph v7 — Remotion + Template Layout pipeline.
 *
 * Usage:
 *   node scripts/langgraph-v7/index.mjs "Topic Name" [--duration=60] [--scenes=5] [--audience="..."] [--instructions="..."] [--output=path] [--thread=id]
 */
import fs from 'fs';
import path from 'path';
import { setupLangSmith, validateKeys, LANGSMITH, PATHS } from './config.mjs';

const tracingEnabled = setupLangSmith();
validateKeys(['anthropic', 'gemini', 'openrouter']);

const { buildGraph } = await import('./graph.mjs');

// --- Parse CLI args ---
const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node scripts/langgraph-v7/index.mjs "Topic Name" [--duration=60] [--scenes=5] [--audience="..."]');
  process.exit(1);
}

const getArg = (prefix) => process.argv.find(a => a.startsWith(prefix))?.split('=').slice(1).join('=');

const duration     = parseInt(getArg('--duration=') || '60', 10);
const maxScenes    = parseInt(getArg('--scenes=')   || '0', 10);
const audience     = getArg('--audience=')     || '';
const instructions = getArg('--instructions=') || '';
const slug         = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

// Versioned output: find next available run number to avoid overwriting previous runs
function nextOutputDir(base) {
  if (getArg('--output=')) return getArg('--output=');
  let n = 1;
  while (fs.existsSync(path.join(base, `${slug}-v7-run${n}`))) n++;
  return path.join(base, `${slug}-v7-run${n}`);
}
const outputDir    = nextOutputDir(PATHS.output);
const threadId     = getArg('--thread=') || `v7-${slug}-${Date.now()}`;

// --- Banner ---
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  LangGraph v7 — Remotion + Template Layout      ║');
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
  console.log(`  Assets:   ${result.assets?.length || 0}`);
  console.log(`  Elapsed:  ${elapsed}s`);
  if (result.errors?.length) {
    console.log(`  Warnings: ${result.errors.length}`);
    for (const err of result.errors) console.log(`    - ${err}`);
  }
  console.log();
} catch (e) {
  console.error(`\nPipeline failed: ${e.message}`);
  console.error(e.stack);
  console.error(`\nTo resume: node scripts/langgraph-v7/index.mjs "${topic}" --thread=${threadId}`);
  process.exit(1);
}
