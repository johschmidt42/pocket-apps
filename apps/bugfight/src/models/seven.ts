import { SEED_SHOOTER } from "../content/weapons.ts";
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

// Seven, the ladybug of the player, seen from above: +y is forward (his head), +z is up (his back, to the camera).
// He is about 77 field units wide with open wing covers.

const RED = "#e0241b";
const BLACK = "#1b1b22";
const BELLY = "#2a2a34";
const WHITE = "#f6f1e4";
const BRASS = "#d39a2f";
const LEATHER = "#6b4226";
const GLASS = "#9fe3ff";
const STEEL = "#aeb6c0";
const DARK_STEEL = "#3a3a44";
const TANK = "#f2c230";
const GUNMETAL = "#4a4f5c";
const STONE = "#f3d39a";

/** The number of cherry stones in the drum. */
// The drum of the game holds 24 stones. That number of stones is too small to see on Seven.
// Thus the drum of the figure shows 12 stones, and each one stands for two.
const STONES = 12;
/** The stones lie in two rings. The outer ring has two of three stones. Seven shoots its stones first. */
const OUTER_STONES = Math.ceil((STONES * 2) / 3);

/** The radii of one wing cover and the place of its center, relative to its hinge. */
const COVER: Vec3 = [10.5, 23, 5];
const COVER_AT: Vec3 = [7.5, -21, -1];

/** A black spot that lies on a wing cover. `x` and `y` are relative to the center of the cover. */
function coverSpot(name: string, x: number, y: number): Part {
  const [a, b, c] = COVER;
  const z = c * Math.sqrt(Math.max(1 - (x / a) ** 2 - (y / b) ** 2, 0));
  return {
    name,
    at: [COVER_AT[0] + x, COVER_AT[1] + y, COVER_AT[2] + z],
    // The direction away from the surface of the cover.
    face: [x / a ** 2, y / b ** 2, z / c ** 2],
    shape: { kind: "sphere", size: [3.2, 3.2, 0.9] },
    color: BLACK,
    outline: false,
  };
}

