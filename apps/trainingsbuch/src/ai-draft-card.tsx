import { Badge } from "@pocket-apps/ui/components/badge";
import { Button } from "@pocket-apps/ui/components/button";
import { Check } from "lucide-react";
import type { AiEntry } from "./ai-entry.ts";
import { formatDay } from "./dates.ts";
import { DIVISION_LABELS, formatKg, formatScore } from "./score.ts";
import { formatLabel, partLine } from "./workouts.ts";

export type AiDraftCardProps = { entry: AiEntry; onSave: () => void };

/** The checked draft of the AI. The user reads it and saves it, or corrects it in the chat. */
export function AiDraftCard({ entry, onSave }: AiDraftCardProps) {
  const { workout, newWorkout, result } = entry;
  return (
    <section
      aria-labelledby="ai-draft-heading"
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ai-draft-heading" className="font-semibold">
          Dein Eintrag
        </h3>
        {newWorkout && <Badge variant="secondary">Neues Workout</Badge>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Workout</dt>
        <dd>
          {workout.name} <span className="text-muted-foreground">· {formatLabel(workout)}</span>
        </dd>
        {newWorkout && (
          <>
            <dt className="text-muted-foreground">Ablauf</dt>
            <dd>
              <ul>
                {newWorkout.rounds !== null && <li>{newWorkout.rounds} Runden:</li>}
                {newWorkout.parts.map((part) => (
                  <li key={part.id}>{partLine(part)}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Datum</dt>
        <dd>{formatDay(result.date)}</dd>
        <dt className="text-muted-foreground">Ergebnis</dt>
        <dd className="font-semibold tabular-nums">
          {formatScore(result.score)}
          {result.division !== null && ` · ${DIVISION_LABELS[result.division]}`}
        </dd>
        {result.loadKg !== null && (
          <>
            <dt className="text-muted-foreground">Gewicht</dt>
            <dd>{formatKg(result.loadKg)}</dd>
          </>
        )}
        {result.notes !== "" && (
          <>
            <dt className="text-muted-foreground">Notizen</dt>
            <dd className="whitespace-pre-line">{result.notes}</dd>
          </>
        )}
      </dl>
      <Button onClick={onSave}>
        <Check data-icon="inline-start" />
        {newWorkout ? "Workout und Ergebnis speichern" : "Ergebnis speichern"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Stimmt etwas nicht? Schreib es unten, dann ändert die KI den Eintrag.
      </p>
    </section>
  );
}
