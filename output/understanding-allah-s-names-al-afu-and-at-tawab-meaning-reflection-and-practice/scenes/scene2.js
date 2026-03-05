// ── Scene 2: Al-Afu: The Pardoner (22s → 50s) ──

// Scene transition
tl.call(() => { hideScene('#scene1'); showScene('#scene2'); }, null, 22.0);

// Rough.js decorative frame around illustration zone
tl.call(() => {
  if (rc) {
    const frame = rc.rectangle(718, 100, 510, 570, {
      roughness: 1.8,
      bowing: 1.5,
      stroke: '#1e8c5a',
      strokeWidth: 2,
      fill: 'none'
    });
    addRoughShape(frame, 'rough_s2_panel_frame', 'scene2');
  }
}, null, 22.2);
tl.add(fadeIn('#rough_s2_panel_frame', 0.8), 22.2);

// Title wipes in
// charCount ~20, fontSize=48 → targetWidth = 20*48*0.55+20 = 548
tl.add(wipe('cr_s2_title', 548, 1.3), 22.5);

// Underline draws on
tl.add(drawOn('s2_underline', 0.5), 23.9);

// Body line 1: Root — charCount ~36 → 36*34*0.55+20 = 693
tl.add(wipe('cr_s2_body1', 530, 0.8), 24.6);

// Body line 2: Not just forgiveness — charCount ~40 → targetWidth ~560
tl.add(wipe('cr_s2_body2', 560, 0.8), 25.5);

// TOP PANEL draws on: sand wavy lines then footprints
tl.add(fadeIn('#s2_illust_top', 0.3), 26.5);
tl.add(drawOnGroup('s2_illust_top', 2.0), 26.5);

// "Before" label fades in
tl.add(fadeIn('#s2_panel_top_label', 0.5), 27.0);

// Body line 3: Like wind — charCount ~36 → ~530
tl.add(wipe('cr_s2_body3', 530, 0.8), 28.6);

// Downward arrow draws on
tl.add(drawOn('s2_panel_arrow', 0.6), 29.5);

// Arrow label 'Al-Afu' wipes in — charCount ~6, fontSize=30 → 6*30*0.55+20 = 119
tl.add(wipe('cr_s2_arrow_label', 125, 0.5), 30.2);

// BOTTOM PANEL draws on: smooth sand + wind swooshes
tl.add(fadeIn('#s2_illust_bottom', 0.3), 30.8);
tl.add(drawOnGroup('s2_illust_bottom', 2.0), 30.8);

// "After" label fades in
tl.add(fadeIn('#s2_panel_bot_label', 0.5), 31.5);

// Body line 4: Aisha hadith — charCount ~55 → ~630
tl.add(wipe('cr_s2_body4', 650, 1.0), 33.0);

// Scroll icon fades in beside body line 4
tl.add(fadeIn('#s2_illust_supporting', 0.8), 33.5);