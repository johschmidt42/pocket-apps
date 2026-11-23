import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXERCISE_IDS } from "../exercises.ts";
import { equipmentParts } from "./equipment-parts.tsx";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { isWide, type Equipment, type Exercise } from "./exercise.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { ROW } from "./exercises/row.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { Figure } from "./figure.tsx";
import { BODY, type Vec } from "./skeleton.ts";

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
  it("are all 38 animations of the prototype", () => {
    expect(ALL).toHaveLength(38);
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
