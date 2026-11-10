import type { CountdownEvent } from "./schema.ts";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The fields that the user types in. */
export type EventInput = Pick<CountdownEvent, "name" | "date" | "time">;

/** The moment of the event, in local time. */
export function targetOf(event: Pick<CountdownEvent, "date" | "time">): Date {
  return new Date(`${event.date}T${event.time ?? "00:00"}:00`);
}

/** True if the date and the time give a real moment. A year above 9999 does not. */
export function isValidMoment(event: Pick<CountdownEvent, "date" | "time">): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(event.date) && !Number.isNaN(targetOf(event).getTime());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export type TimeLeft = {
  /** True if the moment is in the past. Then the numbers count the time since the moment. */
  past: boolean;
  /** Calendar days. A day with a change to or from summer time has 23 or 25 hours. */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** All full hours, for example 4812 for 200 days and 12 hours. */
  totalHours: number;
};

/** The time from `now` until `target`, split into calendar days, hours, minutes and seconds. */
export function timeLeft(target: Date, now: Date): TimeLeft {
  const past = target.getTime() < now.getTime();
  const from = past ? target : now;
  const to = past ? now : target;
  let days = Math.floor((to.getTime() - from.getTime()) / DAY);
  // Fixed 24-hour days are wrong across a change of summer time. Correct to calendar days.
  while (addDays(from, days + 1) <= to) days += 1;
  while (days > 0 && addDays(from, days) > to) days -= 1;
  const rest = to.getTime() - addDays(from, days).getTime();
  return {
    past,
    days,
    hours: Math.floor(rest / HOUR),
    minutes: Math.floor((rest % HOUR) / MINUTE),
    seconds: Math.floor((rest % MINUTE) / SECOND),
    totalHours: Math.floor((to.getTime() - from.getTime()) / HOUR),
  };
}

/** The local day of a moment as an ISO date. */
function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

/**
 * "today": an event without a time on the current day. It counts as today for the whole day.
 * "coming" and "past" compare the moment with now.
 */
export type Phase = "coming" | "today" | "past";

export function phaseOf(event: CountdownEvent, now: Date): Phase {
  if (event.time === null && event.date === localDay(now)) return "today";
  return targetOf(event).getTime() >= now.getTime() ? "coming" : "past";
}

/**
 * The part of the waiting time that is over, from 0 to 1.
 * The waiting time starts when the user added the event.
 */
export function waitedPart(event: CountdownEvent, now: Date): number {
  const start = new Date(event.createdAt).getTime();
  const end = targetOf(event).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

/** The coming events and the events of today (nearest first), and the past events (newest first). */
export function splitEvents(
  events: readonly CountdownEvent[],
  now: Date,
): { upcoming: CountdownEvent[]; past: CountdownEvent[] } {
  const moment = (event: CountdownEvent) => targetOf(event).getTime();
  const upcoming = events.filter((event) => phaseOf(event, now) !== "past");
  const past = events.filter((event) => phaseOf(event, now) === "past");
  return {
    upcoming: upcoming.sort((a, b) => moment(a) - moment(b)),
    past: past.sort((a, b) => moment(b) - moment(a)),
  };
}

/** A new event, or the changed event. A change keeps the ID and the time when the user added the event. */
export function buildEvent(
  input: EventInput,
  existing: CountdownEvent | null,
  now: Date,
  id: string,
): CountdownEvent {
  return existing ? { ...existing, ...input } : { id, createdAt: now.toISOString(), ...input };
}

/** Replaces the event with the same ID, or adds it at the end. */
export function upsertEvent(
  events: readonly CountdownEvent[],
  event: CountdownEvent,
): CountdownEvent[] {
  return events.some((entry) => entry.id === event.id)
    ? events.map((entry) => (entry.id === event.id ? event : entry))
    : [...events, event];
}

export function removeEvent(events: readonly CountdownEvent[], id: string): CountdownEvent[] {
  return events.filter((event) => event.id !== id);
}
