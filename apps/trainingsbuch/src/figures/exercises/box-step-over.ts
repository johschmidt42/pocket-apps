// Box Step-over (Hammy, CrossFit Open 26.1): one foot on the box, up until both feet stand on it, then a
// step down on the far side, one foot after the other, and a turn to face the box again. The way up is that of the
// box step-up, but the second foot goes to the front half of the box. The steps are one repetition: `runOf()`
// plays it to and fro around the middle of the box.
import type { Equipment, Exercise, View } from "../exercise.ts";
import { tiptoe, tiptoeFromToe, type Pose, type Step } from "../skeleton.ts";
import { BOX, FLOOR, ON, pose, TOP } from "./step-up.ts";

type Spot = { x: number; y: number };
const CENTER = BOX.x + BOX.width / 2;
/** The ankles on the far side: as far from the box as before it. */
const FAR: Spot = { x: 2 * CENTER - FLOOR.x, y: FLOOR.y };
/** The second foot on the box, in its front half: the leg can bend over the far edge. */
const FRONT: Spot = { x: 156, y: TOP };

/** A pose. The near leg (`lead`) goes up first. The far leg (`trail`) stands at the front of the box. */
const at = (
  hip: Spot,
  lean: number,
  lead: Spot,
  trail: Spot,
  toes: [number, number] = [90, 90],
  head = 0,
) => pose(0, hip, lean, { lead, trail, leadToes: toes[0], trailToes: toes[1] }, head);

// The way up, as in the box step-up.
const STAND = at({ x: FLOOR.x, y: 120 }, 0, FLOOR, FLOOR);
const KNEE = at({ x: 74, y: 120.6 }, 3, { x: 74, y: 160 }, FLOOR, [112, 90]);
/** The near foot above the near edge of the box, on its way up. */
const aboveAt = (foot: Spot) => at({ x: 76, y: 122 }, 8, foot, FLOOR, [96, 90], -4);
const PLACED = at({ x: 81, y: 125 }, 18, ON, FLOOR, [90, 90], -10);
const pushToes = 132;
const SHIFT = at(
  { x: 97, y: 113 },
  25,
  ON,
  tiptoeFromToe(FLOOR.x + 15, pushToes),
  [90, pushToes],
  -14,
);
const LIFT = at({ x: 113, y: 92 }, 14, ON, { x: 76, y: 160 }, [90, 140], -8);
/**
 * The poses over the top of the box. `low`: how far the hip stays below the stand on the box (0: hips and knees open
 * fully). The torso then leans a little forward over the bent hips.
 */
const overTop = (low: number) => ({
  PASS: at(
    { x: 122, y: 76 + 0.5 * low },
    5 + 0.5 * low,
    ON,
    { x: 104, y: TOP - 24 },
    [90, 100],
    -2,
  ),
  // The far foot crosses the box above its top.
  ACROSS: at({ x: 130, y: 72 + 0.8 * low }, 2 + low, ON, { x: 132, y: TOP - 10 }, [90, 96], -1),
  // Both feet on the box, the far foot in front.
  TALL: at({ x: 141, y: 71.5 + low }, low, ON, FRONT),
  // The way down. The near foot lifts and goes forward over the far edge, the far leg bends.
  LIFT_BACK: at(
    { x: 142, y: 75 + 0.9 * low },
    3 + 0.8 * low,
    { x: 130, y: TOP - 15 },
    FRONT,
    [100, 90],
    -4,
  ),
});

