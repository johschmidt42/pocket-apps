// Lunge with two dumbbells: the walking lunge of `walking-lunge.ts`, a dumbbell hangs in each hand.
// The workouts (Josh-O, Swift 1-1, Luke) do not say "walking", but the lunges travel in most gyms, and the
// standard is the same: the back knee touches the ground, the hips and the knees open fully at the top.
// The arms hang still beside the body: a load does not swing. The hands are outside the thighs (as in the farmers carry).
import type { Exercise } from "../exercise.ts";
import { up, type Spot } from "../skeleton.ts";
import { handOf, lunge, type Upper } from "./walking-lunge.ts";

const ARM = 61.95;
const SHOULDER_Z = 13;

/** The hand of a straight arm that hangs still from its shoulder joint, `dx` in front of it. */
export function hanging(hip: Spot, lean: number, grip: number, dx = 2): Spot {
  const torso = up(lean);
  const joint = { x: hip.x + torso.x * 46, y: hip.y + torso.y * 46 };
  const flat = Math.sqrt(ARM ** 2 - (grip - SHOULDER_Z) ** 2);
  return { x: joint.x + dx, y: joint.y + Math.sqrt(flat ** 2 - dx ** 2) };
}

const GRIP = 23;

const twoDumbbells: Upper = (_part, hip, lean) => {
  const hand = hanging(hip, lean, GRIP);
  return { hands: [hand, hand], grip: GRIP, elbows: -0.2 };
};

/** The near hand holds the dumbbell and hangs still. The far arm swings a little, as in the walking lunge. */
export const oneDumbbellAtSide: Upper = (part, hip, lean) => ({
  hands: [
    { ...hanging(hip, lean, GRIP), z: GRIP },
    { ...handOf(part + 0.5, hip, lean), z: 19 },
  ],
  grip: 21,
  elbows: -0.2,
});

export const LUNGE_DUMBBELLS: Exercise = lunge({
  key: "lunge-dumbbells",
  title: "Lunge (zwei Kurzhanteln)",
  equipment: { kind: "dumbbells" },
  upper: twoDumbbells,
});
