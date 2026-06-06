import { NextRequest, NextResponse } from "next/server";
import { speechToText } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }
    const transcript = await speechToText(file, file.name || "answer.webm");
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[stt] error:", err);
    return NextResponse.json(
      { error: (err as Error).message, fallback: true },
      { status: 502 }
    );
  }
}