const REACH = at({ x: 158, y: 100 }, 8, { x: 172, y: TOP }, FRONT, [100, 90], -8);
// The near foot is on the floor beyond the box. The weight goes onto it.
const TOUCH = at({ x: 170, y: 124 }, 8, FAR, FRONT, [90, 90], -8);
// The heel of the far foot rises: the foot stands on its toes on the box.
const onBoxToes = (x: number, toes: number): Spot => ({
  x: tiptoe(x, toes).x,
  y: tiptoe(x, toes).y - BOX.height,
});
const WEIGHT = at({ x: 186, y: 121 }, 4, FAR, onBoxToes(FRONT.x, 120), [90, 120], -4);
// The far foot lifts over the edge and comes down beside the other.
const TRAIL_UP = at({ x: 190, y: 120.5 }, 2, FAR, { x: 168, y: TOP - 14 }, [90, 98], -2);
const TRAIL_DOWN = at({ x: 191, y: 120.5 }, 1, FAR, { x: 180, y: 182 }, [90, 112], -1);
const STAND_FAR = at({ x: FAR.x, y: 120 }, 0, FAR, FAR);

const stepsWith = (above: Pose, low: number): Step[] => {
  const { PASS, ACROSS, TALL, LIFT_BACK } = overTop(low);
  const up: Step = {
    to: PLACED,
    via: [KNEE, above],
    seconds: 0.6,
    label: "Fuß auf die Box",
    ease: "soft",
    legs: "line",
    arms: "carry",
    follow: "feet",
  };
  const down: Step[] = [
    {
      to: STAND_FAR,
      via: [WEIGHT, TRAIL_UP, TRAIL_DOWN],
      seconds: 0.7,
      ease: "soft",
      legs: "line",
      arms: "carry",
      follow: "feet",
    },
    { to: STAND_FAR, seconds: 0.15, label: "Stehen" },
    {
      to: STAND,
      seconds: 0.45,
      label: "Drehen",
      ease: "linear",
      turn: true,
      legs: "carry",
      arms: "carry",
    },
  ];
  if (low > 0) {
    // Bent on the box: no stop on the top. The figure goes over the box in one motion.
    const over = "Über die Box";
    return [
      up,
      {
        to: TOUCH,
        via: [SHIFT, LIFT, PASS, ACROSS, TALL, LIFT_BACK, REACH],
        seconds: 1.45,
        label: [
          "Hochdrücken",
          "Hochdrücken",
          over,
          over,
          over,
          "Absteigen",
          "Absteigen",
          "Absteigen",
        ],
        ease: "soft",
        legs: "line",
        arms: "carry",
        follow: "feet",
      },
      ...down,
    ];
  }
  return [
    up,
    {
      to: TALL,
      via: [SHIFT, LIFT, PASS, ACROSS],
      seconds: 0.85,
      label: "Hochdrücken",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
    { to: TALL, seconds: 0.15, label: "Oben" },
    {
      to: TOUCH,
      via: [LIFT_BACK, REACH],
      seconds: 0.7,
      label: "Absteigen",
      ease: "soft",
      legs: "line",
      arms: "carry",
      follow: "feet",
    },
    ...down,
  ];
};

const SIDE: View = { label: "Seite", yaw: 0, box: [30, -20, 210, 232] };

/** A box step-over. `map` changes each pose: the form with a medicine ball puts the hands at the ball. */
export function stepOver(options: {
  key: string;
  title: string;
  equipment: Equipment;
  map: (pose: Pose) => Pose;
  /** The near foot above the edge of the box on the way up. Lower: the knee comes up less high. */
  above?: Spot;
  /** How far the hip stays below the stand on the box. 0: the figure stands tall on the box and stops there. */
  low?: number;
}): Exercise {
  const { map } = options;
  const steps = stepsWith(aboveAt(options.above ?? { x: 97, y: TOP - 17 }), options.low ?? 0);
  return {
    key: options.key,
    title: options.title,
    equipment: options.equipment,
    views: [SIDE],
    turnAxis: CENTER,
    start: map(STAND),
    steps: steps.map((step) => ({
      ...step,
      to: map(step.to),
      ...(step.via ? { via: step.via.map(map) } : {}),
    })),
  };
}

export const BOX_STEP_OVER: Exercise = stepOver({
  key: "box-step-over",
  title: "Box Step-over",
  equipment: { kind: "box", ...BOX },
  map: (pose) => pose,
});
