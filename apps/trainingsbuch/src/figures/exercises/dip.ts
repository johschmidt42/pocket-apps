// Dip (Wade: "strict dips"): the strict dip of `ring-dip.ts` on the two fixed bars of a dip station. The
// bars run along the way of the figure, the hands hold their tops. From the support on straight arms down until the
// shoulders are below the elbows, and back up.
import type { Exercise } from "../exercise.ts";
import { RING_DIP } from "./ring-dip.ts";

export const DIP: Exercise = {
  ...RING_DIP,
  key: "dip",
  title: "Dip",
  equipment:
    RING_DIP.equipment.kind === "rings"
      ? { kind: "dipbars", x: RING_DIP.equipment.x, y: RING_DIP.equipment.y }
      : RING_DIP.equipment,
};
