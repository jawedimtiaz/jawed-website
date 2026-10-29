interface Env {
  AI?: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>;
  };
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MODEL = "@cf/openai/whisper";

function json(body: Record<string, unknown>, status = 200, requestId = crypto.randomUUID()): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
    },
  });
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    if (!context?.request || !context.env) {
      return json({ error: "Transcription service is unavailable.", code: "TRANSCRIBE_CONTEXT_INVALID" }, 503, requestId);
    }
    if (!context.env.AI || typeof context.env.AI.run !== "function") {
      return json({
        error: "Transcription is not configured on this deployment. Please contact the site administrator.",
        code: "TRANSCRIBE_NOT_CONFIGURED",
        requestId,
      }, 503, requestId);
    }

    const contentType = context.request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Send the audio as an application/json request.", code: "INVALID_CONTENT_TYPE", requestId }, 415, requestId);
    }

    const rawBody = await context.request.text();
    if (!rawBody || rawBody.length > Math.ceil(MAX_AUDIO_BYTES * 1.5) + 200_000) {
      return json({ error: "Audio payload is empty or exceeds the 25 MB limit.", code: "INVALID_AUDIO_SIZE", requestId }, 413, requestId);
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Request body must be valid JSON.", code: "INVALID_JSON", requestId }, 400, requestId);
    }

    if (typeof body.audio !== "string") {
      return json({ error: "Audio payload is required.", code: "AUDIO_REQUIRED", requestId }, 400, requestId);
    }

    const mimeMatch = body.audio.match(/^data:([^;,]+);base64,/i);
    const mimeType = String(body.mimeType || mimeMatch?.[1] || "audio/webm").split(";")[0].toLowerCase();
    const supportedMime = /^(audio\/(webm|mp4|mpeg|mp3|wav|ogg|aac|flac|x-m4a|m4a|3gpp)|video\/webm)$/i.test(mimeType);
    if (!supportedMime) {
      return json({ error: `Unsupported audio format: ${mimeType}. Upload a WebM, MP4/M4A, MP3, WAV, OGG, AAC, or FLAC file.`, code: "UNSUPPORTED_AUDIO_FORMAT", requestId }, 415, requestId);
    }

    const base64 = body.audio.replace(/^data:[^;,]+;base64,/i, "").replace(/\s/g, "");
    if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      return json({ error: "Audio data is empty or malformed. Please record again.", code: "INVALID_AUDIO_DATA", requestId }, 400, requestId);
    }
    const estimatedBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    if (estimatedBytes < 128 || estimatedBytes > MAX_AUDIO_BYTES) {
      return json({ error: estimatedBytes < 128 ? "The recording contains no usable audio data." : "Audio exceeds the 25 MB limit.", code: "INVALID_AUDIO_SIZE", requestId }, estimatedBytes < 128 ? 400 : 413, requestId);
    }

    // Whisper accepts base64-encoded audio through the Workers AI binding.
    const result: any = await context.env.AI.run(MODEL, { audio: base64, task: "transcribe" });
    const transcript = typeof result?.text === "string" ? result.text.trim() : "";
    if (!transcript) {
      return json({ error: "The transcription model returned no speech text. Try a longer or clearer recording.", code: "EMPTY_TRANSCRIPT", requestId }, 502, requestId);
    }

    let formattedTranscript = transcript;
    const mode = String(body.contextMode || "standard");
    if (mode === "service_desk") {
      formattedTranscript = [
        "### Issue Description & Symptoms",
        transcript,
        "",
        "### Diagnostics & Troubleshooting Taken",
        "Not specified in the transcript.",
        "",
        "### Resolution / Pending Next Steps",
        "Review the transcript and confirm any required follow-up.",
      ].join("\n");
    } else if (mode === "summary_only") {
      formattedTranscript = "### Transcript\n" + transcript;
    } else if (mode === "custom" && typeof body.prompt === "string" && body.prompt.trim()) {
      formattedTranscript = "### Transcript\n" + transcript + "\n\n### Requested instructions\n" + body.prompt.trim().slice(0, 1000);
    } else {
      formattedTranscript = "### Full Transcript\n" + transcript;
    }

    return json({ success: true, transcript: formattedTranscript, model: MODEL, requestId }, 200, requestId);
  } catch (error) {
    console.error("[api/transcribe] request failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return json({
      error: "The transcription service failed to process this audio. Please retry; if it continues, share the request ID with the site administrator.",
      code: "TRANSCRIBE_FAILED",
      requestId,
    }, 502, requestId);
  }
}

export async function onRequestGet(): Promise<Response> {
  return json({ error: "Use POST to submit audio for transcription.", code: "METHOD_NOT_ALLOWED" }, 405);
}
