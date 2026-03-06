/**
 * Node 5: Timing Resolver — DETERMINISTIC (no LLM calls).
 *
 * Resolves relative sync blocks from scene designs into absolute frame
 * timestamps. Pure math and string operations only.
 *
 * Input:  state.sceneDesigns (array of scene designs with sync_blocks)
 * Output: { resolvedTimeline } — array of resolved scenes with absolute frame numbers
 */
import { CANVAS } from '../config.mjs';

const FPS = CANVAS.fps; // 30

// ── Duration estimation ────────────────────────────────────────────

/**
 * Estimate narration duration from text using 150 words-per-minute rate.
 * @param {string} text - Narration text
 * @returns {number} Duration in seconds
 */
function estimateNarrationDuration(text) {
  if (!text || text.trim() === '') return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount / 2.5; // 150 wpm = 2.5 words/sec
}

/**
 * Estimate total narration duration from an array of beat strings.
 * @param {string[]} beats - Array of narration beat strings
 * @returns {number} Total duration in seconds
 */
function estimateBeatsNarrationDuration(beats) {
  if (!beats || beats.length === 0) return 0;
  return beats.reduce((sum, beat) => sum + estimateNarrationDuration(beat), 0);
}

/**
 * Convert seconds to frame count, rounded to nearest frame.
 * @param {number} seconds
 * @returns {number} Frame count
 */
function secondsToFrames(seconds) {
  return Math.round(seconds * FPS);
}

// ── Sync mode resolvers ────────────────────────────────────────────

/**
 * Resolve a "parallel" sync block.
 * Animation and narration run simultaneously; block duration is the longer of the two.
 */
function resolveParallel(blockCursor, drawDuration, narrationDuration) {
  return {
    visualStart: blockCursor,
    narrationStart: blockCursor,
    blockDuration: Math.max(drawDuration, narrationDuration),
  };
}

/**
 * Resolve a "visual_first" sync block.
 * Animation plays fully, then 0.3s pause, then narration begins.
 */
function resolveVisualFirst(blockCursor, drawDuration, narrationDuration) {
  return {
    visualStart: blockCursor,
    narrationStart: blockCursor + drawDuration + 0.3,
    blockDuration: drawDuration + 0.3 + narrationDuration,
  };
}

/**
 * Resolve a "narration_first" sync block.
 * Narration starts immediately, visual appears 0.5s later.
 */
function resolveNarrationFirst(blockCursor, drawDuration, narrationDuration) {
  return {
    visualStart: blockCursor + 0.5,
    narrationStart: blockCursor,
    blockDuration: Math.max(narrationDuration, 0.5 + drawDuration),
  };
}

/**
 * Resolve a "progressive_sync" block.
 * Asset builds piece by piece, each sub-element synced to a narration beat.
 * Returns sub_animations array and total blockDuration.
 */
function resolveProgressiveSync(blockCursor, _globalFrameOffset, visual, narration) {
  const subElements = visual.sub_elements || [];
  const beats = narration.beats || [];
  const subAnimations = [];
  let beatCursor = blockCursor;

  const pairCount = Math.max(subElements.length, beats.length);
  for (let i = 0; i < pairCount; i++) {
    const sub = subElements[i] || {};
    const beat = beats[i] || '';
    const subDraw = sub.draw_duration || 1.0;
    const beatNarration = estimateNarrationDuration(beat);
    const beatDuration = Math.max(subDraw, beatNarration);

    subAnimations.push({
      sub_id: sub.sub_id || `part_${i}`,
      start_frame: secondsToFrames(beatCursor),
      duration_frames: secondsToFrames(subDraw),
    });

    // 0.2s gap between beats
    beatCursor += beatDuration + 0.2;
  }

  return {
    subAnimations,
    blockDuration: beatCursor - blockCursor,
  };
}

/**
 * Resolve a "stagger_reveal" block.
 * List items revealed one by one, evenly spaced across narration duration.
 */
function resolveStaggerReveal(blockCursor, _globalFrameOffset, visual, narrationDuration) {
  const items = visual.sub_elements || [];
  const itemCount = items.length || 1;
  const beatInterval = narrationDuration / itemCount;
  const subAnimations = [];

  for (let i = 0; i < itemCount; i++) {
    const sub = items[i] || {};
    subAnimations.push({
      sub_id: sub.sub_id || `item_${i}`,
      start_frame: secondsToFrames(blockCursor + i * beatInterval),
      duration_frames: secondsToFrames(sub.draw_duration || beatInterval * 0.8),
    });
  }

  return {
    subAnimations,
    blockDuration: narrationDuration,
  };
}

