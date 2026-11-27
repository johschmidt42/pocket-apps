// Dumbbell Floor Press (Josh-O: "44 dumbbell floor presses", two dumbbells): the figure lies on its back on
// the floor, the knees bent and the feet flat. The dumbbells go from locked arms over the shoulders down until the
// upper arms touch the floor, about 45 degrees away from the body, and back up. The floor stops the elbows: the
// press is shorter than on a bench. The grip is neutral: the dumbbells point along the body.
import { SIDE, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, type Pose } from "../skeleton.ts";

const HIP_X = 100;
/** The torso lies on the floor: its half width (9.5) above the ground. */
const LYING_Y = GROUND - 9.5;
const SHOULDER = { x: HIP_X - BODY.torso, y: LYING_Y };
const GRIP = 22;
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);

const base = {
  hip: { x: HIP_X, y: LYING_Y },
  lean: -90,
  // The head rests on the floor and looks up.
  head: 8,
  feet: { x: HIP_X + 42, y: 200 },
  stance: 12,
  // The knees point up.
  knees: 0.1,
  grip: GRIP,
};

const press = (dx: number, y: number, elbowTo: number, elbowsOut: number): Pose => ({
  ...base,
  hands: { x: SHOULDER.x + dx, y },
  elbowTo,
  elbowsOut,
});

// The lockout: straight arms, the dumbbells over the shoulders.
const LOCK = press(2, SHOULDER.y - Math.sqrt(REACH ** 2 - 4), 21, 0.7);
const HIGH = press(6, SHOULDER.y - 45, 40, 0.8);
// The bottom: the upper arms lie on the floor, the forearms are vertical, the dumbbells are over the elbows.
const BOTTOM = press(12, SHOULDER.y - 26, 70, 1.4);

/** Only the side view: from the front, the bent knees hide the body and the arms. */
const VIEWS: [View] = [{ ...SIDE, box: [-8, 58, 176, 154] }];

export const DUMBBELL_FLOOR_PRESS: Exercise = {
  key: "dumbbell-floor-press",
  title: "Dumbbell Floor Press",
  equipment: { kind: "dumbbells" },
  views: VIEWS,
  start: LOCK,
  steps: [
    { to: LOCK, seconds: 0.35, label: "Arme gestreckt" },
    {
      to: BOTTOM,
      via: [HIGH],
      seconds: 0.85,
      label: "Absenken",
      ease: "soft",
      legs: "line",
      arms: "line",
      follow: "hands",
    },
    { to: BOTTOM, seconds: 0.15, label: "Ellbogen am Boden" },
    {
      to: LOCK,
      via: [HIGH],
      seconds: 0.7,
      label: "Drücken",
      ease: "soft",
      legs: "line",
      arms: "line",
      follow: "hands",
    },
  ],
};
