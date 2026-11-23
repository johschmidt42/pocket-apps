// Thruster.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import type { Pose } from "../skeleton.ts";

const base = { feet: { x: 74, y: 200 }, stance: 10, knees: 0.5, grip: 16 };

// In the rack, the hand is a little above and in front of the shoulder joint. Then the elbow is high.
const RACK: Pose = { ...base, hip: { x: 74, y: 120 }, lean: 2, hands: { x: 85, y: 65 } };
const BOTTOM: Pose = { ...base, hip: { x: 54, y: 167 }, lean: 27, hands: { x: 84, y: 117 } };
// Straight arms: the hands are a little farther away than the arms can reach. The solver then stretches the arms.
const TOP: Pose = { ...base, hip: { x: 74, y: 120 }, lean: 0, hands: { x: 76, y: 9 } };

// The bar passes the face: the head goes back out of its way, as in a real press. The check finds a bar in the head.
const PASS: Pose = { ...base, hip: { x: 74, y: 120 }, lean: 0, head: -26, hands: { x: 87, y: 40 } };

export const THRUSTER: Exercise = {
  key: "thruster",
  title: "Thruster",
  equipment: { kind: "barbell" },
  views: [SIDE, FRONT],
  start: RACK,
  steps: [
    { to: BOTTOM, seconds: 0.7, label: "Kniebeuge", anchor: "feet", arms: "carry" },
    { to: RACK, seconds: 0.42, label: "Aufstehen", ease: "in", anchor: "feet", arms: "carry" },
    {
      to: TOP,
      via: [PASS],
      seconds: 0.3,
      label: "Drücken",
      ease: "out",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: TOP, seconds: 0.3, label: "Halten" },
    {
      to: RACK,
      via: [PASS],
      seconds: 0.45,
      label: "Ablassen",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: RACK, seconds: 0.13 },
  ],
};
