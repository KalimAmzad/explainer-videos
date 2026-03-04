// ── Configuration ──
export const CONFIG = {
  TOTAL_DURATION: 55,
  CANVAS: { width: 1280, height: 720 },
  VIEWBOX: '0 0 1280 720',

  // Color palette
  COLORS: {
    teal:   '#1a6b6a',
    orange: '#d4762c',
    cream:  '#f5f0e8',
    dark:   '#2a2a2a',
    skin:   '#8d6344',
    skinLight: '#c49a6c',
    white:  '#ffffff',
    gray:   '#666666',
    pink:   '#e88c9a',
    yellow: '#e8b832',
    green:  '#3a9e6e',
    purple: '#7a5bad',
    blue:   '#2b7ec2',
  },

  // Step-specific colors (accent for each step)
  STEP_COLORS: [
    '#d4762c', // Step 1 — orange
    '#1a6b6a', // Step 2 — teal
    '#7a5bad', // Step 3 — purple
    '#2b7ec2', // Step 4 — blue
    '#3a9e6e', // Step 5 — green
  ],

  FONTS: {
    title:  "'Cabin Sketch', cursive",
    body:   "'Patrick Hand', cursive",
    accent: "'Permanent Marker', cursive",
    hand:   "'Caveat', cursive",
  },

  // Rough.js defaults
  ROUGH: {
    roughness: 1.8,
    strokeWidth: 2,
    bowing: 2,
    fillStyle: 'hachure',
    hachureAngle: -41,
    hachureGap: 8,
  },

  // Animation timing (seconds) per step
  TIMING: {
    banner:    { start: 0,  end: 4 },
    step1:     { start: 5,  end: 14 },
    arrow1:    { start: 13.5, dur: 1 },
    step2:     { start: 15, end: 24 },
    arrow2:    { start: 23.5, dur: 1 },
    step3:     { start: 25, end: 34 },
    arrow3:    { start: 33.5, dur: 1 },
    step4:     { start: 35, end: 44 },
    arrow4:    { start: 43.5, dur: 1 },
    step5:     { start: 45, end: 54 },
  },
};
