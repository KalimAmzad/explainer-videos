/**
 * Node 4: Animation & Sequencing (Deterministic)
 * Layout computation + GSAP timeline code generation.
 * Ported from scripts/pipeline/03-process-assets.mjs + 04-assemble-html.mjs timeline logic.
 */

const W = 1280, H = 720;

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

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripStars(s) {
  return s.replace(/\*/g, '');
}

export async function animationNode(state) {
  console.log('\n══════════════════════════════════════');
  console.log('  Node 4: Animation & Sequencing');
  console.log('══════════════════════════════════════');

  const { blueprint, decomposedAssets } = state;
  const scenes = blueprint.scenes;
  const computedScenes = [];

  // ── Step 1: Layout computation (from 03-process-assets) ──
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const asset = decomposedAssets[i] || {};
    const sceneId = `scene${scene.scene_number}`;

    // Use blueprint positions if provided, otherwise fall back to layout template
    const layout = LAYOUTS[scene.layout] || LAYOUTS.title_left_illust_right;

    const titlePos = scene.title_position || layout.title;
    const bodyPos = scene.body_position || layout.body;
    const illustPos = scene.illustration_position || layout.illustration;

    const cleanTitle = stripStars(scene.title);
    const titleFontSize = titlePos.fontSize || layout.title.fontSize;
    const titleAnchor = titlePos.anchor || layout.title.anchor || 'start';
    const titleClipWidth = estimateTextWidth(cleanTitle, titleFontSize);

    const computed = {
      sceneId,
      sceneNumber: scene.scene_number,
      title: {
        x: titlePos.x,
        y: titlePos.y,
        fontSize: titleFontSize,
        fontWeight: layout.title.fontWeight || '700',
        anchor: titleAnchor,
        text: cleanTitle,
        font: "'Cabin Sketch', cursive",
        fill: scene.concept_color,
        clipId: `cp_${sceneId}_title`,
        clipRectId: `cr_${sceneId}_title`,
        clipWidth: titleClipWidth,
        clipHeight: titleFontSize * 1.4,
        clipX: titleAnchor === 'middle' ? titlePos.x - titleClipWidth / 2 : titlePos.x,
        clipY: titlePos.y - titleFontSize,
      },
      bodyLines: [],
      illustration: {
        x: illustPos.x || illustPos.x,
        y: illustPos.y || illustPos.y,
        w: illustPos.width || illustPos.w,
        h: illustPos.height || illustPos.h,
      },
      labels: [],
      decorations: scene.decorations || [],
      asset,
    };

    // Body lines with key term parsing
    const bodyFontSize = bodyPos.fontSize || layout.body.fontSize;
    const bodyLineHeight = bodyPos.lineHeight || layout.body.lineHeight;
    const bodyAnchor = bodyPos.anchor || layout.body.anchor || 'start';
    let bodyY = bodyPos.y;

    for (let j = 0; j < (scene.body_lines || []).length; j++) {
      const rawText = scene.body_lines[j];
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

      const lineId = `${sceneId}_body${j}`;
      const textWidth = estimateTextWidth(plainText, bodyFontSize);
      const clipX = bodyAnchor === 'middle' ? bodyPos.x - textWidth / 2 : bodyPos.x;

      computed.bodyLines.push({
        id: lineId,
        y: bodyY,
        x: bodyPos.x,
        fontSize: bodyFontSize,
        font: "'Caveat', cursive",
        anchor: bodyAnchor,
        segments,
        clipId: `cp_${lineId}`,
        clipRectId: `cr_${lineId}`,
        clipWidth: textWidth,
        clipHeight: bodyFontSize * 1.5,
        clipX,
        clipY: bodyY - bodyFontSize,
      });
      bodyY += bodyLineHeight;
    }

    // Labels
    const labels = scene.labels || [];
    for (let j = 0; j < labels.length; j++) {
      const label = labels[j];
      const labelId = `${sceneId}_label${j}`;
      const pos = label.position || { x: computed.illustration.x + computed.illustration.w / 2, y: computed.illustration.y + computed.illustration.h + 25 };
      const fontSize = label.font_size || 20;
      const textWidth = estimateTextWidth(label.text, fontSize);
      const anchor = 'start';
      const clipX = pos.x;

      computed.labels.push({
        id: labelId,
        text: label.text,
        x: pos.x,
        y: pos.y,
        fontSize,
        font: "'Patrick Hand', cursive",
        fill: label.color || '#555',
        anchor,
        clipId: `cp_${labelId}`,
        clipRectId: `cr_${labelId}`,
        clipWidth: textWidth,
        clipHeight: fontSize * 1.5,
        clipX,
        clipY: pos.y - fontSize,
        arrowTo: label.arrow_to || null,
      });
    }

    // Multi-element illustration transform
    if (asset.elements?.length > 0) {
      const srcW = asset.sourceWidth || 1408;
      const srcH = asset.sourceHeight || 768;
      const scale = Math.min(computed.illustration.w / srcW, computed.illustration.h / srcH) * 0.85;
      const offsetX = computed.illustration.x + (computed.illustration.w - srcW * scale) / 2;
      const offsetY = computed.illustration.y + (computed.illustration.h - srcH * scale) / 2;

      computed.illustrationTransform = { scale, offsetX, offsetY, srcW, srcH };
      computed.elements = asset.elements.map((el, idx) => ({
        ...el,
        canvasId: `${sceneId}_el${idx}`,
      }));
    }

    computedScenes.push(computed);
    console.log(`  Scene ${scene.scene_number}: ${computed.bodyLines.length} body, ${computed.labels.length} labels, ${computed.elements?.length || 0} elements`);
  }

  // ── Step 2: Build SVG defs ──
  let svgDefs = '';
  for (const c of computedScenes) {
    svgDefs += `  <clipPath id="${c.title.clipId}"><rect id="${c.title.clipRectId}" x="${c.title.clipX.toFixed(0)}" y="${c.title.clipY.toFixed(0)}" width="0" height="${c.title.clipHeight.toFixed(0)}"/></clipPath>\n`;
    for (const bl of c.bodyLines) {
      svgDefs += `  <clipPath id="${bl.clipId}"><rect id="${bl.clipRectId}" x="${bl.clipX.toFixed(0)}" y="${bl.clipY.toFixed(0)}" width="0" height="${bl.clipHeight.toFixed(0)}"/></clipPath>\n`;
    }
    for (const lb of c.labels) {
      svgDefs += `  <clipPath id="${lb.clipId}"><rect id="${lb.clipRectId}" x="${lb.clipX.toFixed(0)}" y="${lb.clipY.toFixed(0)}" width="0" height="${lb.clipHeight.toFixed(0)}"/></clipPath>\n`;
    }
  }

  // ── Step 3: Build scene SVG groups ──
  let sceneSvg = '';
  for (let i = 0; i < computedScenes.length; i++) {
    const c = computedScenes[i];
    const scene = scenes[i];
    const sceneId = c.sceneId;

    sceneSvg += `\n<!-- Scene ${scene.scene_number}: ${esc(scene.title)} -->\n`;
    sceneSvg += `<g id="${sceneId}" class="scene">\n`;

    // Title
    sceneSvg += `  <g clip-path="url(#${c.title.clipId})">\n`;
    sceneSvg += `    <text x="${c.title.x}" y="${c.title.y}" font-family="${c.title.font}" font-size="${c.title.fontSize}" font-weight="${c.title.fontWeight}" fill="${c.title.fill}" text-anchor="${c.title.anchor}">${esc(c.title.text)}</text>\n`;
    sceneSvg += `  </g>\n`;

    // Title underline
    const ulY = c.title.y + 8;
    const ulX1 = c.title.anchor === 'middle' ? c.title.x - c.title.clipWidth / 2 : c.title.x;
    const ulX2 = ulX1 + c.title.clipWidth - 30;
    sceneSvg += `  <line id="${sceneId}_underline" x1="${ulX1}" y1="${ulY}" x2="${ulX2}" y2="${ulY}" stroke="${c.title.fill}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>\n`;

    // Body text
    for (const bl of c.bodyLines) {
      sceneSvg += `  <g clip-path="url(#${bl.clipId})">\n`;
      sceneSvg += `    <text x="${bl.x}" y="${bl.y}" font-family="${bl.font}" font-size="${bl.fontSize}" text-anchor="${bl.anchor}">`;
      for (const seg of bl.segments) {
        const weight = seg.bold ? ' font-weight="700"' : '';
        sceneSvg += `<tspan fill="${seg.fill}"${weight}>${esc(seg.text)}</tspan>`;
      }
      sceneSvg += `</text>\n`;
      sceneSvg += `  </g>\n`;
    }

    // Illustration elements
    if (c.elements?.length > 0 && c.illustrationTransform) {
      const tx = c.illustrationTransform;
      const transform = `translate(${tx.offsetX.toFixed(1)},${tx.offsetY.toFixed(1)}) scale(${tx.scale.toFixed(4)})`;
      for (let j = 0; j < c.elements.length; j++) {
        const el = c.elements[j];
        const elId = `${sceneId}_el${j}`;
        sceneSvg += `  <g id="${elId}" class="illust-el" transform="${transform}" opacity="0">\n`;
        sceneSvg += `    ${el.svg_code}\n`;
        sceneSvg += `  </g>\n`;
      }
    } else if (c.asset?.type === 'custom_sketch' && c.asset.strokePathD) {
      const illust = c.illustration;
      const srcW = c.asset.sourceWidth || 1408;
      const srcH = c.asset.sourceHeight || 768;
      const scale = Math.min(illust.w / srcW, illust.h / srcH) * 0.85;
      const tx = illust.x + (illust.w - srcW * scale) / 2;
      const ty = illust.y + (illust.h - srcH * scale) / 2;
      sceneSvg += `  <path id="${sceneId}_illust" d="${c.asset.strokePathD}" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})" opacity="0"/>\n`;
    }

    // Labels
    for (const lb of c.labels) {
      // Arrow line if arrow_to is specified
      if (lb.arrowTo) {
        sceneSvg += `  <line x1="${lb.x}" y1="${lb.y}" x2="${lb.arrowTo.x}" y2="${lb.arrowTo.y}" stroke="${lb.fill}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>\n`;
      }
      sceneSvg += `  <g clip-path="url(#${lb.clipId})">\n`;
      sceneSvg += `    <text x="${lb.x}" y="${lb.y}" font-family="${lb.font}" font-size="${lb.fontSize}" fill="${lb.fill}" text-anchor="${lb.anchor}">${esc(lb.text)}</text>\n`;
      sceneSvg += `  </g>\n`;
    }

    sceneSvg += `</g>\n`;
  }

  // ── Step 4: Build GSAP timeline code ──
  let timelineCode = '';
  for (let i = 0; i < computedScenes.length; i++) {
    const c = computedScenes[i];
    const scene = scenes[i];
    const sceneId = c.sceneId;
    const t0 = scene.time_start;
    const prevId = scene.scene_number > 1 ? `scene${scene.scene_number - 1}` : null;

    timelineCode += `\n  // Scene ${scene.scene_number}: ${scene.title} (${t0}s)\n`;

    if (prevId) {
      timelineCode += `  tl.set('#${prevId}', { opacity: 0 }, ${t0.toFixed(1)});\n`;
    }
    timelineCode += `  tl.set('#${sceneId}', { opacity: 1 }, ${t0.toFixed(1)});\n`;

    let t = t0 + 0.3;

    // Title wipe
    timelineCode += `  tl.add(wipe('${c.title.clipRectId}', ${c.title.clipWidth.toFixed(0)}, 1.3), ${t.toFixed(1)});\n`;
    t += 1.5;

    // Underline draw-on
    timelineCode += `  tl.add(drawOn('${sceneId}_underline', 0.4), ${t.toFixed(1)});\n`;
    t += 0.5;

    // Body text wipes
    for (const bl of c.bodyLines) {
      timelineCode += `  tl.add(wipe('${bl.clipRectId}', ${bl.clipWidth.toFixed(0)}, 0.8), ${t.toFixed(1)});\n`;
      t += 0.7;
    }

    // Illustration
    if (c.elements?.length > 0) {
      const categoryWeights = { main_subject: 3, secondary_subject: 2, detail: 1, annotation: 1, connector: 0.5 };
      const totalIllustTime = Math.min(6.0, (scene.time_end - t0) * 0.45);
      const totalWeight = c.elements.reduce((sum, el) => sum + (categoryWeights[el.category] || 1), 0);

      for (let j = 0; j < c.elements.length; j++) {
        const el = c.elements[j];
        const elId = `${sceneId}_el${j}`;
        const dur = Math.max(0.3, ((categoryWeights[el.category] || 1) / totalWeight) * totalIllustTime);

        timelineCode += `  gsap.set('#${elId}', { opacity: 1 });\n`;
        timelineCode += `  tl.add(drawOnGroup('${elId}', ${dur.toFixed(1)}), ${t.toFixed(1)});\n`;
        t += dur * 0.65;
      }
    } else if (c.asset?.type === 'custom_sketch' || c.asset?.type === 'icons8_sketchy') {
      const drawDur = Math.min(4.0, (scene.time_end - t0) * 0.4);
      timelineCode += `  gsap.set('#${sceneId}_illust', { opacity: 1 });\n`;
      timelineCode += `  tl.add(drawOn('${sceneId}_illust', ${drawDur.toFixed(1)}), ${t.toFixed(1)});\n`;
      t += drawDur * 0.8;
    }

    // Labels
    for (const lb of c.labels) {
      timelineCode += `  tl.add(wipe('${lb.clipRectId}', ${lb.clipWidth.toFixed(0)}, 0.5), ${t.toFixed(1)});\n`;
      t += 0.4;
    }
  }

  // ── Step 5: Rough.js initialization code ──
  let roughJsCode = '';
  for (let i = 0; i < computedScenes.length; i++) {
    const c = computedScenes[i];
    const scene = scenes[i];
    if (!c.decorations?.length) continue;

    for (let j = 0; j < c.decorations.length; j++) {
      const dec = c.decorations[j];
      const decId = `rough_${c.sceneId}_${dec.type}${j}`;

      if (dec.type === 'box') {
        const target = dec.target === 'title' ? c.title : null;
        if (target) {
          const x = target.anchor === 'middle' ? target.x - target.clipWidth / 2 - 8 : target.x - 8;
          const y = target.clipY - 4;
          const w = target.clipWidth + 16;
          const h = target.clipHeight + 8;
          roughJsCode += `  {\n    const node = rc.rectangle(${x}, ${y}, ${w}, ${h}, { roughness: ${dec.roughness || 1.5}, stroke: '${dec.color}', strokeWidth: 2${dec.fill ? `, fill: '${dec.fill}', fillStyle: 'hachure'` : ''} });\n    node.id = '${decId}';\n    node.setAttribute('opacity', '0');\n    document.getElementById('${c.sceneId}').appendChild(node);\n  }\n`;
        }
      } else if (dec.type === 'underline') {
        // Already handled by title underline
      } else if (dec.type === 'circle') {
        const cx = c.illustration.x + c.illustration.w / 2;
        const cy = c.illustration.y + c.illustration.h / 2;
        const r = Math.min(c.illustration.w, c.illustration.h) / 3;
        roughJsCode += `  {\n    const node = rc.circle(${cx}, ${cy}, ${r * 2}, { roughness: ${dec.roughness || 1.5}, stroke: '${dec.color}', strokeWidth: 2 });\n    node.id = '${decId}';\n    node.setAttribute('opacity', '0');\n    document.getElementById('${c.sceneId}').appendChild(node);\n  }\n`;
      }
    }
  }

  console.log(`\n  Generated:`);
  console.log(`    SVG defs: ${svgDefs.length} chars`);
  console.log(`    Scene SVG: ${sceneSvg.length} chars`);
  console.log(`    Timeline code: ${timelineCode.length} chars`);
  console.log(`    Rough.js code: ${roughJsCode.length} chars`);

  return {
    computedScenes,
    timelineCode,
    svgDefs,
    sceneSvg,
    roughJsCode,
    currentStep: 'animation_complete',
  };
}
