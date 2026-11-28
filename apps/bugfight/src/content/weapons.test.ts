import { expect, test } from "vitest";
import { powerOf, streamsOf } from "./weapons.ts";

test("level 1 has one stream straight up", () => {
  expect(streamsOf(1)).toEqual([{ angle: 0 }]);
});

test("each level adds one stream and makes the fan wider", () => {
  for (let level = 1; level <= 10; level++) expect(streamsOf(level)).toHaveLength(level);
  const width = (level: number) => streamsOf(level).at(-1)!.angle - streamsOf(level)[0]!.angle;
  expect(width(2)).toBeCloseTo((6 * Math.PI) / 180);
  expect(width(5)).toBeGreaterThan(width(4));
  expect(width(10)).toBeCloseTo((54 * Math.PI) / 180);
});

test("the fan is the same on both sides", () => {
  const streams = streamsOf(7);
  streams.forEach((stream, index) => {
    expect(stream.angle).toBeCloseTo(-streams[streams.length - 1 - index]!.angle);
  });
  // The stream in the middle points straight up.
  expect(streams[3]?.angle).toBeCloseTo(0);
});

test("a level out of the range counts as the nearest level", () => {
  expect(streamsOf(0)).toEqual(streamsOf(1));
  expect(streamsOf(99)).toEqual(streamsOf(10));
  expect(powerOf(-3)).toEqual(powerOf(1));
});

test("a higher level makes the puffs larger and stronger", () => {
  expect(powerOf(1)).toEqual({ radius: 1, damage: 1 });
  expect(powerOf(10).radius).toBeCloseTo(1.27);
  expect(powerOf(10).damage).toBeCloseTo(1.9);
});
