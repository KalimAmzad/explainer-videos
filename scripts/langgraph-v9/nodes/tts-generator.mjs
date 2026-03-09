/**
 * Node: TTS Generator — generates audio from scene coder's narration script.
 *
 * Fan-out, one invocation per scene. Reads narrationSegments from
 * compiledScenes (produced by scene coder), concatenates text, generates
 * a single WAV file per scene.
 *
 * Output: { narrations: [{ sceneNumber, filePath, duration, text }] }
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { KEYS, MODELS } from '../config.mjs';

const TTS_MODEL = MODELS.tts;
const TTS_VOICE = 'Kore';
const WORDS_PER_SECOND = 2.5;

function getWavDuration(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 44) return buffer.length / (24000 * 1 * 2);
  const byteRate = buffer.readUInt32LE(28);
  if (byteRate === 0) return buffer.length / (24000 * 1 * 2);
  return (buffer.length - 44) / byteRate;
}

function estimateDurationFromText(text) {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).length / WORDS_PER_SECOND;
}

export async function ttsGeneratorNode(state) {
  const sceneIndex = state._sceneIndex;
  // Use revised scenes if available, fall back to compiled
  const allScenes = (state.revisedScenes?.length > 0 ? state.revisedScenes : state.compiledScenes) || [];

  // Find scenes that have narration, sorted by scene number
  const withNarration = allScenes
    .filter(s => s.narrationSegments?.length > 0)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  if (sceneIndex < 0 || sceneIndex >= withNarration.length) {
    const msg = `tts-generator: invalid _sceneIndex ${sceneIndex} (${withNarration.length} scenes with narration)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const scene = withNarration[sceneIndex];
  const sceneNumber = scene.sceneNumber;
  const segments = scene.narrationSegments || [];

  // Concatenate all narration segments into one text
  const fullText = segments.map(s => s.text).join(' ').trim();

  console.log(`\n  ── TTS Generator [Scene ${sceneNumber}] ──`);
  console.log(`    Segments: ${segments.length}`);
  console.log(`    Text: ${fullText.slice(0, 80)}${fullText.length > 80 ? '...' : ''}`);
  console.log(`    Words: ${fullText.split(/\s+/).length}`);

  if (!fullText) {
    console.log('    No narration text — skipping TTS');
    return { narrations: [{ sceneNumber, filePath: null, duration: 0, text: '' }] };
  }

  // Stagger to avoid rate limits
  const staggerMs = sceneIndex * 1500;
  if (staggerMs > 0) {
    console.log(`    Stagger delay: ${staggerMs}ms`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  const assetsDir = path.join(state.outputDir, 'remotion', 'public', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  const outputPath = path.join(assetsDir, `narration_scene${sceneNumber}.wav`);

  try {
    const result = await generateTTS(fullText, outputPath);
    return { narrations: [{ sceneNumber, filePath: outputPath, duration: result.duration, text: fullText }] };
  } catch (err) {
    console.warn(`    TTS FAILED: ${err.message}`);
    const estimatedDuration = estimateDurationFromText(fullText);
    console.log(`    Estimated duration: ${estimatedDuration.toFixed(1)}s`);
    return { narrations: [{ sceneNumber, filePath: null, duration: estimatedDuration, text: fullText }] };
  }
}

async function generateTTS(text, outputPath) {
  const apiKey = KEYS.gemini;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const ai = new GoogleGenAI({ apiKey });
  console.log(`    Calling ${TTS_MODEL} (voice: ${TTS_VOICE})...`);

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
      },
    },
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!audioPart) throw new Error('No audio data in TTS response');

  const rawPcm = Buffer.from(audioPart.inlineData.data, 'base64');
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = rawPcm.length;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([wavHeader, rawPcm]);
  fs.writeFileSync(outputPath, wavBuffer);

  const duration = dataSize / byteRate;
  console.log(`    Saved: ${path.basename(outputPath)} (${(wavBuffer.length / 1024).toFixed(1)} KB, ${duration.toFixed(1)}s)`);
  return { duration };
}
