/**
 * LangGraph v8 config — Production Pipeline.
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
  contentPlanner:     'claude-haiku-4-5-20251001',   // Theme + content planning
  storyboardDesigner: 'claude-haiku-4-5-20251001',    // Visual blueprint (Anthropic)
  sceneCoder:         'qwen/qwen3.5-35b-a3b',        // TSX generation (OpenRouter)
  imageGen:           'gemini-3.1-flash-image-preview',
  tts:                'gemini-2.5-flash-preview-tts',
};

export const KEYS = {
  gemini:      env.GEMINI_API_KEY      || process.env.GEMINI_API_KEY,
  anthropic:   env.ANTHROPIC_API_KEY   || process.env.ANTHROPIC_API_KEY,
  openai:      env.OPENAI_API_KEY      || process.env.OPENAI_API_KEY,
  openrouter:  env.OPENROUTER_API_KEY  || process.env.OPENROUTER_API_KEY,
};

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const LANGSMITH = {
  enabled:  (env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING) === 'true',
  endpoint: env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey:   env.LANGSMITH_API_KEY  || process.env.LANGSMITH_API_KEY,
  project:  env.LANGSMITH_PROJECT  || process.env.LANGSMITH_PROJECT || 'explainer-videos-v8',
};

export const CANVAS = { width: 1280, height: 720, fps: 30 };

export const PATHS = {
  root: PROJECT_ROOT,
  output: path.join(PROJECT_ROOT, 'output'),
  // Reuse v7's Remotion template (shared infrastructure)
  remotionTemplate: path.join(__dirname, '..', 'langgraph-v7', 'remotion-template'),
};

export function validateKeys(nodes = ['anthropic']) {
  const missing = [];
  if (nodes.includes('gemini') && !KEYS.gemini) missing.push('GEMINI_API_KEY');
  if (nodes.includes('anthropic') && !KEYS.anthropic) missing.push('ANTHROPIC_API_KEY');
  if (nodes.includes('openai') && !KEYS.openai) missing.push('OPENAI_API_KEY');
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
