/**
 * LLM client. Groq (Llama) is the PRIMARY provider — fast and with much
 * higher free limits. Google Gemini is the FALLBACK. The exported names keep
 * "gemini" for backwards-compatibility with existing imports.
 *
 * Embeddings still use Gemini directly (see embeddings.ts); Groq has no
 * embeddings endpoint.
 */
import { groqChat } from "@/lib/groq";

const API_KEY = process.env.GEMINI_API_KEY as string;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
// "groq" (default) → Groq primary, Gemini fallback. "gemini" → reverse.
const PRIMARY = (process.env.LLM_PROVIDER || "groq").toLowerCase();

interface GenerateOptions {
  system?: string;
  temperature?: number;
  /** When true, asks the model to return application/json. */
  json?: boolean;
}

/** Direct Gemini call (REST). Throws on any non-OK after a brief 5xx retry. */
async function geminiDirect(prompt: string, opts: GenerateOptions): Promise<string> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  let res: Response | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    lastErr = await res.text();
    // Retry only transient overloads, briefly.
    if ((res.status === 503 || res.status === 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    throw new Error(`Gemini API error ${res.status}: ${lastErr}`);
  }
  if (!res || !res.ok) throw new Error(`Gemini API error: ${lastErr}`);

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") ?? "";
  return text.trim();
}

/** Generate text using the primary provider, falling back to the other. */
export async function geminiGenerate(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  const useGroq = () =>
    groqChat(prompt, {
      system: opts.system,
      json: opts.json,
      temperature: opts.temperature,
    });

  const primary = PRIMARY === "gemini" ? () => geminiDirect(prompt, opts) : useGroq;
  const fallback = PRIMARY === "gemini" ? useGroq : () => geminiDirect(prompt, opts);

  try {
    return await primary();
  } catch (e1) {
    try {
      return await fallback();
    } catch (e2) {
      throw new Error(
        `Both LLM providers failed. Primary: ${(e1 as Error).message}; Fallback: ${(e2 as Error).message}`
      );
    }
  }
}

/** Generate and parse a JSON response. Strips markdown code fences if present. */
export async function geminiJSON<T = unknown>(
  prompt: string,
  opts: Omit<GenerateOptions, "json"> = {}
): Promise<T> {
  const raw = await geminiGenerate(prompt, { ...opts, json: true });
  return parseJSON<T>(raw);
}

/** Robustly extract a JSON object/array from an LLM response. */
export function parseJSON<T = unknown>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    const match = s.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Failed to parse JSON from LLM response:\n" + raw.slice(0, 500));
  }
}
