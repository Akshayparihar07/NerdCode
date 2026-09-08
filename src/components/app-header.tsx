"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/sso-callback"];

export function AppHeader() {
  const pathname = usePathname();
  const isAuthPage = AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isAuthPage) {
    return (
      <header className="absolute top-0 right-0 z-10 p-4">
        <ThemeToggle />
      </header>
    );
  }

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <Link
        href="/"
        className="mr-auto font-mono text-base font-bold tracking-tight text-foreground"
      >
        NerdCode<span className="text-primary">_</span>
      </Link>
      <Show when="signed-out">
        <Link
          href={{ pathname: "/sign-in", query: { redirect_url: pathname } }}
          className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Sign in
        </Link>
        <Link
          href={{ pathname: "/sign-up", query: { redirect_url: pathname } }}
          className="hidden h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/80 sm:inline-flex"
        >
          Sign up
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <ThemeToggle />
    </header>
  );
}