const root: Part = {
  name: "body",
  parts: [
    {
      name: "abdomen",
      at: [0, -6, 0],
      shape: { kind: "sphere", size: [15, 20, 10] },
      color: BELLY,
    },
    {
      name: "thorax",
      at: [0, 14, 2],
      shape: { kind: "sphere", size: [14, 8, 9] },
      color: BLACK,
      parts: pair({
        name: "patch-right",
        at: [8, 3, 6.5],
        face: [0.041, 0.047, 0.081],
        shape: { kind: "sphere", size: [3.6, 2.6, 0.9] },
        color: WHITE,
        outline: false,
      }),
    },
    {
      // The small red plate between the hinges. It holds the spot in the middle, which Seven loses last.
      name: "plate",
      at: [0, 8, 9.5],
      shape: { kind: "sphere", size: [5.5, 6, 2.2] },
      color: RED,
      parts: [
        {
          name: "spot-center",
          at: [0, 0, 1.9],
          shape: { kind: "sphere", size: [2.9, 2.9, 0.8] },
          color: BLACK,
          outline: false,
        },
      ],
    },
    {
      name: "head",
      at: [0, 22, 2],
      shape: { kind: "sphere", size: [9, 7.5, 9] },
      color: BLACK,
      parts: [
        {
          // The strap of the pilot goggles goes around the head.
          name: "strap",
          at: [0, -0.5, 0],
          turn: [Math.PI / 2, 0, 0],
          shape: { kind: "torus", radius: 9.1, tube: 1.2 },
          color: LEATHER,
          outline: false,
        },
        ...pair({
          name: "goggle-right",
          at: [4.6, 3, 6.9],
          // The glass looks up and a little forward and to the side.
          turn: [-0.6, 0.3, 0],
          shape: { kind: "torus", radius: 4.3, tube: 1.3 },
          color: BRASS,
          parts: [
            {
              name: "lens-right",
              at: [0, 0, 0.3],
              shape: { kind: "sphere", size: [3.9, 3.9, 1.5] },
              color: GLASS,
              outline: false,
              parts: [
                {
                  name: "glint-right",
                  at: [-1.3, 1.4, 1.2],
                  shape: { kind: "sphere", size: [1.3, 0.9, 0.5] },
                  color: "#ffffff",
                  surface: "flat",
                  outline: false,
                },
              ],
            },
          ],
        }),
        ...pair({
          name: "antenna-right",
          at: [4.5, 6, 1],
          turn: [0, 0, -0.5],
          shape: { kind: "capsule", radius: 0.9, length: 8 },
          shapeAt: [0, 4.5, 0],
          color: BLACK,
          parts: [
            {
              name: "antenna-tip-right",
              at: [0, 9.5, 0],
              shape: { kind: "sphere", size: [1.7, 1.7, 1.7] },
              color: BLACK,
            },
          ],
        }),
      ],
    },
    {
      // The gas tank on his back. The tank pressure of the game belongs to it.
      name: "tank",
      at: [0, -10, 12.5],
      shape: { kind: "capsule", radius: 4.6, length: 12 },
      color: TANK,
      parts: [
        {
          name: "tank-band",
          at: [0, 1, 0],
          turn: [Math.PI / 2, 0, 0],
          shape: { kind: "torus", radius: 4.7, tube: 0.9 },
          color: DARK_STEEL,
          outline: false,
        },
        {
          name: "tank-valve",
          at: [0, 11.5, 0],
          shape: { kind: "cylinder", radius: 1.7, length: 3 },
          color: STEEL,
        },
      ],
    },
    {
      // The spray nozzle. It comes out under his head and points forward. All streams of gas start at its tip.
      name: "nozzle",
      at: [0, 26, -1],
      shape: { kind: "cylinder", radius: 2, length: 12 },
      shapeAt: [0, 6, 0],
      color: STEEL,
      parts: [
        {
          name: "nozzle-tip",
          at: [0, 13, 0],
          shape: { kind: "cone", radius: 3.2, length: 4.5 },
          // The wide end of the cone points forward, like a spray head.
          shapeTurn: [Math.PI, 0, 0],
          color: DARK_STEEL,
          outline: false,
        },
      ],
    },
    {
      // The drum of the "Kernspucker": a revolver drum that lies on his back, with its cherry stones.
      // Seven carries the tank or the drum. Thus the player sees his weapon at once.
      name: "drum",
      at: [0, -9, 12],
      shape: { kind: "cylinder", radius: 9, length: 6 },
      // The round side of the drum looks up, to the camera.
      shapeTurn: [Math.PI / 2, 0, 0],
      color: GUNMETAL,
      parts: [
        ...Array.from({ length: STONES }, (_, index): Part => {
          const outer = index < OUTER_STONES;
          const ring = outer ? OUTER_STONES : STONES - OUTER_STONES;
          const angle = ((outer ? index : index - OUTER_STONES) / ring) * 2 * Math.PI;
          const distance = outer ? 6.2 : 2.6;
          // The stones of one ring lie side by side. More stones are smaller stones.
          const size = Math.min(outer ? 1.9 : 1.6, ((Math.PI * distance) / ring) * 0.85);
          return {
            name: `seed-${String(index + 1)}`,
            at: [Math.sin(angle) * distance, Math.cos(angle) * distance, 3.2],
            shape: { kind: "sphere", size: [size, size, Math.min(size, 1.4)] },
            color: STONE,
            outline: false,
          };
        }),
      ],
    },
    {
      // The barrel of the "Kernspucker". It is longer and thicker than the spray nozzle.
      name: "barrel",
      at: [0, 26, -1],
      shape: { kind: "cylinder", radius: 2.6, length: 18 },
      shapeAt: [0, 9, 0],
      color: GUNMETAL,
      parts: [
        {
          name: "muzzle",
          at: [0, 18, 0],
          turn: [Math.PI / 2, 0, 0],
          shape: { kind: "torus", radius: 3, tube: 1.1 },
          color: BRASS,
          outline: false,
        },
      ],
    },
    ...pair({
      // The thin wing. At rest it lies straight back. In flight it stands out to the side and beats.
      name: "wing-right",
      at: [4, 9, 2],
      shape: { kind: "sphere", size: [8, 19, 0.5] },
      shapeAt: [3, -18, 0],
      color: "#eaf6ff",
      surface: "wing",
    }),
    ...pair({
      // A second picture of the wing at another moment of the beat. It makes the beat look fast.
      name: "wing-ghost-right",
      at: [4, 9, 1.5],
      shape: { kind: "sphere", size: [8, 19, 0.5] },
      shapeAt: [3, -18, 0],
      color: "#eaf6ff",
      surface: "wing",
    }),
    ...pair({
      // The wing cover. At rest it lies closed on the back, a little like a roof. In flight it stands open.
      name: "elytron-right",
      at: [3, 11, 8],
      turn: [0, 0.35, 0],
      shape: { kind: "sphere", size: COVER },
      shapeAt: COVER_AT,
      color: RED,
      parts: [
        coverSpot("spot-right-1", -2, 11),
        coverSpot("spot-right-2", 3.2, -1),
        coverSpot("spot-right-3", -1.5, -13),
      ],
    }),
    ...[
      { name: "leg-right-1", at: [11, 8, -4], turn: -1.1 },
      { name: "leg-right-2", at: [13, -3, -5], turn: -1.5 },
      { name: "leg-right-3", at: [11, -14, -5], turn: -2 },
    ].flatMap(({ name, at, turn }) =>
      pair({
        name,
        at: [at[0] ?? 0, at[1] ?? 0, at[2] ?? 0],
        turn: [0, 0, turn],
        shape: { kind: "capsule", radius: 1.1, length: 8 },
        shapeAt: [0, 4, 0],
        color: BLACK,
      }),
    ),
  ],
};

