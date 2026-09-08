import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-mono text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This problem wandered off.
      </h1>
      <p className="text-muted-foreground">
        Head back to the curriculum and choose another real-world challenge.
      </p>
      <Button asChild size="lg">
        <Link href="/">Browse problems</Link>
      </Button>
    </main>
  );
}
