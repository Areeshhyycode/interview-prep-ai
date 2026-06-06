"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Report {
  scores: {
    technical: number;
    communication: number;
    confidence: number;
    overallReadiness: number;
  };
  weakTopics: { topic: string; score: number; suggestion: string }[];
  strongTopics: string[];
  summary: string;
  recommendations: string[];
}

interface ReviewItem {
  order: number;
  topic: string;
  text: string;
  idealAnswer: string;
  transcript: string;
  evaluation: { correctness: string; feedback: string; technicalScore: number } | null;
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const color =
    v >= 70 ? "#34d399" : v >= 45 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex flex-col items-center">
      <div
        className="h-24 w-24 rounded-full grid place-items-center"
        style={{
          background: `conic-gradient(${color} ${v * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      >
        <div className="h-[78px] w-[78px] rounded-full bg-[#0a0a0f] grid place-items-center">
          <span className="text-xl font-bold">{Math.round(v)}</span>
        </div>
      </div>
      <span className="mt-2 text-xs text-white/55 text-center">{label}</span>
    </div>
  );
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/interview/${id}/report`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Report not ready");
        return;
      }
      setReport(data.report);
      setReview(data.review || []);
      setJobTitle(data.jobTitle || "");
    })();
  }, [id]);

  if (error)
    return (
      <main className="min-h-screen flex items-center justify-center text-red-300">
        {error}
      </main>
    );
  if (!report)
    return (
      <main className="min-h-screen flex items-center justify-center text-white/60">
        Building your report…
      </main>
    );

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <div className="text-sm text-white/50">{jobTitle}</div>
      <h1 className="text-3xl font-bold mt-1">Your Interview Report</h1>

      {/* Overall */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col items-center">
        <div className="text-sm text-white/50">Overall Readiness</div>
        <div className="text-6xl font-bold mt-1">
          {Math.round(report.scores.overallReadiness)}%
        </div>
        <p className="mt-3 text-center text-white/65 text-sm max-w-md">
          {report.summary}
        </p>
      </div>

      {/* Scores */}
      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <ScoreRing label="Technical" value={report.scores.technical} />
        <ScoreRing label="Communication" value={report.scores.communication} />
        <ScoreRing label="Confidence" value={report.scores.confidence} />
      </div>

      {/* Strong / Weak */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
          <div className="text-emerald-400 font-semibold text-sm">Strong topics</div>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            {report.strongTopics?.length ? (
              report.strongTopics.map((t) => <li key={t}>✓ {t}</li>)
            ) : (
              <li className="text-white/40">—</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
          <div className="text-red-400 font-semibold text-sm">Weak topics</div>
          <ul className="mt-2 space-y-2 text-sm text-white/80">
            {report.weakTopics?.length ? (
              report.weakTopics.map((w) => (
                <li key={w.topic}>
                  <span className="font-medium">{w.topic}</span> ({w.score})
                  <div className="text-white/50 text-xs">{w.suggestion}</div>
                </li>
              ))
            ) : (
              <li className="text-white/40">—</li>
            )}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="font-semibold text-sm">Next steps</div>
        <ul className="mt-2 space-y-1 text-sm text-white/75 list-disc list-inside">
          {report.recommendations?.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Per-question review */}
      <h2 className="mt-10 text-xl font-bold">Question review</h2>
      <div className="mt-4 space-y-3">
        {review.map((q) => (
          <details
            key={q.order}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <summary className="cursor-pointer text-sm">
              <span className="text-white/40">Q{q.order} · {q.topic} — </span>
              <span
                className={
                  q.evaluation?.correctness === "correct"
                    ? "text-emerald-400"
                    : q.evaluation?.correctness === "partial"
                    ? "text-amber-400"
                    : "text-red-400"
                }
              >
                {q.evaluation?.correctness || "n/a"}
              </span>
            </summary>
            <div className="mt-3 text-sm space-y-2">
              <p className="text-white/80">{q.text}</p>
              <p>
                <span className="text-white/40">Your answer: </span>
                <span className="text-white/70">{q.transcript || "—"}</span>
              </p>
              <p>
                <span className="text-white/40">Ideal answer: </span>
                <span className="text-white/70">{q.idealAnswer}</span>
              </p>
              {q.evaluation && (
                <p className="text-white/60 italic">{q.evaluation.feedback}</p>
              )}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/setup"
          className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
        >
          New interview
        </Link>
        <Link
          href="/"
          className="px-6 py-3 rounded-lg border border-white/15 hover:border-white/40"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
