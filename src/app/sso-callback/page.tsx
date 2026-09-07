"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { goToAppHome } from "@/lib/auth";

export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    const finish = async () => {
      if (
        !clerk.loaded ||
        hasRun.current ||
        signIn === null ||
        signUp === null
      ) {
        return;
      }

      hasRun.current = true;

      const goHome = async () => {
        goToAppHome();
      };

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: goHome,
        });
        return;
      }

      if (signUp.isTransferable) {
        await signIn.create({ transfer: true });
        if (signIn.createdSessionId !== null) {
          await signIn.finalize({
            navigate: goHome,
          });
          return;
        }

        router.push("/sign-in");
        return;
      }

      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if (signUp.createdSessionId !== null) {
          await signUp.finalize({
            navigate: goHome,
          });
          return;
        }

        router.push("/sign-in/continue");
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: goHome,
        });
        return;
      }

      const existingSessionId =
        signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId;
      if (existingSessionId !== undefined) {
        await clerk.setActive({
          session: existingSessionId,
          navigate: goHome,
        });
        return;
      }

      router.push("/sign-in");
    };

    void finish();
  }, [clerk, router, signIn, signUp]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Finishing sign in...</p>
      <div id="clerk-captcha" />
    </div>
  );
}
