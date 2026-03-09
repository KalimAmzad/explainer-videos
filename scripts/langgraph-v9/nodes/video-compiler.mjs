/**
 * Node: Video Compiler — DETERMINISTIC (no LLM calls).
 *
 * v9 version — no external assets to verify.
 * Scaffolds Remotion project from scene coder's TSX + TTS audio.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CANVAS, PATHS } from '../config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = PATHS.remotionTemplate;

// ── Theme file generator ───────────────────────────────────────────

function generateThemeTS(theme) {
  const t = {
    background: theme?.background || '#0f1117',
    primaryFont: theme?.primaryFont || 'Inter',
    headingFont: theme?.headingFont || 'Inter',
    palette: {
      primary:   theme?.palette?.primary   || '#6366f1',
      secondary: theme?.palette?.secondary || '#f59e0b',
      accent1:   theme?.palette?.accent1   || '#10b981',
      accent2:   theme?.palette?.accent2   || '#ec4899',
      text:      theme?.palette?.text      || '#f1f5f9',
    },
    strokeWidth: theme?.strokeWidth ?? 2,
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

function generateRootTSX(compiledScenes, narrations, totalFrames) {
  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  const narrationMap = {};
  for (const n of narrations) {
    if (n?.sceneNumber && n?.filePath) narrationMap[n.sceneNumber] = n;
  }

  const hasNarrations = Object.keys(narrationMap).length > 0;
  const sceneImports = sortedScenes
    .map(s => `import { Scene${s.sceneNumber} } from './scenes/Scene${s.sceneNumber}';`)
    .join('\n');

  let frameOffset = 0;
  const sceneLayout = sortedScenes.map(s => {
    const dur = s.durationFrames || 450;
    const entry = { sceneNumber: s.sceneNumber, startFrame: frameOffset, durationFrames: dur };
    frameOffset += dur;
    return entry;
  });

  const sceneSequences = sceneLayout.map(s => {
    const lines = [];
    lines.push(`        <Sequence from={${s.startFrame}} durationInFrames={${s.durationFrames}} name="Scene ${s.sceneNumber}">`);
    lines.push(`          <Scene${s.sceneNumber} />`);
    lines.push(`        </Sequence>`);

    const narration = narrationMap[s.sceneNumber];
    if (narration) {
      const audioFileName = path.basename(narration.filePath);
      lines.push(`        <Sequence from={${s.startFrame}} durationInFrames={${s.durationFrames}} name="Narration ${s.sceneNumber}">`);
      lines.push(`          <Audio src={staticFile('assets/${audioFileName}')} volume={0.9} />`);
      lines.push(`        </Sequence>`);
    }
    return lines.join('\n');
  }).join('\n');

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
      id="CourseVideo"
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

// ── Edit manifest ──────────────────────────────────────────────────

function generateEditManifest(compiledScenes, narrations, slug) {
  const narrationMap = {};
  for (const n of narrations) {
    if (n?.sceneNumber) narrationMap[n.sceneNumber] = n;
  }

  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  let frameOffset = 0;
  const scenes = sortedScenes.map(scene => {
    const dur = scene.durationFrames || 450;
    const narration = narrationMap[scene.sceneNumber];
    const entry = {
      scene_number: scene.sceneNumber,
      start_frame: frameOffset,
      total_frames: dur,
      has_narration: !!narration,
      narration_file: narration?.filePath ? path.basename(narration.filePath) : null,
      narration_segments: scene.narrationSegments?.length || 0,
    };
    frameOffset += dur;
    return entry;
  });

  return {
    slug,
    generated_at: new Date().toISOString(),
    pipeline: 'v9',
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
    total_frames: frameOffset,
    scenes,
  };
}

// ── Template copier ────────────────────────────────────────────────

function copyTemplate(destDir) {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Remotion template not found at: ${TEMPLATE_DIR}`);
  }
  fs.cpSync(TEMPLATE_DIR, destDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      const rel = path.relative(TEMPLATE_DIR, src);
      if (rel === 'node_modules' || rel.startsWith('node_modules/')) return false;
      if (rel.startsWith('src/scenes') && rel !== 'src/scenes') return false;
      if (rel.startsWith('public/assets') && rel !== 'public/assets') return false;
      return true;
    },
  });
}

// ── TSX sanitizer ────────────────────────────────────────────────

const ANIMATED_EMOJI_TO_NATIVE = {
  'light-bulb': '💡', 'sparkles': '✨', 'glowing-star': '🌟', 'direct-hit': '🎯',
  'fire': '🔥', 'rocket': '🚀', 'star-struck': '🤩', 'party-popper': '🎉',
  'muscle': '💪', 'graduation-cap': '🎓', 'thumbs-up': '👍', 'raising-hands': '🙌',
  'check-mark': '✅', 'cross-mark': '❌', 'clap': '👏', 'rainbow': '🌈',
  'electricity': '⚡', 'gear': '⚙️', 'eyes': '👀', 'hot-beverage': '☕',
  'plant': '🌱', 'alarm-clock': '⏰', 'folded-hands': '🙏', 'thinking-face': '🤔',
  'red-heart': '❤️', '100': '💯', 'gem-stone': '💎', 'butterfly': '🦋',
};

function sanitizeTSX(tsx) {
  let out = tsx.trim();

  // Strip trailing markers (---TSX_CODE---, ```, ---)
  out = out.replace(/\n---[\w_]*---\s*$/, '').replace(/\n```\s*$/, '').replace(/\n---\s*$/, '').trimEnd();

  // Strip preamble
  const importIdx = out.search(/^(?:import|export|\/\*|\/\/)/m);
  if (importIdx > 0) out = out.slice(importIdx).trim();

  // Remove premountFor
  out = out.replace(/\s+premountFor=\{[^}]+\}/g, '');

  // Remove ctrl char artifacts
  out = out.replace(/<ctrl\d+>/g, '').replace(/<\/ctrl\d+>/g, '');

  // Fix google-fonts import path
  out = out.replace(/@remotion\/google-fonts\/([A-Za-z][A-Za-z0-9-]*)/g, (m, name) => {
    const pascal = name.replace(/-([a-zA-Z])/g, (_, c) => c.toUpperCase()).replace(/^([a-z])/, (_, c) => c.toUpperCase());
    return `@remotion/google-fonts/${pascal}`;
  });

  // Remove AnimatedEmoji imports and replace with native emoji
  out = out.replace(/import\s*\{[^}]*AnimatedEmoji[^}]*\}\s*from\s*['"]@remotion\/animated-emoji['"];?\n?/g, '');
  out = out.replace(/<AnimatedEmoji\s+emoji="([^"]+)"[^/]*/g, (match, name) => {
    const native = ANIMATED_EMOJI_TO_NATIVE[name] || '✨';
    return `<span style={{fontSize: '2.5rem', lineHeight: 1}}>${native}</span`;
  });
  out = out.replace(/<AnimatedEmoji[^/]*\/>/g, '<span style={{fontSize: "2.5rem", lineHeight: 1}}>✨</span>');

  // Fix interpolate with string colors
  out = out.replace(
    /interpolate\([^,]+,\s*\[[^\]]+\],\s*\['[^']*'[^)]*\)\s*/g,
    (match) => {
      const colorMatch = match.match(/'(#[0-9a-fA-F]+|rgba?[^']+)'/);
      return colorMatch ? `'${colorMatch[1]}'` : "'transparent'";
    }
  );

  // Fix spring() missing frame
  out = out.replace(/spring\(\s*\{\s*\n?\s*fps\s*,?\s*\n?\s*\}\s*\)/g, 'spring({ frame: Math.max(0, frame), fps })');
  out = out.replace(/spring\(\s*\{\s*fps\s*\}\s*\)/g, 'spring({ frame: Math.max(0, frame), fps })');

  // Remove mapRange
  out = out.replace(/,\s*mapRange/g, '').replace(/mapRange,\s*/g, '');
  out = out.replace(/import\s*\{\s*\}\s*from\s*'@remotion\/animation-utils';?\n?/g, '');
  if (out.includes('mapRange(')) {
    const polyfill = `\nconst mapRange = (v: number, fL: number, fH: number, tL: number, tH: number) =>\n  interpolate(v, [fL, Math.max(fL + 0.001, fH)], [tL, tH], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });\n`;
    const lastImport = out.lastIndexOf('\nimport ');
    const insertAt = out.indexOf('\n', lastImport + 1) + 1;
    out = out.slice(0, insertAt) + polyfill + out.slice(insertAt);
  }

  // Ensure staticFile is imported if used
  if (out.includes('staticFile(') && !/import\s*\{[^}]*staticFile[^}]*\}\s*from\s*['"]remotion['"]/.test(out)) {
    const remotionImport = out.match(/import\s*\{([^}]+)\}\s*from\s*['"]remotion['"]/);
    if (remotionImport) {
      const existing = remotionImport[1];
      if (!existing.includes('staticFile')) {
        out = out.replace(remotionImport[0], remotionImport[0].replace(remotionImport[1], `${existing.trimEnd()}, staticFile `));
      }
    } else {
      out = `import { staticFile } from 'remotion';\n${out}`;
    }
  }

  // Ensure Img is imported if used
  if (out.includes('<Img ') && !/import\s*\{[^}]*Img[^}]*\}\s*from\s*['"]remotion['"]/.test(out)) {
    const remotionImport = out.match(/import\s*\{([^}]+)\}\s*from\s*['"]remotion['"]/);
    if (remotionImport && !remotionImport[1].includes('Img')) {
      out = out.replace(remotionImport[0], remotionImport[0].replace(remotionImport[1], `${remotionImport[1].trimEnd()}, Img `));
    }
  }

  // Ensure Audio import exists if used
  if (out.includes('<Audio ') && !/import\s*\{[^}]*Audio[^}]*\}\s*from\s*['"]@remotion\/media['"]/.test(out)) {
    // Check if it's wrongly imported from 'remotion'
    if (/import\s*\{[^}]*Audio[^}]*\}\s*from\s*['"]remotion['"]/.test(out)) {
      // Remove Audio from remotion import and add separate @remotion/media import
      out = out.replace(/,?\s*Audio\s*,?/g, (match, offset) => {
        // Only remove from the remotion import line
        const lineStart = out.lastIndexOf('\n', offset);
        const lineEnd = out.indexOf('\n', offset);
        const line = out.slice(lineStart, lineEnd);
        if (line.includes("from 'remotion'") || line.includes('from "remotion"')) {
          return match.startsWith(',') ? '' : '';
        }
        return match;
      });
    }
    // Add Audio import if not present
    if (!/import\s*\{[^}]*Audio[^}]*\}\s*from\s*['"]@remotion\/media['"]/.test(out)) {
      const lastImport = out.lastIndexOf('\nimport ');
      const insertAt = out.indexOf('\n', lastImport + 1) + 1;
      out = out.slice(0, insertAt) + "import { Audio } from '@remotion/media';\n" + out.slice(insertAt);
    }
  }

  // Dedup CSS keys in style objects
  out = out.replace(/style=\{\{([\s\S]*?)\}\}/g, (match, body) => {
    const lines = body.split('\n');
    const seen = new Set();
    const deduped = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const keyMatch = lines[i].match(/^\s*([\w]+)\s*:/);
      if (keyMatch) {
        if (seen.has(keyMatch[1])) continue;
        seen.add(keyMatch[1]);
      }
      deduped.unshift(lines[i]);
    }
    return `style={{${deduped.join('\n')}}}`;
  });

  // Fix unquoted CSS unit values
  out = out.replace(/:\s*(\d+(?:\.\d+)?)(rem|em|vh|vw|%)(\s*[,}\)])/g, ": '$1$2'$3");

  // Remove unused google-fonts imports
  out = out.replace(/import\s*\{\s*loadFont\s+as\s+(\w+)\s*\}\s*from\s*'@remotion\/google-fonts\/[^']+';?\n?/g, (match, alias) => {
    const rest = out.replace(match, '');
    if (!rest.includes(alias)) return '';
    return match;
  });

  return out;
}

