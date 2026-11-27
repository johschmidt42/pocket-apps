// Single-arm dumbbell snatch: from the floor to overhead in one pull. The near arm works.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { BODY, tiptoe, up, type Pose, type Spot } from "../skeleton.ts";

const FEET = { x: 74, y: 200 };

type Hip = { x: number; y: number };
/** Where the free hand is, relative to its shoulder joint. `out` is the distance to the side. */
type Free = { dx: number; dy: number; out: number };

/**
 * One pose. `bell` is the hand with the dumbbell (side 0): `z` is its distance from the middle of the body.
 * The free hand (side 1) gets its place relative to its shoulder. Then the arm keeps its shape when the torso moves.
 */
export function pose(
  hip: Hip,
  lean: number,
  bell: Required<Spot>,
  free: Free,
  rest: Partial<Pose> = {},
): Pose {
  const torso = up(lean);
  const shoulder = { x: hip.x + torso.x * BODY.torso, y: hip.y + torso.y * BODY.torso };
  const freeHand = {
    x: shoulder.x + free.dx,
    y: shoulder.y + free.dy,
    z: BODY.shoulderHalf + free.out,
  };
  return { feet: FEET, stance: 14, knees: 0.5, hip, lean, hands: [bell, freeHand], ...rest };
}

// The free arm is straight in each pose: the hand is 2 units farther away than the arm can reach (62).
const WIDE: Free = { dx: -40, dy: 24, out: 44 }; // out to the side and back, above the knee
export const SIDEWAYS: Free = { dx: -16, dy: 46, out: 42 }; // down and out to the side
export const LOW: Free = { dx: 2, dy: 60, out: 22 }; // hangs beside the hip, a little away from the leg

// The toe stays on its spot. So the ankle goes a little forward, and the hip goes with it: the body is over the toes.
const ON_TOES = { feet: tiptoe(75, 110), toes: 110 };

// The dumbbell goes up on this line, between the feet (the foot goes from x = 71 to x = 89).
const BELL = 83;

/**
 * A pose with a straight working arm and the dumbbell on the middle line of the body, at the height `bellY`.
 * The shoulders are `ahead` units in front of the dumbbell. The hip follows from the shoulder and the lean.
 * The arm is 61.9 long in space: the hand is on its spot, and the arm is straight.
 */
export function hang(bellY: number, ahead: number, lean: number, head: number): Pose {
  const arm = Math.sqrt(61.9 ** 2 - BODY.shoulderHalf ** 2 - ahead ** 2);
  const torso = up(lean);
  const hip = { x: BELL + ahead - torso.x * BODY.torso, y: bellY - arm - torso.y * BODY.torso };
  return pose(hip, lean, { x: BELL, y: bellY, z: 0 }, WIDE, { head });
}

// The dumbbell is on the floor between the feet. The hips are back and above the knees, the back is flat.
// The shoulder is in front of the dumbbell, the arm is straight.
// The lean is 68: with 60, the hip is at the height of the knees (the shoulder cannot go below y = 139).
const SETUP = hang(199, 8, 68, -38);
// The legs push. The dumbbell is at the knees, the back keeps its angle for the most part.
const KNEE = hang(162, 6, 52, -28);
// Hips and knees are open, on the toes. The shoulder pulls up, and the elbow starts to bend.
export const EXTEND = pose({ x: 78, y: 116 }, -3, { x: 86, y: 128, z: 8 }, SIDEWAYS, {
  ...ON_TOES,
  elbows: 0,
});
// The elbow goes high and to the outside. The dumbbell is at the chest.
// `elbows` sets the side of the elbow. The hand is below and in front of the shoulder: 0.85 puts the elbow
// outside and above the hand. The hand is above and in front of the shoulder: -0.5 does the same.
export const HIGH_PULL = pose({ x: 78, y: 115 }, -3, { x: 91, y: 88, z: 13 }, SIDEWAYS, {
  ...ON_TOES,
  elbows: 0.85,
});
// The dumbbell passes the face. The elbow is still outside. The feet are flat again.
export const TURN = pose({ x: 74, y: 120 }, 0, { x: 91, y: 54, z: 16 }, SIDEWAYS, { elbows: -0.5 });
// The athlete drops under the dumbbell and locks the arm out.
const CATCH = pose({ x: 71, y: 127 }, 4, { x: 76, y: 20.5, z: 12 }, SIDEWAYS, { elbows: -0.5 });
// Full lockout: the arm is vertical, the dumbbell is above the shoulder. The spot is above the reach: the arm is straight.
export const OVERHEAD = pose({ x: 74, y: 120 }, 0, { x: 74.5, y: 9, z: 12 }, LOW, { elbows: 0 });
// The way down is the way up in reverse: past the face, then to the chest with the elbow outside.
export const DOWN_FACE = pose({ x: 74, y: 120 }, 0, { x: 91, y: 54, z: 16 }, LOW, { elbows: -0.5 });
// The hips start to go back.
export const DOWN_CHEST = pose({ x: 72, y: 123 }, 8, { x: 93, y: 95, z: 13 }, LOW, {
  elbows: 0.85,
});

export const DUMBBELL_SNATCH: Exercise = {
  key: "dumbbell-snatch",
  title: "DB Snatch",
  equipment: { kind: "dumbbell", hand: 0 },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [
    // "in": the legs push faster and faster. The dumbbell goes straight up, and the arm stays long.
    { to: KNEE, seconds: 0.32, label: "Zug", ease: "in", anchor: "feet", arms: ["line", "fk"] },
    {
      to: EXTEND,
      seconds: 0.17,
      label: "Streckung",
      ease: "linear",
      anchor: "feet",
      arms: ["line", "fk"],
    },
    {
      to: HIGH_PULL,
      seconds: 0.14,
      label: "Hoher Zug",
      ease: "linear",
      anchor: "feet",
      arms: ["line", "fk"],
    },
    // "fk": the elbow stays high and outside while the dumbbell passes the face.
    { to: TURN, seconds: 0.1, label: "Umsetzen", ease: "linear", anchor: "feet", arms: "fk" },
    { to: CATCH, seconds: 0.3, ease: "out", anchor: "feet", arms: "fk" },
    // "carry": the arm stays locked while the legs stand up.
    { to: OVERHEAD, seconds: 0.35, label: "Über Kopf", anchor: "feet", arms: ["carry", "fk"] },
    { to: OVERHEAD, seconds: 0.5 },
    // The dumbbell comes down in front of the body in one move: it starts slow and ends slow.
    // "fk": the elbow stays outside. On a straight line, the elbow swings to the front.
    { to: DOWN_FACE, seconds: 0.36, label: "Ablassen", ease: "in", anchor: "feet", arms: "fk" },
    { to: DOWN_CHEST, seconds: 0.13, ease: "linear", anchor: "feet", arms: "fk" },
    { to: KNEE, seconds: 0.26, ease: "linear", anchor: "feet", arms: "fk" },
    { to: SETUP, seconds: 0.35, ease: "out", anchor: "feet", arms: ["line", "fk"] },
    { to: SETUP, seconds: 0.4, label: "Start" },
  ],
};
