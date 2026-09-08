import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workerSource = readFileSync(
  new URL("../../public/pyodide-worker.mjs", import.meta.url),
  "utf8",
);

describe("Pyodide worker sandbox", () => {
  it("pins Pyodide and keeps non-standard imports behind both guards", () => {
    expect(workerSource).toContain(
      "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs",
    );
    expect(workerSource).toContain("addaudithook(guard)");
    expect(workerSource).toContain(
      "jsglobals: Object.freeze(Object.create(null))",
    );
    expect(workerSource).toContain(
      "__nerdcode_builtins.__import__ = __nerdcode_import",
    );
    expect(workerSource).toContain('if name.partition(".")[0] not in allowed');
    expect(workerSource).toContain("__nerdcode_sys.modules.pop(name, None)");
    expect(workerSource).not.toContain("__nerdcode_removed_modules");
    expect(workerSource).toContain('unregisterJsModule("js")');
    expect(workerSource).toContain('unregisterJsModule("pyodide_js")');
    expect(workerSource).not.toContain("runPythonAsync");
    expect(workerSource).toContain('"fetch"');
    expect(workerSource).toContain('"postMessage"');
  });

  it("delegates allowed imports to the captured importer and always restores it", () => {
    expect(workerSource).toContain(
      "return __nerdcode_original_import(name, globals, locals, fromlist, level)",
    );
    expect(workerSource).not.toContain(
      "return __nerdcode_builtins.__import__(name, globals, locals, fromlist, level)",
    );
    expect(workerSource).toMatch(
      /finally:\r?\n {4}__nerdcode_builtins\.__import__ = __nerdcode_original_import/,
    );
  });
});
