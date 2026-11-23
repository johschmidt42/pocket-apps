// Push Press: from the front rack, a short dip, the legs drive the bar up, and the arms finish the press.
// The legs do not bend again under the bar: that is the difference to a push jerk.
// The rack, the dip, the drive and the lockout are the poses of the jerk in `clean-and-jerk.ts`.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { DIP, DRIVE, OVERHEAD, PASS, RACK } from "./clean-and-jerk.ts";

export const PUSH_PRESS: Exercise = {
  key: "push-press",
  title: "Push Press",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    { to: RACK, seconds: 0.3, label: "Front Rack" },
    { to: DIP, seconds: 0.3, label: "Dip", anchor: "feet", arms: "carry" },
    // One step for the whole way of the bar, with one smooth speed: the legs drive it off the shoulders, the arms
    // finish the press on locked elbows. The head goes back out of its way. With two steps, the speed of the bar
    // jumped from 172 to 316 at the border, because the legs slow down when they get straight.
    {
      to: OVERHEAD,
      via: [DRIVE, PASS],
      seconds: 0.5,
      label: ["Antrieb", "Drücken", "Drücken"],
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.55,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
  ],
};
