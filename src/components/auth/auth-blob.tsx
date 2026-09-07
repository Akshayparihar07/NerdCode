"use client";

import { useAuthCompanion } from "@/components/auth/auth-companion";
import { Blob } from "@/components/blob";

export function AuthBlob() {
  const { focus, typing } = useAuthCompanion();
  const lookingAtForm =
    focus === "email" || focus === "code" || focus === "name";

  return (
    <Blob
      brainstorm
      mood={focus === "password" ? "password" : "neutral"}
      nod={typing}
      gaze={lookingAtForm ? { x: 22, y: -8 } : { x: 0, y: 0 }}
    />
  );
}
