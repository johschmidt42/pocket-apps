// Flutter Kicks (Maxim 56: "56 flutter kicks (4-count)"): the figure lies on its back, the arms straight
// beside the body, the hands on the floor. The head and the shoulder blades are on the floor, the chin a little to the
// chest. The straight legs are just above the floor and kick up and down in turns, in small strokes. A 4-count
// repetition is four kicks: left, right, left, right. The loop is one repetition.
import { SIDE, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, type Pose, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
const HIP_X = 100;
/** The torso lies on the floor: its half width (9.5) above the ground. */
const LYING_Y = GROUND - 9.5;
const LEG = BODY.thigh + BODY.shin - 0.05;
/** The hands are a little out from the hips. */
const GRIP = 18;
/** The middle angle of the legs above the floor, and how far each leg goes up and down from it. */
const MIDDLE = 14;
const STROKE = 8;
/** One loop: two strokes of each leg. */
const LOOP = 1.6;
const POSES = 24;

function pose(part: number): Pose {
  const hip = { x: HIP_X, y: LYING_Y };
  const shoulder = { x: HIP_X - BODY.torso, y: LYING_Y };
  const swing = Math.sin(4 * Math.PI * part);
  const near = MIDDLE + STROKE * swing;
  const far = MIDDLE - STROKE * swing;
  const foot = (angle: number) => ({
    x: hip.x + Math.cos(angle * RAD) * LEG,
    y: hip.y - Math.sin(angle * RAD) * LEG,
  });
  return {
    hip,
    lean: -90,
    head: 6,
    feet: [foot(near), foot(far)],
    // Pointed toes, in the line of the legs: 90 points along +x.
    toes: [90 - near, 90 - far],
    stance: 6,
    knees: 0,
    // The straight arms lie on the floor beside the body, the hands beside the hips.
    hands: {
      x:
        shoulder.x +
        Math.sqrt(61.9 ** 2 - (GRIP - BODY.shoulderHalf) ** 2 - (GROUND - 4.5 - LYING_Y) ** 2),
      y: GROUND - 4.5,
    },
    grip: GRIP,
    elbowTo: 90,
    elbowsOut: 0.2,
  };
}

const steps: Step[] = Array.from({ length: POSES }, (_, index) => ({
  to: pose(((index + 1) % POSES) / POSES),
  seconds: LOOP / POSES,
  ease: "linear",
  legs: "fk",
  ...(index % (POSES / 4) === 0 ? { label: `Schlag ${String(index / (POSES / 4) + 1)}` } : {}),
}));

const VIEWS: [View] = [{ ...SIDE, box: [-8, 110, 210, 104] }];

export const FLUTTER_KICK: Exercise = {
  key: "flutter-kick",
  title: "Flutter Kicks",
  equipment: { kind: "none" },
  views: VIEWS,
  start: pose(0),
  steps,
};
