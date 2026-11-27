// Butterfly Pull-up, from the CrossFit demo video (youtube.com/watch?v=OenVG15QMj8) and the feedback of
// the user. The figure looks to +x. One loop: the body swings back with straight arms and gets its height from the
// swing. The arms pull it forward to the bar, and on the way the hollow turns into the arch. The high point comes
// before the head is near the bar: from there the body goes down while it still moves forward, so the head does not
// hit the bar. In the controlled drop, the shoulders go under the bar and the body falls in the arch (the belly in
// front, the legs back, the knees a little bent). It swings back through the hang, and the legs kick forward into the
// next swing. One function gives the pose for each part of the loop: no stop.
import type { Exercise } from "../exercise.ts";
import { BODY, item, up, type Pose, type Step } from "../skeleton.ts";
import { BAR, FRONT, SIDE } from "./kipping-pull-up.ts";

const RAD = Math.PI / 180;
/**
 * One loop, in seconds. The video has one repetition per second, but there the pull looked too fast to the user.
 * The pull takes 0.6 s, the drop 0.4 s, the swing 0.43 s.
 */
const LOOP = 1.43;
const POSES = 80;

/**
 * The places of the body at the key moments of the loop. `at` is the part of the loop.
 * `ahead`, `below`: the place of the shoulders, from the bar. The shoulders move on a smooth path: at the end of the
 * swing they still rise while they turn from back to forward, and at the top they still go forward while they start
 * to drop. With an angle and a length, both turned at the same time, and the body stopped.
 * `lean`, `bend`, `head` as in a pose. `thigh`: the angle of the thighs (0 down, positive forward). `knee`: how far the
 * shins trail behind the thighs. `elbowsOut`: how far the elbows go out when the arms bend.
 */
export type Key = {
  at: number;
  ahead: number;
  below: number;
  lean: number;
  bend: number;
  head: number;
  thigh: number;
  knee: number;
  elbowsOut: number;
};

/** The keys of the butterfly pull-up. A variant replaces the keys with the same `at`. */
const KEYS: Key[] = [
  // The head comes near the bar: the body already goes down, so the head does not hit the bar. It is in the arch: the
  // hips forward, the legs back.
  {
    at: 0,
    ahead: -12.3,
    below: 21,
    lean: -23,
    bend: -12,
    head: 10,
    thigh: -10,
    knee: 24,
    elbowsOut: 1.1,
  },
  // The dive: the motion to the bar goes on. The shoulders go forward under the bar, the hips go forward, and the
  // legs go back.
  {
    at: 0.07,
    ahead: -9,
    below: 26,
    lean: -19,
    bend: -20,
    head: 6,
    thigh: -32,
    knee: 27,
    elbowsOut: 0.95,
  },
  {
    at: 0.14,
    ahead: -4,
    below: 39,
    lean: -14,
    bend: -26,
    head: 0,
    thigh: -48,
    knee: 29,
    elbowsOut: 0.8,
  },
  {
    at: 0.21,
    ahead: 1,
    below: 49,
    lean: -12,
    bend: -28,
    head: -1,
    thigh: -56,
    knee: 30,
    elbowsOut: 0.6,
  },
  // The arch at the front: the belly in front of the bar, the head near its plane, the legs 60 degrees back, the knees
  // a little bent.
  {
    at: 0.28,
    ahead: 6.9,
    below: 56.6,
    lean: -10,
    bend: -31,
    head: -2,
    thigh: -58,
    knee: 31,
    elbowsOut: 0.45,
  },
  // The swing back through the hang: the arms are straight, the legs come under the body.
  {
    at: 0.376,
    ahead: 2.2,
    below: 63.5,
    lean: -6,
    bend: -18,
    head: 0,
    thigh: -38,
    knee: 22,
    elbowsOut: 0.4,
  },
  // The kick: the legs drive forward. With straight arms, the body swings back and up like a pendulum: this swing
  // gives the height. The body is a hollow: the legs are about 45 degrees in front of the line of the torso. The
  // torso stays near the line of the arms (a shoulder angle of about 110 degrees). With more lean back, the arms
  // stuck out of the chest and looked too long.
  {
    at: 0.472,
    ahead: -25.8,
    below: 58,
    lean: -12,
    bend: 6,
    head: 2,
    thigh: 42,
    knee: 18,
    elbowsOut: 0.45,
  },
  // The high point of the swing, 46 degrees behind the bar. The arms start to bend here.
  {
    at: 0.577,
    ahead: -44.6,
    below: 43.1,
    lean: -18,
    bend: 9,
    head: 4,
    thigh: 63,
    knee: 14,
    elbowsOut: 0.5,
  },
  // The pull: the arms pull the body to the bar. On the way, the hollow turns into the arch: the hips go forward and
  // the legs go back.
  {
    at: 0.789,
    ahead: -26.3,
    below: 24.6,
    lean: -21,
    bend: -2,
    head: 9,
    thigh: 14,
    knee: 13,
    elbowsOut: 0.9,
  },
  // The high point: still behind the bar, before the head is near it. The pull and the swing do not stop here: the
  // body goes on toward the bar, and from here on it goes down. There is no hold at the top.
  {
    at: 0.9,
    ahead: -18.4,
    below: 16,
    lean: -22.4,
    bend: -6.8,
    head: 9.7,
    thigh: 1.9,
    knee: 18,
    elbowsOut: 1.05,
  },
];

type Field = Exclude<keyof Key, "at">;

/**
 * A smooth curve through the keys that repeats after 1. It has no overshoot: at a key that is a turn point (higher or
 * lower than both neighbors), the curve has the speed 0 and turns softly (a monotone cubic curve, as `periodic()` in
 * `farmers-carry.ts`). A Catmull-Rom curve went past the turn points and came back: the user saw the motion jerk.
 */
