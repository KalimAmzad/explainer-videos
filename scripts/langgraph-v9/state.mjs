/**
 * LangGraph v9 state schema — Scene-Coder-First Pipeline (Single Pass).
 *
 * Flow:
 *   START → content_planner
 *         → [scene_coder × N] (Sonnet 4.6: TSX + narration, single pass)
 *         → merge_scenes
 *         → [tts_generator × N] (audio from scene coder's narration)
 *         → merge_tts
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
  theme:    Annotation({ reducer: replace, default: () => null }),
  scenes:   Annotation({ reducer: replace, default: () => [] }),

  // Scene Coder (fan-in via concatReducer)
  compiledScenes: Annotation({ reducer: concatReducer, default: () => [] }),

  // Asset manifest (fan-in from scene coders)
  assetManifest: Annotation({ reducer: concatReducer, default: () => [] }),

  // TTS Generator (fan-in via concatReducer)
  narrations: Annotation({ reducer: concatReducer, default: () => [] }),

  // Video Compiler
  videoPath:    Annotation({ reducer: replace, default: () => '' }),
  editManifest: Annotation({ reducer: replace, default: () => null }),

  // Send-private (used by fan-out)
  _sceneIndex: Annotation({ reducer: replace, default: () => -1 }),

  // Error accumulator
  errors: Annotation({ reducer: concatReducer, default: () => [] }),
});
