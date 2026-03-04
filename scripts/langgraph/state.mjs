/**
 * LangGraph state schema for the whiteboard video pipeline.
 * Uses LangGraph's Annotation system for state management.
 */
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

/** Simple last-write-wins reducer. */
const replace = (_, v) => v;

/**
 * VideoGraphState — shared state flowing through all nodes.
 *
 * Key changes from v1:
 * - visual_elements[] replaces single illustration per scene
 * - Scene count is dynamic (determined by research agent)
 * - Assets keyed by visual element ID, not just scene number
 */
export const VideoGraphState = Annotation.Root({
  // ── Inputs ──
  topic:        Annotation({ reducer: replace, default: () => '' }),
  audience:     Annotation({ reducer: replace, default: () => '' }),
  duration:     Annotation({ reducer: replace, default: () => 0 }),
  instructions: Annotation({ reducer: replace, default: () => '' }),
  slug:         Annotation({ reducer: replace, default: () => '' }),
  outputDir:    Annotation({ reducer: replace, default: () => '' }),

  // ── ReAct agent messages (append-only) ──
  messages: Annotation({ reducer: messagesStateReducer, default: () => [] }),

  // ── Node 1: Research & Plan Educational Director ──
  blueprint: Annotation({ reducer: replace, default: () => null }),

  // ── Node 2: Asset Sourcing (keyed by element ID or scene number) ──
  assets: Annotation({ reducer: replace, default: () => [] }),

  // ── Node 3: Asset Decomposition ──
  decomposedAssets: Annotation({ reducer: replace, default: () => [] }),

  // ── Node 4: Animation & Sequencing ──
  computedScenes: Annotation({ reducer: replace, default: () => [] }),
  timelineCode:   Annotation({ reducer: replace, default: () => '' }),
  svgDefs:        Annotation({ reducer: replace, default: () => '' }),
  sceneSvg:       Annotation({ reducer: replace, default: () => '' }),
  roughJsCode:    Annotation({ reducer: replace, default: () => '' }),

  // ── Node 5: Playback Assembly ──
  finalHtml:  Annotation({ reducer: replace, default: () => '' }),
  outputPath: Annotation({ reducer: replace, default: () => '' }),

  // ── Node 6: Quality Review ──
  reviewedHtml: Annotation({ reducer: replace, default: () => '' }),
  reviewNotes:  Annotation({ reducer: replace, default: () => [] }),

  // ── Quality Review Feedback Loop ──
  reviewIteration: Annotation({ reducer: replace, default: () => 0 }),
  reviewCorrections: Annotation({ reducer: replace, default: () => [] }),

  // ── Metadata ──
  errors:      Annotation({ reducer: (prev, v) => [...prev, ...v], default: () => [] }),
  currentStep: Annotation({ reducer: replace, default: () => '' }),
});
