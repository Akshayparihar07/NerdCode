import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  getProblemBySlug,
  isProblemSlug,
  PROBLEM_SLUGS,
  PROBLEMS,
} from "./problems";
import { getHiddenCases } from "./problems.private";

vi.mock("server-only", () => ({}));

describe("problem curriculum", () => {
  it("contains twelve complete, uniquely ordered lessons", () => {
    expect(PROBLEMS).toHaveLength(12);
    expect(PROBLEMS.map(({ order }) => order)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(new Set(PROBLEM_SLUGS)).toHaveProperty("size", 12);
    expect(
      new Set(PROBLEMS.map(({ statement }) => statement.join(" "))),
    ).toHaveProperty("size", 12);

    for (const problem of PROBLEMS) {
      expect(problem.concepts.length).toBeGreaterThan(0);
      expect(problem.statement.length).toBeGreaterThan(0);
      expect(problem.examples.length).toBeGreaterThan(0);
      expect(problem.constraints.length).toBeGreaterThan(0);
      expect(problem.analogy.mapping.length).toBeGreaterThan(0);
      expect(problem.analogy.useCases.length).toBeGreaterThan(0);
      expect(problem.hints.length).toBeGreaterThanOrEqual(3);
      expect(problem.walkthrough.steps.length).toBeGreaterThan(0);
      expect(problem.publicCases.length).toBeGreaterThanOrEqual(2);
      expect(problem.runnerCode).toContain("def __nerdcode_run(args):");
      expect(getHiddenCases(problem.slug).length).toBeGreaterThanOrEqual(3);
      expect(() =>
        JSON.stringify([
          ...problem.publicCases,
          ...getHiddenCases(problem.slug),
        ]),
      ).not.toThrow();
    }
  });

  it("looks up and validates slugs without accepting unknown values", () => {
    expect(isProblemSlug("two-sum")).toBe(true);
    expect(isProblemSlug("not-a-problem")).toBe(false);
    expect(getProblemBySlug("two-sum")?.order).toBe(1);
    expect(getProblemBySlug("not-a-problem")).toBeUndefined();
    expect(getHiddenCases("not-a-problem")).toEqual([]);
  });

  it.each(
    PROBLEMS,
  )("runs the $title reference solution against every case", (problem) => {
    const cases = [...problem.publicCases, ...getHiddenCases(problem.slug)];
    const encodedArgs = JSON.stringify(
      JSON.stringify(cases.map((testCase) => testCase.args)),
    );
    const program = `${problem.walkthrough.solution}
${problem.runnerCode}

import json
all_args = json.loads(${encodedArgs})
print(json.dumps([__nerdcode_run(args) for args in all_args], separators=(",", ":")))`;
    const execution = spawnSync("python", ["-c", program], {
      encoding: "utf8",
      timeout: 3_000,
    });

    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout.trim())).toEqual(
      cases.map((testCase) => testCase.expected),
    );
  });
});
