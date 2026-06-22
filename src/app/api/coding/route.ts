import { NextRequest, NextResponse } from "next/server";
import { geminiJSON } from "@/lib/gemini";
import { codingChallengePrompt, codeReviewPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "challenge") {
      const { system, prompt } = codingChallengePrompt({
        language: body.language || "JavaScript",
        difficulty: body.difficulty || "medium",
        topic: body.topic,
      });
      const challenge = await geminiJSON(prompt, { system, temperature: 0.7 });
      return NextResponse.json({ challenge });
    }

    if (action === "review") {
      const { system, prompt } = codeReviewPrompt({
        language: body.language || "JavaScript",
        problem: body.problem || "",
        code: body.code || "",
        output: body.output || "",
      });
      const review = await geminiJSON(prompt, { system, temperature: 0.2 });
      return NextResponse.json({ review });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[coding] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
