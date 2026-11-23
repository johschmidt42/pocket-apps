// Wall walk (CrossFit Open 22.1): from the floor, the feet go up the wall and the hands walk to the wall.
// The wall is to the left. The figure looks to +x: it lies on its chest with the feet toward the wall.
// The floor part (lie, push up, lower) has key poses, as in `burpee.ts`. The walk is made by one function of the
// progress `u` (0 to 8 beats): in each beat, one hand and the opposite foot move, and the other two are planted.
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { BODY, GROUND, item, tiptoeFromToe, up, type Pose, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
type Point = { x: number; y: number };

const WALL = 20;
/** The first line: 60 inches from the wall. The hands are here on the floor part. */
const LINE_1 = 177;
/** The second line: 10 inches from the wall. The hands touch it at the top. */
const LINE_2 = 47;
/** A hand on the floor: half the line width of the forearm above the ground. */
const HAND_Y = GROUND - 4.5;
/** The hands are just outside the shoulders, as in `push-up.ts`. */
const GRIP = 21;
/** The ankle is in line with the hip joint: a leg of 80 is then straight. */
const STANCE = BODY.hipHalf;
const LEG = BODY.thigh + BODY.shin;
/** The length of a straight arm in the side view: the hand is `GRIP - 13` outside the shoulder joint. */
const ARM = Math.sqrt(61.95 ** 2 - (GRIP - BODY.shoulderHalf) ** 2);

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (t: number) => Math.min(Math.max(t, 0), 1);
/** Starts and ends at rest. */
const ease = (t: number) => t * t * (3 - 2 * t);

/** The point that is `ra` from `a` and `rb` from `b`. Of the two such points, the higher one. */
function meet(a: Point, ra: number, b: Point, rb: number): Point {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const along = (ra * ra - rb * rb + d * d) / (2 * d);
  const side = Math.sqrt(Math.max(ra * ra - along * along, 0));
  const ux = (b.x - a.x) / d;
  const uy = (b.y - a.y) / d;
  const base = { x: a.x + along * ux, y: a.y + along * uy };
  const one = { x: base.x + side * uy, y: base.y - side * ux };
  const two = { x: base.x - side * uy, y: base.y + side * ux };
  return one.y < two.y ? one : two;
}

type Elbows = { elbowTo: number; elbowsOut: number };
// The elbows of `burpee.ts`, a little more to the side on the floor: the hands lie beside the neck here, and with
// the values of the burpee the elbows stand straight up. The upper arms are an arrow and not a T.
const TOP_ELBOWS: Elbows = { elbowTo: -100, elbowsOut: 0 };
const LOW_ELBOWS: Elbows = { elbowTo: -110, elbowsOut: 0.3 };
const BOTTOM_ELBOWS: Elbows = { elbowTo: -175, elbowsOut: 0.7 };
// On the walk the arms are locked. When an arm must give way a little, the elbow stays near the body. With
// `elbowsOut: 1.5` it stood 17 out to the side at the first step of a hand.
const WALK_ELBOWS: Elbows = { elbowTo: -100, elbowsOut: 0.5 };

// ---------- The floor: lie, push up to a long plank ----------

const FLOOR_TOES = 172;
const PLANK_TOES = 160;
/** The lower edge of the chest (half width 9.5) is on the floor. */
const CHEST_Y = GROUND - 9.5;
const HIP_ON_FLOOR = CHEST_Y - 0.5;
// Lying: the chest, the thighs and the feet are on the floor. The shoulders are at x = 170, 7 behind the hands.
const lyingLean = 90 + Math.asin(0.5 / BODY.torso) / RAD;
const lyingHip = { x: 170 - Math.sqrt(BODY.torso ** 2 - 0.5 ** 2), y: HIP_ON_FLOOR };
const lyingAnkleY = tiptoeFromToe(0, FLOOR_TOES).y;
const lyingAnkle = {
  x: lyingHip.x - Math.sqrt(LEG ** 2 - (HIP_ON_FLOOR - lyingAnkleY) ** 2),
  y: lyingAnkleY,
};
/** The tips of the toes stay on this spot from the first to the last moment on the floor: no foot slides. */
const TOE_X = lyingAnkle.x + up(FLOOR_TOES).x * 15 - up(FLOOR_TOES).y * 1.5;

/** The body as one straight line from the ankles to the shoulders. `tilt` is its angle above the floor. */
function line(tilt: number, toes: number) {
  const ankle = tiptoeFromToe(TOE_X, toes);
  const along = { x: Math.cos(tilt * RAD), y: -Math.sin(tilt * RAD) };
  const hip = { x: ankle.x + along.x * LEG, y: ankle.y + along.y * LEG };
  return { ankle, hip, lean: 90 - tilt, toes };
}

function onFloor(b: ReturnType<typeof line>, head: number, elbows: Elbows): Pose {
  return {
    hip: b.hip,
    lean: b.lean,
    head,
    feet: b.ankle,
    toes: b.toes,
    stance: STANCE,
    knees: 0,
    hands: { x: LINE_1, y: HAND_Y },
    grip: GRIP,
    ...elbows,
  };
}

// The plank is long: the toes stay where they are, and the hands stay on the first line. So the shoulders are
// 18 behind the hands, and the straight arms slant. The shoulders are where a straight arm and a straight body meet.
const plankAnkle = tiptoeFromToe(TOE_X, PLANK_TOES);
const plankShoulder = meet(plankAnkle, LEG + BODY.torso - 0.1, { x: LINE_1, y: HAND_Y }, ARM);
const PLANK_TILT = Math.asin((plankAnkle.y - plankShoulder.y) / (LEG + BODY.torso - 0.1)) / RAD;
const FLOOR_TILT = Math.asin((lyingAnkleY - CHEST_Y) / (LEG + BODY.torso)) / RAD;
/** The part of the way down at which the "in" step ends and the "out" step starts. */
const PART = 0.6;

const PLANK = onFloor(line(PLANK_TILT, PLANK_TOES), -10, TOP_ELBOWS);
const LOW = onFloor(
  line(mix(PLANK_TILT, FLOOR_TILT, PART), mix(PLANK_TOES, FLOOR_TOES, PART)),
  -18,
  LOW_ELBOWS,
);
const LYING = onFloor(
  { ankle: lyingAnkle, hip: lyingHip, lean: lyingLean, toes: FLOOR_TOES },
  -26,
  BOTTOM_ELBOWS,
);

// ---------- The feet on the wall ----------

/** The ankle of the highest foothold: at the top, the legs are straight above the hips. */
const TOP_FOOT_Y = 10.5;
/** The angle of a foot on the wall: the sole is on the wall near the floor, and only the toes touch it at the top. */
const toesAt = (y: number) => 182 + clamp((170 - y) / (170 - TOP_FOOT_Y)) * 63;
/** The ankle of a foot whose toe tip touches the wall. */
function onWall(y: number): Point {
  const toes = toesAt(y) * RAD;
  return { x: WALL + 5 - 15 * Math.sin(toes) - 1.5 * Math.cos(toes), y };
}

/**
 * The footholds, as heights of the ankle. Number 0 is for both feet, before the hands move. Number `k` is the foot
 * that lands at the end of beat `k - 1`. Each foot lands with a straight leg, as high as the leg can reach then.
 * The steps are long at first: while the shoulders are far from the wall, a small move of the hands turns the body much.
 * A search found these heights and the leans below: it kept the knee bend at the end of each stance and the pike small.
 */
const FOOT_Y = [140, 102.6, 68.3, 47.6, 34.4, 24.7, 17.4, 12.6, TOP_FOOT_Y];
const FOOTHOLDS = FOOT_Y.map(onWall);
const BEATS = 8;

// Both feet are on the wall, the hands are still on the first line: the body is one straight line, nearly level.
const START_JOINT = meet(item(FOOTHOLDS, 0), LEG + BODY.torso - 0.4, { x: LINE_1, y: HAND_Y }, ARM);
const START_LEAN =
  Math.atan2(START_JOINT.x - item(FOOTHOLDS, 0).x, item(FOOTHOLDS, 0).y - START_JOINT.y) / RAD;
/** The lean at the start of each beat, and at the top. The hips pike a little on the way: about 10 to 20 degrees. */
const LEANS = [START_LEAN, 105.1, 120.9, 136.7, 150.1, 160.2, 169.1, 175.6, 176.2];
/** Active shoulders at the top: the shoulder joints are this far nearer to the head. */
const TOP_SHRUG = 4;

// ---------- The hands ----------

// The near hand steps first, to a spot nearly under the shoulders. Then the hands take steps of `2 * HAND_STEP`.
// The last step of the far hand is half a step: the two hands end side by side on the second line.
const FIRST_HAND = (12 * START_JOINT.x + LINE_2) / 13;
const HAND_STEP = (FIRST_HAND - LINE_2) / 6;
/** The hand that is on the floor in the whole beat `k`. Number 8 is where the last hand lands. */
const planted = (k: number) =>
  k === 0 ? LINE_1 : Math.max(FIRST_HAND - HAND_STEP * (k - 1), LINE_2);

/** The height of the shoulder joints when a straight arm stands `away` from them on the floor. */
const over = (away: number) => HAND_Y - Math.sqrt(ARM * ARM - away * away);

/**
 * The middle of the two shoulder joints on the walk. The body vaults over the planted arm, which stays straight:
 * at the border of two beats, the joints are exactly between the two hands, so both arms are straight there.
 * In the first two beats the hands come under the shoulders, and the shoulders only start to move.
 */
function jointAt(u: number): Point {
  if (u <= 2) {
    const x = START_JOINT.x - (HAND_STEP / 4) * u * u;
    if (u <= 1) return { x, y: over(LINE_1 - x) };
    // The near hand lands with a bent arm: the far hand still holds the shoulders low. Now this arm pushes them up.
    const from = over(LINE_1 - (START_JOINT.x - HAND_STEP / 4));
    const to = over(HAND_STEP / 2);
    const slope = -(HAND_STEP / 2 / Math.sqrt(ARM * ARM - HAND_STEP ** 2 / 4)) * HAND_STEP;
    const t = u - 1;
    return { x, y: mix(from, to, t * t * (3 - 2 * t)) + (t * t * t - t * t) * slope };
  }
  if (u <= 7) {
    const x = START_JOINT.x - HAND_STEP - HAND_STEP * (u - 2);
    return { x, y: over(x - planted(Math.min(Math.floor(u), 6))) };
  }
  // The last half step: the shoulders come to rest over the hands.
  const t = u - 7;
  const x = planted(7) + (HAND_STEP / 2) * (1 - t) * (1 - t);
  return { x, y: over(x - LINE_2) };
}

/** A smooth curve through the values at u = 0, 1, 2, ... with no overshoot (a monotone cubic curve). */
function curve(values: number[]): (u: number) => number {
  const count = values.length - 1;
  const slope = (k: number) => item(values, k + 1) - item(values, k);
  const tangent = (k: number) => {
    if (k === 0) return slope(0);
    if (k === count) return slope(count - 1);
    return slope(k - 1) * slope(k) <= 0
      ? 0
      : (2 * slope(k - 1) * slope(k)) / (slope(k - 1) + slope(k));
  };
  return (u) => {
    const k = Math.min(Math.max(Math.floor(u), 0), count - 1);
    const t = u - k;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * item(values, k) +
      (t3 - 2 * t2 + t) * tangent(k) +
      (-2 * t3 + 3 * t2) * item(values, k + 1) +
      (t3 - t2) * tangent(k + 1)
    );
  };
}
const leanAt = curve(LEANS);

