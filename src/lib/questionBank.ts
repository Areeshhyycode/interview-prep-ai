/**
 * Pinecone-backed question bank (RAG).
 * Every call is wrapped so failures NEVER break the interview flow —
 * if Pinecone is unavailable or the index dims mismatch, callers fall back
 * to normal Gemini generation.
 *
 * NOTE: the Pinecone index must be created with dimension 768 (Gemini
 * text-embedding-004) and metric "cosine".
 */
import { Pinecone } from "@pinecone-database/pinecone";
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

function getIndex() {
  if (!API_KEY || !INDEX) return null;
  try {
    return new Pinecone({ apiKey: API_KEY }).index(INDEX);
  } catch {
    return null;
  }
}

/** Store generated questions for reuse. Best-effort, never throws. */
export async function saveQuestions(role: string, questions: BankQuestion[]) {
  const index = getIndex();
  if (!index) return;
  try {
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
    await index.upsert(
      vectors as unknown as Parameters<typeof index.upsert>[0]
    );
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
  const index = getIndex();
  if (!index) return [];
  try {
    const vector = await embed(`${role} ${focus}`);
    const res = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });
    return (res.matches || [])
      .filter((m) => (m.score ?? 0) > 0.78 && m.metadata)
      .map((m) => {
        const md = m.metadata as Record<string, string>;
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
