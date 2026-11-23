import type { ReactNode } from "react";
import type { FlatPoint, Part } from "./draw-order.ts";
import { dumbbellHand, type Equipment } from "./exercise.ts";
import { BENCH, BIKE, pedalOf, ROWER, SKIERG } from "./machines.ts";
import {
  BALL,
  ballCenter,
  BELL,
  bellCenter,
  GROUND,
  SIDES,
  up,
  vec,
  type Joints,
  type Vec,
} from "./skeleton.ts";

const PLATE = 17;
/** A plate of 20 kg that the hands hold at its edge. */
const HELD_PLATE = 20;
/** The depths of equipment that is behind the whole figure or in front of it. */
const BEHIND = -1e6;
const IN_FRONT = 1e6;
export const BACK = "var(--card)";
export const FAR = "color-mix(in oklab, var(--foreground) 38%, var(--card))";
const COLOR = "var(--chart-1)";

/** What the equipment needs to know about the moment and the camera. */
export type Scene = {
  joints: Joints;
  flat: (v: Vec) => FlatPoint;
  fromSide: boolean;
  /** How far the loop is, from 0 to 1. */
  progress: number;
  /** The center of a thrown ball while it is in the air. */
  thrown: Vec | undefined;
};

type Parts = Part<ReactNode>[];

const part = (depth: number, node: ReactNode): Part<ReactNode> => ({ depth, node });

/** A straight piece of equipment. */
function bar(
  key: string,
  depth: number,
  a: FlatPoint,
  b: FlatPoint,
  width: number,
  cap: "butt" | "round" = "round",
): Part<ReactNode> {
  return part(
    depth,
    <line
      key={key}
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={COLOR}
      strokeWidth={width}
      strokeLinecap={cap}
    />,
  );
}

function disc(key: string, depth: number, center: FlatPoint, radius: number): Part<ReactNode> {
  return part(
    depth,
    <circle key={key} cx={center.x} cy={center.y} r={radius} fill={COLOR} stroke="none" />,
  );
}

/** A small ring around a place where the hands hold something. */
function grip(key: string, depth: number, center: FlatPoint, radius: number, width: number) {
  return part(
    depth,
    <circle
      key={key}
      cx={center.x}
      cy={center.y}
      r={radius}
      fill={BACK}
      stroke={COLOR}
      strokeWidth={width}
    />,
  );
}

function handsMiddle({ joints }: Scene): Vec {
  const [near, far] = joints.arms;
  return vec((near.end.x + far.end.x) / 2, (near.end.y + far.end.y) / 2, 0);
}

function barbell(scene: Scene, onBack: boolean): Parts {
  const { flat, fromSide, joints } = scene;
  const middle = flat(handsMiddle(scene));
  if (fromSide) return [disc("plate", BEHIND, middle, PLATE), grip("bar", IN_FRONT, middle, 3, 2)];
  // The plates are outside the hands: with a wide grip, the bar is longer.
  const center = handsMiddle(scene);
  const reach = Math.max(
    40,
    Math.abs(joints.arms[0].end.z) + 9,
    Math.abs(joints.arms[1].end.z) + 9,
  );
  return SIDES.flatMap((side) => {
    const z = side === 0 ? 1 : -1;
    const plate = flat(vec(center.x, center.y, z * reach));
    const end = flat(vec(center.x, center.y, z * (reach + 6)));
    return [
      part(
        BEHIND,
        <rect
          key={`plate${String(side)}`}
          x={plate.x - 3.5}
          y={plate.y - PLATE}
          width={7}
          height={PLATE * 2}
          rx={3.5}
          fill={COLOR}
          stroke="none"
        />,
      ),
      bar(`bar${String(side)}`, onBack ? BEHIND + 1 : middle.depth - 0.5, middle, end, 4),
    ];
  });
}

function dumbbell({ joints, flat, fromSide }: Scene, handIndex: 0 | 1): Parts {
  const hand = joints.arms[handIndex].end;
  const first = flat(vec(hand.x, hand.y, hand.z - 9));
  const second = flat(vec(hand.x, hand.y, hand.z + 9));
  const head = (key: string, end: FlatPoint) =>
    fromSide
      ? disc(key, end.depth, end, 7)
      : part(
          end.depth,
          <rect
            key={key}
            x={end.x - 3.5}
            y={end.y - 7}
            width={7}
            height={14}
            rx={2.5}
            fill={COLOR}
            stroke="none"
          />,
        );
  return [
    bar("handle", flat(hand).depth - 0.5, first, second, 3.5),
    head("head0", first),
    head("head1", second),
  ];
}

