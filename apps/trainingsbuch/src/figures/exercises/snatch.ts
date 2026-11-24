// Snatch: the squat snatch of Olympic weightlifting. The bar goes from the floor to straight arms
// overhead in one movement, and the athlete receives it in a deep overhead squat.
// `snatch(options)` builds the exercise. `power-snatch.ts` calls it with other numbers: the two files share all code.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { shoulderOf, standingHipY } from "../poses.ts";
import { tiptoe, type Pose } from "../skeleton.ts";

type Spot2 = { x: number; y: number };

/** The wide grip: the hands are 32 to each side, the shoulder joints 13. */
const GRIP = 32;
/** The length of a straight arm in the side view with this grip (59.0, not 62). A little less: the hand is on its spot. */
const REACH = Math.sqrt(62 ** 2 - (GRIP - 13) ** 2) - 0.02;

const FEET = { x: 74, y: 200 };
const pull = { feet: FEET, stance: 10, knees: 0.5, grip: GRIP };
// The feet land a little wider. They stay there until the bar is down again.
const WIDE = 12.5;
const wide = { ...pull, stance: WIDE };
export const TALL = standingHipY(WIDE);

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Where the arms start in the side view: a shrug moves the shoulder joints along the torso, toward the head. */
function joint(hip: Spot2, lean: number, shrug: number): Spot2 {
  const shoulder = shoulderOf(hip, lean);
  const along = shoulderOf({ x: 0, y: 0 }, lean);
  return { x: shoulder.x + (along.x / 46) * shrug, y: shoulder.y + (along.y / 46) * shrug };
}

/** The shrug at the end of the second pull, and the active shoulders under a bar overhead. */
const SHRUG = { pull: 6, overhead: 3 };

/** The hands of straight arms that hang: the bar is at `x`, below the shoulders. */
function hang(hip: Spot2, lean: number, x: number, shrug = 0): Spot2 {
  const shoulder = joint(hip, lean, shrug);
  return { x, y: shoulder.y + Math.sqrt(REACH ** 2 - (x - shoulder.x) ** 2) };
}

/** The hands of straight arms overhead: the bar is `dx` in front of the shoulders. */
export function overhead(hip: Spot2, lean: number, dx: number, shrug = 0): Spot2 {
  const shoulder = joint(hip, lean, shrug);
  return { x: shoulder.x + dx, y: shoulder.y - Math.sqrt(REACH ** 2 - dx ** 2) };
}

/** A pose of the pull with straight arms: the bar is at `bar`, and the hip is as high as the arms permit. */
export function pulled(hipX: number, lean: number, bar: Spot2): Pose {
  const shoulder = shoulderOf({ x: hipX, y: 0 }, lean);
  const hipY = bar.y - Math.sqrt(REACH ** 2 - (bar.x - shoulder.x) ** 2) - shoulder.y;
  return { ...pull, hip: { x: hipX, y: hipY }, lean, hands: bar, elbowTo: 150, elbowsOut: 3 };
}

// The bar line of the pull is 5 to 7 in front of the legs and 9 in front of the torso: the bar can touch a
// shin, a thigh or the belly, but it is not in them (the check allows 2.5).
// The bar is on the floor (its center is 17 above the ground), over the middle of the feet. The hips are lower
// than in the clean, the shoulders are a little in front of the bar, the eyes look forward.
const START: Pose = { ...pulled(48.5, 52, { x: 84, y: 189 }), head: -32 };
// The bar is at the shins, then at the knees: the knees went back, the shin is nearly vertical, and the bar is in
// front of the knee. The angle of the torso is the same.
const SHIN: Pose = { ...pulled(48.6, 51, { x: 85.7, y: 175 }), head: -32 };
const KNEE: Pose = { ...pulled(50.2, 50, { x: 85.5, y: 161 }), head: -32 };
// The middle of the transition: the knees come forward under the bar, the hip does not rise.
export const THIGH: Pose = { ...pulled(61, 33, { x: 84, y: 149 }), head: -20 };
// The bar is as high as straight arms permit: at the top of the thighs. The torso is nearly vertical,
// the knees are under the bar again and bent a little.
const POWER_HIP = { x: 71, y: 123.5 };
export const POWER: Pose = {
  ...pull,
  hip: POWER_HIP,
  lean: 9,
  hands: hang(POWER_HIP, 9, 84.4, 2),
  shrug: 2,
  elbowTo: 150,
  elbowsOut: 3,
};
// Full extension, on the toes, with a very small lean back. The shoulders are up (the shrug), and the arms are
// still nearly straight: the bar is 6 higher than without the shrug.
const EXTEND_HIP = { x: 77, y: 113 };
// 1.2 inside the reach: the elbows start to bend.
const EXTEND_BAR = { x: 86.4, y: hang(EXTEND_HIP, -5, 86.4, SHRUG.pull).y - 1.2 };
export const EXTEND: Pose = {
  ...pull,
  feet: tiptoe(75, 125),
  toes: 125,
  hip: EXTEND_HIP,
  lean: -5,
  hands: EXTEND_BAR,
  shrug: SHRUG.pull,
  elbowTo: 150,
  elbowsOut: 3,
};

