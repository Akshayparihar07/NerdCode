import type { JsonValue, ProblemCase } from "@/content/problem-types";

export type SubmissionStatus =
  | "accepted"
  | "wrong_answer"
  | "syntax_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "judge_error";

export type SubmissionResult = {
  id: string;
  status: SubmissionStatus;
  passedCount: number;
  testCount: number;
  runtimeMs?: number;
  memoryKb?: number;
  diagnostic?: string;
  createdAt: number;
};

export type JudgeOutcome = Omit<SubmissionResult, "id" | "createdAt">;

export type OneCompilerEnvironment = {
  ONECOMPILER_API_URL: string;
  ONECOMPILER_API_KEY: string;
  ONECOMPILER_API_HOST?: string;
};

const RESULT_MARKER = "__NERDCODE_RESULT__:";
const ERROR_MARKER = "__NERDCODE_RUNTIME_ERROR__";
const PROVIDER_TIMEOUT_MS = 15_000;
const MAX_DIAGNOSTIC_BYTES = 4096;

type ProviderRun = {
  status?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  exception?: unknown;
  error?: unknown;
  executionTime?: unknown;
  memoryUsed?: unknown;
};

export function buildPythonProgram(source: string, runnerCode: string): string {
  return `${source}

${runnerCode}

import json as __nerdcode_json
import sys as __nerdcode_sys

try:
    __nerdcode_args = __nerdcode_json.loads(__nerdcode_sys.stdin.read())
    __nerdcode_value = __nerdcode_run(__nerdcode_args)
    __nerdcode_payload = __nerdcode_json.dumps(__nerdcode_value, separators=(",", ":"), allow_nan=False)
    __nerdcode_sys.stdout.write("\\n${RESULT_MARKER}" + __nerdcode_payload + "\\n")
except BaseException:
    __nerdcode_sys.stdout.write("\\n${ERROR_MARKER}\\n")
`;
}

