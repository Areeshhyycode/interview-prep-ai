import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Interview from "@/models/Interview";
import { geminiJSON } from "@/lib/gemini";
import { followUpPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FollowUp {
  topic: string;
  subTopic: string;
  difficulty: "easy" | "medium" | "hard";
  type: "conceptual" | "coding" | "behavioral";
  text: string;
  keyPoints: string[];
  idealAnswer: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { order } = await req.json();

    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }

    const q = interview.questions.find(
      (x: { order: number }) => x.order === Number(order)
    );
    if (!q || !q.answer) {
      return NextResponse.json(
        { error: "Answer that question first." },
        { status: 400 }
      );
    }

    const fp = followUpPrompt({
      topic: q.topic,
      question: q.text,
      transcript: q.answer.transcript || "",
      correctness: q.answer.evaluation?.correctness || "partial",
      baseDifficulty: q.difficulty || "medium",
    });
    const follow = await geminiJSON<FollowUp>(fp.prompt, {
      system: fp.system,
      temperature: 0.6,
    });

    const nextOrder =
      Math.max(...interview.questions.map((x: { order: number }) => x.order)) + 1;
    const newQ = { ...follow, order: nextOrder, isFollowUp: true };
    interview.questions.push(newQ);
    await interview.save();

    return NextResponse.json({
      question: {
        order: nextOrder,
        topic: follow.topic,
        subTopic: follow.subTopic,
        difficulty: follow.difficulty,
        type: follow.type,
        text: follow.text,
      },
    });
  } catch (err) {
    console.error("[followup] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
