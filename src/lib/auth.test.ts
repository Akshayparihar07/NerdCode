import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth";

describe("safeRedirectPath", () => {
  it.each([
    ["/problems/two-sum", "/problems/two-sum"],
    [
      "/problems/two-sum?from=home#editor",
      "/problems/two-sum?from=home#editor",
    ],
    [["/first", "/second"], "/first"],
    ["https://evil.example", "/"],
    ["//evil.example/path", "/"],
    [undefined, "/"],
  ])("normalizes %j", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
