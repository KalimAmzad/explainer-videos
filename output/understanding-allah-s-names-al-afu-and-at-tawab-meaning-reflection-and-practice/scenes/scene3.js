// Scene 3: At-Tawab: Ever-Returning (50s → 78s)

// 50.0s — transition from scene2 to scene3
tl.call(() => { hideScene('#scene2'); showScene('#scene3'); }, null, 50.0);

// 50.2s — Rough.js decorative frame around body text area
tl.call(() => {
  if (rc) {
    const frame = rc.rectangle(645, 190, 595, 225, {
      roughness: 1.8,
      bowing: 1.5,
      stroke: '#8844aa',
      strokeWidth: 2,
      fill: 'none'
    });
    addRoughShape(frame, 'rough_s3_bodyframe', 'scene3');
  }
}, null, 50.2);
tl.add(fadeIn('#rough_s3_bodyframe', 0.8), 50.2);

// 50.5s — Title wipes in
// charCount=24, fontSize=48, estimatedWidth=24*48*0.55+20=654, clipRect.x=640-654/2=313
tl.add(wipe('cr_s3_title', 654, 1.4), 50.5);

// 52.0s — Wavy underline draws on
tl.add(drawOn('s3_underline', 0.5), 52.0);

// 52.0s — Divider line draws on gently
tl.add(drawOn('s3_divider', 0.8), 52.0);

// 52.6s — Body line 1: Root: Tawb = to return, turn back
// charCount~30, fontSize=34, width=30*34*0.55+20=582
tl.add(wipe('cr_s3_body1', 582, 0.9), 52.6);

// 53.5s — Body line 2: Allah turns toward the one who repents
// charCount~39, fontSize=34, width=39*34*0.55+20=749
tl.add(wipe('cr_s3_body2', 749, 1.0), 53.5);

// 54.6s — Body line 3: Not once — again and again and again
// charCount~37, fontSize=34, width=37*34*0.55+20=712
tl.add(wipe('cr_s3_body3', 712, 1.0), 54.6);

// 55.7s — Body line 4: Mentioned 11 times in the Quran
// charCount~33, fontSize=34, width=33*34*0.55+20=637
tl.add(wipe('cr_s3_body4', 637, 0.9), 55.7);

// 56.7s — Draw the loop diagram (stick figure + arrows + mercy circle)
tl.add(drawOnGroup('s3_illust_diagram', 3.0), 56.7);

// 57.2s — Label: Allah's Mercy (top label)
// charCount~13, fontSize=26, width=13*26*0.55+20=206
tl.add(wipe('cr_s3_lbl_mercy', 206, 0.6), 57.2);

// 58.0s — Label: Tawbah (left side)
// charCount~7, fontSize=26, width=7*26*0.55+20=120
tl.add(wipe('cr_s3_lbl_tawbah', 120, 0.5), 58.0);

// 58.8s — Label: Acceptance (right side)
// charCount~10, fontSize=26, width=10*26*0.55+20=163
tl.add(wipe('cr_s3_lbl_accept', 163, 0.6), 58.8);

// 59.5s — Label: Servant (bottom label)
// charCount~7, fontSize=26, width=7*26*0.55+20=120
tl.add(wipe('cr_s3_lbl_servant', 120, 0.5), 59.5);

// 60.2s — Arrow from right body zone pointing toward loop
tl.add(drawOn('s3_arrow_loop', 0.5), 60.2);

// 60.8s — Infinite loop label at bottom of diagram
// charCount~16, fontSize=28, width=16*28*0.55+20=266
tl.add(wipe('cr_s3_infinite', 266, 0.7), 60.8);

// 61.8s — Rough.js highlight box around body3 (again and again)
tl.call(() => {
  if (rc) {
    const emphasis = rc.rectangle(652, 302, 530, 52, {
      roughness: 2.2,
      bowing: 3,
      stroke: '#cc7722',
      strokeWidth: 2.5,
      fill: 'rgba(204,119,34,0.06)'
    });
    addRoughShape(emphasis, 'rough_s3_emphasis', 'scene3');
  }
}, null, 61.8);
tl.add(fadeIn('#rough_s3_emphasis', 0.6), 61.8);

// Scene ends at 78s — leaving ~15s of hold after last animation at ~62.5s