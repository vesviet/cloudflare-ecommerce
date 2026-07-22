const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
