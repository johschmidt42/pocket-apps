import type { WeaponName } from "../content/weapons.ts";
import type { Pose, Vec3 } from "./pose.ts";

/**
 * The shape of a part. All lengths are in field units.
 * - "sphere": a ball. `size` gives its three radii, so it can be an egg or a flat disc.
 * - "half": the half of such a ball on the side of +x.
 * - "capsule", "cone", "cylinder": along the y axis, with the center at the joint. The tip of a cone is at +y.
 *   The length of a capsule is the length without its two round ends.
 * - "torus": a ring in the plane of x and y. `tube` is the radius of the ring material.
 */
export type Shape =
  | { kind: "sphere" | "half"; size: Vec3 }
  | { kind: "capsule" | "cone" | "cylinder"; radius: number; length: number }
  | { kind: "torus"; radius: number; tube: number };

/**
 * How a part is drawn.
 * - "toon": color with hard steps of light and a dark outline. This is the default.
 * - "flat": the pure color, no light. For eyes and other small signs that must stay clear.
 * - "wing": thin, bright and partly transparent, with no outline.
 */
export type Surface = "toon" | "flat" | "wing";

/** One part of a figure: a joint, a shape at the joint (optional), and child parts that move with it. */
export type Part = {
  /** The name is unique in the figure. A pose uses it. */
  name: string;
  /** The place of the joint, relative to the parent part. */
  at?: Vec3;
  /** The turn of the part at rest: three angles in radians, around x, then y, then z. */
  turn?: Vec3;
  /** In place of `turn`: the +z direction of the part points this way. For a spot that lies on a surface. */
  face?: Vec3;
  shape?: Shape;
  /** The place of the shape, relative to the joint. Use it when the part turns around its end. */
  shapeAt?: Vec3;
  /** The turn of the shape alone. The children do not turn with it. */
  shapeTurn?: Vec3;
  color?: string;
  surface?: Surface;
  /**
   * False for a small detail on a surface, for example a spot. The default is true.
   * The outline breaks at a sharp edge. Thus a cone looks better with no outline.
   */
  outline?: boolean;
  parts?: Part[];
};

/** A figure as data. */
export type ModelSpec = {
  /** The top part. Its joint is the center of the figure. */
  root: Part;
};

/** The name and the length of one motion. */
export type Motion = {
  name: string;
  /** The German name of the motion. The model viewer of the prototype branch shows it. */
  label: string;
  /** The length in seconds. `null` for a motion that repeats. */
  seconds: number | null;
};

/** What an animator knows about the figure at one moment. */
export type FigureInput = {
  /** The seconds since the figure exists. Motion that repeats uses it. */
  time: number;
  /** The name of the motion that runs. */
  motion: string;
  /** The seconds since this motion began. */
  motionTime: number;
  /** The lean into the flight: [to the side, forward], each from -1 to 1. */
  lean: [number, number];
  /** Where the eyes look: [to the side, up], each from -1 to 1. */
  look: [number, number];
  /** Only Seven: the number of spots that he has left. */
  spots: number;
  /** Only Seven: the weapon that he carries. Without it, he carries the spray. */
  weapon?: WeaponName;
  /** Only Seven: the stones in the drum of the "Kernspucker". Without it, the drum is full. */
  ammo?: number;
};

/** The pose of a figure at one moment. */
export type FigurePose = {
  parts: Pose;
  /** A white flash on the figure, from 0 (none) to 1. It shows a hit. */
  flash: number;
};

/** A figure with its motions. */
export type Figure = {
  name: string;
  /** The German name of the figure. The model viewer of the prototype branch shows it. */
  label: string;
  spec: ModelSpec;
  /** The first motion is the base motion. A figure returns to it after a motion that happens once. */
  motions: Motion[];
  /** The animator: plain math, no three.js. */
  pose: (input: FigureInput) => FigurePose;
};

function mirrorX(vector: Vec3 | undefined): Vec3 | undefined {
  return vector === undefined ? undefined : [-vector[0], vector[1], vector[2]];
}

/** The mirror picture of a turn: the angles around y and z change their sign. */
function mirrorTurn(turn: Vec3 | undefined): Vec3 | undefined {
  return turn === undefined ? undefined : [turn[0], -turn[1], -turn[2]];
}

function mirrorShape(shape: Shape | undefined): Shape | undefined {
  // A half ball is not the same on both sides: a negative radius turns it over.
  if (shape?.kind !== "half") return shape;
  return { ...shape, size: [-shape.size[0], shape.size[1], shape.size[2]] };
}

/**
 * The left part for a right part: the mirror picture at the plane x = 0.
 * Each name with "right" gets "left". The child parts change too.
 */
export function mirror(part: Part): Part {
  const mirrored: Part = { ...part, name: part.name.replace("right", "left") };
  const set = <Key extends keyof Part>(key: Key, value: Part[Key] | undefined) => {
    if (value !== undefined) mirrored[key] = value;
  };
  set("at", mirrorX(part.at));
  set("turn", mirrorTurn(part.turn));
  set("face", mirrorX(part.face));
  set("shape", mirrorShape(part.shape));
  set("shapeAt", mirrorX(part.shapeAt));
  set("shapeTurn", mirrorTurn(part.shapeTurn));
  set("parts", part.parts?.map(mirror));
  return mirrored;
}

/** A right part and its left mirror picture. */
export function pair(part: Part): Part[] {
  return [part, mirror(part)];
}

/** The names of all parts of a figure, with the children. */
export function partNames(part: Part): string[] {
  return [part.name, ...(part.parts ?? []).flatMap(partNames)];
}
