import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getProblemBySlug } from "@/content/problems";
import { getHiddenCases } from "@/content/problems.private";
import { finalizeSubmission, reserveSubmission } from "@/lib/db";
import {
  judgeSubmission,
  type OneCompilerEnvironment,
  type SubmissionResult,
} from "@/lib/judge";

type SubmissionBody = {
  problemSlug: string;
  source: string;
};

type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type SubmissionEnvironment = OneCompilerEnvironment & {
  SUBMIT_RATE_LIMITER: RateLimiter;
};

const MAX_SOURCE_BYTES = 20_000;
const MAX_BODY_BYTES = 128 * 1024;

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (userId === null) {
    return errorResponse("Sign in to submit code.", 401);
  }

  if (!hasSameOrigin(request)) {
    return errorResponse("Invalid request origin.", 400);
  }

  const body = await readSubmissionBody(request);
  if (body === undefined) {
    return errorResponse(
      "Expected a problem slug and Python source code.",
      400,
    );
  }

  const problem = getProblemBySlug(body.problemSlug);
  if (problem === undefined) {
    return errorResponse("Unknown problem.", 400);
  }

  let environment: SubmissionEnvironment;
  try {
    environment = getCloudflareContext()
      .env as unknown as SubmissionEnvironment;
  } catch {
    return errorResponse("The submission service is unavailable.", 503);
  }

  const rateLimitResponse = await checkRateLimit(environment, userId);
  if (rateLimitResponse !== undefined) {
    return rateLimitResponse;
  }

  const hiddenCases = getHiddenCases(problem.slug);
  const reservation = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    testCount: hiddenCases.length,
  };

  try {
    const reserved = await reserveSubmission(
      userId,
      problem.slug,
      body.source,
      reservation,
    );
    if (!reserved) {
      return errorResponse(
        "Submission limit reached. Try again later.",
        429,
        60,
      );
    }
  } catch {
    return errorResponse("The submission service is unavailable.", 503);
  }

  const outcome = await judgeSubmission(
    environment,
    body.source,
    problem.runnerCode,
    hiddenCases,
  );
  const result: SubmissionResult = {
    ...reservation,
    ...outcome,
  };

  try {
    await finalizeSubmission(userId, problem.slug, result);
  } catch {
    return errorResponse("The submission result could not be saved.", 503);
  }

  if (result.status === "judge_error") {
    return errorResponse(
      "The code judge is temporarily unavailable. Your code was saved.",
      503,
    );
  }

  return Response.json(result, { status: 201 });
}

async function readSubmissionBody(
  request: Request,
): Promise<SubmissionBody | undefined> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return undefined;
  }

  const reader = request.body?.getReader();
  if (reader === undefined) {
    return undefined;
  }

  const decoder = new TextDecoder();
  let byteLength = 0;
  let bodyText = "";

  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      const { value } = chunk;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        return undefined;
      }
      bodyText += decoder.decode(value, { stream: true });
      chunk = await reader.read();
    }
    bodyText += decoder.decode();
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return undefined;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("problemSlug" in body) ||
    !("source" in body) ||
    typeof body.problemSlug !== "string" ||
    typeof body.source !== "string" ||
    body.source.length < 1 ||
    new TextEncoder().encode(body.source).byteLength > MAX_SOURCE_BYTES
  ) {
    return undefined;
  }

  return { problemSlug: body.problemSlug, source: body.source };
}

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function checkRateLimit(
  environment: SubmissionEnvironment,
  userId: string,
): Promise<Response | undefined> {
  try {
    const result = await environment.SUBMIT_RATE_LIMITER.limit({ key: userId });
    return result.success
      ? undefined
      : errorResponse("Too many submissions. Try again shortly.", 429, 60);
  } catch {
    return errorResponse("The submission service is unavailable.", 503);
  }
}

function errorResponse(
  error: string,
  status: number,
  retryAfter?: number,
): Response {
  const init: ResponseInit =
    retryAfter === undefined
      ? { status }
      : { status, headers: { "retry-after": String(retryAfter) } };
  return Response.json({ error }, init);
}
