import type { ReactNode } from "react";
import { drawOrder, type FlatPoint, type Part } from "./draw-order.ts";
import { BACK, equipmentParts, FAR } from "./equipment-parts.tsx";
import type { Equipment, View } from "./exercise.ts";
import {
  footLine,
  headOf,
  shrugOf,
  SIDES,
  vec,
  type Facing,
  type Frame,
  type Vec,
} from "./skeleton.ts";

const WIDTH = { thigh: 15, shin: 11, torso: 19, upperArm: 10, forearm: 9, foot: 9 };
const HEAD = 11;
/** Each part has a thin outline in the color of the card. A part in front of another stays visible. */
const OUTLINE = 1.5;

/**
 * Not exactly 0 in floating point. From the front, the two sides of the body have the same depth.
 * This tiny value decides which side is drawn first, as in the prototype.
 */
const COS_90 = Math.cos(Math.PI / 2);

const project = (yaw: View["yaw"], facing: Facing | undefined) =>
  yaw === 0
    ? (v: Vec): FlatPoint => ({
        x: facing ? facing.offset + facing.scale * v.x : v.x,
        y: v.y,
        depth: v.z,
      })
    : (v: Vec): FlatPoint => ({ x: v.x * COS_90 - v.z, y: v.y, depth: v.x + v.z * COS_90 });

