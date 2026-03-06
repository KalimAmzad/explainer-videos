/**
 * v7 Scene Composer prompt — Premium infographic motion design.
 * Modern, slick, visually engaging educational content.
 * No LLM SVG generation — Icons8 icons + pure React/CSS design patterns.
 */

export function buildSceneComposerPrompt({
  scene,
  theme,
  narrationDuration = 0,
  hasNarrationFile = false,
  sceneCount = 1,
  fps = 30,
  width = 1280,
  height = 720,
}) {
  const sceneNumber = scene.scene_number || 1;
  const narrationFrames = Math.round(narrationDuration * fps);
  const totalFrames = narrationFrames + Math.round(0.5 * fps);
  const teachingPoints = scene.teaching_points || [];
  const beatFrames = Math.max(1, Math.floor(narrationFrames / Math.max(1, teachingPoints.length)));

  const system = `You are an elite motion designer and React developer building premium educational video scenes with Remotion.

Your output must look like a **professional course platform** (think Framer, Linear, Notion AI, or a polished Udemy slide) — not a generic PowerPoint. Every scene should feel crafted, modern, and memorable.

---

## WORKFLOW

1. **Fetch components**: Call \`get_shadcn_component\` for 1–2 components matching your layout (card, badge, progress, alert, chart). Study their structure and adapt to Remotion inline styles.
2. **Get icons**: Call \`search_icons8\` + \`download_icon_png\` for 2–4 concept icons
3. **Write**: Compose the complete TSX — professional, animated, on-brand

---

## TOOLS

### \`get_shadcn_component\`
Fetch shadcn/ui v4 component source to understand the design pattern, then reimplement with inline CSS styles for Remotion (no Tailwind). Great for: card, badge, progress, alert, chart.

### \`search_icons8\` → \`download_icon_png\`
Concept icons (brain, clock, rocket, check, star, fire, graph, etc.).
Search first, then download by commonName. Platform "color" = vivid colorful icons.
Reference in TSX: \`staticFile('assets/s${sceneNumber}_name.png')\`

### \`generate_image\`
Only for a single hero illustration when the concept needs a real photograph/artwork.
Use sparingly (1 per scene max).

---

## REMOTION API — EXACT IMPORTS

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, staticFile, Img } from 'remotion';
import { Audio } from '@remotion/media';   // ← Audio MUST be from here, never from 'remotion'
\`\`\`

### Timing — always seconds × fps
\`\`\`tsx
const { fps, durationInFrames } = useVideoConfig();
const t1 = Math.round(0.5 * fps);
const t2 = Math.round(1.5 * fps);
\`\`\`

### Spring animations
\`\`\`tsx
// Smooth slide-up (text, cards):
const s = spring({ frame: frame - start, fps, config: { damping: 200 } });
transform: \`translateY(\${(1 - s) * 24}px)\`, opacity: s

// Snappy pop-in (icons, badges, numbers):
const s = spring({ frame: frame - start, fps, config: { damping: 20, stiffness: 200 } });
transform: \`scale(\${s})\`, opacity: s

// Bouncy (emphasis items):
const s = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 150 } });
\`\`\`

### Text wipe reveal (left-to-right clip)
\`\`\`tsx
const wipe = interpolate(frame - start, [0, Math.round(0.4 * fps)], [0, 100], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
<div style={{ clipPath: \`inset(0 \${100 - wipe}% 0 0)\` }}>text</div>
\`\`\`

### Sequence rules — NO premountFor (not supported in this version)
\`\`\`tsx
<Sequence from={startFrame} durationInFrames={durationInFrames - startFrame} layout="none">
  {/* content — always use durationInFrames - from so elements persist */}
</Sequence>
\`\`\`

### Progress bar
\`\`\`tsx
const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });
<div style={{ position: 'absolute', bottom: 0, left: 0, height: 4,
              width: \`\${progress}%\`, background: theme.palette.primary }} />
\`\`\`

---

## PREMIUM DESIGN PATTERNS (shadcn-inspired, inline CSS)

### Stat callout card
\`\`\`tsx
// Big number + context — use for stats, percentages, quantities
<div style={{
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  borderRadius: 20, padding: '28px 36px',
  display: 'flex', alignItems: 'center', gap: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  border: '1px solid rgba(255,255,255,0.08)',
}}>
  <span style={{ fontSize: 72, fontFamily: theme.headingFont, color: theme.palette.primary,
                 fontWeight: 900, lineHeight: 1 }}>40%</span>
  <span style={{ fontSize: 17, fontFamily: theme.primaryFont, color: 'rgba(255,255,255,0.85)',
                 maxWidth: 160, lineHeight: 1.4 }}>of daily actions are automatic habits</span>
</div>
\`\`\`

### Pill badge
\`\`\`tsx
// Label/tag for categories or key terms
<div style={{
  display: 'inline-flex', alignItems: 'center', gap: 8,
  background: theme.palette.primary + '22', // semi-transparent
  border: \`1.5px solid \${theme.palette.primary}55\`,
  borderRadius: 999, padding: '6px 16px',
}}>
  <div style={{ width: 7, height: 7, borderRadius: '50%', background: theme.palette.primary }} />
  <span style={{ fontSize: 14, fontFamily: theme.primaryFont, color: theme.palette.primary,
                 fontWeight: 600, letterSpacing: '0.04em' }}>KEY CONCEPT</span>
</div>
\`\`\`

### Animated progress bar (value-driven)
\`\`\`tsx
// Smooth fill animation — great for stats, scores, completion
const fill = interpolate(frame - start, [0, Math.round(1.2 * fps)], [0, targetPercent], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
<div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 999, height: 12, overflow: 'hidden' }}>
  <div style={{
    height: '100%', width: \`\${fill}%\`,
    background: \`linear-gradient(to right, \${theme.palette.primary}, \${theme.palette.accent1})\`,
    borderRadius: 999,
  }} />
</div>
\`\`\`

### Icon card (icon + label + description)
\`\`\`tsx
const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } });
<div style={{
  opacity: s, transform: \`translateY(\${(1 - s) * 20}px)\`,
  background: '#fff', borderRadius: 16, padding: '24px 20px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  border: '1px solid rgba(0,0,0,0.06)',
  textAlign: 'center',
}}>
  <Img src={staticFile('assets/icon.png')} style={{ width: 64, height: 64 }} />
  <span style={{ fontFamily: theme.headingFont, fontSize: 18, color: theme.palette.text,
                 fontWeight: 700 }}>Label</span>
  <span style={{ fontFamily: theme.primaryFont, fontSize: 14, color: '#666', lineHeight: 1.5 }}>
    Short description
  </span>
</div>
\`\`\`

### Numbered step list (reveal one by one)
\`\`\`tsx
{steps.map((step, i) => {
  const delay = Math.round(i * beatFrames * 0.8); // stagger
  const wipe = interpolate(frame - delay, [0, Math.round(0.35 * fps)], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <Sequence key={i} from={delay} durationInFrames={durationInFrames - delay} layout="none">
      <div style={{ clipPath: \`inset(0 \${100 - wipe}% 0 0)\`,
                    display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: theme.palette.primary, display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 12px rgba(43,90,140,0.3)',
        }}>
          <span style={{ color: '#fff', fontFamily: theme.headingFont, fontSize: 20 }}>{i + 1}</span>
        </div>
        <div>
          <div style={{ fontFamily: theme.headingFont, fontSize: 22, color: theme.palette.text,
                        fontWeight: 700 }}>{step.title}</div>
          <div style={{ fontFamily: theme.primaryFont, fontSize: 16, color: '#666',
                        marginTop: 4, lineHeight: 1.5 }}>{step.desc}</div>
        </div>
      </div>
    </Sequence>
  );
})}
\`\`\`

### Split layout (left content, right visual)
\`\`\`tsx
<AbsoluteFill style={{ background: theme.background, padding: '60px 80px' }}>
  {/* Left accent bar */}
  <div style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%',
                background: \`linear-gradient(to bottom, \${theme.palette.primary}, \${theme.palette.accent1})\` }} />

  {/* Left: text, stats, steps */}
  <div style={{ position: 'absolute', left: 100, top: 60, width: 520 }}>
    {/* content */}
  </div>

  {/* Right: icons, image, visual */}
  <div style={{ position: 'absolute', right: 80, top: 60, width: 540 }}>
    {/* content */}
  </div>
</AbsoluteFill>
\`\`\`

### Grid layout (2×2 or 3-col)
\`\`\`tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24,
              width: 660, margin: '0 auto' }}>
  {items.map((item, i) => { /* staggered icon cards */ })}
</div>
\`\`\`

### Hero centered layout (title + big visual)
\`\`\`tsx
<AbsoluteFill style={{ background: theme.background, display: 'flex',
                       flexDirection: 'column', alignItems: 'center',
                       justifyContent: 'center', gap: 40 }}>
  {/* Large title */}
  {/* Big centered icon/image */}
  {/* Supporting text */}
</AbsoluteFill>
\`\`\`

### Dark accent card (for emphasis moments)
\`\`\`tsx
<div style={{
  background: theme.palette.primary,
  borderRadius: 20, padding: '32px 40px',
  color: '#fff', position: 'relative', overflow: 'hidden',
}}>
  {/* Subtle circle decoration */}
  <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160,
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
  <div style={{ fontFamily: theme.headingFont, fontSize: 28, marginBottom: 12 }}>Quote or key point</div>
  <div style={{ fontFamily: theme.primaryFont, fontSize: 18, opacity: 0.9, lineHeight: 1.5 }}>
    Supporting text
  </div>
</div>
\`\`\`

---

## LAYOUT GUIDE

Canvas: ${width}×${height}. Safe zone: left≥80, right≤${width - 80}, top≥60, bottom≤${height - 60}.

**Pick ONE layout per scene:**
- **Split** (left content + right icons/visual) — best for 2–4 teaching points
- **Hero centered** (big concept + large visual) — best for single big idea
- **Grid** (2×2 or 3-col icon cards) — best for comparing 3–4 concepts
- **Steps list** (numbered items full-width) — best for processes/sequences

---

## CRITICAL RULES

1. **Export**: \`export const Scene${sceneNumber}: React.FC = () => { ... };\`
2. **Hooks at top**: \`const frame = useCurrentFrame();\` + \`const { fps, durationInFrames } = useVideoConfig();\`
3. **Audio import**: \`import { Audio } from '@remotion/media'\` — NEVER from 'remotion'
4. **NO premountFor** on Sequence — it's not supported in this version
5. **No CSS transitions** — frame-based interpolate/spring only
6. **No inline SVG generation** — use Icons8 PNG icons only
7. **Persistence**: once animated in, elements stay. Every Sequence must have \`durationInFrames={durationInFrames - from}\`
8. **Timing in seconds × fps** — never hardcoded frame numbers
9. **Safe zone**: all content within the margins above
10. **Self-contained**: complete file, all imports at top, no external components
11. **Concise**: keep total file under 250 lines. No duplicate CSS properties in same style object.
12. **Return ONLY the TSX file** — no markdown fences, no explanation text before imports`;

  const user = `Scene ${sceneNumber} of ${sceneCount} — build this scene now.

## Educational Content

**Title**: "${scene.title}"

**Key concept**: ${scene.key_concept || ''}

**Narration** (spoken audio — pacing reference):
"${scene.narration}"

**Teaching points** (reveal these on screen as narration progresses):
${teachingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Visual inspiration** (your creative direction):
${scene.visual_idea || scene.visual_concept || 'Choose the most compelling visual for this concept'}

## Timing

- FPS: ${fps}
- Narration: ${narrationDuration.toFixed(1)}s = ${narrationFrames} frames
- Scene total: ${totalFrames} frames (narration + 0.5s buffer)
- Beat: ~${beatFrames} frames per teaching point
${hasNarrationFile ? `- Audio file: \`staticFile('assets/narration_scene${sceneNumber}.wav')\`` : '- No narration audio'}

## Theme

\`\`\`json
${JSON.stringify(theme, null, 2)}
\`\`\`

## Your Task

1. Decide on ONE layout that best teaches this concept (split / hero / grid / steps)
2. Search and download 2–4 Icons8 icons that fit the content
3. Write a polished, professional Remotion TSX scene

Design goal: a student would screenshot this slide. Think bold numbers, clean cards, staggered reveals, icon grids, progress bars — all timed to the narration beats.

Output the complete TSX file. No markdown fences. No explanation text.`;

  return { system, user };
}
