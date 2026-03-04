import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load .env
const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
const apiKey = envContent.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error('No GEMINI_API_KEY found in .env'); process.exit(1); }

const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const prompt = `Create a professional infographic illustration about "Anger Management for Corporate Leaders".

Requirements:
- Clean, flat design infographic style with clear sections
- Include these 5 key areas as distinct visual sections arranged vertically or in a flow:
  1. "Recognize Triggers" — show a brain with warning signals
  2. "Pause & Breathe" — show a person doing deep breathing
  3. "Reframe the Situation" — show thought bubbles transforming negative to positive
  4. "Communicate Assertively" — show two people in professional dialogue
  5. "Practice Self-Care" — show wellness icons (exercise, meditation, sleep)
- Use a professional color palette: navy blue, teal, coral/orange accents, white
- Include a title banner at top: "ANGER MANAGEMENT FOR CORPORATE LEADERS"
- Include numbered steps (1-5) with clear labels
- Add small icons and illustrations for each section
- Clean white or light background
- Modern corporate infographic style, NOT cartoon-like
- Each section should have a clear border or container
- Include connecting arrows or flow lines between sections

Make it look like a real corporate training infographic poster.`;

console.log('Generating infographic image with Gemini...');
console.log(`Model: ${MODEL}`);

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    }
  })
});

if (!response.ok) {
  const errText = await response.text();
  console.error(`API error ${response.status}: ${errText}`);
  process.exit(1);
}

const data = await response.json();

// Extract image and text from response (API returns camelCase: inlineData, mimeType)
let imageData = null;
let textResponse = '';

for (const part of data.candidates?.[0]?.content?.parts || []) {
  if (part.inlineData || part.inline_data) {
    imageData = part.inlineData || part.inline_data;
  }
  if (part.text) {
    textResponse += part.text;
  }
}

if (!imageData) {
  console.error('No image returned in response.');
  console.error('Text response:', textResponse);
  console.error('Full response:', JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

// Save the image
const outputPath = path.join(rootDir, 'output', 'anger-management-infographic.png');
const imgBuffer = Buffer.from(imageData.data, 'base64');
fs.writeFileSync(outputPath, imgBuffer);
console.log(`Image saved to: ${outputPath}`);
console.log(`Image size: ${(imgBuffer.length / 1024).toFixed(1)} KB`);
console.log(`MIME type: ${imageData.mimeType || imageData.mime_type}`);

if (textResponse) {
  console.log('\nGemini text response:');
  console.log(textResponse);
}
