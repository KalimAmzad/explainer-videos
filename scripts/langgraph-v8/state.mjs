/**
 * LangGraph v8 state schema — Production Pipeline.
 *
 * Flow:
 *   START → content_planner → storyboard_designer
 *         → [narration_generator × N, asset_producer × M] (parallel)
 *         → merge_production
 *         → [scene_coder × N]
 *         → merge_scenes
 *         → video_compiler → END
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

  // Content Planner output
  theme:          Annotation({ reducer: replace, default: () => null }),
  researchNotes:  Annotation({ reducer: replace, default: () => null }),

  // Storyboard Designer output
  storyboard:     Annotation({ reducer: replace, default: () => null }),

  // Narration Generator (fan-in via concatReducer)
  narrations:     Annotation({ reducer: concatReducer, default: () => [] }),

  // Asset Producer (fan-in via concatReducer)
  resolvedAssets: Annotation({ reducer: concatReducer, default: () => [] }),

  // Scene Coder (fan-in via concatReducer)
  compiledScenes: Annotation({ reducer: concatReducer, default: () => [] }),

  // Video Compiler
  videoPath:      Annotation({ reducer: replace, default: () => '' }),
  editManifest:   Annotation({ reducer: replace, default: () => null }),

  // Send-private (used by fan-out)
  _sceneIndex:  Annotation({ reducer: replace, default: () => -1 }),
  _assetIndex:  Annotation({ reducer: replace, default: () => -1 }),

  // Error accumulator
  errors:       Annotation({ reducer: concatReducer, default: () => [] }),
});
