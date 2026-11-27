// Standing Broad Jump (Brenton: "30 m standing broad jumps"): from the stand, the hips go back and the arms
// swing back. The legs and the arms drive the body forward and up, the knees come forward in the flight, and the feet
// land together far in front, in a deep squat. Then the figure stands up. A real athlete jumps on: here the figure
// turns around after each jump and jumps back, so the picture stays in place (`turnAxis`).
import type { Exercise, View } from "../exercise.ts";
import { BODY, flightHip, tiptoe, up, type Pose } from "../skeleton.ts";

/** The length of the jump, from ankle to ankle: 1.5 m. */
const DISTANCE = 150;
const START_X = 70;
const FAR_X = START_X + DISTANCE;
/** The time in the air: the hip rises about 36 (942 * 0.55² / 8). */
const AIR = 0.55;

type Hip = { x: number; y: number };
type Hands = { dx: number; dy: number };

const HANG: Hands = { dx: 3, dy: 60 };
const THROUGH: Hands = { dx: 8, dy: 48 };
const BACK: Hands = { dx: -58, dy: 18 };
/** The arms at the takeoff: forward at the height of the shoulders. They swing on up in the flight. */
const FORWARD: Hands = { dx: 50, dy: 10 };
const SWING: Hands = { dx: 40, dy: -40 };
const AHEAD: Hands = { dx: 44, dy: 8 };
const BALANCE: Hands = { dx: 30, dy: 40 };

function pose(
  hip: Hip,
  lean: number,
  hands: Hands,
  rest: Partial<Pose> & Pick<Pose, "feet">,
): Pose {
  const torso = up(lean);
  const shoulder = { x: hip.x + torso.x * BODY.torso, y: hip.y + torso.y * BODY.torso };
  return {
    stance: 8,
    knees: 0.2,
    grip: 14,
    hip,
    lean,
    hands: { x: shoulder.x + hands.dx, y: shoulder.y + hands.dy },
    ...rest,
  };
}

const floor = { x: START_X, y: 200 };
const far = { x: FAR_X, y: 200 };
const STAND = pose({ x: START_X, y: 120 }, 2, HANG, { feet: floor });
// Hips back and down, arms back: as in the box jump.
const LOAD = pose({ x: START_X - 6, y: 150 }, 45, BACK, { feet: floor, head: -25, elbows: -1 });
const PUSH = pose({ x: START_X + 2, y: 134 }, 30, THROUGH, { feet: floor, head: -12, elbows: -1 });
// Full extension on the toes: the body leans forward, the arms point forward and up.
const TAKEOFF = pose({ x: START_X + 12, y: 120 }, 28, FORWARD, {
  feet: tiptoe(START_X + 4, 140),
  toes: 140,
});
// First contact far in front: the feet are ahead of the hips, the legs bent.
const LAND = pose({ x: FAR_X - 20, y: 130 }, 22, AHEAD, { feet: far, head: -12 });
// In the flight the knees come forward and up.
const TUCK_AT = 0.55;
const tuckHip = flightHip(TAKEOFF.hip, LAND.hip, AIR, TUCK_AT);
const TUCK = pose(tuckHip, 25, AHEAD, {
  feet: { x: tuckHip.x + 10, y: tuckHip.y + 44 },
  toes: 110,
  head: -12,
});
const LIFT_AT = 0.25;
const liftHip = flightHip(TAKEOFF.hip, LAND.hip, AIR, LIFT_AT);
const LIFT = pose(liftHip, 26, SWING, {
  feet: { x: liftHip.x - 16, y: liftHip.y + 62 },
  toes: 145,
});
// The legs take the landing: a deep squat, the arms forward for the balance.
const ABSORB = pose({ x: FAR_X - 18, y: 150 }, 38, BALANCE, { feet: far, head: -18 });
const STAND_FAR = pose({ x: FAR_X, y: 120 }, 2, HANG, { feet: far });

const SIDE: View = { label: "Seite", yaw: 0, box: [20, -10, 260, 222] };

export const BROAD_JUMP: Exercise = {
  key: "broad-jump",
  title: "Broad Jump",
  equipment: { kind: "none" },
  views: [SIDE],
  turnAxis: (START_X + FAR_X) / 2,
  start: STAND,
  steps: [
    { to: LOAD, seconds: 0.4, label: "Ausholen", anchor: "feet" },
    { to: PUSH, seconds: 0.2, label: "Absprung", ease: "in", anchor: "feet" },
    { to: TAKEOFF, seconds: 0.16, ease: "linear", anchor: "feet" },
    { to: LIFT, seconds: AIR * LIFT_AT, label: "Flug", ease: "linear", flight: true, legs: "fk" },
    { to: TUCK, seconds: AIR * (TUCK_AT - LIFT_AT), ease: "linear", flight: true, legs: "fk" },
    { to: LAND, seconds: AIR * (1 - TUCK_AT), ease: "linear", flight: true, legs: "fk" },
    { to: ABSORB, seconds: 0.16, label: "Landung", ease: "out", anchor: "feet" },
    { to: STAND_FAR, seconds: 0.5, label: "Aufrichten", anchor: "feet" },
    { to: STAND_FAR, seconds: 0.2 },
    {
      to: STAND,
      seconds: 0.45,
      label: "Drehen",
      ease: "linear",
      turn: true,
      legs: "carry",
      arms: "carry",
    },
  ],
};
