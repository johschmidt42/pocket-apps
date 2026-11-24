// Ring muscle-up with a kip: hang, swing, pull, transition, dip, support, and back down.
// The rings are not fixed: each hand stays on the sphere around the top of its strap (the strap is tight, because
// the rings carry the body in each pose). So a pose gives the swing of the rings, and the hand height follows.
import type { Exercise, View } from "../exercise.ts";
import { RINGS } from "../machines.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The grip when the straps hang straight down. */
const RING = { x: 80, y: 100 };

const RAD = Math.PI / 180;

type Shape = {
  /** How far the rings swing forward (negative: back) from the place where the straps are vertical. */
  swing: number;
  /** Half the distance between the hands. 22 in the hang (the straps are nearly vertical), 20 at the chest. */
  grip: number;
  /** The center of the shoulders relative to the hands: `x` forward, `y` down (negative: above the hands). */
  shoulder: { x: number; y: number };
  lean: number;
  bend: number;
  head: number;
  /** The angle of the thigh and of the shin: 0 is straight down, a positive angle is forward. */
  thigh: number;
  shin: number;
  elbowTo: number;
};

/** The hand on a tight strap: on the sphere around the top of the strap. */
function hand(swing: number, grip: number): { x: number; y: number } {
  const side = grip - RINGS.half;
  return {
    x: RING.x + swing,
    y: RING.y - RINGS.strap + Math.sqrt(RINGS.strap ** 2 - swing ** 2 - side ** 2),
  };
}

/**
 * The shoulders of a body that hangs on straight arms. `arm` is where the shoulders are, seen from the hands:
 * 0 is straight below, a negative angle is behind the rings. The reach in the side view is a little less than
 * the arm, because the hand is farther out than the shoulder joint.
 */
function long(arm: number, grip: number): { x: number; y: number } {
  const reach = Math.sqrt(61.95 ** 2 - (grip - BODY.shoulderHalf) ** 2);
  return { x: Math.sin(arm * RAD) * reach, y: Math.cos(arm * RAD) * reach };
}

function pose(shape: Shape): Pose {
  const hands = hand(shape.swing, shape.grip);
  const shoulder = { x: hands.x + shape.shoulder.x, y: hands.y + shape.shoulder.y };
  const torso = up(shape.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
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
    bend: shape.bend,
    head: shape.head,
    feet,
    stance: 5,
    knees: 0,
    // The toes point away from the body, nearly in the line of the shins.
    toes: 170 - shape.shin,
    hands,
    grip: shape.grip,
    elbowTo: shape.elbowTo,
    elbowsOut: 0.3,
  };
}

