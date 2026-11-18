import type { AskAi } from "@pocket-apps/core/ai";
import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pocket-apps/ui/components/tabs";
import { Plus, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AiEntryDialog, type AiEntryState } from "./ai-entry-dialog.tsx";
import { NO_EXERCISE_FILTER, type ExerciseFilter } from "./exercise-filter.ts";
import { HistoryList } from "./history-list.tsx";
import { ResultDialog, type ResultDraft } from "./result-dialog.tsx";
import { useDataFile } from "./schema.ts";
import { WorkoutDetail } from "./workout-detail.tsx";
import { WorkoutDialog, type WorkoutDialogState } from "./workout-dialog.tsx";
import { WorkoutList } from "./workout-list.tsx";
import {
  allWorkouts,
  type Filter,
  type StatusFilter,
  newestFirst,
  removeQuestion,
  removeResult,
  removeWorkout,
  resultsOf,
  upsertResult,
  upsertWorkout,
} from "./workouts.ts";

const TABS = ["workouts", "history"] as const;
type Tab = (typeof TABS)[number];

export type LogbookViewProps = {
  /** Only for tests: a fake for the requests to the AI. */
  ask?: AskAi | undefined;
};

/** The whole app: the workout list, the history and one open workout. */
export function LogbookView({ ask }: LogbookViewProps) {
  const { data, update } = useDataFile();
  const [openId, setOpenId] = useState<string | null>(null);
  // Where the list was scrolled to before a workout opened. "Back" returns there.
  const listScroll = useRef(0);

  /** Shows a workout from its top. The page keeps the scroll position of the list. */
  function openWorkout(id: string) {
    if (openId === null) listScroll.current = document.documentElement.scrollTop;
    flushSync(() => {
      setOpenId(id);
    });
    document.documentElement.scrollTop = 0;
  }

  /** Shows the list again, at the place where the user left it. */
  function closeWorkout() {
    flushSync(() => {
      setOpenId(null);
    });
    document.documentElement.scrollTop = listScroll.current;
  }
  const [tab, setTab] = useState<Tab>("workouts");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [exercises, setExercises] = useState<ExerciseFilter>(NO_EXERCISE_FILTER);
  const [resultDraft, setResultDraft] = useState<ResultDraft | null>(null);
  const [workoutDialog, setWorkoutDialog] = useState<WorkoutDialogState>({ kind: "closed" });
  const [aiEntry, setAiEntry] = useState<AiEntryState>(null);

  const workouts = allWorkouts(data);
  const open = workouts.find((workout) => workout.id === openId) ?? null;
  const ownOpen = data.workouts.find((workout) => workout.id === openId) ?? null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      {open ? (
        <WorkoutDetail
          workout={open}
          results={resultsOf(data, open.id)}
          units={data.units}
          onUnits={(units) => {
            update((current) => ({ ...current, units }));
          }}
          onBack={closeWorkout}
          onAddResult={() => {
            setResultDraft({ workout: open, result: null });
          }}
          onAddWithAi={() => {
            setAiEntry({ focus: open });
          }}
          onEditResult={(result) => {
            setResultDraft({ workout: open, result });
          }}
          onRemoveResult={(result) => {
            if (!window.confirm("Dieses Ergebnis löschen?")) return;
            update((current) => removeResult(current, result.id));
          }}
          ownActions={
            ownOpen && {
              onEdit: () => {
                const resultCount = resultsOf(data, ownOpen.id).length;
                setWorkoutDialog({ kind: "edit", workout: ownOpen, resultCount });
              },
              onRemove: () => {
                const question = removeQuestion(ownOpen.name, resultsOf(data, ownOpen.id).length);
                if (!window.confirm(question)) return;
                update((current) => removeWorkout(current, ownOpen.id));
                closeWorkout();
              },
            }
          }
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isOneOf(TABS, value)) setTab(value);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
              <TabsTrigger value="history">Verlauf</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setWorkoutDialog({ kind: "new" });
                }}
              >
                <Plus data-icon="inline-start" />
                Eigenes Workout
              </Button>
              <Button
                onClick={() => {
                  setAiEntry({ focus: null });
                }}
              >
                <Sparkles data-icon="inline-start" />
                Mit KI eintragen
              </Button>
            </div>
          </div>

          <TabsContent value="workouts" className="flex flex-col gap-4">
            <h2 className="sr-only">Workouts</h2>
            <WorkoutList
              workouts={workouts}
              results={data.results}
              units={data.units}
              search={search}
              onSearch={setSearch}
              filter={filter}
              onFilter={setFilter}
              status={status}
              onStatus={setStatus}
              exercises={exercises}
              onExercises={setExercises}
              onOpen={openWorkout}
            />
          </TabsContent>

          <TabsContent value="history" className="flex flex-col gap-4">
            <h2 className="sr-only">Verlauf</h2>
            <HistoryList
              results={newestFirst(data.results)}
              workouts={workouts}
              onOpen={openWorkout}
            />
          </TabsContent>
        </Tabs>
      )}

      <ResultDialog
        draft={resultDraft}
        onSave={(result) => {
          update((current) => upsertResult(current, result));
          setResultDraft(null);
        }}
        onClose={() => {
          setResultDraft(null);
        }}
      />

      <AiEntryDialog
        state={aiEntry}
        ask={ask}
        onSave={({ newWorkout, result }) => {
          update((current) =>
            upsertResult(newWorkout ? upsertWorkout(current, newWorkout) : current, result),
          );
          setAiEntry(null);
          openWorkout(result.workoutId);
        }}
        onClose={() => {
          setAiEntry(null);
        }}
      />

      <WorkoutDialog
        state={workoutDialog}
        takenNames={workouts
          .filter(
            (workout) => workoutDialog.kind !== "edit" || workout.id !== workoutDialog.workout.id,
          )
          .map((workout) => workout.name)}
        onSave={(workout) => {
          update((current) => upsertWorkout(current, workout));
          setWorkoutDialog({ kind: "closed" });
          openWorkout(workout.id);
        }}
        onClose={() => {
          setWorkoutDialog({ kind: "closed" });
        }}
      />
    </main>
  );
}
