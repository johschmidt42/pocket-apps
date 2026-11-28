import { pair, type Figure, type FigureInput, type FigurePose, type Part } from "./model.ts";
import {
  addPoses,
  bothSides,
  ease,
  keys,
  wave,
  type PartPose,
  type Pose,
  type Vec3,
} from "./pose.ts";

// The flying ant, the first enemy. It hangs upright in the air and shows its face to the player:
// +y is up (its head), +z is to the camera (its face). It is about 63 field units wide with its wings.

const RUST = "#b04a2b";
const DARK_RUST = "#7d2f1c";
const LEG = "#3a1a12";
const EYE = "#fffdf2";
const PUPIL = "#14141a";

/** A leg of two parts. The angles are for the right side: a negative angle points out to the right. */
function leg(name: string, at: Vec3, upper: number, lower: number): Part {
  return {
    name: `leg-${name}-right`,
    at,
    turn: [0, 0, upper],
    shape: { kind: "capsule", radius: 1.2, length: 7 },
    shapeAt: [0, 4, 0],
    color: LEG,
    parts: [
      {
        name: `shin-${name}-right`,
        at: [0, 8, 0],
        turn: [0, 0, lower],
        shape: { kind: "capsule", radius: 1.1, length: 7 },
        shapeAt: [0, 4, 0],
        color: LEG,
      },
    ],
  };
}

const root: Part = {
  name: "body",
  parts: [
    ...pair({
      name: "wing-right",
      at: [3, 5, -5],
      turn: [0, 0, -1.05],
      shape: { kind: "sphere", size: [6.5, 16, 0.5] },
      shapeAt: [0, 15, 0],
      color: "#eaf6ff",
      surface: "wing",
    }),
    ...pair({
      name: "wing-small-right",
      at: [3, 2, -5.5],
      turn: [0, 0, -1.75],
      shape: { kind: "sphere", size: [4.5, 11, 0.5] },
      shapeAt: [0, 10, 0],
      color: "#eaf6ff",
      surface: "wing",
    }),
    { name: "thorax", shape: { kind: "sphere", size: [7, 7.5, 6.5] }, color: RUST },
    {
      name: "waist",
      at: [0, -8, 0],
      shape: { kind: "sphere", size: [2.8, 2.8, 2.8] },
      color: DARK_RUST,
    },
    {
      // The big back part of the ant. It turns at the waist.
      name: "gaster",
      at: [0, -9.5, 0],
      shape: { kind: "sphere", size: [9, 11.5, 9] },
      shapeAt: [0, -10.5, 1.5],
      color: DARK_RUST,
    },
    ...pair(leg("front", [5.5, 3, 4], -2, 1.3)),
    ...pair(leg("mid", [6.5, -1, 2], -1.75, -0.9)),
    ...pair(leg("rear", [5.5, -5, 1], -2.4, -0.5)),
    {
      // The head turns at the neck.
      name: "head",
      at: [0, 7, 1],
      shape: { kind: "sphere", size: [12, 10.5, 10] },
      shapeAt: [0, 9, 3],
      color: RUST,
      parts: [
        ...pair({
          name: "eye-right",
          at: [5, 10.5, 11.2],
          turn: [0, 0.3, 0],
          shape: { kind: "sphere", size: [4.4, 5.2, 2.6] },
          color: EYE,
          surface: "flat",
          parts: [
            {
              name: "pupil-right",
              at: [-0.6, -0.8, 2.1],
              shape: { kind: "sphere", size: [2, 2.3, 1] },
              color: PUPIL,
              surface: "flat",
              outline: false,
              parts: [
                {
                  name: "shine-right",
                  at: [0.6, 0.9, 0.7],
                  shape: { kind: "sphere", size: [0.75, 0.75, 0.4] },
                  color: "#ffffff",
                  surface: "flat",
                  outline: false,
                },
              ],
            },
          ],
        }),
        ...pair({
          // An angry brow: low at the nose, high at the side.
          name: "brow-right",
          at: [5.4, 16.4, 12.4],
          turn: [0, 0, -1.1],
          shape: { kind: "capsule", radius: 1.3, length: 6.5 },
          color: LEG,
          outline: false,
        }),
        ...pair({
          name: "mandible-right",
          at: [3.4, 1.2, 11.6],
          turn: [0, 0, Math.PI - 0.45],
          shape: { kind: "sphere", size: [1.5, 3.2, 1.5] },
          shapeAt: [0, 2.4, 0],
          color: LEG,
          outline: false,
        }),
        ...pair({
          // An antenna with an elbow.
          name: "antenna-right",
          at: [5.5, 17, 4],
          turn: [-0.2, 0, -0.45],
          shape: { kind: "capsule", radius: 1, length: 8 },
          shapeAt: [0, 4.5, 0],
          color: LEG,
          parts: [
            {
              name: "antenna-end-right",
              at: [0, 9, 0],
              turn: [0.5, 0, -0.9],
              shape: { kind: "capsule", radius: 0.9, length: 9 },
              shapeAt: [0, 5, 0],
              color: LEG,
            },
          ],
        }),
      ],
    },
  ],
};

