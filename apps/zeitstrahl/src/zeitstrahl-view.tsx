import { NameDialog, type NameDialogTexts, type NameRequest } from "@pocket-apps/core/name-dialog";
import { isOneOf } from "@pocket-apps/core/one-of";
import { Button } from "@pocket-apps/ui/components/button";
import { Toggle } from "@pocket-apps/ui/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "@pocket-apps/ui/components/toggle-group";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { periodStart } from "./dates.ts";
import { EntryDialog, type EntryDraft, type EntryInput } from "./entry-dialog.tsx";
import { EXAMPLE_ENTRIES } from "./example.ts";
import { SCALES, useDataFile, type Entry, type Scale } from "./schema.ts";
import { TimelineBar } from "./timeline-bar.tsx";
import { TimelineChart } from "./timeline-chart.tsx";
import {
  activeTimeline,
  addTimeline,
  defaultPrecision,
  nextTrunkColor,
  removeEntry,
  removeTimeline,
  renameTimeline,
  selectTimeline,
  setScale,
  toggleEntry,
  upsertEntry,
} from "./timelines.ts";

const TIMELINE_NAME_TEXTS = {
  newTitle: "Neuer Zeitstrahl",
  renameTitle: "Zeitstrahl umbenennen",
  label: "Name des Zeitstrahls",
  placeholder: "z. B. Arzttermine",
} satisfies NameDialogTexts;

const SCALE_LABELS: Record<Scale, string> = {
  real: "Echte Abstände",
  compact: "Lücken kürzen",
};

/** The timelines and their entries. Use it only inside `DataFileProvider`. */
export function ZeitstrahlView({ today }: { today: string }) {
  const { data, update } = useDataFile();
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);
  const [nameRequest, setNameRequest] = useState<NameRequest | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const timeline = activeTimeline(data);
  const todayNumber = periodStart(today);
  const hiddenCount = timeline.entries.filter((entry) => !entry.visible).length;
  const showingHidden = showHidden && hiddenCount > 0;
  const shownCount = showingHidden
    ? timeline.entries.length
    : timeline.entries.length - hiddenCount;
  const hasNoEntries = data.timelines.every((each) => each.entries.length === 0);

  function edit(entry: Entry) {
    setEntryDraft({ kind: "edit", entry });
  }

  function toggle(entry: Entry) {
    update((current) => toggleEntry(current, timeline.id, entry.id));
    // When the last hidden entry comes back, the next hidden entry disappears at once again.
    if (!entry.visible && hiddenCount === 1) setShowHidden(false);
  }

  function changeTrunk() {
    update((current) => nextTrunkColor(current, timeline.id));
  }

  function save(input: EntryInput) {
    const existing = entryDraft?.kind === "edit" ? entryDraft.entry : null;
    const entry: Entry = existing
      ? { ...existing, ...input }
      : { ...input, id: crypto.randomUUID(), visible: true };
    update((current) => upsertEntry(current, timeline.id, entry));
    setEntryDraft(null);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <TimelineBar
        timelines={data.timelines}
        activeId={timeline.id}
        onSelect={(id) => {
          update((current) => selectTimeline(current, id));
        }}
        onNew={() => {
          setNameRequest({ kind: "new" });
        }}
      />

      <section aria-labelledby="timeline-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <h2 id="timeline-heading" className="text-xl font-semibold break-words">
              {timeline.name}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zeitstrahl umbenennen"
              onClick={() => {
                setNameRequest({ kind: "rename", name: timeline.name });
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zeitstrahl löschen"
              disabled={data.timelines.length < 2}
              onClick={() => {
                if (!window.confirm(`Zeitstrahl „${timeline.name}“ mit allen Einträgen löschen?`))
                  return;
                update((current) => removeTimeline(current, timeline.id));
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hiddenCount > 0 && (
              <Toggle
                size="sm"
                variant="outline"
                pressed={showingHidden}
                onPressedChange={setShowHidden}
              >
                <Eye />
                Ausgeblendete zeigen ({hiddenCount})
              </Toggle>
            )}
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              size="sm"
              aria-label="Abstände"
              value={timeline.scale}
              onValueChange={(value) => {
                if (isOneOf(SCALES, value))
                  update((current) => setScale(current, timeline.id, value));
              }}
            >
              {SCALES.map((value) => (
                <ToggleGroupItem key={value} value={value}>
                  {SCALE_LABELS[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button
              size="sm"
              onClick={() => {
                setEntryDraft({ kind: "new", precision: defaultPrecision(timeline.entries) });
              }}
            >
              <Plus data-icon="inline-start" />
              Neuer Eintrag
            </Button>
          </div>
        </div>

        {hasNoEntries ? (
          <>
            <p className="rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Beispiel:</span> So kann ein
              Lebenslauf aussehen. Das Beispiel verschwindet, sobald du mit „Neuer Eintrag“ deinen
              ersten Eintrag hinzufügst.
            </p>
            <TimelineChart
              entries={EXAMPLE_ENTRIES}
              scale={timeline.scale}
              today={todayNumber}
              showHidden={false}
              actions={{ kind: "example" }}
              trunk={timeline.trunk}
              onTrunkClick={changeTrunk}
            />
          </>
        ) : shownCount > 0 ? (
          <TimelineChart
            entries={timeline.entries}
            scale={timeline.scale}
            today={todayNumber}
            showHidden={showingHidden}
            actions={{ kind: "edit", onEdit: edit, onToggle: toggle }}
            trunk={timeline.trunk}
            onTrunkClick={changeTrunk}
          />
        ) : (
          <p className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            {timeline.entries.length === 0
              ? "Noch keine Einträge. Füge einen Zeitpunkt oder einen Zeitraum hinzu, zum Beispiel einen Arzttermin oder ein Studium."
              : "Alle Einträge sind ausgeblendet. Klicke oben auf „Ausgeblendete zeigen“ und dann bei einem Eintrag auf das Auge."}
          </p>
        )}
      </section>

      <EntryDialog
        draft={entryDraft}
        onSave={save}
        onRemove={(entry) => {
          if (!window.confirm(`„${entry.title}“ löschen?`)) return;
          update((current) => removeEntry(current, timeline.id, entry.id));
          setEntryDraft(null);
        }}
        onClose={() => {
          setEntryDraft(null);
        }}
      />
      <NameDialog
        request={nameRequest}
        texts={TIMELINE_NAME_TEXTS}
        onSave={(name) => {
          if (nameRequest?.kind === "rename") {
            update((current) => renameTimeline(current, timeline.id, name));
          } else {
            update((current) => addTimeline(current, name, crypto.randomUUID()));
          }
          setNameRequest(null);
        }}
        onClose={() => {
          setNameRequest(null);
        }}
      />
    </main>
  );
}
