import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      "src/lib/db.integration.test.ts",
      "src/lib/judge.release.test.ts",
    ],
  },
});