/** The motion in the air. All other motions lie on top of it. */
function hover(input: FigureInput, wingsPerSecond: number): Pose {
  const { time } = input;
  const [side] = input.lean;
  const [lookX, lookY] = input.look;
  const wing = (phase: number): PartPose => ({
    turn: [
      0,
      wave(time, wingsPerSecond, phase) * 0.55,
      wave(time, wingsPerSecond, phase + 0.25) * 0.12,
    ],
  });
  const swing = (perSecond: number, phase: number, size: number): PartPose => ({
    turn: [0, 0, wave(time, perSecond, phase) * size],
  });
  // The ant closes its eyes for a moment, about each 3.4 seconds.
  const blink = (time + 1.7) % 3.4 < 0.11 ? 0.12 : 1;
  return addPoses(
    {
      body: { move: [0, wave(time, 1.7) * 1.6, 0], turn: [0, 0, -side * 0.35] },
      // The ant looks a little down, to the player.
      head: { turn: [0.12 - lookY * 0.12, lookX * 0.15, wave(time, 0.8) * 0.04] },
      gaster: { turn: [wave(time, 1.7, 0.3) * 0.08, 0, 0] },
      "pupil-right": { move: [lookX * 1.5, lookY * 1.5, 0] },
      "pupil-left": { move: [lookX * 1.5, lookY * 1.5, 0] },
    },
    bothSides("eye-right", { grow: [1, blink, 1] }),
    bothSides("wing-right", wing(0)),
    bothSides("wing-small-right", wing(0.15)),
    bothSides("antenna-right", swing(1.9, 0, 0.14), swing(1.9, 0.35, 0.14)),
    bothSides("antenna-end-right", swing(1.9, 0.2, 0.18), swing(1.9, 0.55, 0.18)),
    bothSides("leg-front-right", swing(2.2, 0, 0.1), swing(2.2, 0.5, 0.1)),
    bothSides("leg-mid-right", swing(2.2, 0.2, 0.12), swing(2.2, 0.7, 0.12)),
    bothSides("leg-rear-right", swing(2.2, 0.4, 0.12), swing(2.2, 0.9, 0.12)),
    bothSides("shin-mid-right", swing(2.2, 0.3, 0.15), swing(2.2, 0.8, 0.15)),
    bothSides("shin-rear-right", swing(2.2, 0.5, 0.15), swing(2.2, 1, 0.15)),
  );
}

function pose(input: FigureInput): FigurePose {
  const t = input.motionTime;
  switch (input.motion) {
    case "enter":
      // The ant flies fast: it leans forward, beats its wings faster and pulls its legs back.
      return {
        parts: addPoses(
          hover(input, 18),
          { body: { turn: [0.45, 0, 0] }, head: { turn: [-0.3, 0, 0] } },
          bothSides("shin-mid-right", { turn: [0, 0, 0.5] }),
          bothSides("shin-rear-right", { turn: [0, 0, 0.4] }),
        ),
        flash: 0,
      };
    case "spit": {
      // The ant pulls its head back and fills its cheeks. Then the head snaps forward. The drop leaves at 0.4 second.
      const wind = keys(
        [
          [0, 0],
          [0.3, 1],
          [0.36, 1],
          [0.42, -0.6],
          [0.6, 0],
        ],
        t,
      );
      const full = Math.max(wind, 0);
      const open = keys(
        [
          [0.3, 0],
          [0.4, 1],
          [0.6, 0],
        ],
        t,
      );
      return {
        parts: addPoses(
          hover(input, 13),
          {
            body: { move: [0, 2 * wind, 0] },
            head: { turn: [-0.45 * wind, 0, 0], grow: 1 + 0.12 * full },
            gaster: { turn: [0.5 * full, 0, 0] },
          },
          bothSides("mandible-right", { turn: [0, 0, -0.6 * open] }),
        ),
        flash: 0,
      };
    }
    case "hit": {
      const squash = 1 - ease(t / 0.25);
      return {
        parts: addPoses(
          hover(input, 13),
          { body: { grow: [1 + 0.25 * squash, 1 - 0.2 * squash, 1] } },
          bothSides("eye-right", { grow: 1 + 0.3 * squash }),
        ),
        flash: squash,
      };
    }
    case "death": {
      // The ant spins, gets big for a moment and is gone. Its legs fly apart.
      const size = keys(
        [
          [0, 1],
          [0.12, 1.35],
          [0.5, 0],
        ],
        t,
      );
      const splay = ease(t / 0.2);
      return {
        parts: addPoses(
          hover(input, 13),
          { body: { turn: [0, 0, t * 16], grow: size } },
          bothSides("leg-front-right", { turn: [0, 0, -0.8 * splay] }),
          bothSides("leg-mid-right", { turn: [0, 0, -0.8 * splay] }),
          bothSides("leg-rear-right", { turn: [0, 0, 0.8 * splay] }),
        ),
        flash: 1 - ease(t / 0.2),
      };
    }
    default:
      return { parts: hover(input, 13), flash: 0 };
  }
}

export const ant: Figure = {
  name: "ant",
  label: "Ameise",
  spec: { root },
  motions: [
    { name: "hover", label: "Schweben", seconds: null },
    { name: "enter", label: "Einfliegen", seconds: null },
    { name: "spit", label: "Spucken", seconds: 0.6 },
    { name: "hit", label: "Treffer", seconds: 0.25 },
    { name: "death", label: "Tod", seconds: 0.5 },
  ],
  pose,
};
