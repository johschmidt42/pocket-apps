// Dumbbell Squat (dumbbell front squat, CrossFit Open 18.2): two dumbbells on the shoulders, the hip goes
// below the knees, then the athlete stands up to full extension of the hips and knees. The rack and the squat are
// those of the dumbbell thruster, without the press.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { BOTTOM, HIGH, LOW, RACK } from "./dumbbell-thruster.ts";

export const DUMBBELL_SQUAT: Exercise = {
  key: "dumbbell-squat",
  title: "Dumbbell Squat",
  equipment: { kind: "dumbbells" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    {
      to: BOTTOM,
      via: [HIGH, LOW],
      seconds: 0.8,
      label: "Kniebeuge",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: BOTTOM, seconds: 0.06, label: "Unten" },
    {
      to: RACK,
      via: [LOW, HIGH],
      seconds: 0.7,
      label: "Aufstehen",
      ease: "soft",
      anchor: "feet",
      arms: "carry",
    },
    { to: RACK, seconds: 0.3, label: "Stehen" },
  ],
};
