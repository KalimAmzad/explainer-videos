/**
 * LangGraph v5 config — Image-guided SVG animation pipeline.
 * Uses LangChain model wrappers for proper LangSmith cost tracking.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ── Load .env ──
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

// ── Models ──
export const MODELS = {
  research:    'claude-opus-4-6',              // Node 1: Research planner
  imageGen:    'gemini-3.1-flash-image-preview', // Node 2: Nano Banana 2 scene images
  sceneCoder:  'claude-sonnet-4-6',             // Node 3: SVG coder (sees image)
};

// ── API Keys ──
export const KEYS = {
  gemini:    env.GEMINI_API_KEY    || process.env.GEMINI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
};

// ── LangSmith ──
export const LANGSMITH = {
  enabled:  (env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING) === 'true',
  endpoint: env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey:   env.LANGSMITH_API_KEY  || process.env.LANGSMITH_API_KEY,
  project:  env.LANGSMITH_PROJECT  || process.env.LANGSMITH_PROJECT || 'explainer-videos-v5',
};

// ── Canvas ──
export const CANVAS = { width: 1280, height: 720, viewBox: '0 0 1280 720' };

// ── Paths ──
export const PATHS = {
  root: PROJECT_ROOT,
  output: path.join(PROJECT_ROOT, 'output'),
};

export function validateKeys(nodes = ['gemini', 'anthropic']) {
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
