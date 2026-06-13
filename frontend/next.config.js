/** @type {import('next').NextConfig} */
const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://wintercool-k2o8.onrender.com/api'
    : 'http://localhost:5001/api');

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: PUBLIC_API_URL,
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
        destination: `${BACKEND_API_URL}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/loginxpression',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
