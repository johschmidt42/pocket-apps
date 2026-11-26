// Devil Press: a burpee with the hands on two dumbbells, then the dumbbells from the floor to overhead.
// The standard (Wodapalooza, Rogue): the chest touches the floor between the dumbbells, and the dumbbells go from the
// floor to overhead in one motion, with no stop on the shoulders. This file is that form: a snatch with two
// dumbbells. `devil-press-clean.ts` is the scaled form with a clean to the shoulders and a push press.
// The burpee is the one of `burpee.ts`, moved to the feet of the lifts (x = 74). The hands hold the handles, 7 above
// the floor, a little wider than in the burpee: the chest goes down between the dumbbells.
import { FRONT, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, tiptoe, tiptoeFromToe, type Pose, type Step } from "../skeleton.ts";
import { EXTEND, HANG, POWER, pulled } from "./dumbbell-squat-clean.ts";
import { locked, TOP } from "./dumbbell-thruster.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;

/** The ankles of the figure that stands: the same spot as in the other dumbbell lifts. */
export const FEET_X = 74;
const FLAT = { x: FEET_X, y: GROUND - 6 };
/** The hand on the handle of a dumbbell on the floor: the plates (radius 7) touch the ground. */
const HAND_Y = GROUND - 7;
/** The dumbbells are 32 in front of the ankles, as the hands of the burpee. */
const HANDS = { x: FEET_X + 32, y: HAND_Y };
/** The grip of the clean: the dumbbells pass the outside of the legs, and the chest fits between them. */
const GRIP = 24;
/** The stance of the lifts. The feet are in the air when they go back and come forward, so the plank can be narrower. */
const STANCE = 11;
const PLANK_STANCE = BODY.hipHalf;

// ---------- The plank and the push-up, as in `burpee.ts` ----------

const TOP_TOES = 160;
const BOTTOM_TOES = 172;
function tiltFor(shoulderY: number, toes: number): number {
  return Math.asin((tiptoeFromToe(0, toes).y - shoulderY) / (LEG + BODY.torso)) / RAD;
}
const TOP_TILT = tiltFor(
  HAND_Y - Math.sqrt(61.97 ** 2 - (GRIP - BODY.shoulderHalf) ** 2),
  TOP_TOES,
);
const PLANK_TOE_X =
  HANDS.x - (tiptoeFromToe(0, TOP_TOES).x + Math.cos(TOP_TILT * RAD) * (LEG + BODY.torso));

function line(tilt: number, toes: number) {
  const ankle = tiptoeFromToe(PLANK_TOE_X, toes);
  const along = { x: Math.cos(tilt * RAD), y: -Math.sin(tilt * RAD) };
  const hip = { x: ankle.x + along.x * LEG, y: ankle.y + along.y * LEG };
  return { ankle, hip, lean: 90 - tilt, toes };
}

type Elbows = { elbowTo: number; elbowsOut: number };
const TOP_ELBOWS: Elbows = { elbowTo: -100, elbowsOut: 0 };
const LOW_ELBOWS: Elbows = { elbowTo: -110, elbowsOut: 0.1 };
const BOTTOM_ELBOWS: Elbows = { elbowTo: -175, elbowsOut: 0.2 };

