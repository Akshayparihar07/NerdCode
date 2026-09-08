import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsPath = fileURLToPath(
  new URL("../app/globals.css", import.meta.url),
);

function sourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

describe("theme contract", () => {
  it("keeps UI colors behind semantic tokens", () => {
    const directories = ["../app", "../components"].map((path) =>
      fileURLToPath(new URL(path, import.meta.url)),
    );
    const namedPaletteUtility =
      /(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/g;

    const violations = directories.flatMap((directory) =>
      sourceFiles(directory).flatMap((path) => {
        const matches = readFileSync(path, "utf8").match(namedPaletteUtility);
        return matches?.map((match) => `${path}: ${match}`) ?? [];
      }),
    );

    expect(violations).toEqual([]);
  });

  it("exposes semantic, Clerk, and editor theme hooks from globals.css", () => {
    const globals = readFileSync(globalsPath, "utf8");

    for (const contract of [
      "--success:",
      "--warning:",
      "--clerk-color-primary: var(--primary)",
      ".nerdcode-code-editor .tok-keyword",
    ]) {
      expect(globals).toContain(contract);
    }
  });
});
