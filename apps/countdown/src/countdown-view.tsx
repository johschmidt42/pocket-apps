import { Button } from "@pocket-apps/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@pocket-apps/ui/components/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { buildEvent, removeEvent, splitEvents, upsertEvent } from "./countdown.ts";
import { EventCard } from "./event-card.tsx";
import { EventDialog, type DialogState } from "./event-dialog.tsx";
import { useDataFile, type CountdownEvent } from "./schema.ts";
import { useNow, type Clock } from "./use-now.ts";

/** All events with their countdowns. Use it only inside `DataFileProvider`. */
export function CountdownView({ clock }: { clock?: Clock }) {
  const { data, update } = useDataFile();
  const now = useNow(clock);
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const { upcoming, past } = splitEvents(data.events, now);

  function card(event: CountdownEvent) {
    return (
      <li key={event.id}>
        <EventCard
          event={event}
          now={now}
          onEdit={() => {
            setDialog({ kind: "edit", event });
          }}
          onRemove={() => {
            if (!window.confirm(`„${event.name}“ löschen?`)) return;
            update((current) => ({ events: removeEvent(current.events, event.id) }));
          }}
        />
      </li>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Deine Termine</h2>
        <Button
          onClick={() => {
            setDialog({ kind: "new" });
          }}
        >
          <Plus data-icon="inline-start" />
          Neuer Termin
        </Button>
      </div>

      {data.events.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Noch keine Termine</h3>
            </CardTitle>
            <CardDescription>
              Trage einen Termin ein, zum Beispiel deine Hochzeit oder das Ende des Schuljahres. Die
              App zählt dann die Zeit bis dahin.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {upcoming.length > 0 && <ul className="flex flex-col gap-4">{upcoming.map(card)}</ul>}

      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="flex flex-col gap-4">
          <h2 id="past-heading" className="text-sm font-medium text-muted-foreground">
            Vorbei
          </h2>
          <ul className="flex flex-col gap-4">{past.map(card)}</ul>
        </section>
      )}

      <EventDialog
        state={dialog}
        onSave={(input) => {
          const existing = dialog.kind === "edit" ? dialog.event : null;
          const event = buildEvent(input, existing, now, crypto.randomUUID());
          update((current) => ({ events: upsertEvent(current.events, event) }));
          setDialog({ kind: "closed" });
        }}
        onClose={() => {
          setDialog({ kind: "closed" });
        }}
      />
    </main>
  );
}
