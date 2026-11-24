// Dumbbell Deadlift: a dumbbell in each hand, beside the legs. From the floor (the heads of the dumbbells
// touch the floor beside the feet) to the stand with hips and knees extended, and back down. The back stays flat.
// The arms hang straight down, so each dumbbell is under its shoulder.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BODY, type Pose } from "../skeleton.ts";

/** The hands are outside the shins: the head of a dumbbell (radius 7) does not touch the leg. */
const GRIP = 21;
/** A straight arm in the side view: the hand is `GRIP - 13` out to the side of the shoulder joint. */
const ARM = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
const base = {
  feet: { x: 74, y: 200 },
  stance: 8,
  knees: 0,
  grip: GRIP,
  elbowTo: -30,
  elbowsOut: 0.3,
};

/** A pose with straight arms: the hand is at (`x`, `y`), the shoulders are `ahead` in front of it. */
function hanging(x: number, y: number, ahead: number, lean: number, head: number): Pose {
  const torso = shoulderOf({ x: 0, y: 0 }, lean);
  const shoulder = { x: x + ahead, y: y - Math.sqrt(ARM ** 2 - ahead ** 2) };
  return {
    ...base,
    hip: { x: shoulder.x - torso.x, y: shoulder.y - torso.y },
    lean,
    head,
    hands: { x, y },
  };
}

// The heads of the dumbbells touch the floor (a hand 7 above the ground), beside the middle of the feet. The back is
// flat and leans 58 degrees, the shoulders are 14 in front of the hands: the center of mass is over the feet (80).
const START = hanging(80, 199, 14, 58, -26);
// Halfway: the dumbbells pass the knees.
const KNEE = hanging(79, 165, 8, 38, -16);
// The stand: hips and knees extended, the dumbbells beside the thighs.
const TOP = hanging(76, 120.1 - BODY.torso + ARM, 0, 0, 0);

export const DUMBBELL_DEADLIFT: Exercise = {
  key: "dumbbell-deadlift",
  title: "Dumbbell Deadlift",
  equipment: { kind: "dumbbells" },
  views: [SIDE, FRONT],
  start: START,
  steps: [
    { to: START, seconds: 0.3, label: "Start" },
    {
      to: TOP,
      via: [KNEE],
      seconds: 0.9,
      label: "Zug",
      ease: "soft",
      anchor: "feet",
      arms: "line",
    },
    { to: TOP, seconds: 0.35, label: "Stand" },
    {
      to: START,
      via: [KNEE],
      seconds: 0.9,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "line",
    },
  ],
};