/** A plate in both hands: a thin bar from the side, a circle with a hole from the front. */
function heldPlate(scene: Scene): Parts {
  const { flat, fromSide } = scene;
  const center = flat(handsMiddle(scene));
  if (fromSide) {
    return [
      part(
        center.depth,
        <rect
          key="plate"
          x={center.x - 3}
          y={center.y - HELD_PLATE}
          width={6}
          height={HELD_PLATE * 2}
          rx={3}
          fill={COLOR}
          stroke="none"
        />,
      ),
    ];
  }
  return [
    disc("plate", center.depth - 1, center, HELD_PLATE),
    part(
      center.depth - 0.9,
      <circle key="plateHole" cx={center.x} cy={center.y} r={3.5} fill={BACK} stroke="none" />,
    ),
  ];
}

/** A flat bench, behind the figure and behind the plates. */
function bench({ fromSide }: Scene, x: number): Parts {
  const top = GROUND - BENCH.height;
  const leg = (key: string, at: number) =>
    part(
      BEHIND - 1,
      <line
        key={key}
        x1={at}
        y1={top}
        x2={at}
        y2={GROUND}
        stroke={FAR}
        strokeWidth={5}
        strokeLinecap="butt"
      />,
    );
  const left = fromSide ? x : -BENCH.halfWidth;
  const width = fromSide ? BENCH.length : BENCH.halfWidth * 2;
  const [first, second]: readonly [number, number] = fromSide
    ? [x + 16, x + BENCH.length - 16]
    : [-BENCH.halfWidth + 3, BENCH.halfWidth - 3];
  return [
    leg("benchLeg0", first),
    leg("benchLeg1", second),
    part(
      BEHIND - 1,
      <rect
        key="benchPad"
        x={left}
        y={top}
        width={width}
        height={BENCH.pad}
        rx={3}
        fill={FAR}
        stroke="none"
      />,
    ),
  ];
}

/** A barbell on the floor. It stays on its spot when the figure turns around. */
function floorBar({ fromSide }: Scene, x: number): Parts {
  if (!fromSide) return [];
  const center = { x, y: GROUND - PLATE, depth: BEHIND };
  return [disc("plate", BEHIND, center, PLATE), grip("bar", BEHIND + 1, center, 3, 2)];
}

function dumbbells({ joints, flat, fromSide }: Scene): Parts {
  return SIDES.flatMap((side) => {
    const hand = joints.arms[side].end;
    const back = flat(vec(hand.x - 9, hand.y, hand.z));
    const front = flat(vec(hand.x + 9, hand.y, hand.z));
    // From the front, an elbow in front of the hand hides the dumbbell. The head stays over the
    // forearm, so the load is visible.
    const elbow = flat(joints.arms[side].mid).depth;
    const head = (key: string, end: FlatPoint) =>
      fromSide
        ? part(
            end.depth,
            <rect
              key={key}
              x={end.x - 3.5}
              y={end.y - 7}
              width={7}
              height={14}
              rx={2.5}
              fill={COLOR}
              stroke="none"
            />,
          )
        : disc(key, Math.max(end.depth, elbow + 0.5), end, 7);
    return [
      bar(`handle${String(side)}`, flat(hand).depth - 0.5, back, front, 3.5),
      head(`back${String(side)}`, back),
      head(`front${String(side)}`, front),
    ];
  });
}

function kettlebells({ joints, flat, fromSide }: Scene): Parts {
  return SIDES.flatMap((side) => {
    const end = joints.arms[side].end;
    const ball = flat(vec(end.x, end.y + BELL.away, end.z));
    return [
      bar(`handle${String(side)}`, ball.depth - 0.5, flat(end), ball, fromSide ? 4 : 7, "butt"),
      disc(`bell${String(side)}`, ball.depth, ball, BELL.radius),
    ];
  });
}

