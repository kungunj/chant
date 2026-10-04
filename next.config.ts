import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Sellers upload up to four ID documents of 5 MB each in one form.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;