function onHands(b: ReturnType<typeof line>, head: number, elbows: Elbows): Pose {
  return {
    hip: b.hip,
    lean: b.lean,
    head,
    feet: b.ankle,
    toes: b.toes,
    stance: PLANK_STANCE,
    knees: 0,
    hands: HANDS,
    grip: GRIP,
    ...elbows,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const CHEST_Y = GROUND - 9.5;
const FLOOR_TILT = tiltFor(CHEST_Y, BOTTOM_TOES);
const PART = 0.6;

const PLANK = onHands(line(TOP_TILT, TOP_TOES), -8, TOP_ELBOWS);
const LOW = onHands(
  line(mix(TOP_TILT, FLOOR_TILT, PART), mix(TOP_TOES, BOTTOM_TOES, PART)),
  -18,
  LOW_ELBOWS,
);
const bottomAnkle = tiptoeFromToe(PLANK_TOE_X, BOTTOM_TOES);
const HIP_ON_FLOOR = CHEST_Y - 0.5;
const bottomHip = {
  x: bottomAnkle.x + Math.sqrt(LEG * LEG - (HIP_ON_FLOOR - bottomAnkle.y) ** 2),
  y: HIP_ON_FLOOR,
};
const BOTTOM = onHands(
  {
    ankle: bottomAnkle,
    hip: bottomHip,
    lean: 90 + Math.asin(0.5 / BODY.torso) / RAD,
    toes: BOTTOM_TOES,
  },
  -26,
  BOTTOM_ELBOWS,
);

// ---------- The feet go back and come forward ----------

const dx = FEET_X - 150;
/** A deep squat with the hands on the dumbbells: the start of the loop, and the end of the jump forward. */
export const CROUCH: Pose = {
  hip: { x: 130 + dx, y: 164 },
  lean: 62,
  head: -30,
  feet: FLAT,
  stance: STANCE,
  knees: 0.5,
  hands: HANDS,
  grip: GRIP,
  ...TOP_ELBOWS,
};
const KICK: Pose = {
  hip: { x: 135 + dx, y: 153 },
  lean: 74,
  head: -22,
  feet: { x: 98 + dx, y: 174 },
  toes: 125,
  stance: PLANK_STANCE,
  knees: 0.2,
  hands: HANDS,
  grip: GRIP,
  ...TOP_ELBOWS,
};
const TUCK: Pose = {
  ...KICK,
  hip: { x: 136 + dx, y: 153 },
  feet: { x: 104 + dx, y: 176 },
  toes: 120,
  stance: STANCE,
  knees: 0.3,
};
const TOUCH: Pose = { ...CROUCH, hip: { x: 131 + dx, y: 160 }, lean: 64 };

/** From the deep squat to the floor, the push-up, and back to the deep squat. The hands stay on the dumbbells. */
export const BURPEE: Step[] = [
  { to: KICK, seconds: 0.26, label: "Füße zurück", ease: "in", arms: "line" },
  { to: PLANK, seconds: 0.17, ease: "out", arms: "line" },
  {
    to: LOW,
    seconds: 0.5 * PART,
    label: "Brust zum Boden",
    ease: "in",
    anchor: "feet",
    arms: "line",
  },
  { to: BOTTOM, seconds: 0.5 * (1 - PART), ease: "out", anchor: "feet", arms: "line" },
  {
    to: LOW,
    seconds: 0.5 * (1 - PART),
    label: "Hochdrücken",
    ease: "in",
    anchor: "feet",
    arms: "line",
  },
  { to: PLANK, seconds: 0.5 * PART, ease: "out", anchor: "feet", arms: "line" },
  { to: TUCK, seconds: 0.21, label: "Füße vor", ease: "in", arms: "line" },
  { to: TOUCH, seconds: 0.14, ease: "linear", arms: "line" },
  { to: CROUCH, seconds: 0.14, ease: "out", arms: "line" },
];

// ---------- From the floor to the hips ----------

// The hips go up and back, and the straight arms swing the dumbbells back beside the shins (the hike).
const HIKE = pulled(52, 66, { x: 70, y: 178 }, -24);
// The way down ends with the dumbbells in front of the knees, then on the floor.
const KNEE = pulled(52, 50, { x: 101, y: 182 }, -22);

/** The pull from the floor to the full extension. The clean and the snatch go on from there. */
export const PULL: Step[] = [
  { to: HIKE, seconds: 0.34, label: "Ausholen", ease: "soft", anchor: "feet", arms: "fk" },
  {
    to: POWER,
    via: [HANG],
    seconds: 0.34,
    label: "Zug",
    ease: "in",
    anchor: "feet",
    arms: "fk",
    follow: "hands",
  },
  { to: EXTEND, seconds: 0.16, label: "Streckung", ease: "linear", anchor: "feet", arms: "fk" },
];

/** From the hang beside the thighs back to the dumbbells on the floor. */
export const TO_THE_FLOOR: Step[] = [
  {
    to: CROUCH,
    via: [KNEE],
    seconds: 0.55,
    label: "Absetzen",
    ease: "soft",
    anchor: "feet",
    arms: "fk",
    follow: "hands",
  },
  { to: CROUCH, seconds: 0.1 },
];

// ---------- The snatch ----------

const ON_TOES = { feet: tiptoe(75, 110), toes: 110 };
/** A pose of the snatch with the hands at `x`, `y` and the feet flat. `rest` sets the elbows and the shrug. */
function snatch(
  hip: { x: number; y: number },
  lean: number,
  x: number,
  y: number,
  grip: number,
  rest: Partial<Pose>,
): Pose {
  return { feet: FLAT, stance: STANCE, knees: 0.5, hip, lean, hands: { x, y }, grip, ...rest };
}
// The elbows go high and to the outside. The dumbbells are at the chest.
const HIGH_PULL = snatch({ x: 78, y: 115 }, -3, 91, 88, 24, {
  ...ON_TOES,
  shrug: 4,
  elbowTo: 170,
  elbowsOut: 3.5,
});
// The dumbbells pass the face. The feet are flat again.
const TURN = snatch({ x: 74, y: 120 }, 0, 90, 54, 22, { shrug: 2, elbowTo: -150, elbowsOut: 3 });
// The athlete drops a little under the dumbbells and locks the arms out.
const CATCH: Pose = { ...locked(72, 126, 3), head: 2 };

/** The way down: past the face, then to the chest with the elbows outside. */
const DOWN_FACE = snatch(TOP.hip, 0, 91, 54, 22, { elbowTo: -90, elbowsOut: 4 });
const DOWN_CHEST = snatch({ x: 72, y: 123 }, 8, 93, 95, 24, { elbowTo: 150, elbowsOut: 3 });

export const DEVIL_PRESS: Exercise = {
  key: "devil-press",
  title: "Devil Press",
  equipment: { kind: "dumbbells" },
  views: views(),
  start: CROUCH,
  steps: [
    ...BURPEE,
    ...PULL,
    {
      to: HIGH_PULL,
      seconds: 0.14,
      label: "Hoher Zug",
      ease: "linear",
      anchor: "feet",
      arms: "fk",
    },
    { to: TURN, seconds: 0.1, label: "Umsetzen", ease: "linear", anchor: "feet", arms: "fk" },
    { to: CATCH, seconds: 0.26, ease: "out", anchor: "feet", arms: "fk" },
    { to: TOP, seconds: 0.3, label: "Über Kopf", anchor: "feet", arms: "carry" },
    { to: TOP, seconds: 0.35 },
    { to: DOWN_FACE, seconds: 0.34, label: "Ablassen", ease: "in", anchor: "feet", arms: "fk" },
    { to: DOWN_CHEST, seconds: 0.13, ease: "linear", anchor: "feet", arms: "fk" },
    { to: HANG, seconds: 0.25, ease: "out", anchor: "feet", arms: "fk" },
    ...TO_THE_FLOOR,
  ],
};

/** The side view shows the whole plank (the feet reach x = -20, the head x = 152 at the bottom of the push-up) and the dumbbells overhead (y = 2). */
export function views(): [View, View] {
  return [{ label: "Seite", yaw: 0, box: [-35, -14, 192, 226] }, FRONT];
}