function kettlebell({ joints, flat, fromSide }: Scene): Parts {
  const [near, far] = joints.arms;
  const hand = flat(
    vec((near.end.x + far.end.x) / 2, (near.end.y + far.end.y) / 2, (near.end.z + far.end.z) / 2),
  );
  const ball = flat(bellCenter(joints));
  // The handle goes from the hands to the ball. From the front, it is as wide as the two hands.
  return [
    bar("handle", ball.depth - 0.5, hand, ball, fromSide ? 4 : 11, "butt"),
    disc("bell", ball.depth, ball, BELL.radius),
  ];
}

const wallLine = (x: number) =>
  part(
    BEHIND,
    <line
      key="wall"
      x1={x + 3}
      y1={-1000}
      x2={x + 3}
      y2={GROUND + 1}
      stroke={FAR}
      strokeWidth={6}
      strokeLinecap="butt"
    />,
  );

function wallBall({ joints, flat, fromSide, thrown }: Scene, wall: number, target: number): Parts {
  const ball = flat(ballCenter(joints, thrown));
  const place = (x: number) => ({ x, y: target, depth: 0 });
  const marks = fromSide
    ? [wallLine(wall), bar("target", BEHIND + 1, place(wall - 7), place(wall + 6), 3, "butt")]
    : // From the front, the camera looks through the wall. Only the target line shows.
      [bar("target", BEHIND, place(-24), place(24), 3, "butt")];
  return [...marks, disc("ball", ball.depth, ball, BALL.radius)];
}

function abMat({ fromSide }: Scene, x: number): Parts {
  return [
    part(
      BEHIND,
      fromSide ? (
        <path
          key="abmat"
          d={`M ${String(x - 30)} ${String(GROUND)} Q ${String(x - 9)} ${String(GROUND - 13)} ${String(x)} ${String(GROUND)} Z`}
          fill={COLOR}
          stroke="none"
        />
      ) : (
        <rect
          key="abmat"
          x={-18}
          y={GROUND - 6}
          width={36}
          height={6}
          rx={2}
          fill={COLOR}
          stroke="none"
        />
      ),
    ),
  ];
}

function rope({ flat }: Scene, x: number): Parts {
  const place = flat(vec(x, 0, 0));
  return [
    part(
      -0.5,
      <line
        key="rope"
        x1={place.x}
        y1={-1000}
        x2={place.x}
        y2={1000}
        stroke={COLOR}
        strokeWidth={5}
        strokeDasharray="8 3.75"
        strokeLinecap="butt"
      />,
    ),
  ];
}

function pullUpBar({ flat, fromSide }: Scene, x: number, y: number): Parts {
  const center = flat(vec(x, y, 0));
  if (fromSide) return [grip("pullupbar", IN_FRONT, center, 3.5, 2.5)];
  return [bar("pullupbar", center.depth - 0.5, flat(vec(x, y, -48)), flat(vec(x, y, 48)), 5)];
}

function jumpRope(
  { joints, flat, fromSide, progress }: Scene,
  turns: number,
  phase: number,
  radius: number,
): Parts {
  // The rope is half an ellipse from hand to hand. It turns around the line between the hands.
  const a = joints.arms[0].end;
  const b = joints.arms[1].end;
  const angle = 2 * Math.PI * (turns * progress + phase);
  const out = vec(Math.sin(angle), -Math.cos(angle), 0);
  const points = Array.from({ length: 17 }, (_, index) => {
    const s = index / 16;
    const far = Math.sin(Math.PI * s) * radius;
    const q = flat(
      vec(
        a.x + (b.x - a.x) * s + out.x * far,
        a.y + (b.y - a.y) * s + out.y * far,
        a.z + (b.z - a.z) * s,
      ),
    );
    return `${String(q.x)},${String(q.y)}`;
  });
  return [
    part(
      fromSide || out.x > 0 ? IN_FRONT : BEHIND,
      <polyline
        key="jumprope"
        points={points.join(" ")}
        stroke={COLOR}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />,
    ),
  ];
}

