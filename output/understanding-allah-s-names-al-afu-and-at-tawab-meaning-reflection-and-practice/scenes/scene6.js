// Scene 6: Why We Need Both Names (134s → 156s)

// Transition: hide scene5, show scene6
tl.call(() => { hideScene('#scene5'); showScene('#scene6'); }, null, 134.0);

// Rough.js decorative frame around body text area
tl.call(() => {
  if (rc) {
    const frame = rc.rectangle(80, 500, 1120, 170, {
      roughness: 1.8,
      bowing: 1.5,
      stroke: '#993344',
      strokeWidth: 1.8,
      fill: 'none'
    });
    addRoughShape(frame, 'rough_s6_frame', 'scene6');
  }
}, null, 134.1);
tl.add(fadeIn('#rough_s6_frame', 0.8), 134.2);

// Title wipe in
tl.add(wipe('cr_s6_title', 602, 1.4), 134.5);

// Wavy underline draws on
tl.add(drawOn('s6_underline', 0.5), 136.1);

// Divider line draws
tl.add(drawOn('s6_divider', 0.6), 136.7);

// Draw the main winding path left-to-right
tl.add(drawOn('s6_path_main', 2.5), 137.0);

// Milestone 1: stumbling figure fades in, then label wipes
tl.add(fadeIn('#s6_illust_fig1', 0.5), 137.6);
tl.add(wipe('cr_s6_lbl1', 80, 0.5), 138.2);
tl.add(drawOn('s6_arr1', 0.3), 138.4);

// Milestone 2: kneeling figure
tl.add(fadeIn('#s6_illust_fig2', 0.5), 138.7);
tl.add(wipe('cr_s6_lbl2', 110, 0.5), 139.2);
tl.add(drawOn('s6_arr2', 0.3), 139.4);

// Milestone 3: dua figure
tl.add(fadeIn('#s6_illust_fig3', 0.5), 139.7);
tl.add(wipe('cr_s6_lbl3', 120, 0.5), 140.2);
tl.add(drawOn('s6_arr3', 0.3), 140.4);

// Milestone 4: standing tall figure with radiance
tl.add(fadeIn('#s6_illust_fig4', 0.6), 140.7);
tl.add(wipe('cr_s6_lbl4', 120, 0.5), 141.4);
tl.add(drawOn('s6_arr4', 0.3), 141.6);

// Body text lines wipe in sequentially
// Line 1: Prophet hadith
tl.add(wipe('cr_s6_body1', 780, 0.9), 142.2);

// Line 2: best sinners
tl.add(wipe('cr_s6_body2', 740, 0.9), 143.2);

// Line 3: sin is the beginning
tl.add(wipe('cr_s6_body3', 760, 0.9), 144.2);

// Line 4: deeper bond
tl.add(wipe('cr_s6_body4', 640, 0.9), 145.2);

// Scene breathes until 156s — last element lands ~146s, ~10s of hold