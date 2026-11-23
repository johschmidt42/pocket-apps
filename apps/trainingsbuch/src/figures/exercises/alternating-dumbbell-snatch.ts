// Alternating Dumbbell Snatch: one snatch with each arm. Between them, the dumbbell is on the floor with both
// heads, and the hands change on it. The free hand comes in front of the knee, so that the arm does not go through the leg.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import type { Mode, Pose, Spot, Step } from "../skeleton.ts";
import { DUMBBELL_SNATCH } from "./dumbbell-snatch.ts";

const SETUP = DUMBBELL_SNATCH.start;
const handsOf = (pose: Pose): readonly [Spot, Spot] =>
  "x" in pose.hands ? [pose.hands, pose.hands] : pose.hands;
const [BELL] = handsOf(SETUP);
/** The same pose with the hands changed: the other arm does the work. */
const other = (pose: Pose): Pose => {
  const [first, second] = handsOf(pose);
  return { ...pose, hands: [second, first] };
};
const otherStep = (step: Step): Step => ({
  ...step,
  to: other(step.to),
  ...(step.via === undefined ? {} : { via: step.via.map(other) }),
  ...(step.arms === undefined || typeof step.arms === "string"
    ? {}
    : { arms: [step.arms[1], step.arms[0]] }),
});

// The free hand is in front of the knee, on its way to the dumbbell.
const AROUND: Pose = { ...SETUP, elbowsOut: 2, hands: [BELL, { x: 98, y: 188, z: 9 }] };
// Both hands are on the dumbbell.
const BOTH: Pose = { ...SETUP, hands: [BELL, BELL] };

/** One snatch, without the rest at the end. */
const REP = DUMBBELL_SNATCH.steps.slice(0, -1);
// "fk" for the arm that moves: on a straight line, a nearly straight arm whips its elbow. The other hand stays.
const change = (to: Pose, via: Pose, arms: readonly [Mode, Mode], label?: string): Step => ({
  to,
  via: [via],
  seconds: 0.28,
  ...(label === undefined ? {} : { label }),
  ease: "soft",
  anchor: "feet",
  arms,
  follow: "hands",
});
const TAKE = change(BOTH, AROUND, ["line", "fk"], "Hand wechseln");
const LET_GO = change(other(SETUP), other(AROUND), ["fk", "line"]);
const steps: Step[] = [
  ...REP,
  TAKE,
  LET_GO,
  ...REP.map(otherStep),
  otherStep(TAKE),
  otherStep(LET_GO),
];

const seconds = (list: Step[]) => list.reduce((sum, step) => sum + step.seconds, 0);
const total = seconds(steps);
/** The first change is at the end of `TAKE`, the second one at the end of the mirrored `TAKE`. */
const first = seconds(REP) + TAKE.seconds;
const second = first + LET_GO.seconds + seconds(REP) + TAKE.seconds;

export const ALTERNATING_DUMBBELL_SNATCH: Exercise = {
  key: "alternating-dumbbell-snatch",
  title: "Alternating DB Snatch",
  equipment: { kind: "dumbbell", hand: 0, swap: [first / total, second / total] },
  // The free arm reaches out on both sides: the front view is a little wider.
  views: [SIDE, { ...FRONT, box: [-68, -14, 136, 226] }],
  start: SETUP,
  steps,
};
