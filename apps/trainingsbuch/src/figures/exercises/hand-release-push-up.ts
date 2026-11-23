// Hand-release Push-up: down until the chest and the thighs lie on the floor, the hands leave the floor,
// they come back, and the arms push up to straight elbows. The way down and up is the push-up.
import type { Exercise, View } from "../exercise.ts";
import { BODY, GROUND, solve, tiptoeFromToe, type Pose } from "../skeleton.ts";
import { BOTTOM_ELBOWS, BOTTOM_TOES, DOWN, LOW, PART, pose, TOE_X, TOP, UP } from "./push-up.ts";

const RAD = Math.PI / 180;
const LEG = BODY.thigh + BODY.shin;

// The body lies on the floor: the lower edge of the chest (half width 9.5) and the hip are on it.
const LYING_Y = GROUND - 9.5 - 0.5;
const ankle = tiptoeFromToe(TOE_X, BOTTOM_TOES);
const hip = { x: ankle.x + Math.sqrt(LEG * LEG - (LYING_Y - ankle.y) ** 2), y: LYING_Y };
const lean = 90 + Math.asin(0.5 / BODY.torso) / RAD;

const FLOOR: Pose = pose({ ankle, hip, lean, toes: BOTTOM_TOES }, -26, BOTTOM_ELBOWS);
// The hands leave the floor. The upper arm stays where it is, and the forearm turns around the elbow, up and out to the
// side. The direction of the elbow is the place that it has on the floor: so the elbow does not move.
const LIFT = 38 * RAD;
const arm = solve(FLOOR).arms[0];
const fore = { y: arm.end.y - arm.mid.y, z: arm.end.z - arm.mid.z };
const toElbow = { x: arm.mid.x - arm.root.x, y: arm.mid.y - arm.root.y, z: arm.mid.z - arm.root.z };
const RELEASE: Pose = {
  ...FLOOR,
  hands: {
    x: arm.end.x,
    y: arm.mid.y + fore.y * Math.cos(LIFT) - fore.z * Math.sin(LIFT),
    z: arm.mid.z + fore.y * Math.sin(LIFT) + fore.z * Math.cos(LIFT),
  },
  elbowTo: Math.atan2(toElbow.x, toElbow.y) / RAD,
  elbowsOut: toElbow.z / Math.hypot(toElbow.x, toElbow.y),
};

const SIDE: View = { label: "Seite", yaw: 0, box: [8, 96, 196, 120] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-66, 96, 132, 120] };

export const HAND_RELEASE_PUSH_UP: Exercise = {
  key: "hand-release-push-up",
  title: "Hand-release Push-up",
  equipment: { kind: "none" },
  views: [SIDE, FRONT],
  start: TOP,
  steps: [
    { to: LOW, seconds: DOWN * PART, label: "Runter", ease: "in", anchor: "feet", arms: "line" },
    { to: FLOOR, seconds: DOWN * (1 - PART), ease: "out", anchor: "feet", arms: "line" },
    { to: RELEASE, seconds: 0.24, label: "Hände lösen", arms: "line", legs: "line" },
    { to: RELEASE, seconds: 0.12 },
    { to: FLOOR, seconds: 0.22, label: "Hände zurück", arms: "line", legs: "line" },
    { to: LOW, seconds: UP * (1 - PART), label: "Hoch", ease: "in", anchor: "feet", arms: "line" },
    { to: TOP, seconds: UP * PART, ease: "out", anchor: "feet", arms: "line" },
    { to: TOP, seconds: 0.45, label: "Stütz", arms: "line" },
  ],
};
