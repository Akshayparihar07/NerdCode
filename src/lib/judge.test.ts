import { describe, expect, it } from "vitest";

import {
  buildPythonProgram,
  judgeSubmission,
  normalizeOneCompilerResponse,
  truncateDiagnostic,
} from "@/lib/judge";

describe("OneCompiler judging", () => {
  it("builds the private runner and accepts exact JSON results after noisy output", () => {
    const program = buildPythonProgram(
      "def solve(values):\n    return values",
      "def __nerdcode_run(args):\n    return solve(args[0])",
    );
    expect(program).toContain("def __nerdcode_run(args):");
    expect(program).toContain("__NERDCODE_RESULT__:");

    expect(
      normalizeOneCompilerResponse(
        [
          {
            status: "success",
            stdout: 'debug output\n__NERDCODE_RESULT__:{"answer":[1,2]}\n',
            executionTime: 12.9,
            memoryUsed: 1024,
          },
        ],
        [{ answer: [1, 2] }],
      ),
    ).toEqual({
      status: "accepted",
      passedCount: 1,
      testCount: 1,
      runtimeMs: 12,
      memoryKb: 1024,
    });
  });

  it.each([
    [
      [{ status: "success", stdout: "__NERDCODE_RESULT__:false\n" }],
      "wrong_answer",
    ],
    [
      [{ status: "success", exception: "SyntaxError", stdout: "" }],
      "syntax_error",
    ],
    [
      [{ status: "success", stdout: "__NERDCODE_RUNTIME_ERROR__\n" }],
      "runtime_error",
    ],
    [
      [{ status: "success", error: "E001: operation timed out" }],
      "time_limit_exceeded",
    ],
    [[{ status: "failed", error: "quota exceeded" }], "judge_error"],
    [
      [
        {
          status: "success",
          exception: "the request timed out while explaining SyntaxError",
          stdout: "",
        },
      ],
      "runtime_error",
    ],
    [
      [{ status: "success", error: "runner timed out", stdout: "" }],
      "judge_error",
    ],
    [
      [{ status: "success", error: "runner mentioned E001", stdout: "" }],
      "judge_error",
    ],
    [
      [
        {
          status: "success",
          exception: "Traceback details\nSyntaxError: invalid syntax",
          stdout: "",
        },
      ],
      "syntax_error",
    ],
  ])("normalizes provider output as %s", (response, status) => {
    expect(normalizeOneCompilerResponse(response, [true]).status).toBe(status);
  });

  it("limits persisted diagnostics to 4 KiB without splitting unicode", () => {
    const diagnostic = truncateDiagnostic("🙂".repeat(2000));
    expect(new TextEncoder().encode(diagnostic).length).toBeLessThanOrEqual(
      4096,
    );
    expect(diagnostic.endsWith("�")).toBe(false);
  });

  it("treats missing provider credentials as a recoverable judge error", async () => {
    await expect(
      judgeSubmission(
        {} as Parameters<typeof judgeSubmission>[0],
        "pass",
        "def __nerdcode_run(args): return None",
        [{ args: [], expected: null }],
      ),
    ).resolves.toMatchObject({ status: "judge_error" });
  });
});
