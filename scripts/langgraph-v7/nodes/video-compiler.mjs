/**
 * Node 7: Video Compiler — DETERMINISTIC (no LLM calls).
 *
 * Scaffolds the Remotion project from compiled scenes, writes all files,
 * and generates an edit manifest. Optionally renders to MP4.
 *
 * Input:  state.compiledScenes, state.theme, state.resolvedTimeline,
 *         state.outputDir, state.slug, state.assets
 * Output: { videoPath, editManifest }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CANVAS, PATHS } from '../config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = PATHS.remotionTemplate;

// ── Theme file generator ───────────────────────────────────────────

/**
 * Generate theme.ts content from the state theme object.
 * Merges with defaults for any missing properties.
 */
function generateThemeTS(theme) {
  const t = {
    background: theme?.background || '#f5f3ef',
    primaryFont: theme?.primaryFont || 'Caveat',
    headingFont: theme?.headingFont || 'Cabin Sketch',
    palette: {
      primary:   theme?.palette?.primary   || '#2b7ec2',
      secondary: theme?.palette?.secondary || '#cc3333',
      accent1:   theme?.palette?.accent1   || '#1e8c5a',
      accent2:   theme?.palette?.accent2   || '#cc7722',
      text:      theme?.palette?.text      || '#333333',
    },
    strokeWidth: theme?.strokeWidth ?? 2.5,
  };

  return `import type { Theme } from './ThemeContext';

export const theme: Theme = {
  background: '${t.background}',
  primaryFont: '${t.primaryFont}',
  headingFont: '${t.headingFont}',
  palette: {
    primary: '${t.palette.primary}',
    secondary: '${t.palette.secondary}',
    accent1: '${t.palette.accent1}',
    accent2: '${t.palette.accent2}',
    text: '${t.palette.text}',
  },
  strokeWidth: ${t.strokeWidth},
};

export type { Theme } from './ThemeContext';
export const DEFAULT_THEME = theme;
export const defaultTheme = theme;
export default theme;
`;
}

// ── Root.tsx generator ─────────────────────────────────────────────

/**
 * Generate Root.tsx that imports all scenes and wraps in a Composition.
 * @param {Array} resolvedTimeline - Scene timing data
 * @param {number} totalFrames - Total video duration in frames
 * @returns {string} Root.tsx content
 */
function generateRootTSX(resolvedTimeline, totalFrames) {
  const sceneImports = resolvedTimeline
    .map(s => `import { Scene${s.scene_number} } from './scenes/Scene${s.scene_number}';`)
    .join('\n');

  const sceneSequences = resolvedTimeline
    .map(s => {
      return `        <Sequence from={${s.scene_start_frame}} durationInFrames={${s.total_frames}} name="Scene ${s.scene_number}">
          <Scene${s.scene_number} />
        </Sequence>`;
    })
    .join('\n');

  return `import React from 'react';
import { Composition, Sequence } from 'remotion';
import { ThemeContext } from './ThemeContext';
import { theme } from './theme';
${sceneImports}

const Main: React.FC = () => (
  <ThemeContext.Provider value={theme}>
    <div style={{
      width: '100%',
      height: '100%',
      background: theme.background,
      position: 'relative',
    }}>
${sceneSequences}
    </div>
  </ThemeContext.Provider>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="WhiteboardVideo"
      component={Main}
      durationInFrames={${totalFrames}}
      fps={${CANVAS.fps}}
      width={${CANVAS.width}}
      height={${CANVAS.height}}
    />
  </>
);
`;
}

// ── Edit manifest generator ────────────────────────────────────────

/**
 * Generate an edit manifest (JSON) describing all scenes and their
 * editable assets for future editing UI integration.
 */
