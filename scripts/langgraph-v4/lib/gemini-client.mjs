/**
 * Re-export gemini client from v3 — same API, shared config.
 * Imports are resolved relative to v4 config.
 */
export { callGeminiJSON, callGeminiImage, callGeminiVision } from '../../langgraph/lib/gemini-client.mjs';
