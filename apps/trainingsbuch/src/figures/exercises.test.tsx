import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXERCISE_IDS } from "../exercises.ts";
import { equipmentParts } from "./equipment-parts.tsx";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { dumbbellHand, isWide, type Equipment, type Exercise } from "./exercise.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { RING_DIP } from "./exercises/ring-dip.ts";
import { RING_PUSH_UP } from "./exercises/ring-push-up.ts";
import { ROW } from "./exercises/row.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { Figure } from "./figure.tsx";
import { RINGS, ringAnchor, strapOf } from "./machines.ts";
import { BODY, solve, type Vec } from "./skeleton.ts";

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Each animated exercise once, with all forms. */
const ALL: [string, Exercise][] = [
  ...new Map(
    EXERCISE_IDS.flatMap((id) => variantsOf(id, []) ?? []).map((variant) => [
      variant.exercise.key,
      variant.exercise,
    ]),
  ).entries(),
];

describe("the exercises", () => {
  it("are all 65 animations of the prototype", () => {
    expect(ALL).toHaveLength(65);
  });

  it("draws the bar of the back squat behind the body in the front view", () => {
    const { joints } = runOf(BACK_SQUAT).at(1.2);
    const scene = {
      joints,
      flat: (v: Vec) => ({ x: -v.z, y: v.y, depth: v.x }),
      fromSide: false,
      progress: 0,
      thrown: undefined,
    };
    const deepest = (equipment: Equipment) =>
      Math.max(...equipmentParts(equipment, scene).map((part) => part.depth));
    expect(deepest(BACK_SQUAT.equipment)).toBeLessThan(joints.hip.x);
    expect(deepest({ kind: "barbell" })).toBeGreaterThan(joints.hip.x);
  });

  it.each([true, false])("keeps the box on its spot (from the side: %s)", (fromSide) => {
    const scene = {
      joints: solve(BACK_SQUAT.start),
      // From the side, this is a figure that has turned around.
      flat: (v: Vec) => ({ x: fromSide ? 500 - v.x : v.x, y: v.y, depth: v.z }),
      fromSide,
      progress: 0,
      thrown: undefined,
    };
    const [part] = equipmentParts({ kind: "box", x: 224, width: 46, height: 50 }, scene);
    expect((part?.node as ReactElement<{ x: number; width: number }>).props).toMatchObject({
      x: 224,
      width: 46,
    });
  });

  it.each([
    [0, 0.1, 0],
    [0, 0.5, 1],
    [0, 0.9, 0],
    [1, 0.5, 0],
    [1, 1.1, 1],
  ] as const)("gives a dumbbell of hand %s at %s to hand %s", (hand, progress, holder) => {
    expect(dumbbellHand({ hand, swap: [0.4, 0.8] }, progress)).toBe(holder);
  });

  it("keeps a dumbbell without a swap in its hand", () => {
    expect(dumbbellHand({ hand: 1 }, 0.5)).toBe(1);
  });

  it("hangs the rings straight in the support and lets the arm push the strap out at the bottom", () => {
    const rings = { x: 80, y: 92 };
    const top = runOf(RING_DIP).at(0).joints;
    for (const side of [0, 1] as const) {
      const strap = strapOf(rings, top, side);
      const hand = top.arms[side].end;
      expect(distance(hand, ringAnchor(rings, hand))).toBeLessThanOrEqual(RINGS.strap + 1);
      expect(strap.points.at(-1)).toEqual(ringAnchor(rings, hand));
    }
    const bottom = runOf(RING_DIP).at(1.25).joints;
    const near = strapOf(rings, bottom, 0);
    const far = strapOf(rings, bottom, 1);
    expect(near.points.length).toBeGreaterThan(2);
    expect(Math.max(...near.points.map((p) => p.z))).toBeGreaterThan(bottom.arms[0].end.z + 2);
    expect(Math.min(...far.points.map((p) => p.z))).toBeLessThan(bottom.arms[1].end.z - 2);
  });

  it("draws each ring over the forearm of its side, also when the elbow goes out", () => {
    const scene = {
      joints: runOf(RING_PUSH_UP).at(0.9).joints,
      flat: (v: Vec) => ({ x: v.x, y: v.y, depth: v.z }),
      fromSide: true,
      progress: 0,
      thrown: undefined,
    };
    const rings = equipmentParts(RING_PUSH_UP.equipment, scene).filter(
      (part) => part.id === undefined,
    );
    expect(rings.map((part) => part.over)).toEqual([["forearm0"], ["forearm1"]]);
  });

  it("gives a wide picture two columns", () => {
    expect(isWide(ROW)).toBe(true);
    expect(isWide(THRUSTER)).toBe(false);
  });

  it.each(ALL)("%s keeps the length of the bones", (_, exercise) => {
    const run = runOf(exercise);
    for (let moment = 0; moment < 120; moment++) {
      const { joints } = run.at((run.total * moment) / 120);
      for (const leg of joints.legs) {
        expect(distance(leg.root, leg.mid)).toBeCloseTo(BODY.thigh, 5);
        expect(distance(leg.mid, leg.end)).toBeCloseTo(BODY.shin, 5);
      }
      for (const arm of joints.arms) {
        expect(distance(arm.root, arm.mid)).toBeCloseTo(BODY.upperArm, 5);
        expect(distance(arm.mid, arm.end)).toBeCloseTo(BODY.forearm, 5);
      }
    }
  });

  it.each(ALL)("%s draws valid numbers in each view", (_, exercise) => {
    const run = runOf(exercise);
    for (const view of exercise.views) {
      for (let moment = 0; moment < 12; moment++) {
        const frame = run.at((run.total * moment) / 12);
        const { container, unmount } = render(
          <svg>
            <Figure frame={frame} yaw={view.yaw} equipment={exercise.equipment} />
          </svg>,
        );
        expect(container.innerHTML).not.toContain("NaN");
        unmount();
      }
    }
  });
});
