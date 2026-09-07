"use client";

import { useSignIn } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/nextjs/types";
import { type FormEvent, useState } from "react";
import { useAuthCompanionField } from "@/components/auth/auth-companion";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clerkErrorMessage,
  firstGlobalErrorMessage,
  goToAppHome,
} from "@/lib/auth";

export function LoginForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string>();
  const isBusy = fetchStatus === "fetching";
  const emailField = useAuthCompanionField("email");
  const passwordField = useAuthCompanionField("password");

  const completeSignIn = async () => {
    if (signIn === null) {
      return;
    }

    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        goToAppHome(decorateUrl("/"));
      },
    });
  };

  const handleSocial = (strategy: OAuthStrategy) => {
    void (async () => {
      if (signIn === null) {
        return;
      }

      setFormError(undefined);
      const { error } = await signIn.sso({
        strategy,
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/",
      });

      if (error) {
        setFormError(clerkErrorMessage(error));
      }
    })();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      if (signIn === null) {
        return;
      }

      setFormError(undefined);
      const { error } = await signIn.password({
        emailAddress: email,
        password,
      });

      if (error) {
        setFormError(clerkErrorMessage(error));
        return;
      }

      if (signIn.status === "complete") {
        await completeSignIn();
        return;
      }

      setFormError("Additional verification is required to finish signing in.");
    })();
  };

  const emailError = clerkErrorMessage(errors.fields.identifier);
  const passwordError = clerkErrorMessage(errors.fields.password);
  const globalError =
    formError ??
    firstGlobalErrorMessage(errors.global) ??
    emailError ??
    passwordError;

  return (
    <div className="space-y-5">
      <SocialButtons
        disabled={isBusy || signIn === null}
        onSelect={handleSocial}
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={isBusy}
            className="h-10"
            aria-invalid={emailError !== undefined}
            onFocus={emailField.onFocus}
            onBlur={emailField.onBlur}
            onChange={(event) => {
              setEmail(event.target.value);
              emailField.onType();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            disabled={isBusy}
            className="h-10"
            aria-invalid={passwordError !== undefined}
            onFocus={passwordField.onFocus}
            onBlur={passwordField.onBlur}
            onChange={(event) => {
              setPassword(event.target.value);
              passwordField.onType();
            }}
          />
        </div>
        {globalError !== undefined ? (
          <p className="text-sm text-destructive" role="alert">
            {globalError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={isBusy}
          className="h-10 w-full"
        >
          {isBusy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
