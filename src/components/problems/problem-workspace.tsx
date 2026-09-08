"use client";

import { useAuth } from "@clerk/nextjs";
import { python } from "@codemirror/lang-python";
import { syntaxHighlighting } from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import {
  ArrowCounterClockwise,
  CheckCircle,
  Lightbulb,
  LockKey,
  PaperPlaneTilt,
  Play,
  SpinnerGap,
  XCircle,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Blob } from "@/components/blob";
import { Button } from "@/components/ui/button";
import type { JsonValue, Problem } from "@/content/problem-types";
import { cn } from "@/lib/utils";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <output
      className="h-[26rem] animate-pulse bg-muted"
      aria-label="Loading editor"
    />
  ),
});

const PYTHON_EXTENSION = python();
const CODE_EDITOR_HIGHLIGHTING = syntaxHighlighting(classHighlighter);
const MAX_SOURCE_BYTES = 20_000;
const EXECUTION_TIMEOUT_MS = 3_000;
const INITIALIZATION_TIMEOUT_MS = 45_000;

export type SubmissionStatus =
  | "accepted"
  | "wrong_answer"
  | "syntax_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "judge_error";

export type SubmissionSummary = {
  readonly id: string;
  readonly status: SubmissionStatus;
  readonly passedCount: number;
  readonly testCount: number;
  readonly runtimeMs?: number;
  readonly memoryKb?: number;
  readonly diagnostic?: string;
  readonly createdAt: number;
};

export type ProblemWorkspaceProps = {
  readonly problem: Problem;
  readonly signedIn: boolean;
  readonly submissionAvailable: boolean;
  readonly latestCode?: string;
  readonly attempts: number;
  readonly solved: boolean;
  readonly recentSubmissions: readonly SubmissionSummary[];
};

type WorkerHandle = {
  readonly worker: Worker;
  readonly ready: Promise<void>;
};

type WorkerCaseResult =
  | { readonly actual: JsonValue; readonly output: string }
  | { readonly error: string; readonly output: string };

type WorkerResponse =
  | { readonly results: readonly WorkerCaseResult[] }
  | { readonly error: string };

type PublicCaseResult = {
  readonly expected: JsonValue;
  readonly passed: boolean;
  readonly actual?: JsonValue;
  readonly error?: string;
  readonly output?: string;
};

type Notice = {
  readonly tone: "neutral" | "success" | "error";
  readonly message: string;
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  syntax_error: "Syntax error",
  runtime_error: "Runtime error",
  time_limit_exceeded: "Time limit exceeded",
  judge_error: "Judge unavailable",
};

function createWorker(): WorkerHandle {
  const worker = new Worker("/pyodide-worker.mjs", { type: "module" });
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      worker.terminate();
      reject(
        new Error("Python took too long to initialize. Please try again."),
      );
    }, INITIALIZATION_TIMEOUT_MS);

    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerLifecycleMessage(event.data)) {
        return;
      }
      if (event.data.type === "ready") {
        cleanup();
        resolve();
      } else if (event.data.type === "init-error") {
        cleanup();
        reject(
          new Error(
            typeof event.data.message === "string"
              ? event.data.message
              : "Python could not start.",
          ),
        );
      }
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "Python could not start."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  });

  return { worker, ready };
}

function runInWorker(
  worker: Worker,
  source: string,
  problem: Problem,
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      worker.terminate();
      reject(
        new Error("Your code ran for more than 3 seconds and was stopped."),
      );
    }, EXECUTION_TIMEOUT_MS);

    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      channel.port1.close();
      worker.removeEventListener("error", onError);
    };

    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(
        new Error(event.message || "The Python worker stopped unexpectedly."),
      );
    };

    channel.port1.onmessage = (event: MessageEvent<WorkerResponse>) => {
      cleanup();
      resolve(event.data);
    };
    channel.port1.onmessageerror = () => {
      cleanup();
      reject(new Error("The Python worker returned an unreadable result."));
    };
    worker.addEventListener("error", onError);
    worker.postMessage(
      {
        source,
        runnerCode: problem.runnerCode,
        cases: problem.publicCases,
      },
      [channel.port2],
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkerLifecycleMessage(
  value: unknown,
): value is { readonly type: string; readonly message?: unknown } {
  return isRecord(value) && typeof Reflect.get(value, "type") === "string";
}

function sourceSize(source: string) {
  return new TextEncoder().encode(source).byteLength;
}

function formatValue(value: JsonValue) {
  return JSON.stringify(value, null, 2);
}

function valuesMatch(actual: JsonValue, expected: JsonValue) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function readableError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return message.slice(-2_000);
}

