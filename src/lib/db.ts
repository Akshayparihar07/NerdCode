import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { SubmissionResult } from "@/lib/judge";

type ProgressRow = {
  problem_slug: string;
  latest_code: string;
  attempt_count: number;
  solved_at: number | null;
};

type SubmissionRow = {
  id: string;
  status: SubmissionResult["status"];
  passed_count: number;
  test_count: number;
  runtime_ms: number | null;
  memory_kb: number | null;
  diagnostic: string | null;
  created_at: number;
};

export type ProblemProgressSummary = {
  attempts: number;
  solvedAt: number | null;
};

export type ProblemLearningState = ProblemProgressSummary & {
  latestCode: string | null;
  recentSubmissions: SubmissionResult[];
};

export type SubmissionReservation = Pick<
  SubmissionResult,
  "id" | "testCount" | "createdAt"
>;

export async function getProgressForUser(
  userId: string,
  db: D1Database = database(),
): Promise<Record<string, ProblemProgressSummary>> {
  const { results } = await db
    .prepare(
      `SELECT problem_slug, attempt_count, solved_at
       FROM problem_progress
       WHERE clerk_user_id = ?`,
    )
    .bind(userId)
    .all<ProgressRow>();
  const progress: Record<string, ProblemProgressSummary> = {};

  for (const row of results) {
    progress[row.problem_slug] = {
      attempts: row.attempt_count,
      solvedAt: row.solved_at,
    };
  }

  return progress;
}

export async function getProblemLearningState(
  userId: string,
  problemSlug: string,
  db: D1Database = database(),
): Promise<ProblemLearningState> {
  const [progress, submissions] = await Promise.all([
    db
      .prepare(
        `SELECT latest_code, attempt_count, solved_at
         FROM problem_progress
         WHERE clerk_user_id = ? AND problem_slug = ?`,
      )
      .bind(userId, problemSlug)
      .first<ProgressRow>(),
    db
      .prepare(
        `SELECT id, status, passed_count, test_count, runtime_ms, memory_kb,
                diagnostic, created_at
         FROM submissions
         WHERE clerk_user_id = ? AND problem_slug = ?
         ORDER BY created_at DESC
         LIMIT 5`,
      )
      .bind(userId, problemSlug)
      .all<SubmissionRow>(),
  ]);

  return {
    latestCode: progress?.latest_code ?? null,
    attempts: progress?.attempt_count ?? 0,
    solvedAt: progress?.solved_at ?? null,
    recentSubmissions: submissions.results.map(submissionFromRow),
  };
}

export async function reserveSubmission(
  userId: string,
  problemSlug: string,
  source: string,
  reservation: SubmissionReservation,
  db: D1Database = database(),
): Promise<boolean> {
  const dayStartedAt =
    Math.floor(reservation.createdAt / 86_400_000) * 86_400_000;
  const dayEndsAt = dayStartedAt + 86_400_000;
  const rollingWindowStartedAt = reservation.createdAt - 60_000;
  const [reserved] = await db.batch([
    db
      .prepare(
        `INSERT INTO submissions (
           id, clerk_user_id, problem_slug, provider, status, passed_count,
           test_count, runtime_ms, memory_kb, diagnostic, created_at
         )
         SELECT ?, ?, ?, 'onecompiler', 'judge_error', 0, ?, NULL, NULL, NULL, ?
         WHERE (
           SELECT COUNT(*)
           FROM submissions
           WHERE clerk_user_id = ? AND created_at >= ? AND created_at < ?
         ) < 5
           AND (
             SELECT COUNT(*)
             FROM submissions
             WHERE clerk_user_id = ? AND created_at > ?
           ) < 3`,
      )
      .bind(
        reservation.id,
        userId,
        problemSlug,
        reservation.testCount,
        reservation.createdAt,
        userId,
        dayStartedAt,
        dayEndsAt,
        userId,
        rollingWindowStartedAt,
      ),
    db
      .prepare(
        `INSERT INTO problem_progress (
           clerk_user_id, problem_slug, latest_code, attempt_count, solved_at,
           updated_at
         )
         SELECT ?, ?, ?, 0, NULL, ?
         WHERE EXISTS (
           SELECT 1 FROM submissions
           WHERE id = ? AND clerk_user_id = ? AND problem_slug = ?
         )
         ON CONFLICT (clerk_user_id, problem_slug) DO UPDATE SET
           latest_code = CASE
             WHEN excluded.updated_at >= problem_progress.updated_at
             THEN excluded.latest_code
             ELSE problem_progress.latest_code
           END,
           updated_at = MAX(problem_progress.updated_at, excluded.updated_at)`,
      )
      .bind(
        userId,
        problemSlug,
        source,
        reservation.createdAt,
        reservation.id,
        userId,
        problemSlug,
      ),
  ]);

  return reserved?.meta.changes === 1;
}

export async function finalizeSubmission(
  userId: string,
  problemSlug: string,
  result: SubmissionResult,
  db: D1Database = database(),
): Promise<void> {
  const incrementsAttempt = result.status === "judge_error" ? 0 : 1;
  const solvedAt = result.status === "accepted" ? result.createdAt : null;
  const diagnostic =
    result.diagnostic ??
    (result.status === "judge_error"
      ? "The code judge is temporarily unavailable."
      : null);

  await db.batch([
    db
      .prepare(
        `UPDATE problem_progress
         SET attempt_count = attempt_count + ?,
             solved_at = COALESCE(solved_at, ?)
         WHERE clerk_user_id = ? AND problem_slug = ?
           AND EXISTS (
             SELECT 1 FROM submissions
             WHERE id = ? AND clerk_user_id = ? AND problem_slug = ?
               AND status = 'judge_error' AND diagnostic IS NULL
           )`,
      )
      .bind(
        incrementsAttempt,
        solvedAt,
        userId,
        problemSlug,
        result.id,
        userId,
        problemSlug,
      ),
    db
      .prepare(
        `UPDATE submissions
         SET status = ?, passed_count = ?, test_count = ?, runtime_ms = ?,
             memory_kb = ?, diagnostic = ?
         WHERE id = ? AND clerk_user_id = ? AND problem_slug = ?
           AND status = 'judge_error' AND diagnostic IS NULL`,
      )
      .bind(
        result.status,
        result.passedCount,
        result.testCount,
        result.runtimeMs ?? null,
        result.memoryKb ?? null,
        diagnostic,
        result.id,
        userId,
        problemSlug,
      ),
  ]);
}

function database(): D1Database {
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: D1Database }).DB;

  if (db === undefined) {
    throw new Error("The DB binding is not configured.");
  }

  return db;
}

function submissionFromRow(row: SubmissionRow): SubmissionResult {
  return {
    id: row.id,
    status: row.status,
    passedCount: row.passed_count,
    testCount: row.test_count,
    createdAt: row.created_at,
    ...(row.runtime_ms === null ? {} : { runtimeMs: row.runtime_ms }),
    ...(row.memory_kb === null ? {} : { memoryKb: row.memory_kb }),
    ...(row.diagnostic === null ? {} : { diagnostic: row.diagnostic }),
  };
}
