/**
 * Step 3: Layout computation and asset positioning.
 * Computes canvas coordinates, clip-path rects, and normalizes SVG paths.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

const slug = process.argv[2]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || 'anger-management-for-corporate-leaders';
const outputDir = process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(rootDir, 'output', slug);
const planPath = path.join(outputDir, 'scene-plan.json');

if (!fs.existsSync(planPath)) { console.error(`No scene plan: ${planPath}`); process.exit(1); }

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

// Canvas constants
const W = 1280, H = 720;

// Layout patterns
const LAYOUTS = {
  title_left_illust_right: {
    title: { x: 60, y: 80, fontSize: 48, fontWeight: '700', maxWidth: 480 },
    body: { x: 60, y: 150, fontSize: 28, lineHeight: 42, maxWidth: 450 },
    illustration: { x: 560, y: 60, w: 660, h: 580 },
  },
  centered_diagram: {
    title: { x: 640, y: 70, fontSize: 48, fontWeight: '700', anchor: 'middle', maxWidth: 900 },
    body: { x: 640, y: 130, fontSize: 26, lineHeight: 38, anchor: 'middle', maxWidth: 800 },
    illustration: { x: 190, y: 180, w: 900, h: 480 },
  },
  title_top_illust_center: {
    title: { x: 640, y: 70, fontSize: 48, fontWeight: '700', anchor: 'middle', maxWidth: 900 },
    body: { x: 640, y: 130, fontSize: 26, lineHeight: 38, anchor: 'middle', maxWidth: 800 },
    illustration: { x: 240, y: 200, w: 800, h: 460 },
  },
  comparison_left_right: {
    title: { x: 640, y: 70, fontSize: 48, fontWeight: '700', anchor: 'middle', maxWidth: 900 },
    body: { x: 640, y: 130, fontSize: 26, lineHeight: 38, anchor: 'middle', maxWidth: 800 },
    illustration: { x: 60, y: 200, w: 1160, h: 460 },
  },
};

function estimateTextWidth(text, fontSize) {
  return text.length * fontSize * 0.55 + 30;
}

console.log(`Processing layout for ${plan.scenes.length} scenes...\n`);

for (const scene of plan.scenes) {
  const sceneId = `scene${scene.scene_number}`;
  const layout = LAYOUTS[scene.layout] || LAYOUTS.title_left_illust_right;

  // Process title (strip asterisks from Gemini output)
  const cleanTitle = scene.title.replace(/\*/g, '');
  scene.computed = {
    sceneId,
    title: {
      ...layout.title,
      text: cleanTitle,
      font: "'Cabin Sketch', cursive",
      fill: scene.concept_color,
      clipId: `cp_${sceneId}_title`,
      clipRectId: `cr_${sceneId}_title`,
      clipWidth: estimateTextWidth(cleanTitle, layout.title.fontSize),
      clipHeight: layout.title.fontSize * 1.4,
      clipX: layout.title.anchor === 'middle'
        ? layout.title.x - estimateTextWidth(cleanTitle, layout.title.fontSize) / 2
        : layout.title.x,
      clipY: layout.title.y - layout.title.fontSize,
    },
    bodyLines: [],
    illustration: { ...layout.illustration },
    labels: [],
  };

  // Process body lines
  let bodyY = layout.body.y;
  for (let i = 0; i < scene.body_lines.length; i++) {
    const rawText = scene.body_lines[i];
    // Parse *key terms* for red highlighting
    const segments = [];
    const parts = rawText.split(/(\*[^*]+\*)/);
    let plainText = '';
    for (const part of parts) {
      if (part.startsWith('*') && part.endsWith('*')) {
        const term = part.slice(1, -1);
        segments.push({ text: term, fill: '#cc3333', bold: true });
        plainText += term;
      } else {
        segments.push({ text: part, fill: '#333' });
        plainText += part;
      }
    }

    const lineId = `${sceneId}_body${i}`;
    const textWidth = estimateTextWidth(plainText, layout.body.fontSize);
    const clipX = layout.body.anchor === 'middle'
      ? layout.body.x - textWidth / 2
      : layout.body.x;

    scene.computed.bodyLines.push({
      id: lineId,
      y: bodyY,
      x: layout.body.x,
      fontSize: layout.body.fontSize,
      font: "'Caveat', cursive",
      anchor: layout.body.anchor || 'start',
      segments,
      clipId: `cp_${lineId}`,
      clipRectId: `cr_${lineId}`,
      clipWidth: textWidth,
      clipHeight: layout.body.fontSize * 1.5,
      clipX,
      clipY: bodyY - layout.body.fontSize,
    });
    bodyY += layout.body.lineHeight;
  }

  // Process labels
  if (scene.labels) {
    const illustBox = layout.illustration;
    const labelPositions = {
      'above': { x: illustBox.x + illustBox.w / 2, y: illustBox.y - 10, anchor: 'middle' },
      'below': { x: illustBox.x + illustBox.w / 2, y: illustBox.y + illustBox.h + 25, anchor: 'middle' },
      'left': { x: illustBox.x - 10, y: illustBox.y + illustBox.h / 2, anchor: 'end' },
      'right': { x: illustBox.x + illustBox.w + 10, y: illustBox.y + illustBox.h / 2, anchor: 'start' },
      'top-left': { x: illustBox.x, y: illustBox.y - 10, anchor: 'start' },
      'top-right': { x: illustBox.x + illustBox.w, y: illustBox.y - 10, anchor: 'end' },
      'bottom-left': { x: illustBox.x, y: illustBox.y + illustBox.h + 25, anchor: 'start' },
      'bottom-right': { x: illustBox.x + illustBox.w, y: illustBox.y + illustBox.h + 25, anchor: 'end' },
    };

    for (let i = 0; i < scene.labels.length; i++) {
      const label = scene.labels[i];
      const pos = labelPositions[label.position] || labelPositions['below'];
      // Offset multiple labels vertically
      const yOff = i * 30;
      const labelId = `${sceneId}_label${i}`;
      const textWidth = estimateTextWidth(label.text, 20);
      const clipX = pos.anchor === 'middle' ? pos.x - textWidth / 2
        : pos.anchor === 'end' ? pos.x - textWidth
        : pos.x;

      scene.computed.labels.push({
        id: labelId,
        text: label.text,
        x: pos.x,
        y: pos.y + yOff,
        fontSize: 20,
        font: "'Patrick Hand', cursive",
        fill: '#555',
        anchor: pos.anchor,
        clipId: `cp_${labelId}`,
        clipRectId: `cr_${labelId}`,
        clipWidth: textWidth,
        clipHeight: 30,
        clipX,
        clipY: pos.y + yOff - 20,
      });
    }
  }

  // Process multi-element illustrations (from 02b-analyze-assets)
  if (scene.asset?.elements?.length > 0) {
    const illust = layout.illustration;
    const srcW = scene.asset.source_w || 1408;
    const srcH = scene.asset.source_h || 768;
    const scale = Math.min(illust.w / srcW, illust.h / srcH) * 0.85;
    const offsetX = illust.x + (illust.w - srcW * scale) / 2;
    const offsetY = illust.y + (illust.h - srcH * scale) / 2;

    scene.computed.illustrationTransform = { scale, offsetX, offsetY, srcW, srcH };
    scene.computed.elements = scene.asset.elements.map((el, i) => ({
      ...el,
      canvasId: `${sceneId}_el${i}`,
    }));
  }

  const elCount = scene.computed.elements?.length || 0;
  console.log(`  Scene ${scene.scene_number}: ${scene.computed.bodyLines.length} body lines, ${scene.computed.labels.length} labels, ${elCount} illustration elements`);
  console.log(`    Title at (${scene.computed.title.x}, ${scene.computed.title.y}), Illustration at (${layout.illustration.x}, ${layout.illustration.y})`);
}

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`\nLayout computed. Plan updated: ${planPath}`);
