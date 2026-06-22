"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClientId } from "@/lib/clientId";

interface Item {
  id: string;
  jobTitle: string;
  status: string;
  difficulty: string;
  questionCount: number;
  readiness: number | null;
  createdAt: string;
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/interview?clientId=${getClientId()}`);
      const data = await res.json();
      setItems(data.interviews || []);
      setLoading(false);
    })();
  }, []);

  const completed = items.filter((i) => i.status === "completed" && i.readiness != null);
  const avg =
    completed.length > 0
      ? Math.round(
          completed.reduce((s, i) => s + (i.readiness || 0), 0) / completed.length
        )
      : null;

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your interviews</h1>
          <p className="text-white/50 mt-1.5">Track your progress over time.</p>
        </div>
        <Link
          href="/setup"
          className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90"
        >
          + New
        </Link>
      </div>

      {/* Summary */}
      {!loading && items.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <Stat label="Total" value={String(items.length)} />
          <Stat label="Completed" value={String(completed.length)} />
          <Stat label="Avg readiness" value={avg != null ? `${avg}%` : "—"} />
        </div>
      )}

      {/* List */}
      <div className="mt-8 space-y-3">
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-white/60">No interviews yet.</p>
            <Link
              href="/setup"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90"
            >
              Start your first interview →
            </Link>
          </div>
        ) : (
          items.map((i) => (
            <Link
              key={i.id}
              href={
                i.status === "completed"
                  ? `/interview/${i.id}/results`
                  : `/interview/${i.id}`
              }
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/25 transition"
            >
              <div>
                <div className="font-semibold">{i.jobTitle}</div>
                <div className="text-sm text-white/45 mt-0.5">
                  {i.questionCount} questions · {i.difficulty}
                  {i.createdAt
                    ? " · " + new Date(i.createdAt).toLocaleDateString()
                    : ""}
                </div>
              </div>
              <div className="text-right">
                {i.status === "completed" && i.readiness != null ? (
                  <>
                    <div className="text-2xl font-bold">{Math.round(i.readiness)}%</div>
                    <div className="text-xs text-white/45">readiness</div>
                  </>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-300 capitalize">
                    {i.status?.replace("_", " ")}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Home
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/45 mt-1">{label}</div>
    </div>
  );
}