/** The spots in the order in which Seven loses them. The spot in the middle is the last one. */
const SPOT_ORDER = [
  "spot-right-3",
  "spot-left-3",
  "spot-right-2",
  "spot-left-2",
  "spot-right-1",
  "spot-left-1",
  "spot-center",
];

/** The angles of an open wing cover: up from the back, and out to the side. */
const COVER_LIFT = -0.42;
const COVER_SPREAD = 0.82;
/** The angle of a wing in flight, out to the side. */
const WING_SPREAD = 1.1;
/** The largest angles of the lean into the flight. */
const LEAN_ROLL = 0.8;
const LEAN_PITCH = 0.35;
const LEAN_TURN = 0.22;

/** The motion of the flight. All other motions lie on top of it. `open` is 1 for open wing covers, 0 for closed ones. */
function flight(
  time: number,
  side: number,
  forward: number,
  open: number,
  extraSpread: number,
): Pose {
  const flutter = wave(time, 11) * 0.035;
  const cover = (lean: number): PartPose => ({
    turn: [(COVER_LIFT + flutter) * open, 0, (COVER_SPREAD + extraSpread - lean * 0.14) * open],
  });
  const wing = (phase: number): PartPose => ({
    turn: [
      wave(time, 17, phase + 0.25) * 0.22 * open,
      0,
      (WING_SPREAD + wave(time, 17, phase) * 0.32) * open,
    ],
    // A closed wing is under the wing cover.
    grow: 0.25 + 0.75 * open,
  });
  const antenna = (phase: number, lean: number): PartPose => ({
    turn: [forward * 0.3, 0, wave(time, 2.3, phase) * 0.12 + lean * 0.3],
  });
  const leg = (phase: number): PartPose => ({ turn: [0, 0, wave(time, 3, phase) * 0.1] });
  return addPoses(
    {
      body: {
        // Seven flies to the left: his left side goes down, and his head turns a little to the left.
        turn: [-forward * LEAN_PITCH, side * LEAN_ROLL + wave(time, 0.9) * 0.03, -side * LEAN_TURN],
        move: [0, wave(time, 1.2) * 0.7, 0],
      },
      head: { turn: [0, 0, -side * 0.2] },
    },
    // The cover on the side of the lean stands a little less open.
    bothSides("elytron-right", cover(side), cover(-side)),
    bothSides("wing-right", wing(0)),
    bothSides("wing-ghost-right", wing(0.3)),
    // The antennas follow late: they point against the flight.
    bothSides("antenna-right", antenna(0, side), antenna(0.4, -side)),
    bothSides("leg-right-1", leg(0)),
    bothSides("leg-right-2", leg(0.3)),
    bothSides("leg-right-3", leg(0.6)),
  );
}

/** Hides the lost spots. During a hit, the spot that Seven lost last pops first. */
function spots(left: number, popTime: number | null): Pose {
  const pose: Pose = {};
  const lost = SPOT_ORDER.length - left;
  SPOT_ORDER.forEach((name, index) => {
    if (index >= lost) return;
    const pops = popTime !== null && index === lost - 1;
    pose[name] = {
      grow: pops
        ? keys(
            [
              [0, 1],
              [0.1, 1.9],
              [0.28, 0],
            ],
            popTime,
          )
        : 0,
    };
  });
  return pose;
}

/** Shows the weapon that Seven carries and hides the other one. The drum shows the stones that are left. */
function gear(input: FigureInput): Pose {
  if (input.weapon !== "seeds") return { drum: { grow: 0 }, barrel: { grow: 0 } };
  const full = SEED_SHOOTER.seeds;
  const ammo = input.ammo ?? full;
  /** The number of stones that the figure shows. */
  const shown = Math.ceil((ammo / full) * STONES);
  // The drum turns a little with each shot.
  const pose: Pose = {
    tank: { grow: 0 },
    nozzle: { grow: 0 },
    drum: { turn: [0, 0, (-(ammo / full) * STONES * 2 * Math.PI) / OUTER_STONES] },
  };
  for (let stone = 1; stone <= STONES; stone++) {
    // The stones with the low numbers are in the outer ring. They go first.
    if (stone <= STONES - shown) pose[`seed-${String(stone)}`] = { grow: 0 };
  }
  return pose;
}

