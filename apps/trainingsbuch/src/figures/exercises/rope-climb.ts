// Rope climb. The camera follows the figure: the rope moves down.
import type { Exercise } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";

const ROPE = 92;
/** How far the figure climbs in one loop. */
const RISE = 47;

// In the hang, the arms are long: the hip is one arm (62) and the torso below the hands.
const HIP = 148;
const FEET = 178;

const base = { stance: 3, grip: 2, knees: 0.6, head: -20 };
const hands = (near: number, far: number) =>
  [
    { x: ROPE, y: near },
    { x: ROPE, y: far },
  ] as const;

// Arms long, knees up, the feet clamp the rope.
const HANG: Pose = {
  ...base,
  hip: { x: 80, y: HIP },
  lean: 8,
  feet: { x: ROPE, y: FEET },
  hands: hands(40, 44),
};
// Stand up on the feet. The hands stay.
const STAND: Pose = {
  ...base,
  hip: { x: 83, y: HIP - RISE },
  lean: 5,
  feet: { x: ROPE, y: FEET },
  hands: hands(40, 44),
};
const REACH_FAR: Pose = { ...STAND, hands: hands(40, 44 - RISE) };
const REACH_NEAR: Pose = { ...STAND, hands: hands(40 - RISE, 44 - RISE) };
// The same as HANG, but one step higher.
const TUCK: Pose = {
  ...HANG,
  hip: { x: 80, y: HIP - RISE },
  feet: { x: ROPE, y: FEET - RISE },
  hands: hands(40 - RISE, 44 - RISE),
};

export const ROPE_CLIMB: Exercise = {
  key: "rope-climb",
  title: "Rope Climb",
  equipment: { kind: "rope", x: ROPE },
  views: [{ label: "Seite", yaw: 0, box: [32, -6, 120, 218] }],
  scroll: RISE,
  ground: false,
  start: HANG,
  steps: [
    { to: STAND, seconds: 0.65, label: "Aufstehen", arms: "line" },
    { to: REACH_FAR, seconds: 0.3, label: "Greifen", arms: "line" },
    { to: REACH_NEAR, seconds: 0.3, label: "Greifen", arms: "line" },
    { to: TUCK, seconds: 0.5, label: "Füße nachsetzen", arms: "line" },
    { to: TUCK, seconds: 0.15 },
  ],
};
