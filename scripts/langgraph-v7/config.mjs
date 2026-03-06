/**
 * LangGraph v7 config — Remotion + Template Layout pipeline.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) vars[match[1]] = match[2].trim();
  }
  return vars;
}

const env = loadEnv();

export const MODELS = {
  themeDesigner:   'claude-haiku-4-5-20251001',
  researchPlanner: 'claude-haiku-4-5-20251001',
  assetSvgGen:     'claude-haiku-4-5-20251001',
  imageGen:        'gemini-3.1-flash-image-preview',
  sceneComposer:   'gemini-3.1-flash-lite-preview-04-17', // Gemini flash-lite for scene composition
  tts:             'gemini-2.5-flash-preview-tts',     // Gemini TTS model
};

export const KEYS = {
  gemini:    env.GEMINI_API_KEY    || process.env.GEMINI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
};

export const LANGSMITH = {
  enabled:  (env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING) === 'true',
  endpoint: env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey:   env.LANGSMITH_API_KEY  || process.env.LANGSMITH_API_KEY,
  project:  env.LANGSMITH_PROJECT  || process.env.LANGSMITH_PROJECT || 'explainer-videos-v7',
};

export const CANVAS = { width: 1280, height: 720, fps: 30 };

/**
 * MCP server configurations for scene_composer agent tools.
 * Set ICONS8_MCP_COMMAND in .env to enable direct MCP connection.
 * Falls back to Icons8 HTTP API automatically when not set.
 *
 * Example .env entry:
 *   ICONS8_MCP_COMMAND=uvx icons8-mcp
 */
export const MCP_SERVERS = {
  icons8: env.ICONS8_MCP_COMMAND
    ? {
        command: env.ICONS8_MCP_COMMAND.split(' ')[0],
        args: env.ICONS8_MCP_COMMAND.split(' ').slice(1),
        env: env.ICONS8_API_KEY ? { ICONS8_API_KEY: env.ICONS8_API_KEY } : {},
      }
    : null,

  // shadcn-ui component library — spawned per scene-composer run
  // Provides get_component, get_component_demo, list_components
  shadcn: {
    command: 'npx',
    args: ['-y', '@jpisnice/shadcn-ui-mcp-server'],
    env: {},
  },
};

export const PATHS = {
  root: PROJECT_ROOT,
  output: path.join(PROJECT_ROOT, 'output'),
  remotionTemplate: path.join(__dirname, 'remotion-template'),
};

export function validateKeys(nodes = ['anthropic']) {
  const missing = [];
  if (nodes.includes('gemini') && !KEYS.gemini) missing.push('GEMINI_API_KEY');
  if (nodes.includes('anthropic') && !KEYS.anthropic) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) throw new Error(`Missing API keys in .env: ${missing.join(', ')}`);
}

export function setupLangSmith() {
  if (!LANGSMITH.enabled) return false;
  process.env.LANGSMITH_TRACING = 'true';
  process.env.LANGSMITH_ENDPOINT = LANGSMITH.endpoint;
  process.env.LANGSMITH_API_KEY = LANGSMITH.apiKey;
  process.env.LANGSMITH_PROJECT = LANGSMITH.project;
  return true;
}
