/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.giftlaya.com',
      },
      {
        protocol: 'https',
        hostname: 'giftlaya.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:type(category|page|sub-page|product|service|blog|brand|images)/sitemap.xml',
          destination: '/sitemaps/:type',
        },
        {
          source: '/apple-icon.png',
          destination: '/apple-icon',
        },
      ],
    };
  },
};

export default nextConfig;
