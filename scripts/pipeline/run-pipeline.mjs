/**
 * Pipeline orchestrator: runs steps 1-5 in sequence.
 *
 * Usage:
 *   node scripts/pipeline/run-pipeline.mjs "Topic Name" --duration=60 --audience="general"
 *
 * Options:
 *   --duration=N    Video duration in seconds (default: 60)
 *   --audience=STR  Target audience (default: "general audience")
 *   --skip=N        Skip to step N (for re-runs, e.g. --skip=3)
 *   --output=DIR    Custom output directory
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node run-pipeline.mjs "Topic Name" [--duration=60] [--audience=...] [--skip=N]');
  process.exit(1);
}

const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
const duration = process.argv.find(a => a.startsWith('--duration='))?.split('=')[1] || '60';
const audience = process.argv.find(a => a.startsWith('--audience='))?.split('=')[1] || 'general audience';
const skip = parseInt(process.argv.find(a => a.startsWith('--skip='))?.split('=')[1] || '0', 10);
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || '';

const steps = [
  { file: '01-plan-content.mjs', name: 'Plan Content',          args: [topic, `--duration=${duration}`, `--audience=${audience}`] },
  { file: '02-source-assets.mjs', name: 'Source Assets',         args: [slug] },
  { file: '02b-analyze-assets.mjs', name: 'Analyze Assets (SVG)', args: [slug] },
  { file: '03-process-assets.mjs', name: 'Process Layout',       args: [slug] },
  { file: '04-assemble-html.mjs', name: 'Assemble HTML',         args: [slug] },
  { file: '05-verify.mjs',        name: 'Verify (Screenshots)',  args: [slug] },
];

// Forward --output to each step
if (outputDir) {
  for (const step of steps) step.args.push(`--output=${outputDir}`);
}

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║  Whiteboard Explainer Video Pipeline          ║`);
console.log(`╚══════════════════════════════════════════════╝`);
console.log(`  Topic:    ${topic}`);
console.log(`  Duration: ${duration}s`);
console.log(`  Audience: ${audience}`);
console.log(`  Slug:     ${slug}`);
if (skip > 0) console.log(`  Skipping to step ${skip}`);
console.log();

const startTime = Date.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const stepNum = i + 1;

  if (stepNum < skip) {
    console.log(`⏭  Step ${stepNum}: ${step.name} — skipped`);
    continue;
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`▶  Step ${stepNum}/6: ${step.name}`);
  console.log(`${'═'.repeat(50)}\n`);

  const scriptPath = path.join(__dirname, step.file);
  try {
    execFileSync('node', [scriptPath, ...step.args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (e) {
    console.error(`\n✗ Step ${stepNum} failed with exit code ${e.status}`);
    process.exit(e.status || 1);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n${'═'.repeat(50)}`);
console.log(`✓ Pipeline complete in ${elapsed}s`);
console.log(`  Output: output/${slug}/${slug}-whiteboard.html`);
console.log(`${'═'.repeat(50)}\n`);
