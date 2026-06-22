import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Resume from "@/models/Resume";
import Job from "@/models/Job";
import Interview from "@/models/Interview";
import { geminiJSON } from "@/lib/gemini";
import { matchPrompt, questionGenPrompt } from "@/lib/prompts";
import { getUserId } from "@/lib/auth";
import { searchQuestions, saveQuestions } from "@/lib/questionBank";

export const runtime = "nodejs";
export const maxDuration = 60;

// List past interviews for the dashboard — by logged-in user, else by browser id.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = getUserId(req);
    const clientId = userId
      ? `u:${userId}`
      : req.nextUrl.searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ interviews: [] });

    const docs = (await Interview.find({ clientId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()) as unknown as Array<{
      _id: unknown;
      jobTitle?: string;
      status?: string;
      difficulty?: string;
      questions?: unknown[];
      report?: { scores?: { overallReadiness?: number } };
      createdAt?: Date;
    }>;

    const interviews = docs.map((d) => ({
      id: d._id,
      jobTitle: d.jobTitle || "Interview",
      status: d.status,
      difficulty: d.difficulty,
      questionCount: d.questions?.length || 0,
      readiness: d.report?.scores?.overallReadiness ?? null,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ interviews });
  } catch (err) {
    console.error("[interviews/list] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

interface MatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  recommendedTopics: { topic: string; priority: string }[];
}

interface GeneratedQuestion {
  order: number;
  topic: string;
  subTopic: string;
  difficulty: "easy" | "medium" | "hard";
  type: "conceptual" | "coding" | "behavioral";
  text: string;
  keyPoints: string[];
  idealAnswer: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      resumeId,
      jobId,
      role,
      clientId,
      difficulty = "mixed",
      stack = [],
      count = 6,
      voiceId,
    } = body;

    const resume = await Resume.findById(resumeId);
    const job = await Job.findById(jobId);
    if (!resume || !job) {
      return NextResponse.json(
        { error: "Resume or Job not found." },
        { status: 404 }
      );
    }

    // If logged in, claim this interview for the user; else use the browser id.
    const userId = getUserId(req);
    const ownerId = userId ? `u:${userId}` : clientId;

    // 1. Match analysis
    const mp = matchPrompt(resume.parsed?.skills || [], {
      requiredSkills: job.parsed?.requiredSkills || [],
      niceToHave: job.parsed?.niceToHave || [],
      focusAreas: job.parsed?.focusAreas || [],
    });
    const match = await geminiJSON<MatchResult>(mp.prompt, {
      system: mp.system,
      temperature: 0.3,
    });

    // 2. Question generation — reuse from the RAG bank if we have enough
    //    relevant matches (saves a Gemini call); otherwise generate + bank them.
    const roleName = role || job.title || "the role";
    const n = Math.min(Math.max(Number(count) || 6, 3), 15);
    const focusStr = [...(stack || []), ...(job.parsed?.focusAreas || [])].join(", ");

    let questions: GeneratedQuestion[] = [];
    let source = "bank";
    const banked = await searchQuestions(roleName, focusStr, n);
    if (banked.length >= n) {
      questions = banked.slice(0, n) as GeneratedQuestion[];
    } else {
      source = "generated";
      const qp = questionGenPrompt({
        role: roleName,
        matchedSkills: match.matchedSkills || [],
        missingSkills: match.missingSkills || [],
        focusAreas: job.parsed?.focusAreas || [],
        stack,
        difficulty,
        count: n,
      });
      questions = await geminiJSON<GeneratedQuestion[]>(qp.prompt, {
        system: qp.system,
        temperature: 0.7,
      });
      // Fire-and-forget: grow the bank for next time.
      saveQuestions(roleName, questions).catch(() => {});
    }
    console.log(`[interview] questions source: ${source} (${questions.length})`);

    // 3. Persist interview
    const interview = await Interview.create({
      clientId: ownerId,
      resumeId: resume._id,
      jobId: job._id,
      jobTitle: job.title,
      seniority: job.parsed?.seniority || "mid",
      stack,
      difficulty,
      voiceId,
      matchScore: match.matchScore,
      recommendedTopics: match.recommendedTopics,
      status: "created",
      questions: (questions || []).map((q, i) => ({ ...q, order: q.order ?? i + 1 })),
    });

    return NextResponse.json({
      id: interview._id,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      recommendedTopics: match.recommendedTopics,
      questionCount: interview.questions.length,
    });
  } catch (err) {
    console.error("[interview] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create interview." },
      { status: 500 }
    );
  }
}
