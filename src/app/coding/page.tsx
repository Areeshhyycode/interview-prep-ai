"use client";

import { useState } from "react";
import Link from "next/link";
import Select from "@/components/Select";

const LANGS = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "C++", value: "c++" },
  { label: "C", value: "c" },
  { label: "Go", value: "go" },
];
const DIFFS = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

interface Challenge {
  title: string;
  prompt: string;
  examples: { input: string; output: string }[];
  starterCode: string;
  hints: string[];
}
interface Review {
  correctness: string;
  score: number;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  improvements: string[];
  feedback: string;
}

export default function CodingPage() {
  const [language, setLanguage] = useState("javascript");
  const [difficulty, setDifficulty] = useState("medium");
  const [code, setCode] = useState("// Write your code here\nconsole.log('Hello');");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [review, setReview] = useState<Review | null>(null);

  const [running, setRunning] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  async function generate() {
    setGenLoading(true);
    setReview(null);
    try {
      const res = await fetch("/api/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "challenge", language, difficulty }),
      });
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
        if (data.challenge.starterCode) setCode(data.challenge.starterCode);
      }
    } finally {
      setGenLoading(false);
    }
  }

  async function run() {
    setRunning(true);
    setOutput("Running…");
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });
      const data = await res.json();
      if (!res.ok) setOutput("Error: " + data.error);
      else setOutput(data.output || "(no output)");
    } catch (e) {
      setOutput("Error: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function getReview() {
    setReviewLoading(true);
    try {
      const res = await fetch("/api/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          language,
          problem: challenge?.prompt || "General code review",
          code,
          output,
        }),
      });
      const data = await res.json();
      if (data.review) setReview(data.review);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coding Playground</h1>
          <p className="text-white/50 mt-1.5">
            Generate a challenge, write code, run it live, and get an AI review.
          </p>
        </div>
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Home
        </Link>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="block text-xs text-white/50 mb-1.5">Language</label>
          <Select value={language} onChange={setLanguage} options={LANGS} />
        </div>
        <div className="w-32">
          <label className="block text-xs text-white/50 mb-1.5">Difficulty</label>
          <Select value={difficulty} onChange={setDifficulty} options={DIFFS} />
        </div>
        <button
          onClick={generate}
          disabled={genLoading}
          className="px-4 py-2.5 rounded-xl border border-white/15 text-sm hover:border-white/40 disabled:opacity-50"
        >
          {genLoading ? "Generating…" : "✨ Generate challenge"}
        </button>
      </div>

      {/* Challenge */}
      {challenge && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold text-lg">{challenge.title}</h2>
          <p className="mt-2 text-sm text-white/75 whitespace-pre-wrap">
            {challenge.prompt}
          </p>
          {challenge.examples?.length > 0 && (
            <div className="mt-3 space-y-1">
              {challenge.examples.map((ex, i) => (
                <div key={i} className="text-xs text-white/60 font-mono">
                  in: {ex.input} → out: {ex.output}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor + output */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full rounded-xl bg-[#0d0d14] border border-white/10 p-4 text-sm font-mono outline-none focus:border-white/30 resize-none"
          />
          <input
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin (optional)"
            className="mt-2 w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm font-mono outline-none focus:border-white/30"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={run}
              disabled={running}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50"
            >
              {running ? "Running…" : "▶ Run"}
            </button>
            <button
              onClick={getReview}
              disabled={reviewLoading}
              className="px-5 py-2.5 rounded-xl border border-white/15 hover:border-white/40 disabled:opacity-50"
            >
              {reviewLoading ? "Reviewing…" : "🤖 AI Review"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Output</label>
          <pre className="w-full h-[330px] overflow-auto rounded-xl bg-[#0d0d14] border border-white/10 p-4 text-sm font-mono text-emerald-300 whitespace-pre-wrap">
            {output || "Run your code to see output…"}
          </pre>
        </div>
      </div>

      {/* Review */}
      {review && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold capitalize ${
                review.correctness === "correct"
                  ? "text-emerald-400"
                  : review.correctness === "partial"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {review.correctness}
            </span>
            <span className="text-sm text-white/50">Score: {review.score}/10</span>
          </div>
          <p className="mt-2 text-sm text-white/75">{review.feedback}</p>
          <div className="mt-3 flex gap-4 text-xs text-white/55">
            <span>⏱ Time: {review.timeComplexity}</span>
            <span>💾 Space: {review.spaceComplexity}</span>
          </div>
          {review.improvements?.length > 0 && (
            <ul className="mt-3 text-sm text-white/70 list-disc list-inside space-y-1">
              {review.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
