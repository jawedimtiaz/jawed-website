import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable JSON body parsing up to 50MB for audio uploads/base64 payload
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy server-side Gemini API client initialization
function getGenAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side audio transcription API endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, mimeType = 'audio/webm', prompt, contextMode } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio payload is required.' });
    }

    // Sanitize base64 string
    const base64Data = audio.replace(/^data:[^;]+;base64,/, '');

    let customPrompt = `You are an expert IT support & technical note audio transcriber powered by Gemini.
Transcribe the provided audio accurately.
Structure your output into these clear markdown sections:

### 📄 Full Transcript
(Provide clean, punctuated transcription of the audio content)

### 📋 Key Summary
(2-3 sentences capturing the core message, issue, or discussion)

### ⚙ Action Items & Next Steps
- (List concrete tasks, follow-ups, or ticket requirements mentioned)

### 🏷 Technical Details & Terms
- (Highlight hardware models, software names, IP addresses, error codes, or tech terms mentioned)`;

    if (contextMode === 'service_desk') {
      customPrompt = `You are an IT Service Desk Voice Assistant.
Convert the recorded call/voice note into an official Service Desk Ticket Note.
Format output into:
### 🎫 Ticket Subject Line
### 👤 User / Reporter Info & Impact
### 🔍 Issue Description & Symptoms
### 🛠 Diagnostics & Troubleshooting Taken
### 📌 Resolution / Pending Next Steps`;
    } else if (contextMode === 'summary_only') {
      customPrompt = `Transcribe this audio concise and provide a bulleted executive summary of key takeaways and decisions.`;
    } else if (prompt && typeof prompt === 'string' && prompt.trim()) {
      customPrompt = prompt.trim();
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: base64Data,
      },
    };

    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: customPrompt }],
      },
    });

    const transcriptText = response.text || 'No transcript text returned from model.';

    res.json({
      success: true,
      transcript: transcriptText,
      model: 'gemini-3.5-transcribe',
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    res.status(500).json({
      error: error?.message || 'Failed to transcribe audio. Please check your recording or try again.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { overlay: false } },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('.', 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static('dist'));
    app.use((_req, res) => {
      res.sendFile(path.resolve('.', 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
