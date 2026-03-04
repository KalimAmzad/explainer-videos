/**
 * Node 6: Quality Review Agent
 *
 * Reviews generated HTML for structural and cosmetic issues.
 * - Structural issues (overlaps, off-canvas, timing) → routes back to animation node
 * - HTML-level issues (clip-path, colors) → fixes applied directly
 * - Max 2 retry iterations to prevent infinite loops
 */
import fs from 'fs';
import { callGeminiJSON } from '../lib/gemini-client.mjs';
import { MODELS } from '../config.mjs';
import { buildQualityReviewPrompt, QUALITY_REVIEW_SCHEMA } from '../prompts/quality-review.mjs';

const MODEL = MODELS.qualityReview;
const MAX_ITERATIONS = 2;

/**
 * Conditional edge: decide whether to loop back for fixes or finish.
 */
export function shouldRetryOrFinish(state) {
  const iteration = state.reviewIteration || 0;
  const corrections = state.reviewCorrections || [];

  // If we have structural corrections AND haven't exceeded max retries → loop back
  if (corrections.length > 0 && iteration < MAX_ITERATIONS) {
    console.log(`  [Review] ${corrections.length} structural corrections, routing back to animation (iteration ${iteration + 1}/${MAX_ITERATIONS})`);
    return 'retry';
  }

  // Otherwise → done
  console.log(`  [Review] Pipeline complete (iteration ${iteration}, corrections: ${corrections.length})`);
  return 'done';
}

export async function qualityReviewNode(state) {
  const iteration = state.reviewIteration || 0;

  console.log('\n══════════════════════════════════════');
  console.log(`  Node 6: Quality Review (iteration ${iteration + 1})`);
  console.log('══════════════════════════════════════');

  const { finalHtml, outputPath, blueprint } = state;
  const htmlSize = (finalHtml.length / 1024).toFixed(1);
  console.log(`  HTML size: ${htmlSize} KB`);
  console.log(`  Model: ${MODEL}`);

  // Truncate for review — keep head + tail for coverage
  let htmlForReview = finalHtml;
  if (finalHtml.length > 80000) {
    const head = finalHtml.slice(0, 50000);
    const tail = finalHtml.slice(-25000);
    htmlForReview = head + '\n\n<!-- ... MIDDLE SECTION TRUNCATED FOR REVIEW ... -->\n\n' + tail;
    console.log(`  Truncated for review: ${(htmlForReview.length / 1024).toFixed(1)} KB`);
  }

  const prompt = buildQualityReviewPrompt({
    html: htmlForReview,
    blueprint,
    iteration,
  });

  console.log(`  Sending to ${MODEL}...`);

  let review;
  try {
    review = await callGeminiJSON(MODEL, prompt, QUALITY_REVIEW_SCHEMA);
  } catch (e) {
    console.error(`  Review failed: ${e.message}`);
    // Save HTML as-is and finish
    saveHtml(outputPath, finalHtml);
    return {
      reviewedHtml: finalHtml,
      reviewNotes: [`Review failed: ${e.message}`],
      reviewCorrections: [],
      reviewIteration: iteration + 1,
      currentStep: 'quality_review_failed',
    };
  }

  // Log results
  console.log(`\n  Overall quality: ${review.overall_quality}`);
  console.log(`  Issues: ${review.issues?.length || 0}`);
  console.log(`  Structural corrections: ${review.structural_corrections?.length || 0}`);
  console.log(`  HTML fixes: ${review.html_fixes?.length || 0}`);
  console.log(`  Needs reprocessing: ${review.needs_reprocessing}`);

  for (const issue of (review.issues || [])) {
    const icon = { critical: 'X', warning: '!', info: 'i' }[issue.severity] || '?';
    console.log(`    [${icon}] ${issue.category}: ${issue.description}`);
  }

  // Apply HTML-level fixes directly
  let reviewedHtml = finalHtml;
  const fixesApplied = [];

  for (const fix of (review.html_fixes || [])) {
    if (!fix.search || !fix.replace || fix.search === fix.replace) continue;
    if (reviewedHtml.includes(fix.search)) {
      reviewedHtml = reviewedHtml.replace(fix.search, fix.replace);
      fixesApplied.push(fix.description);
      console.log(`  Applied HTML fix: ${fix.description}`);
    } else {
      console.log(`  Skipped (not found): ${fix.description}`);
    }
  }

  // Log structural corrections (these will be consumed by animation node on retry)
  const structuralCorrections = review.structural_corrections || [];
  if (structuralCorrections.length > 0) {
    console.log('\n  Structural corrections for animation node:');
    for (const corr of structuralCorrections) {
      console.log(`    Scene ${corr.scene_number} [${corr.category}]: ${corr.description}`);
      console.log(`      → ${corr.correction}`);
    }
  }

  // Determine if we should loop back
  const shouldReprocess = review.needs_reprocessing && structuralCorrections.length > 0 && iteration < MAX_ITERATIONS;

  // Save HTML (even if we're going to retry — saves intermediate state)
  saveHtml(outputPath, reviewedHtml);

  console.log(`\n  Summary: ${review.summary}`);
  if (shouldReprocess) {
    console.log(`  → Routing back to animation node for corrections`);
  } else {
    console.log(`  → Pipeline complete`);
  }

  const reviewNotes = [
    `Quality: ${review.overall_quality} (iteration ${iteration + 1})`,
    `Issues: ${review.issues?.length || 0}`,
    ...(review.issues || []).map(i => `[${i.severity}] ${i.category}: ${i.description}`),
    `HTML fixes applied: ${fixesApplied.length}`,
    ...fixesApplied,
    `Structural corrections: ${structuralCorrections.length}`,
    review.summary,
  ];

  return {
    reviewedHtml,
    reviewNotes,
    reviewCorrections: shouldReprocess ? structuralCorrections : [],
    reviewIteration: iteration + 1,
    currentStep: shouldReprocess ? 'quality_review_needs_retry' : 'quality_review_complete',
  };
}

function saveHtml(outputPath, html) {
  if (!outputPath) return;
  try {
    fs.mkdirSync(outputPath.replace(/\/[^/]+$/, ''), { recursive: true });
    fs.writeFileSync(outputPath, html);
    console.log(`  Saved: ${outputPath}`);
  } catch (e) {
    console.error(`  Failed to save: ${e.message}`);
  }
}
