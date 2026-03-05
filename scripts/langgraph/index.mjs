#!/usr/bin/env node
/**
 * CLI entry point for the LangGraph whiteboard video pipeline.
 *
 * Usage:
 *   node scripts/langgraph/index.mjs "Topic Name" --duration=60 --audience="..."
 *
 * Options:
 *   --duration=N    Video duration in seconds (default: 60)
 *   --audience=STR  Target audience (default: "general audience")
 *   --output=DIR    Output directory (default: output/{slug})
 *   --thread=ID     Thread ID for checkpointing (default: auto-generated)
 *   --render        Export graph visualization as Mermaid and PNG, then exit
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

// Handle --render flag (no topic required)
const renderMode = process.argv.includes('--render');
if (renderMode) {
  const graph = buildGraph();
  const graphViz = await graph.getGraphAsync();
  const mermaid = graphViz.drawMermaid({ withStyles: true });
  const outPath = path.join(PATHS.root, 'docs', 'langgraph-workflow.mmd');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, mermaid);
  console.log(`Graph exported to: ${outPath}`);
  console.log('\nMermaid diagram:\n');
  console.log(mermaid);

  // Try PNG export
  try {
    const pngBlob = await graphViz.drawMermaidPng({ backgroundColor: '#ffffff' });
    const pngBuffer = Buffer.from(await pngBlob.arrayBuffer());
    const pngPath = path.join(PATHS.root, 'docs', 'langgraph-workflow.png');
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`\nPNG exported to: ${pngPath}`);
  } catch (e) {
    console.log(`\nPNG export skipped: ${e.message}`);
  }
  process.exit(0);
}

// Parse CLI arguments
const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node scripts/langgraph/index.mjs "Topic Name" [--duration=60] [--audience="..."]');
  console.error('       node scripts/langgraph/index.mjs --render   (export graph visualization)');
  process.exit(1);
}

const durationArg = process.argv.find(a => a.startsWith('--duration='))?.split('=')[1];
const duration = durationArg ? parseInt(durationArg, 10) : 0;
const audience = process.argv.find(a => a.startsWith('--audience='))?.split('=')[1] || '';
const instructions = process.argv.find(a => a.startsWith('--instructions='))?.split('=')[1] || '';
const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(PATHS.output, slug);
const threadId = process.argv.find(a => a.startsWith('--thread='))?.split('=')[1] || `${slug}-${Date.now()}`;

console.log('╔══════════════════════════════════════════╗');
console.log('║  LangGraph Whiteboard Video Pipeline v3  ║');
console.log('╚══════════════════════════════════════════╝');
console.log();
console.log(`  Topic:    ${topic}`);
console.log(`  Duration: ${duration ? duration + 's' : 'auto'}`);
console.log(`  Audience: ${audience || 'general audience'}`);
console.log(`  Slug:     ${slug}`);
console.log(`  Output:   ${outputDir}`);
console.log(`  Thread:   ${threadId}`);
if (tracingEnabled) {
  console.log(`  Tracing:  LangSmith (${LANGSMITH.project})`);
}
console.log();

const startTime = Date.now();
const graph = buildGraph();

const initialState = { topic, audience, duration, instructions, slug, outputDir };
const config = { configurable: { thread_id: threadId } };

try {
  console.log('Starting pipeline...\n');
  const result = await graph.invoke(initialState, config);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Pipeline Complete                       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();
  console.log(`  Output:   ${result.outputPath}`);
  console.log(`  Duration: ${result.researchNotes?.total_duration}s`);
  console.log(`  Scenes:   ${result.researchNotes?.scenes?.length}`);
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
