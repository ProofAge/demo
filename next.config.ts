import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/e-wallet',
        destination: '/eudi-wallet-age-verification',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
