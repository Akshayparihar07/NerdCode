import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "feral-blob", "motion"],
  },
};

export default nextConfig;
