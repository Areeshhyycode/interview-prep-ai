import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Resume from "@/models/Resume";
import { geminiJSON } from "@/lib/gemini";
import { resumeParsePrompt } from "@/lib/prompts";
import { extractTextFromFile } from "@/lib/extractText";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let rawText = "";
    let fileName: string | undefined;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const textField = form.get("text") as string | null;
      if (file && file.size > 0) {
        fileName = file.name;
        rawText = await extractTextFromFile(file);
      } else if (textField) {
        rawText = textField;
      }
    } else {
      const body = await req.json();
      rawText = body.text || "";
    }

    rawText = rawText.trim();
    if (!rawText) {
      return NextResponse.json(
        { error: "No resume text or file provided." },
        { status: 400 }
      );
    }

    const { system, prompt } = resumeParsePrompt(rawText);
    const parsed = await geminiJSON(prompt, { system, temperature: 0.2 });

    const resume = await Resume.create({ fileName, rawText, parsed });

    return NextResponse.json({
      id: resume._id,
      parsed: resume.parsed,
    });
  } catch (err) {
    console.error("[resume] error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to process resume." },
      { status: 500 }
    );
  }
}
