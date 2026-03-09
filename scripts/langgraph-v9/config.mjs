/**
 * LangGraph v9 config — Scene-Coder-First Pipeline.
 *
 * Scene coder has full creative ownership: plans visuals, codes TSX,
 * writes narration scripts. No storyboard, no external assets.
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
  contentPlanner: 'claude-haiku-4-5-20251001',    // Scene breakdown only
  sceneCoder:     'minimax/minimax-m2.5',          // Creative brain via OpenRouter
  criticReviser:  'minimax/minimax-m2.5',          // Creative director via OpenRouter
  imageGen:       'gemini-3.1-flash-image-preview', // Nano Banana — hero illustrations
  tts:            'gemini-2.5-flash-preview-tts',  // TTS from scene coder's narration script
};

export const KEYS = {
  gemini:     env.GEMINI_API_KEY     || process.env.GEMINI_API_KEY,
  anthropic:  env.ANTHROPIC_API_KEY  || process.env.ANTHROPIC_API_KEY,
  openrouter: env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
};

export const LANGSMITH = {
  enabled:  (env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING) === 'true',
  endpoint: env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey:   env.LANGSMITH_API_KEY  || process.env.LANGSMITH_API_KEY,
  project:  env.LANGSMITH_PROJECT  || process.env.LANGSMITH_PROJECT || 'explainer-videos-v9',
};

export const CANVAS = { width: 1280, height: 720, fps: 30 };

export const PATHS = {
  root: PROJECT_ROOT,
  output: path.join(PROJECT_ROOT, 'output'),
  remotionTemplate: path.join(__dirname, '..', 'langgraph-v7', 'remotion-template'),
};

export function validateKeys(nodes = ['anthropic']) {
  const missing = [];
  if (nodes.includes('gemini') && !KEYS.gemini) missing.push('GEMINI_API_KEY');
  if (nodes.includes('anthropic') && !KEYS.anthropic) missing.push('ANTHROPIC_API_KEY');
  if (nodes.includes('openrouter') && !KEYS.openrouter) missing.push('OPENROUTER_API_KEY');
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
