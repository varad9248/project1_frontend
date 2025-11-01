/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    return config;
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
