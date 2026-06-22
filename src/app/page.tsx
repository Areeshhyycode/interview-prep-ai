import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <div className="inline-block mb-4 px-3 py-1 rounded-full border border-white/15 text-xs text-white/60">
          AI Mock Interviewer · Voice · Teacher Mode
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
          InterviewPrep AI
        </h1>
        <p className="mt-5 text-lg text-white/60">
          Upload your CV, paste a job description, and face a realistic{" "}
          <span className="text-white/90">voice interview</span>. Get scored on
          technical skill, communication & confidence — with a teacher explaining
          every answer you miss.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/setup"
            className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition"
          >
            Start Interview →
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg border border-white/15 text-white/80 hover:border-white/40 transition"
          >
            My Interviews
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            ["1. Analyze", "We extract skills from your CV and match them to the job."],
            ["2. Interview", "An AI voice asks tailored questions and listens to you."],
            ["3. Report", "Scores, weak topics, and a readiness % to improve fast."],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-semibold text-white/90">{t}</div>
              <div className="mt-1 text-sm text-white/55">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
