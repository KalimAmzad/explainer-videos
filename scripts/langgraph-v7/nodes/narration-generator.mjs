/**
 * Narration Generator — fan-out node, one invocation per scene.
 * Generates TTS audio using the Gemini API for each scene's narration text.
 *
 * Receives `state._sceneIndex` (0-based) via LangGraph Send API.
 * Reads narration_full from the corresponding sceneDesign.
 *
 * Output: { narrations: [{ sceneNumber, filePath, duration, text }] }
 */
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { KEYS } from '../config.mjs';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_VOICE = 'Kore'; // Clear, professional voice
const WORDS_PER_SECOND = 2.5; // 150 wpm

// ── WAV duration ──────────────────────────────────────────────────

/**
 * Calculate duration of a WAV file by reading its header.
 * Standard WAV: byte rate at offset 28 (uint32 LE), data starts at offset 44.
 * @param {string} filePath - Path to WAV file
 * @returns {number} Duration in seconds
 */
function getWavDuration(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Sanity check — file must be at least a WAV header
  if (buffer.length < 44) {
    console.warn('    WAV file too small for header, estimating from size');
    // Assume 24kHz mono 16-bit PCM as Gemini default
    return buffer.length / (24000 * 1 * 2);
  }

  const byteRate = buffer.readUInt32LE(28);
  if (byteRate === 0) {
    console.warn('    WAV byteRate is 0, estimating from size (24kHz/mono/16bit)');
    return buffer.length / (24000 * 1 * 2);
  }

  const dataSize = buffer.length - 44;
  return dataSize / byteRate;
}

/**
 * Estimate narration duration from word count (fallback when TTS unavailable).
 * @param {string} text - Narration text
 * @returns {number} Duration in seconds
 */
function estimateDurationFromText(text) {
  if (!text || text.trim() === '') return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount / WORDS_PER_SECOND;
}

// ── Main entry point ──────────────────────────────────────────────

export async function narrationGeneratorNode(state) {
  const sceneIndex = state._sceneIndex;
  const sceneDesigns = state.sceneDesigns || [];

  if (sceneIndex < 0 || sceneIndex >= sceneDesigns.length) {
    const msg = `narration-generator: invalid _sceneIndex ${sceneIndex} (${sceneDesigns.length} scenes)`;
    console.error(`    ${msg}`);
    return { errors: [msg] };
  }

  const sceneDesign = sceneDesigns[sceneIndex];
  const sceneNumber = sceneDesign.scene_number || sceneIndex + 1;
  const narrationText = (sceneDesign.narration_full || '').trim();

  console.log(`\n  ── Narration Generator [Scene ${sceneNumber}] ──`);

  // Handle empty narration
  if (!narrationText) {
    console.log('    No narration text — skipping TTS');
    return {
      narrations: [{
        sceneNumber,
        filePath: null,
        duration: 0,
        text: '',
      }],
    };
  }

  console.log(`    Text: ${narrationText.slice(0, 80)}${narrationText.length > 80 ? '...' : ''}`);
  console.log(`    Words: ${narrationText.split(/\s+/).length}`);

  // Stagger parallel calls to avoid rate limits
  const staggerMs = sceneIndex * 1000;
  if (staggerMs > 0) {
    console.log(`    Stagger delay: ${staggerMs}ms`);
    await new Promise(r => setTimeout(r, staggerMs));
  }

  // Ensure output directory exists
  const assetsDir = path.join(state.outputDir, 'remotion', 'public', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const outputPath = path.join(assetsDir, `narration_scene${sceneNumber}.wav`);

  try {
    const result = await generateTTS(narrationText, outputPath);
    return {
      narrations: [{
        sceneNumber,
        filePath: outputPath,
        duration: result.duration,
        text: narrationText,
      }],
    };
  } catch (err) {
    console.warn(`    TTS FAILED: ${err.message}`);
    console.warn('    Falling back to duration estimate from word count');

    const estimatedDuration = estimateDurationFromText(narrationText);
    console.log(`    Estimated duration: ${estimatedDuration.toFixed(1)}s`);

    return {
      narrations: [{
        sceneNumber,
        filePath: null,
        duration: estimatedDuration,
        text: narrationText,
      }],
    };
  }
}

// ── TTS generation ────────────────────────────────────────────────

/**
 * Generate TTS audio via Gemini API and save to disk.
 * @param {string} text - Narration text
 * @param {string} outputPath - Path to save the WAV file
 * @returns {{ duration: number }} Audio duration in seconds
 */
async function generateTTS(text, outputPath) {
  const apiKey = KEYS.gemini;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set — cannot generate TTS');
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`    Calling ${TTS_MODEL} (voice: ${TTS_VOICE})...`);

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{
      parts: [{ text }],
    }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: TTS_VOICE,
          },
        },
      },
    },
  });

  // Extract audio data from response
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidates in TTS response');
  }

  const parts = candidate.content?.parts || [];
  const audioPart = parts.find(p => p.inlineData);
  if (!audioPart) {
    throw new Error('No audio data in TTS response');
  }

  const audioData = audioPart.inlineData;
  const mimeType = audioData.mimeType || 'audio/wav';
  console.log(`    Received audio: ${mimeType}`);

  // Decode and save
  const buffer = Buffer.from(audioData.data, 'base64');
  fs.writeFileSync(outputPath, buffer);

  const sizeKB = (buffer.length / 1024).toFixed(1);

  // Calculate duration
  let duration;
  if (mimeType.includes('wav') || mimeType.includes('pcm')) {
    duration = getWavDuration(outputPath);
  } else {
    // For non-WAV formats, estimate from word count as fallback
    console.warn(`    Unexpected mime type ${mimeType}, estimating duration from text`);
    duration = estimateDurationFromText(text);
  }

  console.log(`    Saved: ${path.basename(outputPath)} (${sizeKB} KB, ${duration.toFixed(1)}s)`);

  return { duration };
}
