/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose", "pdf-parse", "mammoth"],
  eslint: { ignoreDuringBuilds: true },
  // Hide the Next.js dev-mode indicator (the little "N" badge).
  devIndicators: false,
  // Pin the tracing root to this project (a stray lockfile in the home dir
  // otherwise makes Next infer the wrong workspace root).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
