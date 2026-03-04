// ── Master GSAP Timeline ──

import { CONFIG } from './config.js';
import { drawOn, drawOnGroup, wipe, fadeIn, showScene } from './animation.js';

/**
 * Build the master timeline for the anger management infographic animation.
 * Progressive reveal: nothing disappears, each element stays once drawn.
 */
export function buildTimeline(shapes) {
  const TOTAL = CONFIG.TOTAL_DURATION;

  const tl = gsap.timeline({ paused: true });

  // ═══════════════════════════════════════════
  //  BANNER (0s → 4s)
  // ═══════════════════════════════════════════

  // 0s — Show banner scene
  tl.call(() => showScene('#g_banner'), null, 0);

  // 0.2s — Banner background fades in
  tl.add(fadeIn('#rough_banner', 0.8), 0.2);

  // 1s — Title text wipes in
  tl.add(wipe('cr_banner_title', 1000, 1.5), 1.0);

  // ═══════════════════════════════════════════
  //  STEP 1: RECOGNIZE TRIGGERS (5s → 14s)
  // ═══════════════════════════════════════════

  // 5s — Show step 1 scene, box fades in
  tl.call(() => showScene('#g_step1'), null, 5);
  tl.add(fadeIn('#rough_box_1', 0.5), 5);

  // 5.5s — Badge fades in
  tl.add(fadeIn('#rough_badge_1', 0.4), 5.5);
  // Badge number
  tl.add(fadeIn('#badge_num_1', 0.3), 5.7);

  // 6.5s — Title text wipes
  tl.add(wipe('cr_s1_title', 300, 1.0), 6.5);

  // 8s — Brain outline draws on
  tl.call(() => showScene('#illust_step1'), null, 7.8);
  tl.add(drawOnGroup('illust_step1_outlines', 0.4, 0.2), 8);

  // 10s — Brain fills fade in
  tl.add(fadeIn('#illust_step1 .fill-shape', 0.8), 10.5);

  // 11s — Trigger icons stagger
  tl.add(drawOnGroup('illust_step1_icons', 0.3, 0.15), 11);

  // 13.5s — Arrow 1→2
  tl.add(drawOn('arrow_1_2', 1.0), 13.5);

  // ═══════════════════════════════════════════
  //  STEP 2: PAUSE & BREATHE (15s → 24s)
  // ═══════════════════════════════════════════

  tl.call(() => showScene('#g_step2'), null, 15);
  tl.add(fadeIn('#rough_box_2', 0.5), 15);
  tl.add(fadeIn('#rough_badge_2', 0.4), 15.5);
  tl.add(fadeIn('#badge_num_2', 0.3), 15.7);

  // 16.5s — Title text
  tl.add(wipe('cr_s2_title', 300, 1.0), 16.5);

  // 17.5s — Meditator outline
  tl.call(() => showScene('#illust_step2'), null, 17.3);
  tl.add(drawOnGroup('illust_step2_outlines', 0.4, 0.15), 17.5);

  // 19.5s — Fills
  tl.add(fadeIn('#illust_step2 .fill-shape', 0.8), 19.5);

  // 20.5s — Thought bubbles
  tl.add(drawOnGroup('illust_step2_bubbles', 0.3, 0.15), 20.5);

  // 23.5s — Arrow 2→3
  tl.add(drawOn('arrow_2_3', 1.0), 23.5);

  // ═══════════════════════════════════════════
  //  STEP 3: REFRAME THE SITUATION (25s → 34s)
  // ═══════════════════════════════════════════

  tl.call(() => showScene('#g_step3'), null, 25);
  tl.add(fadeIn('#rough_box_3', 0.5), 25);
  tl.add(fadeIn('#rough_badge_3', 0.4), 25.5);
  tl.add(fadeIn('#badge_num_3', 0.3), 25.7);

  tl.add(wipe('cr_s3_title', 350, 1.0), 26.5);

  // 27.5s — Person outline
  tl.call(() => showScene('#illust_step3'), null, 27.3);
  tl.add(drawOnGroup('illust_step3_outlines', 0.4, 0.15), 27.5);

  // 29.5s — Fills
  tl.add(fadeIn('#illust_step3 .fill-shape', 0.8), 29.5);

  // 30.5s — Thought bubble pairs
  tl.add(drawOnGroup('illust_step3_bubbles', 0.3, 0.15), 30.5);

  // 33.5s — Arrow 3→4
  tl.add(drawOn('arrow_3_4', 1.0), 33.5);

  // ═══════════════════════════════════════════
  //  STEP 4: COMMUNICATE ASSERTIVELY (35s → 44s)
  // ═══════════════════════════════════════════

  tl.call(() => showScene('#g_step4'), null, 35);
  tl.add(fadeIn('#rough_box_4', 0.5), 35);
  tl.add(fadeIn('#rough_badge_4', 0.4), 35.5);
  tl.add(fadeIn('#badge_num_4', 0.3), 35.7);

  tl.add(wipe('cr_s4_title', 380, 1.0), 36.5);

  // 37.5s — Two people outlines
  tl.call(() => showScene('#illust_step4'), null, 37.3);
  tl.add(drawOnGroup('illust_step4_outlines', 0.4, 0.15), 37.5);

  // 39.5s — Fills
  tl.add(fadeIn('#illust_step4 .fill-shape', 0.8), 39.5);

  // 40.5s — Speech bubbles
  tl.add(drawOnGroup('illust_step4_bubbles', 0.3, 0.15), 40.5);

  // 43.5s — Arrow 4→5
  tl.add(drawOn('arrow_4_5', 1.0), 43.5);

  // ═══════════════════════════════════════════
  //  STEP 5: PRACTICE SELF-CARE (45s → 54s)
  // ═══════════════════════════════════════════

  tl.call(() => showScene('#g_step5'), null, 45);
  tl.add(fadeIn('#rough_box_5', 0.5), 45);
  tl.add(fadeIn('#rough_badge_5', 0.4), 45.5);
  tl.add(fadeIn('#badge_num_5', 0.3), 45.7);

  tl.add(wipe('cr_s5_title', 340, 1.0), 46.5);

  // 47.5s — Runner outline
  tl.call(() => showScene('#illust_step5'), null, 47.3);
  tl.add(drawOnGroup('illust_step5_outlines', 0.4, 0.15), 47.5);

  // 49s — Fills
  tl.add(fadeIn('#illust_step5 .fill-shape', 0.8), 49);

  // 49.5s — Icons (clock, moon, heart)
  tl.add(drawOnGroup('illust_step5_icons', 0.3, 0.15), 49.5);

  // ═══════════════════════════════════════════
  //  HOLD (53s → 55s)
  // ═══════════════════════════════════════════
  tl.to({}, { duration: 2 }, TOTAL - 2);

  return tl;
}
