// Ring Lower (Meadows: "slow lowers from an inverted hang on the rings, straight body and arms"): the
// figure hangs upside down from the rings, the body straight up over the shoulders. The arms stay straight and
// vertical. The straight body turns slowly around the shoulders: the feet go forward and down, through the level
// front lever, into the hang. Then the knees come to the chest, and the tucked body turns back up into the inverted
// hang for the next lower.
import type { Exercise } from "../exercise.ts";
import { BODY, type Pose } from "../skeleton.ts";

const RAD = Math.PI / 180;
/** The grip on the rings, with the straps straight down. */
const RINGS = { x: 80, y: 84 };
const GRIP = 20;
/** A straight arm in the side view: the hand is `GRIP - 13` out to the side of the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
/** The shoulder joints are straight below the hands in each pose. */
const SHOULDER = { x: RINGS.x, y: RINGS.y + REACH };
const LEG = BODY.thigh + BODY.shin;

/**
 * The body turned `angle` degrees from the hang: 0 is the hang, 90 the level front lever (face up, the feet forward),
 * 180 the inverted hang. `tuck` 0 is a straight body, 1 the knees at the chest.
 */
function turned(angle: number, tuck: number): Pose {
  // From the shoulders to the hip, and the front of the body.
  const down = { x: Math.sin(angle * RAD), y: Math.cos(angle * RAD) };
  const front = { x: down.y, y: -down.x };
  const hip = { x: SHOULDER.x + down.x * BODY.torso, y: SHOULDER.y + down.y * BODY.torso };
  // A straight leg goes on in the line of the torso. A tucked leg: the ankle is near the seat, the knee in front.
  const reach = LEG - 0.05 - tuck * 50;
  const toFront = tuck * 0.55;
  const dir = {
    x: down.x * (1 - toFront) + front.x * toFront,
    y: down.y * (1 - toFront) + front.y * toFront,
  };
  const length = Math.hypot(dir.x, dir.y);
  const feet = { x: hip.x + (dir.x / length) * reach, y: hip.y + (dir.y / length) * reach };
  return {
    hip,
    lean: -angle,
    head: 0,
    feet,
    toes: 180 - angle,
    stance: 5,
    knees: 0,
    hands: RINGS,
    grip: GRIP,
    elbowTo: -20,
    elbowsOut: 0.3,
  };
}

const INVERTED = turned(180, 0);
const LOWER = [150, 120, 90, 60, 30].map((angle) => turned(angle, 0));
const HANG = turned(0, 0);
const TUCK = turned(20, 1);
const BACK = [80, 140].map((angle) => turned(angle, 1));
const INVERTED_TUCK = turned(180, 0.8);

export const RING_LOWER: Exercise = {
  key: "ring-lower",
  title: "Ring Lower",
  equipment: { kind: "rings", ...RINGS },
  views: [
    { label: "Seite", yaw: 0, box: [20, -4, 200, 292] },
    { label: "Vorn", yaw: 90, box: [-70, -4, 140, 292] },
  ],
  ground: false,
  start: INVERTED,
  steps: [
    { to: INVERTED, seconds: 0.4, label: "Umgekehrter Hang" },
    // Slow: the lower is the work.
    {
      to: HANG,
      via: LOWER,
      seconds: 2.6,
      label: "Langsam absenken",
      ease: "soft",
      anchor: "hands",
      arms: "line",
      legs: "fk",
    },
    { to: HANG, seconds: 0.3, label: "Hang" },
    {
      to: TUCK,
      seconds: 0.4,
      label: "Knie zur Brust",
      ease: "soft",
      anchor: "hands",
      arms: "line",
      legs: "fk",
    },
    {
      to: INVERTED_TUCK,
      via: BACK,
      seconds: 0.9,
      label: "Zurückdrehen",
      ease: "soft",
      anchor: "hands",
      arms: "line",
      legs: "fk",
    },
    {
      to: INVERTED,
      seconds: 0.5,
      label: "Beine strecken",
      ease: "soft",
      anchor: "hands",
      arms: "line",
      legs: "fk",
    },
  ],
};
