// Shuttle Run (CrossFit Open 23.2A, City 100, Santora and others): a sprint to the line, a stop with both
// feet behind it, a turn, and back. No crouch and no hand on the floor: the figure just runs. It runs over the ground
// with the stride of the run. The real distance (7.6 m in 23.2A) does not fit the picture: the figure runs about 2.5 m.
// The steps are one length: `runOf()` plays it to and fro, so the second length is the way back.
import type { Exercise } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { tiptoe, type Pose, type Spot, type Step } from "../skeleton.ts";
import { RUN_STRIDE, runInFlight, runOver } from "./run.ts";

/** The feet of the figure at the start line. */
const START_FEET = 40;
/** The run starts at this part of the stride (the near foot is about to push off) and ends at a landing of the far foot. */
const FROM = 0.3;
const TO = 1.5;
const POSES_PER_STRIDE = 40;
/** The line is this far in front of the near foot at the stop: both feet stay behind it, the toe 5.5 before it. */
const REACH = 30;

const foot = (pose: Pose, side: 0 | 1): Spot => ("x" in pose.feet ? pose.feet : pose.feet[side]);

/** An upright stance with both feet at `feetX`, the arms bent as in the run: the start, and the stop. */
function stance(feetX: number): Pose {
  const hip = { x: feetX - 2, y: 122 };
  return {
    hip,
    lean: 6,
    head: -6,
    feet: { x: feetX, y: 200 },
    stance: 7,
    knees: 0.1,
    grip: 15,
    hands: handAt(hip, 6, 18, 44),
    elbowTo: -30,
  };
}

// The run is moved so that the near foot of its first pose is on the spot of the feet at the start.
const offset = START_FEET - foot(runOver(FROM, 0), 0).x;
const run = (part: number) => runOver(part, offset);
/** The far foot lands here at the end of the run. */
const LAST_LANDING = foot(run(TO), 1).x;
/** The brake step: the near foot goes past the far foot and lands here, before the line. */
const STOP_FEET = LAST_LANDING + 45;

const START = stance(START_FEET);
const STOP = stance(STOP_FEET);
/** The middle between the two stops: the figure turns around and runs back over it. */
const CENTER = (START_FEET + STOP_FEET) / 2;

const step = RUN_STRIDE.seconds / POSES_PER_STRIDE;
const runSteps: Step[] = [];
for (let i = 1; i <= Math.round((TO - FROM) * POSES_PER_STRIDE); i++) {
  const part = FROM + i / POSES_PER_STRIDE;
  const before = part - 1 / POSES_PER_STRIDE;
  runSteps.push({
    to: run(part),
    seconds: step,
    ease: "linear",
    legs: "line",
    arms: "fk",
    ...(runInFlight(before) ? { flight: true } : {}),
  });
}

// The brake step. The near leg swings forward as in the run (`SWING`), and lands before the line, in front of the
// hip (`PLANT`). The body stays upright and leans back a little. The far foot stays at its landing spot.
const SWING = run(TO + 0.06);
const plantHip = { x: STOP_FEET - 22, y: 128 };
const PLANT: Pose = {
  ...STOP,
  hip: plantHip,
  lean: -2,
  feet: [{ x: STOP_FEET, y: 200 }, tiptoe(LAST_LANDING, 120)],
  toes: [90, 120],
  hands: handAt(plantHip, -2, 16, 42),
};
/** The hip slows down from the speed of the run to rest. With the ease "out", the start speed is 2 * way / time. */
const BRAKE = (2 * (plantHip.x - SWING.hip.x)) / RUN_STRIDE.speed;
// The far foot steps up beside the near one, both behind the line.
const stepHip = { x: STOP_FEET - 9, y: 124 };
const STEP_UP: Pose = {
  ...PLANT,
  hip: stepHip,
  lean: 2,
  feet: [
    { x: STOP_FEET, y: 200 },
    { x: STOP_FEET - 14, y: 188 },
  ],
  toes: [90, 105],
  hands: handAt(stepHip, 2, 17, 43),
};

export const SHUTTLE_RUN: Exercise = {
  key: "shuttle-run",
  title: "Shuttle Run",
  // Each line is `REACH` in front of the feet at the stop. At the start, the line is behind the feet: the figure
  // stopped at it and runs away from it.
  equipment: { kind: "lines", x: [START_FEET - REACH, STOP_FEET + REACH] },
  views: [
    { label: "Seite", yaw: 0, box: [START_FEET - 80, 30, STOP_FEET - START_FEET + 160, 190] },
  ],
  turnAxis: CENTER,
  start: START,
  steps: [
    { to: START, seconds: 0.12, label: "Start" },
    // The push off: the hip goes forward over the near foot, the far leg swings forward.
    { to: run(FROM), seconds: 0.22, label: "Sprint", ease: "in", legs: "line", arms: "fk" },
    ...runSteps,
    // The near foot lands before the line, the hip slows down.
    {
      to: SWING,
      seconds: RUN_STRIDE.seconds * 0.06,
      label: "Bremsen",
      ease: "linear",
      legs: "line",
      arms: "fk",
    },
    { to: PLANT, seconds: BRAKE, ease: "out", legs: "line", arms: "fk" },
    {
      to: STOP,
      via: [STEP_UP],
      seconds: 0.26,
      label: "Stopp",
      ease: "soft",
      legs: "line",
      arms: "fk",
    },
    {
      to: START,
      seconds: 0.5,
      label: "Wenden",
      ease: "linear",
      turn: true,
      legs: "carry",
      arms: "carry",
    },
  ],
};
