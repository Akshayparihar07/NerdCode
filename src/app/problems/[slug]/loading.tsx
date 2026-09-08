export default function ProblemLoading() {
  return (
    <main
      className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
      aria-label="Loading problem"
    >
      <div className="mb-6 space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-9 w-72 max-w-full rounded bg-muted" />
        <div className="h-6 w-44 rounded bg-muted" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-[42rem] rounded-2xl border bg-muted/55" />
        <div className="h-[42rem] rounded-2xl border bg-muted/55" />
      </div>
    </main>
  );
}
