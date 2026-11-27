// Kettlebell Clean and Jerk (Jag 28: "28 kettlebell clean and jerks", one kettlebell): the bell swings back
// between the legs (the hike of `kettlebell-snatch.ts`), the hips drive it forward, and the elbow pulls it back to
// the body: the bell rolls around the hand onto the back of the forearm, in the rack beside the chin. A short dip of
// the legs, a drive, and the arm locks out over the shoulder. Then the bell comes back to the rack and falls into the
// next hike. The rack is that of the single-arm kettlebell thruster.
import type { Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import type { Pose } from "../skeleton.ts";
import { LOW, pose } from "./dumbbell-snatch.ts";
import { ARRIVE, HIKE, legs, locked, PASS, TALL, VIEWS } from "./kettlebell-snatch.ts";

/** The hand of the rack is out to the side as in the single-arm kettlebell thruster: the bell is outside the forearm. */
const RACK_Z = 20;

/** The rack with the hip at `hip`: the hand is beside the chin, the elbow is down and in front of the ribs. */
function racked(hip: { x: number; y: number }, lean: number, head: number): Pose {
  return {
    ...pose(hip, lean, { ...handAt(hip, lean, 3, -9), z: RACK_Z }, LOW, {
      head,
      elbowTo: 80,
      elbowsOut: 0.4,
    }),
    ...legs,
  };
}

/**
 * All poses of the lift set the elbow by `elbowTo`: a change between `elbows` and `elbowTo` makes the elbow jump.
 * The engine takes `elbowTo` when a pose has both.
 */
const elbowTo = (p: Pose, to: number, out: number): Pose => ({ ...p, elbowTo: to, elbowsOut: out });

// The bell rolls onto the forearm: the elbow comes back to the front of the ribs, the forearm points forward and up.
// With `elbowTo: 0` the engine takes the lowest point of the circle around the line from the shoulder to the hand:
// with the hand this far forward, that is in front of the ribs. Nearer to the body, it is behind the torso.
const ROLL: Pose = {
  ...pose({ x: 74, y: TALL }, 1, { x: 108, y: 92, z: 10 }, LOW, {
    head: -2,
    elbowTo: 0,
    elbowsOut: 0.2,
  }),
  ...legs,
};
const RACK = racked({ x: 74, y: TALL }, 2, 0);
// The dip: hips and knees bend a little, the torso stays upright, the bell stays in the rack.
const DIP = racked({ x: 73, y: TALL + 11 }, 2, 0);
// The drive: the legs extend, the bell leaves the rack, the hand passes the face.
const DRIVE: Pose = {
  ...pose({ x: 74, y: TALL }, 0, { x: 84, y: 44, z: 16 }, LOW, {
    head: -4,
    shrug: 2,
    elbowTo: 65,
    elbowsOut: 1.2,
  }),
  ...legs,
};
const TOP = elbowTo(locked({ x: 74, y: TALL }, 0), 60, 1.2);
/** The arm a little bent at the end of the swing: so the elbow has a side before it bends in the turnover. */
const bent = (p: Pose, part: number): Pose => {
  const [bell, free] = "x" in p.hands ? [p.hands, p.hands] : p.hands;
  const neck = shoulderOf(p.hip, p.lean);
  const hand = {
    ...bell,
    x: neck.x + (bell.x - neck.x) * part,
    y: neck.y + (bell.y - neck.y) * part,
  };
  return { ...p, hands: [hand, free] };
};
const ARRIVE_ = elbowTo(bent(ARRIVE, 0.96), -20, 0.3);
const PASS_ = elbowTo(PASS, -20, 0.3);
const HIKE_ = elbowTo(HIKE, -20, 0.3);

export const KETTLEBELL_CLEAN_AND_JERK: Exercise = {
  key: "kettlebell-clean-and-jerk",
  title: "Kettlebell Clean & Jerk",
  equipment: { kind: "kettlebells", hand: 0 },
  views: VIEWS,
  start: HIKE_,
  steps: [
    {
      to: ARRIVE_,
      via: [PASS_],
      seconds: 0.45,
      label: "Hüfte strecken",
      ease: "in",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    {
      to: RACK,
      via: [ROLL],
      seconds: 0.36,
      label: "Umsetzen",
      ease: "out",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    { to: RACK, seconds: 0.25, label: "Rack" },
    { to: DIP, seconds: 0.25, label: "Dip", ease: "soft", anchor: "feet", arms: "carry" },
    { to: DRIVE, seconds: 0.16, label: "Ausstoßen", ease: "in", anchor: "feet", arms: "fk" },
    { to: TOP, seconds: 0.16, ease: "out", anchor: "feet", arms: "fk" },
    { to: TOP, seconds: 0.4, label: "Über Kopf" },
    {
      to: RACK,
      via: [DRIVE],
      seconds: 0.45,
      label: "Ablassen",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
    },
    { to: RACK, seconds: 0.15 },
    {
      to: ARRIVE_,
      via: [ROLL],
      seconds: 0.4,
      label: "Rückschwung",
      ease: "in",
      anchor: "feet",
      arms: "line",
      follow: "hands",
    },
    {
      to: HIKE_,
      via: [PASS_],
      seconds: 0.4,
      ease: "out",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: HIKE_, seconds: 0.06 },
  ],
};
