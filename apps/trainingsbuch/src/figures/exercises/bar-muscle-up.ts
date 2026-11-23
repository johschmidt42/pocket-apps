// Bar muscle-up with a kip: hang, swing, pull, over the bar, dip, support, and back down.
import type { Exercise, View } from "../exercise.ts";
import { BODY, up, type Pose } from "../skeleton.ts";

/** The bar is fixed. The hands hold it in each pose. */
const BAR = { x: 74, y: 100 };

const RAD = Math.PI / 180;
/** The shoulders are this far from the bar when the arms are straight. */
const LONG = 62;

type Body = {
  /**
   * Where the shoulders are, seen from the bar: 0 is straight below the bar, a negative angle is behind it,
   * 180 is straight above it. A body that hangs from a bar turns around the bar, so this is easier than a hip.
   */
  arm: number;
  /** How far the shoulders are from the bar. `LONG` is a straight arm, less is a bent elbow. */
  reach: number;
  lean: number;
  /** The angle of the straight legs: 0 is straight down, a positive angle is forward. */
  legs: number;
  elbows: number;
  head: number;
};

function pose(body: Body): Pose {
  const shoulder = {
    x: BAR.x + Math.sin(body.arm * RAD) * body.reach,
    y: BAR.y + Math.cos(body.arm * RAD) * body.reach,
  };
  const torso = up(body.lean);
  const hip = { x: shoulder.x - torso.x * BODY.torso, y: shoulder.y - torso.y * BODY.torso };
  // 82 is a little more than the leg can reach: the legs are straight.
  const feet = {
    x: hip.x + Math.sin(body.legs * RAD) * 82,
    y: hip.y + Math.cos(body.legs * RAD) * 82,
  };
  return {
    hip,
    lean: body.lean,
    head: body.head,
    feet,
    stance: 5,
    knees: 0,
    // The toes point away from the body, in line with the legs.
    toes: 168 - body.legs,
    hands: BAR,
    grip: 17,
    elbows: body.elbows,
  };
}

const HANG = pose({ arm: 0, reach: LONG, lean: 1, legs: 3, elbows: 0.25, head: 0 });
// The arch: the chest goes forward under the bar, the feet go back.
const ARCH = pose({ arm: 9, reach: LONG, lean: 3, legs: -24, elbows: 0.25, head: -5 });
// The body passes under the bar, on the way from the arch to the hollow.
const UNDER = pose({ arm: -5, reach: LONG, lean: -6, legs: 5, elbows: 0.25, head: 2 });
// The hollow: the shoulders go behind the bar, the feet come in front. The arms are still long.
const HOLLOW = pose({ arm: -20, reach: LONG, lean: -15, legs: 35, elbows: 0.25, head: 10 });
// The body swings up behind the bar, and the toes rise toward the bar. The arms are still long.
const SWING_UP = pose({ arm: -48, reach: LONG, lean: -35, legs: 50, elbows: 0.25, head: 15 });
// The hips open and the arms pull hard: the hips come close to the bar, the body leans far back.
// The elbows are below the bar.
const HIPS_TO_BAR = pose({ arm: -95, reach: 40, lean: -45, legs: 40, elbows: 0.25, head: 20 });
// The bottom of the dip: the chest is over the bar, the bar is at the belly, the elbows point back and up.
const DIP = pose({ arm: 158, reach: 25, lean: 40, legs: 16, elbows: -1, head: -25 });
// The support: straight arms, the bar at the top of the thighs, the legs a little in front of the bar.
const SUPPORT = pose({ arm: 179, reach: LONG, lean: 10, legs: 4, elbows: -1, head: -5 });
// The way down: the arms push the body away from the bar. It drops behind the bar, in a hollow, and the arms get long.
const DROP = pose({ arm: -75, reach: 46, lean: -28, legs: 30, elbows: 0.25, head: 15 });

// The body travels from far below the bar to far above it, and it swings behind the bar.
const SIDE: View = { label: "Seite", yaw: 0, box: [4, -14, 144, 330] };
const FRONT: View = { label: "Vorn", yaw: 90, box: [-72, -14, 144, 330] };

export const BAR_MUSCLE_UP: Exercise = {
  key: "bar-muscle-up",
  title: "Bar Muscle-up",
  equipment: { kind: "pullupbar", ...BAR },
  views: [SIDE, FRONT],
  ground: false,
  start: HANG,
  steps: [
    { to: HANG, seconds: 0.25, label: "Hang" },
    // The swing with long arms uses "fk" for the arms, not "line". Between two poses, the shoulders move on a
    // straight line and not on an arc around the bar: they come up to 2 units nearer to the bar. With "line",
    // the elbows then bend by up to 30 degrees. With "fk", the arms stay straight, and the hands are at most
    // 2 units away from the bar: the eye does not see that. The pose UNDER makes the straight lines shorter.
    { to: ARCH, seconds: 0.3, label: "Schwung", arms: "fk", legs: "fk" },
    // "in", then "linear": the swing gets faster and does not stop before the pull.
    { to: UNDER, seconds: 0.2, label: "Schwung", ease: "in", arms: "fk", legs: "fk" },
    { to: HOLLOW, seconds: 0.1, label: "Schwung", ease: "linear", arms: "fk", legs: "fk" },
    { to: SWING_UP, seconds: 0.18, label: "Zug", ease: "linear", arms: "fk", legs: "fk" },
    { to: HIPS_TO_BAR, seconds: 0.18, label: "Zug", ease: "linear", arms: "line", legs: "fk" },
    { to: DIP, seconds: 0.36, label: "Umsetzen", ease: "out", arms: "line", legs: "fk" },
    { to: SUPPORT, seconds: 0.4, label: "Drücken", arms: "line", legs: "fk" },
    { to: SUPPORT, seconds: 0.4, label: "Stütz" },
    { to: DIP, seconds: 0.35, label: "Ablassen", arms: "line", legs: "fk" },
    { to: DROP, seconds: 0.3, label: "Ablassen", ease: "in", arms: "line", legs: "fk" },
    { to: HOLLOW, seconds: 0.25, label: "Ablassen", ease: "linear", arms: "line", legs: "fk" },
    { to: HANG, seconds: 0.4, label: "Ablassen", ease: "out", arms: "fk", legs: "fk" },
  ],
};
