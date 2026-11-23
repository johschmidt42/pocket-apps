import { describe, expect, it } from "vitest";
import { BAR_FACING_BURPEE } from "./exercises/bar-facing-burpee.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { motion } from "./skeleton.ts";
import { motionOf } from "./turning-motion.ts";

const AXIS = BAR_FACING_BURPEE.turnAxis!;
const once = motion(BAR_FACING_BURPEE.start, BAR_FACING_BURPEE.steps).total;
const run = motionOf(BAR_FACING_BURPEE);
const turnSeconds = BAR_FACING_BURPEE.steps.at(-1)!.seconds;

/** Where the side view draws the hip at this moment. */
function drawnHip(seconds: number): number {
  const frame = run.at(seconds);
  return frame.facing!.offset + frame.facing!.scale * frame.joints.hip.x;
}

describe("motionOf", () => {
  it("keeps an exercise without a turn as it is", () => {
    const plain = motionOf(THRUSTER);
    expect(plain.total).toBe(motion(THRUSTER.start, THRUSTER.steps).total);
    expect(plain.at(0.2).facing).toBeUndefined();
  });

  it("plays two repetitions, and the second one is mirrored about the bar", () => {
    expect(run.total).toBeCloseTo(2 * once, 6);
    expect(run.at(0.5).facing).toEqual({ scale: 1, offset: 0 });
    expect(run.at(once + 0.5).facing).toEqual({ scale: -1, offset: 2 * AXIS });
    expect(drawnHip(once + 0.5)).toBeCloseTo(2 * AXIS - drawnHip(0.5), 6);
  });

  it.each([0, 1])("keeps the hip on its spot in the turn of repetition %i", (repetition) => {
    const start = once * (repetition + 1) - turnSeconds;
    const spot = drawnHip(start);
    for (let part = 0; part < 1; part += 0.1) {
      expect(drawnHip(start + part * turnSeconds)).toBeCloseTo(spot, 6);
    }
  });

  it("has no jump of the hip where the repetitions meet", () => {
    expect(drawnHip(once - 0.0001)).toBeCloseTo(drawnHip(once), 1);
    expect(drawnHip(2 * once - 0.0001)).toBeCloseTo(drawnHip(0), 1);
  });
});
