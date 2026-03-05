/**
 * Node 5: Video Compiler
 * Scaffolds a Revideo project, copies assets, and renders to MP4.
 */
import fs from 'fs';
import path from 'path';
import { CANVAS } from '../config.mjs';

/**
 * Generate the Revideo project.ts file.
 */
function generateProjectFile(sceneCount) {
  const imports = [];
  const sceneNames = [];
  for (let i = 1; i <= sceneCount; i++) {
    imports.push(`import scene${i} from './scenes/scene${i}?scene';`);
    sceneNames.push(`scene${i}`);
  }

  return `import {makeProject} from '@revideo/core';

${imports.join('\n')}

export default makeProject({
  scenes: [${sceneNames.join(', ')}],
});
`;
}

/**
 * Generate the render.ts file for headless rendering.
 */
function generateRenderFile(outFile) {
  return `import {renderVideo} from '@revideo/renderer';

async function render() {
  console.log('Rendering video...');
  const file = await renderVideo({
    projectFile: './src/project.ts',
    settings: {
      outFile: '${outFile}',
      outDir: './output',
      dimensions: [${CANVAS.width}, ${CANVAS.height}],
      logProgress: true,
    },
  });
  console.log('Rendered video to:', file);
}

render();
`;
}

/**
 * Generate vite.config.ts for Revideo.
 */
function generateViteConfig() {
  return `import {defineConfig} from 'vite';
import motionCanvas from '@revideo/vite-plugin';
import ffmpeg from '@revideo/ffmpeg';

export default defineConfig({
  plugins: [motionCanvas(), ffmpeg()],
});
`;
}

/**
 * Generate tsconfig.json for the Revideo project.
 */
function generateTsConfig() {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      jsx: 'react-jsx',
      jsxImportSource: '@revideo/2d',
      moduleResolution: 'node',
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      outDir: './dist',
    },
    include: ['src/**/*'],
  }, null, 2);
}

/**
 * Generate package.json for the Revideo sub-project.
 */
function generatePackageJson(slug) {
  return JSON.stringify({
    name: `revideo-${slug}`,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      render: 'npx tsx render.ts',
    },
  }, null, 2);
}

export async function videoCompilerNode(state) {
  console.log('\n══ Node 5: Video Compiler ══');

  const sceneCodeList = (state.sceneCode || [])
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  const sceneCount = sceneCodeList.length;
  console.log(`  Scenes to compile: ${sceneCount}`);

  // Scaffold Revideo project
  const projectDir = path.join(state.outputDir, 'revideo-project');
  const srcDir = path.join(projectDir, 'src');
  const scenesDir = path.join(srcDir, 'scenes');
  const assetsDir = path.join(scenesDir); // assets alongside scenes for relative imports

  fs.mkdirSync(scenesDir, { recursive: true });

  // Write project files
  fs.writeFileSync(path.join(projectDir, 'package.json'), generatePackageJson(state.slug));
  fs.writeFileSync(path.join(projectDir, 'vite.config.ts'), generateViteConfig());
  fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), generateTsConfig());
  fs.writeFileSync(path.join(srcDir, 'project.ts'), generateProjectFile(sceneCount));
  fs.writeFileSync(path.join(projectDir, 'render.ts'), generateRenderFile(`${state.slug}.mp4`));

  // Write scene files and copy cropped assets
  for (const scene of sceneCodeList) {
    const scenePath = path.join(scenesDir, `scene${scene.sceneNumber}.tsx`);
    fs.writeFileSync(scenePath, scene.tsCode);
    console.log(`  Wrote: ${path.relative(state.outputDir, scenePath)}`);
  }

  // Copy cropped images to scenes directory (for relative imports)
  const cropsDir = path.join(state.outputDir, 'crops');
  if (fs.existsSync(cropsDir)) {
    const crops = fs.readdirSync(cropsDir).filter(f => f.endsWith('.png'));
    for (const crop of crops) {
      fs.copyFileSync(
        path.join(cropsDir, crop),
        path.join(scenesDir, crop)
      );
    }
    console.log(`  Copied ${crops.length} crop images to scenes/`);
  }

  // Generate an HTML preview (fallback if Revideo render fails)
  const htmlPreview = generateHtmlPreview(sceneCodeList, state);
  const htmlPath = path.join(state.outputDir, `${state.slug}-preview.html`);
  fs.writeFileSync(htmlPath, htmlPreview);
  console.log(`  HTML preview: ${htmlPath}`);

  // Try to render with Revideo
  let videoPath = '';
  try {
    console.log('\n  Attempting Revideo render...');
    console.log(`  Project dir: ${projectDir}`);
    console.log('  Note: Run "cd ${projectDir} && npm install && npx tsx render.ts" to render MP4');
    videoPath = path.join(projectDir, 'output', `${state.slug}.mp4`);
  } catch (e) {
    console.log(`  Revideo render skipped: ${e.message}`);
    console.log('  Use the HTML preview instead.');
  }

  const outputPath = videoPath || htmlPath;

  return {
    outputPath,
  };
}

