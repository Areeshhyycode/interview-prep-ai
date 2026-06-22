/**
 * Run code via the free Wandbox API (no key required).
 * https://github.com/melpon/wandbox/blob/master/kennel/API.rst
 */

// Verified Wandbox compiler names (from /api/list.json).
const COMPILERS: Record<string, string> = {
  javascript: "nodejs-20.17.0",
  python: "cpython-3.12.7",
  "c++": "gcc-13.2.0",
  c: "gcc-13.2.0-c",
  go: "go-1.23.2",
};

export interface RunResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number | null;
}

export async function runCode(
  language: string,
  code: string,
  stdin = ""
): Promise<RunResult> {
  const compiler = COMPILERS[language.toLowerCase()];
  if (!compiler) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, compiler, stdin }),
  });

  if (!res.ok) {
    throw new Error(`Wandbox error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const stdout = data.program_output || "";
  const stderr =
    data.program_error || data.compiler_error || data.compiler_output || "";
  const output = (stdout + (stderr ? "\n" + stderr : "")).trim();
  return {
    stdout,
    stderr,
    output: output || "(no output)",
    code: typeof data.status === "string" ? Number(data.status) : data.status ?? null,
  };
}
