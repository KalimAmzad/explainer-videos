#!/usr/bin/env node
/**
 * CLI entry point for the LangGraph v4 video pipeline.
 *
 * Usage:
 *   node scripts/langgraph-v4/index.mjs "Topic Name" --duration=60 --audience="..."
 */
import fs from 'fs';
import path from 'path';
import { setupLangSmith, validateKeys, LANGSMITH, PATHS } from './config.mjs';

// Setup LangSmith tracing before importing LangChain modules
const tracingEnabled = setupLangSmith();

// Validate required API keys
validateKeys(['gemini', 'anthropic']);

// Dynamic import after env setup
const { buildGraph } = await import('./graph.mjs');

// Parse CLI arguments
const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node scripts/langgraph-v4/index.mjs "Topic Name" [--duration=60] [--audience="..."]');
  process.exit(1);
}

const durationArg = process.argv.find(a => a.startsWith('--duration='))?.split('=')[1];
const duration = durationArg ? parseInt(durationArg, 10) : 60;
const audience = process.argv.find(a => a.startsWith('--audience='))?.split('=')[1] || '';
const instructions = process.argv.find(a => a.startsWith('--instructions='))?.split('=')[1] || '';
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(PATHS.output, slug);
const threadId = process.argv.find(a => a.startsWith('--thread='))?.split('=')[1] || `v4-${slug}-${Date.now()}`;

console.log('╔══════════════════════════════════════════════╗');
console.log('║  LangGraph Video Pipeline v4 (Revideo)      ║');
console.log('╚══════════════════════════════════════════════╝');
console.log();
console.log(`  Topic:    ${topic}`);
console.log(`  Duration: ${duration}s`);
console.log(`  Audience: ${audience || 'general audience'}`);
console.log(`  Slug:     ${slug}`);
console.log(`  Output:   ${outputDir}`);
console.log(`  Thread:   ${threadId}`);
if (tracingEnabled) {
  console.log(`  Tracing:  LangSmith (${LANGSMITH.project})`);
}
console.log();

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

const startTime = Date.now();
const graph = buildGraph();

const initialState = { topic, audience, duration, instructions, slug, outputDir };
const config = { configurable: { thread_id: threadId } };

try {
  console.log('Starting pipeline...\n');
  const result = await graph.invoke(initialState, config);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Pipeline Complete                           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();
  console.log(`  Output:   ${result.outputPath}`);
  console.log(`  Duration: ${result.researchNotes?.total_duration}s`);
  console.log(`  Scenes:   ${result.researchNotes?.scenes?.length}`);
  console.log(`  Images:   ${result.sceneImages?.length}`);
  console.log(`  Elapsed:  ${elapsed}s`);

  if (result.errors?.length) {
    console.log('\n  Errors:');
    for (const err of result.errors) {
      console.log(`    ${err}`);
    }
  }

  console.log();
} catch (e) {
  console.error(`\nPipeline failed: ${e.message}`);
  console.error(e.stack);
  console.error(`\nTo resume, re-run with: --thread=${threadId}`);
  process.exit(1);
}
