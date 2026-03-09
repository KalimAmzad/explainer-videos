/**
 * v8 Scene Coder prompt — single-pass TSX generation.
 *
 * Given a complete storyboard spec + resolved assets + narration timing,
 * writes one Remotion TSX component. NO TOOLS, NO AGENT LOOP.
 */

export function buildSceneCoderPrompt({
  sceneSpec,
  resolvedAssets,
  narrationDuration,
  hasNarrationFile,
  sceneNumber,
  totalScenes,
  theme,
  fps = 30,
  width = 1280,
  height = 720,
}) {
  const narrationFrames = Math.round(narrationDuration * fps);
  const totalFrames = narrationFrames + Math.round(0.5 * fps);
  const teachingPoints = sceneSpec.content_blocks?.filter(b => b.type === 'teaching_point') || [];
  const pointCount = Math.max(1, teachingPoints.length);
  const beatFrames = Math.max(30, Math.floor(narrationFrames / pointCount));

  // Build resolved asset mapping
  const assetLines = (sceneSpec.assets || []).map(a => {
    const resolved = resolvedAssets.find(r => r.id === a.id);
    if (resolved?.status === 'ok') {
      return `- ${a.id} → staticFile('assets/${a.id}.png') ✅ (${a.type})`;
    }
    return `- ${a.id} → FAILED (use emoji fallback) ❌`;
  }).join('\n');

  const system = `You are an expert Remotion developer producing premium animated infographic course videos. You receive a complete visual storyboard and write a single Scene component — no creative decisions needed, just precise implementation.

## REMOTION IMPORTS

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, staticFile, Img } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { interpolateStyles } from '@remotion/animation-utils';

// Google Fonts — ALWAYS capitalize the font name in the import path
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DM-Sans';
import { loadFont as loadPlusJakarta } from '@remotion/google-fonts/Plus-Jakarta-Sans';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';
// Usage: const { fontFamily } = loadInter(); — call at component top level
\`\`\`

## TIMING HELPER
\`\`\`tsx
const { fps, durationInFrames } = useVideoConfig();
const frame = useCurrentFrame();
const t = (sec: number) => Math.round(sec * fps);
\`\`\`

## ANIMATION IMPLEMENTATIONS

### wipe_reveal (for titles/text)
\`\`\`tsx
const titleWipe = interpolate(frame, [t(delay), Math.max(t(delay)+1, t(delay + 0.6))], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
<div style={{ clipPath: \`inset(0 \${100 - titleWipe}% 0 0)\` }}>
  <h1>Title</h1>
</div>
\`\`\`

### spring_slide (for cards/items, staggered)
\`\`\`tsx
const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 220 } });
<div style={{ opacity: s, transform: \`translateY(\${(1-s)*32}px)\` }}>
  {/* card content */}
</div>
\`\`\`

### fade_scale (for hero images)
\`\`\`tsx
const heroS = spring({ frame: Math.max(0, frame - t(delay)), fps, config: { damping: 14, stiffness: 180 } });
<div style={{ opacity: heroS, transform: \`scale(\${0.7 + 0.3 * heroS})\` }}>
  <Img src={staticFile('assets/hero.png')} style={{ width: 220, height: 220, borderRadius: 32 }} />
</div>
\`\`\`

### pop (for stats/icons)
\`\`\`tsx
const popS = spring({ frame: Math.max(0, frame - t(delay)), fps, config: { damping: 10, stiffness: 200 } });
<div style={{ transform: \`scale(\${popS})\` }}>
  <span style={{ fontSize: 96, fontWeight: 900 }}>67%</span>
</div>
\`\`\`

### fade_up (for bottom bar)
\`\`\`tsx
const barDelay = Math.round(durationInFrames * 0.7);
const barS = spring({ frame: Math.max(0, frame - barDelay), fps, config: { damping: 20 } });
<div style={{ opacity: barS, transform: \`translateY(\${(1-barS)*24}px)\` }}>
  {/* bottom bar */}
</div>
\`\`\`

## PREMIUM DESIGN PATTERNS

### Background (always use — dark with glowing radials)
\`\`\`tsx
<AbsoluteFill style={{
  background: \`
    radial-gradient(ellipse 700px 500px at 15% 50%, \${theme.palette.primary}22 0%, transparent 70%),
    radial-gradient(ellipse 500px 400px at 85% 20%, \${theme.palette.accent1}18 0%, transparent 65%),
    \${theme.background}
  \`,
  overflow: 'hidden',
}}>
  {/* Top gradient accent strip */}
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    background: \`linear-gradient(to right, \${theme.palette.primary}, \${theme.palette.accent1}, \${theme.palette.secondary})\` }} />
\`\`\`

### Glassmorphism card
\`\`\`tsx
<div style={{
  background: \`linear-gradient(135deg, \${color}18, \${color}08)\`,
  border: \`1px solid \${color}30\`,
  borderRadius: 20, padding: '28px 20px',
  boxShadow: \`0 8px 32px \${color}20, inset 0 1px 0 \${color}20\`,
}}>
\`\`\`

### Title zone (MANDATORY — always top-left)
\`\`\`tsx
<div style={{ position: 'absolute', left: 80, top: 64, width: 580 }}>
  {/* Badge → Title → Subtitle → Accent underline */}
</div>
\`\`\`

### Bottom bar (MANDATORY — every scene)
\`\`\`tsx
<div style={{
  position: 'absolute', bottom: 24, left: 80, right: 80, borderRadius: 16,
  background: \`linear-gradient(135deg, \${theme.palette.primary}28, \${theme.palette.accent1}18)\`,
  border: \`1px solid \${theme.palette.primary}40\`,
  padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 16,
}}>
  <span style={{ fontSize: '1.5rem' }}>💡</span>
  <span style={{ fontFamily: theme.primaryFont, fontSize: 17, color: theme.palette.text }}>
    Key takeaway text
  </span>
</div>
\`\`\`

### Progress bar (MANDATORY — bottom edge)
\`\`\`tsx
<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
  background: theme.palette.primary,
  width: \`\${interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 100], { extrapolateRight: 'clamp' })}%\` }} />
\`\`\`

## LAYOUT RULES (non-negotiable)

1. **Title zone (left:80, top:64, width:580)** is INVIOLABLE — nothing overlaps it
2. **Content starts at top:200** — ALL cards, icons, stats below this line
3. **Canvas: ${width}×${height}** — safe zone: left≥80, right≤${width-80}, top≥60, bottom≤${height-60}
4. **Left panel cards**: Available height 200→570 = 370px. For N cards: cardHeight = Math.floor((370-(N-1)*16)/N), top = 200 + i*(cardHeight+16)
5. **Right panel**: x:700+, top:80→570. Real content only (icons, stats, images)
6. **Bottom bar at y:580–660**: ALWAYS present
7. **No overlapping text** — use the card stacking formula
8. **Persistence**: once animated in, items STAY visible. Use durationInFrames={durationInFrames - delay}

## STRICT RULES — BREAKING THESE CAUSES CRASHES

| Rule | Correct | Wrong |
|------|---------|-------|
| interpolate range | \`[0, Math.max(1, n)]\` | \`[0, 0]\` (crashes) |
| Sequence duration | \`Math.max(1, dur - from)\` | zero or negative |
| spring frame | \`Math.max(0, frame - start)\` | negative frame |
| CSS transitions | ❌ never \`transition:\` | use spring/interpolate |
| Background in interpolate | ❌ string colors crash | use ternary or direct value |
| Duplicate CSS keys | ❌ two \`transform:\` | merge into one string |
| File start | First line must be \`import\` | no preamble text |
| Export name | \`export const Scene${sceneNumber}\` | any other name |
| Emoji | \`<span style={{fontSize:'2.5rem'}}>🔥</span>\` | never AnimatedEmoji |
| spring() | always include \`frame:\` | \`spring({ fps })\` crashes |
| google-fonts | \`/Inter\` (capital) | \`/inter\` (lowercase, fails) |

Output ONLY the TSX code. No explanation, no markdown fences.`;

  const user = `## Scene ${sceneNumber} of ${totalScenes}

### Storyboard Spec
\`\`\`json
${JSON.stringify(sceneSpec, null, 2)}
\`\`\`

### Resolved Assets
${assetLines || '(no assets)'}

### Timing
- Narration: ${narrationDuration.toFixed(1)}s → ${narrationFrames} frames
- Total: ${totalFrames} frames (narration + 0.5s buffer)
- Beat: ~${beatFrames} frames per teaching point
- FPS: ${fps}
${hasNarrationFile ? `- Audio: staticFile('assets/narration_scene${sceneNumber}.wav')` : '- No narration audio'}

### Theme
\`\`\`json
${JSON.stringify(theme, null, 2)}
\`\`\`

### Task
Implement this scene as \`export const Scene${sceneNumber}: React.FC = () => { ... }\`

Follow the storyboard EXACTLY:
- Use the specified layout ("${sceneSpec.layout}")
- Place assets at their designated positions using resolved paths above
- Implement each animation as specified in the storyboard
- Include all content_blocks with correct text and colors
- Add the bottom bar with emoji and takeaway text
- Add progress bar at bottom edge
- If an asset is marked FAILED, use a native emoji span as fallback

Output ONLY TSX code.`;

  return { system, user };
}
