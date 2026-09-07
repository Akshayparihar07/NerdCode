"use client";

import type { ReactNode } from "react";
import { AuthBlob } from "@/components/auth/auth-blob";
import { AuthCompanionProvider } from "@/components/auth/auth-companion";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <AuthCompanionProvider>
      <div className="flex min-h-svh flex-1 flex-col bg-background lg:flex-row">
        <aside className="relative hidden lg:flex lg:w-2/5 lg:shrink-0 lg:items-center lg:justify-center">
          <div className="pointer-events-none absolute inset-0 bg-muted" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative z-10 w-[min(26rem,86%)]">
            <AuthBlob />
          </div>
        </aside>

        <div className="flex flex-1 items-center justify-center px-4 py-20 lg:w-3/5">
          <div className="flex w-full max-w-sm min-h-[34rem] flex-col">
            <div className="mb-6 min-h-16 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </AuthCompanionProvider>
  );
}
