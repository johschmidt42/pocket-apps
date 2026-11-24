// Handstand at the wall (Maxim 56: a handstand hold, Marguerita): from the stand, facing the wall, a lunge,
// the hands to the floor, a kick up until the heels touch the wall, a hold with straight arms, and down again, one leg
// after the other. The handstand is the top of the handstand push-up: the back is to the wall.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { tiptoe, up, type Pose, type Spot } from "../skeleton.ts";
import { GRIP, HANDS, TOP, WALL } from "./handstand-push-up.ts";

/** The feet of the figure that stands before the wall: the lead foot (near, side 0) steps forward. */
const BACK_FOOT: Spot = { x: 28, y: 200 };
const LEAD_FOOT: Spot = { x: 54, y: 200 };

/** A pose with the hands on the floor. The shoulders are `drop` lower than over straight arms. */
function onHands(
  lean: number,
  drop: number,
  head: number,
  feet: readonly [Spot, Spot],
  toes: readonly [number, number],
  elbowTo = 90,
): Pose {
  const shoulder = { x: HANDS.x, y: HANDS.y - 61.4 + drop };
  const torso = up(lean);
  return {
    hip: { x: shoulder.x - torso.x * 46, y: shoulder.y - torso.y * 46 },
    lean,
    head,
    feet,
    toes,
    stance: 7,
    knees: 0,
    hands: HANDS,
    grip: GRIP,
    elbowTo,
    elbowsOut: 1.1,
  };
}

const standHip = { x: 36, y: 120.1 };
// Standing, the arms up.
const STAND: Pose = {
  hip: standHip,
  lean: 0,
  feet: { x: 36, y: 200 },
  stance: 7,
  grip: 20,
  hands: handAt(standHip, 0, 2, -62),
};
// The lead foot is in the air on its way forward.
const stepHip = { x: 42, y: 121 };
const STEP: Pose = {
  ...STAND,
  hip: stepHip,
  lean: 8,
  feet: [
    { x: 48, y: 186 },
    { x: 32, y: 200 },
  ],
  toes: [100, 90],
  hands: handAt(stepHip, 8, 10, -61),
};
// The lunge: the arms are up in line with the torso, which leans forward.
const lungeHip = { x: 46, y: 125 };
const LUNGE: Pose = {
  ...STAND,
  hip: lungeHip,
  lean: 30,
  head: -6,
  feet: [LEAD_FOOT, tiptoe(BACK_FOOT.x, 115)],
  toes: [90, 115],
  hands: handAt(lungeHip, 30, 31, -53),
};
// The hands are on the floor. The lead leg is bent and pushes from the toes, the back leg kicks up behind. The head is
// tucked: the eyes look between the hands, and the head stays out of the wall. The bent elbows point back, away from
// the wall (-60).
const PLANT = onHands(125, 10, 42, [tiptoe(LEAD_FOOT.x, 112), { x: 4, y: 104 }], [112, 150], -60);
// On the way down to the floor: the torso bends forward, the head is already tucked, so it stays out of the wall.
const bendHip = { x: 40, y: 131 };
const BEND: Pose = {
  ...LUNGE,
  hip: bendHip,
  lean: 62,
  head: 60,
  hands: handAt(bendHip, 62, 50, 18),
};
// Before it: the hands reach the floor. The hip is low and back, the lead knee bends deeply, the head looks down.
const REACH = onHands(100, 6.6, 62, [LEAD_FOOT, tiptoe(BACK_FOOT.x, 130)], [90, 130], -60);
// The hips are over the hands. The back leg is nearly up, the lead leg follows.
const KICK = onHands(
  165,
  2,
  24,
  [
    { x: 58, y: 120 },
    { x: 96, y: 22 },
  ],
  [180, 230],
  -30,
);
// The lead leg swings up behind the body, away from the wall: a turn of the leg toward the wall would hit it.
const SWING = onHands(
  172,
  1,
  14,
  [
    { x: 74, y: 40 },
    { x: 99, y: 18 },
  ],
  [220, 240],
  0,
);
// Both legs are up, the heels are just before the wall.
const ARRIVE = onHands(
  180,
  0.5,
  4,
  [
    { x: 100, y: 16 },
    { x: 106, y: 14 },
  ],
  [250, 260],
  60,
);
// The way down: the lead leg comes down first, then the hands push off.
const LOWER = onHands(
  165,
  2,
  24,
  [
    { x: 50, y: 110 },
    { x: 100, y: 20 },
  ],
  [170, 250],
  -30,
);
const LAND = onHands(125, 10, 42, [tiptoe(LEAD_FOOT.x, 112), { x: 20, y: 96 }], [112, 160], -60);

export const HANDSTAND: Exercise = {
  key: "handstand",
  title: "Handstand",
  equipment: { kind: "wall", wall: WALL },
  views: [{ ...SIDE, box: [0, -14, 140, 226] }, FRONT],
  start: STAND,
  steps: [
    { to: STAND, seconds: 0.3, label: "Stehen" },
    {
      to: LUNGE,
      via: [STEP],
      seconds: 0.5,
      label: "Ausfallschritt",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
    {
      to: REACH,
      via: [BEND],
      seconds: 0.6,
      label: "Hände auf den Boden",
      ease: "soft",
      arms: "fk",
      legs: "line",
    },
    {
      to: PLANT,
      seconds: 0.4,
      label: "Aufschwingen",
      ease: "in",
      anchor: "hands",
      legs: ["line", "fk"],
    },
    {
      to: TOP,
      via: [KICK, SWING, ARRIVE],
      seconds: 1.15,
      ease: "out",
      anchor: "hands",
      legs: "fk",
    },
    { to: TOP, seconds: 1.4, label: "Halten" },
    {
      to: LAND,
      via: [ARRIVE, SWING, LOWER],
      seconds: 1.2,
      label: "Absteigen",
      ease: "in",
      anchor: "hands",
      legs: "fk",
    },
    { to: REACH, seconds: 0.35, ease: "out", anchor: "hands", legs: ["line", "fk"] },
    {
      to: LUNGE,
      via: [BEND],
      seconds: 0.6,
      label: "Aufrichten",
      ease: "soft",
      arms: "fk",
      legs: "line",
    },
    { to: STAND, via: [STEP], seconds: 0.5, ease: "soft", legs: "line", arms: "carry" },
  ],
};
