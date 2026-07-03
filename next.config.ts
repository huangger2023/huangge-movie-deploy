import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@libsql/client"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/**/*"],
  },
};

export default nextConfig;
