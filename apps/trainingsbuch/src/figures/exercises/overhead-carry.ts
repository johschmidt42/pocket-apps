// Overhead Carry with two kettlebells (Daniel Ray: "double-kettlebell overhead carry"): the walk of
// `farmers-carry.ts`, with each kettlebell locked out over its shoulder. The bell lies on the back of the forearm, as
// in the kettlebell thruster. The shoulders push up into the load. The arms do not swing.
import type { Exercise } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BODY, up } from "../skeleton.ts";
import { farmersCarry, tall } from "./farmers-carry.ts";

/** Active shoulders under a load overhead. */
export const SHRUG = 3;

/**
 * A hand on a locked arm over its shoulder joint, `dx` in front of it. `grip` is the distance of the hand to the side:
 * 13 is straight over the shoulder joint.
 */
export function overhead(
  hip: { x: number; y: number },
  lean: number,
  grip: number,
  dx: number,
): { x: number; y: number } {
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * SHRUG, y: neck.y + along.y * SHRUG };
  const reach = Math.sqrt(61.95 ** 2 - (grip - BODY.shoulderHalf) ** 2);
  return { x: joint.x + dx, y: joint.y - Math.sqrt(reach ** 2 - dx ** 2) };
}

/** The grip of the dumbbell thruster overhead: the bells are a little outside the shoulders. */
const GRIP = 20;

export const OVERHEAD_CARRY: Exercise = tall(
  farmersCarry({
    key: "overhead-carry",
    title: "Overhead Carry (Kettlebells)",
    equipment: { kind: "kettlebells" },
    grip: GRIP,
    upper: (_part, hip, lean) => ({
      hands: overhead(hip, lean, GRIP, 1),
      grip: GRIP,
      shrug: SHRUG,
      head: 4,
      elbowTo: 60,
      elbowsOut: 2,
    }),
  }),
);
