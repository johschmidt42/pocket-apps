// Lunge with a barbell in the front rack (Luke: "front-rack weighted lunges"). The bar lies on the
// shoulders, the elbows are high, as in the front squat. The legs are `walking-lunge.ts`.
import type { Exercise } from "../exercise.ts";
import { rackAt } from "../poses.ts";
import { lunge, type Upper } from "./walking-lunge.ts";

const frontRack: Upper = (_part, hip, lean) => ({ ...rackAt(hip, lean), grip: 16, head: 0 });

export const LUNGE_FRONT_RACK: Exercise = lunge({
  key: "lunge-front-rack",
  title: "Lunge (Front Rack)",
  equipment: { kind: "barbell" },
  upper: frontRack,
});
