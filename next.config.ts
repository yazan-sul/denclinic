import withPWA from "next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})({
  reactStrictMode: true,
  // Prevent webpack from bundling Prisma — needed for Prisma v7 WASM query compiler
  serverExternalPackages: ['@prisma/client', 'prisma'],
});

export default nextConfig;
