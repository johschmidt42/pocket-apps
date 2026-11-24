// Box Step-over (Hammy, CrossFit Open 26.1): one foot on the box, up until both feet stand on it, then a
// step down on the far side, one foot after the other, and a turn to face the box again. The way up is that of the
// box step-up, but the second foot goes to the front half of the box. The steps are one repetition: `runOf()`
// plays it to and fro around the middle of the box.
import type { Exercise, View } from "../exercise.ts";
import { tiptoe, tiptoeFromToe, type Step } from "../skeleton.ts";
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
const ABOVE = at({ x: 76, y: 122 }, 8, { x: 97, y: TOP - 17 }, FLOOR, [96, 90], -4);
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
const PASS = at({ x: 122, y: 76 }, 5, ON, { x: 104, y: TOP - 24 }, [90, 100], -2);
// The far foot crosses the box above its top.
const ACROSS = at({ x: 130, y: 72 }, 2, ON, { x: 132, y: TOP - 10 }, [90, 96], -1);
// Both feet on the box, the far foot in front.
const TALL = at({ x: 141, y: 71.5 }, 0, ON, FRONT);

// The way down. The near foot lifts and goes forward over the far edge, the far leg bends.
const LIFT_BACK = at({ x: 142, y: 75 }, 3, { x: 130, y: TOP - 15 }, FRONT, [100, 90], -4);
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

const steps: Step[] = [
  {
    to: PLACED,
    via: [KNEE, ABOVE],
    seconds: 0.6,
    label: "Fuß auf die Box",
    ease: "soft",
    legs: "line",
    arms: "carry",
    follow: "feet",
  },
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

const SIDE: View = { label: "Seite", yaw: 0, box: [30, -20, 210, 232] };

export const BOX_STEP_OVER: Exercise = {
  key: "box-step-over",
  title: "Box Step-over",
  equipment: { kind: "box", ...BOX },
  views: [SIDE],
  turnAxis: CENTER,
  start: STAND,
  steps,
};
