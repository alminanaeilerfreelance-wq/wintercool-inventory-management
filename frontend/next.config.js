/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    // Local dev default (backend runs on :5000). Production can override via env.
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://wintercool-k2o8.onrender.com/api'
        : 'http://localhost:5000/api'),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wintercool-k2o8.onrender.com',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
