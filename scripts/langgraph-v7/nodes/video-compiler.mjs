/**
 * Node: Video Compiler — DETERMINISTIC (no LLM calls).
 *
 * Scaffolds the Remotion project from LLM-written scene TSX files,
 * narration audio, and generated assets. Writes all files and generates
 * an edit manifest.
 *
 * Input:  state.compiledScenes, state.narrations, state.theme,
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

  return `export type Theme = {
  background: string;
  primaryFont: string;
  headingFont: string;
  palette: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    text: string;
  };
  strokeWidth: number;
};

export const DEFAULT_THEME: Theme = {
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

export const theme = DEFAULT_THEME;
export const defaultTheme = DEFAULT_THEME;
export default DEFAULT_THEME;
`;
}

// ── Root.tsx generator ─────────────────────────────────────────────

/**
 * Generate Root.tsx that imports all scenes, includes narration Audio
 * components, and wraps everything in a Composition.
 *
 * @param {Array} compiledScenes - Scene data with sceneNumber and durationFrames
 * @param {Array} narrations - Narration data with sceneNumber and filePath
 * @param {number} totalFrames - Total video duration in frames
 * @returns {string} Root.tsx content
 */
function generateRootTSX(compiledScenes, narrations, totalFrames) {
  // Sort scenes by scene number for deterministic ordering
  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  // Build a lookup of narration files by scene number
  const narrationMap = {};
  for (const n of narrations) {
    if (n && n.sceneNumber && n.filePath) {
      narrationMap[n.sceneNumber] = n;
    }
  }

  const hasNarrations = Object.keys(narrationMap).length > 0;

  // Build scene imports
  const sceneImports = sortedScenes
    .map(s => `import { Scene${s.sceneNumber} } from './scenes/Scene${s.sceneNumber}';`)
    .join('\n');

  // Calculate scene start frames and durations
  let frameOffset = 0;
  const sceneLayout = sortedScenes.map(s => {
    const dur = s.durationFrames || 150; // fallback ~5s at 30fps
    const entry = {
      sceneNumber: s.sceneNumber,
      startFrame: frameOffset,
      durationFrames: dur,
    };
    frameOffset += dur;
    return entry;
  });

  // Build scene Sequence elements (visual + narration audio)
  const sceneSequences = sceneLayout.map(s => {
    const lines = [];
    lines.push(`        <Sequence from={${s.startFrame}} durationInFrames={${s.durationFrames}} name="Scene ${s.sceneNumber}">`);
    lines.push(`          <Scene${s.sceneNumber} />`);
    lines.push(`        </Sequence>`);

    // Add narration Audio if available for this scene
    const narration = narrationMap[s.sceneNumber];
    if (narration) {
      const audioFileName = path.basename(narration.filePath);
      lines.push(`        <Sequence from={${s.startFrame}} durationInFrames={${s.durationFrames}} name="Narration ${s.sceneNumber}">`);
      lines.push(`          <Audio src={staticFile('assets/${audioFileName}')} volume={0.9} />`);
      lines.push(`        </Sequence>`);
    }

    return lines.join('\n');
  }).join('\n');

  // Build Remotion import list (Audio from @remotion/media per Remotion best practices)
  const remotionImports = ['Composition', 'Sequence'];
  if (hasNarrations) remotionImports.push('staticFile');

  return `import React from 'react';
import { ${remotionImports.join(', ')} } from 'remotion';
${hasNarrations ? "import { Audio } from '@remotion/media';" : ''}
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
 * Generate an edit manifest (JSON) describing all scenes, their assets,
 * and narration for future editing UI integration.
 *
 * @param {Array} compiledScenes - Compiled scene data from scene_composer
 * @param {Array} narrations - Narration data from narration_generator
 * @param {Array} assets - Generated assets
 * @param {string} slug - Project slug
 */
function generateEditManifest(compiledScenes, narrations, assets, slug) {
  // Build narration lookup
  const narrationMap = {};
  for (const n of narrations) {
    if (n && n.sceneNumber) {
      narrationMap[n.sceneNumber] = n;
    }
  }

  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  let frameOffset = 0;
  const scenes = sortedScenes.map(scene => {
    const dur = scene.durationFrames || 150;
    const narration = narrationMap[scene.sceneNumber];

    const entry = {
      scene_number: scene.sceneNumber,
      start_frame: frameOffset,
      total_frames: dur,
      has_narration: !!narration,
      narration_file: narration?.filePath ? path.basename(narration.filePath) : null,
      editable: true,
    };

    frameOffset += dur;
    return entry;
  });

  const totalFrames = frameOffset;

  return {
    slug,
    generated_at: new Date().toISOString(),
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
    total_frames: totalFrames,
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
      const rel = path.relative(TEMPLATE_DIR, src);
      // Skip template scene stubs (pipeline writes real scenes)
      if (rel.startsWith('src/scenes') && rel !== 'src/scenes') return false;
      // Skip public/assets — narrations + generated assets already live there
      if (rel.startsWith('public/assets') && rel !== 'public/assets') return false;
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

// ── Narration copier ───────────────────────────────────────────────

/**
 * Copy narration audio files to the Remotion public/assets directory.
 *
 * @param {Array} narrations - Narration data from narration_generator
 * @param {string} assetsDir - Destination public/assets directory
 * @returns {{ copied: number, skipped: number }}
 */
function copyNarrations(narrations, assetsDir) {
  fs.mkdirSync(assetsDir, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const narration of narrations) {
    if (!narration || !narration.filePath) {
      skipped++;
      continue;
    }

    const srcPath = narration.filePath;
    if (!fs.existsSync(srcPath)) {
      console.log(`          WARNING: Narration file not found: ${srcPath}`);
      skipped++;
      continue;
    }

    const destFile = path.join(assetsDir, path.basename(srcPath));
    fs.copyFileSync(srcPath, destFile);
    copied++;
  }

  return { copied, skipped };
}

// ── TSX sanitizer ──────────────────────────────────────────────────

/**
 * Fix common LLM-generated TSX issues before writing to disk:
 * 1. Remove premountFor prop (not in TypeScript types for this Remotion version)
 * 2. Remove duplicate CSS property keys within the same style={{ }} object
 * 3. Fix interpolate() calls that pass string color values (TS type error)
 * 4. Strip preamble text before the first import statement
 */
function sanitizeTSX(tsx) {
  let out = tsx.trim();

  // Strip preamble text before first import/export/comment
  const importIdx = out.search(/^(?:import|export|\/\*|\/\/)/m);
  if (importIdx > 0) out = out.slice(importIdx).trim();

  // Remove premountFor prop
  out = out.replace(/\s+premountFor=\{[^}]+\}/g, '');

  // Fix interpolate() with string color values → replace with theme color directly
  // Pattern: background: interpolate(frame, [...], ['#...', '#...'], ...)
  out = out.replace(
    /interpolate\([^,]+,\s*\[[^\]]+\],\s*\['[^']*'[^)]*\)\s*/g,
    (match) => {
      // Can't safely rewrite color interpolations — replace with a safe fallback
      // Extract first color value as static fallback
      const colorMatch = match.match(/'(#[0-9a-fA-F]+|rgba?[^']+)'/);
      return colorMatch ? `'${colorMatch[1]}'` : "'transparent'";
    }
  );

  // Remove duplicate keys in style objects (keep last occurrence)
  out = out.replace(/style=\{\{([\s\S]*?)\}\}/g, (match, body) => {
    const lines = body.split('\n');
    const seen = new Set();
    const deduped = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const keyMatch = lines[i].match(/^\s*([\w]+)\s*:/);
      if (keyMatch) {
        const key = keyMatch[1];
        if (seen.has(key)) continue;
        seen.add(key);
      }
      deduped.unshift(lines[i]);
    }
    return `style={{${deduped.join('\n')}}}`;
  });

  return out;
}

// ── Main node ──────────────────────────────────────────────────────

/**
 * Video Compiler node. Scaffolds the complete Remotion project:
 *
 * 1. Copies remotion-template to output directory
 * 2. Writes theme.ts with actual theme values
 * 3. Writes each Scene TSX file from compiledScenes (LLM-generated)
 * 4. Copies asset files to public/assets/
 * 5. Copies narration audio files to public/assets/
 * 6. Generates Root.tsx with scene imports, Composition, and Audio
 * 7. Generates edit-manifest.json
 *
 * @param {object} state - LangGraph state
 * @returns {{ videoPath: string, editManifest: object }}
 */
export async function videoCompilerNode(state) {
  console.log('\n  ── Video Compiler (deterministic) ──');

  const compiledScenes = state.compiledScenes || [];
  const narrations = state.narrations || [];
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

  console.log('    [1/7] Copying Remotion template...');
  try {
    copyTemplate(remotionDir);
    // Symlink node_modules from the template to avoid re-installing every run
    const templateModules = path.join(TEMPLATE_DIR, 'node_modules');
    const destModules = path.join(remotionDir, 'node_modules');
    if (fs.existsSync(templateModules) && !fs.existsSync(destModules)) {
      fs.symlinkSync(templateModules, destModules);
      console.log(`          Symlinked node_modules from template (no install needed)`);
    }
    console.log(`          Template copied to ${remotionDir}`);
  } catch (err) {
    console.error(`          ERROR copying template: ${err.message}`);
    throw err;
  }

  // ── Step 2: Write theme.ts ──

  console.log('    [2/7] Writing theme.ts...');
  const themeContent = generateThemeTS(theme);
  const themePath = path.join(srcDir, 'theme.ts');
  fs.writeFileSync(themePath, themeContent, 'utf8');
  console.log(`          Theme: ${theme.headingFont || 'default'} / ${theme.primaryFont || 'default'}, primary=${theme.palette?.primary || '#2b7ec2'}`);

  // ── Step 3: Write Scene TSX files (from LLM scene_writer) ──

  console.log('    [3/7] Writing scene files...');
  fs.mkdirSync(scenesDir, { recursive: true });

  let scenesWritten = 0;
  for (const scene of compiledScenes) {
    if (!scene.tsxContent) {
      console.log(`          Skipping Scene${scene.sceneNumber} (empty content${scene.error ? ': ' + scene.error : ''})`);
      continue;
    }
    const filePath = path.join(scenesDir, `Scene${scene.sceneNumber}.tsx`);
    fs.writeFileSync(filePath, sanitizeTSX(scene.tsxContent), 'utf8');
    scenesWritten++;
  }
  console.log(`          Wrote ${scenesWritten} scene files`);

  // ── Step 4: Copy asset files ──

  console.log('    [4/7] Copying assets...');
  const { copied, written } = copyAssets(assets, assetsDir);
  console.log(`          Copied ${copied} files, wrote ${written} inline assets`);

  // ── Step 5: Copy narration audio files ──

  console.log('    [5/7] Copying narration audio...');
  const narrationResult = copyNarrations(narrations, assetsDir);
  console.log(`          Copied ${narrationResult.copied} narration files, skipped ${narrationResult.skipped}`);

  // ── Step 6: Generate Root.tsx ──

  console.log('    [6/7] Generating Root.tsx...');
  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);
  const totalFrames = sortedScenes.reduce((sum, s) => sum + (s.durationFrames || 150), 0);
  const rootContent = generateRootTSX(compiledScenes, narrations, totalFrames);
  const rootPath = path.join(srcDir, 'Root.tsx');
  fs.writeFileSync(rootPath, rootContent, 'utf8');
  const totalSeconds = (totalFrames / CANVAS.fps).toFixed(1);
  console.log(`          Total: ${totalFrames} frames (${totalSeconds}s) across ${sortedScenes.length} scenes`);

  // ── Step 7: Generate edit manifest ──

  console.log('    [7/7] Generating edit manifest...');
  const editManifest = generateEditManifest(compiledScenes, narrations, assets, slug);
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