/** The overhead squat with the hip at the height `y`: from the stand (`TALL`) to the deep squat (174). */
function squat(y: number): { hip: Spot2; lean: number } {
  const deep = (y - TALL) / (174 - TALL);
  return { hip: { x: 74 - 17 * deep, y }, lean: 30 * deep };
}

/** The bar overhead on locked arms, in the squat with the hip at the height `y`. The head is in front of the arms. */
export function locked(y: number): Pose {
  const { hip, lean } = squat(y);
  const deep = (y - TALL) / (174 - TALL);
  return {
    ...wide,
    hip,
    lean,
    head: mix(6, -22, deep),
    hands: overhead(hip, lean, mix(2, -1, deep), SHRUG.overhead),
    shrug: SHRUG.overhead,
    elbowTo: -90,
    elbowsOut: 4,
  };
}

/** The feet of one pose of the pull under. `{}`: the feet are flat on the floor, in the wide stance. */
export type Feet = Pick<Pose, "feet" | "toes" | "stance"> | Record<string, never>;

/** Feet on the toes, `lift` above the floor: for a body that is still too high for flat feet. */
export function onToes(toes: number, stance: number, lift = 0.8): Feet {
  return { feet: { x: 74.5, y: tiptoe(74.5, toes).y - lift }, toes, stance };
}

export type SnatchOptions = {
  key: string;
  title: string;
  /** How low the hip is at the catch (y). 174 is a deep squat: the hip joint is below the knee joint. */
  depth: number;
  /**
   * How low the hip is when the arms lock (y). The squat snatch: the same as `depth`, the arms lock at the bottom.
   * The power snatch: higher than `depth`. The arms lock when the feet land, then the legs give way to `depth`.
   */
  lock: number;
  /** The feet in the five poses of the pull under, in this order: bend, high, chest, land, push. */
  feet: readonly [Feet, Feet, Feet, Feet, Feet];
  seconds: {
    /** From the extension to the bar at the height of the shoulders. */
    rise: number;
    /** From there to locked arms. */
    lockout: number;
    /** From locked arms to the catch. Only when `lock` is not `depth`. */
    give: number;
    /** From the catch to the stand. */
    up: number;
  };
};

/**
 * The pull under, to locked arms with the hip at the height `lock`. Each pose is a part of the way of the bar
 * (`bar`, 0 to 1) and a part of the way of the hip (`drop`, 0 to 1): the bar rises at one speed, and the body
 * falls faster and faster and then comes to rest.
 */
function receive(lock: number, feet: SnatchOptions["feet"]) {
  const LOCK = locked(lock);
  const end = {
    hip: LOCK.hip,
    lean: LOCK.lean,
    bar: overhead(LOCK.hip, LOCK.lean, -1, SHRUG.overhead),
  };
  const from = { hip: EXTEND_HIP, lean: -5, bar: EXTEND_BAR };
  const shoulders = {
    from: shoulderOf(from.hip, from.lean).x,
    end: shoulderOf(end.hip, end.lean).x,
  };
  // `tilt`: which part of the way of the lean is done. `forward`: which part of the way of the shoulders (x).
  // The shoulders stay behind the bar until the bar is past them: the hip goes back under a torso that tilts.
  const at = (
    bar: number,
    drop: number,
    tilt: number,
    forward: number,
    barX: number,
    rest: Partial<Pose>,
  ): Pose => {
    const lean = mix(from.lean, end.lean, tilt);
    const shoulderX = mix(shoulders.from, shoulders.end, forward);
    return {
      ...wide,
      hip: {
        x: shoulderX - shoulderOf({ x: 0, y: 0 }, lean).x,
        y: mix(from.hip.y, end.hip.y, drop),
      },
      lean,
      hands: { x: barX, y: mix(from.bar.y, end.bar.y, bar) },
      ...rest,
    };
  };
  // The arms start to bend, the elbows go out. The feet are just above the floor and move out.
  const BEND = at(0.15, 0.02, 0, 0, 87, {
    ...feet[0],
    shrug: 6,
    head: -5,
    elbowTo: 150,
    elbowsOut: 3,
  });
  // The elbows are high and out, the bar is at the belly.
  const HIGH = at(0.3, 0.08, 0.03, 0, 87.3, {
    ...feet[1],
    shrug: 5.5,
    head: -5,
    elbowTo: 150,
    elbowsOut: 3,
  });
  // The bar is at the chest. In the squat snatch the feet land flat here.
  const CHEST = at(0.46, 0.22, 0.1, 0, 87.6, {
    ...feet[2],
    shrug: 4.5,
    head: -10,
    elbowTo: -150,
    elbowsOut: 3,
  });
  // The bar is at the height of the shoulders, the elbows turn under it.
  const LAND = at(0.62, 0.43, 0.22, 0, 88, {
    ...feet[3],
    shrug: 3.5,
    head: -18,
    elbowTo: -90,
    elbowsOut: 3,
  });
  // The bar is over the head. The arms push the body down under it.
  const PUSH = at(0.85, 0.74, 0.6, 0.45, 85, {
    ...feet[4],
    shrug: 3,
    head: -30,
    elbowTo: -90,
    elbowsOut: 4,
  });
  return { BEND, HIGH, CHEST, LAND, PUSH, LOCK };
}

