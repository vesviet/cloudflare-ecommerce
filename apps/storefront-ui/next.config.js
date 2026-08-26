const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api-shop.tanhdev.com' },
    ],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      // Phase 4a: SEO documents served same-origin from the storefront domain
      // (proxied to the API worker where the D1 data lives).
      { source: '/robots.txt', destination: `${apiBase}/robots.txt` },
      { source: '/sitemap.xml', destination: `${apiBase}/sitemap.xml` },
      { source: '/sitemap-products.xml', destination: `${apiBase}/sitemap-products.xml` },
      { source: '/sitemap-categories.xml', destination: `${apiBase}/sitemap-categories.xml` },
      { source: '/sitemap-posts.xml', destination: `${apiBase}/sitemap-posts.xml` },
      { source: '/sitemap-pages.xml', destination: `${apiBase}/sitemap-pages.xml` },
      { source: '/feed', destination: `${apiBase}/feed` },
    ];
  },
};

module.exports = nextConfig;
