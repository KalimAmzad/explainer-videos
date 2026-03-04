/**
 * Gemini API client using @google/genai SDK.
 * Provides callGeminiJSON, callGeminiImage, callGeminiVision
 * with support for latest Gemini models (3.1, 3.0, 2.5, etc.)
 */
import { GoogleGenAI } from '@google/genai';
import { KEYS, PATHS } from '../config.mjs';

const ai = new GoogleGenAI({ apiKey: KEYS.gemini });

export const rootDir = PATHS.root;

/**
 * Generate structured JSON from a text prompt.
 */
export async function callGeminiJSON(model, prompt, schema) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  const text = response.text;
  if (!text) throw new Error('No text in Gemini response');
  return JSON.parse(text);
}

/**
 * Generate an image using Gemini multimodal output.
 */
export async function callGeminiImage(model, prompt) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

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

  return {
    buffer: Buffer.from(imageData.data, 'base64'),
    text: textResponse,
  };
}

/**
 * Analyze an image with Gemini Vision, optionally with structured output.
 */
export async function callGeminiVision(model, imageBuffer, mimeType, prompt, schema) {
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
  return schema ? JSON.parse(text) : text;
}
