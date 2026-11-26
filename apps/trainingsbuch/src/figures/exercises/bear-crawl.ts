// Bear crawl: forward on the hands and the toes, as on a treadmill. CrossFit has no written standard.
// The coaches agree (BarBend, Les Mills, MasterClass): the back is flat, the hips are at the height of the shoulders
// or a little higher, the knees are just above the floor, and a hand and the foot of the other side move together.
// The arms of the figure are long (62), so the knees cannot be as low as in a real crawl: the hips stay at the height
// of the shoulders, the arms bend a little, and the knees are about 15 above the floor.
// One function makes a pose from the part of the loop. The loop is one cycle: the near hand and the far foot step
// at 0, the far hand and the near foot at 0.5. A limb on the floor moves back with the belt at a constant speed.
import { FRONT, type Exercise, type View } from "../exercise.ts";
import { BODY, GROUND, tiptoeFromToe, up, type Pose, type Spot, type Step } from "../skeleton.ts";

/** The time of one loop (two steps), in seconds. */
const LOOP = 0.9;
/** The number of poses in one loop. */
const POSES = 40;
/** The part of the loop in which a hand or a foot is on the floor. More than half: there are always two on the floor. */
const STANCE = 0.65;
/** The belt moves this far in one loop: each hand and each foot goes this far forward on the floor. */
const STRIDE = 40;
/** How far a limb moves back while it is on the floor. The swing brings it forward the same distance. */
const SHIFT = STRIDE * STANCE;
/** The hip. The shoulders are 4 higher: the arms are nearly straight. */
const HIP = { x: 60, y: 146 };
const LEAN = 85;
const shoulder = { x: HIP.x + up(LEAN).x * BODY.torso, y: HIP.y + up(LEAN).y * BODY.torso };
/** A hand on the floor: the edge of its circle (radius 4.5) touches the ground. */
const HAND_Y = GROUND - 4.5;
/** The middle of the way of a hand: just in front of the shoulder. */
const HAND_X = shoulder.x + 2;
/** The middle of the way of the tip of a toe. The shins are nearly level, the feet stand on the toes. */
const TOE_X = HIP.x - 34;
const TOES_DOWN = 158;
const TOES_UP = 148;
const HAND_LIFT = 6;
const FOOT_LIFT = 4;
const GRIP = 15;

const wrap = (part: number) => part - Math.floor(part);

/**
 * Where a limb is along its way at its part of the loop, and how high it is. 0 is the moment that it comes down in
 * front. On the floor, it moves back at the speed of the belt. In the air, it comes forward on a smooth curve that
 * starts and ends at the speed of the belt: so it does not slide when it leaves the floor or when it comes down.
 */
function stepOf(part: number): { dx: number; lift: number } {
  const p = wrap(part);
  if (p <= STANCE) return { dx: SHIFT / 2 - STRIDE * p, lift: 0 };
  const q = (p - STANCE) / (1 - STANCE);
  const slope = -STRIDE * (1 - STANCE);
  const q2 = q * q;
  const q3 = q2 * q;
  const dx =
    (2 * q3 - 3 * q2 + 1) * (-SHIFT / 2) +
    (q3 - 2 * q2 + q) * slope +
    (-2 * q3 + 3 * q2) * (SHIFT / 2) +
    (q3 - q2) * slope;
  return { dx, lift: Math.sin(Math.PI * q) ** 2 };
}

function handOf(part: number): Spot {
  const { dx, lift } = stepOf(part);
  return { x: HAND_X + dx, y: HAND_Y - HAND_LIFT * lift };
}

function footOf(part: number): { ankle: Spot; toes: number } {
  const { dx, lift } = stepOf(part);
  const toes = TOES_DOWN + (TOES_UP - TOES_DOWN) * lift;
  return { ankle: tiptoeFromToe(TOE_X + dx, toes, GROUND - FOOT_LIFT * lift), toes };
}

/** The pose at one part of the loop. The near hand and the far foot come down at 0, the others at 0.5. */
function pose(part: number): Pose {
  const near = footOf(part + 0.5);
  const far = footOf(part);
  return {
    // The hips sink a little when only two limbs are on the floor.
    hip: { x: HIP.x, y: HIP.y + 0.6 * Math.cos(4 * Math.PI * (part - 0.825)) },
    lean: LEAN,
    head: -14,
    feet: [near.ankle, far.ankle],
    toes: [near.toes, far.toes],
    stance: 9,
    knees: 0,
    hands: [handOf(part), handOf(part + 0.5)],
    grip: GRIP,
    elbowTo: -100,
    elbowsOut: 0.3,
  };
}

const SIDE: View = { label: "Seite", yaw: 0, box: [-20, 60, 180, 152] };

const start = pose(0);
const steps: Step[] = [];
for (let i = 1; i <= POSES; i++) {
  steps.push({
    to: i === POSES ? start : pose(i / POSES),
    seconds: LOOP / POSES,
    ...(i === 1 ? { label: "Rechte Hand, linker Fuß" } : {}),
    ...(i === POSES / 2 + 1 ? { label: "Linke Hand, rechter Fuß" } : {}),
    ease: "linear",
    legs: "line",
    arms: "line",
  });
}

export const BEAR_CRAWL: Exercise = {
  key: "bear-crawl",
  title: "Bear Crawl",
  equipment: { kind: "none" },
  belt: STRIDE,
  views: [SIDE, { ...FRONT, box: [-60, 60, 120, 152] }],
  start,
  steps,
};
