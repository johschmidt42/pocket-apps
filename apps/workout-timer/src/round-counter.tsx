import { Button } from "@pocket-apps/ui/components/button";
import { Minus, Plus } from "lucide-react";

/** The rounds that the user counts in For Time and AMRAP: a large "+" and a small "−". */
export function RoundCounter({
  rounds,
  onCountRound,
}: {
  rounds: number;
  onCountRound: (change: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <Button
        type="button"
        variant="outline"
        className="size-12 rounded-full"
        aria-label="Eine Runde zurück"
        disabled={rounds === 0}
        onClick={() => {
          onCountRound(-1);
        }}
      >
        <Minus aria-hidden="true" />
      </Button>
      <p role="status" className="flex min-w-20 flex-col items-center">
        <span className="text-4xl font-bold tabular-nums">{rounds}</span>
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Runden
        </span>
      </p>
      <Button
        type="button"
        variant="outline"
        className="size-16 rounded-full border-2"
        aria-label="Runde zählen"
        onClick={() => {
          onCountRound(1);
        }}
      >
        <Plus aria-hidden="true" className="size-7" />
      </Button>
    </div>
  );
}
