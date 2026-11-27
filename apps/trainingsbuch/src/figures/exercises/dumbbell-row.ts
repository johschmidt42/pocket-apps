// Dumbbell Bent-over Row (Josh-O: "44 dumbbell bent-over rows", two dumbbells): the hips are back, the knees a
// little bent, the back flat at about 45 degrees. The dumbbells hang under the shoulders. The elbows pull back and up
// along the body until the dumbbells are at the sides of the belly, and the dumbbells go back down. The torso stays
// still.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { BODY, type Pose } from "../skeleton.ts";

/** The dumbbells hang outside the knees. */
const GRIP = 26;
const ARM = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);
const LEAN = 48;
// The legs are nearly straight (78 of 80): the hips go back, not down.
const HIP = { x: 52, y: 125 };
const base = {
  feet: { x: 74, y: 200 },
  stance: 8,
  knees: 0.1,
  grip: GRIP,
  hip: HIP,
  lean: LEAN,
  head: -22,
};

const shoulder = shoulderOf(HIP, LEAN);
// The arms hang straight down, the dumbbells are under the shoulders.
const HANG: Pose = {
  ...base,
  hands: { x: shoulder.x + 1, y: shoulder.y + Math.sqrt(ARM ** 2 - 1) },
  elbowTo: -60,
  elbowsOut: 0.3,
};
const HALF: Pose = { ...base, hands: handAt(HIP, LEAN, -6, 44), elbowTo: -120, elbowsOut: 0.35 };
// The top: the elbows are above the back, the dumbbells at the sides of the belly.
const TOP: Pose = { ...base, hands: handAt(HIP, LEAN, -16, 22), elbowTo: -150, elbowsOut: 0.4 };

export const DUMBBELL_ROW: Exercise = {
  key: "dumbbell-row",
  title: "Dumbbell Bent-over Row",
  equipment: { kind: "dumbbells" },
  views: [SIDE, FRONT],
  start: HANG,
  steps: [
    { to: HANG, seconds: 0.3, label: "Arme lang" },
    {
      to: TOP,
      via: [HALF],
      seconds: 0.6,
      label: "Ziehen",
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: TOP, seconds: 0.15, label: "Oben" },
    {
      to: HANG,
      via: [HALF],
      seconds: 0.75,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
  ],
};
