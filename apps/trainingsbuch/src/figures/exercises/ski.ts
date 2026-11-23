// SkiErg, double pole: the arms and the trunk pull first, then the hips hinge back. The return is slow.
import type { Exercise, View } from "../exercise.ts";
import { armAt, handAt } from "../poses.ts";
import { tiptoeFromToe, type Pose } from "../skeleton.ts";

/** The x of the tower. The pulleys are at X - 45 (x = 125). The tips of the toes are 81 from the tower. */
const X = 170;
/** The tips of the toes stay on this spot in the whole loop: the heels lift around it. */
const TOE = 89;

const base = { stance: 7, grip: 15, knees: 0.15, elbowsOut: 0.2 };

type Shape = {
  /** The hip. */
  x: number;
  y: number;
  lean: number;
  /** The round back. */
  bend: number;
  /** The hands relative to the shoulders: `dx` forward, `dy` down. A distance of 62 is a straight arm. */
  dx: number;
  dy: number;
  /** Where the elbows point: 0 is down, 90 forward. */
  elbow: number;
  /** The angle of the feet: 90 is flat, more lifts the heels. */
  toes?: number;
  head?: number;
};

/** One pose from a few numbers. The toes stay on their spot. */
function pose({ x, y, lean, bend, dx, dy, elbow, toes = 90, head = 0 }: Shape): Pose {
  const hip = { x, y };
  return {
    ...base,
    hip,
    lean,
    bend,
    head,
    toes,
    feet: tiptoeFromToe(TOE, toes),
    hands: handAt(hip, lean, dx, dy),
    elbowTo: elbow,
  };
}

// The top: tall, on the balls of the feet. The hands are at the height of the top of the head and in front of it,
// 31 below the pulleys. The elbows are bent (about 115 degrees) and point forward and down.
const TOP = pose({
  x: 79,
  y: 114.7,
  lean: 2,
  bend: 0,
  dx: 44,
  dy: -28,
  elbow: 70,
  toes: 112,
  head: -4,
});
// The pull starts: the elbows keep their bend and come down, the back gets round, the torso falls forward.
// The legs are still long: the heels come down.
const CRUNCH = pose({
  x: 76.5,
  y: 117.5,
  lean: 12,
  bend: 14,
  dx: 47,
  dy: -12,
  elbow: 30,
  toes: 101,
});
// The hands are at the height of the chest. The hips start to go back, the knees start to give way.
const FALL = pose({ x: 70, y: 121.3, lean: 31, bend: 20, dx: 42, dy: 28, elbow: -20, toes: 92 });
// The hinge: the hips are back, the hands pass the thighs, the arms extend.
const HINGE = pose({ x: 65.5, y: 124, lean: 46, bend: 20, dx: 16, dy: 56, elbow: -70, head: -3 });
// The bottom: the torso leans 62 degrees (the user asked for a deeper finish on 2026-11-21: the upper body goes
// down far, so that the swing of the body goes into the machine). The arms are straight and point down and
// back, the hands are beside the thighs. The knees are bent a little more, and the hips are farther back.
const BOTTOM_HIP = { x: 60.5, y: 126.5 };
const BOTTOM: Pose = {
  ...base,
  hip: BOTTOM_HIP,
  lean: 62,
  bend: 16,
  head: -8,
  toes: 90,
  feet: tiptoeFromToe(TOE, 90),
  ...armAt(BOTTOM_HIP, 62, -44, -41),
};
// The return. The body starts to stand up, the arms hang long and start to swing forward.
const RISE = pose({ x: 65.5, y: 123.5, lean: 50, bend: 10, dx: -3, dy: 61, elbow: -80, head: -5 });
// The hands pass the knees and come forward. The body is half up.
const SWING = pose({ x: 70, y: 121.3, lean: 34, bend: 5, dx: 30, dy: 52, elbow: -55, head: -3 });
// The hands pass the height of the shoulders on a wide arc. The arms are long and loose.
const LIFT = pose({ x: 74.3, y: 120.2, lean: 18, bend: 1, dx: 54, dy: 16, elbow: -5, head: -3 });
// The hands are at the height of the chin. Only now do the heels start to lift.
const REACH = pose({
  x: 76.8,
  y: 118.8,
  lean: 9,
  bend: 0,
  dx: 54,
  dy: -10,
  elbow: 22,
  toes: 95,
  head: -3,
});

const SIDE: View = { label: "Seite", yaw: 0, box: [36, -6, 162, 216] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-60, -6, 120, 216] };

export const SKI: Exercise = {
  key: "ski",
  title: "SkiErg",
  equipment: { kind: "skierg", x: X },
  views: [SIDE, FRONT],
  start: TOP,
  // `follow: "hands"`: the grips move with one smooth speed through each half of the stroke.
  steps: [
    {
      to: BOTTOM,
      via: [CRUNCH, FALL, HINGE],
      seconds: 0.66,
      label: ["Zug", "Zug", "Hüfte zurück", "Hüfte zurück"],
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
    { to: BOTTOM, seconds: 0.05, label: "Unten" },
    {
      to: TOP,
      via: [RISE, SWING, LIFT, REACH],
      seconds: 1.0,
      label: ["Zurück", "Zurück", "Zurück", "Zurück", "Oben"],
      ease: "soft",
      anchor: "feet",
      arms: "fk",
      follow: "hands",
    },
  ],
};
