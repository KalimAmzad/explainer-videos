/**
 * Node 6: Scene Compositor — DETERMINISTIC (no LLM calls).
 *
 * Generates TSX string per scene from resolved timeline + assets.
 * Pure string concatenation using template literals.
 *
 * Input:  state.resolvedTimeline, state.assets, state.theme, state.sceneDesigns
 * Output: { compiledScenes } — array of { sceneNumber, tsxContent }
 */
import fs from 'fs';
import path from 'path';

// ── Animation component mapping ────────────────────────────────────

const ANIMATION_COMPONENTS = {
  wipe: 'WipeReveal',
  draw_on: 'DrawOnSVG',
  fade_scale: 'FadeScale',
  fade_in: 'FadeIn',
  typewriter: 'Typewriter',
};

// ── Text variant heuristic ─────────────────────────────────────────

/**
 * Infer the StyledText variant from slot name and content length.
 * @param {string} slot - Slot name (header, body, footer, etc.)
 * @param {string} content - Text content
 * @returns {string} 'heading' | 'subheading' | 'body' | 'caption' | 'label'
 */
function inferTextVariant(slot, content) {
  if (!slot) return 'body';
  const s = slot.toLowerCase();
  if (s === 'header' || s === 'overlay-title') return 'heading';
  if (s === 'footer' || s === 'caption') return 'caption';
  if (s.startsWith('label')) return 'label';
  if (s === 'verdict') return 'subheading';
  // Short text in grid cells or steps -> label
  const contentLen = content ? content.length : 0;
  if (contentLen < 40 && (s.startsWith('cell') || s.startsWith('step') || s.startsWith('milestone'))) {
    return 'label';
  }
  return 'body';
}

// ── Asset lookup ───────────────────────────────────────────────────

/**
 * Find an asset by asset_id in the assets array.
 * @param {Array} assets - All generated assets
 * @param {string} assetId - ID to find
 * @returns {object|null} Matching asset or null
 */
function findAsset(assets, assetId) {
  if (!assets || !assetId) return null;
  return assets.find(a => a.asset_id === assetId) || null;
}

// ── Escape helpers ─────────────────────────────────────────────────

/**
 * Escape a string for safe embedding inside JS template literals (backtick strings).
 * Handles backticks, dollar signs, and backslashes.
 */
