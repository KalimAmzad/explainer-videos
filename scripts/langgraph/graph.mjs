/**
 * LangGraph StateGraph definition for the whiteboard video pipeline.
 *
 * Flow:
 *   START → research_plan → asset_agent ⇄ asset_tools → asset_decomposition
 *         → animation → playback → quality_review
 *                                      ↓ (if issues)    ↓ (if clean)
 *                                   animation           END
 *
 * Quality review can loop back to animation up to 2 times for structural fixes.
 */
import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { VideoGraphState } from './state.mjs';
import { researchPlanNode } from './nodes/research-plan-educational-director.mjs';
import { assetSourcingAgent, assetTools, shouldContinueAssetLoop } from './nodes/asset-sourcing.mjs';
import { assetDecompositionNode } from './nodes/asset-decomposition.mjs';
import { animationNode } from './nodes/animation.mjs';
import { playbackNode } from './nodes/playback.mjs';
import { qualityReviewNode, shouldRetryOrFinish } from './nodes/quality-review.mjs';

/**
 * Build and compile the LangGraph workflow.
 */
export function buildGraph() {
  const toolNode = new ToolNode(assetTools);

  const workflow = new StateGraph(VideoGraphState)
    .addNode('research_plan', researchPlanNode)
    .addNode('asset_agent', assetSourcingAgent)
    .addNode('asset_tools', toolNode)
    .addNode('asset_decomposition', assetDecompositionNode)
    .addNode('animation', animationNode)
    .addNode('playback', playbackNode)
    .addNode('quality_review', qualityReviewNode)

    // Linear flow
    .addEdge(START, 'research_plan')
    .addEdge('research_plan', 'asset_agent')

    // Asset sourcing ReAct loop
    .addConditionalEdges('asset_agent', shouldContinueAssetLoop, {
      asset_tools: 'asset_tools',
      next: 'asset_decomposition',
    })
    .addEdge('asset_tools', 'asset_agent')

    // Processing pipeline
    .addEdge('asset_decomposition', 'animation')
    .addEdge('animation', 'playback')
    .addEdge('playback', 'quality_review')

    // Quality review feedback loop
    // If structural issues found (and under retry limit) → back to animation
    // Otherwise → END
    .addConditionalEdges('quality_review', shouldRetryOrFinish, {
      retry: 'animation',
      done: END,
    });

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