function box({ flat, fromSide }: Scene, x: number, width: number, height: number): Parts {
  // From the side, the box stays on its spot when the figure turns around.
  const corners = [x, x + width].flatMap((edge) =>
    fromSide ? [{ x: edge }] : [flat(vec(edge, 0, -26)), flat(vec(edge, 0, 26))],
  );
  const left = Math.min(...corners.map((corner) => corner.x));
  const right = Math.max(...corners.map((corner) => corner.x));
  return [
    part(
      BEHIND,
      <rect
        key="box"
        x={left}
        y={GROUND - height}
        width={right - left}
        height={height}
        rx={3}
        fill={COLOR}
        stroke="none"
      />,
    ),
  ];
}

function rower(scene: Scene, x: number): Parts {
  const { flat, fromSide, joints } = scene;
  const middle = handsMiddle(scene);
  const seat = flat(vec(joints.hip.x, ROWER.railY - 3, 0));
  const seatPart = part(
    BEHIND + 3,
    <rect
      key="seat"
      x={seat.x - 10}
      y={seat.y - 2.5}
      width={20}
      height={5}
      rx={2}
      fill={COLOR}
      stroke="none"
    />,
  );
  // From the front, the camera looks through the machine: only the parts at the body show.
  if (!fromSide) {
    return [
      seatPart,
      bar(
        "handle",
        flat(middle).depth - 0.5,
        flat(vec(middle.x, middle.y, -17)),
        flat(vec(middle.x, middle.y, 17)),
        4,
      ),
    ];
  }
  const at = (dx: number, y: number) => flat(vec(x + dx, y, 0));
  const { wheel, chain, railY, ankleY, toes } = ROWER;
  // The foot plate is under the sole of the foot on the plate.
  const forward = up(toes);
  const sole = (along: number) =>
    at(forward.x * along - forward.y * 7.5, ankleY + forward.y * along + forward.x * 7.5);
  return [
    seatPart,
    bar("rail", BEHIND, at(-140, railY + 2), at(-2, railY + 2), 4, "butt"),
    bar("rearLeg", BEHIND, at(-136, railY + 2), at(-136, GROUND - 1), 4, "butt"),
    bar("beam", BEHIND, at(-2, railY + 2), at(wheel.dx, wheel.y), 4, "butt"),
    bar("frontLeg", BEHIND, at(20, railY + 1), at(wheel.dx - 14, GROUND - 2), 4, "butt"),
    bar("foot", BEHIND, at(wheel.dx - 30, GROUND - 2), at(wheel.dx + 16, GROUND - 2), 4, "butt"),
    disc("wheel", BEHIND + 1, at(wheel.dx, wheel.y), wheel.radius),
    bar(
      "monitorArm",
      BEHIND,
      at(wheel.dx - 6, wheel.y - wheel.radius + 2),
      at(wheel.dx - 12, chain.y - 34),
      3,
    ),
    bar(
      "monitor",
      BEHIND,
      at(wheel.dx - 16, chain.y - 30),
      at(wheel.dx - 9, chain.y - 41),
      7,
      "butt",
    ),
    bar("plate", BEHIND + 2, sole(-7), sole(18), 3, "butt"),
    bar("chain", BEHIND + 2, flat(middle), at(chain.dx, chain.y), 1.5, "butt"),
    grip("handle", IN_FRONT, flat(middle), 3, 2),
  ];
}

function skiErg({ joints, flat, fromSide }: Scene, x: number): Parts {
  const at = (dx: number, y: number, z = 0) => flat(vec(x + dx, y, z));
  const { top, base, monitor, wheel } = SKIERG;
  const machine = fromSide
    ? [
        // The post goes from the floor to the pulleys. The V at the top is one line from the side.
        bar("tower", BEHIND, at(0, GROUND - 3), at(0, top.y + 2), 6, "butt"),
        bar("top", BEHIND, at(2, top.y), at(top.dx - 2, top.y), 4),
        bar("base", BEHIND, at(base.from, GROUND - 1.5), at(base.to, GROUND - 1.5), 3, "butt"),
        bar("brace", BEHIND, at(-1, GROUND - 88), at(-58, GROUND - 3), 3),
        bar(
          "monitor",
          BEHIND,
          at(monitor.dx - 2, monitor.y + 6),
          at(monitor.dx + 2, monitor.y - 6),
          6,
          "butt",
        ),
        disc("wheel", BEHIND + 1, at(wheel.dx, wheel.y), wheel.radius),
      ]
    : [];
  const cords = SIDES.flatMap((side) => {
    const hand = flat(joints.arms[side].end);
    const name = String(side);
    return [
      bar(
        `cord${name}`,
        BEHIND + 2,
        at(top.dx, top.y, side === 0 ? top.half : -top.half),
        hand,
        1.5,
        "butt",
      ),
      grip(`grip${name}`, hand.depth + 0.5, hand, 2.5, 2),
    ];
  });
  return [...machine, ...cords];
}

