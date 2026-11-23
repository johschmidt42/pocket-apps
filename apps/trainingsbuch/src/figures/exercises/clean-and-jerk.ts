// Clean & Jerk: squat clean, then split jerk.
// `power-clean-and-jerk.ts` imports the pull (`SETUP` to `POWER`), `intoRack()` and the way down (`LOWER`) from here.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, rackAt, shoulderOf } from "../poses.ts";
import { tiptoe, type Pose, type Step } from "../skeleton.ts";

const base = { feet: { x: 74, y: 200 }, stance: 10, knees: 0.5, grip: 16 };

type Spot2 = { x: number; y: number };
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Two poses on the way from `under` (the bar is in front of the chest) into the rack of `land`: the bar goes around
 * the shoulders, 10 units from their center, and not through the chest. The elbows turn down and then forward.
 * `first` and `second`: which part of the way of the hip is done at each pose, and other fields (the feet).
 */
export function intoRack(
  under: Pose,
  land: Pose,
  first: Partial<Pose> & { t: number },
  second: Partial<Pose> & { t: number },
): [Pose, Pose] {
  const at = (
    { t, ...rest }: Partial<Pose> & { t: number },
    dx: number,
    dy: number,
    elbowTo: number,
    elbowsOut: number,
  ): Pose => {
    const hip = { x: mix(under.hip.x, land.hip.x, t), y: mix(under.hip.y, land.hip.y, t) };
    const lean = mix(under.lean, land.lean, t);
    return { ...land, hip, lean, hands: handAt(hip, lean, dx, dy), elbowTo, elbowsOut, ...rest };
  };
  return [at(first, 10.5, -1, 10, 3.5), at(second, 7.5, -7.5, 50, 3.5)];
}

/** The length of a straight arm in the side view: 61.95 in space, and the hand is 3 outside the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (base.grip - 13) ** 2);

/**
 * A pose of the pull with straight arms: the bar is at `bar`, and the hip is as high as the arms permit.
 * The elbows point out and up: they are above the bar when the arms start to bend.
 */
function pulled(hipX: number, lean: number, bar: Spot2, head: number): Pose {
  const shoulder = shoulderOf({ x: hipX, y: 0 }, lean);
  const hipY = bar.y - Math.sqrt(REACH ** 2 - (bar.x - shoulder.x) ** 2) - shoulder.y;
  return { ...base, hip: { x: hipX, y: hipY }, lean, head, hands: bar, elbowTo: 150, elbowsOut: 3 };
}

// The pull. The bar cannot go through a leg: the knees go back, the bar passes them, and they come forward again.
// The bar is on the floor: its center is one plate radius (17) above the ground. It touches the shins.
// The shoulders are a little in front of the bar. The hips are above the knees.
export const SETUP: Pose = pulled(50, 55, { x: 85, y: 189 }, -30);
// The bar is at the middle of the shins. The legs push, the knees start to go back.
export const SHIN: Pose = pulled(50.3, 54, { x: 85.6, y: 176 }, -30);
// The bar is at the height of the knees and in front of them. The legs pushed: the knees went back, the shins are
// nearly vertical. The angle of the torso is nearly the same as at the start.
export const KNEE: Pose = pulled(53, 50, { x: 85.8, y: 162 }, -28);
// The middle of the thighs. The knees come forward again under the bar, the torso comes up. The bar brushes the thighs.
// The knee is at x = 80 here: between its place at the knee pose (77) and in the power position (79.5).
// With the hip at 61 it was at 81.6, and the knee went forward and back again.
export const THIGH: Pose = pulled(60, 32, { x: 85, y: 150 }, -15);
// The same height on the way down: the hips go back first, and the knees stay back until the bar has passed them.
// The knee then goes back once and forward once. With `THIGH` it went forward, back and forward in 0.1 s
// (the user saw the thigh shift, 2026-11-22).
const HINGE: Pose = pulled(59, 34, { x: 85.2, y: 150 }, -17);
// The power position: the bar is at the top of the thighs, the arms are long, the knees are a little bent.
export const POWER: Pose = pulled(67.5, 15, { x: 84.5, y: 140 }, -3);
/**
 * The end of the second pull: the shoulders are up (`shrug`), the arms are still nearly straight (`slack` inside
 * the reach), the bar is at `barX`. The shoulder joints are `shrug` above the neck base, along the torso.
 */
