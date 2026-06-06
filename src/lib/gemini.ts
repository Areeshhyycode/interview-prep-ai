/**
 * Minimal Gemini REST client (no SDK dependency).
 * Uses the Generative Language API generateContent endpoint.
 */

const API_KEY = process.env.GEMINI_API_KEY as string;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

if (!API_KEY) {
  // Don't throw at import time in dev; throw on use so the app still boots.
  console.warn("[gemini] GEMINI_API_KEY is missing in .env");
}

interface GenerateOptions {
  system?: string;
  temperature?: number;
  /** When true, asks the model to return application/json. */
  json?: boolean;
}

/**
 * Send a prompt to Gemini and get back the raw text response.
 */
export async function geminiGenerate(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<string> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") ?? "";

  return text.trim();
}

/**
 * Generate and parse a JSON response. Strips markdown code fences if present.
 */
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
  // Strip ```json ... ``` fences if the model added them.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    // Fallback: grab the first {...} or [...] block.
    const match = s.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Failed to parse JSON from Gemini response:\n" + raw.slice(0, 500));
  }
}
