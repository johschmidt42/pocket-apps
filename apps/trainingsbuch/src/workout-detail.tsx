import { Badge } from "@pocket-apps/ui/components/badge";
import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { ArrowLeft, Pencil, Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import { formatDay, formatShortDay } from "./dates.ts";
import { DivisionBadge } from "./division-badge.tsx";
import { ExerciseSection } from "./exercise-section.tsx";
import { PlanView } from "./plan-view.tsx";
import { ProgressChart } from "./progress-chart.tsx";
import { LOADS_FOR, UNIT_SYSTEMS, type Result } from "./schema.ts";
import { bestResult, DIVISION_LABELS, formatKg, formatScore } from "./score.ts";
import { hasLoadInBothUnits, hasMenWomen, showLine, type TextDisplay } from "./units.ts";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatLabel, type Workout } from "./workouts.ts";

export type WorkoutDetailProps = {
  workout: Workout;
  /** The results of this workout, newest first. */
  results: readonly Result[];
  /** How the texts of the built-in workouts show loads, heights and distances. */
  display: TextDisplay;
  onDisplay: (display: TextDisplay) => void;
  onBack: () => void;
  onAddResult: () => void;
  /** Opens "Mit KI eintragen" for this workout. */
  onAddWithAi: () => void;
  onEditResult: (result: Result) => void;
  onRemoveResult: (result: Result) => void;
  /** Only for own workouts: change or remove the workout. */
  ownActions: { onEdit: () => void; onRemove: () => void } | null;
};

/** One workout: its prescription, its exercises, the best result and all results. */
export function WorkoutDetail({
  workout,
  results,
  display,
  onDisplay,
  onBack,
  onAddResult,
  onAddWithAi,
  onEditResult,
  onRemoveResult,
  ownActions,
}: WorkoutDetailProps) {
  const best = bestResult(results);
  const colors = CATEGORY_COLORS[workout.category];
  const builtIn = workout.category !== "own";
  const withWomen = workout.lines.some(hasMenWomen);
  // The choice between kg and lb is for loads. Without it, a distance stays in meters.
  const withLoads = builtIn && workout.lines.some(hasLoadInBothUnits);
  const lineDisplay: TextDisplay = withLoads ? display : { ...display, units: "metric" };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Alle Workouts
        </Button>
        {ownActions && (
          <div className="flex gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${workout.name} bearbeiten`}
              onClick={ownActions.onEdit}
            >
              <Pencil />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`${workout.name} löschen`}
              onClick={ownActions.onRemove}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      <header className={`flex flex-col gap-6 rounded-3xl p-6 sm:p-8 ${colors.tint}`}>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${colors.bg}`} />
            {CATEGORY_LABELS[workout.category]} · {formatLabel(workout)}
          </p>
          <h2 className="text-4xl leading-none font-black tracking-tight break-words uppercase sm:text-6xl">
            {workout.name}
          </h2>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <aside aria-label="Dein Bestwert" className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <Trophy aria-hidden="true" className="size-3.5" />
              Bestwert
            </p>
            {best ? (
              <>
                <p className="text-5xl leading-none font-black tracking-tight tabular-nums">
                  {formatScore(best.score)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[
                    best.division === null ? null : DIVISION_LABELS[best.division],
                    formatShortDay(best.date),
                    results.length === 1 ? "1 Versuch" : `${String(results.length)} Versuche`,
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold">Noch kein Ergebnis</p>
            )}
          </aside>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={onAddResult}>
              <Plus data-icon="inline-start" />
              Ergebnis eintragen
            </Button>
            <Button size="lg" variant="outline" onClick={onAddWithAi}>
              <Sparkles data-icon="inline-start" />
              Mit KI
            </Button>
          </div>
        </div>
      </header>

      <section aria-labelledby="plan-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="plan-heading"
            className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          >
            Ablauf
          </h3>
          {/* Each choice shows only when it changes the text of this workout. */}
          {(withWomen || withLoads) && (
            <div className="flex flex-wrap justify-end gap-2">
              {withWomen && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-label="Gewichte für"
                  value={display.loadsFor}
                  onValueChange={(value) => {
                    if (isOneOf(LOADS_FOR, value)) onDisplay({ ...display, loadsFor: value });
                  }}
                >
                  <ToggleGroupItem value="men" className="px-3">
                    Männer
                  </ToggleGroupItem>
                  <ToggleGroupItem value="women" className="px-3">
                    Frauen
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
              {withLoads && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-label="Einheiten"
                  value={display.units}
                  onValueChange={(value) => {
                    if (isOneOf(UNIT_SYSTEMS, value)) onDisplay({ ...display, units: value });
                  }}
                >
                  <ToggleGroupItem value="metric" className="px-3">
                    kg
                  </ToggleGroupItem>
                  <ToggleGroupItem value="imperial" className="px-3">
                    lb
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>
          )}
        </div>
        <div className={`border-l-4 pl-5 ${colors.border}`}>
          {workout.lines.length > 0 || (workout.notes ?? []).length > 0 ? (
            <PlanView
              lines={workout.lines.map((line) => showLine(line, lineDisplay))}
              notes={workout.notes ?? []}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Kein Ablauf eingetragen.</p>
          )}
        </div>
        {workout.exercises.length > 0 && (
          <ExerciseSection exercises={workout.exercises} lines={workout.lines} />
        )}
      </section>

      {results.length > 1 && (
        <section aria-labelledby="progress-heading" className="flex flex-col gap-2">
          <h3
            id="progress-heading"
            className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          >
            Fortschritt
          </h3>
          <ProgressChart results={results} color={colors.chart} />
        </section>
      )}

      <section aria-labelledby="results-heading" className="flex flex-col gap-2">
        <h3
          id="results-heading"
          className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Deine Ergebnisse
        </h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch kein Ergebnis. Trage dein erstes Ergebnis ein.
          </p>
        ) : (
          <ol className="flex flex-col divide-y">
            {results.map((result) => (
              <li key={result.id} className="flex items-start gap-3 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-bold tabular-nums">
                      {formatScore(result.score)}
                    </span>
                    <DivisionBadge division={result.division} />
                    {result.id === best?.id && results.length > 1 && (
                      <Badge variant="outline">
                        <Trophy data-icon="inline-start" />
                        Bestwert
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDay(result.date)}
                    {result.loadKg !== null && ` · mit ${formatKg(result.loadKg)}`}
                  </p>
                  {result.notes !== "" && (
                    <p className="text-sm whitespace-pre-line">{result.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Ergebnis vom ${formatDay(result.date)} bearbeiten`}
                    onClick={() => {
                      onEditResult(result);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Ergebnis vom ${formatDay(result.date)} löschen`}
                    onClick={() => {
                      onRemoveResult(result);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
