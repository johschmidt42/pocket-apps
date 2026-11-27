// Medicine-ball Clean (Ledesma, Lorenzo): the ball lies on the floor between the feet. The hands hold it at
// its sides. The legs and the hips drive up, the shoulders shrug, the ball rises near the body, and the athlete drops
// under it into a full squat with the ball at the chest, as in the wall ball. Then the athlete stands up, and the ball
// goes back to the floor.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { BALL, BODY, GROUND, tiptoe, type Pose } from "../skeleton.ts";

/** The hands hold the ball at its sides: as in the wall ball. */
const GRIP = 15;
/** The feet are a little wider than in the wall ball: the ball lies between them. */
const STANCE = 15;
const FEET = { x: 74, y: 200 };
/** A straight arm in the side view: the hand is `GRIP - 13` out to the side of the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
/** The ball lies on the floor. The hands are `BALL.above` below its center. */
const ON_FLOOR = { x: 84, y: GROUND - BALL.radius + BALL.above };

const base = { feet: FEET, stance: STANCE, knees: 0.55, grip: GRIP };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A pose with straight arms: the hands are at `hands`, and the hip is as high as the arms permit. */
function pulled(hipX: number, lean: number, hands: { x: number; y: number }, head: number): Pose {
  const joint = shoulderOf({ x: hipX, y: 0 }, lean);
  const hipY = hands.y - Math.sqrt(REACH ** 2 - (hands.x - joint.x) ** 2) - joint.y;
  return {
    ...base,
    hip: { x: hipX, y: hipY },
    lean,
    head,
    hands,
    elbows: 0,
    elbowTo: 150,
    elbowsOut: 1,
  };
}

/** The ball in front of the chest, under the chin, as in the rack of the wall ball. */
const racked = (hip: { x: number; y: number }, lean: number, head: number): Pose => ({
  ...base,
  hip,
  lean,
  head,
  hands: handAt(hip, lean, 25, 1),
  elbows: 0.6,
  elbowsOut: 0.5,
});

// The ball on the floor. The hips are back and a little above the knees, the back is flat, the eyes look forward.
const FLOOR = pulled(44, 56, ON_FLOOR, -34);
// The legs push: the ball passes the knees. The torso keeps most of its angle.
const KNEE = pulled(52, 46, { x: 88, y: 164 }, -28);
// Hips and knees open, on the toes, with a shrug. The arms are still long.
const TOES = 120;
const EXTEND: Pose = (() => {
  const feet = tiptoe(75, TOES);
  const hip = { x: 76, y: feet.y - Math.sqrt(79.6 ** 2 - (STANCE - 7) ** 2 - (76 - feet.x) ** 2) };
  return { ...pulled(76, -4, { x: 86, y: 128 }, -4), hip, feet, toes: TOES, shrug: 5 };
})();
// The ball rises near the body to the chest. The elbows go up and out, the feet come back to the floor.
const PULL: Pose = {
  ...base,
  hip: { x: 74, y: 122 },
  lean: 2,
  head: -6,
  hands: { x: 92, y: 88 },
  shrug: 3,
  elbowTo: 150,
  elbowsOut: 2,
};
// The athlete drops under the ball: the elbows turn under it, the ball is at the chest.
const UNDER = racked({ x: 69, y: 136 }, 8, -18);
// The catch in the full squat: the hip joint is below the knee joint, the ball is at the chest (the wall ball).
const BOTTOM = racked({ x: 58, y: 174 }, 20, -30);
const UP = racked({ x: 62, y: 154 }, 16, -24);
const STAND = racked({ x: 74, y: 121 }, 1, -14);
// The way down: the ball goes down in front of the body, the hips go back.
const BELLY: Pose = {
  ...base,
  hip: { x: 70, y: 126 },
  lean: 12,
  head: -10,
  hands: { x: 90, y: 124 },
  elbows: 0.3,
  elbowsOut: 0.6,
};
const LOW = pulled(mix(44, 52, 0.5), 50, { x: 87, y: 176 }, -30);

export const MEDICINE_BALL_CLEAN: Exercise = {
  key: "medicine-ball-clean",
  title: "Medicine-ball Clean",
  equipment: { kind: "medicineball" },
  views: [SIDE, FRONT],
  start: FLOOR,
  steps: [
    { to: FLOOR, seconds: 0.2, label: "Start" },
    // "fk": the arms are ropes, the legs and the hips lift the ball.
    {
      to: EXTEND,
      via: [KNEE],
      seconds: 0.45,
      label: "Zug",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: PULL, seconds: 0.14, label: "Umsetzen", ease: "linear", arms: "fk" },
    { to: UNDER, seconds: 0.12, ease: "linear", anchor: "feet", arms: "fk" },
    { to: BOTTOM, seconds: 0.22, label: "Fangen", ease: "out", anchor: "feet", arms: "carry" },
    { to: BOTTOM, seconds: 0.12 },
    {
      to: STAND,
      via: [UP],
      seconds: 0.6,
      label: "Aufstehen",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: STAND, seconds: 0.25 },
    {
      to: FLOOR,
      via: [BELLY, LOW],
      seconds: 0.8,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
  ],
};
