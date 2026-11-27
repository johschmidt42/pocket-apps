// Legless Rope Climb in an L-sit (Robbie: "L-sit rope climb to 4.6 m"): the legs are straight and forward,
// level with the hips, and do not touch the rope. Only the arms climb, hand over hand: the arms pull the body up, then
// the lower hand reaches above the other. The rope passes between the legs. The camera follows the figure: the rope
// moves down, as in `rope-climb.ts`.
import type { Exercise } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

const ROPE = 92;
/** How far the body rises in one pull. One loop has two pulls, one for each hand. */
const PULL = 24;
/** The hand above at the start of a pull. */
const TOP = 34;
const LEAN = -4;

type Hands = { near: number; far: number };

/** A pose with the shoulders at the height `shoulderY` and the hands at these heights on the rope. */
function pose(shoulderY: number, hands: Hands, head: number): Pose {
  const torso = up(LEAN);
  const shoulder = { x: ROPE - 12, y: shoulderY };
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  return {
    hip,
    lean: LEAN,
    head,
    // The legs are straight and level: the L-sit.
    feet: { x: hip.x + 79.5, y: hip.y + 3 },
    toes: 90,
    stance: 8,
    knees: 0,
    hands: [
      { x: ROPE, y: hands.near },
      { x: ROPE, y: hands.far },
    ],
    grip: 2,
    elbowTo: 70,
    elbowsOut: 0.8,
  };
}

// The near hand is above, the far hand 24 below it. The arms are nearly long.
const HANG = pose(TOP + 50, { near: TOP, far: TOP + PULL }, -14);
// The arms pull: the body rises 24, the lower hand is at the chin.
const PULLED = pose(TOP + 50 - PULL, { near: TOP, far: TOP + PULL }, -18);
// The far hand reaches over the near hand.
const REACHED = pose(TOP + 50 - PULL, { near: TOP, far: TOP - PULL }, -20);
// The second pull: the far hand is above now.
const PULLED_2 = pose(TOP + 50 - 2 * PULL, { near: TOP, far: TOP - PULL }, -18);
const REACHED_2 = pose(TOP + 50 - 2 * PULL, { near: TOP - 2 * PULL, far: TOP - PULL }, -20);

export const LEGLESS_ROPE_CLIMB: Exercise = {
  key: "legless-rope-climb",
  title: "Legless Rope Climb (L-Sitz)",
  equipment: { kind: "rope", x: ROPE },
  views: [{ label: "Seite", yaw: 0, box: [30, -20, 170, 226] }],
  scroll: 2 * PULL,
  ground: false,
  start: HANG,
  steps: [
    { to: PULLED, seconds: 0.45, label: "Ziehen", ease: "soft", arms: "line" },
    { to: REACHED, seconds: 0.35, label: "Greifen", ease: "soft", arms: "line" },
    { to: PULLED_2, seconds: 0.45, label: "Ziehen", ease: "soft", arms: "line" },
    { to: REACHED_2, seconds: 0.35, label: "Greifen", ease: "soft", arms: "line" },
  ],
};
