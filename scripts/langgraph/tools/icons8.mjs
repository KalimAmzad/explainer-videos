/**
 * LangChain tools wrapping Icons8 MCP (search + download).
 * Uses subprocess calls to the Icons8 MCP server.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { storeAsset } from '../lib/asset-store.mjs';

/**
 * Call Icons8 MCP tool via the MCP protocol.
 * This communicates with the Icons8 MCP server that's configured in the project.
 */
async function callIcons8Mcp(toolName, args) {
  // Use the Gemini API as a proxy to search Icons8 via their API
  // Since we can't directly spawn MCP servers easily, we use fetch to the Icons8 API
  const { callGeminiJSON } = await import('../lib/gemini-client.mjs');

  if (toolName === 'search_icons') {
    // Use Gemini to suggest icon search terms and evaluate results
    // In practice, this calls the Icons8 search API
    const searchUrl = `https://search.icons8.com/api/iconsets/v6/search?term=${encodeURIComponent(args.query)}&amount=${args.amount || 10}&platform=${args.platform || 'color'}`;

    try {
      const response = await fetch(searchUrl, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        return { icons: [], error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const icons = (data.icons || []).map(icon => ({
        id: String(icon.id),
        name: icon.name,
        platform: icon.platform || args.platform || 'color',
        category: icon.category || '',
        commonName: icon.commonName || icon.name,
      }));
      return { icons };
    } catch (e) {
      return { icons: [], error: e.message };
    }
  }

  if (toolName === 'get_icon_png_url') {
    const pngUrl = `https://img.icons8.com/${args.platform || 'color'}/${args.size || 128}/${args.iconId}.png`;
    try {
      const response = await fetch(pngUrl);
      if (!response.ok) return { url: null, error: `HTTP ${response.status}` };
      const buffer = Buffer.from(await response.arrayBuffer());
      return { pngBase64: buffer.toString('base64'), url: pngUrl };
    } catch (e) {
      return { pngBase64: null, error: e.message };
    }
  }

  return { error: `Unknown tool: ${toolName}` };
}

/**
 * Search Icons8 for icons matching a query.
 */
export const searchIcons8 = tool(
  async ({ query, platform }) => {
    console.log(`  [Icons8] Searching: "${query}" (platform: ${platform || 'color'})`);
    const result = await callIcons8Mcp('search_icons', { query, platform: platform || 'color', amount: 10 });

    if (result.error) {
      return JSON.stringify({ success: false, error: result.error, icons: [] });
    }

    const icons = result.icons.slice(0, 5);
    console.log(`  [Icons8] Found ${icons.length} icons`);
    return JSON.stringify({ success: true, icons });
  },
  {
    name: 'searchIcons8',
    description: 'Search Icons8 library for icons. Returns a list of matching icons with id, name, platform, and category.',
    schema: z.object({
      query: z.string().describe('Search query for icons (e.g., "brain", "meditation", "chart")'),
      platform: z.string().optional().describe('Icon style/platform: "color", "ios", "fluent", "outlined"'),
    }),
  }
);

/**
 * Download an icon from Icons8 as PNG.
 */
export const downloadIcon = tool(
  async ({ iconId, size, platform, sceneNumber }) => {
    console.log(`  [Icons8] Downloading icon: ${iconId} (${size || 128}px) for scene ${sceneNumber}`);
    const result = await callIcons8Mcp('get_icon_png_url', {
      iconId,
      size: size || 128,
      platform: platform || 'color',
    });

    if (result.error || !result.pngBase64) {
      return JSON.stringify({ success: false, error: result.error || 'No image data' });
    }

    const sizeKB = (result.pngBase64.length * 0.75 / 1024).toFixed(1);
    console.log(`  [Icons8] Downloaded: ${sizeKB} KB`);

    // Store the PNG in asset store for later use by convertToSketchy
    storeAsset(sceneNumber, {
      type: 'icons8_raw',
      pngBase64: result.pngBase64,
      iconId,
    });

    // Return only summary to LLM (heavy data is in asset store)
    return JSON.stringify({
      success: true,
      sceneNumber,
      sizeKB,
      message: `Downloaded icon ${iconId} (${sizeKB} KB) for scene ${sceneNumber}. Now call convertToSketchy with sceneNumber=${sceneNumber} to convert it to hand-drawn style.`,
    });
  },
  {
    name: 'downloadIcon',
    description: 'Download a specific Icons8 icon by ID as PNG. Stores image data internally. Returns a summary.',
    schema: z.object({
      iconId: z.string().describe('The icon ID from searchIcons8 results'),
      sceneNumber: z.number().describe('Scene number this icon belongs to'),
      size: z.number().optional().describe('Icon size in pixels (default: 128)'),
      platform: z.string().optional().describe('Icon platform/style (default: "color")'),
    }),
  }
);