function apiError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) {
    return fallback;
  }
  const error = Reflect.get(payload, "error");
  return typeof error === "string" ? error : fallback;
}

function isSubmissionSummary(value: unknown): value is SubmissionSummary {
  if (!isRecord(value)) {
    return false;
  }

  const status = Reflect.get(value, "status");
  return (
    typeof Reflect.get(value, "id") === "string" &&
    typeof status === "string" &&
    Object.hasOwn(STATUS_LABELS, status) &&
    typeof Reflect.get(value, "passedCount") === "number" &&
    typeof Reflect.get(value, "testCount") === "number" &&
    typeof Reflect.get(value, "createdAt") === "number"
  );
}

function formatDate(timestamp: number) {
  const milliseconds =
    timestamp < 10_000_000_000 ? timestamp * 1_000 : timestamp;
  return new Date(milliseconds).toISOString().slice(0, 16).replace("T", " ");
}

function ProblemGuide({
  problem,
  attempted,
}: {
  readonly problem: Problem;
  readonly attempted: boolean;
}) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [manuallyUnlocked, setManuallyUnlocked] = useState(false);
  const walkthroughUnlocked = attempted || manuallyUnlocked;

  return (
    <div className="space-y-8">
      <section aria-labelledby="problem-statement" className="space-y-3">
        <h2 id="problem-statement" className="text-lg font-semibold">
          Problem
        </h2>
        {problem.statement.map((paragraph) => (
          <p key={paragraph} className="leading-7 text-foreground/85">
            {paragraph}
          </p>
        ))}
      </section>

      <section aria-labelledby="examples" className="space-y-3">
        <h2 id="examples" className="text-lg font-semibold">
          Examples
        </h2>
        <div className="space-y-3">
          {problem.examples.map((example, index) => (
            <div
              key={`${problem.slug}-example-${index + 1}`}
              className="rounded-xl border bg-muted/45 p-4"
            >
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Example {index + 1}
              </p>
              <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                Input: {formatValue(example.args)}
                {"\n"}
                Output: {formatValue(example.expected)}
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">
                {example.explanation}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="constraints" className="space-y-3">
        <h2 id="constraints" className="text-lg font-semibold">
          Constraints
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/80">
          {problem.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="real-world-connection"
        className="overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 shrink-0 sm:w-20" aria-hidden="true">
            <Blob mood="happy" jiggle={false} />
          </div>
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                Why this matters
              </p>
              <h2
                id="real-world-connection"
                className="mt-1 text-xl font-semibold"
              >
                The real-world connection
              </h2>
              <p className="mt-2 leading-7 text-foreground/85">
                {problem.analogy.scenario}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Concept mapping</h3>
              <ul className="mt-2 space-y-2 text-sm text-foreground/80">
                {problem.analogy.mapping.map((mapping) => (
                  <li key={mapping} className="flex gap-2">
                    <span className="text-primary" aria-hidden="true">
                      →
                    </span>
                    <span>{mapping}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Where you will see it</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {problem.analogy.useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="hints" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="hints" className="text-lg font-semibold">
            Hints
          </h2>
          {visibleHints < problem.hints.length ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisibleHints((count) => count + 1)}
            >
              <Lightbulb aria-hidden="true" />
              Reveal hint {visibleHints + 1}
            </Button>
          ) : null}
        </div>
        {visibleHints === 0 ? (
          <p className="text-sm text-muted-foreground">
            Stuck? Reveal one nudge at a time.
          </p>
        ) : (
          <div className="flex items-start gap-3" aria-live="polite">
            <div className="hidden w-14 shrink-0 sm:block" aria-hidden="true">
              <Blob mood="hmm" jiggle={false} />
            </div>
            <ol className="min-w-0 flex-1 space-y-2">
              {problem.hints.slice(0, visibleHints).map((hint, index) => (
                <li
                  key={hint}
                  className="flex gap-3 rounded-xl border bg-card p-3 text-sm"
                >
                  <span className="font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section aria-labelledby="walkthrough" className="space-y-3">
        <h2 id="walkthrough" className="text-lg font-semibold">
          Walkthrough
        </h2>
        {walkthroughUnlocked ? (
          <div className="space-y-5 rounded-xl border bg-card p-5">
            <p className="leading-7">{problem.walkthrough.approach}</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
              {problem.walkthrough.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-3 py-1">
                Time: {problem.walkthrough.timeComplexity}
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                Space: {problem.walkthrough.spaceComplexity}
              </span>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Reference solution</h3>
              <pre className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-5 text-background">
                <code>{problem.walkthrough.solution}</code>
              </pre>
            </div>
          </div>
        ) : confirmReveal ? (
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 p-4"
            aria-live="polite"
          >
            <p className="text-sm">
              The walkthrough includes a complete solution. Reveal it now?
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setManuallyUnlocked(true)}
              >
                Reveal solution
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmReveal(false)}
              >
                Keep trying
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <LockKey
              className="mx-auto mb-2 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Run or submit once to unlock the guided solution.
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1"
              onClick={() => setConfirmReveal(true)}
            >
              Reveal it without running
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function RunResults({
  results,
}: {
  readonly results: readonly PublicCaseResult[];
}) {
  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <div
          key={`public-result-${index + 1}`}
          className={cn(
            "rounded-lg border p-3 text-sm",
            result.passed
              ? "border-success/25 bg-success/5"
              : "border-destructive/25 bg-destructive/5",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            {result.passed ? (
              <CheckCircle className="text-success" aria-hidden="true" />
            ) : (
              <XCircle className="text-destructive" aria-hidden="true" />
            )}
            Case {index + 1}: {result.passed ? "Passed" : "Failed"}
          </div>
          {result.error !== undefined ? (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-destructive">
              {result.error}
            </pre>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Expected</p>
                <pre className="mt-1 overflow-x-auto font-mono text-xs">
                  {formatValue(result.expected)}
                </pre>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your output</p>
                <pre className="mt-1 overflow-x-auto font-mono text-xs">
                  {result.actual === undefined
                    ? "No value returned"
                    : formatValue(result.actual)}
                </pre>
              </div>
            </div>
          )}
          {result.output ? (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Printed output</summary>
              <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap">
                {result.output}
              </pre>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SubmissionDetails({
  submission,
}: {
  readonly submission: SubmissionSummary;
}) {
  const accepted = submission.status === "accepted";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        accepted
          ? "border-success/25 bg-success/5"
          : "border-destructive/25 bg-destructive/5",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          {accepted ? (
            <CheckCircle className="text-success" aria-hidden="true" />
          ) : (
            <XCircle className="text-destructive" aria-hidden="true" />
          )}
          {STATUS_LABELS[submission.status]}
        </span>
        <span className="text-xs text-muted-foreground">
          {submission.passedCount}/{submission.testCount} hidden cases
        </span>
      </div>
      {submission.diagnostic !== undefined ? (
        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
          {submission.diagnostic}
        </pre>
      ) : null}
      {submission.runtimeMs !== undefined ||
      submission.memoryKb !== undefined ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {submission.runtimeMs !== undefined
            ? `${submission.runtimeMs} ms`
            : null}
          {submission.runtimeMs !== undefined &&
          submission.memoryKb !== undefined
            ? " · "
            : null}
          {submission.memoryKb !== undefined
            ? `${submission.memoryKb} KB`
            : null}
        </p>
      ) : null}
    </div>
  );
}

export function ProblemWorkspace({
  problem,
  signedIn,
  submissionAvailable,
  latestCode,
  attempts,
  solved,
  recentSubmissions,
}: ProblemWorkspaceProps) {
  const { isSignedIn } = useAuth();
  const workerRef = useRef<WorkerHandle>(null);
  const [source, setSource] = useState(latestCode ?? problem.starterCode);
  const [busy, setBusy] = useState<"run" | "submit">();
  const [notice, setNotice] = useState<Notice>();
  const [runResults, setRunResults] = useState<readonly PublicCaseResult[]>();
  const [submission, setSubmission] = useState<SubmissionSummary>();
  const [history, setHistory] = useState(recentSubmissions);
  const [attemptCount, setAttemptCount] = useState(attempts);
  const [isSolved, setIsSolved] = useState(solved);
  const [attemptedThisSession, setAttemptedThisSession] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const authenticated = isSignedIn ?? signedIn;
  const signInUrl = {
    pathname: "/sign-in",
    query: { redirect_url: `/problems/${problem.slug}` },
  } as const;

  useEffect(
    () => () => {
      workerRef.current?.worker.terminate();
      workerRef.current = null;
    },
    [],
  );

  const validateSource = () => {
    if (sourceSize(source) <= MAX_SOURCE_BYTES) {
      return true;
    }

    setNotice({
      tone: "error",
      message: "Your solution is larger than the 20 KB limit.",
    });
    return false;
  };

  const handleRun = async () => {
    setAttemptedThisSession(true);
    if (!validateSource()) {
      return;
    }

    setBusy("run");
    setRunResults(undefined);
    setSubmission(undefined);
    setNotice({
      tone: "neutral",
      message: "Preparing Python in your browser…",
    });

    let handle = workerRef.current;
    if (handle === null) {
      handle = createWorker();
      workerRef.current = handle;
    }

    try {
      await handle.ready;
      setNotice({ tone: "neutral", message: "Running the public examples…" });
      const response = await runInWorker(handle.worker, source, problem);
      if ("error" in response) {
        throw new Error(response.error);
      }

      const results = problem.publicCases.map((testCase, index) => {
        const result = response.results[index];
        if (result === undefined) {
          return {
            expected: testCase.expected,
            passed: false,
            error: "Python did not return a result for this case.",
          };
        }
        if ("error" in result) {
          return {
            expected: testCase.expected,
            passed: false,
            error: readableError(result.error, "Python execution failed."),
            ...(result.output ? { output: result.output } : {}),
          };
        }
        return {
          expected: testCase.expected,
          actual: result.actual,
          passed: valuesMatch(result.actual, testCase.expected),
          ...(result.output ? { output: result.output } : {}),
        };
      });
      const passed = results.filter((result) => result.passed).length;
      setRunResults(results);
      setNotice({
        tone: passed === results.length ? "success" : "error",
        message: `${passed} of ${results.length} public cases passed.`,
      });
    } catch (error) {
      handle.worker.terminate();
      if (workerRef.current === handle) {
        workerRef.current = null;
      }
      setNotice({
        tone: "error",
        message: readableError(error, "Python could not run your solution."),
      });
    } finally {
      setBusy(undefined);
    }
  };

  const handleSubmit = async () => {
    if (!submissionAvailable) {
      setNotice({
        tone: "error",
        message: "Submission storage is temporarily unavailable.",
      });
      return;
    }

    setAttemptedThisSession(true);
    if (!validateSource()) {
      return;
    }

    setBusy("submit");
    setRunResults(undefined);
    setSubmission(undefined);
    setNotice({ tone: "neutral", message: "Checking the hidden cases…" });

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSlug: problem.slug, source }),
      });
      const responseText = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = undefined;
      }
      if (!response.ok) {
        const fallback: Record<number, string> = {
          400: "That solution could not be submitted.",
          401: "Your session expired. Sign in again to submit.",
          429: "You have reached the submission limit. Try again later.",
          503: "The judge is temporarily unavailable. Your code is still here.",
        };
        setNotice({
          tone: "error",
          message: apiError(
            payload,
            fallback[response.status] ?? "Submission failed.",
          ),
        });
        if (response.status === 401) {
          setAuthRequired(true);
        }
        return;
      }

      if (!isSubmissionSummary(payload)) {
        throw new Error(
          "The judge returned an unreadable result. Your code is still here.",
        );
      }
      const result = payload;
      setSubmission(result);
      setHistory((current) =>
        [result, ...current.filter((item) => item.id !== result.id)].slice(
          0,
          8,
        ),
      );
      setAttemptCount((count) => count + 1);
      if (result.status === "accepted") {
        setIsSolved(true);
      }
      setNotice({
        tone: result.status === "accepted" ? "success" : "error",
        message: STATUS_LABELS[result.status],
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: readableError(
          error,
          "Could not reach the judge. Your code is still here.",
        ),
      });
    } finally {
      setBusy(undefined);
    }
  };

  const resetCode = () => {
    if (
      source !== problem.starterCode &&
      !globalThis.confirm("Reset your editor to the starter code?")
    ) {
      return;
    }
    setSource(problem.starterCode);
    setRunResults(undefined);
    setSubmission(undefined);
    setNotice({ tone: "neutral", message: "Starter code restored." });
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All problems
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {String(problem.order).padStart(2, "0")}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              {problem.title}
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                problem.difficulty === "easy"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning",
              )}
            >
              {problem.difficulty}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {problem.concepts.map((concept) => (
              <span
                key={concept}
                className="rounded-full border px-2.5 py-1 text-xs"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card px-4 py-2 text-right text-sm">
          <p
            className={
              isSolved ? "font-semibold text-success" : "font-semibold"
            }
          >
            {isSolved
              ? "Solved"
              : attemptCount > 0
                ? "Attempted"
                : "Not started"}
          </p>
          <p className="text-xs text-muted-foreground">
            {attemptCount} {attemptCount === 1 ? "submission" : "submissions"}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(34rem,0.95fr)]">
        <article className="min-w-0 rounded-2xl border bg-background p-5 shadow-sm sm:p-7">
          <ProblemGuide
            problem={problem}
            attempted={
              attemptCount > 0 || attemptedThisSession || history.length > 0
            }
          />
        </article>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4">
          <section
            className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            aria-labelledby="editor-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2 id="editor-title" className="font-semibold">
                  Python 3
                </h2>
                <p className="text-xs text-muted-foreground">
                  Implement{" "}
                  <code className="font-mono">{problem.functionName}</code>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCode}
                disabled={busy !== undefined}
              >
                <ArrowCounterClockwise aria-hidden="true" />
                Reset
              </Button>
            </div>
            <CodeMirror
              className="nerdcode-code-editor"
              value={source}
              height="26rem"
              extensions={[PYTHON_EXTENSION, CODE_EDITOR_HIGHLIGHTING]}
              theme="none"
              basicSetup={{
                foldGutter: false,
                highlightActiveLine: true,
                syntaxHighlighting: false,
              }}
              indentWithTab={false}
              aria-label="Python solution editor"
              onChange={setSource}
              onCreateEditor={(view) => {
                view.contentDOM.setAttribute(
                  "aria-label",
                  "Python solution editor",
                );
              }}
            />
            <div className="border-t p-4">
              {authenticated && !authRequired ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={busy !== undefined}
                    onClick={() => {
                      void handleRun();
                    }}
                  >
                    {busy === "run" ? (
                      <SpinnerGap className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Play aria-hidden="true" />
                    )}
                    {busy === "run" ? "Running…" : "Run examples"}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={busy !== undefined || !submissionAvailable}
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    {busy === "submit" ? (
                      <SpinnerGap className="animate-spin" aria-hidden="true" />
                    ) : (
                      <PaperPlaneTilt aria-hidden="true" />
                    )}
                    {busy === "submit" ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in to run examples and submit hidden tests.
                  </p>
                  <Button asChild size="lg">
                    <Link href={signInUrl}>Sign in to continue</Link>
                  </Button>
                </div>
              )}
              <p className="mt-3 text-right text-xs text-muted-foreground">
                {(sourceSize(source) / 1_000).toFixed(1)} / 20 KB
              </p>
              {authenticated && !submissionAvailable ? (
                <p className="mt-2 text-right text-xs text-warning">
                  Local runs still work while submission storage recovers.
                </p>
              ) : null}
            </div>
          </section>

          <section
            className="rounded-2xl border bg-card p-4 shadow-sm"
            aria-labelledby="results-title"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="results-title" className="font-semibold">
                Results
              </h2>
              {busy !== undefined ? (
                <SpinnerGap
                  className="animate-spin text-muted-foreground"
                  aria-label="Working"
                />
              ) : null}
            </div>
            <div aria-live="polite" aria-atomic="true">
              {notice !== undefined ? (
                <p
                  className={cn(
                    "mb-3 rounded-lg px-3 py-2 text-sm",
                    notice.tone === "success" && "bg-success/10 text-success",
                    notice.tone === "error" &&
                      "bg-destructive/10 text-destructive",
                    notice.tone === "neutral" &&
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {notice.message}
                </p>
              ) : null}
            </div>
            {runResults !== undefined ? (
              <RunResults results={runResults} />
            ) : null}
            {submission !== undefined ? (
              <SubmissionDetails submission={submission} />
            ) : null}
            {notice === undefined &&
            runResults === undefined &&
            submission === undefined ? (
              <p className="text-sm text-muted-foreground">
                Run the visible examples, then submit when you are ready.
              </p>
            ) : null}
          </section>

          {history.length > 0 ? (
            <section
              className="rounded-2xl border bg-card p-4 shadow-sm"
              aria-labelledby="history-title"
            >
              <h2 id="history-title" className="mb-3 font-semibold">
                Recent submissions
              </h2>
              <ol className="space-y-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span
                      className={
                        item.status === "accepted"
                          ? "font-medium text-success"
                          : "font-medium"
                      }
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.passedCount}/{item.testCount} ·{" "}
                      {formatDate(item.createdAt)} UTC
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
