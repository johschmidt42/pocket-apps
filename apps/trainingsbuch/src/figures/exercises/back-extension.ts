// Back Extension on a GHD (Michael, Cameron, Stephen): the athlete lies face down, the front of the hips on
// the pad, the feet behind in the rollers, the legs straight, the arms crossed on the chest. The torso goes down at the
// hips until it hangs nearly straight down, and comes back up until the body is one straight line. The hips and the
// feet stay on their spots.
import type { Exercise } from "../exercise.ts";
import { GHD } from "../machines.ts";
import { up, type Pose } from "../skeleton.ts";

/** The middle of the hip pad. The foot plate and the rollers are behind it (`mirror`). */
const X = 100;
/** The hip joint is just in front of the pad: the thighs lie on it, the torso can hang down in front of it. */
const HIP = { x: X + GHD.padHalf + 2, y: GHD.padTop - 6 };
/** The ankles in the rollers, behind the pad: the legs are straight (79.5 of 80). The feet point down. */
const ANKLE = { x: HIP.x - 79.5, y: GHD.foot.y };

/** A pose from the lean of the torso (90 is level, 180 is straight down) and its bend (positive is round). */
function pose(lean: number, bend: number, head: number): Pose {
  const along = up(lean + bend / 2);
  const front = { x: -along.y, y: along.x };
  const shoulder = { x: HIP.x + up(lean).x * 46, y: HIP.y + up(lean).y * 46 };
  // The arms are crossed on the chest: the hands are below the shoulders, in front of the chest.
  const hands = {
    x: shoulder.x - along.x * 10 + front.x * 13,
    y: shoulder.y - along.y * 10 + front.y * 13,
  };
  return {
    hip: HIP,
    lean,
    bend,
    head,
    feet: ANKLE,
    toes: 180,
    stance: 7,
    knees: 0,
    hands,
    grip: 4,
    elbowTo: 0,
    elbowsOut: 1.2,
  };
}

// The top: the body is one straight line, level. The eyes look at the floor a little in front.
const TOP = pose(88, 0, -6);
const HALF = pose(130, 8, 4);
// The bottom: the torso hangs nearly straight down in front of the pad, the back is a little round.
const BOTTOM = pose(170, 18, 10);

export const BACK_EXTENSION: Exercise = {
  key: "back-extension",
  title: "Back Extension",
  equipment: { kind: "ghd", x: X, mirror: true, foot: X - ANKLE.x },
  views: [{ label: "Seite", yaw: 0, box: [-20, 10, 240, 204] }],
  start: TOP,
  steps: [
    { to: TOP, seconds: 0.25, label: "Oben" },
    {
      to: BOTTOM,
      via: [HALF],
      seconds: 1.0,
      label: "Absenken",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
    { to: BOTTOM, seconds: 0.1, label: "Unten" },
    {
      to: TOP,
      via: [HALF],
      seconds: 0.9,
      label: "Aufrichten",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
  ],
};
