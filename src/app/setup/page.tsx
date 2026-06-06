"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STACKS = ["MERN", "React", "Node.js", "Next.js", "NestJS", "MongoDB"];

export default function SetupPage() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [stack, setStack] = useState<string[]>(["MERN"]);
  const [count, setCount] = useState(6);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  function toggleStack(s: string) {
    setStack((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  async function handleStart() {
    setError("");
    if (!resumeFile && resumeText.trim().length < 30) {
      setError("Please upload a CV file or paste at least a short resume.");
      return;
    }
    if (jdText.trim().length < 30) {
      setError("Please paste a job description.");
      return;
    }

    setLoading(true);
    try {
      // 1. Resume
      setStep("Analyzing your CV…");
      const resumeForm = new FormData();
      if (resumeFile) resumeForm.append("file", resumeFile);
      else resumeForm.append("text", resumeText);
      const rRes = await fetch("/api/resume", { method: "POST", body: resumeForm });
      const rData = await rRes.json();
      if (!rRes.ok) throw new Error(rData.error || "Resume failed");

      // 2. Job
      setStep("Reading the job description…");
      const jRes = await fetch("/api/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: jobTitle, text: jdText }),
      });
      const jData = await jRes.json();
      if (!jRes.ok) throw new Error(jData.error || "Job failed");

      // 3. Interview (match + question generation)
      setStep("Generating tailored questions…");
      const iRes = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: rData.id,
          jobId: jData.id,
          difficulty,
          stack,
          count,
        }),
      });
      const iData = await iRes.json();
      if (!iRes.ok) throw new Error(iData.error || "Interview failed");

      router.push(`/interview/${iData.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/70">{step}</p>
        <p className="text-white/40 text-sm">This can take ~20-30 seconds.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold">Set up your interview</h1>
      <p className="text-white/55 mt-1">
        Give us your CV and the job you&apos;re targeting.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Resume */}
      <section className="mt-8">
        <label className="text-sm font-semibold">1 · Your CV / Resume</label>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
          className="mt-2 block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/20"
        />
        <div className="text-center text-white/30 text-xs my-2">— or paste text —</div>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here…"
          rows={5}
          className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
        />
      </section>

      {/* Job */}
      <section className="mt-8">
        <label className="text-sm font-semibold">2 · Job description</label>
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Job title (e.g. Full-Stack MERN Developer)"
          className="mt-2 w-full rounded-lg bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
        />
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description…"
          rows={6}
          className="mt-3 w-full rounded-lg bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
        />
      </section>

      {/* Config */}
      <section className="mt-8">
        <label className="text-sm font-semibold">3 · Interview settings</label>

        <div className="mt-3 flex flex-wrap gap-2">
          {STACKS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStack(s)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                stack.includes(s)
                  ? "bg-white text-black border-white"
                  : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-white/50 mb-1">Difficulty</div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2 text-sm outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Questions</div>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2 text-sm outline-none"
            >
              {[4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <button
        onClick={handleStart}
        className="mt-10 w-full px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition"
      >
        Generate interview →
      </button>
    </main>
  );
}
