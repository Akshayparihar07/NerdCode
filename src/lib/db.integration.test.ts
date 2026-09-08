/// <reference types="@cloudflare/vitest-plugin/types" />

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import {
  finalizeSubmission,
  getProblemLearningState,
  getProgressForUser,
  reserveSubmission,
} from "@/lib/db";
import type { SubmissionResult } from "@/lib/judge";

const DAY = Date.UTC(2026, 8, 8);

function result(
  id: string,
  status: SubmissionResult["status"],
  createdAt: number,
): SubmissionResult {
  return {
    id,
    status,
    passedCount: status === "accepted" ? 3 : 1,
    testCount: 3,
    createdAt,
    ...(status === "accepted"
      ? {}
      : { diagnostic: "A safe learner-facing diagnostic." }),
  };
}

describe("D1 learning persistence", () => {
  it("records a first solve and stores source only in progress", async () => {
    const userId = "first-solve-user";
    const reservation = { id: "first-solve", testCount: 3, createdAt: DAY };

    await expect(
      reserveSubmission(
        userId,
        "two-sum",
        "def two_sum(): return [0, 1]",
        reservation,
        env.DB,
      ),
    ).resolves.toBe(true);

    const pending = await getProblemLearningState(userId, "two-sum", env.DB);
    expect(pending).toMatchObject({
      attempts: 0,
      solvedAt: null,
      latestCode: "def two_sum(): return [0, 1]",
    });

    await finalizeSubmission(
      userId,
      "two-sum",
      result(reservation.id, "accepted", reservation.createdAt),
      env.DB,
    );

    const state = await getProblemLearningState(userId, "two-sum", env.DB);
    expect(state).toMatchObject({
      attempts: 1,
      solvedAt: DAY,
      latestCode: "def two_sum(): return [0, 1]",
      recentSubmissions: [
        {
          id: "first-solve",
          status: "accepted",
          passedCount: 3,
          testCount: 3,
        },
      ],
    });
    expect(await getProgressForUser(userId, env.DB)).toEqual({
      "two-sum": { attempts: 1, solvedAt: DAY },
    });

    const storedSubmission = await env.DB.prepare(
      "SELECT * FROM submissions WHERE id = ?",
    )
      .bind(reservation.id)
      .first<Record<string, unknown>>();
    expect(storedSubmission).not.toHaveProperty("source");
    expect(storedSubmission).not.toHaveProperty("latest_code");
  });

  it("keeps solved state while replacing latest code after a failure", async () => {
    const userId = "later-failure-user";
    const accepted = { id: "accepted-first", testCount: 3, createdAt: DAY + 1 };
    const failed = { id: "failed-later", testCount: 3, createdAt: DAY + 2 };

    await reserveSubmission(
      userId,
      "binary-search",
      "accepted code",
      accepted,
      env.DB,
    );
    await finalizeSubmission(
      userId,
      "binary-search",
      result(accepted.id, "accepted", accepted.createdAt),
      env.DB,
    );
    await reserveSubmission(
      userId,
      "binary-search",
      "latest failed code",
      failed,
      env.DB,
    );
    await finalizeSubmission(
      userId,
      "binary-search",
      result(failed.id, "wrong_answer", failed.createdAt),
      env.DB,
    );

    const state = await getProblemLearningState(
      userId,
      "binary-search",
      env.DB,
    );
    expect(state.latestCode).toBe("latest failed code");
    expect(state.attempts).toBe(2);
    expect(state.solvedAt).toBe(accepted.createdAt);
    expect(state.recentSubmissions.map(({ status }) => status)).toEqual([
      "wrong_answer",
      "accepted",
    ]);
  });

  it("isolates learner state even for the same problem", async () => {
    const left = { id: "left-user-result", testCount: 3, createdAt: DAY + 10 };
    const right = {
      id: "right-user-result",
      testCount: 3,
      createdAt: DAY + 11,
    };

    await reserveSubmission(
      "left-user",
      "valid-anagram",
      "left code",
      left,
      env.DB,
    );
    await finalizeSubmission(
      "left-user",
      "valid-anagram",
      result(left.id, "accepted", left.createdAt),
      env.DB,
    );
    await reserveSubmission(
      "right-user",
      "valid-anagram",
      "right code",
      right,
      env.DB,
    );
    await finalizeSubmission(
      "right-user",
      "valid-anagram",
      result(right.id, "runtime_error", right.createdAt),
      env.DB,
    );

    const [leftState, rightState] = await Promise.all([
      getProblemLearningState("left-user", "valid-anagram", env.DB),
      getProblemLearningState("right-user", "valid-anagram", env.DB),
    ]);
    expect(leftState).toMatchObject({
      latestCode: "left code",
      solvedAt: left.createdAt,
    });
    expect(rightState).toMatchObject({
      latestCode: "right code",
      solvedAt: null,
    });
  });

  it("atomically enforces rolling and UTC-day judge limits", async () => {
    const firstMinute = Array.from({ length: 5 }, (_, index) =>
      reserveSubmission(
        "quota-user",
        "climbing-stairs",
        `source ${index}`,
        {
          id: `quota-${index}`,
          testCount: 3,
          createdAt: DAY + 100 + index,
        },
        env.DB,
      ),
    );

    const firstOutcomes = await Promise.all(firstMinute);
    expect(firstOutcomes.filter(Boolean)).toHaveLength(3);

    const nextMinute = await Promise.all([
      reserveSubmission(
        "quota-user",
        "climbing-stairs",
        "fourth source",
        { id: "quota-fourth", testCount: 3, createdAt: DAY + 61_000 },
        env.DB,
      ),
      reserveSubmission(
        "quota-user",
        "climbing-stairs",
        "fifth source",
        { id: "quota-fifth", testCount: 3, createdAt: DAY + 61_001 },
        env.DB,
      ),
    ]);
    expect(nextMinute).toEqual([true, true]);

    await expect(
      reserveSubmission(
        "quota-user",
        "climbing-stairs",
        "sixth source",
        { id: "quota-sixth", testCount: 3, createdAt: DAY + 122_000 },
        env.DB,
      ),
    ).resolves.toBe(false);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM submissions WHERE clerk_user_id = ?",
    )
      .bind("quota-user")
      .first<{ count: number }>();
    expect(count?.count).toBe(5);
  });

  it("saves unavailable-judge code without counting a learning attempt", async () => {
    const reservation = {
      id: "judge-error-result",
      testCount: 3,
      createdAt: DAY + 200,
    };
    await reserveSubmission(
      "judge-error-user",
      "contains-duplicate",
      "recoverable source",
      reservation,
      env.DB,
    );
    await finalizeSubmission(
      "judge-error-user",
      "contains-duplicate",
      result(reservation.id, "judge_error", reservation.createdAt),
      env.DB,
    );

    const state = await getProblemLearningState(
      "judge-error-user",
      "contains-duplicate",
      env.DB,
    );
    expect(state).toMatchObject({
      latestCode: "recoverable source",
      attempts: 0,
      solvedAt: null,
      recentSubmissions: [{ status: "judge_error" }],
    });
  });
});
