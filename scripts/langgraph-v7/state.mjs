/**
 * LangGraph v7 state schema.
 * 9 nodes: theme → research → [narration_gen × N] → merge_narrations
 *        → [asset_gen × M] → merge_assets → [scene_composer × N] → merge_scenes → compiler
 */
import { Annotation } from '@langchain/langgraph';

const replace = (_, v) => v;
const concatReducer = (current, update) => {
  if (!current) current = [];
  if (!update) return current;
  const items = Array.isArray(update) ? update : [update];
  return [...current, ...items];
};

export const VideoState = Annotation.Root({
  // Input
  topic:        Annotation({ reducer: replace, default: () => '' }),
  duration:     Annotation({ reducer: replace, default: () => 0 }),
  audience:     Annotation({ reducer: replace, default: () => '' }),
  instructions: Annotation({ reducer: replace, default: () => '' }),
  slug:         Annotation({ reducer: replace, default: () => '' }),
  outputDir:    Annotation({ reducer: replace, default: () => '' }),
  maxScenes:    Annotation({ reducer: replace, default: () => 0 }),

  // Node 1: Theme Designer
  theme:          Annotation({ reducer: replace, default: () => null }),
  // Node 2: Research Planner
  researchNotes:  Annotation({ reducer: replace, default: () => null }),
  // Node 3: Narration Generator (fan-in via concatReducer)
  narrations:     Annotation({ reducer: concatReducer, default: () => [] }),
  // Node 6: Scene Writer (fan-in via concatReducer)
  compiledScenes: Annotation({ reducer: concatReducer, default: () => [] }),
  // Node 7: Video Compiler
  videoPath:      Annotation({ reducer: replace, default: () => '' }),
  editManifest:   Annotation({ reducer: replace, default: () => null }),

  // Send-private (used by fan-out for narration_generator, scene_composer)
  _sceneIndex:  Annotation({ reducer: replace, default: () => -1 }),

  // Error accumulator
  errors:       Annotation({ reducer: concatReducer, default: () => [] }),
});
