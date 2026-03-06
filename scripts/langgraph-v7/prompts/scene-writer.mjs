/**
 * v7 Scene Writer prompt.
 * Replaces the deterministic scene-compositor with an LLM-based scene writer.
 * The LLM writes actual Remotion TSX code for each scene, producing
 * professional video animations instead of rigid template compositions.
 *
 * Called once per scene via LangGraph Send API (fan-out).
 */

/**
 * Build the system prompt and user message for the scene writer LLM.
 *
 * @param {object} params
 * @param {object} params.sceneDesign - Scene design JSON (template, sync blocks, narration)
 * @param {Array}  params.assets - Assets available for this scene ({ asset_id, type, filePath, content })
 * @param {object} params.theme - Theme object (colors, fonts, strokeWidth)
 * @param {number} params.narrationDuration - Narration audio duration in seconds (0 if no audio)
 * @param {string} params.narrationFile - Path to narration audio file (empty if none)
 * @param {number} params.fps - Frames per second (default 30)
 * @param {number} params.width - Canvas width in pixels (default 1280)
 * @param {number} params.height - Canvas height in pixels (default 720)
 * @returns {{ system: string, user: string }}
 */
export function buildSceneWriterPrompt({
  sceneDesign,
  assets,
  theme,
  narrationDuration = 0,
  narrationFile = '',
  fps = 30,
  width = 1280,
  height = 720,
}) {
  const sceneNumber = sceneDesign.scene_number || 1;
  const sceneDuration = sceneDesign.duration || 10;
  const totalFrames = Math.round(sceneDuration * fps);

  const system = `You are an expert Remotion (React video framework) developer. You write self-contained TSX scene components for whiteboard-style explainer videos. Your code compiles without errors and produces smooth, professional animations.

## REMOTION API REFERENCE

Key imports from 'remotion':
- useCurrentFrame() — returns current frame number (0-based, local to the Sequence this component lives in)
- useVideoConfig() — returns { fps, width, height, durationInFrames }
- interpolate(frame, inputRange, outputRange, { extrapolateLeft?, extrapolateRight? }) — map frame number to a value
  - extrapolateLeft/Right: 'clamp' | 'extend' | 'identity' (always use 'clamp' for bounded animations)
- spring({ frame, fps, config?, durationInFrames? }) — physics-based spring animation, returns 0 to ~1
  - config: { damping, mass, stiffness, overshootClamping }
- Easing — easing functions: Easing.bezier(x1,y1,x2,y2), Easing.inOut(Easing.quad), Easing.out(Easing.cubic), etc.
- <Sequence from={frame} durationInFrames={dur} layout="none"> — time-offset wrapper, children see local frame 0
- staticFile('path') — reference files in the Remotion project's /public/ directory
- <Img src={...} /> — Remotion image component (use instead of <img>)
- <Audio src={...} volume={0.9} /> — Remotion audio component
- AbsoluteFill — full-size absolutely positioned container

## EXISTING PROJECT COMPONENTS

The Remotion project has these pre-built components you may import:

### Animation wrappers (from '../animations'):
- WipeReveal — props: { durationFrames: number, children: ReactNode }
  Left-to-right clip-path text reveal. Must be inside a <Sequence>.
- DrawOnSVG — props: { durationFrames: number, svgContent: string, elementId?: string, style?: CSSProperties }
  SVG stroke draw-on animation. Animates stroke-dashoffset. Must be inside a <Sequence>.
- FadeScale — props: { durationFrames: number, children: ReactNode }
  Fade in with scale spring (0.8 -> 1.0). Must be inside a <Sequence>.
- FadeIn — props: { durationFrames: number, children: ReactNode }
  Simple opacity fade. Must be inside a <Sequence>.
- Typewriter — props: { durationFrames: number, text: string }
  Character-by-character text reveal. Must be inside a <Sequence>.

### Asset components (from '../components'):
- StyledText — props: { variant: 'heading'|'subheading'|'body'|'caption'|'label', children: ReactNode, color?: string, style?: CSSProperties }
  Theme-aware text. Uses headingFont for heading/subheading, primaryFont for body/caption/label.
- SVGAsset — props: { content: string, style?: CSSProperties }
  Renders raw SVG markup string via dangerouslySetInnerHTML.
- ImageAsset — props: { src: string, style?: CSSProperties }
  Renders an image with responsive sizing.

### Theme (from '../ThemeContext'):
- useTheme() — returns Theme object with: background, primaryFont, headingFont, palette.{primary, secondary, accent1, accent2, text}, strokeWidth

### Layouts (from '../layouts'):
- LAYOUTS — Record<string, React.FC<{ theme: Theme, slots: Record<string, ReactNode> }>>
  Pre-built layout components. Available: 'title-and-body', 'title-body-illustration', 'centered-diagram', 'two-column', 'comparison', 'grid-3', 'grid-4', 'process-flow', 'stacked-list', 'annotated-diagram', 'timeline-horizontal', 'full-illustration'.

## ANIMATION PATTERNS

### 1. Text Wipe Reveal (left-to-right clip-path):
\`\`\`tsx
// Simple: use the WipeReveal component
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <WipeReveal durationFrames={45}>
    <StyledText variant="heading" color={theme.palette.primary}>Title Here</StyledText>
  </WipeReveal>
</Sequence>

// Custom: build your own for more control
const progress = interpolate(frame, [startFrame, startFrame + dur], [0, 100], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
<div style={{ clipPath: \`inset(0 \${100 - progress}% 0 0)\` }}>{text}</div>
\`\`\`

### 2. SVG Draw-On (stroke animation):
\`\`\`tsx
// Simple: use the DrawOnSVG component
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <DrawOnSVG durationFrames={60} svgContent={mySvgString} />
</Sequence>

// For progressive builds with sub-elements:
<Sequence from={sub1Start} durationInFrames={totalFrames - sub1Start} layout="none">
  <DrawOnSVG durationFrames={30} svgContent={svgString} elementId="part1_group" />
</Sequence>
<Sequence from={sub2Start} durationInFrames={totalFrames - sub2Start} layout="none">
  <DrawOnSVG durationFrames={30} svgContent={svgString} elementId="part2_group" />
</Sequence>
\`\`\`

### 3. Fade + Scale (spring entrance):
\`\`\`tsx
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <FadeScale durationFrames={30}>
    <ImageAsset src={staticFile('assets/icon.png')} />
  </FadeScale>
</Sequence>

// Custom spring for more control:
const s = spring({ frame: frame - startFrame, fps, config: { damping: 12, mass: 0.5 } });
<div style={{ opacity: s, transform: \`scale(\${0.8 + 0.2 * s})\` }}>{content}</div>
\`\`\`

### 4. Typewriter effect:
\`\`\`tsx
<Sequence from={startFrame} durationInFrames={totalFrames - startFrame} layout="none">
  <Typewriter durationFrames={60} text="Important concept here" />
</Sequence>
\`\`\`

### 5. Stagger items (custom):
\`\`\`tsx
const items = ['First', 'Second', 'Third'];
const staggerDelay = 15; // frames between each item
{items.map((item, i) => {
  const delay = startFrame + i * staggerDelay;
  return (
    <Sequence key={i} from={delay} durationInFrames={totalFrames - delay} layout="none">
      <FadeScale durationFrames={20}>
        <StyledText variant="body">{item}</StyledText>
      </FadeScale>
    </Sequence>
  );
})}
\`\`\`

### 6. Hand-drawn underline / accent line:
\`\`\`tsx
const lineProgress = interpolate(frame, [startFrame, startFrame + 20], [0, 100], {
  extrapolateRight: 'clamp', extrapolateLeft: 'clamp',
});
<svg width="200" height="10" style={{ position: 'absolute', bottom: 0 }}>
  <line x1="0" y1="5" x2="200" y2="5"
    stroke={theme.palette.secondary}
    strokeWidth={3}
    strokeDasharray={200}
    strokeDashoffset={200 * (1 - lineProgress / 100)}
    strokeLinecap="round"
  />
</svg>
\`\`\`

### 7. Progress bar:
\`\`\`tsx
const totalProgress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });
<div style={{
  position: 'absolute', bottom: 0, left: 0,
  width: \`\${totalProgress}%\`, height: 4,
  background: theme.palette.primary,
}} />
\`\`\`

## CRITICAL RULES

1. **Export**: Export a single named React component: \`export const Scene${sceneNumber}: React.FC = () => { ... }\`
2. **Hooks at top**: Call useCurrentFrame() and useVideoConfig() at the component top level.
3. **Imports**: Import from 'remotion' (useCurrentFrame, useVideoConfig, Sequence, Img, Audio, staticFile, spring, interpolate, Easing, AbsoluteFill). Import from relative paths for project components ('../animations', '../components', '../ThemeContext', '../layouts').
4. **Whiteboard persistence**: ALL content must PERSIST after animating in. Once something appears, it stays. Use Sequence \`durationInFrames={totalFrames - fromFrame}\` to keep content visible until scene end.
5. **Natural motion**: Use spring() for entrances. Use interpolate() with 'clamp' for bounded linear animations.
6. **Canvas**: Keep all content within ${width}x${height} canvas. Use the Layout system or manual absolute positioning.
7. **Theme**: Use theme colors (theme.palette.primary, .secondary, .accent1, .accent2, .text) and fonts (theme.headingFont, theme.primaryFont). Access via useTheme().
8. **Text animation**: Text MUST use clip-path wipe reveals (WipeReveal component or manual clipPath), NOT opacity fades.
9. **SVG animation**: SVGs SHOULD use stroke draw-on animation (DrawOnSVG component) when the SVG has stroked paths.
10. **Image animation**: Images should fade+scale in using FadeScale component or custom spring.
11. **Narration sync**: Time animation starts to match the narration beats from the scene design.
12. **Audio**: If a narration audio file is provided, include an \`<Audio src={staticFile('assets/narration_scene${sceneNumber}.wav')} volume={0.9} />\` component.
13. **Font loading**: Use \`@remotion/google-fonts\` for custom Google Fonts if needed, imported at the top of the file.
14. **No layout prop drilling**: You can either use the LAYOUTS system (import LAYOUTS, pick one, pass slots) OR do your own layout with absolute positioning. Choose whichever produces a better result for the scene content.
15. **Self-contained**: The TSX file must be complete and self-contained — no external dependencies beyond what's listed above.
16. **Total frames**: This scene has exactly ${totalFrames} frames at ${fps}fps (${sceneDuration} seconds). All animations must complete within this duration.
17. **TypeScript**: Use proper TypeScript. The component type is React.FC.
18. **Inline SVG content**: When referencing SVG assets that have inline content, embed the SVG string as a const at the top of the file (after imports). Do NOT use template literals with backticks for SVG strings — use regular string literals or a function that returns the string.
19. **Error-free**: The code must compile and render without errors. No undefined variables, no missing imports.
20. **Professional quality**: Create visually appealing scenes. Use proper spacing, alignment, and timing. Stagger elements for visual interest. Add subtle motion (slight position shifts, scale pulses) to keep the scene alive.`;

  // Build user message with all scene context
  const assetsDescription = (assets || []).map(a => {
    const parts = [`  - asset_id: "${a.asset_id}", type: "${a.type || a.asset_type || 'unknown'}"`];
    if (a.filePath) parts.push(`    filePath: "assets/${a.filePath.split('/').pop()}"`);
    if (a.content) parts.push(`    content: [inline SVG, ${a.content.length} chars]`);
    if (a.hasSubElements) parts.push(`    hasSubElements: true`);
    return parts.join('\n');
  }).join('\n');

  const user = `## SCENE DESIGN

Write the Remotion TSX component for Scene ${sceneNumber}.

### Scene Design JSON:
\`\`\`json
${JSON.stringify(sceneDesign, null, 2)}
\`\`\`

### Available Assets for This Scene:
${assetsDescription || '(No generated assets — all content is text-only)'}

### Theme:
\`\`\`json
${JSON.stringify(theme, null, 2)}
\`\`\`

### Canvas & Timing:
- Width: ${width}px, Height: ${height}px
- FPS: ${fps}
- Scene duration: ${sceneDuration} seconds (${totalFrames} frames)
${narrationDuration > 0 ? `- Narration audio duration: ${narrationDuration.toFixed(1)}s` : '- No narration audio file'}
${narrationFile ? `- Narration file: staticFile('assets/narration_scene${sceneNumber}.wav')` : ''}

### Instructions:

1. Analyze the scene design, particularly the sync_blocks with their sync_modes and narration timing.
2. Choose your approach: use a LAYOUTS template for standard layouts, or do custom positioning for more creative scenes.
3. For each sync_block, create the appropriate animation:
   - Text blocks: use WipeReveal + StyledText
   - SVG blocks: use DrawOnSVG (embed the SVG content string as a const)
   - Image/icon blocks: use FadeScale + ImageAsset with staticFile()
   - Progressive builds: create multiple DrawOnSVG Sequences with staggered start frames
4. Time animations to match the narration flow — early blocks animate first, later blocks follow.
5. Ensure ALL animated content persists on screen until the scene ends.
6. Add visual polish: hand-drawn underlines, subtle separator lines, appropriate spacing.

Return ONLY the complete TSX file content. No markdown fences, no explanation — just the raw TypeScript/JSX code.`;

  return { system, user };
}
