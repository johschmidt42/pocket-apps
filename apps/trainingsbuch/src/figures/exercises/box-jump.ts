// Box jump: jump up, stand tall, step down.
import type { Exercise } from "../exercise.ts";
import { ANKLE, BODY, flightHip, GROUND, tiptoe, up, type Pose } from "../skeleton.ts";

const BOX = { x: 106, width: 54, height: 50 };
const TOP = GROUND - BOX.height - ANKLE;

/** The time in the air. With gravity, it gives the height of the jump. */
const AIR = 0.46;

const floor = { x: 70, y: 200 };
const onBox = { x: 126, y: TOP };
/** A foot in the air, behind the edge of the box. A foot must go here before it goes down, or it goes through the box. */
const overEdge = { x: 84, y: TOP - 8 };

type Hip = { x: number; y: number };
/** Where the hands are, relative to the shoulders. */
type Hands = { dx: number; dy: number };

// The arm is 62 long. A hand at this distance gives a straight arm, a nearer hand a bent elbow.
const HANG: Hands = { dx: 3, dy: 60 }; // beside the hips
const THROUGH: Hands = { dx: 8, dy: 48 }; // the arm swings past the hip, with a bent elbow
const BACK: Hands = { dx: -58, dy: 18 }; // straight, behind the body
const SWING: Hands = { dx: 26, dy: -24 }; // in front of the face, elbows a little bent
const AHEAD: Hands = { dx: 30, dy: -4 }; // in front of the chest
const BALANCE: Hands = { dx: 12, dy: 55 }; // a little in front of the hips

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

const STAND = pose({ x: 70, y: 120 }, 2, HANG, { feet: floor });
// Hips back, arms back.
const LOAD = pose({ x: 64, y: 150 }, 45, BACK, { feet: floor, head: -25, elbows: -1 });
// Half of the push: the legs are half straight, and the arms swing past the hips. The elbows point back,
// as in a run. Without this pose, the arms take the short way over the head.
const PUSH = pose({ x: 70, y: 133 }, 24, THROUGH, { feet: floor, head: -12, elbows: -1 });
// Full extension, on the toes.
const TAKEOFF = pose({ x: 76, y: 116 }, 10, SWING, { feet: tiptoe(75, 140), toes: 140 });
// First contact with the box. The legs are a little bent.
const LAND = pose({ x: 114, y: 100 }, 30, AHEAD, { feet: onBox, head: -15 });
// The flight has two poses. The hip is on the path that gravity gives.
// First the feet go up behind the body. Else they hit the edge of the box.
const LIFT_AT = 0.3;
const liftHip = flightHip(TAKEOFF.hip, LAND.hip, AIR, LIFT_AT);
const LIFT = pose(liftHip, 20, SWING, { feet: { x: liftHip.x - 8, y: liftHip.y + 48 }, toes: 150 });
// Then the knees come up and the feet go forward over the box.
const TUCK_AT = 0.62;
const tuckHip = flightHip(TAKEOFF.hip, LAND.hip, AIR, TUCK_AT);
const TUCK = pose(tuckHip, 30, AHEAD, {
  feet: { x: tuckHip.x + 14, y: tuckHip.y + 34 },
  toes: 100,
  head: -15,
});
// The legs take the landing.
const ABSORB = pose({ x: 110, y: 114 }, 40, AHEAD, { feet: onBox, head: -25 });
const TALL = pose({ x: 126, y: TOP - 80 }, 0, HANG, { feet: onBox });
// Step down, backward. Side 1 goes first: back over the edge, then down to the floor.
const BACK_FOOT_UP = pose({ x: 120, y: TOP - 70 }, 12, BALANCE, { feet: [onBox, overEdge] });
const BACK_FOOT_DOWN = pose({ x: 97, y: 124 }, 28, BALANCE, { feet: [onBox, floor], head: -15 });
// The weight is on the floor foot. The other foot comes back over the edge.
const FRONT_FOOT_UP = pose({ x: 80, y: 122 }, 15, BALANCE, { feet: [overEdge, floor] });

export const BOX_JUMP: Exercise = {
  key: "box-jump",
  title: "Box Jump",
  equipment: { kind: "box", ...BOX },
  views: [{ label: "Seite", yaw: 0, box: [18, -30, 156, 242] }],
  start: STAND,
  steps: [
    { to: LOAD, seconds: 0.4, label: "Ausholen", anchor: "feet" },
    // "in": the legs push faster and faster. At the end, the hip has the speed of the flight.
    { to: PUSH, seconds: 0.24, label: "Absprung", ease: "in", anchor: "feet" },
    { to: TAKEOFF, seconds: 0.16, label: "Absprung", ease: "linear", anchor: "feet" },
    { to: LIFT, seconds: AIR * LIFT_AT, label: "Flug", ease: "linear", flight: true, legs: "fk" },
    { to: TUCK, seconds: AIR * (TUCK_AT - LIFT_AT), ease: "linear", flight: true, legs: "fk" },
    { to: LAND, seconds: AIR * (1 - TUCK_AT), ease: "linear", flight: true, legs: "fk" },
    { to: ABSORB, seconds: 0.14, label: "Landung", ease: "out", anchor: "feet" },
    { to: TALL, seconds: 0.45, label: "Aufrichten", anchor: "feet" },
    { to: TALL, seconds: 0.3, label: "Stehen" },
    { to: BACK_FOOT_UP, seconds: 0.3, label: "Absteigen" },
    { to: BACK_FOOT_DOWN, seconds: 0.45 },
    { to: FRONT_FOOT_UP, seconds: 0.35 },
    { to: STAND, seconds: 0.4 },
    { to: STAND, seconds: 0.25, label: "Stehen" },
  ],
};
