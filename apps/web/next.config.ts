import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@allisteam/shared'],
  reactStrictMode: true,
};

export default nextConfig;