export async function judgeSubmission(
  environment: OneCompilerEnvironment,
  source: string,
  runnerCode: string,
  cases: readonly ProblemCase[],
): Promise<JudgeOutcome> {
  const apiUrl =
    typeof environment.ONECOMPILER_API_URL === "string"
      ? environment.ONECOMPILER_API_URL.trim()
      : "";
  const apiKey =
    typeof environment.ONECOMPILER_API_KEY === "string"
      ? environment.ONECOMPILER_API_KEY.trim()
      : "";

  if (apiUrl.length === 0 || apiKey.length === 0 || cases.length === 0) {
    return judgeError(cases.length);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: oneCompilerHeaders(apiKey, environment.ONECOMPILER_API_HOST),
      body: JSON.stringify({
        language: "python",
        stdin: cases.map(({ args }) => JSON.stringify(args)),
        files: [
          {
            name: "main.py",
            content: buildPythonProgram(source, runnerCode),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return judgeError(cases.length);
    }

    return normalizeOneCompilerResponse(
      await response.json(),
      cases.map(({ expected }) => expected),
    );
  } catch {
    return judgeError(cases.length);
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeOneCompilerResponse(
  response: unknown,
  expectedValues: readonly JsonValue[],
): JudgeOutcome {
  if (!Array.isArray(response) || response.length !== expectedValues.length) {
    return judgeError(expectedValues.length);
  }

  const runs = response as ProviderRun[];
  if (runs.some((run) => run.status !== "success")) {
    return judgeError(expectedValues.length);
  }

  let passedCount = 0;
  let failureStatus: SubmissionStatus | undefined;

  for (const [index, run] of runs.entries()) {
    const providerError = text(run.error);
    const providerDiagnostic = `${text(run.exception)}\n${text(run.stderr)}`;
    const output = text(run.stdout);

    if (isTimeLimitError(providerError)) {
      failureStatus = preferFailure(failureStatus, "time_limit_exceeded");
      continue;
    }

    if (providerError.length > 0) {
      return judgeError(expectedValues.length);
    }

    if (output.split(/\r?\n/u).includes(ERROR_MARKER)) {
      failureStatus = preferFailure(failureStatus, "runtime_error");
      continue;
    }

    const serializedResult = findFinalResult(output);
    if (serializedResult === undefined) {
      failureStatus = preferFailure(
        failureStatus,
        isSyntaxError(providerDiagnostic) ? "syntax_error" : "runtime_error",
      );
      continue;
    }

    let actual: unknown;
    try {
      actual = JSON.parse(serializedResult);
    } catch {
      failureStatus = preferFailure(failureStatus, "runtime_error");
      continue;
    }

    if (jsonEquals(actual, expectedValues[index])) {
      passedCount += 1;
    } else {
      failureStatus = preferFailure(failureStatus, "wrong_answer");
    }
  }

  const status = failureStatus ?? "accepted";
  const runtimeMs = maximumMetric(runs, "executionTime");
  const memoryKb = maximumMetric(runs, "memoryUsed");
  const diagnostic = diagnosticFor(status);

  return {
    status,
    passedCount,
    testCount: expectedValues.length,
    ...(runtimeMs === undefined ? {} : { runtimeMs }),
    ...(memoryKb === undefined ? {} : { memoryKb }),
    ...(diagnostic === undefined ? {} : { diagnostic }),
  };
}

export function truncateDiagnostic(value: string): string {
  const bytes = new TextEncoder().encode(value.trim());
  if (bytes.length <= MAX_DIAGNOSTIC_BYTES) {
    return value.trim();
  }

  return new TextDecoder()
    .decode(bytes.slice(0, MAX_DIAGNOSTIC_BYTES))
    .replace(/\uFFFD$/u, "");
}

function oneCompilerHeaders(apiKey: string, apiHost?: string): Headers {
  const headers = new Headers({ "content-type": "application/json" });
  const host = apiHost?.trim();

  if (host !== undefined && host.length > 0) {
    headers.set("x-rapidapi-key", apiKey);
    headers.set("x-rapidapi-host", host);
  } else {
    headers.set("x-api-key", apiKey);
  }

  return headers;
}

function findFinalResult(output: string): string | undefined {
  const line = output
    .split(/\r?\n/u)
    .findLast((candidate) => candidate.startsWith(RESULT_MARKER));
  return line?.slice(RESULT_MARKER.length);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isTimeLimitError(value: string): boolean {
  return /^\s*E001(?:\s*:|\b)/iu.test(value);
}

function isSyntaxError(value: string): boolean {
  return /^(?:SyntaxError|IndentationError|TabError)\b/mu.test(value);
}

function preferFailure(
  current: SubmissionStatus | undefined,
  candidate: SubmissionStatus,
): SubmissionStatus {
  const priority: Record<SubmissionStatus, number> = {
    accepted: 0,
    wrong_answer: 1,
    runtime_error: 2,
    syntax_error: 3,
    time_limit_exceeded: 4,
    judge_error: 5,
  };
  return current === undefined || priority[candidate] > priority[current]
    ? candidate
    : current;
}

function diagnosticFor(status: SubmissionStatus): string | undefined {
  const diagnostics: Partial<Record<SubmissionStatus, string>> = {
    wrong_answer: "The output did not match every hidden test.",
    syntax_error: "Python could not compile the submitted code.",
    runtime_error: "The code raised an error on a hidden test.",
    time_limit_exceeded: "The code exceeded the judge time limit.",
    judge_error: "The code judge is temporarily unavailable.",
  };
  const diagnostic = diagnostics[status];
  return diagnostic === undefined ? undefined : truncateDiagnostic(diagnostic);
}

function judgeError(testCount: number): JudgeOutcome {
  return {
    status: "judge_error",
    passedCount: 0,
    testCount,
    diagnostic: truncateDiagnostic(
      "The code judge is temporarily unavailable.",
    ),
  };
}

function maximumMetric(
  runs: readonly ProviderRun[],
  key: "executionTime" | "memoryUsed",
): number | undefined {
  let maximum: number | undefined;

  for (const run of runs) {
    const value = run[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      continue;
    }

    const normalized = Math.floor(value);
    maximum =
      maximum === undefined ? normalized : Math.max(maximum, normalized);
  }

  return maximum;
}

function jsonEquals(left: unknown, right: unknown): boolean {
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonEquals(value, right[index]))
    );
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(rightRecord, key) &&
        jsonEquals(leftRecord[key], rightRecord[key]),
    )
  );
}
