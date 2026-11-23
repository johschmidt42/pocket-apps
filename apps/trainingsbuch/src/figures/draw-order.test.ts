import { describe, expect, it } from "vitest";
import { drawOrder, type FlatPoint, type Part } from "./draw-order.ts";

const point = (x: number, y: number, depth: number): FlatPoint => ({ x, y, depth });

function line(id: string, a: FlatPoint, b: FlatPoint, half = 3): Part<string> {
  return { id, node: id, depth: (a.depth + b.depth) / 2, shape: { a, b, half } };
}

const names = (parts: readonly Part<string>[]) => drawOrder(parts).map((part) => part.node);

describe("drawOrder", () => {
  it("draws far parts first", () => {
    expect(
      names([
        line("near", point(0, 0, 5), point(10, 0, 5)),
        line("far", point(0, 0, -5), point(10, 0, -5)),
      ]),
    ).toEqual(["far", "near"]);
  });

  it("compares two parts where they overlap, not at their middle", () => {
    // A long torso that leans toward the camera. Its middle is nearer than the arm, but the arm
    // crosses it at its far end.
    const torso = line("torso", point(0, 0, -20), point(0, 100, 40));
    const arm = line("arm", point(-10, 5, -5), point(10, 5, -5));
    expect(names([arm, torso])).toEqual(["torso", "arm"]);
  });

  it("keeps the order of the depths for parts that do not overlap", () => {
    expect(
      names([
        line("b", point(0, 0, 2), point(1, 0, 2)),
        line("a", point(100, 0, 1), point(101, 0, 1)),
      ]),
    ).toEqual(["a", "b"]);
  });

  it("draws a patch over its parts and under what is in front of them", () => {
    const thigh = line("thigh", point(0, 0, 0), point(10, 0, 0));
    const arm = line("arm", point(5, -5, 9), point(5, 5, 9));
    const patch: Part<string> = { depth: 20, node: "patch", over: ["thigh"] };
    expect(names([arm, patch, thigh])).toEqual(["thigh", "patch", "arm"]);
  });

  it("draws each part once when the comparisons contradict one another", () => {
    const a = line("a", point(0, 0, 0), point(20, 0, 10));
    const b = line("b", point(20, 0, 0), point(20, 20, 10));
    const c = line("c", point(20, 20, 0), point(0, 0, 10));
    expect(names([a, b, c]).sort()).toEqual(["a", "b", "c"]);
  });

  it("takes parts of the same depth in their order", () => {
    const parts: Part<string>[] = [
      { depth: 1, node: "first" },
      { depth: 1, node: "second" },
    ];
    expect(names(parts)).toEqual(["first", "second"]);
  });

  it("draws a part first that another part needs, also over a third one", () => {
    const back = line("back", point(0, 0, 10), point(10, 0, 10));
    const middle = line("middle", point(10, 0, 11), point(20, 0, 11));
    const front: Part<string> = { depth: -5, node: "front", over: ["middle"] };
    expect(names([front, middle, back])).toEqual(["back", "middle", "front"]);
  });
});
