import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add empty turbopack config to silence warning
  turbopack: {},
  webpack: (config) => {
    // Ignore canvas module for client-side builds
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
    };

    return config;
  },
};

export default nextConfig;