// ── Main node ──────────────────────────────────────────────────────

export async function videoCompilerNode(state) {
  console.log('\n  ── Video Compiler (deterministic) ──');

  const compiledScenes = (state.revisedScenes?.length > 0 ? state.revisedScenes : state.compiledScenes) || [];
  const narrations = state.narrations || [];
  const theme = state.theme || {};
  const outputDir = state.outputDir;
  const slug = state.slug || 'untitled';

  if (!outputDir) throw new Error('videoCompilerNode requires state.outputDir');

  const remotionDir = path.join(outputDir, 'remotion');
  const srcDir = path.join(remotionDir, 'src');
  const scenesDir = path.join(srcDir, 'scenes');
  const assetsDir = path.join(remotionDir, 'public', 'assets');

  // ── Step 1: Copy Remotion template ──
  console.log('    [1/5] Copying Remotion template...');
  copyTemplate(remotionDir);
  const templateModules = path.join(TEMPLATE_DIR, 'node_modules');
  const destModules = path.join(remotionDir, 'node_modules');
  if (fs.existsSync(templateModules) && !fs.existsSync(destModules)) {
    fs.symlinkSync(templateModules, destModules);
    console.log(`          Symlinked node_modules`);
  }
  console.log(`          Template copied to ${remotionDir}`);

  // ── Step 2: Write theme.ts ──
  console.log('    [2/5] Writing theme.ts...');
  fs.writeFileSync(path.join(srcDir, 'theme.ts'), generateThemeTS(theme), 'utf8');
  console.log(`          Theme: ${theme.headingFont || 'default'}, primary=${theme.palette?.primary || '?'}`);

  // ── Step 3: Write Scene TSX files (sanitized) ──
  console.log('    [3/5] Writing scene files...');
  fs.mkdirSync(scenesDir, { recursive: true });
  let scenesWritten = 0;
  for (const scene of compiledScenes) {
    if (!scene.tsxContent) {
      console.log(`          Skipping Scene${scene.sceneNumber} (empty)`);
      continue;
    }
    fs.writeFileSync(
      path.join(scenesDir, `Scene${scene.sceneNumber}.tsx`),
      sanitizeTSX(scene.tsxContent),
      'utf8',
    );
    scenesWritten++;
  }
  console.log(`          Wrote ${scenesWritten} scene files (sanitized)`);

  // ── Step 4: Adjust durations from TTS + Generate Root.tsx ──
  console.log('    [4/5] Adjusting durations from TTS audio + generating Root.tsx...');
  const narrationMap = {};
  for (const n of narrations) {
    if (n?.sceneNumber && n?.duration) narrationMap[n.sceneNumber] = n;
  }

  // Adjust scene durations: use actual TTS audio duration when available
  const sortedScenes = [...compiledScenes]
    .filter(s => s.tsxContent)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  for (const scene of sortedScenes) {
    const narration = narrationMap[scene.sceneNumber];
    if (narration && narration.duration > 0) {
      const audioDurationFrames = Math.round((narration.duration + 1.0) * CANVAS.fps); // +1s buffer
      const oldFrames = scene.durationFrames;
      scene.durationFrames = audioDurationFrames;
      console.log(`          Scene ${scene.sceneNumber}: ${oldFrames} → ${audioDurationFrames} frames (matched to ${narration.duration.toFixed(1)}s TTS audio)`);
    }
  }

  const totalFrames = sortedScenes.reduce((sum, s) => sum + (s.durationFrames || 450), 0);
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'Root.tsx'), generateRootTSX(sortedScenes, narrations, totalFrames), 'utf8');
  console.log(`          Total: ${totalFrames} frames (${(totalFrames / CANVAS.fps).toFixed(1)}s)`);

  // ── Step 5: Generate edit manifest ──
  console.log('    [5/5] Generating edit manifest...');
  const editManifest = generateEditManifest(compiledScenes, narrations, slug);
  fs.writeFileSync(path.join(outputDir, 'edit-manifest.json'), JSON.stringify(editManifest, null, 2), 'utf8');
  console.log(`          Manifest: ${editManifest.scenes.length} scenes, ${editManifest.total_frames} total frames`);

  const videoPath = path.join(outputDir, `${slug}.mp4`);
  console.log(`\n    Remotion project scaffolded at: ${remotionDir}`);
  console.log(`    To preview:  cd ${remotionDir} && npm start`);
  console.log(`    To render:   cd ${remotionDir} && npx remotion render CourseVideo ${videoPath}`);

  return { videoPath, editManifest };
}
