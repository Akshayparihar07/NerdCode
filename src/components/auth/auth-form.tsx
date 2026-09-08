"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthTab = "sign-in" | "sign-up";

interface AuthFormProps {
  initialTab: AuthTab;
  redirectUrl: string;
}

function isAuthTab(value: string): value is AuthTab {
  return value === "sign-in" || value === "sign-up";
}

export function AuthForm({ initialTab, redirectUrl }: AuthFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (value: string) => {
    if (!isAuthTab(value)) {
      return;
    }

    setTab(value);
    const path = value === "sign-in" ? "/sign-in" : "/sign-up";
    const query =
      redirectUrl === "/"
        ? ""
        : `?redirect_url=${encodeURIComponent(redirectUrl)}`;
    router.replace(`${path}${query}` as Route, { scroll: false });
  };

  const isSignIn = tab === "sign-in";

  return (
    <AuthCard
      title={isSignIn ? "Welcome back" : "Create your account"}
      description={
        isSignIn
          ? "Sign in with Google, Twitter, GitHub, or email."
          : "Sign up with Google, Twitter, GitHub, or email."
      }
    >
      <Tabs value={tab} onValueChange={handleTabChange} className="gap-5">
        <TabsList className="h-10 w-full">
          <TabsTrigger value="sign-in" className="flex-1">
            Sign in
          </TabsTrigger>
          <TabsTrigger value="sign-up" className="flex-1">
            Sign up
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">
          {isSignIn ? <LoginForm redirectUrl={redirectUrl} /> : null}
        </TabsContent>
        <TabsContent value="sign-up">
          {isSignIn ? null : <SignUpForm redirectUrl={redirectUrl} />}
        </TabsContent>
        <div id="clerk-captcha" className="min-h-20" />
      </Tabs>
    </AuthCard>
  );
}
