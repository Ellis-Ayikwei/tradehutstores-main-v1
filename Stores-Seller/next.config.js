/** @type {import('next').NextConfig} */
function apiMediaRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/tradehut/api/v1/'
  try {
    const u = new URL(raw, 'http://localhost')
    const pat = {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      pathname: '/**',
    }
    if (u.port) pat.port = u.port
    return pat
  } catch {
    return { protocol: 'http', hostname: 'localhost', pathname: '/**' }
  }
}

const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages note:
  //   We deploy via @cloudflare/next-on-pages (`npm run pages:build`).
  //   That adapter compiles dynamic routes to Pages Functions; static
  //   assets land on Cloudflare's CDN automatically.

  images: {
    // The default optimiser (/_next/image) is not used: see lib/imageLoader.ts. Images are served straight from
    // the API/R2/CDN, or through Cloudflare Image Transformations when NEXT_PUBLIC_IMAGE_TRANSFORM_BASE is set.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    // Kept for any component that opts back into a built-in loader; the custom loader ignores them.
    remotePatterns: [
      apiMediaRemotePattern(),
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: '**', pathname: '/**' },
    ],
  },

  // Don't fail the build on lint warnings (Pages runs build under stricter
  // CPU/time budgets). Lint locally + in CI instead.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  experimental: {
    // Speeds up cold starts on Pages Functions.
    serverActions: { bodySizeLimit: '5mb' },
  },
}

module.exports = nextConfig