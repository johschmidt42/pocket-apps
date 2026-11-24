// Pistol (single-leg squat): one leg carries the body down until the hip crease is below the knee, the
// other leg is straight in front and never touches the floor. The legs change after each rep (CrossFit Open 20.4).
// The arms reach forward as a counterweight. The center of mass stays over the middle of the support foot.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import type { Pose, Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The support foot is near the middle line, under the body. The free foot is beside it, so the legs do not cross. */
const SUPPORT_Z = 3;
const FREE_Z = 10;
/** A free leg aims at a spot a little beyond its reach (80): it is straight. */
const REACH = 80.5;

type Shape = {
  hip: { x: number; y: number };
  lean: number;
  head: number;
  /** Where the free leg points: 0 is straight down, 90 is level and forward. */
  free: number;
  /** The angle of the free foot (see `toes`): 0 points up, 90 forward. */
  freeToes: number;
  /** The hands, relative to the shoulders. */
  hands: { dx: number; dy: number };
};

/** One pose. `side` is the support leg: 0 is the near leg, 1 the far leg. */
function pose(side: 0 | 1, shape: Shape): Pose {
  const { hip, lean, free } = shape;
  const support = { x: 74, y: 200, z: SUPPORT_Z };
  const lifted = {
    x: hip.x + REACH * Math.sin(free * RAD),
    y: hip.y + REACH * Math.cos(free * RAD),
    z: FREE_Z,
  };
  return {
    hip,
    lean,
    head: shape.head,
    feet: side === 0 ? [support, lifted] : [lifted, support],
    toes: side === 0 ? [90, shape.freeToes] : [shape.freeToes, 90],
    knees: 0.1,
    grip: 12,
    hands: handAt(hip, lean, shape.hands.dx, shape.hands.dy),
  };
}

// Tall on one leg: hips and knee of the working leg are extended. The free foot is a little in front, off the floor.
const TALL: Shape = {
  hip: { x: 74, y: 120 },
  lean: 0,
  head: 0,
  free: 22,
  freeToes: 110,
  hands: { dx: 6, dy: 62 },
};
// On the way down: the hips go back, the free leg rises, the arms come forward.
const HALF: Shape = {
  hip: { x: 64, y: 152 },
  lean: 18,
  head: -10,
  free: 62,
  freeToes: 50,
  hands: { dx: 50, dy: 30 },
};
// The bottom: the hip is 5 below the knee. The torso leans 30 degrees, the free leg is level, the arms point forward.
// The center of mass is at x = 80, over the middle of the foot (71 to 89).
const BOTTOM: Shape = {
  hip: { x: 58, y: 174 },
  lean: 30,
  head: -18,
  free: 92,
  freeToes: 15,
  hands: { dx: 64, dy: -6 },
};

// Between two reps both feet stand flat for a moment: the free foot comes down, the other one comes up.
const BOTH: Pose = {
  hip: { x: 74, y: 120.2 },
  lean: 0,
  head: 0,
  feet: [
    { x: 74, y: 200, z: 6 },
    { x: 74, y: 200, z: 6 },
  ],
  toes: 90,
  knees: 0.1,
  grip: 12,
  hands: handAt({ x: 74, y: 120.2 }, 0, 4, 63),
};

/** One rep on one leg, from the tall pose back to it. */
function rep(side: 0 | 1, label: string): Step[] {
  // The support leg keeps its spot ("line"). The free leg swings ("fk").
  const legs = side === 0 ? (["line", "fk"] as const) : (["fk", "line"] as const);
  return [
    {
      to: pose(side, BOTTOM),
      via: [pose(side, HALF)],
      seconds: 1.1,
      label,
      ease: "soft",
      anchor: "feet",
      legs,
    },
    { to: pose(side, BOTTOM), seconds: 0.12, label: "Unten" },
    {
      to: pose(side, TALL),
      via: [pose(side, HALF)],
      seconds: 0.95,
      label: "Hoch",
      ease: "soft",
      anchor: "feet",
      legs,
    },
  ];
}

/**
 * From the tall pose on one leg to the tall pose on the other leg: the free foot goes down, the feet stand together
 * for a moment, then the other foot comes up. "line": a foot goes on a straight line, so it does not dip into the floor.
 */
const change = (to: 0 | 1): Step[] => [
  { to: BOTH, seconds: 0.3, label: "Bein wechseln", ease: "soft", legs: "line" },
  { to: pose(to, TALL), seconds: 0.3, ease: "soft", legs: "line" },
];

export const PISTOL: Exercise = {
  key: "pistol",
  title: "Pistol",
  equipment: { kind: "none" },
  // The free foot reaches x = 138 at the bottom.
  views: [{ ...SIDE, box: [26, -14, 132, 226] }, FRONT],
  start: pose(0, TALL),
  steps: [...rep(0, "Rechtes Bein"), ...change(1), ...rep(1, "Linkes Bein"), ...change(0)],
};
