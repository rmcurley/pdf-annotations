import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
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
