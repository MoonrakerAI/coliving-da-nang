/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['vercel.app'],
  },
  // Ensure API routes use Node.js runtime for NextAuth compatibility
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