export function shrugged(
  hip: Spot2,
  lean: number,
  barX: number,
  shrug: number,
  slack: number,
): Pick<Pose, "hip" | "lean" | "hands" | "shrug" | "elbowTo" | "elbowsOut"> {
  const neck = shoulderOf(hip, lean);
  const joint = {
    x: neck.x + Math.sin((lean * Math.PI) / 180) * shrug,
    y: neck.y - Math.cos((lean * Math.PI) / 180) * shrug,
  };
  const y = joint.y + Math.sqrt((REACH - slack) ** 2 - (barX - joint.x) ** 2);
  return { hip, lean, hands: { x: barX, y }, shrug, elbowTo: 110, elbowsOut: 3 };
}
// Full extension, on the toes, with a shrug. The arms are still nearly straight: the bar is at the hips.
const EXTEND: Pose = {
  ...base,
  feet: tiptoe(75, 120),
  toes: 120,
  ...shrugged({ x: 75, y: 116 }, -6, 86, 5.5, 6),
};
// The turnover, as in `power-clean-and-jerk.ts` (found by its agent on 2026-11-21): before, the hand went on a
// straight line past the shoulder, and the elbow went behind the shoulder and came back.
// The bar stays in front of the torso until it is as high as the shoulders. Then it comes back onto them.
// The feet are just above the floor. The body drops, the arms bend, the bar still rises: its way and the way of
// the hip are the same part of the step here, so that the two have one speed each.
// The elbows are out and a little behind the bar (`elbowTo: -110`): from here they turn down and forward on one arc.
const UNDER: Pose = {
  ...base,
  feet: { x: 74.5, y: 198 },
  toes: 97,
  hip: { x: 68.5, y: 132.5 },
  lean: 9,
  hands: { x: 85.5, y: 100 },
  shrug: 4,
  elbowTo: -110,
  elbowsOut: 3,
};
// The feet land flat. The bar meets the shoulders while the body goes down. The elbows are still out
// (`elbowsOut: 3`): they come forward while the legs give way. A faster turn is a jump of the elbow.
// The hip is so low here that its speed is the same before and after this pose.
const LAND_HIP = { x: 62, y: 146 };
const LAND: Pose = { ...base, hip: LAND_HIP, lean: 17, ...rackAt(LAND_HIP, 17), elbowsOut: 3 };
const [AROUND, ONTO] = intoRack(UNDER, LAND, { t: 0.5, shrug: 2.5 }, { t: 0.8, shrug: 1 });
// The front rack in the deep catch. `rackAt` puts the hands along the torso, so with this lean the elbows were 44
// degrees below level (the user saw it, 2026-11-23). With the hands more above the shoulders, they are 26 below
// level, as in the catch of the power clean.
const CATCH_HIP = { x: 54, y: 167 };
export const CATCH: Pose = {
  ...base,
  hip: CATCH_HIP,
  lean: 27,
  hands: handAt(CATCH_HIP, 27, 4, -10),
  elbowTo: 80,
};
const RACK_HIP = { x: 74, y: 120 };
export const RACK: Pose = { ...base, hip: RACK_HIP, lean: 2, ...rackAt(RACK_HIP, 2) };
const DIP_HIP = { x: 74, y: 132 };
export const DIP: Pose = { ...base, hip: DIP_HIP, lean: 2, ...rackAt(DIP_HIP, 2) };
// The bar leaves the shoulders: the hands are 20 above the shoulder joints.
// The bar passes the face: the head goes back out of its way, as in a real press. The check finds a bar in the head.
export const DRIVE: Pose = {
  ...base,
  hip: RACK_HIP,
  lean: 0,
  head: -26,
  hands: handAt(RACK_HIP, 0, 6, -20),
  elbowTo: 60,
};
export const PASS: Pose = {
  ...base,
  hip: RACK_HIP,
  lean: 0,
  head: -26,
  hands: handAt(RACK_HIP, 0, 12, -34),
};
// Split: side 0 is the front leg. The back foot is on its toes.
const SPLIT: Pose = {
  ...base,
  feet: [
    { x: 102, y: 200 },
    // 1 above the floor: on the way into the split, the foot turns, and its toe dips a little.
    { x: 40, y: tiptoe(40, 150).y - 1 },
  ],
  toes: [90, 150],
  knees: 0.2,
  hip: { x: 72, y: 134 },
  lean: 0,
  // Straight arms: the hands are a little farther away than the arms can reach.
  // Active shoulders: they push up into the bar.
  hands: { x: 74, y: 19 },
  shrug: 3,
};
export const OVERHEAD: Pose = {
  ...base,
  hip: { x: 74, y: 120 },
  lean: 0,
  hands: { x: 76, y: 5 },
  shrug: 3,
};

