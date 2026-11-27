// Dumbbell Box Step-up (Open 19.3: "50 dumbbell box step-ups", one dumbbell). The standard permits any
// hold. The dumbbell hangs in the near hand at the side, as in the lunge with one dumbbell. The far arm hangs too.
import type { Exercise } from "../exercise.ts";
import { hanging } from "./lunge-dumbbells.ts";
import { stepUp } from "./step-up.ts";

/** The hand with the dumbbell is a little out from the thigh (as in the lunge). The free hand is as in the step-up. */
const GRIP = 23;

export const STEP_UP_DUMBBELL: Exercise = stepUp({
  key: "step-up-dumbbell",
  title: "Box Step-up (Kurzhantel)",
  load: { kind: "dumbbells", hand: 0 },
  map: (pose) => {
    const free = "x" in pose.hands ? pose.hands : pose.hands[1];
    return {
      ...pose,
      hands: [
        { ...hanging(pose.hip, pose.lean, GRIP), z: GRIP },
        { ...free, z: pose.grip ?? 19 },
      ],
      elbows: -0.2,
    };
  },
});
