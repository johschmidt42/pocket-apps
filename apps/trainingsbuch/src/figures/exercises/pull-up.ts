// Strict pull-up: hang, pull, chin over the bar, and down with control. No swing.
import type { Exercise, View } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The bar is fixed. The hands hold it in each pose. */
const BAR = { x: 78, y: 30 };

const RAD = Math.PI / 180;

export type Body = {
  /** Where the shoulders are, seen from the bar: `back` behind it (toward -x), `down` below it. */
  back: number;
  down: number;
  lean: number;
  /** The angle of the straight legs: 0 is straight down, a positive angle is forward. */
  legs: number;
  head: number;
  elbows: number;
  elbowsOut: number;
  /** The bend of the torso: a negative value is an arch (the chest goes to the bar). */
  bend?: number;
};

/** A pose in a hang from the bar at `bar`. The burpee pull-up has its bar at another place. */
export function pose(body: Body, bar: { x: number; y: number } = BAR): Pose {
  const shoulder = { x: bar.x - body.back, y: bar.y + body.down };
  const torso = up(body.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  // 82 is a little more than the leg can reach: the legs are straight.
  const feet = {
    x: hip.x + Math.sin(body.legs * RAD) * 82,
    y: hip.y + Math.cos(body.legs * RAD) * 82,
  };
  const bend = body.bend ?? 0;
  return {
    hip,
    lean: body.lean,
    bend,
    // The head follows the chest, which turns by half the bend. `head` stays the tilt against the line of the torso.
    head: body.head - bend / 2,
    feet,
    stance: 5,
    knees: 0,
    // The toes point down, nearly in line with the legs.
    toes: 165 - body.legs,
    hands: bar,
    grip: 17,
    elbows: body.elbows,
    elbowsOut: body.elbowsOut,
  };
}

// The hang: the shoulders are straight below the bar, the arms are long (61.8 in the side plane is 61.93 with
// the grip that is 4 wider than the shoulder joint). A light hollow: the legs are a little in front.
// `elbows` and `elbowsOut` do nothing in the hang itself (the arm is straight). They set where the elbows go in
// the first half of the pull: out to the sides and a little forward, so that the forearms stay under the bar.
const HANG = pose({ back: 0, down: 61.8, lean: 3, legs: 9, head: 0, elbows: 0.5, elbowsOut: 0.4 });
// The top: the shoulders are behind the bar and a little below it, the torso leans back. The chin is above the
// bar, the bar is at the top of the chest. The elbows are below the shoulders, beside the ribs.
// With the elbow values of the four poses, the elbow goes out to the side on the whole way up (to 24.5) and
// comes back in by only 0.6 units at the end. Values that point back (negative `elbows`) gave a swing of the elbow in the side view.
// A light arch at the top (added on 2026-11-21, when the torso learned to bend): the chest goes to the bar.
// The chin is 3 above the bar and the shoulders are 11 below it. Before 2026-11-22 the shoulders were 7 below
// the bar and the chin 6.9 above it: the user asked for "the chin just over the bar".
export const CHIN_OVER_BAR: Body = {
  back: 13,
  down: 11,
  lean: -12,
  legs: 14,
  head: 6,
  elbows: 0,
  elbowsOut: 1.1,
  bend: -14,
};

// Two poses on the way, for `via`. Without them, the body nearly stops for 0.25 s after the hang: the arm bones
// turn at a constant rate, and a turn of a nearly straight arm lifts the body very little.
// Their shoulders are on the arc that the engine made without them. Their leans (-1 and -6.2) are tuned with the
// numbers: the lean rate is then nearly the same on the two sides of each of these poses (no corner in the time chart).
export const LOW_BODY: Body = {
  back: 7.2,
  down: 54.7,
  lean: -1,
  legs: 10,
  head: 1,
  elbows: 0.4,
  elbowsOut: 0.55,
};
const LOW = pose(LOW_BODY);
// Here the head passes the bar. The head tilt is 0, so that the face stays about 4 units behind the bar.
export const HIGH_BODY: Body = {
  back: 14,
  down: 34,
  lean: -6.2,
  legs: 12,
  head: 0,
  elbows: 0.25,
  elbowsOut: 0.75,
  bend: -7,
};
const HIGH = pose(HIGH_BODY);

const SIDE: View = { label: "Seite", yaw: 0, box: [8, -18, 130, 284] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 284] };

/**
 * The strict pull-up, to the top `top`. The chest-to-bar pull-up is the same motion with a higher top
 * (`chest-to-bar-pull-up.ts`).
 */
export function pullUp(options: {
  key: string;
  title: string;
  top: Body;
  label: string;
}): Exercise {
  const TOP = pose(options.top);
  return {
    key: options.key,
    title: options.title,
    equipment: { kind: "pullupbar", ...BAR },
    views: [SIDE, FRONT],
    ground: false,
    start: HANG,
    steps: [
      { to: HANG, seconds: 0.3, label: "Hang" },
      // "hands": the arm bones turn, the shoulders go on an arc around the bar, and the hands stay on it.
      // `via`: one step for the whole way, with one ease. The engine splits the time by the distance.
      // "carry": the legs keep their place below the hip. They stay quiet.
      {
        to: TOP,
        seconds: 1.0,
        label: "Zug",
        via: [LOW, HIGH],
        ease: "soft",
        anchor: "hands",
        legs: "carry",
      },
      { to: TOP, seconds: 0.2, label: options.label },
      {
        to: HANG,
        seconds: 1.3,
        label: "Ablassen",
        via: [HIGH, LOW],
        ease: "soft",
        anchor: "hands",
        legs: "carry",
      },
    ],
  };
}

export const PULL_UP: Exercise = pullUp({
  key: "pull-up",
  title: "Strict Pull-up",
  top: CHIN_OVER_BAR,
  label: "Kinn über der Stange",
});
