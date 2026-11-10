import { Button } from "@pocket-apps/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pocket-apps/ui/components/card";
import { Progress } from "@pocket-apps/ui/components/progress";
import { PartyPopper, Pencil, Trash2 } from "lucide-react";
import { phaseOf, targetOf, timeLeft, waitedPart } from "./countdown.ts";
import { formatInteger, formatWhen, plural } from "./format.ts";
import type { CountdownEvent } from "./schema.ts";

const twoDigits = (value: number) => String(value).padStart(2, "0");

export type EventCardProps = {
  event: CountdownEvent;
  now: Date;
  onEdit: () => void;
  onRemove: () => void;
};

/** One event with its countdown. A past event shows the time since the event. */
export function EventCard({ event, now, onEdit, onRemove }: EventCardProps) {
  const left = timeLeft(targetOf(event), now);
  const phase = phaseOf(event, now);
  const parts = [
    // Days can have many digits. The other parts always have 2 digits, like a clock.
    {
      unit: "days",
      count: left.days,
      shown: formatInteger(left.days),
      short: null,
      one: "Tag",
      many: "Tage",
    },
    {
      unit: "hours",
      count: left.hours,
      shown: twoDigits(left.hours),
      short: "Std.",
      one: "Stunde",
      many: "Stunden",
    },
    {
      unit: "minutes",
      count: left.minutes,
      shown: twoDigits(left.minutes),
      short: "Min.",
      one: "Minute",
      many: "Minuten",
    },
    {
      unit: "seconds",
      count: left.seconds,
      shown: twoDigits(left.seconds),
      short: "Sek.",
      one: "Sekunde",
      many: "Sekunden",
    },
  ];
  const spoken = parts.map((part) => plural(part.count, part.one, part.many)).join(", ");
  // Round down: the bar shows 100 % only when the moment is there.
  const percentDone = Math.floor(waitedPart(event, now) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="wrap-anywhere">{event.name}</h3>
        </CardTitle>
        <CardDescription>{formatWhen(event)}</CardDescription>
        <CardAction className="flex">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${event.name} bearbeiten`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${event.name} löschen`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {phase === "today" ? (
          <p className="flex items-center gap-2 text-lg font-semibold">
            <PartyPopper aria-hidden="true" className="size-5" />
            Heute ist es so weit!
          </p>
        ) : phase === "past" ? (
          <p className="text-sm text-muted-foreground">
            {left.days === 0 && left.hours === 0
              ? "Gerade eben vorbei."
              : `Vorbei seit ${plural(left.days, "Tag", "Tagen")} und ${plural(left.hours, "Stunde", "Stunden")}.`}
          </p>
        ) : (
          <>
            {/* A timer does not announce each second. Screen readers read the label on request. */}
            <div role="timer" aria-label={`Noch ${spoken}`} className="grid grid-cols-4 gap-2">
              {parts.map((part) => (
                <div
                  key={part.unit}
                  aria-hidden="true"
                  className="flex flex-col items-center rounded-2xl bg-muted px-1 py-3"
                >
                  <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
                    {part.shown}
                  </span>
                  {/* Narrow windows have no room for "Sekunden". They show "Sek.". */}
                  <span className="text-xs text-muted-foreground">
                    {part.short && <span className="sm:hidden">{part.short}</span>}
                    <span className={part.short ? "hidden sm:inline" : undefined}>
                      {part.count === 1 ? part.one : part.many}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Insgesamt noch {plural(left.totalHours, "Stunde", "Stunden")}.
            </p>
            <div className="flex flex-col gap-1.5">
              <Progress value={percentDone} aria-label={`Wartezeit bis ${event.name}`} />
              <p className="text-xs text-muted-foreground">
                {percentDone} % der Wartezeit seit dem Eintragen geschafft
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
