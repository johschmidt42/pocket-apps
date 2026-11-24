// Kettlebell Thruster: the thruster of `dumbbell-thruster.ts` with two kettlebells (Strange). In the rack
// the bell lies on the back of the forearm, beside the shoulder. Overhead it lies on the back of the forearm too.
// The single-arm form (Bowen) is `kettlebell-thruster-single-arm.ts`.
import type { Exercise } from "../exercise.ts";
import { DUMBBELL_THRUSTER } from "./dumbbell-thruster.ts";

export const KETTLEBELL_THRUSTER: Exercise = {
  ...DUMBBELL_THRUSTER,
  key: "kettlebell-thruster",
  title: "Kettlebell Thruster",
  equipment: { kind: "kettlebells" },
};
