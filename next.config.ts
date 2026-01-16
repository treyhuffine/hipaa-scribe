import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Production Configuration */
  output: 'standalone',
  reactCompiler: true,
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  /* Security Headers */
  async headers() {
    return [
      {
        source: '/:path*',
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
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-eval' in dev, 'unsafe-inline' for some runtime code
              // For production on GCP, consider using strict-dynamic with nonces
              process.env.NODE_ENV === 'production'
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Restrict images to self, data URIs, and specific GCP domains if needed
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              // Allow connections to your APIs and GCP services
              "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://*.google.com https://api.groq.com",
              "media-src 'self' blob:",
              "object-src 'none'",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
