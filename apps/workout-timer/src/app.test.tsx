import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./app.tsx";
import type { Sound } from "./sound.ts";

/** The default lead-in: 10 s. */
const LEAD_IN_MS = 10_000;

/** A clock that the test moves forward. The app still ticks with a real interval. */
function setup() {
  const clock = { time: 0 };
  const sound: Sound = { unlock: vi.fn(), play: vi.fn() };
  const user = userEvent.setup();
  render(<App clock={() => clock.time} sound={sound} />);
  return { clock, sound, user };
}

async function chooseMode(user: ReturnType<typeof userEvent.setup>, mode: string) {
  await user.click(screen.getByRole("radio", { name: new RegExp(`^${mode}`) }));
}

async function setInput(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  await user.clear(screen.getByLabelText(label));
  if (value !== "") await user.type(screen.getByLabelText(label), value);
}

async function expectClock(text: string) {
  expect(await screen.findByText(text, { selector: "[role=timer]" })).toBeInTheDocument();
}

describe("Workout Timer", () => {
  it("shows the settings of each mode", async () => {
    const { user } = setup();

    expect(screen.getByRole("heading", { level: 1, name: "Test-App" })).toBeInTheDocument();
    expect(screen.getByLabelText("Time Cap in Minuten")).toHaveValue("");

    await chooseMode(user, "Tabata");
    expect(screen.getByLabelText("Arbeit in Sekunden")).toHaveValue("20");
    expect(screen.getByLabelText("Pause in Sekunden")).toHaveValue("10");
    // 8 × 20 s work and 7 × 10 s rest.
    expect(screen.getByText(/^Tabata 8 × 20 s \/ 10 s/)).toBeInTheDocument();
    expect(screen.getByText("3:50")).toBeInTheDocument();

    await chooseMode(user, "EMOM");
    expect(screen.getByLabelText("Intervall in Minuten")).toHaveValue("1");

    await chooseMode(user, "AMRAP");
    expect(screen.getByText(/^AMRAP 12:00/)).toBeInTheDocument();
  });

  it("changes a setting with the buttons − and +", async () => {
    const { user } = setup();

    expect(screen.getByText("∞")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Time Cap verringern" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Time Cap erhöhen" }));
    await user.click(screen.getByRole("button", { name: "Time Cap erhöhen" }));
    expect(screen.getByLabelText("Time Cap in Minuten")).toHaveValue("2");
    expect(screen.getByText(/^For Time · Time Cap 2:00/)).toBeInTheDocument();
    // Below the minimum, the optional time cap is empty again.
    await user.click(screen.getByRole("button", { name: "Time Cap verringern" }));
    await user.click(screen.getByRole("button", { name: "Time Cap verringern" }));
    expect(screen.getByLabelText("Time Cap in Minuten")).toHaveValue("");

    await chooseMode(user, "Tabata");
    await user.click(screen.getByRole("button", { name: "Arbeit erhöhen" }));
    expect(screen.getByLabelText("Arbeit in Sekunden")).toHaveValue("25");
    await setInput(user, "Runden", "1");
    expect(screen.getByRole("button", { name: "Runden verringern" })).toBeDisabled();
    await setInput(user, "Runden", "99");
    await user.click(screen.getByRole("button", { name: "Runden erhöhen" }));
    expect(screen.getByLabelText("Runden")).toHaveValue("100");
    expect(screen.getByRole("button", { name: "Runden erhöhen" })).toBeDisabled();
    await setInput(user, "Runden", "500");
    await user.click(screen.getByRole("button", { name: "Runden verringern" }));
    expect(screen.getByLabelText("Runden")).toHaveValue("100");
  });

  it("accepts only digits", async () => {
    const { user } = setup();
    await chooseMode(user, "AMRAP");

    await setInput(user, "Dauer in Minuten", "1a5-,");

    expect(screen.getByLabelText("Dauer in Minuten")).toHaveValue("15");
  });

  it("sets the EMOM interval in minutes or in seconds", async () => {
    const { user } = setup();
    await chooseMode(user, "EMOM");

    expect(screen.getByLabelText("Intervall in Minuten")).toHaveValue("1");
    expect(screen.getByRole("radio", { name: "Minuten" })).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("radio", { name: "Sekunden" }));
    expect(screen.getByLabelText("Intervall in Sekunden")).toHaveValue("60");
    await user.click(screen.getByRole("button", { name: "Intervall erhöhen" }));
    expect(screen.getByLabelText("Intervall in Sekunden")).toHaveValue("75");
    expect(screen.getByText(/^EMOM 10 × 1:15/)).toBeInTheDocument();

    // A click on the selected unit changes nothing.
    await user.click(screen.getByRole("radio", { name: "Sekunden" }));
    expect(screen.getByLabelText("Intervall in Sekunden")).toHaveValue("75");

    await user.click(screen.getByRole("radio", { name: "Minuten" }));
    expect(screen.getByLabelText("Intervall in Minuten")).toHaveValue("1");
  });

  it("starts at once without a lead-in", async () => {
    const { clock, sound, user } = setup();
    await setInput(user, "Vorlauf in Sekunden", "0");
    expect(screen.getByText(/ohne Vorlauf/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByRole("heading", { name: "Los!" })).toBeInTheDocument();
    clock.time = 2000;
    await expectClock("0:02");
    expect(sound.play).toHaveBeenCalledWith("work");
  });

  it("shows an error and blocks the start for a wrong input", async () => {
    const { user } = setup();
    await chooseMode(user, "AMRAP");

    await setInput(user, "Dauer in Minuten", "0");

    expect(screen.getByText("Bitte eine ganze Zahl von 1 bis 180.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByText("Bitte prüfe die Eingaben.")).toBeInTheDocument();
  });

  it("runs For Time with a lead-in, counts rounds and shows the time at the end", async () => {
    const { clock, sound, user } = setup();

    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(sound.unlock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Gleich geht’s los" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("10");

    clock.time = LEAD_IN_MS + 65_000;
    await expectClock("1:05");
    expect(screen.getByRole("heading", { name: "Los!" })).toBeInTheDocument();
    expect(sound.play).toHaveBeenLastCalledWith("work");

    await user.click(screen.getByRole("button", { name: "Runde zählen" }));
    await user.click(screen.getByRole("button", { name: "Runde zählen" }));
    await user.click(screen.getByRole("button", { name: "Runde zählen" }));
    await user.click(screen.getByRole("button", { name: "Eine Runde zurück" }));
    expect(screen.getByRole("status")).toHaveTextContent("2Runden");

    await user.click(screen.getByRole("button", { name: "Fertig" }));

    expect(screen.getByRole("heading", { name: "Geschafft!" })).toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("keeps the mode after a click on the selected tile", async () => {
    const { user } = setup();

    await chooseMode(user, "For Time");

    expect(screen.getByRole("radio", { name: /^For Time/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows hours after one hour of For Time", async () => {
    const { clock, user } = setup();
    await user.click(screen.getByRole("button", { name: "Start" }));

    clock.time = LEAD_IN_MS + 3_725_000;

    expect(await screen.findByText("1:02:05")).toHaveAttribute("role", "timer");
  });

  it("stops For Time at the time cap", async () => {
    const { clock, user } = setup();
    await setInput(user, "Time Cap in Minuten", "1");
    await user.click(screen.getByRole("button", { name: "Start" }));

    clock.time = LEAD_IN_MS + 61_000;

    expect(await screen.findByRole("heading", { name: "Time Cap" })).toBeInTheDocument();
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("counts AMRAP down and does not count a pause", async () => {
    const { clock, sound, user } = setup();
    await chooseMode(user, "AMRAP");
    await setInput(user, "Dauer in Minuten", "1");
    await user.click(screen.getByRole("button", { name: "Start" }));

    clock.time = LEAD_IN_MS + 10_000;
    await expectClock("0:50");

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("heading", { name: "Pausiert" })).toBeInTheDocument();
    clock.time = 500_000;
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    clock.time = 505_000;
    await expectClock("0:45");

    clock.time = 600_000;
    expect(await screen.findByRole("heading", { name: "Geschafft!" })).toBeInTheDocument();
    expect(sound.play).toHaveBeenLastCalledWith("end");
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  it("shows the round of EMOM", async () => {
    const { clock, user } = setup();
    await chooseMode(user, "EMOM");
    await user.click(screen.getByRole("button", { name: "Start" }));

    clock.time = LEAD_IN_MS + 65_000;

    expect(await screen.findByText("Runde 2 von 10")).toBeInTheDocument();
    await expectClock("0:55");
    expect(screen.queryByRole("button", { name: "Runde zählen" })).not.toBeInTheDocument();

    // Round 2 still runs: only round 1 is complete.
    await user.click(screen.getByRole("button", { name: "Beenden" }));
    expect(screen.getByText("1 von 10")).toBeInTheDocument();
  });

  it("ends Tabata early, starts again and goes back to the settings", async () => {
    const { clock, user } = setup();
    await chooseMode(user, "Tabata");
    await user.click(screen.getByRole("button", { name: "Start" }));

    clock.time = LEAD_IN_MS + 25_000;
    expect(await screen.findByRole("heading", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByText("Runde 1 von 8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Beenden" }));
    expect(screen.getByRole("heading", { name: "Beendet" })).toBeInTheDocument();
    expect(screen.getByText("1 von 8")).toBeInTheDocument();
    expect(screen.getByText("0:25")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nochmal" }));
    expect(screen.getByRole("heading", { name: "Gleich geht’s los" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Beenden" }));
    await user.click(screen.getByRole("button", { name: "Neuer Timer" }));
    expect(screen.getByRole("radio", { name: /^Tabata/ })).toHaveAttribute("aria-checked", "true");
  });

  it("plays no tones when the sound is off", async () => {
    const { clock, sound, user } = setup();
    await user.click(screen.getByRole("button", { name: "Start" }));

    await user.click(screen.getByRole("button", { name: "Ton aus" }));
    clock.time = LEAD_IN_MS + 1000;
    await expectClock("0:01");

    expect(sound.play).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ton an" })).toBeInTheDocument();
  });
});
