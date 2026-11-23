// Burpee Box Jump-over: a burpee with the face to the box, a jump with both feet onto the box, a jump down
// on the far side, and a turn to face the box again. The steps are one repetition: `runOf()` plays it to and fro.
// CrossFit: a two-foot takeoff, only the feet touch the box, and no need to stand tall on top of it.
import type { Exercise, View } from "../exercise.ts";
import { handAt } from "../poses.ts";
import {
  ANKLE,
  flightHip,
  GROUND,
  tiptoe,
  tiptoeFromToe,
  type Pose,
  type Step,
} from "../skeleton.ts";
import { floorSteps, standAt } from "./burpee.ts";

const BOX = { x: 224, width: 46, height: 50 };
const CENTER = BOX.x + BOX.width / 2;
/** The ankles of the figure that stands before the box. The figure lies with its head just before the box. */
const NEAR = 168;
/** The ankles of the figure after the jump down: as far from the box as before it. */
const FAR = 2 * CENTER - NEAR;
/** The height of an ankle on the box. */
const TOP = GROUND - BOX.height - ANKLE;
/** The ankles on the box. */
const ON_BOX = 246;
const STAND = standAt(NEAR);
const STAND_FAR = standAt(FAR);

const RAD = Math.PI / 180;
const base = { stance: 7, grip: 15 };
type Spot = { x: number; y: number };
const at = (
  hip: Spot,
  lean: number,
  dx: number,
  dy: number,
  rest: Partial<Pose> & Pick<Pose, "feet">,
): Pose => ({
  ...base,
  hip,
  lean,
  knees: 0.2,
  hands: handAt(hip, lean, dx, dy),
  ...rest,
});

// ---------- The jump onto the box ----------
const riseHip = { x: NEAR + 2, y: 130 };
const RISE = at(riseHip, 22, 54, -14, { head: -12, feet: { x: NEAR, y: 200 } });
const TAKE_TOES = 128;
const takeAnkle = tiptoeFromToe(NEAR + 15, TAKE_TOES);
const takeHip = {
  x: takeAnkle.x + 78.6 * Math.sin(14 * RAD),
  y: takeAnkle.y - 78.6 * Math.cos(14 * RAD),
};
const TAKEOFF = at(takeHip, 14, 40, -46, { head: -8, feet: takeAnkle, toes: TAKE_TOES });
const landHip = { x: ON_BOX - 10, y: TOP - 50 };
const LAND = at(landHip, 30, 30, -4, { head: -15, feet: { x: ON_BOX, y: TOP } });
const AIR = 0.46;
const liftHip = flightHip(takeHip, landHip, AIR, 0.3);
const LIFT = at(liftHip, 20, 30, -24, { feet: { x: liftHip.x - 8, y: liftHip.y + 48 }, toes: 150 });
const tuckHip = flightHip(takeHip, landHip, AIR, 0.62);
const TUCK = at(tuckHip, 30, 30, -4, {
  head: -15,
  feet: { x: tuckHip.x + 14, y: tuckHip.y + 34 },
  toes: 100,
});
const absorbHip = { x: ON_BOX - 14, y: TOP - 38 };
const ABSORB = at(absorbHip, 38, 26, 20, { head: -22, feet: { x: ON_BOX, y: TOP } });

// ---------- The jump down on the far side ----------
const pushHip = { x: ON_BOX - 3, y: TOP - 62 };
const PUSH = at(pushHip, 20, 40, -8, { head: -10, feet: { x: ON_BOX, y: TOP } });
const OFF_TOES = 120;
const offAnkle = tiptoe(ON_BOX, OFF_TOES);
const offAnkleOnBox = { x: offAnkle.x, y: offAnkle.y - (GROUND - TOP - ANKLE) };
const offHip = {
  x: offAnkleOnBox.x + 68 * Math.sin(16 * RAD),
  y: offAnkleOnBox.y - 68 * Math.cos(16 * RAD),
};
const OFF = at(offHip, 12, 44, -30, { head: -6, feet: offAnkleOnBox, toes: OFF_TOES });
const LAND_TOES = 118;
const downAnkle = tiptoe(FAR, LAND_TOES);
const downHip = { x: FAR - 7, y: 127 };
const DOWN_AIR = 0.44;
const overHip = flightHip(offHip, downHip, DOWN_AIR, 0.35);
const OVER = at(overHip, 12, 46, -14, {
  head: -6,
  feet: { x: overHip.x + 2, y: overHip.y + 58 },
  toes: 120,
});
const dropHip = flightHip(offHip, downHip, DOWN_AIR, 0.7);
const DROP = at(dropHip, 10, 46, 4, {
  head: -6,
  feet: { x: dropHip.x + 8, y: dropHip.y + 70 },
  toes: 112,
});
const DOWN = at(downHip, 12, 48, 18, { head: -6, feet: downAnkle, toes: LAND_TOES });
const settleHip = { x: FAR - 15, y: 148 };
const SETTLE = at(settleHip, 30, 34, 50, { head: -18, feet: { x: FAR, y: 200 }, knees: 0.4 });

const SIDE: View = { label: "Seite", yaw: 0, box: [47, -34, 400, 246] };

const steps: Step[] = [
  ...floorSteps(NEAR, 26),
  { to: RISE, seconds: 0.34, label: "Sprung", ease: "in", anchor: "feet" },
  { to: TAKEOFF, seconds: 0.09, ease: "linear", anchor: "feet" },
  { to: LIFT, seconds: AIR * 0.3, label: "Auf die Box", ease: "linear", flight: true, legs: "fk" },
  { to: TUCK, seconds: AIR * 0.32, ease: "linear", flight: true, legs: "fk" },
  { to: LAND, seconds: AIR * 0.38, ease: "linear", flight: true, legs: "fk" },
  { to: ABSORB, seconds: 0.16, ease: "out", anchor: "feet" },
  { to: PUSH, seconds: 0.24, label: "Abspringen", ease: "in", anchor: "feet" },
  { to: OFF, seconds: 0.14, ease: "linear", anchor: "feet" },
  {
    to: OVER,
    seconds: DOWN_AIR * 0.35,
    label: "Über die Box",
    ease: "linear",
    flight: true,
    legs: "fk",
  },
  { to: DROP, seconds: DOWN_AIR * 0.35, ease: "linear", flight: true, legs: "fk" },
  { to: DOWN, seconds: DOWN_AIR * 0.3, ease: "linear", flight: true, legs: "fk" },
  { to: SETTLE, seconds: 0.22, label: "Landung", ease: "out" },
  { to: STAND_FAR, seconds: 0.4, label: "Aufrichten", ease: "soft", anchor: "feet" },
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

export const BURPEE_BOX_JUMP_OVER: Exercise = {
  key: "burpee-box-jump-over",
  title: "Burpee Box Jump-over",
  equipment: { kind: "box", ...BOX },
  views: [SIDE],
  turnAxis: CENTER,
  start: STAND,
  steps,
};
