import { describe, expect, it, vi } from "vitest";
import { createAttractorScene, type SceneView } from "./attractor-scene.ts";
import { ATTRACTORS } from "./attractors.ts";
import type { Ray } from "./mouse-effects.ts";
import { seededRandom } from "./seeded-random.ts";

const [AIZAWA, LORENZ] = ATTRACTORS;
const RAY: Ray = { origin: [0, 0, -5], direction: [0, 0, 1] };

function fakeView() {
  const drawn: Float32Array[] = [];
  const view = {
    setCameraAngle: vi.fn<(angle: number) => void>(),
    rayAt: vi.fn<(x: number, y: number) => Ray>(() => RAY),
    draw: vi.fn((points: Float32Array) => {
      drawn.push(points.slice());
    }),
  } satisfies SceneView;
  return { view, drawn };
}

function scene(attractor = AIZAWA!) {
  return createAttractorScene(attractor, seededRandom(1), 3);
}

describe("createAttractorScene", () => {
  it("swings the camera and draws each frame", () => {
    const { view, drawn } = fakeView();
    const subject = scene();
    subject.frame(1 / 60, view);
    subject.frame(1 / 60, view);
    expect(view.setCameraAngle).toHaveBeenCalledTimes(2);
    expect(drawn).toHaveLength(2);
    const total = subject.lines.reduce((sum, line) => sum + line.length, 0);
    expect(drawn[0]).toHaveLength(3 * total);
  });

  it("makes one step per 1/60 second", () => {
    const { view, drawn } = fakeView();
    const subject = scene();
    subject.frame(0, view);
    subject.frame(0, view);
    expect(drawn[1]).toEqual(drawn[0]);
    subject.frame(1 / 60, view);
    expect(drawn[2]).not.toEqual(drawn[1]);
  });

  it("ignores negative times", () => {
    const { view, drawn } = fakeView();
    const subject = scene();
    subject.frame(0, view);
    subject.frame(-1, view);
    expect(drawn[1]).toEqual(drawn[0]);
  });

  it("asks for the mouse ray only while a pointer is over the picture", () => {
    const { view } = fakeView();
    const subject = scene();
    subject.frame(1 / 60, view);
    expect(view.rayAt).not.toHaveBeenCalled();

    subject.setPointer({ x: 0.2, y: -0.4, pressed: false });
    subject.frame(1 / 60, view);
    expect(view.rayAt).toHaveBeenCalledWith(0.2, -0.4);
  });

  it("gets stronger with a pointer, more with the button down, and weaker without", () => {
    const { view } = fakeView();
    const subject = scene();
    expect(subject.status().strength).toBe(0);

    subject.setPointer({ x: 0, y: 0, pressed: false });
    for (let i = 0; i < 60; i++) subject.frame(1 / 60, view);
    const hover = subject.status().strength;
    expect(hover).toBeGreaterThan(0.9);

    subject.setPointer({ x: 0, y: 0, pressed: true });
    for (let i = 0; i < 60; i++) subject.frame(1 / 60, view);
    expect(subject.status().strength).toBeGreaterThan(hover);

    subject.setPointer(null);
    for (let i = 0; i < 120; i++) subject.frame(1 / 60, view);
    expect(subject.status().strength).toBeLessThan(0.01);
  });

  it.each(["lens", "gravity", "rubber"] as const)(
    "draws the plain points in mode %s without a pointer",
    (mode) => {
      const { view, drawn } = fakeView();
      const reference = fakeView();
      const subject = scene();
      const plain = scene();
      subject.setMode(mode);
      plain.setMode("gravity");
      subject.frame(1 / 60, view);
      plain.frame(1 / 60, reference.view);
      expect(drawn[0]).toEqual(reference.drawn[0]);
    },
  );

  it.each(["lens", "gravity", "rubber"] as const)("bends the lines in mode %s", (mode) => {
    const { view, drawn } = fakeView();
    const reference = fakeView();
    const subject = scene();
    const plain = scene();
    subject.setMode(mode);
    plain.setMode(mode);
    subject.setPointer({ x: 0, y: 0, pressed: true });
    for (let i = 0; i < 30; i++) {
      subject.frame(1 / 60, view);
      plain.frame(1 / 60, reference.view);
    }
    expect(drawn.at(-1)).not.toEqual(reference.drawn.at(-1));
  });

  it("drifts the parameters of Aizawa and starts them again on reset", () => {
    const { view } = fakeView();
    const subject = scene();
    for (let i = 0; i < 300; i++) subject.frame(0.1, view);
    expect(subject.status().params).not.toEqual(AIZAWA!.profiles[0]);

    subject.reset();

    expect(subject.status().params).toEqual(AIZAWA!.profiles[0]);
  });

  it("keeps the parameters of Lorenz", () => {
    const { view } = fakeView();
    const subject = scene(LORENZ);
    for (let i = 0; i < 100; i++) subject.frame(0.1, view);
    expect(subject.status().params).toEqual(LORENZ!.profiles[0]);
  });
});
