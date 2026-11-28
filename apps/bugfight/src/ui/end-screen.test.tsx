import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { EndScreen } from "./end-screen.tsx";

it("says that the game is won, and offers a new game and the title", async () => {
  const onAgain = vi.fn();
  const onQuit = vi.fn();
  render(<EndScreen won score={12} onAgain={onAgain} onQuit={onQuit} />);
  expect(screen.getByRole("heading", { level: 2, name: "Gewonnen" })).toBeVisible();
  expect(screen.getByText("Die Party ist vorbei, Ameisen.")).toBeVisible();
  expect(screen.getByText("Pollen gesammelt: 12")).toBeVisible();

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Nochmal" }));
  expect(onAgain).toHaveBeenCalledOnce();
  await user.click(screen.getByRole("button", { name: "Hauptmenü" }));
  expect(onQuit).toHaveBeenCalledOnce();
});

it("says that the game is lost", () => {
  render(<EndScreen won={false} score={0} onAgain={vi.fn()} onQuit={vi.fn()} />);
  expect(screen.getByRole("heading", { level: 2, name: "Verloren" })).toBeVisible();
  expect(screen.getByText("Sieben Punkte. Alle weg.")).toBeVisible();
});
