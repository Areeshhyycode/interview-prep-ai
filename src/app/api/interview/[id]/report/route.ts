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
      report?: unknown;
      questions?: Array<{
        order: number;
        topic: string;
        text: string;
        idealAnswer?: string;
        answer?: {
          transcript?: string;
          evaluation?: unknown;
          teacher?: unknown;
        };
      }>;
    } | null;
    if (!interview) {
      return NextResponse.json({ error: "Interview not found." }, { status: 404 });
    }
    if (!interview.report) {
      return NextResponse.json(
        { error: "Report not generated yet.", status: interview.status },
        { status: 404 }
      );
    }

    // Full per-question review (includes ideal answers now that it's over).
    const review = (interview.questions || []).map((q) => ({
      order: q.order,
      topic: q.topic,
      text: q.text,
      idealAnswer: q.idealAnswer,
      transcript: q.answer?.transcript || "",
      evaluation: q.answer?.evaluation || null,
      teacher: q.answer?.teacher || null,
    }));

    return NextResponse.json({
      id: interview._id,
      jobTitle: interview.jobTitle,
      report: interview.report,
      review,
    });
  } catch (err) {
    console.error("[report] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