// ── Main node ──────────────────────────────────────────────────────

/**
 * Timing Resolver node. Resolves all sync blocks across all scenes
 * into absolute frame timestamps for the scene compositor.
 *
 * @param {object} state - LangGraph state with sceneDesigns
 * @returns {{ resolvedTimeline: Array }} Resolved timeline with absolute frames
 */
export async function timingResolverNode(state) {
  console.log('\n  ── Timing Resolver (deterministic) ──');

  const sceneDesigns = state.sceneDesigns || [];
  if (sceneDesigns.length === 0) {
    console.log('    WARNING: No scene designs found — returning empty timeline');
    return { resolvedTimeline: [] };
  }

  const resolvedTimeline = [];
  let globalFrameOffset = 0;

  for (const scene of sceneDesigns) {
    const sceneBlocks = [];
    let blockCursor = 0; // seconds relative to scene start

    for (const block of scene.sync_blocks || []) {
      const syncMode = block.sync_mode || 'parallel';
      const visual = block.visual || {};
      const narration = block.narration || {};

      const drawDuration = visual.draw_duration || 1.0;

      // Determine narration duration from beats or text
      let narrationDuration;
      if (narration.beats && narration.beats.length > 0) {
        narrationDuration = estimateBeatsNarrationDuration(narration.beats);
      } else if (narration.estimated_duration != null && narration.estimated_duration > 0) {
        narrationDuration = narration.estimated_duration;
      } else {
        narrationDuration = estimateNarrationDuration(narration.text || '');
      }

      // ── Progressive sync ──
      if (syncMode === 'progressive_sync') {
        const result = resolveProgressiveSync(blockCursor, globalFrameOffset, visual, narration);

        sceneBlocks.push({
          block_id: block.block_id,
          slot: block.slot,
          animation: visual.animation || 'draw_on',
          asset_id: visual.asset_id,
          asset_type: visual.asset_type || 'svg',
          content: visual.content,
          visual_start_frame: secondsToFrames(blockCursor),
          visual_duration_frames: secondsToFrames(drawDuration),
          sub_animations: result.subAnimations,
        });

        blockCursor += result.blockDuration + 0.3;
        continue;
      }

      // ── Stagger reveal ──
      if (syncMode === 'stagger_reveal') {
        const result = resolveStaggerReveal(blockCursor, globalFrameOffset, visual, narrationDuration);

        sceneBlocks.push({
          block_id: block.block_id,
          slot: block.slot,
          animation: visual.animation || 'fade_scale',
          asset_id: visual.asset_id,
          asset_type: visual.asset_type,
          content: visual.content,
          visual_start_frame: secondsToFrames(blockCursor),
          visual_duration_frames: secondsToFrames(result.blockDuration),
          sub_animations: result.subAnimations,
        });

        blockCursor += result.blockDuration + 0.3;
        continue;
      }

      // ── Standard modes (parallel, visual_first, narration_first) ──
      let resolved;
      switch (syncMode) {
        case 'visual_first':
          resolved = resolveVisualFirst(blockCursor, drawDuration, narrationDuration);
          break;
        case 'narration_first':
          resolved = resolveNarrationFirst(blockCursor, drawDuration, narrationDuration);
          break;
        case 'parallel':
        default:
          resolved = resolveParallel(blockCursor, drawDuration, narrationDuration);
          break;
      }

      sceneBlocks.push({
        block_id: block.block_id,
        slot: block.slot,
        animation: visual.animation || 'wipe',
        asset_id: visual.asset_id,
        asset_type: visual.asset_type || 'text',
        content: visual.content,
        visual_start_frame: secondsToFrames(resolved.visualStart),
        visual_duration_frames: secondsToFrames(drawDuration),
      });

      blockCursor += resolved.blockDuration + 0.3; // 0.3s gap between blocks
    }

    const sceneTotalFrames = secondsToFrames(blockCursor);

    resolvedTimeline.push({
      scene_number: scene.scene_number,
      layout_template: scene.layout_template,
      total_frames: sceneTotalFrames,
      scene_start_frame: globalFrameOffset,
      blocks: sceneBlocks,
    });

    globalFrameOffset += sceneTotalFrames;
  }

  const totalSeconds = (globalFrameOffset / FPS).toFixed(1);
  console.log(`    Resolved ${resolvedTimeline.length} scenes, ${globalFrameOffset} total frames (${totalSeconds}s)`);

  return { resolvedTimeline };
}
