import type { RingPhase } from "./progress-ring.tsx";

/** More rounds do not fit as dots. The text "Runde x von y" is always there. */
export const MAX_DOTS = 20;

const CURRENT: Record<RingPhase, string> = {
  "lead-in": "size-2.5 rounded-full bg-chart-1",
  work: "size-2.5 rounded-full bg-chart-3",
  rest: "size-2.5 rounded-full bg-chart-2",
  paused: "size-2.5 rounded-full bg-muted-foreground",
};

/**
 * One dot per round of EMOM or Tabata: full for a complete round, in the phase color for the
 * round that runs, faint for the rounds to come. Only for the eye: screen readers get the text.
 */
export function RoundDots({
  rounds,
  completed,
  current,
  phase,
}: {
  rounds: number;
  completed: number;
  /** The round that runs, or `null` (lead-in, or after the work of a Tabata round). */
  current: number | null;
  phase: RingPhase;
}) {
  const numbers = Array.from({ length: rounds }, (_, offset) => offset + 1);
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-1.5">
      {numbers.map((round) => (
        <span
          key={round}
          className={
            round === current
              ? CURRENT[phase]
              : round <= completed
                ? "size-2 rounded-full bg-foreground"
                : "size-2 rounded-full bg-foreground/15"
          }
        />
      ))}
    </div>
  );
}
