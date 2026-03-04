/**
 * Node 6: Quality Review Agent
 * Uses Gemini Pro to review the generated HTML, identify issues,
 * and apply fixes to layout, positioning, animation, and sequencing.
 */
import fs from 'fs';
import { callGeminiJSON } from '../lib/gemini-client.mjs';
import { MODELS } from '../config.mjs';
import { buildQualityReviewPrompt, QUALITY_REVIEW_SCHEMA } from '../prompts/quality-review.mjs';

const MODEL = MODELS.qualityReview;

export async function qualityReviewNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 6: Quality Review');
  console.log('══════════════════════════════════════');

  const { finalHtml, outputPath, blueprint } = state;
  const htmlSize = (finalHtml.length / 1024).toFixed(1);
  console.log(`  HTML size: ${htmlSize} KB`);
  console.log(`  Model: ${MODEL}`);

  // For very large files, truncate but keep both head and tail
  // so the reviewer can see script loading AND animation code
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
  });

  console.log(`  Sending to ${MODEL} for review...`);

  let review;
  try {
    review = await callGeminiJSON(MODEL, prompt, QUALITY_REVIEW_SCHEMA);
  } catch (e) {
    console.error(`  Review failed: ${e.message}`);
    // Save the HTML as-is if review fails
    if (outputPath) {
      fs.mkdirSync(outputPath.replace(/\/[^/]+$/, ''), { recursive: true });
      fs.writeFileSync(outputPath, finalHtml);
      console.log(`  Saved (unreviewed): ${outputPath}`);
    }
    return {
      reviewedHtml: finalHtml,
      reviewNotes: [`Review failed: ${e.message}`],
      currentStep: 'quality_review_failed',
    };
  }

  // Log review results
  console.log(`\n  Overall quality: ${review.overall_quality}`);
  console.log(`  Issues found: ${review.issues?.length || 0}`);

  for (const issue of (review.issues || [])) {
    const icon = { critical: 'X', warning: '!', info: 'i' }[issue.severity] || '?';
    console.log(`    [${icon}] ${issue.category}: ${issue.description}`);
  }

  // Apply fixes
  let reviewedHtml = finalHtml;
  const fixesApplied = [];
  const fixesFailed = [];

  for (const fix of (review.fixes_applied || [])) {
    if (!fix.search || !fix.replace) continue;
    if (fix.search === fix.replace) continue;

    if (reviewedHtml.includes(fix.search)) {
      reviewedHtml = reviewedHtml.replace(fix.search, fix.replace);
      fixesApplied.push(`[${fix.category || 'fix'}] ${fix.description}`);
      console.log(`  Applied: ${fix.description}`);
    } else {
      fixesFailed.push(fix.description);
      console.log(`  Skipped (not found): ${fix.description}`);
    }
  }

  console.log(`\n  Fixes applied: ${fixesApplied.length}, skipped: ${fixesFailed.length}`);

  // Save the final HTML
  if (outputPath) {
    fs.mkdirSync(outputPath.replace(/\/[^/]+$/, ''), { recursive: true });
    fs.writeFileSync(outputPath, reviewedHtml);
    console.log(`  Saved: ${outputPath}`);
  }

  console.log(`  Summary: ${review.summary}`);

  const reviewNotes = [
    `Quality: ${review.overall_quality}`,
    `Issues: ${review.issues?.length || 0}`,
    ...(review.issues || []).map(i => `[${i.severity}] ${i.category}: ${i.description}`),
    `Fixes applied: ${fixesApplied.length}`,
    ...fixesApplied,
    review.summary,
  ];

  return {
    reviewedHtml,
    reviewNotes,
    currentStep: 'quality_review_complete',
  };
}
