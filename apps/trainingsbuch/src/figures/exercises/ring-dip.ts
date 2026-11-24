// Ring dip: from the support on straight arms down until the shoulders are below the elbows, and back up
// to locked elbows. The rings do not move: the hands stay on their spots. The torso leans forward at the bottom,
// the bent legs go back a little, so the center of mass stays over the hands. The feet do not touch the floor.
import type { Exercise } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The grip on the rings, with the straps straight down. Half the distance of the hands is `GRIP`. */
const HANDS = { x: 80, y: 92 };
const GRIP = 20;

type Shape = {
  /** The center of the two shoulder joints. */
  shoulder: { x: number; y: number };
  lean: number;
  head: number;
  /** The angle of the thigh (0 is straight down, a positive angle is forward) and of the shin (negative: back). */
  thigh: number;
  shin: number;
  elbowTo: number;
};

function pose(shape: Shape): Pose {
  const torso = up(shape.lean);
  const hip = {
    x: shape.shoulder.x - torso.x * BODY.torso,
    y: shape.shoulder.y - torso.y * BODY.torso,
  };
  const knee = {
    x: hip.x + Math.sin(shape.thigh * RAD) * BODY.thigh,
    y: hip.y + Math.cos(shape.thigh * RAD) * BODY.thigh,
  };
  const feet = {
    x: knee.x + Math.sin(shape.shin * RAD) * BODY.shin,
    y: knee.y + Math.cos(shape.shin * RAD) * BODY.shin,
  };
  return {
    hip,
    lean: shape.lean,
    head: shape.head,
    feet,
    stance: 5,
    knees: 0,
    // The feet point down, in the line of the shins.
    toes: 180 - shape.shin,
    hands: HANDS,
    grip: GRIP,
    elbowTo: shape.elbowTo,
    elbowsOut: 0.3,
  };
}

// The support: the shoulders are straight above the hands, the elbows are locked (the arm reaches 61.6 in the side
// plane, because the hand is 7 farther out than the shoulder joint). The knees are bent, the feet are behind.
const SUPPORT = pose({
  shoulder: { x: 80, y: 30.45 },
  lean: 6,
  head: 0,
  thigh: 25,
  shin: -45,
  elbowTo: -70,
});
// On the way down: the shoulders go forward first, the elbows go back.
const HALF = pose({
  shoulder: { x: 91, y: 44 },
  lean: 24,
  head: -6,
  thigh: 20,
  shin: -52,
  elbowTo: -90,
});
// The bottom: the forearms lean 30 degrees back, the upper arms are nearly level, and the shoulders are 6 below
// the elbows. The torso leans 40 degrees forward.
const BOTTOM = pose({
  shoulder: { x: 93.4, y: 70.3 },
  lean: 40,
  head: -10,
  thigh: 14,
  shin: -58,
  elbowTo: -100,
});

export const RING_DIP: Exercise = {
  key: "ring-dip",
  title: "Ring Dip",
  equipment: { kind: "rings", x: HANDS.x, y: HANDS.y },
  views: [
    { label: "Seite", yaw: 0, box: [14, -14, 120, 226] },
    { label: "Vorn", yaw: 90, box: [-60, -14, 120, 226] },
  ],
  start: SUPPORT,
  steps: [
    { to: SUPPORT, seconds: 0.3, label: "Stütz" },
    {
      to: BOTTOM,
      via: [HALF],
      seconds: 1.0,
      label: "Runter",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    { to: BOTTOM, seconds: 0.1, label: "Unten" },
    {
      to: SUPPORT,
      via: [HALF],
      seconds: 0.9,
      label: "Hoch",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
  ],
};