function escapeForTemplateLiteral(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Escape text content for JSX children (angle brackets, curly braces).
 */
function escapeJSXChildren(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;');
}

/**
 * Escape text for a JSX string attribute (double quotes).
 */
function escapeJSXAttr(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

// ── Block renderers ────────────────────────────────────────────────

/**
 * Generate TSX for a text block with animation wrapper.
 */
function renderTextBlock(block) {
  const variant = inferTextVariant(block.slot, block.content);
  const anim = block.animation || 'wipe';
  const component = ANIMATION_COMPONENTS[anim] || 'WipeReveal';
  const from = block.visual_start_frame;
  const dur = block.visual_duration_frames;

  if (anim === 'typewriter') {
    return [
      `        {/* ${block.block_id}: ${anim} in ${block.slot} slot */}`,
      `        <Sequence from={${from}} durationInFrames={${dur}} layout="none">`,
      `          <Typewriter durationFrames={${dur}} text="${escapeJSXAttr(block.content || '')}" />`,
      `        </Sequence>`,
    ].join('\n');
  }

  const escapedContent = escapeJSXChildren(block.content || '');

  return [
    `        {/* ${block.block_id}: ${anim} in ${block.slot} slot */}`,
    `        <Sequence from={${from}} durationInFrames={${dur}} layout="none">`,
    `          <${component} durationFrames={${dur}}>`,
    `            <StyledText variant="${variant}">${escapedContent}</StyledText>`,
    `          </${component}>`,
    `        </Sequence>`,
  ].join('\n');
}

/**
 * Generate TSX for an SVG block with draw_on animation.
 * If the block has sub_animations, generates staggered Sequences per sub-element.
 */
function renderSVGBlock(block, asset) {
  const lines = [];
  const svgContent = asset ? escapeForTemplateLiteral(asset.content || '') : '';

  if (block.sub_animations && block.sub_animations.length > 0) {
    // Progressive/stagger: one Sequence per sub-element
    for (const sub of block.sub_animations) {
      const elementId = `${block.asset_id}__${sub.sub_id}`;
      lines.push(
        `        {/* ${block.block_id}/${sub.sub_id}: draw_on in ${block.slot} slot */}`,
        `        <Sequence from={${sub.start_frame}} durationInFrames={${sub.duration_frames}} layout="none">`,
        `          <DrawOnSVG durationFrames={${sub.duration_frames}} svgContent={\`${svgContent}\`} elementId="${escapeJSXAttr(elementId)}" />`,
        `        </Sequence>`,
      );
    }
  } else {
    // Single draw_on for the entire SVG
    const from = block.visual_start_frame;
    const dur = block.visual_duration_frames;
    lines.push(
      `        {/* ${block.block_id}: draw_on in ${block.slot} slot */}`,
      `        <Sequence from={${from}} durationInFrames={${dur}} layout="none">`,
      `          <DrawOnSVG durationFrames={${dur}} svgContent={\`${svgContent}\`} />`,
      `        </Sequence>`,
    );
  }

  return lines.join('\n');
}

/**
 * Generate TSX for an image/PNG block with animation wrapper.
 */
function renderImageBlock(block, asset) {
  const anim = block.animation || 'fade_scale';
  const component = ANIMATION_COMPONENTS[anim] || 'FadeScale';
  const from = block.visual_start_frame;
  const dur = block.visual_duration_frames;

  const fileName = asset && asset.filePath
    ? path.basename(asset.filePath)
    : `${block.asset_id}.png`;

  return [
    `        {/* ${block.block_id}: ${anim} in ${block.slot} slot */}`,
    `        <Sequence from={${from}} durationInFrames={${dur}} layout="none">`,
    `          <${component} durationFrames={${dur}}>`,
    `            <ImageAsset src={staticFile('assets/${escapeJSXAttr(fileName)}')} />`,
    `          </${component}>`,
    `        </Sequence>`,
  ].join('\n');
}

/**
 * Generate TSX for a generic/unknown block with fade_in fallback.
 */
function renderFallbackBlock(block, asset) {
  if (asset && asset.content) {
    return renderSVGBlock(block, asset);
  }
  if (asset && asset.filePath) {
    return renderImageBlock(block, asset);
  }

  // Last resort: render content or block_id as text
  const anim = block.animation || 'fade_in';
  const component = ANIMATION_COMPONENTS[anim] || 'FadeIn';
  const from = block.visual_start_frame;
  const dur = block.visual_duration_frames;

  return [
    `        {/* ${block.block_id}: ${anim} in ${block.slot} slot (fallback) */}`,
    `        <Sequence from={${from}} durationInFrames={${dur}} layout="none">`,
    `          <${component} durationFrames={${dur}}>`,
    `            <StyledText variant="body">${escapeJSXChildren(block.content || block.block_id)}</StyledText>`,
    `          </${component}>`,
    `        </Sequence>`,
  ].join('\n');
}

// ── Render dispatcher ──────────────────────────────────────────────

/**
 * Dispatch a block to the appropriate renderer based on asset_type.
 */
function renderBlock(block, assets) {
  const asset = findAsset(assets, block.asset_id);
  const assetType = block.asset_type || (asset ? asset.type : 'text');

  switch (assetType) {
    case 'text':
      return renderTextBlock(block);
    case 'svg':
      return renderSVGBlock(block, asset);
    case 'image':
    case 'png':
      return renderImageBlock(block, asset);
    case 'icon':
      return renderImageBlock(block, asset);
    default:
      return renderFallbackBlock(block, asset);
  }
}

// ── Import collector ───────────────────────────────────────────────

/**
 * Scan blocks to determine which animation and component imports are needed.
 * @returns {{ animations: Set<string>, components: Set<string>, needsStaticFile: boolean }}
 */
function collectImports(blocks, assets) {
  const animations = new Set();
  const components = new Set();
  let needsStaticFile = false;

  for (const block of blocks) {
    const asset = findAsset(assets, block.asset_id);
    const assetType = block.asset_type || (asset ? asset.type : 'text');
    const anim = block.animation || 'wipe';

    // Track animation components
    if (anim === 'typewriter') {
      animations.add('Typewriter');
    } else {
      animations.add(ANIMATION_COMPONENTS[anim] || 'WipeReveal');
    }

    // Sub-animations always use DrawOnSVG
    if (block.sub_animations && block.sub_animations.length > 0) {
      animations.add('DrawOnSVG');
    }

    // Track asset component imports
    switch (assetType) {
      case 'text':
        components.add('StyledText');
        break;
      case 'svg':
        // DrawOnSVG handles SVG rendering directly
        break;
      case 'image':
      case 'png':
      case 'icon':
        components.add('ImageAsset');
        needsStaticFile = true;
        break;
      default:
        // Fallback might need StyledText
        if (!asset || (!asset.content && !asset.filePath)) {
          components.add('StyledText');
        }
        break;
    }
  }

  // Most scenes have text blocks
  components.add('StyledText');

  return { animations, components, needsStaticFile };
}

// ── Scene TSX generator ────────────────────────────────────────────

/**
 * Generate the complete TSX source for a single scene.
 * @param {object} sceneTimeline - Resolved timeline entry for this scene
 * @param {Array} assets - All generated assets
 * @param {number} sceneNumber - 1-based scene number
 * @returns {string} Complete TSX file content
 */
function generateSceneTSX(sceneTimeline, assets, sceneNumber) {
  const blocks = sceneTimeline.blocks || [];
  const layoutTemplate = sceneTimeline.layout_template || 'title-and-body';
  const { animations, components, needsStaticFile } = collectImports(blocks, assets);

  // ── Build imports ──

  const importLines = [`import React from 'react';`];

  // Remotion imports
  const remotionImports = ['Sequence', 'useVideoConfig'];
  if (needsStaticFile) remotionImports.push('staticFile');
  importLines.push(`import { ${remotionImports.join(', ')} } from 'remotion';`);

  // Layout import
  importLines.push(`import { LAYOUTS } from '../layouts';`);

  // Animation imports
  if (animations.size > 0) {
    const animList = Array.from(animations).sort().join(', ');
    importLines.push(`import { ${animList} } from '../animations';`);
  }

  // Component imports
  if (components.size > 0) {
    const compList = Array.from(components).sort().join(', ');
    importLines.push(`import { ${compList} } from '../components';`);
  }

  // Theme import
  importLines.push(`import { useTheme } from '../ThemeContext';`);

  // ── Group blocks by slot ──

  const slotBlocks = {};
  for (const block of blocks) {
    const slot = block.slot || 'body';
    if (!slotBlocks[slot]) slotBlocks[slot] = [];
    slotBlocks[slot].push(block);
  }

  // ── Generate slot content ──

  const slotEntries = [];
  for (const [slotName, slotBlockList] of Object.entries(slotBlocks)) {
    const blocksTSX = slotBlockList.map(b => renderBlock(b, assets)).join('\n');
    slotEntries.push(
      `      '${slotName}': (\n        <>\n${blocksTSX}\n        </>\n      )`,
    );
  }

  const slotsObject = slotEntries.join(',\n');

  // ── Assemble TSX ──

  const tsx = `${importLines.join('\n')}

export const Scene${sceneNumber}: React.FC = () => {
  const theme = useTheme();
  const { fps } = useVideoConfig();
  const Layout = LAYOUTS['${layoutTemplate}'];

  return (
    <Layout theme={theme} slots={{
${slotsObject}
    }} />
  );
};
`;

  return tsx;
}

// ── Main node ──────────────────────────────────────────────────────

/**
 * Scene Compositor node. Generates TSX for each scene from the resolved
 * timeline and collected assets. Pure string concatenation — no LLM.
 *
 * Writes scene files to disk if outputDir is available, and returns the
 * compiled scene data for the video compiler.
 *
 * @param {object} state - LangGraph state
 * @returns {{ compiledScenes: Array<{ sceneNumber: number, tsxContent: string }> }}
 */
export async function sceneCompositorNode(state) {
  console.log('\n  ── Scene Compositor (deterministic) ──');

  const resolvedTimeline = state.resolvedTimeline || [];
  const assets = state.assets || [];
  const outputDir = state.outputDir || '';

  if (resolvedTimeline.length === 0) {
    console.log('    WARNING: No resolved timeline — returning empty compiled scenes');
    return { compiledScenes: [] };
  }

  const compiledScenes = [];

  for (const sceneTimeline of resolvedTimeline) {
    const sceneNumber = sceneTimeline.scene_number;

    try {
      const tsxContent = generateSceneTSX(sceneTimeline, assets, sceneNumber);
      compiledScenes.push({ sceneNumber, tsxContent });

      // Write scene file to disk if outputDir is available
      if (outputDir) {
        const scenesDir = path.join(outputDir, 'remotion', 'src', 'scenes');
        fs.mkdirSync(scenesDir, { recursive: true });

        const filePath = path.join(scenesDir, `Scene${sceneNumber}.tsx`);
        fs.writeFileSync(filePath, tsxContent, 'utf8');
        console.log(`    Wrote Scene${sceneNumber}.tsx (${tsxContent.length} chars)`);
      } else {
        console.log(`    Composited Scene${sceneNumber} (${tsxContent.length} chars, not written — no outputDir)`);
      }
    } catch (err) {
      console.error(`    ERROR compositing Scene${sceneNumber}: ${err.message}`);
      // Push a placeholder so downstream nodes know the scene exists
      compiledScenes.push({
        sceneNumber,
        tsxContent: '',
        error: err.message,
      });
    }
  }

  console.log(`    Composited ${compiledScenes.length} scenes total`);

  return { compiledScenes };
}