function motionPose(input: FigureInput): FigurePose {
  const { time, motion, motionTime: t } = input;
  const [side, forward] = input.lean;
  const base = (open = 1, extraSpread = 0) => flight(time, side, forward, open, extraSpread);

  switch (motion) {
    case "spray": {
      const recoil: Pose = { nozzle: { move: [0, -1.6 + wave(time, 28) * 0.5, 0] } };
      return {
        parts: addPoses(base(1, 0.08), spots(input.spots, null), recoil, {
          body: { move: [wave(time, 31) * 0.3, 0, 0] },
          tank: { grow: 1 + wave(time, 14) * 0.03 },
        }),
        flash: 0,
      };
    }
    case "shoot": {
      // The kick of one shot: the barrel and Seven jump back.
      const kick = 1 - ease(t / 0.16);
      return {
        parts: addPoses(base(), spots(input.spots, null), {
          barrel: { move: [0, -4 * kick, 0] },
          body: { move: [0, -2 * kick, 0] },
          drum: { grow: 1 + 0.08 * kick },
        }),
        flash: 0,
      };
    }
    case "reload": {
      // The drum is empty: it lifts a little and spins two times, while the stones come back.
      const part = Math.min(t / 1.1, 1);
      return {
        parts: addPoses(base(), spots(input.spots, null), {
          drum: {
            turn: [0, 0, ease(part) * 4 * Math.PI],
            move: [0, 0, 2 * Math.sin(Math.PI * part)],
          },
        }),
        flash: 0,
      };
    }
    case "hit": {
      // A short squash, a wobble, and a blink that fades.
      const squash = keys(
        [
          [0, 0],
          [0.06, 1],
          [0.2, -0.25],
          [0.38, 0],
        ],
        t,
      );
      const fade = 1 - ease(t / 0.55);
      return {
        parts: addPoses(base(), spots(input.spots, t), {
          body: {
            turn: [0, 0, wave(t, 6) * 0.5 * fade],
            grow: [1 + 0.3 * squash, 1 - 0.22 * squash, 1],
          },
        }),
        flash: wave(t, 9) > 0 ? 0.85 * fade : 0,
      };
    }
    case "empty": {
      // The tank is empty: Seven shakes it.
      const shake = keys(
        [
          [0, 0],
          [0.08, 1],
          [0.55, 1],
          [0.8, 0],
        ],
        t,
      );
      return {
        parts: addPoses(base(), spots(input.spots, null), {
          tank: { turn: [0, 0, wave(t, 9) * 0.55 * shake], move: [0, 0, 3 * shake] },
          body: { turn: [0, 0, wave(t, 9, 0.5) * 0.08 * shake] },
        }),
        flash: 0,
      };
    }
    case "death": {
      // The wing covers close, and Seven spins and gets small.
      const open = 1 - ease(t / 0.35);
      const size = keys(
        [
          [0, 1],
          [0.15, 1.2],
          [1.2, 0],
        ],
        t,
      );
      return {
        parts: addPoses(base(open), spots(input.spots, null), {
          body: { turn: [0, 0, t * t * 9], grow: size },
        }),
        flash: 1 - ease(t / 0.25),
      };
    }
    case "win": {
      // A barrel roll, then the wing covers flare.
      const roll = ease(t / 0.9) * 2 * Math.PI;
      const size = keys(
        [
          [0, 1],
          [0.45, 1.25],
          [0.9, 1],
        ],
        t,
      );
      const flare = keys(
        [
          [0.9, 0],
          [1.05, 0.3],
          [1.4, 0],
        ],
        t,
      );
      return {
        parts: addPoses(base(1, flare), spots(input.spots, null), {
          body: { turn: [0, roll, 0], grow: size },
        }),
        flash: 0,
      };
    }
    default:
      return { parts: addPoses(base(), spots(input.spots, null)), flash: 0 };
  }
}

export const seven: Figure = {
  name: "seven",
  label: "Seven",
  spec: { root },
  motions: [
    { name: "hover", label: "Schweben", seconds: null },
    { name: "spray", label: "Sprühen", seconds: null },
    { name: "hit", label: "Treffer", seconds: 0.6 },
    { name: "empty", label: "Tank leer", seconds: 0.8 },
    { name: "shoot", label: "Schuss", seconds: 0.16 },
    { name: "reload", label: "Nachladen", seconds: 1.1 },
    { name: "death", label: "Tod", seconds: 1.2 },
    { name: "win", label: "Sieg", seconds: 1.4 },
  ],
  pose(input) {
    const motion = motionPose(input);
    return { parts: addPoses(motion.parts, gear(input)), flash: motion.flash };
  },
};