function airBike({ joints, flat, fromSide }: Scene, x: number): Parts {
  const at = (dx: number, y: number, z = 0) => flat(vec(x + dx, y, z));
  const axle = at(BIKE.crank.dx, BIKE.crank.y);
  const fan = at(BIKE.fan.dx, BIKE.fan.y);
  const frame = fromSide
    ? [
        disc("fan", BEHIND, fan, BIKE.fan.radius),
        bar("base", BEHIND, at(-14, GROUND - 2), at(BIKE.fan.dx + 30, GROUND - 2), 4, "butt"),
        bar("seatTube", BEHIND + 1, axle, at(-1, BIKE.hipY + 13), 4),
        bar("saddle", BEHIND + 1, at(-11, BIKE.hipY + 12), at(8, BIKE.hipY + 12), 5),
        bar("downTube", BEHIND + 1, axle, fan, 4),
        bar("stand", BEHIND + 1, axle, at(BIKE.crank.dx - 4, GROUND - 2), 4, "butt"),
        bar("post", BEHIND + 1, at(BIKE.lever.dx, BIKE.lever.y), fan, 4),
      ]
    : [];
  const limbs = SIDES.flatMap((side) => {
    const name = String(side);
    const leg = joints.legs[side];
    const pedal = pedalOf(leg.end, joints.toes[side]);
    const forward = up(joints.toes[side]);
    const z = leg.end.z;
    const depth = flat(leg.end).depth - 0.5;
    const hand = joints.arms[side].end;
    return [
      ...(fromSide ? [bar(`crank${name}`, depth, axle, flat(vec(pedal.x, pedal.y, z)), 3)] : []),
      bar(
        `pedal${name}`,
        depth,
        flat(vec(pedal.x - forward.x * 6, pedal.y - forward.y * 6, z)),
        flat(vec(pedal.x + forward.x * 6, pedal.y + forward.y * 6, z)),
        3,
      ),
      bar(
        `lever${name}`,
        flat(hand).depth - 0.5,
        at(BIKE.lever.dx, BIKE.lever.y, hand.z),
        flat(hand),
        3,
      ),
    ];
  });
  return [...frame, ...limbs];
}

/** The parts of the equipment at this moment, for the draw order of the figure. */
export function equipmentParts(equipment: Equipment, scene: Scene): Parts {
  switch (equipment.kind) {
    case "none":
      return [];
    case "barbell":
      return barbell(scene, equipment.onBack === true);
    case "dumbbell":
      return dumbbell(scene, dumbbellHand(equipment, scene.progress));
    case "dumbbells":
      return dumbbells(scene);
    case "kettlebells":
      return kettlebells(scene);
    case "kettlebell":
      return kettlebell(scene);
    case "wall":
      return scene.fromSide
        ? [wallLine(equipment.side === "left" ? equipment.wall - 6 : equipment.wall)]
        : [];
    case "wallball":
      return wallBall(scene, equipment.wall, equipment.target);
    case "abmat":
      return abMat(scene, equipment.x);
    case "rower":
      return rower(scene, equipment.x);
    case "skierg":
      return skiErg(scene, equipment.x);
    case "bike":
      return airBike(scene, equipment.x);
    case "plate":
      return heldPlate(scene);
    case "bench":
      return [...bench(scene, equipment.x), ...barbell(scene, false)];
    case "floorbar":
      return floorBar(scene, equipment.x);
    case "box":
      return box(scene, equipment.x, equipment.width, equipment.height);
    case "rope":
      return rope(scene, equipment.x);
    case "pullupbar":
      return pullUpBar(scene, equipment.x, equipment.y);
    case "jumprope":
      return jumpRope(scene, equipment.turns, equipment.phase, equipment.radius);
  }
}
