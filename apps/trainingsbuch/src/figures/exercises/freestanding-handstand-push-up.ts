// Freestanding Handstand Push-up (Robbie): the strict handstand push-up of `handstand-push-up.ts` without
// the wall. The figure keeps its balance: the hips stay over the hands, and the legs point up, a little back. At the
// bottom the shoulders go in front of the hands and the head touches the floor, so the hips and the legs go back to
// keep the weight over the hands. `freeHandstand()` also makes the ring handstand push-up.
import { FRONT, SIDE, type Equipment, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Spot = { x: number; y: number };

/** Active shoulders at the top, as at the wall. */
const TOP_SHRUG = 4;
/** At the bottom, the shoulder joints are this far in front of the hands (as at the wall). */
const AHEAD = 16;
/** From the shoulder joints to the top of the head. */
const HEAD_TOP = 36;

type Setup = { hands: Spot; grip: number; elbowsOut: number };

/**
 * One pose. `part` 0 is the top (locked arms, the shoulders over the hands), 1 is the bottom (the top of the head on
 * the floor). The hip stays a little behind the hands (to +x), the legs lean back a little more at the bottom.
 */
export function freeHandstand(part: number, setup: Setup): Pose {
  const { hands, grip } = setup;
  const shrug = mix(TOP_SHRUG, 0, part);
  // The line from the shoulders to the top of the head: it tilts forward (to -x) at the bottom, as at the wall.
  const tilt = mix(2, 14.2, part);
  const reach = Math.sqrt(61.97 ** 2 - (grip - BODY.shoulderHalf) ** 2);
  const joint = {
    x: hands.x - mix(1, AHEAD, part),
    y: mix(hands.y - reach, GROUND - HEAD_TOP * Math.cos(tilt * RAD), part),
  };
  // The torso hangs from the shoulders to the hip. The hip is over the hands, a little behind them.
  // `torso` is the tilt of the torso from the vertical: positive puts the hip behind the shoulders (to +x).
  const hipX = hands.x + mix(1, 3, part);
  const torso = Math.asin((hipX - joint.x) / (BODY.torso + shrug)) / RAD;
  const sin = Math.sin(torso * RAD);
  const cos = Math.cos(torso * RAD);
  // A shrug moves the shoulder joints toward the head: the base of the neck is `shrug` above them.
  const neck = { x: joint.x + sin * shrug, y: joint.y - cos * shrug };
  const hip = { x: neck.x + sin * BODY.torso, y: neck.y - cos * BODY.torso };
  // The legs point up and a little back: their weight balances the head and the shoulders in front of the hands.
  const back = mix(2, 10, part);
  const feet = {
    x: hip.x + Math.sin(back * RAD) * (LEG - 0.05),
    y: hip.y - Math.cos(back * RAD) * (LEG - 0.05),
  };
  return {
    hip,
    lean: 180 + torso,
    shrug,
    // The head keeps its direction in space when the torso tilts: the top of the head goes to the floor.
    head: tilt + mix(-10, 0, part) - torso,
    feet,
    stance: BODY.hipHalf,
    knees: 0,
    // Pointed toes, in the line of the legs.
    toes: back,
    hands,
    grip,
    elbowTo: 90,
    elbowsOut: setup.elbowsOut,
  };
}

const VIEWS = (box: View["box"]): [View, View] => [
  { ...SIDE, box },
  { ...FRONT, box: [-box[2] / 2, box[1], box[2], box[3]] },
];

/** The strict push-up in a free handstand: down to the head on the floor, and up again. */
export function freeHandstandPushUp(options: {
  key: string;
  title: string;
  equipment: Equipment;
  setup: Setup;
  box: View["box"];
}): Exercise {
  const at = (part: number) => freeHandstand(part, options.setup);
  const way = [0.3, 0.6, 0.9].map(at);
  return {
    key: options.key,
    title: options.title,
    equipment: options.equipment,
    views: VIEWS(options.box),
    start: at(0),
    steps: [
      { to: at(0), seconds: 0.3, label: "Handstand" },
      {
        to: at(1),
        via: way,
        seconds: 1.0,
        label: ["Absenken", "Absenken", "Absenken", "Kopf am Boden"],
        ease: "soft",
        anchor: "hands",
        legs: "fk",
      },
      {
        to: at(0),
        via: [...way].reverse(),
        seconds: 0.9,
        label: ["Kopf am Boden", "Drücken", "Drücken", "Drücken"],
        ease: "soft",
        anchor: "hands",
        legs: "fk",
      },
    ],
  };
}

export const FREESTANDING_HANDSTAND_PUSH_UP: Exercise = freeHandstandPushUp({
  key: "freestanding-handstand-push-up",
  title: "Freestanding Handstand Push-up",
  equipment: { kind: "none" },
  // The hands on the floor, as at the wall: wider than the shoulders.
  setup: { hands: { x: 98, y: GROUND - 4.5 }, grip: 28, elbowsOut: 1.1 },
  box: [30, -45, 120, 257],
});
