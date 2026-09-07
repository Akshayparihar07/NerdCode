"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/nextjs/types";
import { useRouter } from "next/navigation";
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

export function SignUpForm() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [formError, setFormError] = useState<string>();
  const isBusy = fetchStatus === "fetching";
  const emailField = useAuthCompanionField("email");
  const passwordField = useAuthCompanionField("password");
  const codeField = useAuthCompanionField("code");

  const completeSignUp = async () => {
    if (signUp === null) {
      return;
    }

    await signUp.finalize({
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
      if (signUp === null) {
        return;
      }

      setFormError(undefined);
      const { error } = await signUp.password({
        emailAddress: email,
        password,
      });

      if (error) {
        setFormError(clerkErrorMessage(error));
        return;
      }

      if (signUp.status === "complete") {
        await completeSignUp();
        return;
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        const { error: sendCodeError } =
          await signUp.verifications.sendEmailCode();
        if (sendCodeError) {
          setFormError(clerkErrorMessage(sendCodeError));
          return;
        }

        setNeedsCode(true);
        return;
      }

      if (signUp.status === "missing_requirements") {
        router.push("/sign-in/continue");
        return;
      }

      setFormError("Additional information is required to finish signing up.");
    })();
  };

  const handleVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      if (signUp === null) {
        return;
      }

      setFormError(undefined);
      const { error } = await signUp.verifications.verifyEmailCode({ code });

      if (error) {
        setFormError(clerkErrorMessage(error));
        return;
      }

      if (signUp.status === "complete") {
        await completeSignUp();
        return;
      }

      if (signUp.status === "missing_requirements") {
        router.push("/sign-in/continue");
        return;
      }

      setFormError("Email verified, but sign-up is not complete yet.");
    })();
  };

  const emailError = clerkErrorMessage(errors.fields.emailAddress);
  const passwordError = clerkErrorMessage(errors.fields.password);
  const codeError = clerkErrorMessage(errors.fields.code);
  const globalError =
    formError ??
    firstGlobalErrorMessage(errors.global) ??
    emailError ??
    passwordError ??
    codeError;

  if (needsCode) {
    return (
      <form className="space-y-4" onSubmit={handleVerify}>
        <p className="text-sm text-muted-foreground">
          Enter the verification code we sent to {email}.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            Verification code
          </label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            disabled={isBusy}
            className="h-10"
            aria-invalid={codeError !== undefined}
            onFocus={codeField.onFocus}
            onBlur={codeField.onBlur}
            onChange={(event) => {
              setCode(event.target.value);
              codeField.onType();
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
          {isBusy ? "Verifying..." : "Verify email"}
        </Button>
      </form>
    );
  }

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
            autoComplete="new-password"
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
          {isBusy ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
}
