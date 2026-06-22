import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Interview from "@/models/Interview";
import { geminiJSON } from "@/lib/gemini";
import { evaluateAndTeachPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Evaluation {
  technicalScore: number;
  correctness: "correct" | "partial" | "incorrect";
  coveredPoints: string[];
  missedPoints: string[];
  communicationNotes: string;
  confidenceSignals: string;
  feedback: string;
}

interface Teacher {
  explanation: string;
  correctAnswer: string;
  example: string;
  tip: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { order, transcript = "", durationSec = 0 } = await req.json();

    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }

    const q = interview.questions.find(
      (x: { order: number }) => x.order === Number(order)
    );
    if (!q) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    // Evaluate + explain the concept in ONE call (saves Gemini quota).
    const ep = evaluateAndTeachPrompt({
      question: q.text,
      topic: q.topic,
      keyPoints: q.keyPoints || [],
      idealAnswer: q.idealAnswer || "",
      transcript,
      durationSec: Number(durationSec) || 0,
    });
    const result = await geminiJSON<{ evaluation: Evaluation; teacher: Teacher }>(
      ep.prompt,
      { system: ep.system, temperature: 0.3 }
    );
    const evaluation = result.evaluation;
    const teacher = result.teacher;

    // 3. Persist.
    q.answer = {
      transcript,
      durationSec: Number(durationSec) || 0,
      evaluation,
      teacher: teacher || undefined,
      answeredAt: new Date(),
    };
    if (interview.status === "created") interview.status = "in_progress";
    if (!interview.startedAt) interview.startedAt = new Date();
    await interview.save();

    return NextResponse.json({ evaluation, teacher });
  } catch (err) {
    console.error("[answer] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to evaluate answer." },
      { status: 500 }
    );
  }
}
