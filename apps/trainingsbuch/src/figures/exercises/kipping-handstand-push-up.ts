// Kipping handstand push-up: down to the tripod, the knees come down, the legs kick up, the arms press.
import type { Exercise } from "../exercise.ts";
import { BOTTOM, handstand, TOP, VIEWS, WALL, WAY } from "./handstand-push-up.ts";

// The load of the kip, one movement: the hips go to the wall while the knees come down. The head and the hands stay
// where they are (the tripod). The torso leads a little: the check wants the hips near the wall when the knees
// bend (14 from it), and at the wall when the knees are deep.
const LOAD = [
  // The knees unlock with the heels still on the wall: a foot with a nearly straight leg must be at the wall.
  handstand({ part: 1, torso: 19.5, bend: 3, leg: 77.8 }),
  // The feet leave the wall slowly: here they are 7 from it.
  handstand({ part: 1, torso: 23, bend: 6, tuck: { thigh: -166, shin: 157 } }),
  handstand({ part: 1, torso: 27, bend: 10, tuck: { thigh: -148, shin: 164 } }),
  handstand({ part: 1, torso: 34.5, bend: 18, tuck: { thigh: -108, shin: 163 } }),
];
// The ball: the hips are at the wall, the lower back is round, the thighs are at the chest (about 35 degrees from the
// lower half of the torso), the knees are above the head and between the elbows, the shins point up.
const TUCK = handstand({ part: 1, torso: 39.5, bend: 30, tuck: { thigh: -62, shin: 160 } });

// The kick: the legs shoot up to the wall. The head is still on the floor.
const HALF_KICK = handstand({ part: 0.995, torso: 37, bend: 14, tuck: { thigh: -125, shin: 172 } });
// The heels come to the wall with the knees still a little bent. A foot with a straight leg must be at the wall.
// The arms start to press here: the shoulders go up a little.
const HEELS_BACK = handstand({ part: 0.96, torso: 34, bend: 8, leg: 75 });
// The legs are straight and the heels are on the wall again. The press is on its way.
const KICKED = handstand({ part: 0.86, torso: 30, bend: 3, leg: 79.6 });
// The press: the shoulder joints go the same way as in the strict version. The hips leave the wall, and the body
// gets straight.
const PRESS = [
  handstand({ part: 0.7, torso: 25 }),
  handstand({ part: 0.4, torso: 15.5 }),
  handstand({ part: 0.15, torso: 9.5 }),
];

export const KIPPING_HANDSTAND_PUSH_UP: Exercise = {
  key: "kipping-handstand-push-up",
  title: "Kipping Handstand Push-up",
  equipment: { kind: "wall", wall: WALL },
  views: VIEWS,
  start: TOP,
  steps: [
    { to: TOP, seconds: 0.3, label: "Handstand" },
    {
      to: BOTTOM,
      via: WAY,
      seconds: 0.7,
      label: "Absenken",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    // One step: the hips go to the wall with one smooth speed, and the knees come down on the way.
    {
      to: TUCK,
      via: LOAD,
      seconds: 0.42,
      label: "Knie anziehen",
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
    // One step for the kick and the press, with one ease. The engine splits the time by the way of the hip (plus a
    // little for the feet). In the kick the hip moves little, so the kick is short (about 0.2 s) and fast. The
    // speed of the body then rises with no jump into the press (about 0.3 s) and falls to the lockout.
    {
      to: TOP,
      via: [HALF_KICK, HEELS_BACK, KICKED, ...PRESS],
      seconds: 0.55,
      label: ["Kick", "Kick", "Kick", "Drücken", "Drücken", "Drücken"],
      ease: "soft",
      anchor: "hands",
      legs: "fk",
    },
  ],
};
