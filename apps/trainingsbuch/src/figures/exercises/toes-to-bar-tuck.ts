// Toes-to-bar with bent legs ("tuck and kick"): back swing, knees to the chest, kick to the bar,
// and down on a wider arc with nearly long legs.
import type { Exercise, View } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The bar is fixed. The hands hold it in each pose. The same numbers as in `toes-to-bar.ts`. */
const BAR = { x: 78, y: 30 };

const RAD = Math.PI / 180;
/** The shoulders are this far from the bar in the side view: the arm is straight (61.93 with the grip of 17). */
const ARM = 61.8;

type Body = {
  /** The angle of the straight arms: 0 is the dead hang, a positive angle puts the shoulders behind the bar. */
  swing: number;
  lean: number;
  /** The angle of the thigh: 0 is straight down, 90 is level and forward, 180 is straight up. */
  thigh: number;
  /** The angle of the shin, on the same scale. The angle at the knee is `180 - (thigh - shin)`. */
  shin: number;
  /** How far the feet turn from the line of the shins toward the shins. */
  flex: number;
  /** The bend of the torso: negative is an arch, positive is a round back. The head turns by half of it. */
  bend: number;
  head: number;
};

/** A direction in the side plane, as an offset: 0 is down, 90 is forward. */
const direction = (angle: number) => ({ x: Math.sin(angle * RAD), y: Math.cos(angle * RAD) });

export function pose(body: Body): Pose {
  const shoulder = {
    x: BAR.x - Math.sin(body.swing * RAD) * ARM,
    y: BAR.y + Math.cos(body.swing * RAD) * ARM,
  };
  const torso = up(body.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  const thigh = direction(body.thigh);
  const shin = direction(body.shin);
  // A straight leg gets 41 per bone: a little more than the leg can reach, so it is straight.
  const bone = body.thigh === body.shin ? 41 : BODY.thigh;
  const feet = { x: hip.x + (thigh.x + shin.x) * bone, y: hip.y + (thigh.y + shin.y) * bone };
  return {
    hip,
    lean: body.lean,
    bend: body.bend,
    head: body.head,
    feet,
    // Narrow: the knees and the feet are between the arms.
    stance: 5,
    knees: 0,
    toes: 180 - body.shin - body.flex,
    hands: BAR,
    grip: 17,
  };
}

/**
 * The top, calculated from the bar. The tips of the toes touch the bar: the feet point at it.
 * The triangle of bar, shoulders and hip then gives the swing and the lean.
 */
function top(thigh: number, shin: number, flex: number, bend: number, head: number): Pose {
  const angle = (180 - shin - flex) * RAD;
  const forward = { x: Math.sin(angle), y: -Math.cos(angle) };
  const sole = { x: Math.cos(angle), y: Math.sin(angle) };
  // The drawn foot is a line from the ankle to the toe (15 long), 1.5 toward the sole, with a round end (4.5).
  // The center of the bar is 20 from the ankle on this line: the round end of the toe touches the bar.
  const ankle = {
    x: BAR.x - forward.x * 20 - sole.x * 1.5,
    y: BAR.y - forward.y * 20 - sole.y * 1.5,
  };
  const upper = direction(thigh);
  const lower = direction(shin);
  const hip = {
    x: ankle.x - (upper.x + lower.x) * BODY.thigh,
    y: ankle.y - (upper.y + lower.y) * BODY.thigh,
  };
  // The shoulders are 61.8 from the bar and 46 from the hip: the point of the two circles that is behind.
  const far = Math.hypot(hip.x - BAR.x, hip.y - BAR.y);
  const along = (ARM ** 2 - BODY.torso ** 2 + far ** 2) / (2 * far);
  const across = Math.sqrt(ARM ** 2 - along ** 2);
  const line = { x: (hip.x - BAR.x) / far, y: (hip.y - BAR.y) / far };
  const shoulder = {
    x: BAR.x + line.x * along - line.y * across,
    y: BAR.y + line.y * along + line.x * across,
  };
  return pose({
    swing: Math.atan2(BAR.x - shoulder.x, shoulder.y - BAR.y) / RAD,
    lean: Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y) / RAD,
    thigh,
    shin,
    flex,
    bend,
    head,
  });
}

// The back swing ("arch"): the body is a bow. The chest is in front of the bar, the legs are long and behind.
const ARCH = pose({ swing: -8, lean: 8, thigh: -26, shin: -26, flex: 10, bend: -26, head: 6 });
// The way up. The knees start to rise, the heels stay behind: the legs fold. The back is nearly flat here.
const FOLD = pose({ swing: 7.5, lean: -4, thigh: 50, shin: -20, flex: 15, bend: 6, head: 0 });
// The tuck: the back is round, the knees are at the height of the chest, the heels are below the knees.
// The angle at the knee is 76 degrees. A pose on the way, no stop.
const TUCK = pose({ swing: 16.3, lean: -30, thigh: 164, shin: 60, flex: 20, bend: 28, head: -6 });
// The touch: the back is round, the pelvis is tilted up toward the bar. The knees are still a little bent
// (155 degrees). The leg angles come from a scan for the balance.
const TOP = top(197, 172, 40, 34, -4);
// The way down: a loose tuck (the knee has 125 degrees or more), the feet go down and back on a wide arc.
const LOOSE = pose({ swing: 18.8, lean: -27, thigh: 135, shin: 80, flex: 25, bend: 24, head: -2 });
const LONG = pose({ swing: 13.5, lean: -12, thigh: 62, shin: 32, flex: 18, bend: 8, head: 0 });
// The long legs pass the hang line. The arch starts.
const HANG = pose({ swing: 1, lean: 0, thigh: 6, shin: 2, flex: 12, bend: -8, head: 0 });

const SIDE: View = { label: "Seite", yaw: 0, box: [6, -18, 172, 266] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 284] };

export const TOES_TO_BAR_TUCK: Exercise = {
  key: "toes-to-bar-tuck",
  title: "Toes-to-bar (angewinkelt)",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE, FRONT],
  ground: false,
  start: ARCH,
  steps: [
    // One step up and one step down. `follow: "feet"` splits the time by the way of the feet: the feet have one
    // smooth speed, the tuck is a pose on the way, and the kick (a long way of the feet) is not the slow end.
    {
      to: TOP,
      seconds: 0.74,
      // One name for each part of the way: to FOLD, to TUCK, to TOP.
      label: ["Anhocken", "Anhocken", "Kick"],
      via: [FOLD, TUCK],
      follow: "feet",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    { to: TOP, seconds: 0.04, label: "Zehen an der Stange" },
    {
      to: ARCH,
      seconds: 0.78,
      label: "Absenken",
      via: [LOOSE, LONG, HANG],
      follow: "feet",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    { to: ARCH, seconds: 0.06, label: "Rückschwung" },
  ],
};
