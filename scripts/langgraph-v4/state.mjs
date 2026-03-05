/**
 * LangGraph v4 state schema.
 * 5 nodes: research → image_gen → decomposer → animator → compiler
 * Parallel fan-out via Send API for nodes 2-4.
 */
import { Annotation } from '@langchain/langgraph';

const replace = (_, v) => v;

/** Concat reducer for parallel fan-in (Send API). */
const concatReducer = (current, update) => {
  if (!current) current = [];
  if (!update) return current;
  const items = Array.isArray(update) ? update : [update];
  return [...current, ...items];
};

export const VideoState = Annotation.Root({
  // ── Inputs ──
  topic:        Annotation({ reducer: replace, default: () => '' }),
  audience:     Annotation({ reducer: replace, default: () => '' }),
  duration:     Annotation({ reducer: replace, default: () => 0 }),
  instructions: Annotation({ reducer: replace, default: () => '' }),
  slug:         Annotation({ reducer: replace, default: () => '' }),
  outputDir:    Annotation({ reducer: replace, default: () => '' }),

  // ── Node 1: Research Planner ──
  researchNotes: Annotation({ reducer: replace, default: () => null }),

  // ── Node 2: Scene Image Generator (parallel fan-in) ──
  // Array of { sceneNumber, imagePath, buffer }
  sceneImages: Annotation({ reducer: concatReducer, default: () => [] }),

  // ── Node 3: Asset Decomposer (parallel fan-in) ──
  // Array of { sceneNumber, groups: [{ group_id, type, bbox, cropPath, narration, timing }] }
  sceneGroups: Annotation({ reducer: concatReducer, default: () => [] }),

  // ── Node 4: Scene Animator (parallel fan-in) ──
  // Array of { sceneNumber, tsCode }
  sceneCode: Annotation({ reducer: concatReducer, default: () => [] }),

  // ── Node 5: Video Compiler ──
  outputPath: Annotation({ reducer: replace, default: () => '' }),

  // ── Send-private fields ──
  _sceneIndex: Annotation({ reducer: replace, default: () => -1 }),
  _sceneNotes: Annotation({ reducer: replace, default: () => null }),
  _sceneImage: Annotation({ reducer: replace, default: () => null }),
  _sceneGroupData: Annotation({ reducer: replace, default: () => null }),

  // ── Metadata ──
  errors: Annotation({ reducer: (prev, v) => [...(prev || []), ...(v || [])], default: () => [] }),
});
