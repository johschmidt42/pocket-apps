/** The screen that the game shows. The sim runs only in "playing". */
export type Screen = "title" | "playing" | "paused" | "won" | "lost";

/**
 * What can change the screen.
 * - "start": the button of the title. "again": the button after a game. Both start a new game.
 * - "pause", "resume": the Esc key and the button of the pause.
 * - "quit": back to the title, from the pause or after a game.
 * - "win", "lose": the game is over.
 */
export type FlowEvent = "start" | "pause" | "resume" | "quit" | "win" | "lose" | "again";

/** The next screen after an event. An event that does not fit the screen changes nothing. */
export function nextScreen(screen: Screen, event: FlowEvent): Screen {
  const over = screen === "won" || screen === "lost";
  switch (event) {
    case "start":
      return screen === "title" ? "playing" : screen;
    case "pause":
      return screen === "playing" ? "paused" : screen;
    case "resume":
      return screen === "paused" ? "playing" : screen;
    case "quit":
      return screen === "paused" || over ? "title" : screen;
    case "win":
      return screen === "playing" ? "won" : screen;
    case "lose":
      return screen === "playing" ? "lost" : screen;
    case "again":
      return over ? "playing" : screen;
  }
}
