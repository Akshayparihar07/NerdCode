import path from "node:path";

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        compatibilityDate: "2026-09-07",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(import.meta.dirname, "migrations"),
          ),
        },
      },
    })),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL("./src/test/server-only.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    include: ["src/lib/db.integration.test.ts"],
    setupFiles: ["src/test/apply-d1-migrations.ts"],
  },
});
