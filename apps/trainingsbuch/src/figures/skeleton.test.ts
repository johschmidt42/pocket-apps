import { describe, expect, it } from "vitest";
import {
  footLine,
  headOf,
  motion,
  solve,
  tiptoe,
  tiptoeFromToe,
  type Pose,
  type Vec,
} from "./skeleton.ts";

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const STANDING: Pose = {
  hip: { x: 74, y: 120 },
  lean: 0,
  feet: { x: 74, y: 200 },
  hands: { x: 76, y: 136 },
};

describe("solve", () => {
  it("makes a straight leg when the foot is out of reach", () => {
    const joints = solve({ ...STANDING, feet: { x: 74, y: 300 } });
    expect(distance(joints.legs[0].root, joints.legs[0].end)).toBeCloseTo(80, 1);
  });

  it("bends the knee forward when the foot is above the hip", () => {
    const joints = solve({ ...STANDING, feet: { x: 100, y: 100 }, knees: 0 });
    expect(joints.legs[0].mid.y).toBeLessThan(joints.legs[0].root.y);
  });

  it("has a knee when the foot is exactly at the hip", () => {
    const joints = solve({ ...STANDING, feet: { x: 74, y: 120, z: 7 } });
    expect(Number.isFinite(joints.legs[0].mid.x)).toBe(true);
  });

  it("takes a place of its own for each side", () => {
    const joints = solve({
      ...STANDING,
      feet: [
        { x: 90, y: 180 },
        { x: 50, y: 180 },
      ],
      toes: [90, 150],
    });
    expect(joints.legs[0].end.x).toBeCloseTo(90, 5);
    expect(joints.legs[1].end.x).toBeCloseTo(50, 5);
    expect(joints.toes).toEqual([90, 150]);
  });

  it("points the elbow to the angle of elbowTo", () => {
    const joints = solve({ ...STANDING, hands: { x: 100, y: 74 }, elbowTo: 180, elbowsOut: 0 });
    expect(joints.arms[0].mid.y).toBeLessThan(joints.arms[0].root.y);
  });

  it("raises only the shoulder joints with a shrug", () => {
    const flat = solve(STANDING);
    const shrugged = solve({ ...STANDING, shrug: 4 });
    expect(shrugged.arms[0].root.y).toBeCloseTo(flat.arms[0].root.y - 4, 5);
    expect(shrugged.shoulder).toEqual(flat.shoulder);
    expect(headOf(shrugged)).toEqual(headOf(flat));
  });

  it("moves the waist to the back with a round back and to the front with an arch", () => {
    expect(solve({ ...STANDING, bend: 20 }).waist.x).toBeLessThan(74);
    expect(solve({ ...STANDING, bend: -20 }).waist.x).toBeGreaterThan(74);
  });
});

describe("motion", () => {
  const LOW: Pose = { ...STANDING, hip: { x: 60, y: 160 }, lean: 30 };

  it("goes through a pose on the way and repeats after one loop", () => {
    const run = motion(STANDING, [
      { to: STANDING, via: [LOW], seconds: 1, ease: "linear", follow: "feet", legs: "carry" },
    ]);
    expect(run.total).toBe(1);
    expect(run.at(0.25).joints.hip.y).toBeGreaterThan(120);
    expect(run.at(1.25).joints.hip.y).toBeCloseTo(run.at(0.25).joints.hip.y, 5);
    expect(run.at(-0.75).joints.hip.y).toBeCloseTo(run.at(0.25).joints.hip.y, 5);
  });

  it("takes a way with no movement between the poses", () => {
    const run = motion(STANDING, [{ to: STANDING, via: [STANDING], seconds: 1 }]);
    expect(run.at(0.5).joints.hip).toEqual({ ...STANDING.hip, z: 0 });
  });

  it("moves each limb in its own mode", () => {
    const run = motion(STANDING, [
      { to: LOW, seconds: 1, ease: "in", legs: ["line", "fk"], arms: ["carry", "line"] },
      { to: STANDING, seconds: 1, ease: "out", anchor: "feet" },
    ]);
    expect(run.at(0.5).joints.legs[0].end.y).toBeCloseTo(200, 1);
    expect(run.at(1.5).joints.hip.y).toBeGreaterThan(120);
  });

  it("gives the last pose when the time is at the very end", () => {
    const run = motion(STANDING, [
      { to: LOW, seconds: 0.1 },
      { to: LOW, seconds: 0.2 },
    ]);
    expect(run.at(0.3 - 1e-12).joints.hip.x).toBeCloseTo(60, 5);
  });
});

describe("flight and a thrown ball", () => {
  const HIGH: Pose = { ...STANDING, hip: { x: 74, y: 100 }, feet: { x: 74, y: 180 } };

  it("lets the hip rise and fall in a flight", () => {
    const run = motion(STANDING, [{ to: STANDING, seconds: 0.4, ease: "linear", flight: true }]);
    expect(run.at(0.2).joints.hip.y).toBeLessThan(120 - 10);
  });

  it("has a ball in the air only in the steps with throw", () => {
    const point = { x: 120, y: -40 };
    const run = motion(STANDING, [
      { to: HIGH, seconds: 0.3 },
      { to: HIGH, seconds: 0.4, throw: point },
      { to: STANDING, seconds: 0.4, throw: point },
      { to: STANDING, seconds: 0.2 },
    ]);
    expect(run.at(0.1).thrown).toBeUndefined();
    expect(run.at(0.6).thrown?.y).toBeLessThan(40);
    expect(run.at(0.9).thrown).toBeDefined();
    expect(run.at(1.2).thrown).toBeUndefined();
  });
});

describe("tiptoe", () => {
  it("keeps the tip of the toe on its spot when the foot turns", () => {
    const toeOf = (toes: number) => {
      const ankle = tiptoeFromToe(100, toes);
      return footLine({ ...ankle, z: 0 }, toes).toe;
    };
    expect(toeOf(120).x).toBeCloseTo(100, 5);
    expect(toeOf(150).x).toBeCloseTo(100, 5);
    expect(tiptoe(50, 120).x).toBe(50);
  });
});

describe("footLine", () => {
  it("goes from the heel to the toe", () => {
    const { heel, toe } = footLine({ x: 0, y: 0, z: 0 }, 90);
    expect(toe.x - heel.x).toBeCloseTo(18, 5);
  });
});
