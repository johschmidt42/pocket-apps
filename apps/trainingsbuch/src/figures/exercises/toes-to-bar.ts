// Toes-to-bar with a tight kip: a small back swing, the straight legs go up to the bar, and down again.
import type { Exercise, View } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The bar is fixed. The hands hold it in each pose. The same numbers as in `pull-up.ts`. */
const BAR = { x: 78, y: 30 };

const RAD = Math.PI / 180;
/** The shoulders are this far from the bar in the side view: the arm is straight (61.93 with the grip of 17). */
const ARM = 61.8;

const KNEE_LEGS = 175;
const KNEE = 0;
const FLEX = 50;

type Body = {
  /** The angle of the straight arms: 0 is the dead hang, a positive angle puts the shoulders behind the bar. */
  swing: number;
  lean: number;
  /** The bend of the torso: a positive value is a round back (hollow), a negative value is an arch. */
  bend: number;
  /** The angle of the legs (the line from the hip to the ankle): 0 is straight down, 90 is level and forward, 180 is straight up. */
  legs: number;
  /** The bend of the knees in degrees. 0 is a straight leg. */
  knee: number;
  /** How far the feet turn from the line of the shins toward the shins. */
  flex: number;
  head: number;
};

const direction = (degrees: number) => ({ x: Math.sin(degrees * RAD), y: Math.cos(degrees * RAD) });

/** From the hip to the ankle. With a bent knee, the thigh is ahead of the leg line, and the shin is behind it. */
function leg(legs: number, knee: number): { x: number; y: number } {
  const thigh = direction(legs + knee / 2);
  const shin = direction(legs - knee / 2);
  // A straight leg aims at a spot that is a little too far (82): then it is exactly straight.
  const length = knee === 0 ? 41 : BODY.thigh;
  return { x: (thigh.x + shin.x) * length, y: (thigh.y + shin.y) * length };
}

function pose(body: Body): Pose {
  const shoulder = {
    x: BAR.x - Math.sin(body.swing * RAD) * ARM,
    y: BAR.y + Math.cos(body.swing * RAD) * ARM,
  };
  const torso = up(body.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  const toAnkle = leg(body.legs, body.knee);
  return {
    hip,
    lean: body.lean,
    bend: body.bend,
    head: body.head,
    feet: { x: hip.x + toAnkle.x, y: hip.y + toAnkle.y },
    // Narrow: at the top, the feet are between the hands.
    stance: 5,
    knees: 0,
    toes: 180 - (body.legs - body.knee / 2) - body.flex,
    hands: BAR,
    grip: 17,
  };
}

/**
 * The top, calculated from the bar. The tips of the toes touch the bar: the feet point at it.
 * The triangle of bar, shoulders and hip then gives the swing and the lean.
 */
function top(body: Omit<Body, "swing" | "lean">): Pose {
  const angle = (180 - (body.legs - body.knee / 2) - body.flex) * RAD;
  const forward = { x: Math.sin(angle), y: -Math.cos(angle) };
  const sole = { x: Math.cos(angle), y: Math.sin(angle) };
  // The drawn foot is a line from the ankle to the toe (15 long), 1.5 toward the sole, with a round end (4.5).
  // The center of the bar is 20 from the ankle on this line: the round end of the toe touches the bar.
  const ankle = {
    x: BAR.x - forward.x * 20 - sole.x * 1.5,
    y: BAR.y - forward.y * 20 - sole.y * 1.5,
  };
  const toAnkle =
    body.knee === 0
      ? { x: direction(body.legs).x * 80, y: direction(body.legs).y * 80 }
      : leg(body.legs, body.knee);
  const hip = { x: ankle.x - toAnkle.x, y: ankle.y - toAnkle.y };
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
    ...body,
    swing: Math.atan2(BAR.x - shoulder.x, shoulder.y - BAR.y) / RAD,
    lean: Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y) / RAD,
  });
}

// The back swing ("arch"): the body is a bow. The chest is in front of the bar, the hips and the legs are behind.
// The head follows the chest (half the bend): `head` turns it back, so that the eyes look forward.
const ARCH = pose({ swing: -8, lean: 8, bend: -26, legs: -26, knee: 0, flex: 10, head: 8 });
// The legs pass the hang line. The back starts to round, the shoulders start to go back.
const HOLLOW = pose({ swing: 6, lean: -6, bend: 2, legs: 28, knee: 0, flex: 15, head: 0 });
// The legs are level. The shoulders and the hip are behind the bar: they balance the legs.
const LEVEL = pose({ swing: 16, lean: -18, bend: 18, legs: 85, knee: 0, flex: 25, head: -5 });
const HIGH = pose({ swing: 19.5, lean: -29, bend: 27, legs: 135, knee: 0, flex: 35, head: -4 });
// The top: a round back, the pelvis is tilted up toward the bar.
const TOP = top({ bend: 30, legs: KNEE_LEGS, knee: KNEE, flex: FLEX, head: 0 });

const SIDE: View = { label: "Seite", yaw: 0, box: [6, -18, 172, 266] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-65, -18, 130, 284] };

export const TOES_TO_BAR: Exercise = {
  key: "toes-to-bar",
  title: "Toes-to-bar",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE, FRONT],
  ground: false,
  start: ARCH,
  steps: [
    {
      to: TOP,
      seconds: 0.85,
      label: "Beine hoch",
      via: [HOLLOW, LEVEL, HIGH],
      ease: "soft",
      anchor: "hands",
      legs: "fk",
      follow: "feet",
    },
    { to: TOP, seconds: 0.06, label: "Zehen an der Stange" },
    {
      to: ARCH,
      seconds: 0.85,
      label: "Absenken",
      via: [HIGH, LEVEL, HOLLOW],
      ease: "soft",
      anchor: "hands",
      legs: "fk",
      follow: "feet",
    },
    { to: ARCH, seconds: 0.06, label: "Rückschwung" },
  ],
};
