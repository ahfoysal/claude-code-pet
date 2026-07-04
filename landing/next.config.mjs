/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pure static export — no Next.js server runtime, so the server-side
  // advisories (image optimizer, middleware, rewrites, SSR) don't apply.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
