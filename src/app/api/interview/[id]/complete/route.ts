import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Interview from "@/models/Interview";
import { geminiJSON } from "@/lib/gemini";
import { reportPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Report {
  scores: {
    technical: number;
    communication: number;
    confidence: number;
    overallReadiness: number;
  };
  weakTopics: { topic: string; score: number; suggestion: string }[];
  strongTopics: string[];
  summary: string;
  recommendations: string[];
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }

    const evaluations = interview.questions
      .filter((q: { answer?: { evaluation?: unknown } }) => q.answer?.evaluation)
      .map((q: { topic: string; difficulty: string; answer?: { evaluation?: unknown } }) => ({
        topic: q.topic,
        difficulty: q.difficulty,
        ...(q.answer!.evaluation as object),
      }));

    if (evaluations.length === 0) {
      return NextResponse.json(
        { error: "No answers to evaluate yet." },
        { status: 400 }
      );
    }

    const rp = reportPrompt({
      evaluations,
      jobTitle: interview.jobTitle || "Role",
      seniority: interview.seniority || "mid",
    });
    const report = await geminiJSON<Report>(rp.prompt, {
      system: rp.system,
      temperature: 0.3,
    });

    interview.report = report;
    interview.status = "completed";
    interview.completedAt = new Date();
    await interview.save();

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[complete] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to build report." },
      { status: 500 }
    );
  }
}
