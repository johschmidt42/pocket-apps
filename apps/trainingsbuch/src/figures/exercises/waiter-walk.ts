// Waiter Walk (Weston: "50 m dumbbell waiter walk, right arm", then the left arm): the walk of
// `farmers-carry.ts` with one dumbbell locked out over the near shoulder. The free arm hangs and swings a little, as
// in the farmers carry. The workouts change the arm after 50 m. The animation shows the near arm.
import type { Exercise } from "../exercise.ts";
import { BODY } from "../skeleton.ts";
import { farmersCarry, handOf, tall } from "./farmers-carry.ts";
import { overhead, SHRUG } from "./overhead-carry.ts";

/** The free hand hangs a little away from the thigh. */
const FREE = 19;

export const WAITER_WALK: Exercise = tall(
  farmersCarry({
    key: "waiter-walk",
    title: "Waiter Walk",
    equipment: { kind: "dumbbell", hand: 0 },
    grip: FREE,
    upper: (part, hip, lean) => ({
      // The dumbbell is straight over the shoulder joint.
      hands: [
        { ...overhead(hip, lean, BODY.shoulderHalf, 1), z: BODY.shoulderHalf },
        { ...handOf(part + 0.5, hip, FREE), z: FREE },
      ],
      shrug: SHRUG,
      head: 4,
      elbowTo: 60,
      elbowsOut: 0.5,
    }),
  }),
);
