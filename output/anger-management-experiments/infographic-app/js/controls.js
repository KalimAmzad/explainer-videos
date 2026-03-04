// ── Playback Controls ──

export function setupControls(tl, totalDuration) {
  const seekBar = document.getElementById('seekBar');
  const timeDisp = document.getElementById('timeDisp');
  const btnPlay = document.getElementById('btnPlay');
  const btnReplay = document.getElementById('btnReplay');
  let isSeeking = false;

  seekBar.max = Math.round(totalDuration * 1000);

  // Timeline onUpdate callback
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    if (!isSeeking) seekBar.value = Math.round(t * 1000);
    timeDisp.textContent = t.toFixed(1) + ' / ' + totalDuration + 's';
    gsap.set('#progBar', { attr: { width: (t / totalDuration) * 1280 } });
  });

  // Play/Pause
  btnPlay.addEventListener('click', () => {
    if (tl.isActive()) {
      tl.pause();
      btnPlay.textContent = '\u25B6 Play';
    } else {
      tl.play();
      btnPlay.textContent = '\u23F8 Pause';
    }
  });

  // Replay
  btnReplay.addEventListener('click', () => {
    tl.seek(0).pause();
    // Reset all clip rects
    document.querySelectorAll('[id^="cr_"]').forEach(r => r.setAttribute('width', '0'));
    // Reset progress bar
    gsap.set('#progBar', { attr: { width: 0 } });
    btnPlay.textContent = '\u23F8 Pause';
    tl.restart();
  });

  // Seek
  seekBar.addEventListener('input', () => {
    isSeeking = true;
    tl.seek(seekBar.value / 1000).pause();
    btnPlay.textContent = '\u25B6 Play';
    setTimeout(() => { isSeeking = false; }, 100);
  });
}