// The way down from the rack: the bar goes around the shoulders and down in front of the torso and the thighs.
// The elbows turn out and up, as in the turnover, in reverse.
// The knees start to bend early and slowly. A leg that is fully straight moves its knee far for a very small
// drop of the hip: when the hip stayed still up to `CHEST` and then dropped, the knee jumped 5 forward in 0.05 s
// (the user saw the thigh shift, 2026-11-22). So the hip sinks a very little in each of these poses.
const OFF: Pose = {
  ...base,
  hip: { x: 74, y: 120.1 },
  lean: 2,
  hands: handAt(RACK_HIP, 2, 7.5, -7.5),
  elbowTo: 60,
  elbowsOut: 2,
};
const FRONT_OF: Pose = {
  ...base,
  hip: { x: 73.8, y: 120.3 },
  lean: 2,
  hands: handAt(RACK_HIP, 2, 10.5, -1),
  elbowTo: 20,
  elbowsOut: 3,
};
const CHEST: Pose = {
  ...base,
  hip: { x: 73.2, y: 120.65 },
  lean: 2,
  hands: { x: 86.5, y: 98 },
  elbowTo: 150,
  elbowsOut: 3,
};
const BELLY: Pose = {
  ...base,
  hip: { x: 72, y: 121.5 },
  lean: 6,
  hands: { x: 85.5, y: 120 },
  elbowTo: 150,
  elbowsOut: 3,
};

/** From the rack (stance 10, upright) down to the floor, and a short rest. The squat clean and the power clean share it. */
export const LOWER: Step[] = [
  // "fk": the arm bones turn. On a straight line, the hand passes the shoulder and the elbow jumps.
  {
    to: POWER,
    via: [OFF, FRONT_OF, CHEST, BELLY],
    seconds: 0.45,
    anchor: "feet",
    arms: "fk",
    follow: "hands",
  },
  // The knees go back, the bar passes them, the knees come forward again: the pull in reverse.
  {
    to: SETUP,
    via: [HINGE, KNEE, SHIN],
    seconds: 0.5,
    anchor: "feet",
    arms: "fk",
    follow: "hands",
  },
  { to: SETUP, seconds: 0.2 },
];

/** The squat clean, from the floor to the stand with the bar in the rack. `squat-clean.ts` uses it too. */
export const SQUAT_CLEAN_STEPS: Step[] = [
  // One step from the floor to the power position: the bar gets faster and faster. "fk": the arms are ropes.
  {
    to: POWER,
    via: [SHIN, KNEE, THIGH],
    seconds: 0.6,
    label: "Zug",
    ease: "in",
    anchor: "feet",
    arms: "fk",
    follow: "hands",
  },
  // "fk": the arms are still ropes, the shrug lifts the bar.
  { to: EXTEND, seconds: 0.16, label: "Streckung", ease: "linear", anchor: "feet", arms: "fk" },
  // "fk": the arm bones turn under the bar. Then "carry": the bar stays on the shoulders while the legs give way.
  {
    to: LAND,
    via: [UNDER, AROUND, ONTO],
    seconds: 0.17,
    label: "Umsetzen",
    ease: "linear",
    arms: "fk",
  },
  { to: CATCH, seconds: 0.2, ease: "out", anchor: "feet", arms: "carry" },
  { to: CATCH, seconds: 0.15 },
  { to: RACK, seconds: 0.6, label: "Aufstehen", anchor: "feet", arms: "carry" },
  { to: RACK, seconds: 0.3 },
];

export const CLEAN_AND_JERK: Exercise = {
  key: "clean-and-jerk",
  title: "Squat Clean & Jerk",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [
    ...SQUAT_CLEAN_STEPS,
    { to: DIP, seconds: 0.25, label: "Dip", anchor: "feet", arms: "carry" },
    { to: DRIVE, seconds: 0.14, label: "Ausstoßen", ease: "in", anchor: "feet", arms: "carry" },
    { to: SPLIT, seconds: 0.26, label: "Ausfallschritt", ease: "out", arms: "line" },
    { to: SPLIT, seconds: 0.4 },
    { to: OVERHEAD, seconds: 0.5, label: "Füße zusammen", arms: "line" },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.4,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    ...LOWER,
  ],
};
