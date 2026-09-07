"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export const DEFAULT_BLOB_THOUGHTS = [
  "Big-O",
  "closures",
  "hash map",
  "event loop",
  "CAP theorem",
  "recursion",
  "idempotent",
  "cache miss",
  "SQL join",
  "race condition",
  "backpressure",
  "tail latency",
  "mutex",
  "bloom filter",
  "CRDTs",
  "WebSockets",
] as const;

const SLOTS = [
  { id: "tl", className: "absolute top-[4%] left-[-6%] -rotate-8" },
  { id: "tr", className: "absolute top-[8%] right-[-8%] rotate-6" },
  { id: "ml", className: "absolute top-[40%] left-[-14%] -rotate-4" },
  { id: "mr", className: "absolute top-[36%] right-[-12%] rotate-8" },
] as const;

interface BlobThoughtsProps {
  thoughts: readonly string[];
}

function nextUnusedIndex(
  current: readonly number[],
  slot: number,
  length: number,
): number {
  const used = new Set(current);
  const index = (current[slot] ?? 0) + 1;

  for (let step = 0; step < length; step += 1) {
    const candidate = (index + step) % length;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return index % length;
}

export function BlobThoughts({ thoughts }: BlobThoughtsProps) {
  const reduceMotion = useReducedMotion();
  const slotCount = Math.min(SLOTS.length, thoughts.length);
  const [active, setActive] = useState(() =>
    Array.from({ length: slotCount }, (_, index) => index % thoughts.length),
  );

  useEffect(() => {
    if (reduceMotion === true || thoughts.length <= slotCount) {
      return;
    }

    let slot = 0;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = [...current];
        const currentSlot = next[slot];
        if (currentSlot !== undefined) {
          next[slot] = nextUnusedIndex(next, slot, thoughts.length);
        }
        return next;
      });
      slot = (slot + 1) % slotCount;
    }, 2200);

    return () => {
      window.clearInterval(timer);
    };
  }, [reduceMotion, slotCount, thoughts.length]);

  if (thoughts.length === 0 || slotCount === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      <span className="absolute top-[22%] left-[30%] size-1.5 rounded-full border border-border bg-background" />
      <span className="absolute top-[26%] left-[34%] size-2.5 rounded-full border border-border bg-background" />
      <span className="absolute top-[24%] right-[28%] size-1.5 rounded-full border border-border bg-background" />
      <span className="absolute top-[28%] right-[32%] size-2 rounded-full border border-border bg-background" />

      {SLOTS.slice(0, slotCount).map((slot, index) => {
        const thoughtIndex = active[index] ?? index;
        const thought = thoughts[thoughtIndex] ?? thoughts[0];

        if (thought === undefined) {
          return null;
        }

        return (
          <div key={slot.id} className={slot.className}>
            <motion.div
              className="origin-center"
              {...(reduceMotion === true
                ? {}
                : {
                    animate: { y: [0, -5, 0] },
                    transition: {
                      duration: 3.1 + index * 0.35,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut" as const,
                    },
                  })}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={thought}
                  className="max-w-36 rounded-2xl border border-border bg-background/90 px-2.5 py-1.5 text-center text-xs font-medium tracking-tight text-foreground shadow-sm backdrop-blur-sm"
                  {...(reduceMotion === true
                    ? { animate: { opacity: 1, scale: 1, y: 0 } }
                    : {
                        initial: { opacity: 0, scale: 0.72, y: 10 },
                        animate: { opacity: 1, scale: 1, y: 0 },
                        exit: { opacity: 0, scale: 0.84, y: -8 },
                        transition: {
                          type: "spring" as const,
                          stiffness: 380,
                          damping: 22,
                        },
                      })}
                >
                  {thought}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