/** How far a foot is from the wall in the middle of its step, and how high a hand is above the floor. */
const FOOT_LIFT = 7;
const HAND_LIFT = 5;

/** The pose of the walk at the progress `u`: 0 is the start (hands on the first line), 8 is the top. */
function walk(u: number): Pose {
  const beat = Math.min(Math.floor(u), BEATS - 1);
  const t = u - beat;
  const s = ease(t);
  const lean = leanAt(u);
  const shrug = TOP_SHRUG * ease(clamp((u - 4) / 4));
  const torso = up(lean);
  const joint = jointAt(u);
  const shoulder = { x: joint.x - torso.x * shrug, y: joint.y - torso.y * shrug };
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };

  // In an even beat, the near hand and the far foot move. In an odd beat, the far hand and the near foot move.
  const handFrom = beat < 2 ? LINE_1 : planted(beat - 1);
  const flyingHand = {
    x: mix(handFrom, planted(beat + 1), s),
    y: HAND_Y - HAND_LIFT * Math.sin(Math.PI * t),
  };
  const plantedHand = { x: planted(beat), y: HAND_Y };

  const from = item(FOOTHOLDS, Math.max(beat - 1, 0));
  const to = item(FOOTHOLDS, beat + 1);
  const flyingFoot = {
    x: mix(from.x, to.x, s) + FOOT_LIFT * Math.sin(Math.PI * t),
    y: mix(from.y, to.y, s),
  };
  const flyingToes = mix(toesAt(from.y), toesAt(to.y), s);
  const plantedFoot = item(FOOTHOLDS, beat);
  const plantedToes = toesAt(plantedFoot.y);

  const even = beat % 2 === 0;
  return {
    hip,
    lean,
    shrug,
    head: mix(-10, -2, u / BEATS),
    feet: even ? [plantedFoot, flyingFoot] : [flyingFoot, plantedFoot],
    toes: even ? [plantedToes, flyingToes] : [flyingToes, plantedToes],
    stance: STANCE,
    knees: 0.15,
    hands: even ? [flyingHand, plantedHand] : [plantedHand, flyingHand],
    grip: GRIP,
    ...WALK_ELBOWS,
  };
}