const STAND = locked(TALL);

// The way down. The bar passes in front of the face: the head goes back out of its way. The elbows turn as in
// the pull under, in reverse. The feet go back to the stance of the pull, one after the other.
const STAND_HIP = { x: 74, y: TALL };
const step = (near: number, far: number) => ({
  feet: [
    { x: 74, y: near === 11.2 ? 198.5 : 200, z: near },
    { x: 74, y: far === 11.2 ? 198.5 : 200, z: far },
  ] as const,
});
const down = { ...pull, hip: STAND_HIP, lean: 0 };
const FACE: Pose = {
  ...down,
  ...step(11.2, WIDE),
  shrug: 2,
  head: -28,
  hands: { x: 86, y: 50 },
  elbowTo: -90,
  elbowsOut: 4,
};
const NECK: Pose = {
  ...down,
  ...step(10, 11.2),
  head: -22,
  hands: { x: 88, y: 76 },
  elbowTo: -90,
  elbowsOut: 3,
};
const BELLY: Pose = {
  ...down,
  hip: { x: 73, y: TALL + 1.5 },
  lean: 3,
  head: -8,
  hands: { x: 85.5, y: 106 },
  elbowTo: 150,
  elbowsOut: 3,
};

/** Builds a snatch. The pull, the extension, the hold overhead and the way down are the same for each variant. */
export function snatch(options: SnatchOptions): Exercise {
  const { depth, lock, seconds } = options;
  const { BEND, HIGH, CHEST, LAND, PUSH, LOCK } = receive(lock, options.feet);
  const CATCH = locked(depth);
  return {
    key: options.key,
    title: options.title,
    equipment: { kind: "barbell" },
    views: [SIDE, FRONT],
    start: START,
    steps: [
      { to: START, seconds: 0.3, label: "Start" },
      // One step from the floor to the extension: it gets faster and faster. "fk": the arms are ropes.
      {
        to: EXTEND,
        via: [SHIN, KNEE, THIGH, POWER],
        seconds: 0.7,
        label: ["Zug", "Zug", "Zug", "Zug", "Streckung"],
        ease: "in",
        anchor: "feet",
        arms: "fk",
      },
      // The bar rises at one speed (`follow: "hands"`), the body drops under it.
      {
        to: LAND,
        via: [BEND, HIGH, CHEST],
        seconds: seconds.rise,
        label: "Unter die Stange",
        ease: "linear",
        arms: "line",
        follow: "hands",
      },
      {
        to: LOCK,
        via: [PUSH],
        seconds: seconds.lockout,
        ease: "out",
        anchor: "feet",
        arms: "line",
        follow: "hands",
      },
      // The power snatch: the arms are locked, the legs give way. The bar goes down with the body.
      ...(lock === depth
        ? []
        : [
            {
              to: CATCH,
              seconds: seconds.give,
              ease: "soft",
              anchor: "feet",
              arms: "carry",
            } as const,
          ]),
      { to: CATCH, seconds: 0.3, label: "Fangen" },
      {
        to: STAND,
        via: [locked(mix(depth, TALL, 0.5)), locked(mix(depth, TALL, 0.82))],
        seconds: seconds.up,
        label: "Aufstehen",
        anchor: "feet",
        arms: "carry",
      },
      { to: STAND, seconds: 0.4, label: "Halten" },
      {
        to: POWER,
        via: [FACE, NECK, BELLY],
        seconds: 0.8,
        label: "Ablassen",
        anchor: "feet",
        arms: "line",
        follow: "hands",
      },
      { to: START, via: [THIGH, KNEE, SHIN], seconds: 0.6, anchor: "feet", arms: "fk" },
    ],
  };
}

export const SNATCH: Exercise = snatch({
  key: "snatch",
  title: "Snatch",
  depth: 174,
  lock: 174,
  // The feet are just above the floor and move out. They land flat when the bar is at the chest.
  feet: [
    { feet: { x: 74.5, y: 198.9 }, toes: 110, stance: 10.6 },
    { feet: { x: 74.5, y: 198.9 }, toes: 100, stance: 11.2 },
    {},
    {},
    {},
  ],
  seconds: { rise: 0.18, lockout: 0.22, give: 0, up: 0.7 },
});
