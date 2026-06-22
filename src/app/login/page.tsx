"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-white/40 hover:text-white">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-white/50 mt-1.5 text-sm">
          Save your interviews and track progress.
        </p>

        {error && (
          <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password (6+ chars)"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm outline-none focus:border-white/30"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="mt-5 w-full px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          className="mt-4 w-full text-sm text-white/50 hover:text-white"
        >
          {mode === "login"
            ? "No account? Sign up"
            : "Already have an account? Log in"}
        </button>
      </div>
    </main>
  );
}
