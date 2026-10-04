import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Largest forms: 8 product photos or 4 ID documents, 5 MB each.
    serverActions: { bodySizeLimit: "42mb" },
  },
};

export default nextConfig;