const WALL_START = walk(0);
const TOP = walk(BEATS);

// The first foot is on the wall, the other one still stands on its toes. The body is already where it is with
// both feet on the wall: only there can the first leg reach its foothold.
const stepJoint = { x: START_JOINT.x - 0.6, y: over(LINE_1 - (START_JOINT.x - 0.6)) };
const STEP_LEAN = START_LEAN - 4;
const ONE_FOOT: Pose = {
  ...WALL_START,
  hip: {
    x: stepJoint.x - up(STEP_LEAN).x * BODY.torso,
    y: stepJoint.y - up(STEP_LEAN).y * BODY.torso,
  },
  lean: STEP_LEAN,
  feet: [plankAnkle, item(FOOTHOLDS, 0)],
  toes: [PLANK_TOES, toesAt(item(FOOT_Y, 0))],
  hands: { x: LINE_1, y: HAND_Y },
};

// ---------- The steps ----------

/** The poses of one beat. The planted hand and foot have the same spot in each of them. */
const PER_BEAT = 8;
const COUNT = BEATS * PER_BEAT;
/** The walk starts and ends softly: the speed rises in the first part of the way and falls in the last part. */
const RAMP = 0.06;
function progress(part: number): number {
  const done = (p: number) => (p < RAMP ? (p * p) / (2 * RAMP) : p - RAMP / 2);
  const whole = 1 - RAMP;
  return (part <= 0.5 ? done(part) : whole - done(1 - part)) / whole;
}
const WAY = Array.from({ length: COUNT + 1 }, (_, i) =>
  i === 0 ? WALL_START : i === COUNT ? TOP : walk(BEATS * progress(i / COUNT)),
);

