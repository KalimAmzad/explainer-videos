// ── SVG Loader: fetch SVG files and inject inline into the DOM ──

const SVG_ASSETS = [
  { file: 'assets/step1-brain.svg',         targetId: 'illust_step1', x: 80,  y: 130, w: 280, h: 200 },
  { file: 'assets/step2-meditator.svg',     targetId: 'illust_step2', x: 480, y: 130, w: 290, h: 200 },
  { file: 'assets/step3-reframer.svg',      targetId: 'illust_step3', x: 290, y: 438, w: 280, h: 200 },
  { file: 'assets/step4-communicators.svg',  targetId: 'illust_step4', x: 900, y: 130, w: 300, h: 200 },
  { file: 'assets/step5-selfcare.svg',      targetId: 'illust_step5', x: 700, y: 438, w: 300, h: 200 },
];

/**
 * Load all SVG assets, parse them, and inject their contents
 * into placeholder <g> elements in the DOM.
 * Each SVG's internal viewBox is mapped to the target x/y/w/h via a transform.
 */
export async function loadAllSVGs() {
  const promises = SVG_ASSETS.map(async (asset) => {
    try {
      const resp = await fetch(asset.file);
      if (!resp.ok) {
        console.warn(`Failed to load ${asset.file}: ${resp.status}`);
        return;
      }
      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svgEl = doc.documentElement;

      // Get the source viewBox
      const vb = svgEl.getAttribute('viewBox');
      if (!vb) return;
      const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number);

      // Calculate transform to fit into target region
      const scaleX = asset.w / vw;
      const scaleY = asset.h / vh;
      const scale = Math.min(scaleX, scaleY);
      const tx = asset.x + (asset.w - vw * scale) / 2;
      const ty = asset.y + (asset.h - vh * scale) / 2;

      const target = document.getElementById(asset.targetId);
      if (!target) return;

      // Set transform on the group
      target.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);

      // Move all children from the parsed SVG into the target group
      while (svgEl.firstChild) {
        const node = svgEl.firstChild;
        // Import node into current document
        const imported = document.importNode(node, true);
        target.appendChild(imported);
      }
    } catch (err) {
      console.warn(`Error loading ${asset.file}:`, err);
    }
  });

  await Promise.all(promises);
}

/**
 * Load the arrows SVG and inject paths into the arrows group.
 */
export async function loadArrows() {
  try {
    const resp = await fetch('assets/arrows.svg');
    if (!resp.ok) return;
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svgEl = doc.documentElement;

    const target = document.getElementById('g_arrows');
    if (!target) return;

    // Copy defs (markers) to main SVG defs
    const mainDefs = document.querySelector('#board defs');
    const srcDefs = svgEl.querySelector('defs');
    if (srcDefs && mainDefs) {
      while (srcDefs.firstChild) {
        mainDefs.appendChild(document.importNode(srcDefs.firstChild, true));
      }
    }

    // Copy path elements
    const paths = svgEl.querySelectorAll('path');
    paths.forEach(p => {
      target.appendChild(document.importNode(p, true));
    });
    // Copy group wrapper attributes
    const g = svgEl.querySelector('g');
    if (g) {
      Array.from(g.attributes).forEach(attr => {
        if (attr.name !== 'id') target.setAttribute(attr.name, attr.value);
      });
    }
  } catch (err) {
    console.warn('Error loading arrows:', err);
  }
}
