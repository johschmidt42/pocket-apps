// Dumbbell Hang Split Snatch (Moon: "10 dumbbell hang split snatches, right arm ... Alternate feet on the
// split snatches"). One dumbbell in the near hand. From the hang (the dumbbell above the knee), the pull of
// `dumbbell-snatch.ts`, and the feet jump into a split: one foot forward, the other back on its toes. The arm locks out
// in the split, then the feet come together. The loop has two repetitions: the front foot changes in each.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { tiptoe, type Pose, type Step } from "../skeleton.ts";
import {
  DOWN_CHEST,
  DOWN_FACE,
  EXTEND,
  hang,
  HIGH_PULL,
  OVERHEAD,
  pose,
  SIDEWAYS,
  TURN,
} from "./dumbbell-snatch.ts";

/** The hang: the dumbbell is just above the knee, the shoulders are in front of it, the hips are back. */
const HANG = hang(156, 7, 40, -20);

const FRONT_FOOT = { x: 101, y: 200 };
const BACK_TOES = 150;
// 1 above the floor: on the way into the split, the foot turns, and its toe dips a little (as in the split jerk).
const BACK_FOOT = { x: 45, y: tiptoe(45, BACK_TOES).y - 1 };

/** The split with the arm locked overhead. `front` is the side of the leg in front. */
function split(front: 0 | 1): Pose {
  const feet: [typeof FRONT_FOOT, typeof BACK_FOOT] =
    front === 0 ? [FRONT_FOOT, BACK_FOOT] : [BACK_FOOT, FRONT_FOOT];
  return pose({ x: 72, y: 140 }, 2, { x: 75, y: 33, z: 12 }, SIDEWAYS, {
    feet,
    toes: front === 0 ? [90, BACK_TOES] : [BACK_TOES, 90],
    elbows: -0.5,
    head: 0,
  });
}

/** The dumbbell passes the face. The knees bend a little already: the body starts to go under the dumbbell. */
const UNDER: Pose = { ...TURN, hip: { x: 74, y: 123 } };

function repetition(front: 0 | 1): Step[] {
  const SPLIT = split(front);
  return [
    { to: HANG, seconds: 0.25, label: "Hang" },
    // "in": the hips open faster and faster. The arm stays long.
    {
      to: EXTEND,
      seconds: 0.22,
      label: "Streckung",
      ease: "in",
      anchor: "feet",
      arms: ["line", "fk"],
    },
    {
      to: HIGH_PULL,
      seconds: 0.14,
      label: "Hoher Zug",
      ease: "linear",
      anchor: "feet",
      arms: ["line", "fk"],
    },
    { to: UNDER, seconds: 0.1, label: "Umsetzen", ease: "linear", anchor: "feet", arms: "fk" },
    // The feet leave the floor and land in the split. The body goes under the dumbbell.
    { to: SPLIT, seconds: 0.26, label: "Ausfallschritt", ease: "out", arms: "fk" },
    { to: SPLIT, seconds: 0.3 },
    { to: OVERHEAD, seconds: 0.5, label: "Füße zusammen", arms: ["carry", "fk"] },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    { to: DOWN_FACE, seconds: 0.36, label: "Ablassen", ease: "in", anchor: "feet", arms: "fk" },
    { to: DOWN_CHEST, seconds: 0.13, ease: "linear", anchor: "feet", arms: "fk" },
    { to: HANG, seconds: 0.3, ease: "out", anchor: "feet", arms: "fk" },
  ];
}

export const DUMBBELL_HANG_SPLIT_SNATCH: Exercise = {
  key: "dumbbell-hang-split-snatch",
  title: "DB Hang Split Snatch",
  equipment: { kind: "dumbbell", hand: 0 },
  views: [SIDE, FRONT],
  start: HANG,
  steps: [...repetition(0), ...repetition(1)],
};
