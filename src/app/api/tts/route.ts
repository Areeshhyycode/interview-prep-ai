import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/elevenlabs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const audio = await textToSpeech(text, voiceId);
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Signal the client to fall back to browser SpeechSynthesis.
    console.error("[tts] error:", err);
    return NextResponse.json(
      { error: (err as Error).message, fallback: true },
      { status: 502 }
    );
  }
}
