/**
 * Node: Scene Composer — ReAct agent (fan-out, one per scene).
 *
 * A tool-calling agent that autonomously:
 *   1. Decides what visuals best explain the educational content
 *   2. Calls tools to generate/fetch those assets
 *   3. Writes the complete Remotion TSX scene
 *
 * Tools available:
 *   - generate_svg      — Haiku generates hand-drawn SVG diagrams
 *   - search_icons8     — Icons8 icon search via @modelcontextprotocol/sdk
 *   - download_icon_png — Download Icons8 PNG to assets dir
 *   - generate_image    — Gemini image generation (rich illustrations)
 *
 * Audio: uses @remotion/media (installed in remotion template)
 */
import fs from 'fs';
import path from 'path';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MODELS, CANVAS, KEYS, MCP_SERVERS } from '../config.mjs';
import { buildAssetSvgGenPrompt } from '../prompts/asset-svg-gen.mjs';
import { buildSceneComposerPrompt } from '../prompts/scene-composer.mjs';

// ── Helpers ───────────────────────────────────────────────────────

function extractTSX(text) {
  if (!text) return '';
  let code = text.trim();
  const fence = code.match(/^```(?:tsx|typescript|ts|jsx|react)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fence) code = fence[1].trim();
  if (code.startsWith('```')) {
    code = code.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return code;
}

// ── MCP Client for Icons8 ─────────────────────────────────────────

async function connectIcons8MCP() {
  const cfg = MCP_SERVERS.icons8;
  if (!cfg?.command) return null;

  try {
    const client = new Client({ name: 'scene-composer-v7', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args || [],
      env: { ...process.env, ...(cfg.env || {}) },
    });
    await client.connect(transport);
    console.log('    Icons8 MCP connected');
    return client;
  } catch (err) {
    console.warn(`    Icons8 MCP unavailable (${err.message}) — using HTTP API`);
    return null;
  }
}

// ── Tool factory ──────────────────────────────────────────────────

function createTools({ sceneNumber, assetsDir, theme, mcpClient }) {
  // ── 1. generate_svg ──────────────────────────────
  const generateSvg = tool(
    async ({ asset_id, description, sub_elements }) => {
      console.log(`    [tool] generate_svg: ${asset_id}`);
      const model = new ChatAnthropic({
        model: MODELS.assetSvgGen,
        anthropicApiKey: KEYS.anthropic,
        maxTokens: 4096,
      });

      const prompt = buildAssetSvgGenPrompt({
        asset: { asset_id, description, sub_elements: sub_elements || null },
        theme,
      });

      const response = await model.invoke([new HumanMessage(prompt)]);
      let svg = (typeof response.content === 'string'
        ? response.content
        : response.content.map(c => c.text || '').join('')).trim();

      if (svg.startsWith('```')) {
        svg = svg.replace(/^```(?:svg|xml|html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      if (!svg.includes('<svg')) return JSON.stringify({ error: 'Invalid SVG returned' });

      const filePath = path.join(assetsDir, `${asset_id}.svg`);
      fs.writeFileSync(filePath, svg, 'utf8');
      console.log(`    [tool] saved ${asset_id}.svg (${(svg.length / 1024).toFixed(1)} KB)`);

      return JSON.stringify({
        asset_id,
        file: `assets/${asset_id}.svg`,
        content: svg,
        hasSubElements: !!(sub_elements?.length),
      });
    },
    {
      name: 'generate_svg',
      description: 'Generate a hand-drawn SVG diagram (flow chart, loop, comparison, annotated shape). Returns SVG content to embed inline in TSX. Use sub_elements for progressive animation.',
      schema: z.object({
        asset_id: z.string().describe(`Unique ID prefixed with scene number, e.g. "s${sceneNumber}_habit_loop"`),
        description: z.string().describe('What to draw — shapes, labels, arrows, connections. Be specific.'),
        sub_elements: z.array(z.object({
          sub_id: z.string(),
          description: z.string(),
        })).optional().describe('Named <g> groups for progressive draw-on animation (max 4)'),
      }),
    }
  );

  // ── 2. search_icons8 ─────────────────────────────
  const searchIcons8 = tool(
    async ({ query, platform = 'color', amount = 5 }) => {
      console.log(`    [tool] search_icons8: "${query}"`);

      // Try MCP first
      if (mcpClient) {
        try {
          const result = await mcpClient.callTool({
            name: 'search_icons',
            arguments: { query, amount, platform },
          });
          const text = result.content?.[0]?.text || JSON.stringify(result.content);
          return text;
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
        query: z.string().describe('Simple term like "brain", "clock", "goal", "checkmark", "growth"'),
        platform: z.string().optional().describe('Style: "color" (default), "fluent", "ios", "material"'),
        amount: z.number().optional(),
      }),
    }
  );

  // ── 3. download_icon_png ─────────────────────────
  const downloadIconPng = tool(
    async ({ asset_id, commonName, platform = 'color', size = 256 }) => {
      console.log(`    [tool] download_icon_png: ${commonName} → ${asset_id}.png`);

      const url = `https://img.icons8.com/${platform}/${size}/${commonName}.png`;
      const res = await fetch(url);
      if (!res.ok) return JSON.stringify({ error: `Icons8 download failed: ${res.status}` });

      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = path.join(assetsDir, `${asset_id}.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`    [tool] saved ${asset_id}.png (${(buffer.length / 1024).toFixed(1)} KB)`);

      return JSON.stringify({ asset_id, file: `assets/${asset_id}.png`, size });
    },
    {
      name: 'download_icon_png',
      description: 'Download an Icons8 icon as PNG. Call after search_icons8 to get commonName.',
      schema: z.object({
        asset_id: z.string().describe(`Like "s${sceneNumber}_brain_icon"`),
        commonName: z.string().describe('commonName from search_icons8 result'),
        platform: z.string().optional().describe('Same platform as search result'),
        size: z.number().optional().describe('Pixels: 64, 128, 256 (default 256)'),
      }),
    }
  );

  // ── 4. generate_image ────────────────────────────
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
      description: 'Generate a photo-realistic illustration via Gemini AI. Use sparingly — only for rich scene illustrations where SVG is insufficient.',
      schema: z.object({
        asset_id: z.string().describe(`Like "s${sceneNumber}_hero_illustration"`),
        description: z.string().describe('Detailed image prompt — style, content, mood'),
      }),
    }
  );

  return [generateSvg, searchIcons8, downloadIconPng, generateImage];
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

  // Connect to Icons8 MCP (shared connection attempt)
  const mcpClient = await connectIcons8MCP();

  // Create tool suite
  const tools = createTools({
    sceneNumber,
    assetsDir,
    theme: state.theme || {},
    mcpClient,
  });

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
  const model = new ChatAnthropic({
    model: MODELS.sceneComposer,
    anthropicApiKey: KEYS.anthropic,
    maxTokens: 8192,
  }).bindTools(tools);

  const messages = [new SystemMessage(system), new HumanMessage(user)];
  let iterations = 0;
  const MAX_ITERATIONS = 6;

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

      // Execute all tool calls (sequentially to avoid rate limits on SVG gen)
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
    if (mcpClient) {
      try { await mcpClient.close(); } catch (_) { /* ignore */ }
    }
  }

  // Extract TSX from last assistant message
  const lastMsg = messages.filter(m => m.constructor.name === 'AIMessage' || m._getType?.() === 'ai').pop();
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
