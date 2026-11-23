// Box Step-up: one foot on the box, the leg on the box lifts the body, both feet stand on the box with hips and
// knees straight, then a step down, one foot after the other. The leading leg changes in each repetition.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { ANKLE, GROUND, tiptoeFromToe, type Pose, type Step } from "../skeleton.ts";

/** A box of 50 cm (20 in), the height of most workouts. */
const BOX = { x: 106, width: 54, height: 50 };
const TOP = GROUND - BOX.height - ANKLE;

type Spot = { x: number; y: number };

/** The ankles on the floor and on the box. */
const FLOOR: Spot = { x: 75, y: 200 };
const ON: Spot = { x: 124, y: TOP };
/** A foot that goes up in front of the box: its toe stays before the edge. */
const RISE: Spot = { x: 74, y: 160 };
/** A foot above the edge of the box. */
const OVER: Spot = { x: 97, y: TOP - 17 };

type Legs = { lead: Spot; trail: Spot; leadToes?: number; trailToes?: number };

/** A pose. `first` is the side of the leg that goes first. */
function pose(first: 0 | 1, hip: Spot, lean: number, legs: Legs, head = 0): Pose {
  const { lead, trail, leadToes = 90, trailToes = 90 } = legs;
  return {
    hip,
    lean,
    head,
    feet: first === 0 ? [lead, trail] : [trail, lead],
    toes: first === 0 ? [leadToes, trailToes] : [trailToes, leadToes],
    stance: 7,
    knees: 0.15,
    grip: 19,
    // The arms hang beside the body, a little in front of it.
    hands: handAt(hip, lean, 7, 61),
    elbows: -0.3,
  };
}

const pushToes = 132;
const onToes = tiptoeFromToe(FLOOR.x + 15, pushToes);

/** One repetition. The leg of the side `first` goes up first and comes down last. */
function repetition(first: 0 | 1): Step[] {
  const at = (hip: Spot, lean: number, legs: Legs, head?: number) =>
    pose(first, hip, lean, legs, head);
  const STAND = at({ x: 75, y: 120 }, 0, { lead: FLOOR, trail: FLOOR });
  // The lead foot goes up in front of the box and over its edge. The body stays over the foot on the floor.
  const KNEE = at({ x: 74, y: 120.6 }, 3, { lead: RISE, trail: FLOOR, leadToes: 112 });
  const ABOVE = at({ x: 76, y: 122 }, 8, { lead: OVER, trail: FLOOR, leadToes: 96 }, -4);
  const PLACED = at({ x: 81, y: 125 }, 18, { lead: ON, trail: FLOOR }, -10);
  // The body moves over the foot on the box. The heel of the back foot rises, then the foot leaves the floor.
  const SHIFT = at({ x: 97, y: 113 }, 25, { lead: ON, trail: onToes, trailToes: pushToes }, -14);
  const LIFT = at(
    { x: 113, y: 92 },
    14,
    { lead: ON, trail: { x: 76, y: 160 }, trailToes: 140 },
    -8,
  );
  const PASS = at({ x: 120, y: 76 }, 5, { lead: ON, trail: OVER, trailToes: 104 }, -2);
  const TALL = at({ x: 124, y: TOP - 80 }, 0, { lead: ON, trail: ON });
  // The way down: the back foot goes first, over the edge and to the floor. The leg on the box bends slowly.
  const BACK = at({ x: 121, y: 76 }, 7, { lead: ON, trail: OVER, trailToes: 104 }, -4);
  const LOWER = at(
    { x: 106, y: 104 },
    22,
    { lead: ON, trail: { x: 75, y: 166 }, trailToes: 130 },
    -12,
  );
  const DOWN = at({ x: 87, y: 122 }, 18, { lead: ON, trail: FLOOR }, -8);
  const OFF = at({ x: 77, y: 122 }, 7, { lead: OVER, trail: FLOOR, leadToes: 100 }, -3);
  return [
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
      via: [SHIFT, LIFT, PASS],
      seconds: 0.85,
      label: "Hochdrücken",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
    { to: TALL, seconds: 0.25, label: "Oben" },
    {
      to: DOWN,
      via: [BACK, LOWER],
      seconds: 0.7,
      label: "Absteigen",
      ease: "soft",
      legs: "line",
      arms: "carry",
    },
    {
      to: STAND,
      via: [
        OFF,
        {
          ...OFF,
          feet: first === 0 ? [RISE, FLOOR] : [FLOOR, RISE],
          hip: { x: 75, y: 121 },
          lean: 3,
        },
      ],
      seconds: 0.5,
      ease: "soft",
      legs: "line",
      arms: "carry",
      follow: "feet",
    },
    { to: STAND, seconds: 0.2, label: "Stehen" },
  ];
}

const SIDE: View = { label: "Seite", yaw: 0, box: [30, -20, 140, 232] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-70, -20, 140, 232] };

export const STEP_UP: Exercise = {
  key: "step-up",
  title: "Box Step-up",
  equipment: { kind: "box", ...BOX },
  views: [SIDE, FRONT],
  start: pose(0, { x: 75, y: 120 }, 0, { lead: FLOOR, trail: FLOOR }),
  steps: [...repetition(0), ...repetition(1)],
};
