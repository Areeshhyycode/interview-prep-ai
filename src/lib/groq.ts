/**
 * Groq Whisper Speech-to-Text (REST). Accepts an audio file and returns text.
 * Browser Web Speech API is the primary (free, no-key) STT on the client;
 * this server route is the higher-accuracy fallback.
 */

const API_KEY = process.env.GROQ_API_KEY as string;
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

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
