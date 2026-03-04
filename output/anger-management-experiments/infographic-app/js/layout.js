// ── Layout positions on 1280x720 canvas ──
// Based on the infographic layout:
//   Top row:    Step1 (left), Step2 (center)
//   Center:     Step3 (center-left)
//   Right col:  Step4 (top-right), Step5 (bottom-right)
//   Arrows:     1→2, 2→3, 3→4, 4→5

export const LAYOUT = {
  // Title banner
  banner: {
    x: 0, y: 0, w: 1280, h: 58,
    textX: 640, textY: 40,
  },

  // Step boxes (each step's bounding area)
  steps: [
    // Step 1 — top-left
    { x: 30,  y: 72,  w: 370, h: 280,
      badgeX: 45,  badgeY: 88,  badgeR: 18,
      titleX: 80,  titleY: 97,
      illustX: 80, illustY: 130, illustW: 280, illustH: 200 },

    // Step 2 — top-center
    { x: 440, y: 72,  w: 370, h: 280,
      badgeX: 455, badgeY: 88,  badgeR: 18,
      titleX: 490, titleY: 97,
      illustX: 480, illustY: 130, illustW: 290, illustH: 200 },

    // Step 3 — center (below step 1 & 2)
    { x: 240, y: 380, w: 370, h: 280,
      badgeX: 255, badgeY: 396, badgeR: 18,
      titleX: 290, titleY: 405,
      illustX: 290, illustY: 438, illustW: 280, illustH: 200 },

    // Step 4 — top-right
    { x: 860, y: 72,  w: 380, h: 280,
      badgeX: 875, badgeY: 88,  badgeR: 18,
      titleX: 910, titleY: 97,
      illustX: 900, illustY: 130, illustW: 300, illustH: 200 },

    // Step 5 — bottom-right
    { x: 660, y: 380, w: 380, h: 280,
      badgeX: 675, badgeY: 396, badgeR: 18,
      titleX: 710, titleY: 405,
      illustX: 700, illustY: 438, illustW: 300, illustH: 200 },
  ],

  // Curved arrow paths (SVG path d strings)
  arrows: [
    // Arrow 1→2: from right of step1 to left of step2
    'M 400,200 C 420,180 430,180 440,200',
    // Arrow 2→3: from bottom of step2 down to top of step3
    'M 580,352 C 560,370 480,370 450,380',
    // Arrow 3→4: from right of step3 up to left of step4
    'M 610,480 C 700,440 800,300 860,200',
    // Arrow 4→5: from bottom of step4 down to top of step5
    'M 1020,352 C 1000,370 900,380 850,400',
  ],
};
