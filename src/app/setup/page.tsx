"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";

const QUICK_FOCUS = [
  "MERN",
  "React",
  "Node.js",
  "Next.js",
  "NestJS",
  "MongoDB",
  "System Design",
  "Behavioral",
];

const DIFFICULTY_OPTS = [
  { label: "Easy", value: "easy", hint: "warm-up" },
  { label: "Medium", value: "medium", hint: "standard" },
  { label: "Hard", value: "hard", hint: "senior" },
  { label: "Mixed", value: "mixed", hint: "easy → hard" },
];

const COUNT_OPTS = [3, 4, 5, 6, 8, 10, 12, 15].map((n) => ({
  label: `${n} questions`,
  value: String(n),
}));

export default function SetupPage() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [count, setCount] = useState("6");

  const [focus, setFocus] = useState<string[]>(["MERN"]);
  const [customFocus, setCustomFocus] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  function toggleFocus(s: string) {
    setFocus((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }
  function addCustomFocus() {
    const v = customFocus.trim();
    if (v && !focus.includes(v)) setFocus((c) => [...c, v]);
    setCustomFocus("");
  }

  async function handleStart() {
    setError("");
    if (!resumeFile && resumeText.trim().length < 30) {
      setError("Please upload a CV file or paste at least a short resume.");
      return;
    }
    if (!role.trim()) {
      setError("Please enter the role / position you're interviewing for.");
      return;
    }
    if (jdText.trim().length < 20) {
      setError("Please paste the job description (or a short summary of the role).");
      return;
    }

    setLoading(true);
    try {
      setStep("Analyzing your CV…");
      const resumeForm = new FormData();
      if (resumeFile) resumeForm.append("file", resumeFile);
      else resumeForm.append("text", resumeText);
      const rRes = await fetch("/api/resume", { method: "POST", body: resumeForm });
      const rData = await rRes.json();
      if (!rRes.ok) throw new Error(rData.error || "Resume failed");

      setStep("Reading the job description…");
      const jRes = await fetch("/api/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: role, text: jdText }),
      });
      const jData = await jRes.json();
      if (!jRes.ok) throw new Error(jData.error || "Job failed");

      setStep("Generating tailored questions…");
      const iRes = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: rData.id,
          jobId: jData.id,
          role,
          difficulty,
          stack: focus,
          count: Number(count),
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
        <p className="text-white/40 text-sm">This can take ~15-25 seconds.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Set up your interview</h1>
        <p className="text-white/50 mt-1.5">
          Works for any role — engineering, design, sales, support, and more.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 1 · Resume */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={1} />
            <h2 className="font-semibold">Your CV / Resume</h2>
          </div>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            className="mt-4 block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white file:cursor-pointer hover:file:bg-white/20"
          />
          <div className="text-center text-white/30 text-xs my-2.5">
            — or paste text —
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here…"
            rows={4}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30 resize-none"
          />
        </section>

        {/* 2 · Role + JD */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={2} />
            <h2 className="font-semibold">Role &amp; job description</h2>
          </div>

          <label className="mt-4 block text-xs text-white/50 mb-1.5">
            Target role / position
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Full-Stack MERN Developer, Sales Executive, Customer Support Agent…"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
          />

          <label className="mt-4 block text-xs text-white/50 mb-1.5">
            Job description
          </label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description, or a few lines describing what the role needs…"
            rows={5}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30 resize-none"
          />
        </section>

        {/* 3 · Settings */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <StepBadge n={3} />
            <h2 className="font-semibold">Interview settings</h2>
          </div>

          {/* Focus areas */}
          <label className="mt-4 block text-xs text-white/50 mb-2">
            Focus areas <span className="text-white/30">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {focus
              .filter((f) => !QUICK_FOCUS.includes(f))
              .map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFocus(f)}
                  className="px-3 py-1.5 rounded-full text-sm bg-white text-black border border-white inline-flex items-center gap-1"
                >
                  {f} <span className="text-black/50">✕</span>
                </button>
              ))}
            {QUICK_FOCUS.map((s) => (
              <button
                key={s}
                onClick={() => toggleFocus(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  focus.includes(s)
                    ? "bg-white text-black border-white"
                    : "border-white/15 text-white/70 hover:border-white/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomFocus();
                }
              }}
              placeholder="Add your own topic and press Enter…"
              className="flex-1 rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
            <button
              onClick={addCustomFocus}
              className="px-4 rounded-lg border border-white/15 text-sm text-white/70 hover:border-white/40"
            >
              Add
            </button>
          </div>

          {/* Difficulty + Count */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Difficulty</label>
              <Select
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTY_OPTS}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">
                Number of questions
              </label>
              <Select value={count} onChange={setCount} options={COUNT_OPTS} />
            </div>
          </div>
        </section>
      </div>

      <button
        onClick={handleStart}
        className="mt-8 w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
      >
        Generate interview →
      </button>
    </main>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
      {n}
    </span>
  );
}
