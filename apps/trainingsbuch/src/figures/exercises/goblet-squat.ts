// Goblet Squat: one kettlebell in both hands, held by the horns in front of the chest, the bell down. The hip
// goes below the knees, the elbows go down between the knees, and the athlete stands up to full extension. The bodies
// of the squat are those of the dumbbell squat.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BELL, up, type Pose } from "../skeleton.ts";
import { BOTTOM, HIGH, LOW, RACK } from "./dumbbell-thruster.ts";

/**
 * The bell lies against the sternum (the torso is 9.5 to each side, the bell has the radius 10): its center is 20 in
 * front of the line of the torso and 14 below the shoulders, along the torso. So it stays close to the body when the
 * torso leans, as a counterweight. The hands hold the horns 16 above the center of the bell (`hangs`). The elbows point
 * down, close to the ribs, and at the bottom they go between the knees.
 */
function goblet(body: Pose, head: number): Pose {
  const shoulder = shoulderOf(body.hip, body.lean);
  const along = up(body.lean);
  const front = { x: -along.y, y: along.x };
  const bell = {
    x: shoulder.x - along.x * 14 + front.x * 20,
    y: shoulder.y - along.y * 14 + front.y * 20,
  };
  return {
    ...body,
    head,
    hands: { x: bell.x, y: bell.y - BELL.away },
    grip: 2.5,
    elbowTo: 0,
    elbowsOut: 0.3,
  };
}

const STAND = goblet(RACK, 0);
const UPPER = goblet(HIGH, -4);
const LOWER = goblet(LOW, -8);
const DEEP = goblet(BOTTOM, -12);

export const GOBLET_SQUAT: Exercise = {
  key: "goblet-squat",
  title: "Goblet Squat",
  equipment: { kind: "kettlebell", hangs: true },
  views: [SIDE, FRONT],
  start: STAND,
  steps: [
    {
      to: DEEP,
      via: [UPPER, LOWER],
      seconds: 0.8,
      label: "Kniebeuge",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: DEEP, seconds: 0.06, label: "Unten" },
    {
      to: STAND,
      via: [LOWER, UPPER],
      seconds: 0.7,
      label: "Aufstehen",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: STAND, seconds: 0.3, label: "Stehen" },
  ],
};
