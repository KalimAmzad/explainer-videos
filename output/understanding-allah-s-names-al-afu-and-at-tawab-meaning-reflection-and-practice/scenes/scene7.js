// Scene 7: Practice These Names Daily (156s - 180s)

// Transition: hide scene6, show scene7
tl.call(() => { hideScene('#scene6'); showScene('#scene7'); }, null, 156.0);

// Title wipes in (centered at x=640, charCount=26, fontSize=48)
// estimatedWidth = 26 * 48 * 0.55 + 20 = 706
// clipRect.x = 640 - 706/2 = 287
tl.add(wipe('cr_s7_title', 706, 1.4), 156.3);

// Double underline draws on
tl.add(drawOn('s7_underline1', 0.5), 157.8);
tl.add(drawOn('s7_underline2', 0.4), 158.1);

// Item 1: icon fades in, then text wipes
// text: "1. Make dua: Allahumma innaka Afuww..." ~46 chars, fontSize=36
// targetWidth = 46 * 36 * 0.55 + 20 = 931 -> cap at 900 for safety
tl.add(fadeIn('#s7_illust_icon1', 0.5), 158.7);
tl.add(wipe('cr_s7_item1', 900, 1.0), 159.0);

// Item 2: icon fades in, then text wipes
// text: "2. Forgive others — embody Al-Afu" ~34 chars, fontSize=36
// targetWidth = 34 * 36 * 0.55 + 20 = 694
tl.add(fadeIn('#s7_illust_icon2', 0.5), 160.2);
tl.add(wipe('cr_s7_item2', 720, 1.0), 160.5);

// Item 3: icon fades in, then text wipes
// text: "3. Repent daily — never delay tawbah" ~37 chars, fontSize=36
// targetWidth = 37 * 36 * 0.55 + 20 = 752
tl.add(fadeIn('#s7_illust_icon3', 0.5), 161.7);
tl.add(wipe('cr_s7_item3', 780, 1.0), 162.0);

// Item 4: icon fades in, then text wipes
// text: "4. Trust Allah — He always accepts you" ~38 chars, fontSize=36
// targetWidth = 38 * 36 * 0.55 + 20 = 772
tl.add(fadeIn('#s7_illust_icon4', 0.5), 163.2);
tl.add(wipe('cr_s7_item4', 800, 1.0), 163.5);

// Bottom banner: polygon fades in, then text wipes inside
// "Start Tonight" centered at x=640, charCount=13, fontSize=38
// estimatedWidth = 13 * 38 * 0.55 + 20 = 292
// clipRect.x = 640 - 292/2 = 494 (set in defs as 490, close enough)
tl.add(fadeIn('#s7_illust_banner', 0.8), 165.0);
tl.add(wipe('cr_s7_banner_text', 292, 0.9), 165.5);

// Sparkle effects: appear then fade out around the banner
tl.fromTo('#s7_sparkle1', { opacity: 0, scale: 0, transformOrigin: '533px 658px' }, { opacity: 1, scale: 1.2, duration: 0.35, ease: 'back.out(2)' }, 166.6);
tl.fromTo('#s7_sparkle1', { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 167.1);

tl.fromTo('#s7_sparkle2', { opacity: 0, scale: 0, transformOrigin: '643px 608px' }, { opacity: 1, scale: 1.2, duration: 0.35, ease: 'back.out(2)' }, 166.9);
tl.fromTo('#s7_sparkle2', { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 167.4);

tl.fromTo('#s7_sparkle3', { opacity: 0, scale: 0, transformOrigin: '753px 658px' }, { opacity: 1, scale: 1.2, duration: 0.35, ease: 'back.out(2)' }, 167.2);
tl.fromTo('#s7_sparkle3', { opacity: 1 }, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 167.7);

// Scene ends at 180s — natural breathing room after 168s