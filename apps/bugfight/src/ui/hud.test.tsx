import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Hud as HudValues } from "../game/game.ts";
import { Hud } from "./hud.tsx";

const FULL: HudValues = {
  pressure: 100,
  tankLocked: false,
  spots: 7,
  level: 1,
  weapon: "spray",
  seeds: 24,
  drumLocked: false,
  score: 0,
};

it("shows the spots that Seven has left", () => {
  render(<Hud hud={{ ...FULL, spots: 4 }} />);
  expect(screen.getByRole("img", { name: "Leben: 4 von 7 Punkten" })).toBeVisible();
});

it("shows the pressure of the tank, and says when the tank is empty", () => {
  const { rerender } = render(<Hud hud={{ ...FULL, pressure: 40 }} />);
  expect(screen.getByText("Tank")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "Druck im Tank" })).toHaveAttribute(
    "aria-valuenow",
    "40",
  );
  rerender(<Hud hud={{ ...FULL, pressure: 10, tankLocked: true }} />);
  expect(screen.getByText("Tank leer")).toBeVisible();
});

it("shows the stones of the drum, and says when the drum fills again", () => {
  const { rerender } = render(<Hud hud={{ ...FULL, weapon: "seeds", seeds: 9 }} />);
  expect(screen.getByText("Kerne")).toBeVisible();
  expect(screen.getByRole("img", { name: "Kerne: 9 von 24" })).toBeVisible();
  rerender(<Hud hud={{ ...FULL, weapon: "seeds", seeds: 3, drumLocked: true }} />);
  expect(screen.getByText("Lädt nach")).toBeVisible();
});
