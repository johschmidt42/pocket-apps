// Power Clean & Jerk: power clean (the catch is a partial squat), then split jerk.
// A variant of `clean-and-jerk.ts`. Only the extension, the catch and the way up from the catch are different.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, rackAt } from "../poses.ts";
import { tiptoe, type Pose, type Step } from "../skeleton.ts";
import { intoRack, KNEE, LOWER, POWER, SETUP, SHIN, shrugged, THIGH } from "./clean-and-jerk.ts";

const base = { feet: { x: 74, y: 200 }, stance: 10, knees: 0.5, grip: 16 };
// The feet jump out a little in the catch. They stay there for the jerk.
const wide = { ...base, stance: 12 };

// The pull from the floor is the same as in the squat clean: `SETUP`, `SHIN`, `KNEE`, `THIGH`, `POWER`.

// Full extension, higher on the toes than in the squat clean: the legs are straight. The shoulders are up
// (a strong shrug), the arms are still nearly straight: the bar is at the hips.
const EXTEND: Pose = {
  ...base,
  feet: tiptoe(75, 130),
  toes: 130,
  ...shrugged({ x: 77, y: 111.2 }, -6, 87, 6, 6),
};
// The bar stays in front of the torso until it is as high as the shoulders. Then it comes back onto them.
// The feet are just above the floor and move out. The body drops, the arms bend, the bar still rises.
const UNDER: Pose = {
  ...base,
  stance: 11,
  feet: { x: 74.4, y: 198.3 },
  toes: 98,
  hip: { x: 73.3, y: 120.8 },
  lean: 1,
  hands: { x: 86, y: 87 },
  shrug: 4,
  // The elbows are out and a little behind the bar: from here they turn down and forward on one arc.
  elbowTo: -110,
  elbowsOut: 3,
};
// The feet land flat while the bar goes around the shoulders. Then the bar meets the shoulders.
// The hip is so low here that its speed is the same before and after this pose.
const LAND_HIP = { x: 70.2, y: 128.6 };
const LAND: Pose = { ...wide, hip: LAND_HIP, lean: 6.5, ...rackAt(LAND_HIP, 6.5), elbowsOut: 3 };
const [AROUND, ONTO] = intoRack(UNDER, LAND, { t: 0.5, shrug: 2.5 }, { t: 0.8, shrug: 1 });
// The legs give way: a partial squat. The knee angle is about 120 degrees, the thighs are far above parallel.
// The front rack (`rackAt`): the bar is on the shoulders, the elbows are high and in front.
const CATCH: Pose = { ...wide, hip: { x: 68, y: 133 }, lean: 9, ...rackAt({ x: 68, y: 133 }, 9) };

// The jerk: the same as in the squat clean, in the stance of the catch.
const RACK: Pose = { ...wide, hip: { x: 74, y: 120 }, lean: 2, ...rackAt({ x: 74, y: 120 }, 2) };
const DIP: Pose = { ...wide, hip: { x: 74, y: 132 }, lean: 2, ...rackAt({ x: 74, y: 132 }, 2) };
// The bar leaves the shoulders: the hands are 20 above the shoulder joints.
// The bar passes the face: the head goes back out of its way, as in a real press. The check finds a bar in the head.
const DRIVE: Pose = {
  ...wide,
  hip: { x: 74, y: 120 },
  lean: 0,
  head: -26,
  hands: handAt({ x: 74, y: 120 }, 0, 6, -20),
  elbowTo: 60,
};
const PASS: Pose = {
  ...base,
  hip: { x: 74, y: 120 },
  lean: 0,
  head: -26,
  hands: handAt({ x: 74, y: 120 }, 0, 12, -34),
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
const OVERHEAD: Pose = {
  ...base,
  hip: { x: 74, y: 120 },
  lean: 0,
  hands: { x: 76, y: 5 },
  shrug: 3,
};
// The way back to the floor is in the stance of the pull.
const RACK_DOWN: Pose = { ...RACK, stance: 10 };

/** The power clean, from the floor to the stand with the bar in the rack. `power-clean.ts` uses it too. */
export const POWER_CLEAN_STEPS: Step[] = [
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
  // Two steps with one speed of the hip at their border: the bar is on the shoulders after 0.17 s,
  // then the legs give way. The sum is 0.26 s, as before.
  {
    to: LAND,
    via: [UNDER, AROUND, ONTO],
    seconds: 0.17,
    label: "Umsetzen",
    ease: "linear",
    arms: "fk",
  },
  { to: CATCH, seconds: 0.09, ease: "out", anchor: "feet", arms: "carry" },
  { to: CATCH, seconds: 0.15 },
  { to: RACK, seconds: 0.35, label: "Aufstehen", anchor: "feet", arms: "carry" },
  { to: RACK, seconds: 0.3 },
];

export const POWER_CLEAN_AND_JERK: Exercise = {
  key: "power-clean-and-jerk",
  title: "Power Clean & Jerk",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: SETUP,
  steps: [
    ...POWER_CLEAN_STEPS,
    { to: DIP, seconds: 0.25, label: "Dip", anchor: "feet", arms: "carry" },
    { to: DRIVE, seconds: 0.14, label: "Ausstoßen", ease: "in", anchor: "feet", arms: "carry" },
    { to: SPLIT, seconds: 0.26, label: "Ausfallschritt", ease: "out", arms: "line" },
    { to: SPLIT, seconds: 0.4 },
    { to: OVERHEAD, seconds: 0.5, label: "Füße zusammen", arms: "line" },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK_DOWN,
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
