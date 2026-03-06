/**
 * Node: Scene Composer — ReAct agent (fan-out, one per scene).
 *
 * Tools available:
 *   - get_shadcn_component — Fetch shadcn/ui component source as design reference
 *   - search_icons8        — Icons8 icon search (MCP or HTTP fallback)
 *   - download_icon_png    — Download Icons8 PNG to assets dir
 *   - generate_image       — Gemini image generation
 */
import fs from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MODELS, CANVAS, KEYS, MCP_SERVERS } from '../config.mjs';
import { buildSceneComposerPrompt } from '../prompts/scene-composer.mjs';

// ── Helpers ───────────────────────────────────────────────────────

function extractTSX(text) {
  if (!text) return '';
  let code = text.trim();

  // Strip markdown code fences
  const fence = code.match(/```(?:tsx|typescript|ts|jsx|react)?\s*\n([\s\S]*?)\n```/);
  if (fence) return fence[1].trim();

  // Strip any preamble before the first import/comment/export
  const importIdx = code.search(/^(?:import|\/\*\*?|\/\/|export)/m);
  if (importIdx > 0) code = code.slice(importIdx).trim();

  return code;
}

// ── MCP Client helpers ────────────────────────────────────────────

async function connectMCP(cfg, name) {
  if (!cfg?.command) return null;
  try {
    const client = new Client({ name, version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args || [],
      env: { ...process.env, ...(cfg.env || {}) },
    });
    await client.connect(transport);
    return client;
  } catch (err) {
    console.warn(`    ${name} MCP unavailable: ${err.message}`);
    return null;
  }
}

async function connectIcons8MCP() {
  const cfg = MCP_SERVERS.icons8;
  if (!cfg?.command) return null;
  const client = await connectMCP(cfg, 'icons8');
  if (client) console.log('    Icons8 MCP connected');
  return client;
}

// ── Tool factory ──────────────────────────────────────────────────