function generateEditManifest(resolvedTimeline, assets, slug) {
  const scenes = resolvedTimeline.map(scene => {
    const sceneAssets = (scene.blocks || []).map(block => {
      const asset = assets.find(a => a.asset_id === block.asset_id);
      const entry = {
        asset_id: block.asset_id,
        type: block.asset_type || 'text',
        slot: block.slot,
        animation: block.animation,
        start_frame: block.visual_start_frame,
        duration_frames: block.visual_duration_frames,
        editable: true,
      };

      if (block.asset_type === 'text') {
        entry.current_value = block.content || '';
      } else if (asset && asset.filePath) {
        entry.file = path.basename(asset.filePath);
      }

      if (block.sub_animations) {
        entry.sub_animations = block.sub_animations;
      }

      return entry;
    });

    return {
      scene_number: scene.scene_number,
      layout_template: scene.layout_template,
      start_frame: scene.scene_start_frame,
      total_frames: scene.total_frames,
      assets: sceneAssets,
    };
  });

  return {
    slug,
    generated_at: new Date().toISOString(),
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
    total_frames: resolvedTimeline.reduce((sum, s) => sum + s.total_frames, 0),
    scenes,
  };
}

// ── Template copier ────────────────────────────────────────────────

/**
 * Copy the remotion-template directory to the output location.
 * Skips the scenes directory (we generate those) and the theme file
 * (we generate a custom one).
 *
 * @param {string} destDir - Destination directory (outputDir/remotion)
 */
