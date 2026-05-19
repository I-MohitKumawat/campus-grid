/**
 * next.config.ts
 *
 * Next.js 16 configuration for CampusGrid.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Cloudinary and Clerk avatar CDNs as image sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },

  // Strict mode for better React error detection in development
  reactStrictMode: true,

  // Disable the default x-powered-by header
  poweredByHeader: false,

  // Custom headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
