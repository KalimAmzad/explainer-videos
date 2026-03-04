// ── Animation Helpers (GSAP) ──

/**
 * Stroke draw-on animation.
 * Uses DrawSVGPlugin if available, falls back to strokeDasharray.
 */
export function drawOn(el, dur, ease) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return gsap.to({}, { duration: 0.01 });
  if (typeof DrawSVGPlugin !== 'undefined') {
    gsap.set(el, { drawSVG: '0%' });
    return gsap.to(el, { drawSVG: '100%', duration: dur, ease: ease || 'power1.inOut' });
  }
  // Fallback: strokeDasharray
  const len = el.getTotalLength ? el.getTotalLength() : 500;
  gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
  return gsap.to(el, { strokeDashoffset: 0, duration: dur, ease: ease || 'power1.inOut' });
}

/**
 * Draw-on for all stroke paths within a group, staggered.
 */
export function drawOnGroup(groupEl, dur, stagger, ease) {
  if (typeof groupEl === 'string') groupEl = document.getElementById(groupEl);
  if (!groupEl) return gsap.to({}, { duration: 0.01 });
  const paths = groupEl.querySelectorAll('path, line, circle, ellipse, polyline, polygon, rect');
  if (paths.length === 0) return gsap.to({}, { duration: 0.01 });

  const tl = gsap.timeline();
  paths.forEach((p, i) => {
    tl.add(drawOn(p, dur, ease), i * (stagger || 0.15));
  });
  return tl;
}

/**
 * Clip-rect text wipe reveal (left to right).
 */
export function wipe(clipRectId, targetWidth, dur, ease) {
  return gsap.fromTo('#' + clipRectId,
    { attr: { width: 0 } },
    { attr: { width: targetWidth }, duration: dur, ease: ease || 'power1.inOut' }
  );
}

/**
 * Fade-in for illustration groups or complex shapes.
 */
export function fadeIn(sel, dur) {
  return gsap.fromTo(sel,
    { opacity: 0 },
    { opacity: 1, duration: dur || 0.5, ease: 'power2.out' }
  );
}

/**
 * Show a scene group instantly.
 */
export function showScene(sel) { gsap.set(sel, { opacity: 1 }); }

/**
 * Hide a scene group instantly.
 */
export function hideScene(sel) { gsap.set(sel, { opacity: 0 }); }
