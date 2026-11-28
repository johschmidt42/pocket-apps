import { expect, test } from "vitest";
import { addPoses, bothSides, ease, keys, mixPoses, wave, weakenPose } from "./pose.ts";

test("a pose for both sides mirrors the turn and the move of the left part", () => {
  expect(bothSides("wing-right", { turn: [0.1, 0.2, 0.3], move: [1, 2, 3], grow: 2 })).toEqual({
    "wing-right": { turn: [0.1, 0.2, 0.3], move: [1, 2, 3], grow: 2 },
    "wing-left": { turn: [0.1, -0.2, -0.3], move: [-1, 2, 3], grow: 2 },
  });
  const uneven = bothSides("leg-right", { turn: [0, 0, 1] }, { turn: [0, 0, 0.5] });
  expect(uneven["leg-left"]?.turn?.[2]).toBe(-0.5);
});

test("poses on top of each other add their turns and moves and multiply their sizes", () => {
  const pose = addPoses(
    { head: { turn: [0.1, 0, 0], grow: 2 } },
    {
      head: { turn: [0.2, 0, 0.5], move: [0, 3, 0], grow: [1, 0.5, 1] },
      wing: { move: [1, 0, 0] },
    },
  );
  expect(pose.head?.turn?.[0]).toBeCloseTo(0.3);
  expect(pose.head?.turn?.[2]).toBeCloseTo(0.5);
  expect(pose.head?.move).toEqual([0, 3, 0]);
  expect(pose.head?.grow).toEqual([2, 1, 2]);
  expect(pose.wing?.move).toEqual([1, 0, 0]);
});

test("a mix of two poses is between them, and a missing part counts as the rest state", () => {
  const half = mixPoses({ head: { turn: [1, 0, 0] } }, { wing: { grow: 3 } }, 0.5);
  expect(half.head?.turn).toEqual([0.5, 0, 0]);
  expect(half.wing?.grow).toEqual([2, 2, 2]);
  expect(mixPoses({ head: { move: [4, 0, 0] } }, {}, 0).head?.move).toEqual([4, 0, 0]);
  expect(mixPoses({ head: { move: [4, 0, 0] } }, {}, 1).head?.move).toEqual([0, 0, 0]);
});

test("a weak pose is nearer to the rest state", () => {
  expect(weakenPose({ head: { turn: [0, 0, 2], grow: 0 } }, 0.25).head).toEqual({
    turn: [0, 0, 0.5],
    move: [0, 0, 0],
    grow: [0.75, 0.75, 0.75],
  });
});

test("a wave repeats and can start later", () => {
  expect(wave(0, 2)).toBeCloseTo(0);
  expect(wave(0.125, 2)).toBeCloseTo(1);
  expect(wave(0.5, 2)).toBeCloseTo(0);
  expect(wave(0, 2, 0.25)).toBeCloseTo(1);
});

test("the soft step starts at 0, ends at 1 and stays in this range", () => {
  expect(ease(-1)).toBe(0);
  expect(ease(0.5)).toBe(0.5);
  expect(ease(2)).toBe(1);
});

test("keys give the values at their times and a soft curve between them", () => {
  const points: [number, number][] = [
    [0, 0],
    [1, 10],
    [3, 4],
  ];
  expect(keys(points, -5)).toBe(0);
  expect(keys(points, 0)).toBe(0);
  expect(keys(points, 0.5)).toBe(5);
  expect(keys(points, 1)).toBe(10);
  expect(keys(points, 2)).toBe(7);
  expect(keys(points, 99)).toBe(4);
  expect(keys([], 1)).toBe(0);
  expect(
    keys(
      [
        [1, 2],
        [1, 8],
      ],
      1,
    ),
  ).toBe(8);
});
