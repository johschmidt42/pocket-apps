// Dumbbell Burpee Deadlift (Tumilson): two dumbbells lie on the floor beside the feet. The hands hold them,
// the feet jump back, the chest touches the floor between the dumbbells (the burpee of `devil-press.ts`), the feet
// jump forward beside the dumbbells, and the athlete deadlifts them to the stand (`dumbbell-deadlift.ts`). Then they
// go back to the floor. The hands stay on the dumbbells the whole time.
import { FRONT, type Exercise, type View } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BODY, GROUND, type Pose, type Spot, type Step } from "../skeleton.ts";
import { BURPEE, FEET_X } from "./devil-press.ts";

/** The grip of the burpee on dumbbells: the chest goes down between them. The deadlift keeps it. */
const GRIP = 24;
const ARM = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
/** The dumbbells: beside the middle of the feet, the plates touch the floor. */
const BELLS = { x: 80, y: GROUND - 7 };
const base = {
  feet: { x: 74, y: 200 },
  stance: 11,
  knees: 0,
  grip: GRIP,
  elbowTo: -30,
  elbowsOut: 0.3,
};

/** A pose with straight arms, as in the dumbbell deadlift: the hand at (`x`, `y`), the shoulders `ahead` of it. */
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

const START = hanging(BELLS.x, BELLS.y, 14, 58, -26);
const KNEE = hanging(79, 165, 8, 38, -16);
const TOP = hanging(76, 120.1 - BODY.torso + ARM, 0, 0, 0);

/** The burpee of the devil press has the dumbbells 32 in front of the ankles. Here they are beside the feet. */
const DX = BELLS.x - (FEET_X + 32);
const moved = (spot: Spot): Spot => ({ ...spot, x: spot.x + DX });
const spots = (value: Pose["feet"]): Pose["feet"] =>
  "x" in value ? moved(value) : [moved(value[0]), moved(value[1])];
const shift = (pose: Pose): Pose => ({
  ...pose,
  hip: moved(pose.hip),
  feet: spots(pose.feet),
  hands: spots(pose.hands),
});

// The burpee up to the plank after the push-up: the feet jump back, the chest goes to the floor and up again.
const DOWN: Step[] = BURPEE.slice(0, 6).map((step) => ({
  ...step,
  to: shift(step.to),
  ...(step.via ? { via: step.via.map(shift) } : {}),
}));
// The feet jump forward to the dumbbells, a longer jump than in the burpee: the knees come to the chest.
// The shoulders stay over the dumbbells: the straight arms carry the body while the feet are in the air. The hips go
// up, a little above the shoulders, so the knees can come forward under the body.
const TUCK: Pose = {
  ...START,
  hip: { x: 40, y: 136 },
  lean: 95,
  head: -30,
  feet: { x: 36, y: 168 },
  toes: 115,
  knees: 0.3,
};

export const DUMBBELL_BURPEE_DEADLIFT: Exercise = {
  key: "dumbbell-burpee-deadlift",
  title: "Dumbbell Burpee Deadlift",
  equipment: { kind: "dumbbells" },
  views: [{ label: "Seite", yaw: 0, box: [-62, -4, 210, 216] } satisfies View, FRONT],
  start: START,
  steps: [
    { to: START, seconds: 0.15 },
    ...DOWN,
    { to: TUCK, seconds: 0.32, label: "Füße vor", ease: "in", arms: "line" },
    { to: START, seconds: 0.3, ease: "out", arms: "line" },
    { to: START, seconds: 0.1 },
    {
      to: TOP,
      via: [KNEE],
      seconds: 0.8,
      label: "Deadlift",
      ease: "soft",
      anchor: "feet",
      arms: "line",
    },
    { to: TOP, seconds: 0.3, label: "Stand" },
    {
      to: START,
      via: [KNEE],
      seconds: 0.8,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "line",
    },
  ],
};
