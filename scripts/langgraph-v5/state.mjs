/**
 * LangGraph v5 state schema.
 * 4 nodes: research → [image_gen × N] → [scene_coder × N] → compiler
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
  // Inputs
  topic:        Annotation({ reducer: replace, default: () => '' }),
  audience:     Annotation({ reducer: replace, default: () => '' }),
  duration:     Annotation({ reducer: replace, default: () => 0 }),
  instructions: Annotation({ reducer: replace, default: () => '' }),
  slug:         Annotation({ reducer: replace, default: () => '' }),
  outputDir:    Annotation({ reducer: replace, default: () => '' }),
  maxScenes:    Annotation({ reducer: replace, default: () => 0 }),

  // Node 1: Research
  researchNotes: Annotation({ reducer: replace, default: () => null }),

  // Node 2: Image gen (parallel fan-in)
  // [{ sceneNumber, imagePath, base64 }]
  sceneImages: Annotation({ reducer: concatReducer, default: () => [] }),

  // Node 3: Scene coder (parallel fan-in) — same shape as v3
  // [{ sceneNumber, svgDefs, svgBody, jsCode }]
  sceneOutputs: Annotation({ reducer: concatReducer, default: () => [] }),

  // Node 4: Compiler
  finalHtml:  Annotation({ reducer: replace, default: () => '' }),
  outputPath: Annotation({ reducer: replace, default: () => '' }),

  // Send-private
  _sceneIndex: Annotation({ reducer: replace, default: () => -1 }),
  _sceneNotes: Annotation({ reducer: replace, default: () => null }),
  _sceneImage: Annotation({ reducer: replace, default: () => null }),

  // Metadata
  errors: Annotation({ reducer: (prev, v) => [...(prev || []), ...(v || [])], default: () => [] }),
});
