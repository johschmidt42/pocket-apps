import { Button } from "@pocket-apps/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pocket-apps/ui/components/dialog";
import { Input } from "@pocket-apps/ui/components/input";
import { Label } from "@pocket-apps/ui/components/label";
import { useState } from "react";
import { isValidMoment, type EventInput } from "./countdown.ts";
import type { CountdownEvent } from "./schema.ts";

/** What the dialog does. */
export type DialogState =
  { kind: "closed" } | { kind: "new" } | { kind: "edit"; event: CountdownEvent };

export type EventDialogProps = {
  state: DialogState;
  onSave: (input: EventInput) => void;
  onClose: () => void;
};

/** Adds or changes an event. */
export function EventDialog({ state, onSave, onClose }: EventDialogProps) {
  return (
    <Dialog
      open={state.kind !== "closed"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        {state.kind !== "closed" && (
          <EventForm
            key={state.kind === "edit" ? state.event.id : "new"}
            event={state.kind === "edit" ? state.event : null}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  event,
  onSave,
}: {
  event: CountdownEvent | null;
  onSave: (input: EventInput) => void;
}) {
  const [name, setName] = useState(event?.name ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [time, setTime] = useState(event?.time ?? "");
  const timeOrNull = time === "" ? null : time;
  const valid = name.trim() !== "" && isValidMoment({ date, time: timeOrNull });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        if (valid) onSave({ name: name.trim(), date, time: timeOrNull });
      }}
    >
      <DialogHeader>
        <DialogTitle>{event ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
        <DialogDescription>
          Zum Beispiel eine Hochzeit, ein Urlaub oder das Ende des Schuljahres.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="event-name">Name</Label>
        <Input
          id="event-name"
          value={name}
          placeholder="z. B. Hochzeit"
          onChange={(changeEvent) => {
            setName(changeEvent.target.value);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-date">Datum</Label>
          <Input
            id="event-date"
            type="date"
            max="9999-12-31"
            value={date}
            onChange={(changeEvent) => {
              setDate(changeEvent.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-time">Uhrzeit (optional)</Label>
          <Input
            id="event-time"
            type="time"
            value={time}
            onChange={(changeEvent) => {
              setTime(changeEvent.target.value);
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ohne Uhrzeit zählt die App bis 0:00 Uhr an diesem Tag.
      </p>
      <DialogFooter>
        <Button type="submit" disabled={!valid}>
          Speichern
        </Button>
      </DialogFooter>
    </form>
  );
}
