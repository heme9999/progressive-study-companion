/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optionally enable static export if you don't need SSR (but we do need SSR for dynamic chats later if they move state to DB).
  // For now, Cloudflare Pages will use `@cloudflare/next-on-pages` which requires this to be default (SSR mode).
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
