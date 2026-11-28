import { expect, test } from "vitest";
import { nextScreen, type FlowEvent, type Screen } from "./flow.ts";

const SCREENS: Screen[] = ["title", "playing", "paused", "won", "lost"];
const EVENTS: FlowEvent[] = ["start", "pause", "resume", "quit", "win", "lose", "again"];

/** All changes of the screen. Each other pair of screen and event changes nothing. */
const CHANGES: [Screen, FlowEvent, Screen][] = [
  ["title", "start", "playing"],
  ["playing", "pause", "paused"],
  ["paused", "resume", "playing"],
  ["paused", "quit", "title"],
  ["playing", "win", "won"],
  ["playing", "lose", "lost"],
  ["won", "again", "playing"],
  ["lost", "again", "playing"],
  ["won", "quit", "title"],
  ["lost", "quit", "title"],
];

test.each(CHANGES)("on the screen %s, the event %s gives the screen %s", (screen, event, next) => {
  expect(nextScreen(screen, event)).toBe(next);
});

test("an event that does not fit the screen changes nothing", () => {
  const others = SCREENS.flatMap((screen) =>
    EVENTS.filter((event) => !CHANGES.some(([from, on]) => from === screen && on === event)).map(
      (event) => ({ screen, event }),
    ),
  );
  expect(others).toHaveLength(SCREENS.length * EVENTS.length - CHANGES.length);
  for (const { screen, event } of others) {
    expect(nextScreen(screen, event)).toBe(screen);
  }
});
