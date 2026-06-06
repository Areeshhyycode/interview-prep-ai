import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Interview from "@/models/Interview";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const interview = (await Interview.findById(id).lean()) as unknown as {
      _id: unknown;
      jobTitle?: string;
      status?: string;
      difficulty?: string;
      stack?: string[];
      matchScore?: number;
      voiceId?: string;
      report?: unknown;
      questions?: Array<{
        order: number;
        topic: string;
        subTopic: string;
        difficulty: string;
        type: string;
        text: string;
        answer?: {
          transcript?: string;
          teacher?: unknown;
          evaluation?: {
            correctness?: string;
            feedback?: string;
            technicalScore?: number;
          };
        };
      }>;
    } | null;
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }

    // Trim sensitive grading fields (idealAnswer/keyPoints) from the live room view.
    const questions = (interview.questions || []).map((q) => ({
      order: q.order,
      topic: q.topic,
      subTopic: q.subTopic,
      difficulty: q.difficulty,
      type: q.type,
      text: q.text,
      answered: !!q.answer?.transcript,
      teacher: q.answer?.teacher || null,
      evaluation: q.answer?.evaluation
        ? {
            correctness: q.answer.evaluation.correctness,
            feedback: q.answer.evaluation.feedback,
            technicalScore: q.answer.evaluation.technicalScore,
          }
        : null,
    }));

    return NextResponse.json({
      id: interview._id,
      jobTitle: interview.jobTitle,
      status: interview.status,
      difficulty: interview.difficulty,
      stack: interview.stack,
      matchScore: interview.matchScore,
      voiceId: interview.voiceId,
      questions,
      hasReport: !!interview.report,
    });
  } catch (err) {
    console.error("[interview/get] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
