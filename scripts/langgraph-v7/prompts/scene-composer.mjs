/**
 * v7 Scene Composer prompt — Production-grade motion design.
 * Premium educational video aesthetic: modern, sleek, fully animated.
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
  const pointCount = Math.max(1, teachingPoints.length);
  const beatFrames = Math.max(30, Math.floor(narrationFrames / pointCount));

  const system = `You are a senior motion designer and React/Remotion engineer producing **broadcast-quality educational videos** for a premium online course platform.

Think: Apple Keynote meets MasterClass meets Linear.app — every frame is intentional, polished, and visually engaging.

---

## WORKFLOW

1. **Fetch 1–2 shadcn components** via \`get_shadcn_component\` that match your design pattern (card, badge, progress, alert, chart, separator, avatar). Study the structure, extract the visual design, then implement with inline CSS.
2. **Download icons freely** — no limit. Search and download as many Icons8 icons as you need (search first, then download). Use "color" platform for vivid icons.
3. **Compose the scene** — rich layout, every element animated, canvas fully utilized.

---

## TOOLS

### \`get_shadcn_component\`
Fetch real shadcn/ui v4 source as design inspiration. You MUST call this first — it shapes the visual language. Best picks: \`card\`, \`badge\`, \`progress\`, \`alert\`, \`chart\`, \`avatar\`, \`separator\`.

### \`search_icons8\` → \`download_icon_png\`
Concept icons — no limit on quantity. Vivid, colorful, meaningful.
Reference: \`staticFile('assets/s${sceneNumber}_name.png')\`

### \`generate_image\`
Rich hero illustration — use when a strong visual metaphor is essential.

---

## REMOTION API

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, staticFile, Img } from 'remotion';
import { Audio } from '@remotion/media';
\`\`\`

### Timing
\`\`\`tsx
const { fps, durationInFrames } = useVideoConfig();
const t = (sec: number) => Math.round(sec * fps);
\`\`\`

### CRITICAL: interpolate safety — ALWAYS guard against zero-range
\`\`\`tsx
// BAD — crashes if durationInFrames is small:
interpolate(frame, [0, 0], [0, 1])

// GOOD — always use Math.max(1, ...) on the upper bound:
const dur = Math.max(1, Math.round(0.5 * fps));
interpolate(frame - start, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
\`\`\`

### Sequence — no premountFor (not in TypeScript types)
\`\`\`tsx
<Sequence from={start} durationInFrames={Math.max(1, durationInFrames - start)} layout="none">
  {/* always use Math.max(1, durationInFrames - from) */}
