import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.github.com'
      }, {
        protocol: 'https',
        hostname: 'toerbsqgqirmkqnxtwrc.supabase.co'
      }
    ]
  }
};

export default nextConfig;
