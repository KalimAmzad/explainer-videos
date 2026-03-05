// Scene 4: Afu vs. Tawab — 78s to 106s

// Transition: hide scene3, show scene4
tl.call(() => { hideScene('#scene3'); showScene('#scene4'); }, null, 78.0);

// Rough.js decorative frame for left column
if (rc) {
  const leftFrame = rc.rectangle(60, 88, 555, 470, {
    roughness: 1.8, bowing: 1.5, stroke: '#1e8c5a', strokeWidth: 1.8, fill: 'none'
  });
  addRoughShape(leftFrame, 'rough_s4_left', 'scene4');

  const rightFrame = rc.rectangle(665, 88, 555, 470, {
    roughness: 1.8, bowing: 1.5, stroke: '#8844aa', strokeWidth: 1.8, fill: 'none'
  });
  addRoughShape(rightFrame, 'rough_s4_right', 'scene4');
}

// 78.3s — Rough frames fade in
tl.add(fadeIn('#rough_s4_left', 0.8), 78.3);
tl.add(fadeIn('#rough_s4_right', 0.8), 78.5);

// 78.8s — Title wipes in
// charCount=29, fontSize=48 → width=29×48×0.55+20=786
tl.add(wipe('cr_s4_title', 786, 1.4), 78.8);

// 80.3s — Wavy underline draws on
tl.add(drawOn('s4_underline', 0.6), 80.3);

// 80.9s — Vertical divider draws top to bottom
tl.add(drawOn('s4_divider', 0.8), 80.9);

// 81.7s — Left header 'Al-Afu' wipes in
// charCount=6, fontSize=44 → width=6×44×0.55+20=165; centered at x=200 → x=200-165/2=118
tl.add(wipe('cr_s4_afu_head', 165, 0.7), 81.7);

// 82.5s — Ledger illustration fades in then draws on
tl.add(fadeIn('#s4_illust_main', 0.3), 82.5);
tl.add(drawOnGroup('s4_illust_main', 2.2), 82.6);

// 84.8s — Right header 'At-Tawab' wipes in
// charCount=8, fontSize=44 → width=8×44×0.55+20=214; centered at x=900 → x=900-214/2=793
tl.add(wipe('cr_s4_tawab_head', 214, 0.8), 84.8);

// 85.7s — Bridge illustration fades in then draws on
tl.add(fadeIn('#s4_illust_bridge', 0.3), 85.7);
tl.add(drawOnGroup('s4_illust_bridge', 2.2), 85.8);

// 88.0s — Left body labels wipe in
// lbl1: 'Erases the sin record' ~36 chars × 32 × 0.55 + 20 = 653
tl.add(wipe('cr_s4_lbl1', 420, 0.8), 88.0);
// lbl2: 'Removes the stain' ~24 chars × 32 × 0.55 + 20 = 442
tl.add(wipe('cr_s4_lbl2', 380, 0.8), 88.7);

// 89.5s — Right body labels wipe in
// lbl3: 'Restores the bond' ~24 chars × 32 × 0.55 + 20 = 442
tl.add(wipe('cr_s4_lbl3', 400, 0.8), 89.5);
// lbl4: 'Rebuilds the bridge' ~26 chars × 32 × 0.55 + 20 = 478
tl.add(wipe('cr_s4_lbl4', 420, 0.8), 90.2);

// 91.2s — Bottom bracket supporting element fades in and draws
tl.add(fadeIn('#s4_illust_supporting', 0.4), 91.2);
tl.add(drawOnGroup('s4_illust_supporting', 1.4), 91.4);

// 92.8s — 'Complete Renewal' wipes in
// charCount=16, fontSize=36 → width=16×36×0.55+20=337; centered at 640 → x=640-337/2=472
tl.add(wipe('cr_s4_renewal', 337, 1.0), 92.8);

// Scene holds until 106s (breathing room after 93.8s)
