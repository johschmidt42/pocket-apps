// Dumbbell Squat Clean: two dumbbells from the floor onto the shoulders, with a catch in the deep squat.
// `dumbbellClean()` makes the three forms: squat, power (`dumbbell-power-clean.ts`) and hang (`dumbbell-hang-clean.ts`).
import { FRONT, SIDE, type Exercise } from "../exercise.ts";
import { handAt, shoulderOf } from "../poses.ts";
import { tiptoe, up, type Pose, type Step } from "../skeleton.ts";
import { BOTTOM, rack, RACK } from "./dumbbell-thruster.ts";

type Spot2 = { x: number; y: number };

/** The grip of the pull: the dumbbells pass the outside of the legs. The rack poses use 20. */
const GRIP = 24;
// The stance of `rack`, for the whole lift: planted feet cannot change it without a slide.
const pull = { feet: { x: 74, y: 200 }, stance: 11, knees: 0.15, grip: GRIP };
/** The length of a straight arm in the side view: 61.95 in space, and the hand is `GRIP - 13` outside the shoulder joint. */
const REACH = Math.sqrt(61.95 ** 2 - (GRIP - 13) ** 2);
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * A pose of the pull with straight arms: the dumbbell is at `bell`, and the hip is as high as the arms permit.
 */
export function pulled(hipX: number, lean: number, bell: Spot2, head: number): Pose {
  const joint = shoulderOf({ x: hipX, y: 0 }, lean);
  const hipY = bell.y - Math.sqrt(REACH ** 2 - (bell.x - joint.x) ** 2) - joint.y;
  return {
    ...pull,
    hip: { x: hipX, y: hipY },
    lean,
    head,
    hands: bell,
    elbowTo: 150,
    elbowsOut: 3,
  };
}

// Both heads of each dumbbell are on the floor, beside the feet: the plate (radius 7) touches the ground.
// Flat back, chest up, the shoulders are a little in front of the dumbbells.
const FLOOR = pulled(42, 55, { x: 77, y: 199 }, -30);
// The legs push: the dumbbells are at the knees. The torso keeps its angle for the most part.
const KNEE = pulled(50, 46, { x: 82, y: 170 }, -26);
// The hang: the dumbbells are at the middle of the thighs, on their outside.
export const HANG = pulled(62, 26, { x: 83, y: 148 }, -10);
// The power position: the knees are a little bent, the arms are long. The torso still leans 17 degrees: with 12,
// the lean changed at 382 degrees/s at the end of the pull, and the hip speed fell from 226 to 71 at the border.
export const POWER = pulled(66.5, 17, { x: 82.5, y: 141.5 }, -5);
// Full extension of hips and knees, on the toes, with a shrug. The arms are still nearly straight.
// The legs are 79.6 long (80 is fully straight): the hip follows from the ankle of the foot on its toes.
export const EXTEND: Pose = (() => {
  const toes = 124;
  const feet = tiptoe(75, toes);
  const hip = {
    x: 77.5,
    y: feet.y - Math.sqrt(79.6 ** 2 - (pull.stance - 7) ** 2 - (77.5 - feet.x) ** 2),
  };
  const lean = -5;
  const shrug = 5;
  const neck = shoulderOf(hip, lean);
  const along = up(lean);
  const joint = { x: neck.x + along.x * shrug, y: neck.y + along.y * shrug };
  const bellX = 81;
  const hands = { x: bellX, y: joint.y + Math.sqrt((REACH - 2.5) ** 2 - (bellX - joint.x) ** 2) };
  return { ...pull, feet, toes, hip, lean, head: 2, hands, shrug, elbowTo: 150, elbowsOut: 3 };
})();
// The hang clean starts with a short dip: the hips go back and down, the dumbbells go to just above the knees.
const DIP = pulled(58, 33, { x: 83, y: 155 }, -15);

/**
 * The poses of the turnover from the extension into the rack pose `land`. The hands have their place relative to the
 * shoulders. The elbows go back and a little out, and the dumbbells rise near the body. Then the elbows turn down and
 * forward under the dumbbells. The upper arm stays at least 28 degrees below level in the front view: an elbow at
 * shoulder height with the hand at the chest is a "chicken wing". The elbows reach their high place in front in the catch.
 */
export function turnover(from: Spot2 & { lean: number }, land: Pose): Pose[] {
  const at = (t: number, dx: number, dy: number, rest: Partial<Pose>): Pose => {
    const hip = { x: mix(from.x, land.hip.x, t), y: mix(from.y, land.hip.y, t) };
    const lean = mix(from.lean, land.lean, t);
    return {
      ...land,
      hip,
      lean,
      head: mix(2, land.head ?? 0, t),
      hands: handAt(hip, lean, dx, dy),
      ...rest,
    };
  };
  return [
    // The feet are just above the floor. The elbows go back and a little out.
    at(0.3, 9, 30, {
      feet: { x: 74.5, y: 198 },
      toes: 97,
      grip: 23,
      shrug: 4,
      elbowTo: -110,
      elbowsOut: 1.2,
    }),
    // The dumbbells are at the chest. The elbows are below the shoulders: from here they turn down.
    at(0.55, 10, 15, { grip: 21, shrug: 2.5, elbowTo: -30, elbowsOut: 1 }),
    at(0.8, 8, -3, { grip: 20, shrug: 1, elbowTo: 20, elbowsOut: 3 }),
  ];
}

