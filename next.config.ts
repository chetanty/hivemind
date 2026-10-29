import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second server (e.g. one pointed at a hosted model) build without clobbering `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
