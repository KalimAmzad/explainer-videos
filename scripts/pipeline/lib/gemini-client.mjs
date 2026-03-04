/**
 * Shared Gemini API client.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');

// Load API key
const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error('No GEMINI_API_KEY found in .env'); process.exit(1); }

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini(model, contents, generationConfig = {}) {
  const endpoint = `${BASE_URL}/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contents, generationConfig }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts;
}

export async function callGeminiJSON(model, prompt, schema) {
  const parts = await callGemini(model, [{ parts: [{ text: prompt }] }], {
    responseMimeType: 'application/json',
    responseSchema: schema,
  });
  const text = parts[0]?.text;
  if (!text) throw new Error('No text in Gemini response');
  return JSON.parse(text);
}

export async function callGeminiImage(model, prompt) {
  const parts = await callGemini(model, [{ parts: [{ text: prompt }] }], {
    responseModalities: ['TEXT', 'IMAGE'],
  });
  let imageData = null;
  let textResponse = '';
  for (const part of parts) {
    if (part.inlineData || part.inline_data) imageData = part.inlineData || part.inline_data;
    if (part.text) textResponse += part.text;
  }
  if (!imageData) throw new Error(`No image returned. Text: ${textResponse.slice(0, 200)}`);
  return { buffer: Buffer.from(imageData.data, 'base64'), text: textResponse };
}

export async function callGeminiVision(model, imageBuffer, mimeType, prompt, schema) {
  const parts = await callGemini(model,
    [{ parts: [
      { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
      { text: prompt }
    ] }],
    schema ? { responseMimeType: 'application/json', responseSchema: schema } : {}
  );
  const text = parts[0]?.text;
  if (!text) throw new Error('No text in vision response');
  return schema ? JSON.parse(text) : text;
}

export { rootDir };
