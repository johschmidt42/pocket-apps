// Ball Slam (Whitt: "30 ball slams", 14/9 kg): the ball is overhead on straight arms, the figure is on its
// toes. The arms and the hips drive the ball down hard: it leaves the hands in front of the chest and hits the floor in
// front of the feet. The figure follows it down into a squat, the hands take it from the floor, and the figure stands
// up and lifts it overhead again. A slam ball bounces only a little.
import { FRONT, SIDE, type Exercise, type View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import { BALL, GROUND, tiptoe, type Pose } from "../skeleton.ts";

const FEET = { x: 74, y: 200 };
/** Where the ball hits the floor: in front of the toes (the toe ends at 89). */
const SPOT = { x: 108, y: GROUND - BALL.radius };

const base = { stance: 12, knees: 0.5, grip: 15, elbows: 0.4, elbowsOut: 0.5 };

const STAND: Pose = {
  ...base,
  hip: { x: 74, y: 120 },
  lean: 1,
  head: -4,
  feet: FEET,
  hands: handAt({ x: 74, y: 120 }, 1, 25, 1),
};
// On the toes, the ball over the head on straight arms, a little in front.
const TOES = 112;
const UP_FEET = tiptoe(75, TOES);
const OVERHEAD: Pose = {
  ...base,
  hip: { x: 76, y: UP_FEET.y - 79.7 },
  lean: -4,
  head: 4,
  feet: UP_FEET,
  toes: TOES,
  hands: handAt({ x: 76, y: UP_FEET.y - 79.7 }, -4, 10, -58),
};
// The arms swing down hard, the hips bend: the ball leaves the hands in front of the chest.
const RELEASE: Pose = {
  ...base,
  hip: { x: 70, y: 126 },
  lean: 24,
  head: -14,
  feet: FEET,
  hands: handAt({ x: 70, y: 126 }, 24, 40, 18),
};
// The squat over the ball on the floor: the hands are at its sides.
const PICK: Pose = {
  ...base,
  hip: { x: 58, y: 162 },
  lean: 50,
  head: -26,
  feet: FEET,
  hands: { x: SPOT.x, y: SPOT.y + BALL.above },
  elbows: 0,
};
const LIFT: Pose = {
  ...base,
  hip: { x: 64, y: 140 },
  lean: 30,
  head: -14,
  feet: FEET,
  hands: handAt({ x: 64, y: 140 }, 30, 28, 18),
};

const VIEWS: [View, View] = [
  { ...SIDE, box: [20, -28, 140, 240] },
  { ...FRONT, box: [-60, -28, 120, 240] },
];

export const BALL_SLAM: Exercise = {
  key: "ball-slam",
  title: "Ball Slam",
  equipment: { kind: "medicineball" },
  views: VIEWS,
  start: STAND,
  steps: [
    // No stop at the top: the arms turn round at once and drive the ball down, faster and faster.
    { to: OVERHEAD, seconds: 0.45, label: "Hoch", ease: "soft", anchor: "feet", arms: "fk" },
    { to: RELEASE, seconds: 0.3, label: "Schlagen", ease: "in", anchor: "feet", arms: "fk" },
    // The ball is in the air: it hits the floor and bounces a very little into the hands of the squat.
    {
      to: PICK,
      seconds: 0.36,
      label: "Ball am Boden",
      ease: "out",
      anchor: "feet",
      arms: "fk",
      throw: SPOT,
    },
    { to: PICK, seconds: 0.12 },
    {
      to: STAND,
      via: [LIFT],
      seconds: 0.55,
      label: "Aufheben",
      ease: "soft",
      anchor: "feet",
      arms: "fk",
    },
  ],
};
