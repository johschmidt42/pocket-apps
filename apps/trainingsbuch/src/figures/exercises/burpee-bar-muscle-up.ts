// Burpee Bar Muscle-up (Barraza, Pikey): a burpee under the bar, a jump to the bar, a kipping bar muscle-up
// to the support, back down to the hang, and a drop to the floor. The burpee and the jump are those of the burpee
// pull-up, the muscle-up is that of `bar-muscle-up.ts`, moved to a bar above the burpee.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { GRAVITY, type Pose, type Spot, type Step } from "../skeleton.ts";
import { BAR_MUSCLE_UP } from "./bar-muscle-up.ts";
import { ABSORB, LAND, RISE, STAND, TAKEOFF, TO_THE_FLOOR } from "./burpee.ts";

/** The bar of the burpee pull-up: 18 above the hands of the figure that stands with its arms up. */
const BAR = { x: 153, y: -6 };
/** The bar of `bar-muscle-up.ts`. Its poses move by the difference. */
const FROM = BAR_MUSCLE_UP.equipment.kind === "pullupbar" ? BAR_MUSCLE_UP.equipment : BAR;
const dx = BAR.x - FROM.x;
const dy = BAR.y - FROM.y;

const moveSpot = (s: Spot): Spot => ({ ...s, x: s.x + dx, y: s.y + dy });
const moveSpots = (s: Spot | readonly [Spot, Spot]): Spot | readonly [Spot, Spot] =>
  "x" in s ? moveSpot(s) : [moveSpot(s[0]), moveSpot(s[1])];
const move = (p: Pose): Pose => ({
  ...p,
  hip: { x: p.hip.x + dx, y: p.hip.y + dy },
  feet: moveSpots(p.feet),
  hands: moveSpots(p.hands),
});
const moveStep = (s: Step): Step => ({
  ...s,
  to: move(s.to),
  ...(s.via === undefined ? {} : { via: s.via.map(move) }),
});

const HANG = move(BAR_MUSCLE_UP.start);

// Full extension, on the toes. The arms reach up to the bar.
const REACH: Pose = { ...TAKEOFF, grip: 17, hands: handAt(TAKEOFF.hip, TAKEOFF.lean, 2, -61.5) };
// The hands let go and come down near the body, with bent elbows.
const TOUCH_DOWN: Pose = {
  ...LAND,
  grip: 16,
  hands: handAt(LAND.hip, LAND.lean, 26, -6),
  elbows: -0.5,
};
const GIVE: Pose = {
  ...ABSORB,
  grip: 17,
  hands: handAt(ABSORB.hip, ABSORB.lean, 14, 56),
  elbows: -0.3,
};

/** The time of the jump to the bar. */
const JUMP = 0.17;
/** The time of the fall from the hang to the toes: a free fall from rest. */
const DROP = Math.sqrt((2 * (LAND.hip.y - HANG.hip.y)) / GRAVITY);

const SIDE: View = { label: "Seite", yaw: 0, box: [40, -118, 204, 330] };

export const BURPEE_BAR_MUSCLE_UP: Exercise = {
  key: "burpee-bar-muscle-up",
  title: "Burpee Bar Muscle-up",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE],
  start: STAND,
  steps: [
    ...TO_THE_FLOOR,
    { to: RISE, seconds: 0.38, label: "Sprung", ease: "in", anchor: "feet" },
    { to: REACH, seconds: 0.11, ease: "linear", anchor: "feet" },
    { to: HANG, seconds: JUMP, ease: "linear", flight: true, legs: "carry", arms: "line" },
    // The muscle-up, from the first swing back to the hang.
    ...BAR_MUSCLE_UP.steps.slice(1).map(moveStep),
    {
      to: TOUCH_DOWN,
      seconds: DROP,
      label: "Landung",
      ease: "linear",
      flight: true,
      legs: "carry",
    },
    { to: GIVE, seconds: 0.22, ease: "out" },
    { to: STAND, seconds: 0.36, label: "Stehen", ease: "soft", anchor: "feet" },
  ],
};
