// Jumping Jack (Marguerita): a small jump, the feet land wide apart, and the straight arms swing out to the
// sides and up until the hands are over the head. The next jump brings the feet together and the arms down to the
// sides. The front view shows the motion. The loop is one jumping jack.
import { FRONT, SIDE, type Exercise, type View } from "../exercise.ts";
import { shoulderOf } from "../poses.ts";
import { BODY, tiptoe, type Pose, type Step } from "../skeleton.ts";

const RAD = Math.PI / 180;
const FEET_X = 74;
/** Soft knees and elbows: a joint that is nearly straight has no clear side, and it can flip. */
const LEG = 79.2;
const ARM = 61.6;

/**
 * A pose. `arms`: the angle of the straight arms in the front view, 0 down at the sides, 180 over the head. `stance`:
 * how far each foot is from the middle. `lift`: how far the body is above the floor in the flight. `toes`: 90 is flat.
 */
function pose(arms: number, stance: number, lift: number, toes: number): Pose {
  const ankle = tiptoe(FEET_X, toes);
  const feet = { x: ankle.x, y: ankle.y - lift };
  const hip = { x: FEET_X + 1, y: feet.y - Math.sqrt(LEG ** 2 - (stance - BODY.hipHalf) ** 2) };
  const shoulder = shoulderOf(hip, 0);
  const shrug = (arms / 180) * 3;
  // The hand goes on a circle around the shoulder joint, in the plane of the front view. Over the head the hands
  // come together: the circle tilts in a little.
  const side = BODY.shoulderHalf + Math.sin(arms * RAD) * ARM - (arms / 180) * 8;
  const hand = {
    x: shoulder.x + 1,
    y: shoulder.y - shrug + Math.cos(arms * RAD) * Math.sqrt(ARM ** 2 - ((arms / 180) * 8) ** 2),
    z: side,
  };
  return {
    hip,
    lean: 0,
    head: 0,
    shrug,
    feet,
    toes,
    stance,
    knees: 0.2,
    hands: [hand, hand],
    elbowTo: 90,
    elbowsOut: 0.2,
  };
}

const NARROW = 8;
const WIDE = 26;
/** The hip rises this much in the middle of a jump. */
const LIFT = 8;
const STAND = pose(0, NARROW, 0, 90);
const PUSH = pose(25, NARROW, 0, 118);
const WIDE_STAND = pose(178, WIDE, 0, 90);
const PUSH_WIDE = pose(155, WIDE, 0, 118);

/**
 * A jump from the arm angle `from` to `to` and from the stance `a` to `b`, as short flight steps (as in the
 * double-under): the hands go on the circle in steps of about 13 degrees, and the hip on the arc of the flight.
 */
function jump(from: number, to: number, a: number, b: number, label: string): Step[] {
  const count = 10;
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / count;
    return {
      to: pose(from + (to - from) * t, a + (b - a) * t, LIFT * Math.sin(Math.PI * t), 118),
      seconds: 0.3 / count,
      ...(index === 0 ? { label } : {}),
      ease: "linear",
      flight: true,
      legs: "line",
      arms: "line",
    } satisfies Step;
  });
}

/** The front view first: it shows the motion. */
const VIEWS: [View, View] = [
  { ...FRONT, box: [-80, -24, 160, 236] },
  { ...SIDE, box: [14, -24, 120, 236] },
];

export const JUMPING_JACK: Exercise = {
  key: "jumping-jack",
  title: "Jumping Jack",
  equipment: { kind: "none" },
  views: VIEWS,
  start: STAND,
  steps: [
    { to: PUSH, seconds: 0.14, ease: "in", anchor: "feet", arms: "line" },
    ...jump(25, 155, NARROW, WIDE, "Auseinander"),
    { to: WIDE_STAND, seconds: 0.16, ease: "out", anchor: "feet", arms: "line" },
    { to: PUSH_WIDE, seconds: 0.14, ease: "in", anchor: "feet", arms: "line" },
    ...jump(155, 25, WIDE, NARROW, "Zusammen"),
    { to: STAND, seconds: 0.16, ease: "out", anchor: "feet", arms: "line" },
  ],
};
