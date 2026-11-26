// Dumbbell Hang Clean & Jerk: the hang power clean of `dumbbell-squat-clean.ts`, then the push press of
// `dumbbell-thruster.ts`. All workouts with it ask for the hang (Josh-O, Open 18.1, Open 25.1). The standard
// (Open 18.1 and 25.1): each rep starts with the dumbbell below the hips, the dumbbell comes to the shoulder (a snatch is
// not a rep), and any style takes it overhead. A rep ends with the arm locked and the body straight under it.
// `twoDumbbells()` is Josh-O. `dumbbell-clean-and-jerk-single-arm.ts` is the form with one dumbbell of the Open.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import type { Pose, Step } from "../skeleton.ts";
import { EXTEND, HANG, HANG_DIP, lowered, POWER, turnover } from "./dumbbell-squat-clean.ts";
import { DRIVE, PRESS, rack, RACK, TOP } from "./dumbbell-thruster.ts";

/** The dumbbells meet the shoulders, then the legs give way into a partial squat (the power clean). */
export const LAND: Pose = { ...rack(70.2, 128.6, 6.5, -6), elbowTo: 20, elbowsOut: 0.55 };
export const CATCH = rack(68, 133, 9, -4);
/** The short dip of the push press: the torso stays upright, the knees go forward. */
export const JERK_DIP = rack(72, 129, 3, -2);

/** One rep from the hang. `map` changes each pose (the form with one dumbbell puts the free arm beside the body). */
export function cleanAndJerk(map: (pose: Pose) => Pose): { start: Pose; steps: Step[] } {
  const steps: Step[] = [
    { to: HANG_DIP, seconds: 0.3, label: "Dip", ease: "soft", anchor: "feet", arms: "fk" },
    {
      to: POWER,
      via: [HANG],
      seconds: 0.3,
      label: "Zug",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: EXTEND, seconds: 0.16, label: "Streckung", ease: "linear", anchor: "feet", arms: "fk" },
    {
      to: LAND,
      via: turnover({ ...EXTEND.hip, lean: EXTEND.lean }, LAND),
      seconds: 0.26,
      label: "Umsetzen",
      ease: "linear",
      arms: "fk",
    },
    { to: CATCH, seconds: 0.13, label: "Fangen", ease: "out", anchor: "feet", arms: "carry" },
    { to: RACK, seconds: 0.35, label: "Aufstehen", anchor: "feet", arms: "carry" },
    { to: RACK, seconds: 0.15 },
    { to: JERK_DIP, seconds: 0.25, label: "Dip", ease: "soft", anchor: "feet", arms: "carry" },
    {
      to: TOP,
      via: [DRIVE, PRESS],
      seconds: 0.45,
      label: ["Antrieb", "Drücken", "Drücken"],
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: TOP, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PRESS],
      seconds: 0.45,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: HANG, via: lowered(), seconds: 0.6, anchor: "feet", arms: "fk", follow: "hands" },
    { to: HANG, seconds: 0.4 },
  ];
  return {
    start: map(HANG),
    steps: steps.map((step) => ({
      ...step,
      to: map(step.to),
      ...(step.via ? { via: step.via.map(map) } : {}),
    })),
  };
}

export const DUMBBELL_CLEAN_AND_JERK: Exercise = {
  key: "dumbbell-clean-and-jerk",
  title: "Dumbbell Hang Clean & Jerk",
  equipment: { kind: "dumbbells" },
  views: [SIDE, FRONT],
  ...cleanAndJerk((pose) => pose),
};
