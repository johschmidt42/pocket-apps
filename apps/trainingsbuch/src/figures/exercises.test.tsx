import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXERCISE_IDS, type ExerciseId } from "../exercises.ts";
import { equipmentParts } from "./equipment-parts.tsx";
import { runOf, variantsOf } from "./exercise-motions.ts";
import { dumbbellHand, floorDumbbellZ, isWide, type Equipment, type Exercise } from "./exercise.ts";
import { BACK_EXTENSION } from "./exercises/back-extension.ts";
import { BACK_SQUAT } from "./exercises/back-squat.ts";
import { BURPEE_OVER_DUMBBELL } from "./exercises/burpee-over-dumbbell.ts";
import { FARMERS_CARRY_KETTLEBELL } from "./exercises/farmers-carry-kettlebell.ts";
import { GHD_SIT_UP } from "./exercises/ghd-sit-up.ts";
import { GOBLET_SQUAT } from "./exercises/goblet-squat.ts";
import { KETTLEBELL_THRUSTER_SINGLE_ARM } from "./exercises/kettlebell-thruster-single-arm.ts";
import { KETTLEBELL_THRUSTER } from "./exercises/kettlebell-thruster.ts";
import { RING_DIP } from "./exercises/ring-dip.ts";
import { RING_PUSH_UP } from "./exercises/ring-push-up.ts";
import { ROW } from "./exercises/row.ts";
import { RUN_BARBELL } from "./exercises/run-barbell.ts";
import { RUN_MEDICINE_BALL } from "./exercises/run-medicine-ball.ts";
import { SHUTTLE_RUN } from "./exercises/shuttle-run.ts";
import { THRUSTER } from "./exercises/thruster.ts";
import { Figure } from "./figure.tsx";
import { RINGS, ringAnchor, strapOf } from "./machines.ts";
import { BELL, bellCenter, BODY, heldBell, solve, type Vec } from "./skeleton.ts";

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Lines of a workout with each form of the run: the forms with a load show only for such lines. */
const LOADED_RUNS = [
  "400 m run",
  "400 m run with a plate",
  "200 m run with a plate overhead",
  "400 m run with a medicine ball",
  "800 m run with an empty barbell",
];

/** Lines of workouts that ask for a form that only these words show. */
const FORM_LINES: readonly (readonly [ExerciseId, string])[] = [
  ["walking-lunge", "20 walking lunges with two kettlebells"],
  ["step-up", "30 barbell step-ups"],
  ["step-up", "50 dumbbell box step-ups"],
  ["farmers-carry", "10 m barbell farmers carry"],
  ["farmers-carry", "800 m single-arm barbell farmers carry"],
  ["burpee-pull-up", "7 burpee chest-to-bar pull-ups"],
  ["burpee", "23 burpees over the backpack"],
  ["handstand-push-up", "8 freestanding handstand push-ups"],
  ["dumbbell-thruster", "10 left-arm dumbbell thrusters"],
  ["dumbbell-thruster", "Dumbbell squat clean thrusters"],
  ["overhead-squat", "21 overhead squats, left arm"],
  ["thruster", "2 squat clean thrusters"],
  ["dumbbell-clean", "15 dumbbell split cleans"],
  ["dumbbell-snatch", "10 dumbbell hang split snatches, right arm"],
];

/** Each animated exercise once, with all forms. */
const ALL: [string, Exercise][] = [
  ...new Map(
    [
      ...EXERCISE_IDS.flatMap((id) => variantsOf(id, []) ?? []),
      ...(variantsOf("run", LOADED_RUNS) ?? []),
      // Only the line of Open 26.1 shows the step-over with a medicine ball.
      ...(variantsOf("box-step-over", ["18 medicine-ball box step-overs"]) ?? []),
      // These forms show only for the words of their workouts.
      ...FORM_LINES.flatMap(([id, line]) => variantsOf(id, [line]) ?? []),
    ].map((variant) => [variant.exercise.key, variant.exercise]),
  ).entries(),
];

