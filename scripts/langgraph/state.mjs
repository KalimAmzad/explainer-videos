/**
 * LangGraph v3 state schema for the whiteboard video pipeline.
 * Simplified: 4 nodes, parallel scene coding via Send API.
 */
import { Annotation } from '@langchain/langgraph';

/** Simple last-write-wins reducer. */
const replace = (_, v) => v;

/**
 * VideoState — shared state flowing through all nodes.
 *
 * v3 changes:
 * - researchNotes replaces blueprint (brief guidelines, not pixel coords)
 * - sceneAssets: assets saved to disk, keyed by scene number
 * - sceneOutputs: parallel scene coder results (concat reducer)
 * - No more messages, decomposedAssets, review fields
 */
export const VideoState = Annotation.Root({
  // ── Inputs ──
  topic:        Annotation({ reducer: replace, default: () => '' }),
  audience:     Annotation({ reducer: replace, default: () => '' }),
  duration:     Annotation({ reducer: replace, default: () => 0 }),
  instructions: Annotation({ reducer: replace, default: () => '' }),
  slug:         Annotation({ reducer: replace, default: () => '' }),
  outputDir:    Annotation({ reducer: replace, default: () => '' }),

  // ── Node 1: Research Plan ──
  researchNotes: Annotation({ reducer: replace, default: () => null }),

  // ── Node 2: Asset Sourcing ──
  // { 1: [{filename, description, role, dimensions, source}], 2: [...] }
  sceneAssets: Annotation({ reducer: replace, default: () => ({}) }),
  // Combined SVG <defs> block with all asset <g> wrappers for <use href>
  assetDefs: Annotation({ reducer: replace, default: () => '' }),

  // ── Node 3: Scene Coder (parallel, concat reducer) ──
  sceneOutputs: Annotation({
    reducer: (current, update) => {
      if (!current) current = [];
      if (!update) return current;
      // update may be a single item or array
      const items = Array.isArray(update) ? update : [update];
      return [...current, ...items];
    },
    default: () => [],
  }),

  // ── Node 4: Scene Compiler ──
  finalHtml:  Annotation({ reducer: replace, default: () => '' }),
  outputPath: Annotation({ reducer: replace, default: () => '' }),

  // ── Scene-specific (set by Send, used by scene_coder) ──
  _sceneIndex: Annotation({ reducer: replace, default: () => -1 }),
  _sceneNotes: Annotation({ reducer: replace, default: () => null }),

  // ── Metadata ──
  errors:      Annotation({ reducer: (prev, v) => [...(prev || []), ...(v || [])], default: () => [] }),
  currentStep: Annotation({ reducer: replace, default: () => '' }),
});