function copyTemplate(destDir) {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Remotion template not found at: ${TEMPLATE_DIR}`);
  }

  // Copy entire template recursively
  fs.cpSync(TEMPLATE_DIR, destDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      // Skip any existing scenes directory in the template
      // (we generate scene files from compiled state)
      const rel = path.relative(TEMPLATE_DIR, src);
      if (rel.startsWith('src/scenes') && rel !== 'src/scenes') {
        return false;
      }
      return true;
    },
  });
}

// ── Asset copier ───────────────────────────────────────────────────

/**
 * Copy generated asset files to the Remotion public/assets directory.
 * For SVG assets with inline content, write the content to disk.
 *
 * @param {Array} assets - Generated assets from state
 * @param {string} assetsDir - Destination public/assets directory
 */
function copyAssets(assets, assetsDir) {
  fs.mkdirSync(assetsDir, { recursive: true });

  let copied = 0;
  let written = 0;

  for (const asset of assets) {
    if (!asset) continue;

    const assetId = asset.asset_id || 'unknown';

    // If asset has a file path, copy it
    if (asset.filePath && fs.existsSync(asset.filePath)) {
      const destFile = path.join(assetsDir, path.basename(asset.filePath));
      fs.copyFileSync(asset.filePath, destFile);
      copied++;
      continue;
    }

    // If asset has inline content (SVG), write it to a file
    if (asset.content && (asset.type === 'svg' || asset.asset_type === 'svg')) {
      const destFile = path.join(assetsDir, `${assetId}.svg`);
      fs.writeFileSync(destFile, asset.content, 'utf8');
      written++;
      continue;
    }

    // If asset has inline content of another type, write with appropriate extension
    if (asset.content) {
      const ext = asset.type || asset.asset_type || 'txt';
      const destFile = path.join(assetsDir, `${assetId}.${ext}`);
      fs.writeFileSync(destFile, asset.content, 'utf8');
      written++;
    }
  }

  return { copied, written };
}

// ── Main node ──────────────────────────────────────────────────────

/**
 * Video Compiler node. Scaffolds the complete Remotion project:
 *
 * 1. Copies remotion-template to output directory
 * 2. Writes theme.ts with actual theme values
 * 3. Writes each Scene TSX file from compiledScenes
 * 4. Copies asset files to public/assets/
 * 5. Generates Root.tsx with scene imports and Composition
 * 6. Generates edit-manifest.json
 *
 * @param {object} state - LangGraph state
 * @returns {{ videoPath: string, editManifest: object }}
 */
export async function videoCompilerNode(state) {
  console.log('\n  ── Video Compiler (deterministic) ──');

  const compiledScenes = state.compiledScenes || [];
  const resolvedTimeline = state.resolvedTimeline || [];
  const theme = state.theme || {};
  const assets = state.assets || [];
  const outputDir = state.outputDir;
  const slug = state.slug || 'untitled';

  if (!outputDir) {
    throw new Error('videoCompilerNode requires state.outputDir to be set');
  }

  const remotionDir = path.join(outputDir, 'remotion');
  const srcDir = path.join(remotionDir, 'src');
  const scenesDir = path.join(srcDir, 'scenes');
  const publicDir = path.join(remotionDir, 'public');
  const assetsDir = path.join(publicDir, 'assets');

  // ── Step 1: Copy Remotion template ──

  console.log('    [1/6] Copying Remotion template...');
  try {
    copyTemplate(remotionDir);
    console.log(`          Template copied to ${remotionDir}`);
  } catch (err) {
    console.error(`          ERROR copying template: ${err.message}`);
    throw err;
  }

  // ── Step 2: Write theme.ts ──

  console.log('    [2/6] Writing theme.ts...');
  const themeContent = generateThemeTS(theme);
  const themePath = path.join(srcDir, 'theme.ts');
  fs.writeFileSync(themePath, themeContent, 'utf8');
  console.log(`          Theme: ${theme.headingFont || 'default'} / ${theme.primaryFont || 'default'}, primary=${theme.palette?.primary || '#2b7ec2'}`);

  // ── Step 3: Write Scene TSX files ──

  console.log('    [3/6] Writing scene files...');
  fs.mkdirSync(scenesDir, { recursive: true });

  let scenesWritten = 0;
  for (const scene of compiledScenes) {
    if (!scene.tsxContent) {
      console.log(`          Skipping Scene${scene.sceneNumber} (empty content${scene.error ? ': ' + scene.error : ''})`);
      continue;
    }
    const filePath = path.join(scenesDir, `Scene${scene.sceneNumber}.tsx`);
    fs.writeFileSync(filePath, scene.tsxContent, 'utf8');
    scenesWritten++;
  }
  console.log(`          Wrote ${scenesWritten} scene files`);

  // ── Step 4: Copy asset files ──

  console.log('    [4/6] Copying assets...');
  const { copied, written } = copyAssets(assets, assetsDir);
  console.log(`          Copied ${copied} files, wrote ${written} inline assets`);

  // ── Step 5: Generate Root.tsx ──

  console.log('    [5/6] Generating Root.tsx...');
  const totalFrames = resolvedTimeline.reduce((sum, s) => sum + s.total_frames, 0);
  const rootContent = generateRootTSX(resolvedTimeline, totalFrames);
  const rootPath = path.join(srcDir, 'Root.tsx');
  fs.writeFileSync(rootPath, rootContent, 'utf8');
  const totalSeconds = (totalFrames / CANVAS.fps).toFixed(1);
  console.log(`          Total: ${totalFrames} frames (${totalSeconds}s) across ${resolvedTimeline.length} scenes`);

  // ── Step 6: Generate edit manifest ──

  console.log('    [6/6] Generating edit manifest...');
  const editManifest = generateEditManifest(resolvedTimeline, assets, slug);
  const manifestPath = path.join(outputDir, 'edit-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(editManifest, null, 2), 'utf8');
  console.log(`          Manifest: ${editManifest.scenes.length} scenes, ${editManifest.total_frames} total frames`);

  // ── Summary ──

  const videoPath = path.join(outputDir, `${slug}.mp4`);
  console.log(`\n    Remotion project scaffolded at: ${remotionDir}`);
  console.log(`    To preview:  cd ${remotionDir} && npm install && npm start`);
  console.log(`    To render:   cd ${remotionDir} && npx remotion render WhiteboardVideo ${videoPath}`);

  return {
    videoPath,
    editManifest,
  };
}
