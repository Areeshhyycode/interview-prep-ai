"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";

interface Question {
  order: number;
  topic: string;
  subTopic: string;
  difficulty: string;
  type: string;
  text: string;
  answered: boolean;
}

interface Evaluation {
  technicalScore: number;
  correctness: string;
  feedback: string;
}
interface Teacher {
  explanation: string;
  correctAnswer: string;
  example: string;
  tip: string;
}

// Minimal typing for the browser SpeechRecognition API.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechResultEvent {
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
}

export default function InterviewRoom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [jobTitle, setJobTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "asking" | "listening" | "evaluating" | "feedback" | "done"
  >("loading");

  const [transcript, setTranscript] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [error, setError] = useState("");

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load interview
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/interview/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load interview");
        return;
      }
      setJobTitle(data.jobTitle);
      setQuestions(data.questions);
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const current = questions[idx];

  // ---- Voice output (ElevenLabs → browser fallback) ----
  async function speak(text: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await audio.play();
        return;
      }
      throw new Error("tts fallback");
    } catch {
      // Browser SpeechSynthesis fallback (free, no key).
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        window.speechSynthesis.speak(u);
      }
    }
  }

  async function askCurrent() {
    if (!current) return;
    setPhase("asking");
    setTranscript("");
    setEvaluation(null);
    setTeacher(null);
    await speak(current.text);
    setPhase("ready");
  }

  // ---- Voice input (Web Speech API) ----
  function startListening() {
    setError("");
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError(
        "Your browser doesn't support speech recognition. Use Chrome, or type your answer below."
      );
      return;
    }
    const recog = new Ctor();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    let finalText = "";
    recog.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recog.onerror = () => {};
    recog.onend = () => {};
    recogRef.current = recog;
    startTimeRef.current = Date.now();
    recog.start();
    setPhase("listening");
  }

  function stopListening() {
    recogRef.current?.stop();
    setPhase("ready");
  }

  // ---- Submit answer ----
  async function submitAnswer() {
    recogRef.current?.stop();
    setPhase("evaluating");
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const res = await fetch(`/api/interview/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: current.order,
          transcript: transcript || "(no answer)",
          durationSec,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvaluation(data.evaluation);
      setTeacher(data.teacher);
      if (data.teacher) {
        await speak(
          `Let me explain. ${data.teacher.explanation} ${data.teacher.tip}`
        );
      }
      setPhase("feedback");
    } catch (e) {
      setError((e as Error).message);
      setPhase("ready");
    }
  }

  async function next() {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setTranscript("");
      setEvaluation(null);
      setTeacher(null);
      setPhase("ready");
    } else {
      // Finish → build report
      setPhase("evaluating");
      try {
        const res = await fetch(`/api/interview/${id}/complete`, {
          method: "POST",
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        router.push(`/interview/${id}/results`);
      } catch (e) {
        setError((e as Error).message);
        setPhase("feedback");
      }
    }
  }

  if (phase === "loading")
    return (
      <main className="min-h-screen flex items-center justify-center text-white/60">
        Loading interview…
      </main>
    );

  if (error && !current)
    return (
      <main className="min-h-screen flex items-center justify-center text-red-300">
        {error}
      </main>
    );

  const correctnessColor =
    evaluation?.correctness === "correct"
      ? "text-emerald-400"
      : evaluation?.correctness === "partial"
      ? "text-amber-400"
      : "text-red-400";

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-white/50">
        <span>{jobTitle}</span>
        <span>
          Question {idx + 1} / {questions.length}
        </span>
      </div>
      <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wide">
          <span>{current?.topic}</span>
          <span>·</span>
          <span>{current?.difficulty}</span>
        </div>
        <p className="mt-3 text-xl leading-relaxed">{current?.text}</p>

        <button
          onClick={askCurrent}
          disabled={phase === "asking"}
          className="mt-4 text-sm text-white/60 hover:text-white inline-flex items-center gap-1"
        >
          🔊 {phase === "asking" ? "Speaking…" : "Hear question"}
        </button>
      </div>

      {/* Answer area */}
      {phase !== "feedback" && (
        <div className="mt-6">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken answer appears here — or type it."
            rows={4}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-4 text-sm outline-none focus:border-white/30"
          />

          <div className="mt-4 flex items-center gap-3">
            {phase === "listening" ? (
              <button
                onClick={stopListening}
                className="px-5 py-2.5 rounded-lg bg-red-500 text-white font-medium animate-pulse"
              >
                ⏹ Stop recording
              </button>
            ) : (
              <button
                onClick={startListening}
                disabled={phase === "evaluating"}
                className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-medium"
              >
                🎙 Record answer
              </button>
            )}

            <button
              onClick={submitAnswer}
              disabled={phase === "evaluating" || !transcript.trim()}
              className="px-5 py-2.5 rounded-lg bg-white text-black font-medium disabled:opacity-40"
            >
              {phase === "evaluating" ? "Evaluating…" : "Submit answer →"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      )}

      {/* Feedback */}
      {phase === "feedback" && evaluation && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className={`font-semibold capitalize ${correctnessColor}`}>
                {evaluation.correctness}
              </span>
              <span className="text-sm text-white/50">
                Score: {evaluation.technicalScore}/10
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">{evaluation.feedback}</p>
          </div>

          {teacher && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
              <div className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                👨‍🏫 Teacher Mode
              </div>
              <p className="mt-2 text-sm text-white/80">{teacher.explanation}</p>
              <p className="mt-3 text-sm">
                <span className="text-white/50">Correct answer: </span>
                {teacher.correctAnswer}
              </p>
              <p className="mt-2 text-sm text-white/70">
                <span className="text-white/50">Example: </span>
                {teacher.example}
              </p>
              <p className="mt-2 text-sm text-emerald-300">💡 {teacher.tip}</p>
            </div>
          )}

          <button
            onClick={next}
            className="w-full px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90"
          >
            {idx + 1 < questions.length
              ? "Next question →"
              : "Finish & see report →"}
          </button>
        </div>
      )}
    </main>
  );
}
