/**
 * Centralized configuration for the LangGraph video pipeline.
 * All model names, API settings, and pipeline constants in one place.
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
  research:     'claude-opus-4-6',               // Node 1: Research plan (best reasoning)
  sceneCoder:   'claude-sonnet-4-6',              // Node 3: Scene coding (parallel)
  imageGen:     'gemini-3.1-flash-image-preview', // Asset generation (image gen)
};

// ── API Keys ──
export const KEYS = {
  gemini:    env.GEMINI_API_KEY    || process.env.GEMINI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
};

// ── LangSmith Tracing ──
export const LANGSMITH = {
  enabled:  (env.LANGSMITH_TRACING || process.env.LANGSMITH_TRACING) === 'true',
  endpoint: env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  apiKey:   env.LANGSMITH_API_KEY  || process.env.LANGSMITH_API_KEY,
  project:  env.LANGSMITH_PROJECT  || process.env.LANGSMITH_PROJECT || 'explainer-videos',
};

// ── Canvas ──
export const CANVAS = {
  width: 1280,
  height: 720,
  viewBox: '0 0 1280 720',
};

// ── Color Palette ──
export const COLORS = {
  blue:   '#2b7ec2',
  red:    '#cc3333',
  green:  '#1e8c5a',
  navy:   '#2266bb',
  orange: '#cc7722',
  purple: '#8844aa',
  teal:   '#1a8a8a',
  brown:  '#8B4513',
};

// ── Paths ──
export const PATHS = {
  root: PROJECT_ROOT,
  output: path.join(PROJECT_ROOT, 'output'),
  templates: path.join(PROJECT_ROOT, 'templates'),
  assets: path.join(PROJECT_ROOT, 'assets'),
};

// ── Validate required keys ──
export function validateKeys(nodes = ['gemini']) {
  const missing = [];
  if (nodes.includes('gemini') && !KEYS.gemini) missing.push('GEMINI_API_KEY');
  if (nodes.includes('anthropic') && !KEYS.anthropic) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) {
    throw new Error(`Missing API keys in .env: ${missing.join(', ')}`);
  }
}

// ── Setup LangSmith env vars (must be set before importing LangChain) ──
export function setupLangSmith() {
  if (!LANGSMITH.enabled) return false;
  process.env.LANGSMITH_TRACING = 'true';
  process.env.LANGSMITH_ENDPOINT = LANGSMITH.endpoint;
  process.env.LANGSMITH_API_KEY = LANGSMITH.apiKey;
  process.env.LANGSMITH_PROJECT = LANGSMITH.project;
  return true;
}
