/**
 * Text embeddings via Gemini `gemini-embedding-001`.
 * outputDimensionality is set to 1024 to match the Pinecone index
 * (`aihirex-jobs`, dim 1024, cosine). Uses the existing GEMINI_API_KEY.
 */
const API_KEY = process.env.GEMINI_API_KEY as string;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const EMBED_DIM = 1024;

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/models/gemini-embedding-001:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: EMBED_DIM,
    }),
  });
  if (!res.ok) throw new Error(`Embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.embedding?.values || [];
}
