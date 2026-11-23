// Bench Press: the figure lies on a flat bench, head, shoulders and hips on the pad, feet flat on the floor.
// The bar goes from locked arms over the shoulders down to the lower chest, and back up on a slight curve.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { BENCH } from "../machines.ts";
import { GROUND, type Pose } from "../skeleton.ts";

const HIP_X = 100;
/** The torso lies on the pad: its half width (9.5) above the top of the bench. */
const LYING_Y = GROUND - BENCH.height - 9.5;
const HIP = { x: HIP_X, y: LYING_Y };
const SHOULDER = { x: HIP_X - 46, y: LYING_Y };
/** The end of the bench at the head: the head (25 beyond the shoulders, radius 11) is on the pad. */
const BENCH_X = SHOULDER.x - 42;
/** Half the distance between the hands: wider than the shoulders (13). */
const GRIP = 25;
/** A straight arm, in the side view: the hand is 12 out to the side of the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - 13) ** 2);

const base = {
  hip: HIP,
  lean: -90,
  head: 4,
  bend: -6,
  feet: { x: HIP_X + 40, y: 200 },
  stance: 15,
  knees: 0.6,
  grip: GRIP,
};

/** The bar `dx` from the shoulders toward the hips, at the height `y`. */
const bar = (dx: number, y: number, elbowTo: number, elbowsOut: number): Pose => ({
  ...base,
  hands: { x: SHOULDER.x + dx, y },
  elbowTo,
  elbowsOut,
});

// The lockout: straight arms, the bar over the shoulders.
const LOCK = bar(2, SHOULDER.y - Math.sqrt(REACH ** 2 - 4), 21, 0.7);
// The elbows go out and toward the hips in one steady way: from the front, they do not swing out and back in.
const HIGH = bar(6, SHOULDER.y - 46, 35, 0.5);
const LOW = bar(11, SHOULDER.y - 26, 56, 0.9);
// The bar touches the lower chest. The elbows are below the shoulders, the forearms are nearly vertical, and the
// upper arms are about 67 degrees away from the body.
const CHEST = bar(15, SHOULDER.y - 12, 70, 1.4);

const views: Exercise["views"] = [
  { ...SIDE, box: [2, 58, 176, 154] },
  { ...FRONT, box: [-64, 58, 128, 154] },
];

export const BENCH_PRESS: Exercise = {
  key: "bench-press",
  title: "Bench Press",
  equipment: { kind: "bench", x: BENCH_X },
  views,
  start: LOCK,
  steps: [
    { to: LOCK, seconds: 0.35, label: "Arme gestreckt" },
    {
      to: CHEST,
      via: [HIGH, LOW],
      seconds: 0.95,
      label: "Absenken",
      ease: "soft",
      legs: "line",
      arms: "line",
      follow: "hands",
    },
    { to: CHEST, seconds: 0.12, label: "Brust" },
    {
      to: LOCK,
      via: [LOW, HIGH],
      seconds: 0.75,
      label: "Drücken",
      ease: "soft",
      legs: "line",
      arms: "line",
      follow: "hands",
    },
  ],
};