const HANG = pose({
  swing: 0,
  grip: 22,
  shoulder: long(0, 22),
  lean: 1,
  bend: 0,
  head: 0,
  thigh: 3,
  shin: 3,
  elbowTo: -20,
});
// The back swing: the chest goes forward through the rings, the feet go back, the rings go a little back.
const ARCH = pose({
  swing: -5,
  grip: 22,
  shoulder: long(12, 22),
  lean: 5,
  bend: -26,
  head: -8,
  thigh: -22,
  shin: -38,
  elbowTo: -20,
});
// The body passes under the rings, on the way from the arch to the hollow.
const UNDER = pose({
  swing: 0,
  grip: 22,
  shoulder: long(-3, 22),
  lean: -5,
  bend: 0,
  head: 2,
  thigh: 6,
  shin: 2,
  elbowTo: -20,
});
// The hollow: the shoulders are behind the rings, the feet come in front. The arms are still long.
const HOLLOW = pose({
  swing: 5,
  grip: 22,
  shoulder: long(-17, 22),
  lean: -18,
  bend: 20,
  head: 14,
  thigh: 32,
  shin: 28,
  elbowTo: -20,
});
// The pull: the hips open and rise, the body leans far back, the arms pull the rings toward the chest.
const PULL = pose({
  swing: 3,
  grip: 21,
  shoulder: { x: -34, y: 22 },
  lean: -45,
  bend: 8,
  head: 34,
  thigh: 50,
  shin: 46,
  elbowTo: -40,
});
// The rings are at the lower chest, the elbows are below and behind them. The shoulders are just above the hands.
const CHEST = pose({
  swing: 0,
  grip: 20,
  shoulder: { x: -13, y: -7 },
  lean: -25,
  bend: 10,
  head: 22,
  thigh: 40,
  shin: 32,
  elbowTo: -70,
});
// The middle of the transition: the torso comes forward over the rings, the elbows go back and up.
const TURN = pose({
  swing: 0,
  grip: 20,
  shoulder: { x: 2, y: -16 },
  lean: 15,
  bend: 8,
  head: -2,
  thigh: 26,
  shin: 14,
  elbowTo: -95,
});
// The bottom of the ring dip (the numbers of `ring-dip.ts`): the shoulders are below the elbows.
const DIP = pose({
  swing: 0,
  grip: 20,
  shoulder: { x: 13.4, y: -21.7 },
  lean: 40,
  bend: 0,
  head: -10,
  thigh: 16,
  shin: 2,
  elbowTo: -100,
});
// The support (the numbers of `ring-dip.ts`): locked elbows, the shoulders straight above the hands.
const SUPPORT = pose({
  swing: 0,
  grip: 20,
  shoulder: { x: 0, y: -61.55 },
  lean: 6,
  bend: 0,
  head: 0,
  thigh: 10,
  shin: 2,
  elbowTo: -70,
});
// The way down: the body drops behind the rings, in a hollow, and the arms get long.
const DROP = pose({
  swing: 2,
  grip: 21,
  shoulder: { x: -22, y: 36 },
  lean: -26,
  bend: 14,
  head: 10,
  thigh: 34,
  shin: 28,
  elbowTo: -25,
});
// The end of the drop: long arms, the shoulders behind the rings. From here the body swings forward again:
// this is the change of direction below the rings.
const BACK = pose({
  swing: 4,
  grip: 22,
  shoulder: long(-14, 22),
  lean: -14,
  bend: 16,
  head: 8,
  thigh: 26,
  shin: 22,
  elbowTo: -20,
});

// The body travels from far below the rings to far above them, and the feet swing far forward in the pull.
const SIDE: View = { label: "Seite", yaw: 0, box: [4, -14, 160, 330] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-72, -14, 144, 330] };

export const RING_MUSCLE_UP: Exercise = {
  key: "ring-muscle-up",
  title: "Ring Muscle-up",
  equipment: { kind: "rings", ...RING },
  views: [SIDE, FRONT],
  ground: false,
  start: HANG,
  steps: [
    { to: HANG, seconds: 0.3, label: "Hang" },
    { to: ARCH, seconds: 0.4, label: "Schwung", ease: "soft", anchor: "hands", legs: "fk" },
    // "in", then "out": the swing gets faster up to the pull, and the body comes to rest in the dip. The two steps
    // have the same hip speed at PULL.
    {
      to: PULL,
      via: [UNDER, HOLLOW],
      seconds: 0.5,
      label: ["Schwung", "Schwung", "Zug"],
      ease: "in",
      anchor: "hands",
      legs: "fk",
    },
    {
      to: DIP,
      via: [CHEST, TURN],
      seconds: 0.42,
      label: ["Zug", "Umsetzen", "Dip"],
      ease: "out",
      anchor: "hands",
      legs: "fk",
    },
    { to: SUPPORT, seconds: 0.5, label: "Drücken", ease: "soft", anchor: "hands", legs: "fk" },
    { to: SUPPORT, seconds: 0.5, label: "Stütz" },
    { to: DIP, seconds: 0.45, label: "Ablassen", ease: "soft", anchor: "hands", legs: "fk" },
    // The drop gets faster, and the long arms catch the body behind the rings.
    {
      to: DROP,
      via: [TURN, CHEST],
      seconds: 0.5,
      label: "Ablassen",
      ease: "in",
      anchor: "hands",
      legs: "fk",
    },
    { to: BACK, seconds: 0.25, label: "Ablassen", ease: "out", anchor: "hands", legs: "fk" },
    { to: HANG, seconds: 0.45, label: "Ablassen", ease: "soft", anchor: "hands", legs: "fk" },
  ],
};
