import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The frontend talks to the FastAPI backend via NEXT_PUBLIC_API_URL (absolute URL),
  // so it deploys cleanly to Vercel with no same-origin rewrites required.
};

export default nextConfig;
