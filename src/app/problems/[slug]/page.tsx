import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { getProblemBySlug, PROBLEMS } from "@/content/problems";
import { getProblemLearningState, type ProblemLearningState } from "@/lib/db";

type ProblemPageProps = {
  params: Promise<{ slug: string }>;
};

const EMPTY_STATE: ProblemLearningState = {
  latestCode: null,
  attempts: 0,
  solvedAt: null,
  recentSubmissions: [],
};

export function generateStaticParams() {
  return PROBLEMS.map((problem) => ({ slug: problem.slug }));
}

export async function generateMetadata({
  params,
}: ProblemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const problem = getProblemBySlug(slug);

  return problem === undefined
    ? { title: "Problem not found" }
    : {
        title: problem.title,
        description: `${problem.concepts.join(" and ")} through a real-world scenario: ${problem.analogy.scenario}`,
      };
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { slug } = await params;
  const problem = getProblemBySlug(slug);
  if (problem === undefined) {
    notFound();
  }

  const { userId } = await auth();
  let learningState = EMPTY_STATE;
  let stateUnavailable = false;

  if (userId !== null) {
    try {
      learningState = await getProblemLearningState(userId, problem.slug);
    } catch {
      stateUnavailable = true;
    }
  }

  return (
    <>
      {stateUnavailable ? (
        <output className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1568px] rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Your latest submission could not be loaded. The starter code is shown,
          and submitting will stay unavailable until storage recovers.
        </output>
      ) : null}
      <ProblemWorkspace
        problem={problem}
        signedIn={userId !== null}
        submissionAvailable={!stateUnavailable}
        attempts={learningState.attempts}
        solved={learningState.solvedAt !== null}
        recentSubmissions={learningState.recentSubmissions}
        {...(learningState.latestCode === null
          ? {}
          : { latestCode: learningState.latestCode })}
      />
    </>
  );
}