/** Draws the joints as a flat pictogram. Put it into an SVG with `stroke="currentColor"`. */
export function Figure({
  frame,
  yaw,
  equipment,
}: {
  frame: Frame;
  yaw: View["yaw"];
  equipment: Equipment;
}) {
  const { joints } = frame;
  const flat = project(yaw, frame.facing);
  const fromSide = yaw === 0;
  const parts: Part<ReactNode>[] = equipmentParts(equipment, {
    joints,
    flat,
    fromSide,
    progress: frame.progress % 1,
    thrown: frame.thrown,
  });

  const bone = (key: string, a: Vec, b: Vec, width: number, far: boolean): number => {
    const p = flat(a);
    const q = flat(b);
    const depth = (p.depth + q.depth) / 2;
    parts.push({
      depth,
      id: key,
      shape: { a: p, b: q, half: width / 2 },
      node: (
        <g key={key}>
          <line
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            strokeWidth={width + 2 * OUTLINE}
            stroke={BACK}
          />
          <line
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            strokeWidth={width}
            {...(far ? { stroke: FAR } : {})}
          />
        </g>
      ),
    });
    return depth;
  };
  /** Two bones meet at a joint. A short piece of each bone hides the outline across the other one. */
  const joint = (
    key: string,
    at: Vec,
    ends: readonly (readonly [string, Vec, number])[],
    depth: number,
    far: boolean,
    reach: number,
    over: readonly string[],
  ) => {
    const p = flat(at);
    for (const [bone, end, width] of ends) {
      const q = flat(end);
      const part = Math.min(reach / (Math.hypot(q.x - p.x, q.y - p.y) || 1), 1);
      parts.push({
        depth: depth + 0.01,
        over,
        node: (
          <line
            key={`${key}-${bone}`}
            x1={p.x}
            y1={p.y}
            x2={p.x + (q.x - p.x) * part}
            y2={p.y + (q.y - p.y) * part}
            strokeWidth={width}
            {...(far ? { stroke: FAR } : {})}
          />
        ),
      });
    }
  };
  /** Where a limb leaves the torso: a disc and a short piece of the limb hide the outlines there. */
  const root = (key: string, at: Vec, to: Vec, width: number, depth: number, limb: string) => {
    const p = flat(at);
    const over = ["torso", limb];
    parts.push({
      depth: depth + 0.01,
      over,
      node: (
        <circle
          key={key}
          cx={p.x}
          cy={p.y}
          r={width / 2 + OUTLINE + 0.5}
          fill="currentColor"
          stroke="none"
        />
      ),
    });
    joint(
      `${key}limb`,
      at,
      [["limb", to, width]],
      depth,
      false,
      WIDTH.torso / 2 + OUTLINE + 1,
      over,
    );
  };

  const torsoDepth = (flat(joints.hip).depth + flat(joints.shoulder).depth) / 2;
  for (const side of SIDES) {
    const far = fromSide && side === 1;
    const name = String(side);
    const leg = joints.legs[side];
    const thigh = bone(`thigh${name}`, leg.root, leg.mid, WIDTH.thigh, far);
    const shin = bone(`shin${name}`, leg.mid, leg.end, WIDTH.shin, far);
    const foot = footLine(leg.end, joints.toes[side]);
    const sole = bone(`foot${name}`, foot.heel, foot.toe, WIDTH.foot, far);
    joint(
      `knee${name}`,
      leg.mid,
      [
        ["thigh", leg.root, WIDTH.thigh],
        ["shin", leg.end, WIDTH.shin],
      ],
      Math.max(thigh, shin),
      far,
      WIDTH.thigh / 2 + OUTLINE,
      [`thigh${name}`, `shin${name}`],
    );
    joint(
      `ankle${name}`,
      leg.end,
      [["shin", leg.mid, WIDTH.shin]],
      Math.max(shin, sole),
      far,
      WIDTH.foot / 2 + OUTLINE,
      [`shin${name}`, `foot${name}`],
    );
    if (!far) {
      root(
        `hip${name}`,
        leg.root,
        leg.mid,
        WIDTH.thigh,
        Math.max(thigh, torsoDepth),
        `thigh${name}`,
      );
    }
  }

  // The torso is a shape around a curve from the hip through the waist to the shoulders.
  const spine = Array.from({ length: 9 }, (_, index) => {
    const t = index / 8;
    const at = (from: number, middle: number, to: number) =>
      (1 - t) * (1 - t) * from + 2 * t * (1 - t) * (2 * middle - (from + to) / 2) + t * t * to;
    return {
      x: at(joints.hip.x, joints.waist.x, joints.shoulder.x),
      y: at(joints.hip.y, joints.waist.y, joints.shoulder.y),
      half: 6 + 4 * t,
      t,
    };
  });
  // A shrug raises the two outer ends of the top of the torso. The base of the neck stays.
  const lift = shrugOf(joints);
  const edge = (p: (typeof spine)[number], side: 1 | -1) =>
    flat(vec(p.x + lift.x * p.t ** 4, p.y + lift.y * p.t ** 4, side * p.half));
  const neck = joints.shrug === 0 ? [] : [flat(joints.shoulder)];
  const corners = [
    ...spine.map((p) => edge(p, 1)).reverse(),
    ...spine.map((p) => edge(p, -1)),
    ...neck,
  ];
  const outline = corners.map((c) => `${String(c.x)},${String(c.y)}`).join(" ");
  const hipPoint = flat(joints.hip);
  const shoulderPoint = flat(joints.shoulder);
  parts.push({
    depth: (hipPoint.depth + shoulderPoint.depth) / 2,
    id: "torso",
    // From the front, the torso is wider: 6 to 10 to each side, plus half its line width.
    shape: { a: hipPoint, b: shoulderPoint, half: WIDTH.torso / 2 + (fromSide ? 0 : 8) },
    node: (
      <g key="torso">
        <polygon
          points={outline}
          fill={BACK}
          stroke={BACK}
          strokeWidth={WIDTH.torso + 2 * OUTLINE}
          strokeLinejoin="round"
        />
        <polygon
          points={outline}
          fill="currentColor"
          strokeWidth={WIDTH.torso}
          strokeLinejoin="round"
        />
      </g>
    ),
  });

  const headCenter = flat(headOf(joints));
  const headPoint = { ...headCenter, depth: headCenter.depth + 0.1 };
  parts.push({
    depth: headPoint.depth,
    id: "head",
    shape: { a: headPoint, b: headPoint, half: HEAD },
    node: (
      <g key="head">
        <circle cx={headPoint.x} cy={headPoint.y} r={HEAD + OUTLINE} fill={BACK} stroke="none" />
        <circle cx={headPoint.x} cy={headPoint.y} r={HEAD} fill="currentColor" stroke="none" />
      </g>
    ),
  });

  for (const side of SIDES) {
    const far = fromSide && side === 1;
    const name = String(side);
    const arm = joints.arms[side];
    const upper = bone(`upperArm${name}`, arm.root, arm.mid, WIDTH.upperArm, far);
    const fore = bone(`forearm${name}`, arm.mid, arm.end, WIDTH.forearm, far);
    joint(
      `elbow${name}`,
      arm.mid,
      [
        ["upper", arm.root, WIDTH.upperArm],
        ["fore", arm.end, WIDTH.forearm],
      ],
      Math.max(upper, fore),
      far,
      WIDTH.upperArm / 2 + OUTLINE,
      [`upperArm${name}`, `forearm${name}`],
    );
    if (!far) {
      root(
        `shoulder${name}`,
        arm.root,
        arm.mid,
        WIDTH.upperArm,
        Math.max(upper, torsoDepth),
        `upperArm${name}`,
      );
    }
  }

  return <>{drawOrder(parts).map((part) => part.node)}</>;
}