/**
 * The way down from the stand to the hang: the dumbbells go forward off the shoulders and down in an arc in front of
 * the body, as in a curl in reverse. The hip sinks a very little in each pose: so the knee starts early and slowly.
 */
export function lowered(): Pose[] {
  const hip = RACK.hip;
  return [
    {
      ...RACK,
      hip: { x: hip.x, y: hip.y + 0.1 },
      hands: handAt(hip, 2, 14, 0),
      elbowTo: 60,
      elbowsOut: 0.5,
    },
    {
      ...RACK,
      hip: { x: hip.x - 0.4, y: hip.y + 0.3 },
      lean: 3,
      grip: 22,
      hands: handAt(hip, 3, 24, 24),
      elbowTo: 15,
      elbowsOut: 0.5,
    },
    {
      ...POWER,
      hip: { x: hip.x - 2, y: hip.y + 0.9 },
      lean: 6,
      head: 0,
      hands: handAt(hip, 6, 18, 48),
      elbowTo: -10,
      elbowsOut: 0.5,
    },
  ];
}

type Options = {
  key: string;
  title: string;
  /** "floor": the dumbbells start on the floor. "hang": the loop starts and ends in the hang. */
  from: "floor" | "hang";
  /** The pose of the catch, from `rack()`. */
  catch: Pose;
  /** Where the dumbbells meet the shoulders, before the legs give way: the hip and the lean. */
  land: { x: number; y: number; lean: number };
  /** The time from `land` into the catch, and the time of the stand. */
  sink: number;
  stand: number;
};

/** A clean with two dumbbells. The three forms differ only in the start and in the catch. */
export function dumbbellClean(options: Options): Exercise {
  const LAND: Pose = {
    ...rack(options.land.x, options.land.y, options.land.lean, -6),
    elbowTo: 20,
    elbowsOut: 0.55,
  };
  const start = options.from === "floor" ? FLOOR : HANG;
  const up: Step[] =
    options.from === "floor"
      ? [
          // One step from the floor to the power position: the dumbbells get faster and faster. "fk": the arms are ropes.
          {
            to: POWER,
            via: [KNEE, HANG],
            seconds: 0.6,
            label: "Zug",
            ease: "in",
            anchor: "feet",
            arms: "fk",
            follow: "hands",
          },
        ]
      : [
          { to: DIP, seconds: 0.3, label: "Dip", ease: "soft", anchor: "feet", arms: "fk" },
          {
            to: POWER,
            via: [HANG],
            seconds: 0.3,
            ease: "in",
            anchor: "feet",
            arms: "fk",
            follow: "hands",
          },
        ];
  const down: Step[] =
    options.from === "floor"
      ? [
          {
            to: HANG,
            via: lowered(),
            seconds: 0.5,
            label: "Ablassen",
            ease: "soft",
            anchor: "feet",
            arms: "fk",
            follow: "hands",
          },
          {
            to: FLOOR,
            via: [KNEE],
            seconds: 0.5,
            ease: "soft",
            anchor: "feet",
            arms: "fk",
            follow: "hands",
          },
          { to: FLOOR, seconds: 0.2 },
        ]
      : [
          {
            to: HANG,
            via: lowered(),
            seconds: 0.6,
            label: "Ablassen",
            anchor: "feet",
            arms: "fk",
            follow: "hands",
          },
          { to: HANG, seconds: 0.4 },
        ];
  return {
    key: options.key,
    title: options.title,
    equipment: { kind: "dumbbells" },
    views: [SIDE, FRONT],
    start,
    steps: [
      ...up,
      // "fk": the arms are still ropes, the shrug lifts the dumbbells.
      { to: EXTEND, seconds: 0.16, label: "Streckung", ease: "linear", anchor: "feet", arms: "fk" },
      // "fk": the arm bones turn under the dumbbells. Then "carry": they stay on the shoulders while the legs give way.
      {
        to: LAND,
        via: turnover({ ...EXTEND.hip, lean: EXTEND.lean }, LAND),
        seconds: 0.26,
        label: "Umsetzen",
        ease: "linear",
        arms: "fk",
      },
      {
        to: options.catch,
        seconds: options.sink,
        label: "Fangen",
        ease: "out",
        anchor: "feet",
        arms: "carry",
      },
      { to: options.catch, seconds: 0.15 },
      { to: RACK, seconds: options.stand, label: "Aufstehen", anchor: "feet", arms: "carry" },
      { to: RACK, seconds: 0.3 },
      ...down,
    ],
  };
}

export const DUMBBELL_SQUAT_CLEAN: Exercise = dumbbellClean({
  key: "dumbbell-squat-clean",
  title: "Dumbbell Squat Clean",
  from: "floor",
  catch: BOTTOM,
  land: { x: 62, y: 146, lean: 17 },
  sink: 0.2,
  stand: 0.6,
});
