// Scene 1: Names That Heal (0s → 22s)
tl.call(() => { showScene('#scene1'); }, null, 0.0);

// 0.1s — Crescent icon fades in top-right
tl.add(fadeIn('#s1_illust_supporting', 0.8), 0.1);

// 0.5s — Title wipes in left-to-right
// charCount=15, fontSize=48 => estimatedWidth=15*48*0.55+20=416, clipRect.x=640-208=432
tl.add(wipe('cr_s1_title', 416, 1.3), 0.5);

// 2.0s — Wavy underline draws on
tl.add(drawOn('s1_underline', 0.6), 2.0);

// 2.8s — Body line 1: 'Allah has 99 Beautiful Names'
// charCount~30, fontSize=34 => width=30*34*0.55+20=582, x=640-291=349 (use 263 for safety)
tl.add(wipe('cr_s1_body1', 530, 0.8), 2.8);

// 3.3s — Body line 2: 'Each name is a door to knowing Him'
// charCount~34, fontSize=34 => width=34*34*0.55+20=636 => clipRect.x=640-318=322 (use 282)
tl.add(wipe('cr_s1_body2', 564, 0.8), 3.3);

// 3.8s — Body line 3: 'Two names speak to every sinner:'
// charCount~32, fontSize=34 => width=32*34*0.55+20=600 => clipRect.x=640-300=340
tl.add(wipe('cr_s1_body3', 640, 0.8), 3.8);

// 4.4s — Body line 4: 'Al-Afu & At-Tawab'
// charCount~18, fontSize=34 => width=18*34*0.55+20=357 => clipRect.x=640-178=462 (use 268)
tl.add(wipe('cr_s1_body4', 536, 0.9), 4.4);

// 5.6s — Main illustration (two doors + radiance) draws on stroke-by-stroke
tl.add(drawOnGroup('s1_illust_main', 3.5), 5.6);

// 9.5s — Left door label 'Al-Afu' wipes in
// charCount~6, fontSize=28 => width=6*28*0.55+20=112 => clipRect.x=450-56=394
tl.add(wipe('cr_s1_lbl_left', 124, 0.6), 9.5);

// 10.1s — Right door label 'At-Tawab' wipes in
// charCount~8, fontSize=28 => width=8*28*0.55+20=143 => clipRect.x=795-71=724 (use 123)
tl.add(wipe('cr_s1_lbl_right', 152, 0.6), 10.1);

// Scene holds until 22s — no further action needed (natural breathing room ~11s)