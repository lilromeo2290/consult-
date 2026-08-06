import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is only needed for VPS (PM2); Vercel uses its own output
  ...(process.env.OUTPUT_MODE === 'standalone' ? { output: 'standalone' as const } : {}),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
