// Split Jerk: from the front rack, dip and drive. The feet split, one forward and one back, and the body
// goes under the bar on locked arms. Then the feet come together. The poses are the jerk of `clean-and-jerk.ts`.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { DIP, DRIVE, OVERHEAD, PASS, RACK, SPLIT } from "./clean-and-jerk.ts";

export const SPLIT_JERK: Exercise = {
  key: "split-jerk",
  title: "Split Jerk",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    { to: RACK, seconds: 0.3, label: "Front Rack" },
    { to: DIP, seconds: 0.25, label: "Dip", anchor: "feet", arms: "carry" },
    { to: DRIVE, seconds: 0.14, label: "Ausstoßen", ease: "in", anchor: "feet", arms: "carry" },
    { to: SPLIT, seconds: 0.26, label: "Ausfallschritt", ease: "out", arms: "line" },
    { to: SPLIT, seconds: 0.4 },
    { to: OVERHEAD, seconds: 0.5, label: "Füße zusammen", arms: "line" },
    { to: OVERHEAD, seconds: 0.35, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.45,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
  ],
};