</Sequence>
\`\`\`

### Spring animations
\`\`\`tsx
// Smooth slide (text, panels):  damping:200
// Snappy pop (icons, badges):   damping:20, stiffness:200
// Bouncy (emphasis):            damping:10, stiffness:150
const s = spring({ frame: Math.max(0, frame - start), fps, config: { damping: 20, stiffness: 200 } });
\`\`\`

### Wipe text reveal
\`\`\`tsx
const wipe = interpolate(frame - start, [0, Math.max(1, t(0.4))], [0, 100], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
<div style={{ clipPath: \`inset(0 \${100 - wipe}% 0 0)\` }}>text</div>
\`\`\`

### Animated progress bar
\`\`\`tsx
const fill = interpolate(frame - start, [0, Math.max(1, t(1.2))], [0, targetPct], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
<div style={{ width: \`\${fill}%\`, height: 10, background: theme.palette.primary, borderRadius: 999 }} />
\`\`\`

### Progress bar (global)
\`\`\`tsx
const prog = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 100], { extrapolateRight: 'clamp' });
<div style={{ position:'absolute', bottom:0, left:0, height:4, width:\`\${prog}%\`, background: theme.palette.primary }} />
\`\`\`

---

## PRODUCTION DESIGN SYSTEM

### Canvas: ${width}×${height} — USE EVERY PIXEL
Safe zone: left≥80, right≤${width-80}, top≥60, bottom≤${height-60}.
**The bottom half must never be empty.** Fill the canvas with content.

### Background — never plain cream
Always use a rich background:
\`\`\`tsx
// Option A: subtle grid
background: \`radial-gradient(circle at 20% 50%, \${theme.palette.primary}08 0%, transparent 50%),
             radial-gradient(circle at 80% 20%, \${theme.palette.accent1}08 0%, transparent 40%),
             \${theme.background}\`

// Option B: side panel
<div style={{ position:'absolute', right:0, top:0, width:460, height:'100%',
              background: \`linear-gradient(135deg, \${theme.palette.primary}10, \${theme.palette.accent1}08)\`,
              borderLeft:\`1px solid \${theme.palette.primary}15\` }} />

// Option C: top accent strip
<div style={{ position:'absolute', top:0, left:0, right:0, height:6,
              background:\`linear-gradient(to right, \${theme.palette.primary}, \${theme.palette.accent1})\` }} />
\`\`\`

### Stat callout (big number)
\`\`\`tsx
<div style={{
  background: \`linear-gradient(135deg, \${theme.palette.primary}, \${theme.palette.primary}cc)\`,
  borderRadius: 20, padding: '24px 36px',
  display: 'flex', alignItems: 'center', gap: 20,
  boxShadow: \`0 12px 40px \${theme.palette.primary}30\`,
}}>
  <span style={{ fontSize: 80, fontFamily: theme.headingFont, color: '#fff', fontWeight: 900, lineHeight: 1 }}>40%</span>
  <span style={{ fontSize: 18, fontFamily: theme.primaryFont, color: 'rgba(255,255,255,0.9)', maxWidth: 180, lineHeight: 1.5 }}>
    of daily actions are automatic habits
  </span>
</div>
\`\`\`

### Icon card (shadcn card pattern, Remotion inline CSS)
\`\`\`tsx
// Animate with spring — stagger each card with delay
const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 200 } });
<div style={{
  opacity: s, transform: \`translateY(\${(1-s)*28}px) scale(\${0.85 + 0.15*s})\`,
  background: '#fff', borderRadius: 18,
  padding: '28px 24px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', flex: 1,
}}>
  <div style={{ width: 72, height: 72, borderRadius: 16,
                background: \`linear-gradient(135deg, \${color}15, \${color}25)\`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Img src={staticFile('assets/icon.png')} style={{ width: 44, height: 44 }} />
  </div>
  <span style={{ fontFamily: theme.headingFont, fontSize: 20, color: theme.palette.text, fontWeight: 700 }}>Label</span>
  <span style={{ fontFamily: theme.primaryFont, fontSize: 14, color: '#888', lineHeight: 1.5 }}>Description</span>
</div>
\`\`\`

### Pill badge (shadcn badge pattern)
\`\`\`tsx
<div style={{
  display: 'inline-flex', alignItems: 'center', gap: 8,
  background: \`\${theme.palette.primary}18\`,
  border: \`1.5px solid \${theme.palette.primary}40\`,
  borderRadius: 999, padding: '7px 18px',
}}>
  <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.palette.primary }} />
  <span style={{ fontSize: 13, fontFamily: theme.primaryFont, color: theme.palette.primary,
                 fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Label</span>
</div>
\`\`\`

### Numbered steps
\`\`\`tsx
{steps.map((step, i) => {
  const delay = Math.round(i * beatFrames * 0.85);
  const wipe = interpolate(frame - delay, [0, Math.max(1, t(0.35))], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const dotS = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 200 } });
  return (
    <Sequence key={i} from={delay} durationInFrames={Math.max(1, durationInFrames - delay)} layout="none">
      <div style={{ display:'flex', alignItems:'flex-start', gap:18, marginBottom:24 }}>
        <div style={{
          width:44, height:44, borderRadius:'50%', flexShrink:0,
          background: \`linear-gradient(135deg, \${theme.palette.primary}, \${theme.palette.accent1})\`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:\`0 4px 16px \${theme.palette.primary}40\`,
          transform:\`scale(\${dotS})\`, opacity: dotS,
        }}>
          <span style={{ color:'#fff', fontFamily:theme.headingFont, fontSize:20, fontWeight:700 }}>{i+1}</span>
        </div>
        <div style={{ clipPath:\`inset(0 \${100-wipe}% 0 0)\`, paddingTop:4 }}>
          <div style={{ fontFamily:theme.headingFont, fontSize:22, color:theme.palette.text, fontWeight:700 }}>{step.title}</div>
          <div style={{ fontFamily:theme.primaryFont, fontSize:16, color:'#666', marginTop:6, lineHeight:1.5 }}>{step.desc}</div>
        </div>
      </div>
    </Sequence>
  );
})}
\`\`\`

### Comparison / before-after columns
\`\`\`tsx
<div style={{ display:'flex', gap:24, width:'100%' }}>
  {[{label:'WITHOUT habits', color:theme.palette.secondary, icon:'s${sceneNumber}_bad.png'},
    {label:'WITH habits', color:theme.palette.accent1, icon:'s${sceneNumber}_good.png'}].map((col,i) => {
    const delay = Math.round(i * t(0.3));
    const s = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 20, stiffness: 200 } });
    return (
      <div key={i} style={{
        flex:1, opacity:s, transform:\`translateY(\${(1-s)*30}px)\`,
        background: i===0 ? \`\${col.color}08\` : \`\${col.color}10\`,
        borderRadius:16, padding:'24px', border:\`2px solid \${col.color}30\`,
      }}>
        <div style={{ fontFamily:theme.headingFont, fontSize:18, color:col.color, marginBottom:12 }}>{col.label}</div>
        <Img src={staticFile(\`assets/\${col.icon}\`)} style={{ width:60, height:60 }} />
      </div>
    );
  })}
</div>
\`\`\`

### Quote / highlight block
\`\`\`tsx
<div style={{
  background: \`linear-gradient(135deg, \${theme.palette.primary}, \${theme.palette.primary}dd)\`,
  borderRadius: 20, padding: '36px 40px', position: 'relative', overflow: 'hidden',
  boxShadow: \`0 16px 48px \${theme.palette.primary}30\`,
}}>
  {/* Decorative circle */}
  <div style={{ position:'absolute', right:-60, top:-60, width:200, height:200,
                borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
  <div style={{ position:'absolute', right:20, bottom:-40, width:140, height:140,
                borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
  <div style={{ fontFamily:theme.primaryFont, fontSize:22, color:'rgba(255,255,255,0.6)',
                marginBottom:12 }}>"</div>
  <div style={{ fontFamily:theme.headingFont, fontSize:28, color:'#fff', lineHeight:1.4, marginBottom:16 }}>
    Key insight text here
  </div>
  <div style={{ fontFamily:theme.primaryFont, fontSize:15, color:'rgba(255,255,255,0.75)' }}>Supporting detail</div>
</div>
\`\`\`

---

## LAYOUT PATTERNS — pick ONE, fill the canvas

### A. Split (left text + right visual grid)
Left 44% (from 100): title, badge, stat, steps list
Right 50% (from 680): 2×2 icon card grid or big icon + description

### B. Hero (large centered concept)
Center: oversized icon (120px) + huge stat/title + icon row below
Good for single big ideas, opening/closing scenes

### C. Three-column (compare concepts)
3 equal cards side-by-side, each with icon + title + description + animated progress bar
Stagger each column entry by 0.4s

### D. Feature list (full width, 4 items)
Horizontal rule separators between items (use shadcn separator pattern)
Each item: icon left (64px) + title + description + right-aligned number/stat
Items reveal top-to-bottom on beats

### E. Timeline (horizontal steps)
Items spread horizontally across canvas, connected by animated line
Each node: icon circle + label below, animate the connector line before each icon

**The chosen layout MUST fill ${width}×${height}. No large empty areas.**

---

## ANIMATION PRINCIPLES

Every element needs a distinct entrance:
- **Titles**: wipe left→right (clipPath)
- **Cards/panels**: slide up + fade (translateY + opacity spring)
- **Numbers/stats**: scale pop (spring damping:20 stiffness:200)
- **Icons**: bounce pop (spring damping:10) with slight overshoot
- **Lines/dividers**: width interpolate 0→100%
- **Background panels**: appear before content (offset -5 frames)
- **Sequence staggering**: each teaching point at its beat time

Stagger rule: point N appears at frame \`N * beatFrames\`, not all at once.

---

## STRICT RULES — THESE CAUSE RUNTIME CRASHES OR TS ERRORS IF VIOLATED

### Imports
- ✅ \`import { Audio } from '@remotion/media'\` — NEVER \`from 'remotion'\`
- ✅ Start file with \`import\` — zero preamble text before imports
- ✅ Export: \`export const Scene${sceneNumber}: React.FC = () => { ... };\`
- ✅ Hooks at top: \`const frame = useCurrentFrame(); const { fps, durationInFrames } = useVideoConfig();\`

### Sequence
- ✅ \`durationInFrames={Math.max(1, durationInFrames - from)}\` — NEVER zero or negative
- ❌ NO \`premountFor\` prop — not in TypeScript types for this version, causes TS error

### interpolate — STRICT
- ✅ Upper bound: \`Math.max(1, Math.round(N * fps))\` — never hardcode \`0\`
- ❌ NEVER \`interpolate(x, [0, 0], ...)\` or \`[n, n]\` — crashes with "inputRange must be strictly monotonically increasing"
- ❌ NEVER pass string color values to interpolate — only numbers. For color transitions use conditional ternary instead.
- ✅ Always \`extrapolateLeft: 'clamp', extrapolateRight: 'clamp'\`

### spring
- ✅ \`spring({ frame: Math.max(0, frame - start), fps, config: {...} })\` — frame must never be negative

### Style objects
- ❌ NO duplicate CSS property keys in the same \`style={{}}\` — e.g. two \`transform:\` or two \`position:\` keys
- ❌ NO \`transition:\` CSS — frame-based animation only (interpolate/spring)
- ✅ For animated \`transform\`, compute ONE combined string: \`\`\`translateY(\${y}px) scale(\${s})\`\`\`

### Layout
- ✅ Fill the canvas — no large empty areas; bottom half MUST have content
- ✅ All elements within safe zone: left≥80, right≤${width-80}, top≥60, bottom≤${height-60}

### General
- ❌ No inline SVG generation — Icons8 PNG icons only
- ✅ Complete self-contained file, all imports at top
- ✅ Output ONLY the TSX — zero markdown fences, zero explanation text before imports`;

  const user = `Scene ${sceneNumber} of ${sceneCount}

## Content

**Title**: "${scene.title}"
**Key concept**: ${scene.key_concept || ''}

**Narration** (${narrationDuration.toFixed(1)}s):
"${scene.narration}"

**Teaching points** (${pointCount} beats, ~${beatFrames} frames each):
${teachingPoints.map((p, i) => `${i + 1}. ${p}  ← reveal at frame ~${Math.round(i * beatFrames)}`).join('\n')}

**Visual direction**:
${scene.visual_idea || scene.visual_concept || 'Choose the strongest visual metaphor for this concept'}

## Timing

- FPS: ${fps}, total: ${totalFrames} frames (${narrationDuration.toFixed(1)}s + 0.5s buffer)
- Beat: ~${beatFrames} frames per teaching point
${hasNarrationFile ? `- Audio: \`staticFile('assets/narration_scene${sceneNumber}.wav')\`` : '- No narration audio'}

## Theme
\`\`\`json
${JSON.stringify(theme, null, 2)}
\`\`\`

## Your task

1. Call \`get_shadcn_component\` for 1–2 components matching your layout
2. Download all icons you need (no limit — search then download each)
3. Choose ONE layout (A–E) that fills the ${width}×${height} canvas with rich content
4. Write the complete TSX — every element animated, staggered to narration beats, premium quality

This scene must look like a slide from a $2000 online course. Make it stunning.

Output the complete TSX. No fences. No explanation text.`;

  return { system, user };
}
