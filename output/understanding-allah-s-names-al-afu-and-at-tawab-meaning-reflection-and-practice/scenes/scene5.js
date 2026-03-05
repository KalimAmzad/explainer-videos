// Scene 5: Quranic Reflections (106s → 134s)
tl.call(() => { hideScene('#scene4'); showScene('#scene5'); }, null, 106.0);

// Rough.js decorative frame around content
if (rc) {
  const frame5 = rc.rectangle(44, 15, 1192, 660, {
    roughness: 1.4, bowing: 1.5, stroke: '#1a8a8a', strokeWidth: 2, fill: 'none'
  });
  addRoughShape(frame5, 'rough_s5_frame', 'scene5');
}
tl.add(fadeIn('#rough_s5_frame', 1.0), 106.0);

// Title wipe in (centered at x=640, estimatedWidth=522)
// charCount=19, fontSize=48 => 19*48*0.55+20 = 521.6 ≈ 522
tl.add(wipe('cr_s5_title', 522, 1.4), 106.5);

// Wavy underline draws on
tl.add(drawOn('s5_underline', 0.5), 108.0);

// === LEFT TEXT GROUP ===
// Line 1: "Quran 4:99 — Afuwwan Qadira" ~44 chars, fontSize=32 => 44*32*0.55+20=795 but cap at ~560
tl.add(wipe('cr_s5_line1', 560, 0.9), 108.7);

// Line 2: "Pardoning & fully Capable of punishing" ~38 chars => 38*32*0.55+20=689 cap at ~540
tl.add(wipe('cr_s5_line2', 540, 0.9), 109.5);

// Arrow from left text down to left Quran page
tl.add(drawOn('s5_arrow_left', 0.7), 110.5);

// === MAIN QURAN ILLUSTRATION draws in ===
tl.add(drawOnGroup('s5_illust_main', 2.5), 111.3);

// === RIGHT TEXT GROUP ===
// Line 3: "Quran 2:37 — At-Tawab Ar-Rahim" ~43 chars => ~575
tl.add(wipe('cr_s5_line3', 520, 0.9), 113.0);

// Line 4: "Accepting repentance with tender mercy" ~38 chars => ~540
tl.add(wipe('cr_s5_line4', 540, 0.9), 113.8);

// Arrow from right text down to right Quran page
tl.add(drawOn('s5_arrow_right', 0.7), 114.8);

// Page reference labels wipe in on Quran pages
// "4:99" centered at x=500 => charCount=4, fontSize=24 => 4*24*0.55+20=72.8; clipRect.x=500-72/2=464
// (already set in svgDefs x=330 width covers centered: adjusting: x=500-36=464, use 72 width)
tl.add(wipe('cr_s5_ref_left', 72, 0.5), 115.7);

// "2:37" centered at x=780 => same calc => x=780-36=744, width=72
tl.add(wipe('cr_s5_ref_right', 72, 0.5), 116.3);

// Heart icon fades in at bottom center
tl.add(fadeIn('#s5_illust_supporting', 1.2), 117.0);

// Brief pause for scene to breathe before ending at 134s