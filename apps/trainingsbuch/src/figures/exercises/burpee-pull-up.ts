// Burpee Pull-up: a burpee (chest and thighs on the floor), a jump to the bar, chin over the bar, and down.
// The way to the floor and back is the burpee, the pull is the strict pull-up. The figure stands under the bar.
// `burpeePullUp()` takes another top: the burpee chest-to-bar pull-up (`burpee-chest-to-bar-pull-up.ts`).
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { GRAVITY, type Pose } from "../skeleton.ts";
import { ABSORB, LAND, RISE, STAND, TAKEOFF, TO_THE_FLOOR } from "./burpee.ts";
import { CHIN_OVER_BAR, HIGH_BODY, LOW_BODY, pose, type Body } from "./pull-up.ts";

/** The bar is 18 above the hands of the figure that stands with its arms up: it must jump to reach it. */
const BAR = { x: 153, y: -6 };

// The hang: long arms, and the toes just above the floor.
const HANG_BODY: Body = {
  back: 0,
  down: 61.8,
  lean: 3,
  legs: 4,
  head: 0,
  elbows: 0.5,
  elbowsOut: 0.4,
};
// The hands reach the bar at the top of the jump. The arms are a little bent, and the pull starts from there.
const GRAB_BODY: Body = {
  back: 2,
  down: 59,
  lean: 2,
  legs: 5,
  head: 0,
  elbows: 0.45,
  elbowsOut: 0.5,
};

const HANG = pose(HANG_BODY, BAR);
const GRAB = pose(GRAB_BODY, BAR);
const PULL_LOW = pose(LOW_BODY, BAR);
const PULL_HIGH = pose(HIGH_BODY, BAR);

// Full extension, on the toes. The arms reach up to the bar.
const REACH: Pose = { ...TAKEOFF, grip: 17, hands: handAt(TAKEOFF.hip, TAKEOFF.lean, 2, -61.5) };

// The hands let go and come down near the body, with bent elbows. With straight arms they swing far to the front.
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

/** The time of the jump to the bar: the hip is near the top of its arc when the hands arrive. */
const JUMP = 0.17;
/** The time of the fall from the hang to the toes: a free fall from rest. */
const DROP = Math.sqrt((2 * (LAND.hip.y - HANG.hip.y)) / GRAVITY);

const SIDE: View = { label: "Seite", yaw: 0, box: [40, -46, 204, 258] };

/** A burpee pull-up to the top `top`. `label` names the top. */
export function burpeePullUp(options: {
  key: string;
  title: string;
  top: Body;
  label: string;
}): Exercise {
  const TOP = pose(options.top, BAR);
  return {
    key: options.key,
    title: options.title,
    equipment: { kind: "pullupbar", ...BAR },
    views: [SIDE],
    start: STAND,
    steps: [
      ...TO_THE_FLOOR,
      { to: RISE, seconds: 0.38, label: "Sprung", ease: "in", anchor: "feet" },
      { to: REACH, seconds: 0.11, ease: "linear", anchor: "feet" },
      { to: GRAB, seconds: JUMP, ease: "linear", flight: true, legs: "carry", arms: "line" },
      {
        to: TOP,
        via: [PULL_LOW, PULL_HIGH],
        seconds: 0.6,
        label: "Zug",
        ease: "soft",
        anchor: "hands",
        legs: "carry",
      },
      { to: TOP, seconds: 0.12, label: options.label },
      {
        to: HANG,
        via: [PULL_HIGH, PULL_LOW],
        seconds: 0.65,
        label: "Ablassen",
        ease: "soft",
        anchor: "hands",
        legs: "carry",
      },
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
}

export const BURPEE_PULL_UP: Exercise = burpeePullUp({
  key: "burpee-pull-up",
  title: "Burpee Pull-up",
  top: CHIN_OVER_BAR,
  label: "Kinn über der Stange",
});
