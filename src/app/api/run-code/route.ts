import { NextRequest, NextResponse } from "next/server";
import { runCode } from "@/lib/codeRunner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { language, code, stdin } = await req.json();
    if (!language || !code) {
      return NextResponse.json(
        { error: "language and code are required" },
        { status: 400 }
      );
    }
    const result = await runCode(language, code, stdin || "");
    return NextResponse.json(result);
  } catch (err) {
    console.error("[run-code] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
