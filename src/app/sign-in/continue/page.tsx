"use client";

import { useSignUp } from "@clerk/nextjs";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { useAuthCompanionField } from "@/components/auth/auth-companion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clerkErrorMessage,
  firstGlobalErrorMessage,
  safeRedirectPath,
} from "@/lib/auth";

export default function ContinueSignUpPage() {
  return (
    <AuthCard
      title="Almost there"
      description="Add a couple of details to finish creating your account."
    >
      <ContinueForm />
    </AuthCard>
  );
}

function ContinueForm() {
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState<string>();
  const isBusy = fetchStatus === "fetching";
  const nameField = useAuthCompanionField("name");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      if (signUp === null) {
        return;
      }

      setFormError(undefined);
      const { error } = await signUp.update({ firstName, lastName });

      if (error) {
        setFormError(clerkErrorMessage(error));
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => {
            const redirectUrl = safeRedirectPath(
              new URLSearchParams(window.location.search).get("redirect_url"),
            );
            router.push(redirectUrl as Route);
          },
        });
        return;
      }

      setFormError("More information is still required to finish signing up.");
    })();
  };

  const globalError = formError ?? firstGlobalErrorMessage(errors.global);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label
          htmlFor="firstName"
          className="text-sm font-medium text-foreground"
        >
          First name
        </label>
        <Input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          disabled={isBusy}
          className="h-10"
          onFocus={nameField.onFocus}
          onBlur={nameField.onBlur}
          onChange={(event) => {
            setFirstName(event.target.value);
            nameField.onType();
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="lastName"
          className="text-sm font-medium text-foreground"
        >
          Last name
        </label>
        <Input
          id="lastName"
          name="lastName"
          autoComplete="family-name"
          required
          value={lastName}
          disabled={isBusy}
          className="h-10"
          onFocus={nameField.onFocus}
          onBlur={nameField.onBlur}
          onChange={(event) => {
            setLastName(event.target.value);
            nameField.onType();
          }}
        />
      </div>
      {globalError !== undefined ? (
        <p className="text-sm text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={isBusy} className="h-10 w-full">
        {isBusy ? "Saving..." : "Continue"}
      </Button>
      <div id="clerk-captcha" />
    </form>
  );
}
