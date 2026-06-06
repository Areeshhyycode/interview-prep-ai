import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import { geminiJSON } from "@/lib/gemini";
import { jdParsePrompt } from "@/lib/prompts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const rawText: string = (body.text || "").trim();
    const title: string = body.title || "Untitled Role";

    if (!rawText) {
      return NextResponse.json(
        { error: "Job description text is required." },
        { status: 400 }
      );
    }

    const { system, prompt } = jdParsePrompt(rawText);
    const parsed = await geminiJSON(prompt, { system, temperature: 0.2 });

    const job = await Job.create({ title, rawText, parsed });

    return NextResponse.json({ id: job._id, parsed: job.parsed });
  } catch (err) {
    console.error("[job] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to process job description." },
      { status: 500 }
    );
  }
}
