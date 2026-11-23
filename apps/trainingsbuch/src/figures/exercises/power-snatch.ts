// Power Snatch: the athlete receives the bar in a partial squat, with the thighs above parallel.
// A variant of `snatch.ts`: the same code, other numbers.
import type { Exercise } from "../exercise.ts";
import { onToes, snatch } from "./snatch.ts";

export const POWER_SNATCH: Exercise = snatch({
  key: "power-snatch",
  title: "Power Snatch",
  // A partial squat: the hip joint is far above the knee joint.
  depth: 135,
  // The arms lock at the lowest point of the hip, as in the squat snatch. Before 2026-11-22 the arms locked
  // higher (129) and the legs then gave way to `depth`: the user saw the hip sink again under a bar that was
  // already at the top, and that makes no sense.
  lock: 135,
  // The body drops only a little, so the feet stay on the toes, just above the floor, and move out.
  feet: [
    onToes(121, 10.4),
    onToes(117, 10.9),
    onToes(110, 11.4),
    onToes(101, 11.9),
    onToes(93, 12.3),
  ],
  seconds: { rise: 0.19, lockout: 0.23, give: 0, up: 0.38 },
});