function curve(keys: readonly Key[], field: Field): (part: number) => number {
  const count = keys.length;
  const key = (index: number): Key => item(keys, ((index % count) + count) % count);
  const time = (index: number) => key(index).at + Math.floor(index / count);
  const value = (index: number) => key(index)[field];
  const slope = (index: number) =>
    (value(index + 1) - value(index)) / (time(index + 1) - time(index));
  const tangent = (index: number) => {
    const before = slope(index - 1);
    const after = slope(index);
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  };
  return (part) => {
    const p = part - Math.floor(part);
    // The last key at or before `p`. Before the first key, it is the last key of the loop before (-1).
    let k = count - 1;
    while (k >= 0 && key(k).at > p) k--;
    const h = time(k + 1) - time(k);
    const s = (p - time(k)) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * value(k) +
      (s3 - 2 * s2 + s) * h * tangent(k) +
      (-2 * s3 + 3 * s2) * value(k + 1) +
      (s3 - s2) * h * tangent(k + 1)
    );
  };
}

type Curves = Record<Field, (part: number) => number>;

const curves = (keys: readonly Key[]): Curves => ({
  ahead: curve(keys, "ahead"),
  below: curve(keys, "below"),
  lean: curve(keys, "lean"),
  bend: curve(keys, "bend"),
  head: curve(keys, "head"),
  thigh: curve(keys, "thigh"),
  knee: curve(keys, "knee"),
  elbowsOut: curve(keys, "elbowsOut"),
});

/** The length of straight arms, from the shoulder to the grip. */
const ARMS = 61.8;
/** The soft end of the arms: below this length, `straight()` changes nothing. */
const SOFT = 3;

/**
 * A distance from the bar to the shoulders that the arms can reach. Up to `ARMS - SOFT` it stays. Above, it comes
 * softly near `ARMS` and never gets there. A hard limit (`Math.min`) made a kink: the user saw the motion jerk.
 */
function straight(distance: number): number {
  const start = ARMS - SOFT;
  return distance <= start ? distance : ARMS - SOFT * Math.exp(-(distance - start) / SOFT);
}

function pose(curve: Curves, part: number): Pose {
  const value = (field: Field) => curve[field](part);
  const ahead = value("ahead");
  const below = value("below");
  const distance = Math.hypot(ahead, below);
  const scale = straight(distance) / distance;
  const lean = value("lean");
  const bend = value("bend");
  const shoulder = { x: BAR.x + ahead * scale, y: BAR.y + below * scale };
  const torso = up(lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  const thigh = value("thigh");
  const shin = thigh - value("knee");
  const feet = {
    x: hip.x + Math.sin(thigh * RAD) * BODY.thigh + Math.sin(shin * RAD) * (BODY.shin + 0.5),
    y: hip.y + Math.cos(thigh * RAD) * BODY.thigh + Math.cos(shin * RAD) * (BODY.shin + 0.5),
  };
  return {
    hip,
    lean,
    bend,
    head: value("head") - bend / 2,
    feet,
    stance: 5,
    knees: 0,
    // Pointed toes, in the line of the shins.
    toes: 172 - shin,
    hands: BAR,
    grip: 17,
    elbows: 0.4,
    elbowsOut: value("elbowsOut"),
  };
}

/** The phases of the loop: each label holds up to its part of the loop. */
type Phases = readonly (readonly [until: number, label: string])[];

/** The phases from the drop to the swing: the same in all variants. */
const START: Phases = [
  [0.28, "Untertauchen"],
  [0.43, "Durch die Mitte"],
  [0.577, "Schwung"],
];

/** The phases of the pull-up after the swing. */
const END: Phases = [
  [0.86, "Zug"],
  [0.94, "Höhepunkt"],
  [1, "Untertauchen"],
];

/** The label of the part of the loop that a step ends in. */
function labelAt(part: number, phases: Phases): string {
  return (phases.find(([until]) => part <= until) ?? item(phases, phases.length - 1))[1];
}

/** The keys from the kick to the start of the drop: a variant replaces all of them. */
const isTop = (at: number) => at > 0.45 || at < 0.1;

/**
 * A butterfly pull-up. `top`: the keys from the kick to the start of the drop (`at` above 0.45 or below 0.1). They
 * replace the keys of the pull-up there. `end`: the phases after the swing.
 */
export function butterflyPullUp(options: {
  key: string;
  title: string;
  top?: readonly Key[];
  end?: Phases;
}): Exercise {
  const top = options.top ?? KEYS.filter((key) => isTop(key.at));
  const keys = [...KEYS.filter((key) => !isTop(key.at)), ...top].sort((a, b) => a.at - b.at);
  const phases = [...START, ...(options.end ?? END)];
  const curve = curves(keys);
  const steps: Step[] = Array.from({ length: POSES }, (_, index) => {
    const part = (index + 1) / POSES;
    const label = labelAt(part, phases);
    return {
      to: pose(curve, part % 1),
      seconds: LOOP / POSES,
      label,
      ease: "linear",
      anchor: "hands",
      legs: "fk",
      arms: "line",
    };
  });
  return {
    key: options.key,
    title: options.title,
    equipment: { kind: "pullupbar", ...BAR },
    views: [SIDE, FRONT],
    ground: false,
    start: pose(curve, 0),
    steps,
  };
}

export const BUTTERFLY_PULL_UP: Exercise = butterflyPullUp({
  key: "butterfly-pull-up",
  title: "Butterfly Pull-up",
});
