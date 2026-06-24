/**
 * Groq Whisper Speech-to-Text (REST). Accepts an audio file and returns text.
 * Browser Web Speech API is the primary (free, no-key) STT on the client;
 * this server route is the higher-accuracy fallback.
 */

const API_KEY = process.env.GROQ_API_KEY as string;
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const LLM_MODEL = process.env.GROQ_LLM_MODEL || "llama-3.3-70b-versatile";

/**
 * Groq chat completion (OpenAI-compatible). Used as a fast, high-free-limit
 * fallback for Gemini when its quota is exhausted.
 */
export async function groqChat(
  prompt: string,
  opts: { system?: string; json?: boolean; temperature?: number } = {}
): Promise<string> {
  if (!API_KEY) throw new Error("GROQ_API_KEY is not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0.6,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq chat error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

export async function speechToText(
  audio: Blob | File,
  filename = "answer.webm"
): Promise<string> {
  if (!API_KEY) throw new Error("GROQ_API_KEY is not configured");

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", STT_MODEL);
  form.append("response_format", "json");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq STT error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.text || "").trim();
}
