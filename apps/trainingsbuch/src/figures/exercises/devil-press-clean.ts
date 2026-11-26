// Devil Press, scaled: the burpee of `devil-press.ts`, then a power clean of the two dumbbells onto the
// shoulders and a push press. The standard does not permit the stop on the shoulders, but many gyms scale to it.
// The clean is the one of `dumbbell-power-clean.ts`, the press uses the poses of `dumbbell-thruster.ts`.
import type { Exercise } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";
import { BURPEE, CROUCH, PULL, TO_THE_FLOOR, views } from "./devil-press.ts";
import { EXTEND, HANG, lowered, turnover } from "./dumbbell-squat-clean.ts";
import { DRIVE, PRESS, rack, RACK, TOP } from "./dumbbell-thruster.ts";

// The dumbbells meet the shoulders, then the legs give way into a partial squat (the power clean).
const LAND: Pose = { ...rack(70.2, 128.6, 6.5, -6), elbowTo: 20, elbowsOut: 0.55 };
const CATCH = rack(68, 133, 9, -4);
// The short dip of the push press: the torso stays upright, the knees go forward.
const DIP = rack(72, 129, 3, -2);

export const DEVIL_PRESS_CLEAN: Exercise = {
  key: "devil-press-clean",
  title: "Devil Press (Clean + Push Press)",
  equipment: { kind: "dumbbells" },
  views: views(),
  start: CROUCH,
  steps: [
    ...BURPEE,
    ...PULL,
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
    { to: DIP, seconds: 0.25, label: "Dip", ease: "soft", anchor: "feet", arms: "carry" },
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
    {
      to: HANG,
      via: lowered(),
      seconds: 0.5,
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    ...TO_THE_FLOOR,
  ],
};
