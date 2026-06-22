/**
 * Text embeddings via Gemini (text-embedding-004 → 768 dims).
 * Uses the existing GEMINI_API_KEY — no extra key needed.
 */
const API_KEY = process.env.GEMINI_API_KEY as string;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const EMBED_DIM = 768;

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/models/text-embedding-004:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text.slice(0, 8000) }] },
    }),
  });
  if (!res.ok) throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.embedding?.values || [];
}
