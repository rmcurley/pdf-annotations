import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add empty turbopack config to silence warning
  turbopack: {},
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

    // Exclude problematic Node.js dependencies from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        glob: false,
        archiver: false,
        'archiver-utils': false,
        buffer: require.resolve('buffer/'),
      };
    }

    return config;
  },
};

export default nextConfig;
