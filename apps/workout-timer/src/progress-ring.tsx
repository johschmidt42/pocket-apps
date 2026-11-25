import type { ReactNode } from "react";

/** The phase that gives the ring its color. */
export type RingPhase = "lead-in" | "work" | "rest" | "paused";

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** One fixed color per phase: blue lead-in, green work, orange rest, gray pause. */
const STROKES: Record<RingPhase, string> = {
  "lead-in": "var(--chart-1)",
  work: "var(--chart-3)",
  rest: "var(--chart-2)",
  paused: "var(--muted-foreground)",
};

/** A round progress bar with content in its middle. `fraction` goes from 0 to 1. */
export function ProgressRing({
  fraction,
  phase,
  children,
}: {
  fraction: number;
  phase: RingPhase;
  children: ReactNode;
}) {
  const filled = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-80">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={STROKES[phase]}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
        {children}
      </div>
    </div>
  );
}