describe("the exercises", () => {
  it("are all 137 animations of the prototype", () => {
    expect(ALL).toHaveLength(137);
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

  it("lays a racked kettlebell on the outside of the forearm, and lets it hang in a carry", () => {
    const rack = runOf(KETTLEBELL_THRUSTER).at(0).joints.arms[0];
    expect(heldBell(rack).z).toBeGreaterThan(rack.mid.z + 10);
    const carry = runOf(FARMERS_CARRY_KETTLEBELL).at(0).joints.arms[0];
    expect(heldBell(carry)).toEqual({ x: carry.end.x, y: carry.end.y + BELL.away, z: carry.end.z });
  });

  it("hangs the bell of the goblet squat below the hands", () => {
    const { joints } = runOf(GOBLET_SQUAT).at(0);
    const bell = bellCenter(joints, true);
    expect(bell.y - joints.arms[0].end.y).toBeCloseTo(BELL.away, 0);
    expect(bellCenter(joints).y).toBeLessThan(bell.y);
  });

  it("draws one kettlebell in the single-arm thruster and two in the other form", () => {
    const parts = (exercise: Exercise) => {
      const scene = {
        joints: runOf(exercise).at(0).joints,
        flat: (v: Vec) => ({ x: v.x, y: v.y, depth: v.z }),
        fromSide: true,
        progress: 0,
        thrown: undefined,
      };
      return equipmentParts(exercise.equipment, scene).length;
    };
    expect(parts(KETTLEBELL_THRUSTER)).toBe(4);
    expect(parts(KETTLEBELL_THRUSTER_SINGLE_ARM)).toBe(2);
  });

  it("moves the dumbbell on the floor to the other side and back in the burpee over the dumbbell", () => {
    const equipment = BURPEE_OVER_DUMBBELL.equipment;
    if (equipment.kind !== "floordumbbell") throw new Error("no dumbbell on the floor");
    const [first, second] = equipment.crossings;
    expect(floorDumbbellZ(equipment, 0)).toBe(34);
    expect(floorDumbbellZ(equipment, ((first?.[0] ?? 0) + (first?.[1] ?? 0)) / 2)).toBeCloseTo(0);
    expect(floorDumbbellZ(equipment, ((first?.[1] ?? 0) + (second?.[0] ?? 0)) / 2)).toBe(-34);
    expect(floorDumbbellZ(equipment, 0.999)).toBe(34);
  });

  it.each([true, false])(
    "draws an empty barbell without plates (from the side: %s)",
    (fromSide) => {
      const scene = {
        joints: runOf(RUN_BARBELL).at(0).joints,
        flat: fromSide
          ? (v: Vec) => ({ x: v.x, y: v.y, depth: v.z })
          : (v: Vec) => ({ x: -v.z, y: v.y, depth: v.x }),
        fromSide,
        progress: 0,
        thrown: undefined,
      };
      const empty = equipmentParts(RUN_BARBELL.equipment, scene);
      const loaded = equipmentParts({ kind: "barbell", onBack: true }, scene);
      expect(empty.length).toBeLessThan(loaded.length);
    },
  );

  it("holds the medicine ball above the middle of the hands", () => {
    const { joints } = runOf(RUN_MEDICINE_BALL).at(0);
    const scene = {
      joints,
      flat: (v: Vec) => ({ x: v.x, y: v.y, depth: v.z }),
      fromSide: true,
      progress: 0,
      thrown: undefined,
    };
    const parts = equipmentParts(RUN_MEDICINE_BALL.equipment, scene);
    expect(parts).toHaveLength(1);
    const ball = parts[0]?.node as ReactElement<{ cy: number }>;
    const hands = (joints.arms[0].end.y + joints.arms[1].end.y) / 2;
    expect(ball.props.cy).toBeCloseTo(hands - 6);
  });

  it.each([true, false])(
    "draws one mark for each line of the shuttle run (from the side: %s)",
    (fromSide) => {
      const scene = {
        joints: runOf(SHUTTLE_RUN).at(0).joints,
        flat: (v: Vec) => ({ x: -v.z, y: v.y, depth: v.x }),
        fromSide,
        progress: 0,
        thrown: undefined,
      };
      expect(equipmentParts(SHUTTLE_RUN.equipment, scene)).toHaveLength(2);
    },
  );

  it.each([
    [true, 11],
    [false, 3],
  ] as const)("draws the GHD (from the side: %s) in %i parts", (fromSide, count) => {
    const scene = {
      joints: runOf(GHD_SIT_UP).at(0).joints,
      flat: fromSide
        ? (v: Vec) => ({ x: v.x, y: v.y, depth: v.z })
        : (v: Vec) => ({ x: -v.z, y: v.y, depth: v.x }),
      fromSide,
      progress: 0,
      thrown: undefined,
    };
    expect(equipmentParts(GHD_SIT_UP.equipment, scene)).toHaveLength(count);
  });

  it("puts the foot plate of the GHD behind the pad for the back extension", () => {
    /** How far the foot plate is in front of the middle of the pad (negative: behind it). */
    const plateAhead = (exercise: Exercise) => {
      const scene = {
        joints: runOf(exercise).at(0).joints,
        flat: (v: Vec) => ({ x: v.x, y: v.y, depth: v.z }),
        fromSide: true,
        progress: 0,
        thrown: undefined,
      };
      const plate = equipmentParts(exercise.equipment, scene).find(
        (part) => (part.node as ReactElement).key === "ghdPlate",
      );
      const pad = exercise.equipment.kind === "ghd" ? exercise.equipment.x : Number.NaN;
      return (plate?.node as ReactElement<{ x: number }>).props.x - pad;
    };
    expect(plateAhead(BACK_EXTENSION)).toBeLessThan(0);
    expect(plateAhead(GHD_SIT_UP)).toBeGreaterThan(0);
  });

  it("gives a wide picture two columns", () => {
    expect(isWide(ROW)).toBe(true);
    expect(isWide(SHUTTLE_RUN)).toBe(true);
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
            <Figure
              frame={frame}
              yaw={view.yaw}
              equipment={exercise.equipment}
              load={exercise.load}
            />
          </svg>,
        );
        expect(container.innerHTML).not.toContain("NaN");
        unmount();
      }
    }
  });
});
