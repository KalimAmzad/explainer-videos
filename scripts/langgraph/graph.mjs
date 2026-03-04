/**
 * LangGraph StateGraph definition for the whiteboard video pipeline.
 * Wires together all 6 nodes with the ReAct asset sourcing loop.
 *
 * Flow:
 *   START → research_plan → asset_agent ⇄ asset_tools → asset_decomposition
 *         → animation → playback → quality_review → END
 */
import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { VideoGraphState } from './state.mjs';
import { researchPlanNode } from './nodes/research-plan-educational-director.mjs';
import { assetSourcingAgent, assetTools, shouldContinueAssetLoop } from './nodes/asset-sourcing.mjs';
import { assetDecompositionNode } from './nodes/asset-decomposition.mjs';
import { animationNode } from './nodes/animation.mjs';
import { playbackNode } from './nodes/playback.mjs';
import { qualityReviewNode } from './nodes/quality-review.mjs';

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

    .addEdge(START, 'research_plan')
    .addEdge('research_plan', 'asset_agent')
    .addConditionalEdges('asset_agent', shouldContinueAssetLoop, {
      asset_tools: 'asset_tools',
      next: 'asset_decomposition',
    })
    .addEdge('asset_tools', 'asset_agent')
    .addEdge('asset_decomposition', 'animation')
    .addEdge('animation', 'playback')
    .addEdge('playback', 'quality_review')
    .addEdge('quality_review', END);

  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}
