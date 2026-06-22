/**
 * Pinecone-backed question bank (RAG) via the REST data plane.
 * (The JS SDK v8 has an upsert bug, so we call REST directly with fetch.)
 *
 * Every call is wrapped so failures NEVER break the interview flow — if
 * Pinecone is unavailable, callers fall back to normal Gemini generation.
 *
 * The index (`aihirex-jobs`) is dimension 1024, cosine — matched by the
 * Gemini `gemini-embedding-001` embeddings (see embeddings.ts).
 */
import { embed } from "@/lib/embeddings";

const API_KEY = process.env.PINECONE_API_KEY;
const INDEX = process.env.PINECONE_INDEX;

export interface BankQuestion {
  topic: string;
  subTopic: string;
  difficulty: "easy" | "medium" | "hard";
  type: "conceptual" | "coding" | "behavioral";
  text: string;
  keyPoints: string[];
  idealAnswer: string;
}

// Resolve and cache the index host from the Pinecone control plane.
let hostCache: string | null = null;
async function getHost(): Promise<string | null> {
  if (!API_KEY || !INDEX) return null;
  if (hostCache) return hostCache;
  try {
    const res = await fetch(`https://api.pinecone.io/indexes/${INDEX}`, {
      headers: { "Api-Key": API_KEY, "X-Pinecone-API-Version": "2024-07" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    hostCache = data.host ? `https://${data.host}` : null;
    return hostCache;
  } catch {
    return null;
  }
}

/** Store generated questions for reuse. Best-effort, never throws. */
export async function saveQuestions(role: string, questions: BankQuestion[]) {
  try {
    const host = await getHost();
    if (!host || !questions?.length) return;

    const vectors = await Promise.all(
      questions.map(async (q, i) => ({
        id: `${role}|${Date.now()}|${i}|${Math.random().toString(36).slice(2)}`,
        values: await embed(`${role} ${q.topic} ${q.text}`),
        metadata: {
          role,
          topic: q.topic,
          subTopic: q.subTopic || "",
          difficulty: q.difficulty,
          type: q.type,
          text: q.text,
          keyPoints: JSON.stringify(q.keyPoints || []),
          idealAnswer: q.idealAnswer || "",
        },
      }))
    );

    const res = await fetch(`${host}/vectors/upsert`, {
      method: "POST",
      headers: { "Api-Key": API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ vectors }),
    });
    if (!res.ok) {
      console.warn("[questionBank] save skipped:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[questionBank] save skipped:", (e as Error).message);
  }
}

/** Retrieve similar questions from the bank. Returns [] on any failure. */
export async function searchQuestions(
  role: string,
  focus: string,
  topK: number
): Promise<BankQuestion[]> {
  try {
    const host = await getHost();
    if (!host) return [];

    const vector = await embed(`${role} ${focus}`);
    const res = await fetch(`${host}/query`, {
      method: "POST",
      headers: { "Api-Key": API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ vector, topK, includeMetadata: true }),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.matches || [])
      .filter(
        (m: { score?: number; metadata?: unknown }) =>
          (m.score ?? 0) > 0.78 && m.metadata
      )
      .map((m: { metadata: Record<string, string> }) => {
        const md = m.metadata;
        return {
          topic: md.topic,
          subTopic: md.subTopic,
          difficulty: md.difficulty as BankQuestion["difficulty"],
          type: md.type as BankQuestion["type"],
          text: md.text,
          keyPoints: safeParse(md.keyPoints),
          idealAnswer: md.idealAnswer,
        };
      });
  } catch (e) {
    console.warn("[questionBank] search skipped:", (e as Error).message);
    return [];
  }
}

function safeParse(s: string): string[] {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
