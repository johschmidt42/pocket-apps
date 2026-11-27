// Shoulder Press (strict press; Jonathon Farmer, Otis): from the front rack, only the arms press the bar to
// locked elbows overhead. The legs stay straight: no dip, no drive. The head goes back out of the way of the bar and
// comes forward under it. The poses are those of the jerk in `clean-and-jerk.ts`: the drive pose has the hips of the
// rack and is here the start of the press.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { DRIVE, OVERHEAD, PASS, RACK } from "./clean-and-jerk.ts";

export const SHOULDER_PRESS: Exercise = {
  key: "shoulder-press",
  title: "Shoulder Press",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    { to: RACK, seconds: 0.4, label: "Front Rack" },
    // Slower than the push press: only the arms work.
    {
      to: OVERHEAD,
      via: [DRIVE, PASS],
      seconds: 1.0,
      label: "Drücken",
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.8,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
  ],
};
