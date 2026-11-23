import type { Exercise } from "./exercise.ts";
import { motion, type Motion } from "./skeleton.ts";

/**
 * The motion of an exercise. With `turnAxis`, the steps are one repetition that crosses the axis
 * and ends with a turn. The loop then has two repetitions, and the second one is mirrored about the
 * axis. So the figure goes to and fro over the axis and always looks at it. In the step with
 * `turn`, the figure stays on its spot and turns around its hip.
 */
export function motionOf(exercise: Exercise): Motion {
  const run = motion(exercise.start, exercise.steps);
  const axis = exercise.turnAxis;
  const index = exercise.steps.findIndex((step) => step.turn === true);
  const turn = exercise.steps[index];
  if (axis === undefined || turn === undefined) return run;
  const from = exercise.steps.slice(0, index).reduce((sum, step) => sum + step.seconds, 0);
  const spot = run.at(from).joints.hip.x;
  const total = run.total * 2;
  return {
    total,
    at(seconds) {
      const time = ((seconds % total) + total) % total;
      const second = time >= run.total;
      const local = second ? time - run.total : time;
      const frame = run.at(local);
      const sign = second ? -1 : 1;
      const base = second ? 2 * axis : 0;
      const progress = seconds / total;
      if (local < from || local >= from + turn.seconds) {
        return { ...frame, progress, facing: { scale: sign, offset: base } };
      }
      const part = (local - from) / turn.seconds;
      const scale = sign * Math.cos(Math.PI * part * part * (3 - 2 * part));
      return {
        ...frame,
        progress,
        facing: { scale, offset: base + sign * spot - scale * frame.joints.hip.x },
      };
    },
  };
}
