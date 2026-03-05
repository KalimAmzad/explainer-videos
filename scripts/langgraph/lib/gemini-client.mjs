/**
 * Gemini API client using @google/genai SDK.
 * Provides callGeminiJSON, callGeminiImage, callGeminiVision
 * with support for latest Gemini models (3.1, 3.0, 2.5, etc.)
 *
 * All calls are wrapped with LangSmith traceable() for full observability.
 */
import { GoogleGenAI } from '@google/genai';
import { traceable } from 'langsmith/traceable';
import { KEYS, PATHS } from '../config.mjs';

const ai = new GoogleGenAI({ apiKey: KEYS.gemini });

export const rootDir = PATHS.root;

/** Retry helper with exponential backoff for transient network errors. */
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isRetryable = e.message?.includes('fetch failed') ||
        e.message?.includes('ECONNRESET') ||
        e.message?.includes('429') ||
        e.message?.includes('503');
      if (!isRetryable || attempt === maxRetries) throw e;
      const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      console.log(`    [Gemini] Retry ${attempt + 1}/${maxRetries} after ${(delay / 1000).toFixed(1)}s: ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Generate structured JSON from a text prompt.
 */
export const callGeminiJSON = traceable(async function callGeminiJSON(model, prompt, schema) {
  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  }));
  const text = response.text;
  if (!text) throw new Error('No text in Gemini response');
  const usage = response.usageMetadata;
  if (usage) {
    console.log(`    [Gemini ${model}] ${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out`);
  }
  return JSON.parse(text);
}, { run_type: 'llm', name: 'gemini_json' });

/**
 * Generate an image using Gemini multimodal output.
 */
export const callGeminiImage = traceable(async function callGeminiImage(model, prompt) {
  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }));

  const parts = response.candidates?.[0]?.content?.parts || [];
  let imageData = null;
  let textResponse = '';

  for (const part of parts) {
    if (part.inlineData) imageData = part.inlineData;
    if (part.text) textResponse += part.text;
  }

  if (!imageData) {
    throw new Error(`No image returned. Text: ${textResponse.slice(0, 200)}`);
  }

  const usage = response.usageMetadata;
  if (usage) {
    console.log(`    [Gemini ${model} image] ${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out`);
  }

  return {
    buffer: Buffer.from(imageData.data, 'base64'),
    text: textResponse,
  };
}, { run_type: 'llm', name: 'gemini_image' });

/**
 * Analyze an image with Gemini Vision, optionally with structured output.
 */
export const callGeminiVision = traceable(async function callGeminiVision(model, imageBuffer, mimeType, prompt, schema) {
  const contents = [
    {
      inlineData: { mimeType, data: imageBuffer.toString('base64') },
    },
    prompt,
  ];

  const config = schema
    ? { responseMimeType: 'application/json', responseSchema: schema }
    : {};

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const text = response.text;
  if (!text) throw new Error('No text in vision response');
  const usage = response.usageMetadata;
  if (usage) {
    console.log(`    [Gemini ${model} vision] ${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out`);
  }
  return schema ? JSON.parse(text) : text;
}, { run_type: 'llm', name: 'gemini_vision' });