/** The time of the way up, and of the way down. */
const WALK_SECONDS = 2.3;
function walkSteps(poses: Pose[], label: string): Step[] {
  return poses.map((to, i) => ({
    to,
    seconds: WALK_SECONDS / COUNT,
    ...(i === 0 ? { label } : {}),
    ease: "linear" as const,
    legs: "line" as const,
    arms: "line" as const,
  }));
}

export const WALL_WALK: Exercise = {
  key: "wall-walk",
  title: "Wall Walk",
  equipment: { kind: "wall", wall: WALL, side: "left" },
  views: [{ ...SIDE, box: [4, -14, 226, 226] }, FRONT],
  start: LYING,
  steps: [
    { to: LYING, seconds: 0.3, label: "Liegen" },
    // The body turns around the toes, as in the burpee. The hands keep their spot.
    {
      to: LOW,
      seconds: 0.7 * (1 - PART),
      label: "Hochdrücken",
      ease: "in",
      anchor: "feet",
      arms: "line",
    },
    { to: PLANK, seconds: 0.7 * PART, ease: "out", anchor: "feet", arms: "line" },
    // One foot, then the other. The hands stay on the first line until both feet are on the wall.
    {
      to: WALL_START,
      via: [ONE_FOOT],
      seconds: 0.8,
      label: "Füße an die Wand",
      ease: "soft",
      follow: "feet",
      arms: "line",
    },
    ...walkSteps(WAY.slice(1), "Hochlaufen"),
    { to: TOP, seconds: 0.4, label: "Oben" },
    ...walkSteps(WAY.slice(0, -1).reverse(), "Runterlaufen"),
    // The feet stay on the wall until both hands are back on the first line. Then they come down.
    {
      to: PLANK,
      via: [ONE_FOOT],
      seconds: 0.8,
      label: "Ablegen",
      ease: "soft",
      follow: "feet",
      arms: "line",
    },
    { to: LOW, seconds: 0.7 * PART, ease: "in", anchor: "feet", arms: "line" },
    { to: LYING, seconds: 0.7 * (1 - PART), ease: "out", anchor: "feet", arms: "line" },
  ],
};
