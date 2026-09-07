"use client";

import { cn } from "cn";
import {
  JellyBlobMascot,
  type JellyBlobMascotProps,
  type JellyBlobMood,
} from "feral-blob";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import {
  BlobThoughts,
  DEFAULT_BLOB_THOUGHTS,
} from "@/components/blob/blob-thoughts";

export type BlobMood = JellyBlobMood;
export type BlobGaze = NonNullable<JellyBlobMascotProps["gaze"]>;
export type BlobHappyEyes = NonNullable<JellyBlobMascotProps["happyEyes"]>;
export type BlobMouth = NonNullable<JellyBlobMascotProps["mouth"]>;

export interface BlobProps {
  mood?: BlobMood;
  gaze?: BlobGaze;
  nod?: boolean;
  happyEyes?: BlobHappyEyes;
  mouth?: BlobMouth;
  jiggle?: boolean;
  brainstorm?: boolean;
  thoughts?: readonly string[];
  className?: string;
  onOverpoke?: () => void;
}

export function Blob({
  mood = "neutral",
  nod = false,
  jiggle = true,
  brainstorm = false,
  className,
  thoughts,
  gaze,
  happyEyes,
  mouth,
  onOverpoke,
}: BlobProps) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn("blob-theme aspect-[900/720] w-full", className)}
        aria-hidden
      />
    );
  }

  const canJiggle = jiggle && reduceMotion !== true;
  const activeThoughts = thoughts ?? (brainstorm ? DEFAULT_BLOB_THOUGHTS : []);

  return (
    <div className={cn("blob-theme relative w-full", className)}>
      {activeThoughts.length > 0 ? (
        <BlobThoughts thoughts={activeThoughts} />
      ) : null}
      <motion.div
        className="relative z-10 origin-bottom"
        transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.7 }}
        {...(canJiggle
          ? {
              whileHover: { scaleX: 1.05, scaleY: 0.95, y: -6 },
              whileTap: { scaleX: 1.1, scaleY: 0.86, y: 8 },
            }
          : {})}
      >
        <JellyBlobMascot
          className="w-full"
          mood={mood}
          nod={nod}
          {...(gaze === undefined ? {} : { gaze })}
          {...(happyEyes === undefined ? {} : { happyEyes })}
          {...(mouth === undefined ? {} : { mouth })}
          {...(onOverpoke === undefined ? {} : { onOverpoke })}
        />
      </motion.div>
    </div>
  );
}
