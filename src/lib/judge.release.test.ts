import { describe, expect, it, vi } from "vitest";

import { PROBLEMS } from "@/content/problems";
import { getHiddenCases } from "@/content/problems.private";
import { judgeSubmission, type OneCompilerEnvironment } from "@/lib/judge";

vi.mock("server-only", () => ({}));

function environmentValue(name: string): string {
  const value = Reflect.get(process.env, name);
  return typeof value === "string" ? value.trim() : "";
}

const enabled = environmentValue("RUN_REAL_JUDGE") === "1";
const apiUrl = environmentValue("ONECOMPILER_API_URL");
const apiKey = environmentValue("ONECOMPILER_API_KEY");
const apiHost = environmentValue("ONECOMPILER_API_HOST");

function releaseEnvironment(): OneCompilerEnvironment {
  if (apiUrl.length === 0 || apiKey.length === 0) {
    throw new Error(
      "Set ONECOMPILER_API_URL and ONECOMPILER_API_KEY before running the real-judge verification.",
    );
  }

  return {
    ONECOMPILER_API_URL: apiUrl,
    ONECOMPILER_API_KEY: apiKey,
    ...(apiHost.length === 0 ? {} : { ONECOMPILER_API_HOST: apiHost }),
  };
}

describe.skipIf(!enabled)("real OneCompiler release verification", () => {
  it("accepts every authored reference solution", async () => {
    const environment = releaseEnvironment();

    for (const problem of PROBLEMS) {
      const outcome = await judgeSubmission(
        environment,
        problem.walkthrough.solution,
        problem.runnerCode,
        getHiddenCases(problem.slug),
      );

      expect(outcome, problem.slug).toMatchObject({
        status: "accepted",
        passedCount: getHiddenCases(problem.slug).length,
        testCount: getHiddenCases(problem.slug).length,
      });
    }
  });

  it("rejects a representative wrong solution for every problem", async () => {
    const environment = releaseEnvironment();

    for (const problem of PROBLEMS) {
      const outcome = await judgeSubmission(
        environment,
        `def ${problem.functionName}(*args):\n    return "__intentionally_wrong__"`,
        problem.runnerCode,
        getHiddenCases(problem.slug),
      );

      expect(outcome.status, problem.slug).not.toBe("accepted");
      expect(outcome.status, problem.slug).not.toBe("judge_error");
    }
  });
});