function createTools({ sceneNumber, assetsDir, mcpClient, shadcnClient }) {
  // ── 0. get_shadcn_component ───────────────────────────────
  const getShadcnComponent = tool(
    async ({ componentName }) => {
      console.log(`    [tool] get_shadcn_component: ${componentName}`);
      if (!shadcnClient) return JSON.stringify({ error: 'shadcn MCP not available' });
      try {
        const result = await shadcnClient.callTool({
          name: 'get_component',
          arguments: { componentName },
        });
        return result.content?.[0]?.text || JSON.stringify(result.content);
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    },
    {
      name: 'get_shadcn_component',
      description: 'Fetch a shadcn/ui v4 component source as design reference. Use this to understand the visual structure and CSS patterns, then adapt to Remotion inline styles. Useful components: card, badge, progress, alert, separator, avatar, chart.',
      schema: z.object({
        componentName: z.string().describe('e.g. "card", "badge", "progress", "alert", "chart", "avatar", "separator"'),
      }),
    }
  );
  // ── 1. search_icons8 ─────────────────────────────
  const searchIcons8 = tool(
    async ({ query, platform = 'color', amount = 6 }) => {
      console.log(`    [tool] search_icons8: "${query}"`);

      if (mcpClient) {
        try {
          const result = await mcpClient.callTool({
            name: 'search_icons',
            arguments: { query, amount, platform },
          });
          return result.content?.[0]?.text || JSON.stringify(result.content);
        } catch (err) {
          console.warn(`    Icons8 MCP callTool failed: ${err.message}`);
        }
      }

      // HTTP API fallback
      const url = `https://search.icons8.com/api/iconsets/v6/search?term=${encodeURIComponent(query)}&amount=${amount}&platform=${platform}`;
      const data = await fetch(url).then(r => r.json());
      const icons = (data.icons || []).slice(0, amount).map(i => ({
        id: i.id,
        name: i.name,
        commonName: i.commonName,
        platform: i.platform || platform,
      }));
      return JSON.stringify({ icons });
    },
    {
      name: 'search_icons8',
      description: 'Search Icons8 for concept icons. Use simple English terms. Returns icons with id, commonName, platform.',
      schema: z.object({
        query: z.string().describe('Simple term like "brain", "clock", "goal", "checkmark", "growth", "rocket", "fire", "star"'),
        platform: z.string().optional().describe('Style: "color" (default, vivid), "fluent", "ios", "material"'),
        amount: z.number().optional().describe('How many results (default 6)'),
      }),
    }
  );

  // ── 2. download_icon_png ─────────────────────────
  const downloadIconPng = tool(
    async ({ asset_id, commonName, platform = 'color', size = 256 }) => {
      // Auto-correct asset_id if agent passed a numeric/hash ID instead of a descriptive name
      const isHashId = /^[0-9]+$/.test(asset_id) || /^[a-zA-Z0-9]{10,}$/.test(asset_id);
      const safeId = isHashId
        ? `s${sceneNumber}_${commonName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
        : asset_id;
      console.log(`    [tool] download_icon_png: ${commonName} → ${safeId}.png`);

      const url = `https://img.icons8.com/${platform}/${size}/${commonName}.png`;
      const res = await fetch(url);
      if (!res.ok) return JSON.stringify({ error: `Icons8 download failed: ${res.status}` });

      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = path.join(assetsDir, `${safeId}.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`    [tool] saved ${safeId}.png (${(buffer.length / 1024).toFixed(1)} KB)`);

      return JSON.stringify({ asset_id: safeId, file: `assets/${safeId}.png`, size });
    },
    {
      name: 'download_icon_png',
      description: 'Download an Icons8 icon as PNG. Call after search_icons8 to get commonName. Use size=128 for small icons, 256 for large.',
      schema: z.object({
        asset_id: z.string().describe(`Like "s${sceneNumber}_brain_icon" or "s${sceneNumber}_step1_icon"`),
        commonName: z.string().describe('commonName from search_icons8 result'),
        platform: z.string().optional().describe('Same platform as search result'),
        size: z.number().optional().describe('Pixels: 64, 128, 256 (default 256)'),
      }),
    }
  );

  // ── 3. generate_image ────────────────────────────
  const generateImage = tool(
    async ({ asset_id, description }) => {
      console.log(`    [tool] generate_image: ${asset_id}`);
      try {
        const { callGeminiImage } = await import('../../langgraph/lib/gemini-client.mjs');
        const result = await callGeminiImage(MODELS.imageGen, description);
        const filePath = path.join(assetsDir, `${asset_id}.png`);
        fs.writeFileSync(filePath, result.buffer);
        console.log(`    [tool] saved ${asset_id}.png (${(result.buffer.length / 1024).toFixed(1)} KB)`);
        return JSON.stringify({ asset_id, file: `assets/${asset_id}.png` });
      } catch (err) {
        return JSON.stringify({ error: `Image generation failed: ${err.message}` });
      }
    },
    {
      name: 'generate_image',
      description: 'Generate a photo-realistic illustration via Gemini AI. Use only when a rich hero illustration is needed.',
      schema: z.object({
        asset_id: z.string().describe(`Like "s${sceneNumber}_hero_image"`),
        description: z.string().describe('Detailed image prompt — style, content, mood, minimal background'),
      }),
    }
  );

  return [getShadcnComponent, searchIcons8, downloadIconPng, generateImage];
}

// ── Main node ─────────────────────────────────────────────────────

export async function sceneComposerNode(state) {
  const sceneIndex = state._sceneIndex;
  const scenes = state.researchNotes?.scenes || [];

  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    const msg = `scene-composer: invalid _sceneIndex ${sceneIndex} (${scenes.length} scenes)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const scene = scenes[sceneIndex];
  const sceneNumber = scene.scene_number || sceneIndex + 1;
  const totalScenes = scenes.length;

  console.log(`\n  ── Scene Composer Agent [Scene ${sceneNumber}/${totalScenes}] ──`);

  // Stagger parallel invocations
  const staggerMs = sceneIndex * 3000;
  if (staggerMs > 0) {
    console.log(`    Staggering ${staggerMs}ms...`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Get narration timing
  const narrations = state.narrations || [];
  const narration = narrations.find(n => n?.sceneNumber === sceneNumber);
  const narrationDuration = narration?.duration || scene.duration || 10;
  const durationFrames = Math.round((narrationDuration + 0.5) * CANVAS.fps);

  console.log(`    Duration: ${narrationDuration.toFixed(1)}s narration → ${durationFrames} frames`);

  // Ensure assets directory exists
  const assetsDir = path.join(state.outputDir, 'remotion', 'public', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Connect to MCP servers in parallel
  const [mcpClient, shadcnClient] = await Promise.all([
    connectIcons8MCP(),
    connectMCP(MCP_SERVERS.shadcn, 'shadcn-ui').then(c => {
      if (c) console.log('    shadcn-ui MCP connected');
      return c;
    }),
  ]);

  // Create tool suite
  const tools = createTools({ sceneNumber, assetsDir, mcpClient, shadcnClient });

  // Build prompts
  const { system, user } = buildSceneComposerPrompt({
    scene,
    theme: state.theme || {},
    narrationDuration,
    hasNarrationFile: !!narration?.filePath,
    sceneCount: totalScenes,
    fps: CANVAS.fps,
    width: CANVAS.width,
    height: CANVAS.height,
  });

  // ReAct agent loop
  const model = new ChatGoogleGenerativeAI({
    model: MODELS.sceneComposer,
    apiKey: KEYS.gemini,
    maxOutputTokens: 8192,
    temperature: 0.7,
  }).bindTools(tools);

  const messages = [new SystemMessage(system), new HumanMessage(user)];
  let iterations = 0;
  const MAX_ITERATIONS = 8; // More iterations for richer asset fetching

  try {
    while (iterations < MAX_ITERATIONS) {
      const response = await model.invoke(messages);
      messages.push(response);
      iterations++;

      const toolCalls = response.tool_calls || [];
      if (!toolCalls.length) {
        console.log(`    Agent finished in ${iterations} iteration(s)`);
        break;
      }

      console.log(`    [iter ${iterations}] Tool calls: ${toolCalls.map(tc => tc.name).join(', ')}`);

      for (const tc of toolCalls) {
        const t = tools.find(t => t.name === tc.name);
        let result;
        try {
          result = await t.invoke(tc.args);
        } catch (err) {
          result = JSON.stringify({ error: err.message });
          console.error(`    [tool] ${tc.name} error: ${err.message}`);
        }
        messages.push(new ToolMessage({
          content: typeof result === 'string' ? result : JSON.stringify(result),
          tool_call_id: tc.id,
          name: tc.name,
        }));
      }
    }
  } finally {
    if (mcpClient)   { try { await mcpClient.close();   } catch (_) {} }
    if (shadcnClient){ try { await shadcnClient.close(); } catch (_) {} }
  }

  // Extract TSX from last assistant message
  const lastMsg = messages.filter(m =>
    m.constructor.name === 'AIMessage' || m._getType?.() === 'ai'
  ).pop();
  const rawText = typeof lastMsg?.content === 'string'
    ? lastMsg.content
    : (lastMsg?.content || []).map(c => c.text || '').join('');

  const tsxContent = extractTSX(rawText);

  const usage = lastMsg?.usage_metadata;
  if (usage) {
    console.log(`    Total tokens: ~${usage.input_tokens || '?'} in / ${usage.output_tokens || '?'} out`);
  }

  if (!tsxContent) {
    console.error(`    Scene ${sceneNumber}: agent returned empty TSX`);
    return {
      compiledScenes: [{ sceneNumber, tsxContent: '', durationFrames, error: 'empty TSX' }],
      errors: [`scene-composer [Scene ${sceneNumber}]: empty TSX`],
    };
  }

  // Write scene file
  const scenesDir = path.join(state.outputDir, 'remotion', 'src', 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });
  const filePath = path.join(scenesDir, `Scene${sceneNumber}.tsx`);
  fs.writeFileSync(filePath, tsxContent, 'utf8');
  console.log(`    Wrote Scene${sceneNumber}.tsx (${tsxContent.length} chars)`);

  return {
    compiledScenes: [{ sceneNumber, tsxContent, durationFrames }],
  };
}
