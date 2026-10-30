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

// Server-side LLM transcript summarization endpoint supporting Gemini Cloud and Local Ollama
app.post('/api/summarize-transcript', async (req, res) => {
  try {
    const { transcript, context, providerConfig } = req.body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript text is required for summarization.' });
    }

    const project = context?.project ? `Project: ${context.project}` : '';
    const category = context?.category ? `Category: ${context.category}` : '';
    const tags = Array.isArray(context?.tags) && context.tags.length > 0 ? `Tags: ${context.tags.join(', ')}` : '';
    const metadataContext = [project, category, tags].filter(Boolean).join(' | ');

    const promptText = `Analyze the following transcript from an IT voice recording, meeting, or field note.
${metadataContext ? `Session Metadata Context: [${metadataContext}]\n` : ''}

Transcript:
"""
${transcript.trim()}
"""

Provide an executive summary, concrete action items, key technical takeaways, and a clean IT support log entry formatted for ticketing systems (ServiceNow/Jira/ITIL notes).
Return your response as a valid JSON object with keys: summary (string), actionItems (array of strings), keyTakeaways (array of strings), itLogEntry (string).`;

    // If local Ollama provider is requested
    if (providerConfig && providerConfig.provider === 'ollama') {
      const endpoint = (providerConfig.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
      const model = providerConfig.ollamaModel || 'llama3';

      try {
        const ollamaRes = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: promptText + '\nOutput ONLY valid JSON matching the requested schema.',
            stream: false,
            format: 'json',
          }),
        });

        if (!ollamaRes.ok) {
          throw new Error(`Ollama server error status ${ollamaRes.status}`);
        }

        const ollamaData = await ollamaRes.json();
        const rawResponse = ollamaData.response || '{}';
        
        // Clean markdown code blocks if any
        const cleanedJson = rawResponse.replace(/```json\s*([\s\S]*?)\s*```/g, '$1').replace(/```\s*([\s\S]*?)\s*```/g, '$1').trim();
        const parsed = JSON.parse(cleanedJson);

        return res.json({
          success: true,
          summary: parsed.summary || 'Summary unavailable.',
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
          itLogEntry: parsed.itLogEntry || '',
          modelUsed: `Ollama (${model})`,
        });
      } catch (ollamaErr: any) {
        console.warn('Ollama request failed, falling back to Gemini Cloud:', ollamaErr?.message);
      }
    }

    // Default Gemini Cloud API
    const { Type } = await import('@google/genai');
    const ai = getGenAiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: promptText }],
      config: {
        systemInstruction: `You are an expert Senior IT Support Engineer and IT Infrastructure Analyst.
Your task is to analyze audio transcripts and extract high-value, structured summaries for IT support logs.
Output must be structured JSON adhering strictly to the schema provided.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A concise 2-4 sentence executive summary highlighting core IT issue, resolution, or discussion.',
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Concrete action items, follow-up tasks, tickets, or verification steps.',
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key technical findings, hardware/software affected, or decisions made.',
            },
            itLogEntry: {
              type: Type.STRING,
              description: 'A clean, formatted single-block IT Support Log entry for ticketing system notes.',
            },
          },
          required: ['summary', 'actionItems', 'keyTakeaways', 'itLogEntry'],
        },
      },
    });

    const jsonText = (response.text || '{}').trim();
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      summary: parsed.summary || 'Summary unavailable.',
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      itLogEntry: parsed.itLogEntry || '',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/summarize-transcript:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate LLM transcript summary.',
    });
  }
});

// Server-side video generation endpoint using gemini-omni-1.1-flash (Animate Image to Video)
app.post('/api/animate-image-to-video', async (req, res) => {
  try {
    const { image, mimeType = 'image/png', prompt, aspectRatio = '16:9' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Source image payload is required.' });
    }

    const base64Data = image.replace(/^data:[^;]+;base64,/, '');
    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    const ai = getGenAiClient();
    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.1-flash',
      input: [
        {
          type: 'image',
          mime_type: mimeType || 'image/png',
          data: base64Data,
        },
        {
          type: 'text',
          text: prompt && typeof prompt === 'string' && prompt.trim()
            ? prompt.trim()
            : 'Animate this photo with natural motion and cinematic lighting.',
        },
      ],
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: validAspectRatio,
        duration: '5s',
        resolution: '720p',
      },
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (!videoPart || !videoPart.data) {
      throw new Error('Model did not return a video payload.');
    }

    res.json({
      success: true,
      video: videoPart.data,
      mimeType: videoPart.mime_type || 'video/mp4',
      model: 'gemini-omni-1.1-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/animate-image-to-video:', error);
    res.status(500).json({
      error: error?.message || 'Failed to animate image into video. Please try again.',
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
