import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  finalizeSubmission: vi.fn(),
  getCloudflareContext: vi.fn(),
  getHiddenCases: vi.fn(),
  getProblemBySlug: vi.fn(),
  judgeSubmission: vi.fn(),
  limit: vi.fn(),
  reserveSubmission: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/content/problems", () => ({
  getProblemBySlug: mocks.getProblemBySlug,
}));
vi.mock("@/content/problems.private", () => ({
  getHiddenCases: mocks.getHiddenCases,
}));
vi.mock("@/lib/db", () => ({
  finalizeSubmission: mocks.finalizeSubmission,
  reserveSubmission: mocks.reserveSubmission,
}));
vi.mock("@/lib/judge", () => ({ judgeSubmission: mocks.judgeSubmission }));

import { POST } from "@/app/api/submissions/route";

const validBody = {
  problemSlug: "two-sum",
  source: "def two_sum(nums, target):\n    return [0, 1]",
};

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    mocks.getProblemBySlug.mockReturnValue({
      slug: "two-sum",
      runnerCode: "def __nerdcode_run(args): pass",
    });
    mocks.getHiddenCases.mockReturnValue([
      { args: [[2, 7], 9], expected: [0, 1] },
    ]);
    mocks.getCloudflareContext.mockReturnValue({
      env: { SUBMIT_RATE_LIMITER: { limit: mocks.limit } },
    });
    mocks.limit.mockResolvedValue({ success: true });
    mocks.reserveSubmission.mockResolvedValue(true);
    mocks.judgeSubmission.mockResolvedValue({
      status: "accepted",
      passedCount: 1,
      testCount: 1,
    });
    mocks.finalizeSubmission.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated and cross-origin requests", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await POST(request(validBody))).status).toBe(401);

    expect(
      (
        await POST(
          request(validBody, {
            origin: "https://other.example",
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("rejects malformed, oversized, and unknown submissions", async () => {
    expect((await POST(request({ problemSlug: "two-sum" }))).status).toBe(400);
    expect(
      (await POST(request({ ...validBody, source: "x".repeat(20_001) })))
        .status,
    ).toBe(400);
    expect(
      (await POST(request({ ...validBody, source: "🙂".repeat(5_001) })))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(validBody, {
            "content-length": String(128 * 1024 + 1),
          }),
        )
      ).status,
    ).toBe(400);

    mocks.getProblemBySlug.mockReturnValueOnce(undefined);
    expect(
      (await POST(request({ ...validBody, problemSlug: "missing" }))).status,
    ).toBe(400);
  });

  it("enforces burst and atomic UTC daily limits before judging", async () => {
    mocks.limit.mockResolvedValueOnce({ success: false });
    const burstResponse = await POST(request(validBody));
    expect(burstResponse.status).toBe(429);
    expect(burstResponse.headers.get("retry-after")).toBe("60");
    expect(mocks.judgeSubmission).not.toHaveBeenCalled();

    mocks.reserveSubmission.mockResolvedValueOnce(false);
    const dailyResponse = await POST(request(validBody));
    expect(dailyResponse.status).toBe(429);
    expect(Number(dailyResponse.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(mocks.judgeSubmission).not.toHaveBeenCalled();
  });

  it("persists a successful result and returns it", async () => {
    const response = await POST(request(validBody));
    const result = (await response.json()) as {
      id?: unknown;
      createdAt?: unknown;
      [key: string]: unknown;
    };

    expect(response.status).toBe(201);
    expect(result).toMatchObject({
      status: "accepted",
      passedCount: 1,
      testCount: 1,
    });
    expect(result.id).toEqual(expect.any(String));
    expect(result.createdAt).toEqual(expect.any(Number));
    expect(mocks.reserveSubmission).toHaveBeenCalledWith(
      "user_1",
      "two-sum",
      validBody.source,
      expect.objectContaining({ testCount: 1 }),
    );
    expect(mocks.finalizeSubmission).toHaveBeenCalledWith(
      "user_1",
      "two-sum",
      result,
    );
    const [reserveOrder] = mocks.reserveSubmission.mock.invocationCallOrder;
    const [judgeOrder] = mocks.judgeSubmission.mock.invocationCallOrder;
    if (reserveOrder === undefined || judgeOrder === undefined) {
      throw new Error("Expected the reservation and judge to run.");
    }
    expect(reserveOrder).toBeLessThan(judgeOrder);
  });

  it("saves code without counting an unavailable judge as an attempt", async () => {
    mocks.judgeSubmission.mockResolvedValueOnce({
      status: "judge_error",
      passedCount: 0,
      testCount: 1,
      diagnostic: "The code judge is temporarily unavailable.",
    });

    const response = await POST(request(validBody));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "The code judge is temporarily unavailable. Your code was saved.",
    });
    expect(mocks.finalizeSubmission).toHaveBeenCalledWith(
      "user_1",
      "two-sum",
      expect.objectContaining({ status: "judge_error" }),
    );
  });
});

function request(body: unknown, headers?: HeadersInit): Request {
  return new Request("https://nerdcode.test/api/submissions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://nerdcode.test",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
