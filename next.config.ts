import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Required for Tauri
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
