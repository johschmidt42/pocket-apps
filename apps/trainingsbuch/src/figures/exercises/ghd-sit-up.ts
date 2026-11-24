// GHD Sit-up: the hips on the pad of a glute-ham developer, the feet in its rollers. The torso goes back and
// down until the hands touch the floor behind the GHD, then the athlete sits up and touches the foot plate. The hips and
// the feet stay on their spots; only the torso and the arms move. (CrossFit: hands to the floor, hands to the footplate.)
import type { Exercise } from "../exercise.ts";
import { GHD } from "../machines.ts";
import { up, type Pose, type Spot } from "../skeleton.ts";

/** The middle of the hip pad. */
const X = 80;
/**
 * The hip joint is over the back of the arched pad, 14 behind its middle: the glutes lie on the curve (its surface is 3
 * below the top there), and the low back can arch over it.
 */
const HIP = { x: X - 14, y: GHD.padTop - 6 };
/** The ankles in the rollers. The feet point up, the soles push against the plate. */
const ANKLE = { x: X + GHD.foot.dx, y: GHD.foot.y };

/**
 * A pose from the lean of the torso and the place of the hands. `bend` below 0 is an arch: the spine extends over the
 * pad at the bottom.
 */
function pose(lean: number, head: number, hands: Spot, elbowTo = 0, bend = 0): Pose {
  return {
    hip: HIP,
    lean,
    bend,
    head,
    feet: ANKLE,
    toes: 10,
    stance: 7,
    knees: 0,
    hands,
    grip: 13,
    elbowTo,
    elbowsOut: 0.3,
  };
}

/** The hands `reach` beyond the shoulders, in the line of the torso: arms overhead. */
function overhead(lean: number, reach: number): Spot {
  const along = up(lean);
  return { x: HIP.x + along.x * (46 + reach), y: HIP.y + along.y * (46 + reach) };
}

// The top: a short touch. The torso leans 45 degrees forward, and the hands tap the top of the foot plate from above.
// Before 2026-11-24 the torso folded to 66 degrees and the forearms pushed to the feet.
const TOP = pose(45, -8, { x: ANKLE.x + 11, y: ANKLE.y - 17 }, 80);
// On the way up: the torso comes forward, the hands arrive above the foot plate, not beside it.
const FORWARD = pose(35, -8, { x: ANKLE.x + 8, y: ANKLE.y - 50 }, 100);
// On the way: the torso is upright, the arms are overhead.
const UPRIGHT = pose(0, 0, overhead(0, 58));
// The torso is back, a little below level. The arms lead, in the line of the torso.
const BACK = pose(-100, 6, overhead(-100, 58), 0, -14);
// The bottom: the torso hangs down behind the pad, the back arches, the hands touch the floor behind the GHD.
const BOTTOM = pose(-165, 10, { x: HIP.x - 36, y: 201.5 }, 180, -34);

export const GHD_SIT_UP: Exercise = {
  key: "ghd-sit-up",
  title: "GHD Sit-up",
  equipment: { kind: "ghd", x: X },
  views: [{ label: "Seite", yaw: 0, box: [-30, 10, 220, 204] }],
  start: TOP,
  steps: [
    { to: TOP, seconds: 0.04, label: "Kurz berühren" },
    {
      to: BOTTOM,
      via: [FORWARD, UPRIGHT, BACK],
      seconds: 1.0,
      label: "Zurück",
      ease: "soft",
      legs: "line",
      arms: "fk",
    },
    { to: BOTTOM, seconds: 0.08, label: "Hände am Boden" },
    {
      to: TOP,
      via: [BACK, UPRIGHT, FORWARD],
      seconds: 1.05,
      label: "Hoch",
      ease: "soft",
      legs: "line",
      arms: "fk",
    },
  ],
};
