import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headers for PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Image optimization for D&D content
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.dnd5eapi.co',
        port: '',
        pathname: '/api/spells/**',
      },
      {
        protocol: 'https',
        hostname: 'www.dnd5eapi.co',
        port: '',
        pathname: '/api/equipment/**',
      },
    ],
  },
};

export default nextConfig;
