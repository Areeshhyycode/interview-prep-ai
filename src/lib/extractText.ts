/**
 * Extract plain text from an uploaded resume file (PDF or DOCX),
 * or pass through raw text.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    // Import the implementation directly to avoid pdf-parse's debug entrypoint.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback (.txt or unknown)
  return buffer.toString("utf-8");
}
