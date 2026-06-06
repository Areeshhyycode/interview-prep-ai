/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose", "pdf-parse", "mammoth"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
