import { targetOf } from "./countdown.ts";
import type { CountdownEvent } from "./schema.ts";

const day = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const integer = new Intl.NumberFormat("de-DE");

/** "Samstag, 12. Juni 2027, 14:30 Uhr" or, without a time, "Samstag, 12. Juni 2027". */
export function formatWhen(event: Pick<CountdownEvent, "date" | "time">): string {
  const target = targetOf(event);
  return event.time === null
    ? day.format(target)
    : `${day.format(target)}, ${time.format(target)} Uhr`;
}

/** 4812 → "4.812". */
export function formatInteger(value: number): string {
  return integer.format(value);
}

/** "1 Tag" or "3 Tage": the number and the correct word. */
export function plural(count: number, one: string, many: string): string {
  return `${formatInteger(count)} ${count === 1 ? one : many}`;
}
