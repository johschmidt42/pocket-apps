// Burpee Box Jump: a burpee with the face to the box, a jump with both feet onto the box, a tall stand with
// open hips and knees, and a step down on the same side. The way to the box comes from `burpee-box-jump-over.ts`.
import type { Exercise, View } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";
import { at, BOX, NEAR, ON_BOX, STAND, TO_THE_BOX, TOP } from "./burpee-box-jump-over.ts";

const onBox = { x: ON_BOX, y: TOP };
const floor = { x: NEAR, y: 200 };
/** A foot in the air, before the edge of the box. A foot must go here before it goes down, or it goes through the box. */
const overEdge = { x: BOX.x - 22, y: TOP - 8 };

// Full extension of the hips and the knees on the box.
const TALL: Pose = at({ x: ON_BOX, y: TOP - 80 }, 0, 3, 60, { feet: onBox });
// The step down, backward. Side 1 goes first: back over the edge, then down to the floor.
const BACK_FOOT_UP: Pose = at({ x: ON_BOX - 6, y: TOP - 70 }, 12, 12, 55, {
  feet: [onBox, overEdge],
});
const BACK_FOOT_DOWN: Pose = at({ x: 207, y: 134 }, 28, 12, 55, {
  feet: [onBox, floor],
  head: -15,
});
// The weight is on the floor foot. The other foot comes back over the edge.
const FRONT_FOOT_UP: Pose = at({ x: 182, y: 124 }, 15, 12, 55, { feet: [overEdge, floor] });

const SIDE: View = { label: "Seite", yaw: 0, box: [47, -34, 246, 246] };

export const BURPEE_BOX_JUMP: Exercise = {
  key: "burpee-box-jump",
  title: "Burpee Box Jump",
  equipment: { kind: "box", ...BOX },
  views: [SIDE],
  start: STAND,
  steps: [
    ...TO_THE_BOX,
    { to: TALL, seconds: 0.42, label: "Aufrichten", anchor: "feet" },
    { to: TALL, seconds: 0.25, label: "Stehen" },
    { to: BACK_FOOT_UP, seconds: 0.3, label: "Absteigen" },
    { to: BACK_FOOT_DOWN, seconds: 0.45 },
    { to: FRONT_FOOT_UP, seconds: 0.35 },
    { to: STAND, seconds: 0.4 },
    { to: STAND, seconds: 0.2, label: "Stehen" },
  ],
};
