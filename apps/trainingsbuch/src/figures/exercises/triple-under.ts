// Triple-unders (Cameron): one jump, and the rope passes under the feet three times. The plan of
// `double-under.ts` with a longer flight: 0.5 s of a loop of 0.66 s. The hip rises 29 units (942 * 0.5² / 8), and
// the rope turns 4.5 times per second. At the first and the last pass, 0.03 s after the takeoff and before the
// landing, the feet are 6.6 units up, the rope 1.5.
import type { Exercise } from "../exercise.ts";
import { jumpRope } from "./double-under.ts";

export const TRIPLE_UNDER: Exercise = jumpRope({
  key: "triple-under",
  title: "Triple-Unders",
  turns: 3,
  loop: 0.66,
  air: 0.5,
});
