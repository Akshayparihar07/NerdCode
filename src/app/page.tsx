import { auth } from "@clerk/nextjs/server";
import type { Route } from "next";
import Link from "next/link";

import { Blob } from "@/components/blob";
import { Button } from "@/components/ui/button";
import { PROBLEMS } from "@/content/problems";
import { getProgressForUser, type ProblemProgressSummary } from "@/lib/db";
import { cn } from "@/lib/utils";

type CatalogStatus = "attempted" | "not-started" | "solved" | "unavailable";

const STATUS_LABELS: Record<CatalogStatus, string> = {
  attempted: "Attempted",
  "not-started": "Not started",
  solved: "Solved",
  unavailable: "Unavailable",
};

function problemHref(slug: (typeof PROBLEMS)[number]["slug"]): Route {
  return `/problems/${slug}` as Route;
}

function problemStatus(
  progress: ProblemProgressSummary | undefined,
  unavailable: boolean,
): CatalogStatus {
  if (unavailable) {
    return "unavailable";
  }
  if (progress?.solvedAt !== null && progress?.solvedAt !== undefined) {
    return "solved";
  }
  return (progress?.attempts ?? 0) > 0 ? "attempted" : "not-started";
}

export default async function Home() {
  const { userId } = await auth();
  let progress: Record<string, ProblemProgressSummary> = {};
  let progressUnavailable = false;

  if (userId !== null) {
    try {
      progress = await getProgressForUser(userId);
    } catch {
      progressUnavailable = true;
    }
  }

  const solvedCount = Object.values(progress).filter(
    (item) => item.solvedAt !== null,
  ).length;
  const continueProblem =
    PROBLEMS.find((problem) => {
      const item = progress[problem.slug];
      return (item?.attempts ?? 0) > 0 && item?.solvedAt === null;
    }) ??
    PROBLEMS.find((problem) => {
      const solvedAt = progress[problem.slug]?.solvedAt;
      return solvedAt === null || solvedAt === undefined;
    });

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:py-24">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Learn the why, then write the code
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              DSA finally has a point.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Solve focused Python problems while seeing the production systems,
              ML workflows, and everyday software patterns each idea powers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <a href="#curriculum">Browse the curriculum</a>
              </Button>
              {userId === null ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 px-5"
                >
                  <Link href="/sign-in?redirect_url=%2F">
                    Sign in to save progress
                  </Link>
                </Button>
              ) : continueProblem !== undefined ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 px-5"
                >
                  <Link href={problemHref(continueProblem.slug)}>
                    {solvedCount === 0 ? "Start learning" : "Continue learning"}
                  </Link>
                </Button>
              ) : null}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>12 original lessons</span>
              <span>Python 3 in your browser</span>
              <span>All problems unlocked</span>
            </div>
          </div>
          <div
            className="mx-auto hidden w-full max-w-64 lg:block"
            aria-hidden="true"
          >
            <Blob mood="happy" nod jiggle={false} />
          </div>
        </div>
      </section>

      <section
        id="curriculum"
        className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-14 sm:px-8 sm:py-18"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              The learning path
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build intuition across 12 problems
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Follow the sequence or jump anywhere. Every lesson starts with a
              concrete system before introducing the algorithm behind it.
            </p>
          </div>
          {userId !== null && !progressUnavailable ? (
            <p className="rounded-full border bg-card px-4 py-2 text-sm font-medium">
              <span className="text-primary">{solvedCount}</span> /{" "}
              {PROBLEMS.length} solved
            </p>
          ) : null}
        </div>

        {progressUnavailable ? (
          <output className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Your saved progress is temporarily unavailable. You can still read
            every lesson.
          </output>
        ) : null}

        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {PROBLEMS.map((problem) => {
            const status = problemStatus(
              progress[problem.slug],
              progressUnavailable,
            );

            return (
              <li key={problem.slug}>
                <Link
                  href={problemHref(problem.slug)}
                  className="group flex h-full gap-4 rounded-2xl border bg-card/55 p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="mt-0.5 font-mono text-sm font-semibold text-muted-foreground">
                    {String(problem.order).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-lg font-semibold group-hover:text-primary">
                        {problem.title}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold",
                          status === "solved" && "bg-success/10 text-success",
                          status === "attempted" &&
                            "bg-warning/10 text-warning",
                          status === "not-started" &&
                            "bg-muted text-muted-foreground",
                          status === "unavailable" &&
                            "bg-destructive/10 text-destructive",
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-xs font-medium text-primary">
                      {problem.concepts.join(" + ")}
                    </span>
                    <span className="mt-3 block text-sm leading-6 text-muted-foreground">
                      {problem.analogy.scenario}
                    </span>
                    <span className="mt-4 block text-sm font-semibold text-foreground/80 group-hover:text-primary">
                      Open lesson →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
