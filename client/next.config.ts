import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Disable React Strict Mode to prevent double socket connections in development
  // React 18 Strict Mode runs effects twice which causes socket reconnection issues
  reactStrictMode: false,

  images: {
    // Allow SVG images from external sources (for DiceBear avatars)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      },
      {
        protocol: 'https',
        hostname: 'toerbsqgqirmkqnxtwrc.supabase.co'
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com'
      }
    ]
  }
};

export default nextConfig;
