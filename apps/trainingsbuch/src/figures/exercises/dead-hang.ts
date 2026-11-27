// Dead Hang (Coffland: "hang from a pull-up bar for a total of 6 minutes"): the hang of `pull-up.ts` with
// straight arms and relaxed shoulders: the shoulders rise toward the ears. The body is still. It sways a very little
// around the bar, as a body that hangs does, so the picture shows that it is alive.
import type { Exercise, View } from "../exercise.ts";
import { pose } from "./pull-up.ts";

const RAD = Math.PI / 180;
/** The bar of the pull-up. */
const BAR = { x: 78, y: 30 };
/** Relaxed shoulders: the torso hangs lower, and the shoulder joints are nearer to the head. */
const SHRUG = 4;

/** The hang, turned `angle` degrees around the bar (positive: the feet go forward). */
function hang(angle: number) {
  const reach = 61.8;
  const p = pose(
    {
      back: Math.sin(angle * RAD) * reach,
      down: Math.cos(angle * RAD) * reach + SHRUG,
      lean: angle,
      legs: angle + 1,
      head: 0,
      elbows: 0.5,
      elbowsOut: 0.4,
    },
    BAR,
  );
  return { ...p, shrug: SHRUG };
}

const FORWARD = hang(2);
const BACK = hang(-2);

const SIDE: View = { label: "Seite", yaw: 0, box: [8, -18, 130, 284] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 284] };

export const DEAD_HANG: Exercise = {
  key: "dead-hang",
  title: "Dead Hang",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE, FRONT],
  ground: false,
  start: FORWARD,
  steps: [
    { to: BACK, seconds: 1.6, label: "Hängen", ease: "soft", anchor: "hands" },
    { to: FORWARD, seconds: 1.6, label: "Hängen", ease: "soft", anchor: "hands" },
  ],
};
