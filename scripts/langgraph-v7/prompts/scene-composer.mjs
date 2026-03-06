/**
 * v7 Scene Composer prompt.
 * LLM writes complete Remotion TSX per scene with full creative freedom.
 * No template/slot system — uses AbsoluteFill + absolute positioning.
 * Narration duration drives all animation timing.
 */
import path from 'path';

/**
 * Build the system prompt and user message for the scene composer LLM.
 *
 * @param {object} params
 * @param {object} params.scene - Scene from researchNotes (title, narration, teaching_points, visual_concept, assets_needed)
 * @param {Array}  params.assets - Generated assets for this scene
 * @param {object} params.theme - Theme object (colors, fonts, strokeWidth)
 * @param {number} params.narrationDuration - Actual TTS audio duration in seconds
 * @param {string|null} params.narrationFile - Path to narration WAV (null if none)
 * @param {number} params.fps - Frames per second
 * @param {number} params.width - Canvas width
 * @param {number} params.height - Canvas height
 * @param {number} params.sceneCount - Total number of scenes (for context)
 * @returns {{ system: string, user: string }}
 */
export function buildSceneComposerPrompt({
  scene,
  assets,
  theme,
  narrationDuration = 0,
  narrationFile = null,
  fps = 30,
  width = 1280,
  height = 720,
  sceneCount = 1,
}) {
  const sceneNumber = scene.scene_number || 1;
  const narrationFrames = Math.round(narrationDuration * fps);
  const totalFrames = narrationFrames + Math.round(0.5 * fps); // 0.5s buffer

  // Safe zone for 1280×720: 80px margin on sides, 60px top/bottom
  const safeLeft = 80;
  const safeRight = width - 80;   // 1200
  const safeTop = 60;
  const safeBottom = height - 60; // 660
  const safeWidth = safeRight - safeLeft;  // 1120
  const safeHeight = safeBottom - safeTop; // 600

  const system = `You are an expert Remotion (React video framework) developer writing whiteboard-style animated explainer video scenes. Your code compiles without TypeScript errors and produces smooth, professional animations.

## REMOTION IMPORTS

\`\`\`tsx
// From 'remotion' — core hooks and components:
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, Sequence, AbsoluteFill, staticFile, Img } from 'remotion';

// From '@remotion/media' — Audio component (NOT from 'remotion'):
import { Audio } from '@remotion/media';
\`\`\`

CRITICAL: Audio MUST be imported from '@remotion/media', never from 'remotion'.

## PROJECT COMPONENTS

Import from relative paths:

\`\`\`tsx
// Animation wrappers (from '../animations'):
import { WipeReveal, DrawOnSVG, FadeScale, FadeIn, Typewriter } from '../animations';

// Asset components (from '../components'):
import { StyledText, SVGAsset, ImageAsset } from '../components';

// Theme context (from '../ThemeContext'):
import { useTheme } from '../ThemeContext';
\`\`\`

### WipeReveal
Left-to-right clip-path text reveal. Use for ALL text elements.
\`\`\`tsx
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <WipeReveal durationFrames={45}>
    <StyledText variant="heading" color={theme.palette.primary}>Title Here</StyledText>
  </WipeReveal>
</Sequence>
\`\`\`

### DrawOnSVG
Stroke draw-on animation. Use for ALL SVG assets.
\`\`\`tsx
// Animate the whole SVG:
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <DrawOnSVG durationFrames={60} svgContent={MY_SVG} />
</Sequence>

// Animate sub-elements progressively (one per teaching beat):
<Sequence from={beat1Frame} durationInFrames={totalFrames - beat1Frame} layout="none">
  <DrawOnSVG durationFrames={30} svgContent={MY_SVG} elementId="s1_diagram__part1" />
</Sequence>
<Sequence from={beat2Frame} durationInFrames={totalFrames - beat2Frame} layout="none">
  <DrawOnSVG durationFrames={30} svgContent={MY_SVG} elementId="s1_diagram__part2" />
</Sequence>
\`\`\`

### FadeScale
Fade in with scale spring. Use for images and icons.
\`\`\`tsx
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <FadeScale durationFrames={30}>
    <Img src={staticFile('assets/icon.png')} style={{ width: 200, height: 200 }} />
  </FadeScale>
</Sequence>
\`\`\`

### StyledText variants
- "heading" — large title text (headingFont)
- "subheading" — medium title (headingFont)
- "body" — paragraph text (primaryFont)
- "label" — small caption (primaryFont)

## LAYOUT APPROACH

Use AbsoluteFill + absolute positioning. No template system.

\`\`\`tsx
<AbsoluteFill style={{ background: theme.background, overflow: 'hidden' }}>
  {/* Safe zone: left=${safeLeft}, right=${safeRight}, top=${safeTop}, bottom=${safeBottom} */}

  {/* Left panel — text content */}
  <div style={{ position: 'absolute', left: ${safeLeft}, top: ${safeTop}, width: 500 }}>
    {/* Title */}
    {/* Teaching points staggered */}
  </div>

  {/* Right panel — visual/diagram */}
  <div style={{ position: 'absolute', left: 640, top: ${safeTop}, width: 560, height: ${safeHeight} }}>
    {/* SVG or image */}
  </div>

  {/* Progress bar */}
  {/* Audio */}
</AbsoluteFill>
\`\`\`

Adapt the layout to the scene content — centered for title scenes, split for diagram+text scenes, full-width for large diagrams.

## ANIMATION TIMING SYSTEM

The narration audio defines the pacing. Divide narrationFrames by teaching_points count to get the beat duration:

\`\`\`tsx
const narrationFrames = ${narrationFrames}; // ${narrationDuration.toFixed(1)}s of narration
const fps = ${fps};
const totalFrames = ${totalFrames};

// Divide narration into beats (one per teaching point):
const teachingPoints = [/* from scene */];
const beatDuration = Math.floor(narrationFrames / teachingPoints.length);

// Each element enters at its beat:
const titleStart = 0;
const beat1Start = Math.floor(narrationFrames * 0);    // 0%
const beat2Start = Math.floor(narrationFrames * 0.33); // 33%
const beat3Start = Math.floor(narrationFrames * 0.66); // 66%
\`\`\`

## ANIMATION PATTERNS

### Hand-drawn underline:
\`\`\`tsx
const lineProgress = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
<svg width="300" height="12" style={{ position: 'absolute', bottom: -4, left: 0 }}>
  <path d="M0,6 Q75,3 150,7 Q225,10 300,5"
    stroke={theme.palette.secondary} strokeWidth={3}
    fill="none" strokeLinecap="round"
    strokeDasharray={320} strokeDashoffset={320 * (1 - lineProgress)}
  />
</svg>
\`\`\`

### Staggered list items:
\`\`\`tsx
{teachingPoints.map((point, i) => {
  const delay = beat1Start + i * beatDuration;
  return (
    <Sequence key={i} from={delay} durationInFrames={totalFrames - delay} layout="none">
      <WipeReveal durationFrames={40}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ color: theme.palette.accent1, fontSize: 22 }}>•</span>
          <StyledText variant="body">{point}</StyledText>
        </div>
      </WipeReveal>
    </Sequence>
  );
})}
\`\`\`

### Progress bar:
\`\`\`tsx
const progress = interpolate(frame, [0, totalFrames], [0, 100], { extrapolateRight: 'clamp' });
<div style={{ position: 'absolute', bottom: 0, left: 0, width: \`\${progress}%\`, height: 4, background: theme.palette.primary }} />
\`\`\`

### Audio:
\`\`\`tsx
import { Audio } from '@remotion/media'; // MUST be @remotion/media

<Audio src={staticFile('assets/narration_scene${sceneNumber}.wav')} volume={0.9} />
\`\`\`

## CRITICAL RULES

1. **Export**: \`export const Scene${sceneNumber}: React.FC = () => { ... }\`
2. **Hooks at top**: \`const frame = useCurrentFrame();\` and \`const { fps, durationInFrames: totalFrames } = useVideoConfig();\`
3. **Audio import**: ALWAYS \`import { Audio } from '@remotion/media'\` — NEVER from 'remotion'
4. **Text animation**: ALL text uses WipeReveal. No opacity fades for text.
5. **SVG animation**: ALL SVG assets use DrawOnSVG.
6. **Persistence**: Content MUST stay visible once animated in. Use \`durationInFrames={totalFrames - fromFrame}\` on every Sequence.
7. **Safe zone**: All content within left≥${safeLeft}, right≤${safeRight}, top≥${safeTop}, bottom≤${safeBottom}.
8. **No CSS transitions**: Use interpolate() or spring() — never CSS transition/animation properties.
9. **SVG inline**: Embed SVG content as a const string at file top. Use regular string concatenation if the SVG content has backticks — avoid nested template literals.
10. **Scene duration**: This scene has exactly ${totalFrames} frames (${narrationDuration.toFixed(1)}s narration + 0.5s buffer). Use useVideoConfig().durationInFrames as totalFrames.
11. **TypeScript**: Proper TypeScript, React.FC type. No 'any' types.
12. **Self-contained**: Complete TSX file — all imports at top, one exported component, nothing missing.
13. **Professional quality**: Good spacing, visual hierarchy, subtle motion. Stagger elements for visual interest.`;

  // Build assets description with inline SVG content
  const assetsDescription = (assets || []).map(a => {
    const parts = [`  - asset_id: "${a.asset_id}", type: "${a.type || a.asset_type}"`];
    if (a.filePath) {
      const fileName = path.basename(a.filePath);
      parts.push(`    file: staticFile('assets/${fileName}')`);
    }
    if (a.content) {
      parts.push(`    SVG content (${a.content.length} chars) — embed as const at file top:`);
      parts.push(`    \`\`\`svg\n${a.content.slice(0, 2000)}${a.content.length > 2000 ? '\n    ...(truncated)' : ''}\n    \`\`\``);
    }
    if (a.hasSubElements) {
      parts.push(`    hasSubElements: true — animate parts progressively using elementId`);
    }
    return parts.join('\n');
  }).join('\n\n');

  const narrationInfo = narrationDuration > 0
    ? `- Narration duration: ${narrationDuration.toFixed(1)}s = ${narrationFrames} frames\n- narrationFrames / teachingPoints.length = ${Math.floor(narrationFrames / Math.max(1, (scene.teaching_points || []).length))} frames per beat`
    : '- No narration audio';

  const audioLine = narrationFile
    ? `- Include: <Audio src={staticFile('assets/narration_scene${sceneNumber}.wav')} volume={0.9} />`
    : '- No audio file (skip Audio component)';

  const user = `Write the Remotion TSX component for Scene ${sceneNumber} of ${sceneCount}.

## Scene Content

**Title**: "${scene.title}"

**Narration** (spoken audio, defines the pacing):
"${scene.narration}"

**Teaching Points** (on-screen text, one per narration beat):
${(scene.teaching_points || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Visual Concept** (what to show):
"${scene.visual_concept || 'Educational content with text and diagrams'}"

## Timing

- FPS: ${fps}
- Total frames: ${totalFrames} (${(totalFrames / fps).toFixed(1)}s)
${narrationInfo}
${audioLine}

## Available Assets

${assetsDescription || '(No generated assets — build scene from text, hand-drawn SVG shapes, and styled text only)'}

## Canvas & Safe Zone

- Canvas: ${width}×${height}px
- Safe zone: left≥${safeLeft}, right≤${safeRight}, top≥${safeTop}, bottom≤${safeBottom}
- Safe area: ${safeWidth}×${safeHeight}px

## Theme

\`\`\`json
${JSON.stringify(theme, null, 2)}
\`\`\`

## Instructions

1. Choose a layout appropriate for the scene content:
   - Title/intro scenes: centered layout with large heading + subtext
   - Diagram scenes: left panel for text, right panel for diagram
   - List scenes: centered or left-aligned stacked list
   - Comparison scenes: two-column layout

2. Animate text with WipeReveal, timed to narration beats.

3. If SVG assets are available:
   - Embed the SVG as a const string at the top of the file
   - Use DrawOnSVG for animation
   - If hasSubElements is true, animate each sub-element at its corresponding narration beat

4. If no SVG assets: create a simple hand-drawn accent shape using inline SVG with stroke animation.

5. Add a progress bar (4px, bottom of canvas, animates from 0% to 100% over totalFrames).

6. Include Audio component if narration file is provided.

7. Ensure every animated element persists until scene end.

Return ONLY the complete TSX file. No markdown fences, no explanation.`;

  return { system, user };
}
