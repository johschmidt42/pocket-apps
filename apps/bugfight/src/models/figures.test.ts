import { describe, expect, test } from "vitest";
import { FIGURES } from "./figures.ts";
import { mirror, partNames, type FigureInput } from "./model.ts";

const INPUT: FigureInput = {
  time: 1.37,
  motion: "hover",
  motionTime: 0,
  lean: [0.6, -0.4],
  look: [0.5, -0.5],
  spots: 4,
};

describe.each(FIGURES)("the figure $name", (figure) => {
  const names = partNames(figure.spec.root);

  test("has a unique name for each part", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  test("has a left part for each right part", () => {
    for (const name of names.filter((name) => name.includes("right"))) {
      expect(names).toContain(name.replace("right", "left"));
    }
  });

  test("starts with a motion that repeats, and each other motion has a length or repeats", () => {
    expect(figure.motions[0]?.seconds).toBeNull();
    for (const motion of figure.motions) {
      expect(motion.seconds === null || motion.seconds > 0).toBe(true);
    }
  });

  test.each(figure.motions)(
    "the motion $name moves only parts that exist, with real numbers",
    (motion) => {
      const length = motion.seconds ?? 1;
      for (let step = 0; step <= 20; step++) {
        const motionTime = (length * step) / 20;
        const pose = figure.pose({
          ...INPUT,
          motion: motion.name,
          motionTime,
          time: 1.37 + motionTime,
        });
        expect(pose.flash).toBeGreaterThanOrEqual(0);
        expect(pose.flash).toBeLessThanOrEqual(1);
        for (const [name, part] of Object.entries(pose.parts)) {
          expect(names).toContain(name);
          const numbers = [part.turn, part.move, part.grow]
            .flat()
            .filter((number) => number !== undefined);
          expect(numbers.every((number) => Number.isFinite(number))).toBe(true);
        }
      }
    },
  );

  test("an unknown motion gives the base motion", () => {
    const unknown = figure.pose({ ...INPUT, motion: "no-such-motion" });
    expect(unknown).toEqual(figure.pose(INPUT));
  });
});

test("Seven hides the spots that he lost, the spot in the middle last", () => {
  const seven = FIGURES.find((figure) => figure.name === "seven");
  const hidden = (spots: number) =>
    Object.entries(seven?.pose({ ...INPUT, spots }).parts ?? {})
      .filter(([name, part]) => name.startsWith("spot-") && part.grow !== undefined)
      .filter(([, part]) => [part.grow].flat().every((size) => size === 0))
      .map(([name]) => name);
  expect(hidden(7)).toEqual([]);
  expect(hidden(6)).toEqual(["spot-right-3"]);
  expect(hidden(1)).toHaveLength(6);
  expect(hidden(1)).not.toContain("spot-center");
  expect(hidden(0)).toContain("spot-center");
});

test("the mirror picture of a part has the other side in each name and the other sign in x", () => {
  const left = mirror({
    name: "leg-right",
    at: [3, 1, 2],
    turn: [0.1, 0.2, 0.3],
    face: [1, 0, 0],
    shape: { kind: "half", size: [2, 3, 4] },
    shapeAt: [5, 0, 0],
    shapeTurn: [0, 1, 1],
    parts: [{ name: "foot-right", at: [1, 1, 1] }],
  });
  expect(left).toEqual({
    name: "leg-left",
    at: [-3, 1, 2],
    turn: [0.1, -0.2, -0.3],
    face: [-1, 0, 0],
    shape: { kind: "half", size: [-2, 3, 4] },
    shapeAt: [-5, 0, 0],
    shapeTurn: [0, -1, -1],
    parts: [{ name: "foot-left", at: [-1, 1, 1] }],
  });
});
