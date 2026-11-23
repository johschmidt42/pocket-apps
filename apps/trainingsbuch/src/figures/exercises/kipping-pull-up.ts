// Kipping pull-up (the gymnastic kip): arch, hollow, hip drive and pull, chin over the bar, push away.
import type { Exercise, View } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The bar is fixed. The hands hold it in each pose. The same numbers as in `pull-up.ts` and `toes-to-bar.ts`. */
const BAR = { x: 78, y: 30 };

const RAD = Math.PI / 180;
/** The shoulders are this far from the bar in the side view when the arm is straight (61.93 with the grip of 17). */
const ARM = 61.8;

export type Body = {
  /** The angle of the line from the bar to the shoulders: 0 is the dead hang, a positive angle puts the shoulders behind the bar. */
  swing: number;
  /** The distance from the bar to the shoulders in the side view. Without it, the arm is straight. */
  reach?: number;
  lean: number;
  /** The bend of the torso: a positive value is a round back (hollow), a negative value is an arch. */
  bend: number;
  /** The angle of the straight legs: 0 is straight down, a positive angle is forward. In line with the torso: `-lean`. */
  legs: number;
  /** The tilt of the head against the line of the torso. The helper removes the half bend that the chest adds. */
  head: number;
  elbows?: number;
  elbowsOut?: number;
};

function pose(body: Body): Pose {
  const reach = body.reach ?? ARM;
  const shoulder = {
    x: BAR.x - Math.sin(body.swing * RAD) * reach,
    y: BAR.y + Math.cos(body.swing * RAD) * reach,
  };
  const torso = up(body.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  // 82 is a little more than the leg can reach: the legs are straight.
  const feet = {
    x: hip.x + Math.sin(body.legs * RAD) * 82,
    y: hip.y + Math.cos(body.legs * RAD) * 82,
  };
  return {
    hip,
    lean: body.lean,
    bend: body.bend,
    head: body.head - body.bend / 2,
    feet,
    // The legs are together.
    stance: 5,
    knees: 0,
    // Pointed toes: nearly in line with the legs.
    toes: 172 - body.legs,
    hands: BAR,
    grip: 17,
    elbows: body.elbows ?? 0.5,
    elbowsOut: body.elbowsOut ?? 0.4,
  };
}

// The arch, the front of the swing: the chest is through the arms, the shoulders are in front of the bar.
// The hips are open: the legs are 20 degrees behind the line of the torso (`-lean`).
const ARCH = pose({ swing: -13, lean: 7, bend: -28, legs: -27, head: 0 });
// The shoulders start the swing: they are behind the bar already, and the legs still trail.
const LEAD = pose({ swing: 2, lean: 1, bend: -2, legs: 0, head: 0 });
// The hollow, the back of the swing: the shoulders are behind the bar, the back is round, the legs are in front.
const HOLLOW = pose({ swing: 20, lean: -6, bend: 24, legs: 28, head: 0 });
// The hip drive: the hollow opens (the legs are nearly in line with the torso), the hips go up and forward.
// The arms only start to bend.
const DRIVE = pose({
  swing: 26,
  reach: 55,
  lean: -13,
  bend: 18,
  legs: 19,
  head: 0,
  elbows: 0.4,
  elbowsOut: 0.55,
});
// The pull: the body is light, the elbows bend. The head passes the bar on its back side.
const PULL = pose({
  swing: 31,
  reach: 38,
  lean: -19,
  bend: 12,
  legs: 23,
  head: 0,
  elbows: 0.25,
  elbowsOut: 0.75,
});
// The top: the chin is above the bar, the torso leans back, the chest is near the bar, the legs are in front.
// A turn point, no hold.
// The chin is 3 above the bar and the shoulders are 10 below it: a pull-up, not a chest-to-bar pull-up.
// Before 2026-11-22 the shoulders were only 4.6 below the bar and the chin 8.4 above it (`swing: 72, reach: 15,
// lean: -22, legs: 34`): the user saw that this is the top of a chest-to-bar pull-up.
const CHIN_OVER_BAR: Body = {
  swing: 49,
  reach: 16,
  lean: -18,
  bend: 8,
  legs: 30,
  head: 6,
  elbows: 0,
  elbowsOut: 1.1,
};
// The push away: the arms push the body back and down, away from the bar.
const PUSH = pose({
  swing: 38,
  reach: 44,
  lean: -14,
  bend: 12,
  legs: 30,
  head: 0,
  elbows: 0.25,
  elbowsOut: 0.75,
});
// The arms are straight again: the body is behind the bar and below it, in a light hollow.
const BACK = pose({ swing: 22, lean: -6, bend: 16, legs: 24, head: 0 });
// The body swings forward through the hang line. The chest leads, the legs trail.
const THROUGH = pose({ swing: 5, lean: 1, bend: -4, legs: -2, head: 0 });

const SIDE: View = { label: "Seite", yaw: 0, box: [6, -18, 150, 266] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 266] };

/**
 * The kipping pull-up, to the top `top`. The kipping chest-to-bar pull-up is the same motion with a higher top
 * (`kipping-chest-to-bar-pull-up.ts`).
 */
export function kippingPullUp(options: {
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
    start: ARCH,
    steps: [
      {
        to: TOP,
        seconds: 0.8,
        label: ["Hohl", "Hohl", "Hüfte und Zug", "Hüfte und Zug", options.label],
        via: [LEAD, HOLLOW, DRIVE, PULL],
        ease: "soft",
        anchor: "hands",
        legs: "fk",
      },
      {
        to: ARCH,
        seconds: 0.75,
        label: ["Wegdrücken", "Wegdrücken", "Bogen", "Bogen"],
        via: [PUSH, BACK, THROUGH],
        ease: "soft",
        anchor: "hands",
        legs: "fk",
      },
    ],
  };
}

export const KIPPING_PULL_UP: Exercise = kippingPullUp({
  key: "kipping-pull-up",
  title: "Kipping Pull-up",
  top: CHIN_OVER_BAR,
  label: "Kinn über der Stange",
});
