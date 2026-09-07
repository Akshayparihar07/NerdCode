import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "feral-blob", "motion"],
  },
};

export default nextConfig;