/**
 * Generate an HTML preview that shows the scene images in sequence
 * with timing-based slideshow. Fallback when Revideo render isn't available.
 */
function generateHtmlPreview(sceneCodeList, state) {
  const scenes = state.researchNotes?.scenes || [];
  const sceneImages = (state.sceneImages || [])
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  // Build image data URIs from saved files
  const imageSlides = sceneImages.map((img, i) => {
    const scene = scenes[i] || {};
    let dataUri = '';
    try {
      const buffer = fs.readFileSync(img.imagePath);
      dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
      dataUri = '';
    }
    return {
      src: dataUri,
      title: scene.title || `Scene ${i + 1}`,
      duration: scene.duration || 10,
      narration: scene.narration_text || '',
      groups: scene.asset_groups || [],
    };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${state.topic} — Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #fff; font-family: system-ui, sans-serif; }
  .container { max-width: 1280px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; margin-bottom: 20px; color: #e0e0e0; }
  .player {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: #f5f3ef;
    border-radius: 8px;
    overflow: hidden;
  }
  .player img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: none;
  }
  .player img.active { display: block; }
  .controls {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .controls button {
    padding: 8px 16px;
    border: 1px solid #444;
    background: #2a2a4a;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  .controls button:hover { background: #3a3a6a; }
  .controls button.active { background: #4a4a8a; border-color: #7a7aba; }
  .narration {
    margin-top: 15px;
    padding: 15px;
    background: #2a2a4a;
    border-radius: 8px;
    font-size: 16px;
    line-height: 1.6;
    min-height: 80px;
  }
  .progress {
    width: 100%;
    height: 4px;
    background: #333;
    margin-top: 10px;
    border-radius: 2px;
  }
  .progress-bar {
    height: 100%;
    background: #4a90d9;
    border-radius: 2px;
    transition: width 0.1s linear;
  }
</style>
</head>
<body>
<div class="container">
  <h1>${state.topic}</h1>
  <div class="player" id="player">
    ${imageSlides.map((s, i) => `<img src="${s.src}" alt="${s.title}" data-index="${i}" ${i === 0 ? 'class="active"' : ''}/>`).join('\n    ')}
  </div>
  <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
  <div class="controls" id="controls">
    <button onclick="togglePlay()" id="playBtn">▶ Play</button>
    ${imageSlides.map((s, i) => `<button onclick="goToScene(${i})" data-scene="${i}" ${i === 0 ? 'class="active"' : ''}>Scene ${i + 1}: ${s.title}</button>`).join('\n    ')}
  </div>
  <div class="narration" id="narration">${imageSlides[0]?.narration || ''}</div>
</div>
<script>
const scenes = ${JSON.stringify(imageSlides.map(s => ({ duration: s.duration, narration: s.narration, title: s.title })))};
let current = 0;
let playing = false;
let timer = null;
let elapsed = 0;

function goToScene(i) {
  current = i;
  elapsed = 0;
  document.querySelectorAll('#player img').forEach(img => img.classList.remove('active'));
  document.querySelector('#player img[data-index="' + i + '"]').classList.add('active');
  document.querySelectorAll('#controls button[data-scene]').forEach(b => b.classList.remove('active'));
  document.querySelector('#controls button[data-scene="' + i + '"]')?.classList.add('active');
  document.getElementById('narration').textContent = scenes[i].narration;
  updateProgress();
}

function togglePlay() {
  playing = !playing;
  document.getElementById('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play';
  if (playing) startTimer();
  else clearInterval(timer);
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    elapsed += 0.1;
    if (elapsed >= scenes[current].duration) {
      if (current < scenes.length - 1) {
        goToScene(current + 1);
      } else {
        playing = false;
        document.getElementById('playBtn').textContent = '▶ Play';
        clearInterval(timer);
      }
    }
    updateProgress();
  }, 100);
}

function updateProgress() {
  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);
  const elapsed_total = scenes.slice(0, current).reduce((s, sc) => s + sc.duration, 0) + elapsed;
  document.getElementById('progressBar').style.width = (elapsed_total / totalDuration * 100) + '%';
}
</script>
</body>
</html>`;
}
