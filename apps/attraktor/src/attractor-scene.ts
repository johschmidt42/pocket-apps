import type { Attractor, Params } from "./attractors.ts";
import { createDrift, type Drift } from "./drift.ts";
import {
  applyLens,
  applyRubber,
  goalStrength,
  nextStrength,
  type MouseMode,
  type Pointer,
  type Ray,
} from "./mouse-effects.ts";
import { createSimulation, LINE_COUNT, type Simulation } from "./simulation.ts";

/** What the scene needs from the graphics. `webgl-view.ts` gives it with three.js. */
export type SceneView = {
  /** Turns the camera around its target, about the up direction of the attractor. */
  setCameraAngle: (angle: number) => void;
  /** The ray from the camera through a point of the picture (x and y from −1 to 1, y up). */
  rayAt: (x: number, y: number) => Ray;
  /** Draws the lines with these points. */
  draw: (points: Float32Array) => void;
};

export type SceneStatus = { params: Params; strength: number };

export type AttractorScene = {
  lines: Simulation["lines"];
  setMode: (mode: MouseMode) => void;
  setPointer: (pointer: Pointer | null) => void;
  /** Starts the lines and the parameters again. */
  reset: () => void;
  /** Moves the time forward by `seconds` and draws the picture. */
  frame: (seconds: number, view: SceneView) => void;
  status: () => SceneStatus;
};

/** One simulation step per 1/60 second. At most 6 steps per frame. */
const STEPS_PER_SECOND = 60;
const MAX_STEPS = 6;

/** Before the first pointer move, the effects use this ray. The strength is 0 then. */
const NO_RAY: Ray = { origin: [0, 0, 0], direction: [0, 0, 1] };

export function createAttractorScene(
  attractor: Attractor,
  random: () => number,
  lineCount = LINE_COUNT,
): AttractorScene {
  const simulation = createSimulation(attractor, random, lineCount);
  const shown = new Float32Array(simulation.points.length);
  let drift: Drift = createDrift(attractor.profiles, random);
  let params: Params = attractor.profiles[0];
  let mode: MouseMode = "lens";
  let pointer: Pointer | null = null;
  let ray = NO_RAY;
  let strength = 0;
  let time = 0;
  let pending = 0;

  function clearRubber(): void {
    simulation.offsets.fill(0);
    simulation.velocities.fill(0);
  }

  return {
    lines: simulation.lines,
    setMode(next) {
      mode = next;
      clearRubber();
    },
    setPointer(next) {
      pointer = next;
    },
    reset() {
      simulation.reset();
      drift = createDrift(attractor.profiles, random);
      params = attractor.profiles[0];
      pending = 0;
    },
    frame(seconds, view) {
      const dt = Math.min(Math.max(seconds, 0), 0.1);
      time += dt;
      // A slow swing of the camera shows the 3D shape.
      view.setCameraAngle(Math.sin(time / 20) * 0.25);
      if (pointer !== null) ray = view.rayAt(pointer.x, pointer.y);
      strength = nextStrength(strength, goalStrength(pointer), dt);
      params = drift.update(dt);

      pending = Math.min(pending + dt, 0.1);
      const steps = Math.min(MAX_STEPS, Math.floor((pending + 1e-9) * STEPS_PER_SECOND));
      pending = Math.max(0, pending - steps / STEPS_PER_SECOND);
      const pull = mode === "gravity" && strength > 0.001 ? { ray, strength } : null;
      for (let s = 0; s < steps; s++) simulation.step(params, pull);

      switch (mode) {
        case "lens":
          applyLens(simulation.points, shown, ray, strength);
          break;
        case "gravity":
          shown.set(simulation.points);
          break;
        case "rubber":
          applyRubber(
            simulation.points,
            simulation.offsets,
            simulation.velocities,
            shown,
            ray,
            strength,
            dt,
          );
          break;
      }
      view.draw(shown);
    },
    status: () => ({ params, strength }),
  };
}
